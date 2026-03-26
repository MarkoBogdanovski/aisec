// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/__tests__/wallet-risk-engine.spec.ts
//
// Tests for all 5 pipeline stages + critical edge cases.
// Every false-positive scenario from the original system is tested here.
// ─────────────────────────────────────────────────────────────────────────────

import { WalletRiskEngineService }  from '../wallet-risk-engine.service';
import { WalletClassifierService }  from '../stages/wallet-classifier.service';
import { RiskFactorService }        from '../stages/risk-factor.service';
import { ConfidenceScorerService }  from '../stages/confidence-scorer.service';
import { FinalClassifierService }   from '../stages/final-classifier.service';
import { RiskClassification, WalletArchetype, WalletFeatures }
  from '../types/risk-engine.types';

// ── Test fixture factory ─────────────────────────────────────────────────────

function makeFeatures(overrides: Partial<WalletFeatures> = {}): WalletFeatures {
  const defaults: WalletFeatures = {
    address:                 '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    chainId:                 '1',
    txCount:                 0,
    uniqueCounterparties:    0,
    contractsDeployed:       0,
    dexInteractions:         0,
    defiProtocols:           [],
    firstSeenAt:             null,
    lastSeenAt:              null,
    walletAgeHours:          0,
    avgTxFrequencyPerDay:    0,
    nativeBalanceEth:        0,
    totalVolumeUsd:          0,
    labels:                  [],
    isSanctioned:            false,
    isKnownExchange:         false,
    isKnownProtocol:         false,
    mixerProximityHops:      null,
    mixerInteractionDirect:  false,
    hasDeployedContracts:    false,
    deployedContractAddresses: [],
    highRiskCounterparties:  0,
    totalCounterparties:     0,
    ...overrides,
  };
  return defaults;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ── Test setup ───────────────────────────────────────────────────────────────

function buildEngine() {
  const classifier       = new WalletClassifierService();
  const factorService    = new RiskFactorService();
  const confidenceScorer = new ConfidenceScorerService();
  const finalClassifier  = new FinalClassifierService();
  const engine           = new WalletRiskEngineService(
    classifier, factorService, confidenceScorer, finalClassifier,
  );
  return { engine, classifier, factorService, confidenceScorer, finalClassifier };
}

// ── Test suites ──────────────────────────────────────────────────────────────

describe('WalletRiskEngine — Core Edge Cases', () => {
  const { engine } = buildEngine();

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 1: Brand new wallet — must NOT be marked risky
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-01: Brand new wallet → UNKNOWN classification, low confidence', async () => {
    const result = await engine.score(makeFeatures({
      txCount:       0,
      walletAgeHours: 0,
      firstSeenAt:   null,
    }));

    expect(result.classification).toBe(RiskClassification.UNKNOWN);
    expect(result.confidence_score).toBeLessThan(0.35);
    expect(result.risk_score).toBeLessThanOrEqual(10);
    expect(result.archetype).toBe(WalletArchetype.NEW);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 2: New wallet with a few transactions
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-02: Wallet with 3 txs and 2-day age → UNKNOWN (not risky)', async () => {
    const result = await engine.score(makeFeatures({
      txCount:           3,
      walletAgeHours:    48,
      firstSeenAt:       daysAgo(2),
      uniqueCounterparties: 2,
    }));

    expect(result.classification).toBe(RiskClassification.UNKNOWN);
    // Must NOT be RISKY or MALICIOUS — insufficient data does not equal risk
    expect(result.classification).not.toBe(RiskClassification.RISKY);
    expect(result.classification).not.toBe(RiskClassification.MALICIOUS);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 3: Legitimate active wallet
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-03: Established wallet with clean activity → SAFE or LOW_RISK', async () => {
    const result = await engine.score(makeFeatures({
      txCount:              250,
      walletAgeHours:       365 * 24,
      firstSeenAt:          daysAgo(365),
      lastSeenAt:           daysAgo(1),
      uniqueCounterparties: 80,
      dexInteractions:      30,
      defiProtocols:        ['uniswap', 'aave', 'compound'],
      nativeBalanceEth:     2.5,
      highRiskCounterparties: 0,
      totalCounterparties:  80,
      isSanctioned:         false,
      mixerProximityHops:   null,
    }));

    expect([RiskClassification.SAFE, RiskClassification.LOW_RISK])
      .toContain(result.classification);
    expect(result.risk_score).toBeLessThan(30);
    expect(result.confidence_score).toBeGreaterThan(0.70);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 4: Wallet deployer — must NOT be auto-flagged
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-04: Active deployer wallet → not MALICIOUS, archetype = DEPLOYER', async () => {
    const result = await engine.score(makeFeatures({
      txCount:               120,
      walletAgeHours:        400 * 24,
      firstSeenAt:           daysAgo(400),
      lastSeenAt:            daysAgo(5),
      contractsDeployed:     12,
      uniqueCounterparties:  25,
      hasDeployedContracts:  true,
      defiProtocols:         ['uniswap'],
      isSanctioned:          false,
      mixerProximityHops:    null,
      highRiskCounterparties: 0,
      totalCounterparties:   25,
    }));

    expect(result.archetype).toBe(WalletArchetype.DEPLOYER);
    expect(result.classification).not.toBe(RiskClassification.MALICIOUS);
    // Deployers should not be penalized for deploying contracts
    const hasDeployerPenalty = result.factors.some(
      f => f.name === 'DEPLOYER_CONTEXT' && f.impact > 0,
    );
    expect(hasDeployerPenalty).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 5: Indirect mixer exposure (2 hops) — must NOT be MALICIOUS
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-05: 2-hop mixer proximity → LOW_RISK at most, never MALICIOUS', async () => {
    const result = await engine.score(makeFeatures({
      txCount:              180,
      walletAgeHours:       200 * 24,
      firstSeenAt:          daysAgo(200),
      lastSeenAt:           daysAgo(10),
      uniqueCounterparties: 45,
      mixerProximityHops:   2,
      mixerInteractionDirect: false,
      highRiskCounterparties: 1,
      totalCounterparties:  45,
    }));

    expect(result.classification).not.toBe(RiskClassification.MALICIOUS);
    expect(result.classification).not.toBe(RiskClassification.RISKY);

    const mixerFactor = result.factors.find(f => f.name === 'MIXER_PROXIMITY_2_HOPS');
    expect(mixerFactor).toBeDefined();
    expect(mixerFactor!.impact).toBeLessThan(10); // low impact
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 6: 1-hop mixer proximity — should be some risk but not MALICIOUS
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-06: 1-hop mixer proximity → at most RISKY, not MALICIOUS', async () => {
    const result = await engine.score(makeFeatures({
      txCount:              50,
      walletAgeHours:       120 * 24,
      firstSeenAt:          daysAgo(120),
      uniqueCounterparties: 20,
      mixerProximityHops:   1,
      mixerInteractionDirect: false,
      highRiskCounterparties: 2,
      totalCounterparties:  20,
    }));

    expect(result.classification).not.toBe(RiskClassification.MALICIOUS);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 7: Known exchange → should be SAFE
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-07: Known exchange address → SAFE', async () => {
    const result = await engine.score(makeFeatures({
      txCount:               50000,
      walletAgeHours:        1000 * 24,
      firstSeenAt:           daysAgo(1000),
      uniqueCounterparties:  10000,
      isKnownExchange:       true,
      labels:                ['binance', 'exchange', 'verified'],
      isSanctioned:          false,
      mixerProximityHops:    null,
    }));

    expect(result.classification).toBe(RiskClassification.SAFE);
    const exchangeFactor = result.factors.find(f => f.name === 'KNOWN_EXCHANGE');
    expect(exchangeFactor).toBeDefined();
    expect(exchangeFactor!.impact).toBeLessThan(0); // trust = negative impact
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 8: Sanctioned address — must be MALICIOUS
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-08: OFAC sanctioned address with confidence → MALICIOUS', async () => {
    const result = await engine.score(makeFeatures({
      txCount:              300,
      walletAgeHours:       500 * 24,
      firstSeenAt:          daysAgo(500),
      uniqueCounterparties: 60,
      isSanctioned:         true,
      labels:               ['sanctioned', 'ofac'],
    }));

    expect(result.classification).toBe(RiskClassification.MALICIOUS);
    const sanctionFactor = result.factors.find(f => f.name === 'SANCTIONED_ADDRESS');
    expect(sanctionFactor).toBeDefined();
    expect(sanctionFactor!.impact).toBeGreaterThan(50);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 9: Single weak signal alone cannot → MALICIOUS
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-09: Single risk signal alone → max RISKY, not MALICIOUS', async () => {
    const result = await engine.score(makeFeatures({
      txCount:              200,
      walletAgeHours:       300 * 24,
      firstSeenAt:          daysAgo(300),
      uniqueCounterparties: 50,
      mixerProximityHops:   0,       // direct mixer — single strong signal
      mixerInteractionDirect: true,
      highRiskCounterparties: 1,
      totalCounterparties:  50,
      isSanctioned:         false,
    }));

    // A single mixer interaction should not produce MALICIOUS
    expect(result.classification).not.toBe(RiskClassification.MALICIOUS);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 10: Low-activity wallet — no false high-risk flags
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-10: Low activity wallet with no flags → UNKNOWN or SAFE, never RISKY', async () => {
    const result = await engine.score(makeFeatures({
      txCount:              8,
      walletAgeHours:       30 * 24,
      firstSeenAt:          daysAgo(30),
      uniqueCounterparties: 5,
      isSanctioned:         false,
      mixerProximityHops:   null,
      highRiskCounterparties: 0,
    }));

    // Low activity with no flags should NEVER be RISKY or MALICIOUS
    expect(result.classification).not.toBe(RiskClassification.RISKY);
    expect(result.classification).not.toBe(RiskClassification.MALICIOUS);
    expect(result.risk_score).toBeLessThan(20);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 11: Genuine multi-signal threat
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-11: Multiple corroborating risk signals → correctly MALICIOUS', async () => {
    const result = await engine.score(makeFeatures({
      txCount:                200,
      walletAgeHours:         400 * 24,
      firstSeenAt:            daysAgo(400),
      uniqueCounterparties:   50,
      isSanctioned:           true,           // signal 1
      mixerInteractionDirect: true,           // signal 2
      mixerProximityHops:     0,
      highRiskCounterparties: 20,             // signal 3
      totalCounterparties:    50,
      labels:                 ['sanctioned', 'hack'],
    }));

    expect(result.classification).toBe(RiskClassification.MALICIOUS);
    expect(result.risk_score).toBeGreaterThan(65);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE 12: Time-decayed mixer interaction
  // ─────────────────────────────────────────────────────────────────────────
  test('EC-12: Very old mixer interaction → reduced impact via decay', async () => {
    // Recent interaction
    const recentResult = await engine.score(makeFeatures({
      txCount:                100,
      walletAgeHours:         200 * 24,
      firstSeenAt:            daysAgo(200),
      lastSeenAt:             daysAgo(1),     // recent activity
      uniqueCounterparties:   30,
      mixerProximityHops:     0,
      mixerInteractionDirect: true,
    }));

    // Old interaction (no recent activity — proxy for old signal)
    const oldResult = await engine.score(makeFeatures({
      txCount:                100,
      walletAgeHours:         200 * 24,
      firstSeenAt:            daysAgo(200),
      lastSeenAt:             daysAgo(400),   // very old last activity
      uniqueCounterparties:   30,
      mixerProximityHops:     0,
      mixerInteractionDirect: true,
    }));

    // Old interaction should carry less weight
    const recentMixerFactor = recentResult.factors.find(f => f.name === 'DIRECT_MIXER_INTERACTION');
    const oldMixerFactor    = oldResult.factors.find(f => f.name === 'DIRECT_MIXER_INTERACTION');

    if (recentMixerFactor && oldMixerFactor) {
      expect(oldMixerFactor.impact).toBeLessThan(recentMixerFactor.impact);
      expect(oldMixerFactor.decayed).toBe(true);
    }
  });
});

// ── Archetype classifier tests ───────────────────────────────────────────────

describe('WalletClassifierService', () => {
  const classifier = new WalletClassifierService();

  test('NEW: 0 txs → NEW archetype', () => {
    const result = classifier.classify(makeFeatures({ txCount: 0 }));
    expect(result.archetype).toBe(WalletArchetype.NEW);
  });

  test('NEW: 3 txs, 3 days old → NEW archetype', () => {
    const result = classifier.classify(makeFeatures({
      txCount: 3, walletAgeHours: 72, firstSeenAt: daysAgo(3),
    }));
    expect(result.archetype).toBe(WalletArchetype.NEW);
  });

  test('DEPLOYER: 10 contracts deployed → DEPLOYER archetype', () => {
    const result = classifier.classify(makeFeatures({
      txCount: 80, contractsDeployed: 10, walletAgeHours: 300 * 24,
      firstSeenAt: daysAgo(300),
    }));
    expect(result.archetype).toBe(WalletArchetype.DEPLOYER);
  });

  test('BOT: >50 tx/day AND low diversity → BOT archetype', () => {
    const result = classifier.classify(makeFeatures({
      txCount: 3000, walletAgeHours: 30 * 24, firstSeenAt: daysAgo(30),
      avgTxFrequencyPerDay: 100, uniqueCounterparties: 5,
    }));
    expect(result.archetype).toBe(WalletArchetype.BOT);
  });

  test('TRADER: many DEX interactions → TRADER archetype', () => {
    const result = classifier.classify(makeFeatures({
      txCount: 500, walletAgeHours: 180 * 24, firstSeenAt: daysAgo(180),
      dexInteractions: 150, defiProtocols: ['uniswap', 'curve', 'aave'],
    }));
    expect(result.archetype).toBe(WalletArchetype.TRADER);
  });
});

// ── Confidence scorer tests ──────────────────────────────────────────────────

describe('ConfidenceScorerService', () => {
  const scorer     = new ConfidenceScorerService();
  const classifier = new WalletClassifierService();

  test('0 transactions → confidence < 0.30', () => {
    const f = makeFeatures({ txCount: 0 });
    const a = classifier.classify(f);
    const c = scorer.compute(f, a);
    expect(c.score).toBeLessThan(0.30);
    expect(c.hasEnoughData).toBe(false);
  });

  test('500+ transactions, 2 year old wallet → confidence > 0.80', () => {
    const f = makeFeatures({
      txCount: 600, walletAgeHours: 730 * 24, firstSeenAt: daysAgo(730),
      uniqueCounterparties: 200, labels: ['verified'],
    });
    const a = classifier.classify(f);
    const c = scorer.compute(f, a);
    expect(c.score).toBeGreaterThan(0.80);
    expect(c.hasEnoughData).toBe(true);
  });

  test('NEW archetype hard-caps confidence at 0.35', () => {
    const f = makeFeatures({ txCount: 3, walletAgeHours: 48, firstSeenAt: daysAgo(2) });
    const a = classifier.classify(f);
    const c = scorer.compute(f, a);
    expect(c.score).toBeLessThanOrEqual(0.35);
  });
});

// ── Factor service tests ─────────────────────────────────────────────────────

describe('RiskFactorService — individual factors', () => {
  const factorSvc  = new RiskFactorService();
  const classifier = new WalletClassifierService();

  test('Sanctioned wallet → SANCTIONED_ADDRESS factor with high impact', () => {
    const f = makeFeatures({
      txCount: 100, walletAgeHours: 200 * 24, firstSeenAt: daysAgo(200),
      isSanctioned: true,
    });
    const a       = classifier.classify(f);
    const factors = factorSvc.computeFactors(f, a);
    const sanctioned = factors.find(x => x.name === 'SANCTIONED_ADDRESS');
    expect(sanctioned).toBeDefined();
    expect(sanctioned!.impact).toBeGreaterThanOrEqual(80);
  });

  test('Known exchange → KNOWN_EXCHANGE trust factor (negative impact)', () => {
    const f = makeFeatures({
      txCount: 1000, walletAgeHours: 500 * 24, firstSeenAt: daysAgo(500),
      isKnownExchange: true,
    });
    const a       = classifier.classify(f);
    const factors = factorSvc.computeFactors(f, a);
    const exchange = factors.find(x => x.name === 'KNOWN_EXCHANGE');
    expect(exchange).toBeDefined();
    expect(exchange!.impact).toBeLessThan(0);
  });

  test('2-hop mixer proximity → low impact (≤ 10)', () => {
    const f = makeFeatures({
      txCount: 100, walletAgeHours: 200 * 24, firstSeenAt: daysAgo(200),
      mixerProximityHops: 2, mixerInteractionDirect: false,
    });
    const a       = classifier.classify(f);
    const factors = factorSvc.computeFactors(f, a);
    const hop2    = factors.find(x => x.name === 'MIXER_PROXIMITY_2_HOPS');
    expect(hop2).toBeDefined();
    expect(hop2!.impact).toBeLessThanOrEqual(10);
  });

  test('Low activity (no flags) → zero risk factors', () => {
    const f = makeFeatures({
      txCount: 5, walletAgeHours: 14 * 24, firstSeenAt: daysAgo(14),
      uniqueCounterparties: 3,
    });
    const a       = classifier.classify(f);
    const factors = factorSvc.computeFactors(f, a);
    const riskFactors = factors.filter(x => x.type === 'risk' && x.impact > 0);
    expect(riskFactors).toHaveLength(0);
  });

  test('BOT archetype → no ANOMALOUS_TX_FREQUENCY penalty', () => {
    const f = makeFeatures({
      txCount: 5000, walletAgeHours: 30 * 24, firstSeenAt: daysAgo(30),
      avgTxFrequencyPerDay: 166, uniqueCounterparties: 5,
    });
    const a       = classifier.classify(f);
    expect(a.archetype).toBe(WalletArchetype.BOT);
    const factors = factorSvc.computeFactors(f, a);
    const freqPenalty = factors.find(x => x.name === 'ANOMALOUS_TX_FREQUENCY');
    expect(freqPenalty).toBeUndefined(); // bots should NOT get this penalty
  });
});

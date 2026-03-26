// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/stages/risk-factor.service.ts
//
// Stage 3: Risk Factor Computation
//
// Produces a list of independent, weighted, explainable risk and trust factors.
// Each factor is a pure function of features — no side effects, fully testable.
//
// PHILOSOPHY:
//   - Every factor must be independently justifiable
//   - Trust factors subtract from risk; they are not just "absence of risk"
//   - Time decay is applied to signals that age out of relevance
//   - No single factor can push a wallet to MALICIOUS alone
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  DEFAULT_SCORING_CONFIG,
  FactorType,
  RiskFactor,
  ScoringConfig,
  WalletArchetype,
  WalletClassification,
  WalletFeatures,
} from '../types/risk-engine.types';
import { ageInHours, applyDecay, clamp, round2 } from '../utils/decay.util';

@Injectable()
export class RiskFactorService {
  private config: ScoringConfig = DEFAULT_SCORING_CONFIG;

  /**
   * Allow runtime config injection (e.g. from a DB config table).
   */
  setConfig(config: ScoringConfig): void {
    this.config = config;
  }

  /**
   * Compute all risk and trust factors for a wallet.
   * Returns factors sorted by absolute impact descending.
   */
  computeFactors(
    features: WalletFeatures,
    archetype: WalletClassification,
  ): RiskFactor[] {
    const factors: RiskFactor[] = [
      // ── Hard risk signals ────────────────────────────────────────────────
      ...this.sanctionedFactor(features),
      ...this.mixerProximityFactors(features),
      ...this.highRiskCounterpartyFactor(features),
      ...this.suspiciousFrequencyFactor(features, archetype),

      // ── Trust signals ────────────────────────────────────────────────────
      ...this.knownExchangeFactor(features),
      ...this.knownProtocolFactor(features),
      ...this.defiInteractionFactor(features),
      ...this.longHistoryFactor(features),
      ...this.counterpartyDiversityFactor(features),
      ...this.lowRiskCounterpartyFactor(features),

      // ── Archetype-specific adjustments ───────────────────────────────────
      ...this.archetypeContextFactors(features, archetype),
    ];

    // Sort by absolute impact descending for readability
    return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RISK FACTORS — these add to the risk score
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * SANCTIONED ADDRESS — hard flag, no decay.
   * OFAC/UN sanctions list is definitive. Full impact immediately.
   */
  private sanctionedFactor(f: WalletFeatures): RiskFactor[] {
    if (!f.isSanctioned) return [];

    return [{
      name: 'SANCTIONED_ADDRESS',
      impact: this.config.weights.sanctionedAddress,
      type: FactorType.RISK,
      description: 'Address appears on OFAC or international sanctions list.',
      weight: 1.0,
      confidence: 0.99,
      decayed: false,
    }];
  }

  /**
   * MIXER PROXIMITY — decays over time, tiered by hop distance.
   *
   * Direct interaction (0 hops) = serious signal.
   * 1 hop = medium signal.
   * 2 hops = weak signal.
   * 3+ hops = no signal (too indirect).
   *
   * Time decay: mixer interactions from 6+ months ago matter less.
   */
  private mixerProximityFactors(f: WalletFeatures): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const hops = f.mixerProximityHops;

    if (hops === null || hops >= 3) return [];  // no signal at 3+ hops

    const interactionAgeHours = ageInHours(f.lastSeenAt);  // best proxy we have
    const decayFactor = this.config.decay.mixerInteractionHours;

    if (f.mixerInteractionDirect) {
      // hops = 0: direct interaction
      const rawImpact = this.config.weights.directMixerInteraction;
      const decayed   = applyDecay(rawImpact, interactionAgeHours, decayFactor);
      factors.push({
        name: 'DIRECT_MIXER_INTERACTION',
        impact: round2(decayed),
        type: FactorType.RISK,
        description: 'Wallet directly interacted with a known cryptocurrency mixer (e.g. Tornado Cash).',
        weight: 0.95,
        confidence: 0.85,
        decayed: decayed < rawImpact,
        rawValue: rawImpact,
      });
    } else if (hops === 1) {
      const rawImpact = this.config.weights.mixerProximity1Hop;
      const decayed   = applyDecay(rawImpact, interactionAgeHours, decayFactor);
      factors.push({
        name: 'MIXER_PROXIMITY_1_HOP',
        impact: round2(decayed),
        type: FactorType.RISK,
        description: 'A counterparty of this wallet directly interacted with a mixer. Indirect exposure.',
        weight: 0.60,
        confidence: 0.65,
        decayed: decayed < rawImpact,
        rawValue: rawImpact,
      });
    } else if (hops === 2) {
      const rawImpact = this.config.weights.mixerProximity2Hop;
      const decayed   = applyDecay(rawImpact, interactionAgeHours, decayFactor);
      factors.push({
        name: 'MIXER_PROXIMITY_2_HOPS',
        impact: round2(decayed),
        type: FactorType.RISK,
        description: 'Two hops away from a mixer interaction. Very indirect — informational only.',
        weight: 0.25,
        confidence: 0.40,
        decayed: decayed < rawImpact,
        rawValue: rawImpact,
      });
    }

    return factors;
  }

  /**
   * HIGH RISK COUNTERPARTY RATIO — how much of tx volume is with risky addresses.
   * Only fires when the ratio is significant, not on single interactions.
   */
  private highRiskCounterpartyFactor(f: WalletFeatures): RiskFactor[] {
    if (f.totalCounterparties === 0) return [];

    const ratio = f.highRiskCounterparties / f.totalCounterparties;

    // Require at least 3 high-risk counterparties AND a meaningful ratio
    // to avoid firing on a single interaction with an unknown address
    if (f.highRiskCounterparties < 3 || ratio < 0.15) return [];

    const ageHours = ageInHours(f.lastSeenAt);
    const rawImpact = this.config.weights.highRiskCounterpartyRatio * ratio;
    const decayed   = applyDecay(rawImpact, ageHours, this.config.decay.counterpartyRiskHours);

    return [{
      name: 'HIGH_RISK_COUNTERPARTY_RATIO',
      impact: round2(clamp(decayed, 0, 30)),  // cap at 30 — counterparties alone can't be decisive
      type: FactorType.RISK,
      description:
        `${f.highRiskCounterparties} of ${f.totalCounterparties} counterparties ` +
        `(${(ratio * 100).toFixed(1)}%) are flagged as high-risk.`,
      weight: 0.70,
      confidence: clamp(ratio, 0, 1),
      decayed: decayed < rawImpact,
      rawValue: rawImpact,
    }];
  }

  /**
   * SUSPICIOUS FREQUENCY — only applies to wallets that are NOT classified as BOT.
   * A BOT is expected to have high frequency — don't double-penalize.
   */
  private suspiciousFrequencyFactor(
    f: WalletFeatures,
    archetype: WalletClassification,
  ): RiskFactor[] {
    // Bots are expected to be high-frequency — not a risk signal for them
    if (archetype.archetype === WalletArchetype.BOT) return [];
    // Traders legitimately have high DEX activity
    if (archetype.archetype === WalletArchetype.TRADER) return [];

    // Flag only extreme anomalies for non-bot wallets
    if (f.avgTxFrequencyPerDay < 100) return [];

    const rawImpact = this.config.weights.suspiciousFrequency;
    return [{
      name: 'ANOMALOUS_TX_FREQUENCY',
      impact: rawImpact,
      type: FactorType.RISK,
      description:
        `Unusually high transaction frequency (${f.avgTxFrequencyPerDay.toFixed(0)} tx/day) ` +
        `for a non-automated wallet.`,
      weight: 0.65,
      confidence: 0.70,
    }];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TRUST FACTORS — these subtract from the risk score
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * KNOWN EXCHANGE — address is a verified centralized exchange hot/cold wallet.
   * Very strong trust signal. CEXs are regulated entities.
   */
  private knownExchangeFactor(f: WalletFeatures): RiskFactor[] {
    if (!f.isKnownExchange) return [];

    return [{
      name: 'KNOWN_EXCHANGE',
      impact: -this.config.weights.knownExchange,   // negative = reduces risk
      type: FactorType.TRUST,
      description: 'Address is a verified centralized exchange wallet (Binance, Coinbase, Kraken, etc.).',
      weight: 0.95,
      confidence: 0.98,
    }];
  }

  /**
   * KNOWN PROTOCOL — address is a verified DeFi protocol contract or wallet.
   * Strong trust signal. Verified protocols are audited and public.
   */
  private knownProtocolFactor(f: WalletFeatures): RiskFactor[] {
    if (!f.isKnownProtocol) return [];

    return [{
      name: 'KNOWN_PROTOCOL',
      impact: -this.config.weights.knownProtocol,
      type: FactorType.TRUST,
      description: 'Address is a verified DeFi protocol wallet (Uniswap, Aave, Compound, etc.).',
      weight: 0.90,
      confidence: 0.95,
    }];
  }

  /**
   * DEFI INTERACTION — wallet has interacted with legitimate DeFi protocols.
   * Moderate trust signal. Scammers generally avoid on-chain DeFi footprints.
   */
  private defiInteractionFactor(f: WalletFeatures): RiskFactor[] {
    if (f.defiProtocols.length === 0 && f.dexInteractions < 5) return [];

    const protocolCount = f.defiProtocols.length;
    const diversity     = Math.min(1.0, protocolCount / 5);  // cap at 5 protocols
    const baseImpact    = this.config.weights.defiInteraction;
    const scaledImpact  = baseImpact * (0.5 + 0.5 * diversity);

    return [{
      name: 'DEFI_PROTOCOL_INTERACTION',
      impact: -round2(scaledImpact),
      type: FactorType.TRUST,
      description:
        `Wallet has interacted with ${protocolCount} known DeFi protocol(s): ` +
        `${f.defiProtocols.slice(0, 3).join(', ')}${protocolCount > 3 ? '…' : ''}.`,
      weight: 0.70,
      confidence: Math.min(0.85, 0.5 + diversity * 0.35),
    }];
  }

  /**
   * LONG HISTORY — wallet has been active for a significant time.
   * Older wallets are less likely to be disposable scam accounts.
   */
  private longHistoryFactor(f: WalletFeatures): RiskFactor[] {
    const ageDays = f.walletAgeHours / 24;
    if (ageDays < 180) return [];  // only fires for 6+ month old wallets

    const ageFactor = Math.min(1.0, ageDays / 730);  // cap at 2 years
    const impact    = this.config.weights.longHistory * ageFactor;

    return [{
      name: 'LONG_WALLET_HISTORY',
      impact: -round2(impact),
      type: FactorType.TRUST,
      description: `Wallet has been active for ${ageDays.toFixed(0)} days — established history.`,
      weight: 0.60,
      confidence: 0.80,
    }];
  }

  /**
   * COUNTERPARTY DIVERSITY — wallet interacts with many different addresses.
   * Scam wallets tend to have concentrated counterparty patterns.
   */
  private counterpartyDiversityFactor(f: WalletFeatures): RiskFactor[] {
    if (f.uniqueCounterparties < 20) return [];

    const diversity = Math.min(1.0, f.uniqueCounterparties / 100);
    const impact    = this.config.weights.highCounterpartyDiversity * diversity;

    return [{
      name: 'HIGH_COUNTERPARTY_DIVERSITY',
      impact: -round2(impact),
      type: FactorType.TRUST,
      description:
        `Wallet has interacted with ${f.uniqueCounterparties} unique addresses — ` +
        `diverse interaction pattern consistent with legitimate use.`,
      weight: 0.55,
      confidence: 0.72,
    }];
  }

  /**
   * LOW RISK COUNTERPARTY RATIO — most transactions are with clean addresses.
   */
  private lowRiskCounterpartyFactor(f: WalletFeatures): RiskFactor[] {
    if (f.totalCounterparties < 10) return [];

    const cleanRatio = 1 - (f.highRiskCounterparties / f.totalCounterparties);
    if (cleanRatio < 0.90) return [];  // only fires if 90%+ are clean

    return [{
      name: 'LOW_RISK_COUNTERPARTY_RATIO',
      impact: -round2(this.config.weights.lowRiskCounterpartyRatio * cleanRatio),
      type: FactorType.TRUST,
      description:
        `${(cleanRatio * 100).toFixed(0)}% of counterparties have no risk flags.`,
      weight: 0.50,
      confidence: 0.68,
    }];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ARCHETYPE-SPECIFIC FACTORS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Context factors that adjust score based on wallet archetype.
   * These are NOT punishments — they are adjustments for correct framing.
   */
  private archetypeContextFactors(
    f: WalletFeatures,
    archetype: WalletClassification,
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    switch (archetype.archetype) {
      case WalletArchetype.NEW:
        // NEW wallet: do NOT add risk. Instead note low confidence in a trust factor.
        factors.push({
          name: 'NEW_WALLET_CONTEXT',
          impact: 0,  // zero impact — absence of history ≠ risk
          type: FactorType.TRUST,
          description:
            'Wallet is new with minimal on-chain history. ' +
            'Classified as UNKNOWN pending more data — not inherently risky.',
          weight: 1.0,
          confidence: 0.90,
        });
        break;

      case WalletArchetype.DEPLOYER:
        // DEPLOYER: contract creation is legitimate developer activity
        factors.push({
          name: 'DEPLOYER_CONTEXT',
          impact: -5,  // slight trust boost for established deployers
          type: FactorType.TRUST,
          description:
            `Wallet has deployed ${f.contractsDeployed} contract(s). ` +
            `Contract deployment is legitimate developer activity.`,
          weight: 0.70,
          confidence: 0.80,
        });
        break;

      case WalletArchetype.BOT:
        // BOT: high frequency is expected, not suspicious for this type
        factors.push({
          name: 'BOT_CONTEXT',
          impact: 0,  // neutral — bots are not inherently malicious
          type: FactorType.TRUST,
          description:
            'High transaction frequency consistent with automated/bot activity. ' +
            'Not inherently malicious — requires additional context.',
          weight: 0.60,
          confidence: 0.75,
        });
        break;

      case WalletArchetype.TRADER:
        // TRADER: DeFi activity is a trust signal
        factors.push({
          name: 'ACTIVE_TRADER_CONTEXT',
          impact: -3,
          type: FactorType.TRUST,
          description:
            'Regular DeFi trading activity across multiple protocols — typical power-user pattern.',
          weight: 0.65,
          confidence: 0.78,
        });
        break;
    }

    return factors.filter(f => f.impact !== 0 || f.name === 'NEW_WALLET_CONTEXT');
  }
}

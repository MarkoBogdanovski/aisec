// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/stages/final-classifier.service.ts
//
// Stage 5: Final Classification
//
// Takes risk score + confidence score → produces final RiskClassification.
//
// CLASSIFICATION RULES (strict precedence):
//
//  1. confidence < 0.40               → UNKNOWN  (always, no exceptions)
//  2. isSanctioned                    → MALICIOUS (override, confidence ≥ 0.70)
//  3. score ≥ 70 AND conf ≥ 0.70
//     AND ≥ 2 independent risk signals → MALICIOUS
//  4. score ≥ 40 AND conf ≥ 0.50     → RISKY
//  5. score ≥ 16                      → LOW_RISK
//  6. else                            → SAFE
//
// KEY ANTI-FALSE-POSITIVE RULES:
//  - MALICIOUS requires multiple corroborating signals
//  - MALICIOUS requires high confidence
//  - A single strong signal can reach RISKY but not MALICIOUS
//  - NEW wallets are UNKNOWN, not SAFE (we just don't know yet)
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  ConfidenceResult,
  DEFAULT_SCORING_CONFIG,
  FactorType,
  RiskClassification,
  RiskFactor,
  ScoringConfig,
  WalletArchetype,
  WalletClassification,
  WalletFeatures,
} from '../types/risk-engine.types';
import { clamp, round2 } from '../utils/decay.util';

@Injectable()
export class FinalClassifierService {
  private config: ScoringConfig = DEFAULT_SCORING_CONFIG;

  setConfig(config: ScoringConfig): void {
    this.config = config;
  }

  /**
   * Compute final risk score from factors (weighted sum with trust subtraction).
   *
   * score = clamp(Σ(risk_impacts) - Σ(|trust_impacts|), 0, 100)
   */
  computeRiskScore(factors: RiskFactor[]): number {
    const riskTotal = factors
      .filter(f => f.type === FactorType.RISK && f.impact > 0)
      .reduce((sum, f) => sum + f.impact * f.weight, 0);

    const trustTotal = factors
      .filter(f => f.type === FactorType.TRUST && f.impact < 0)
      .reduce((sum, f) => sum + Math.abs(f.impact) * f.weight, 0);

    return clamp(round2(riskTotal - trustTotal), 0, 100);
  }

  /**
   * Classify the wallet given its score, confidence, archetype, and factors.
   *
   * Returns the classification and the reasoning chain.
   */
  classify(
    riskScore: number,
    confidenceResult: ConfidenceResult,
    archetypeResult: WalletClassification,
    factors: RiskFactor[],
    features: WalletFeatures,
  ): { classification: RiskClassification; reasoning: string[] } {
    const conf = confidenceResult.score;
    const reasoning: string[] = [];
    const t = this.config.thresholds;

    // ── RULE 1: Insufficient confidence → UNKNOWN ─────────────────────────
    if (!confidenceResult.hasEnoughData || conf < t.minConfidenceForClassification) {
      reasoning.push(
        `Confidence score ${conf.toFixed(2)} is below threshold ${t.minConfidenceForClassification} — insufficient data.`,
      );
      return { classification: RiskClassification.UNKNOWN, reasoning };
    }

    // ── RULE 2: NEW wallet archetype → UNKNOWN ────────────────────────────
    if (archetypeResult.archetype === WalletArchetype.NEW) {
      reasoning.push(
        'Wallet is classified as NEW — defaulting to UNKNOWN pending more on-chain history.',
      );
      return { classification: RiskClassification.UNKNOWN, reasoning };
    }

    // ── RULE 3: UNKNOWN archetype → UNKNOWN ───────────────────────────────
    if (archetypeResult.archetype === WalletArchetype.UNKNOWN) {
      reasoning.push('Wallet archetype could not be determined. Insufficient data for classification.');
      return { classification: RiskClassification.UNKNOWN, reasoning };
    }

    // ── RULE 4: Sanctioned address → MALICIOUS (if confidence ≥ 0.70) ────
    if (features.isSanctioned && conf >= t.minConfidenceForMalicious) {
      reasoning.push(
        `Address is on OFAC sanctions list. Confidence: ${conf.toFixed(2)}.`,
      );
      return { classification: RiskClassification.MALICIOUS, reasoning };
    }

    // ── RULE 5: MALICIOUS — requires multiple signals + high confidence ───
    const independentRiskSignals = this.countIndependentRiskSignals(factors);

    if (
      riskScore >= t.maliciousScoreFloor &&
      conf >= t.minConfidenceForMalicious &&
      independentRiskSignals >= t.minSignalsForMalicious
    ) {
      reasoning.push(
        `Risk score ${riskScore} ≥ ${t.maliciousScoreFloor}, ` +
        `confidence ${conf.toFixed(2)} ≥ ${t.minConfidenceForMalicious}, ` +
        `${independentRiskSignals} independent risk signals ≥ ${t.minSignalsForMalicious}.`,
      );
      return { classification: RiskClassification.MALICIOUS, reasoning };
    }

    // If score would be MALICIOUS but requirements not met → downgrade to RISKY
    if (riskScore >= t.maliciousScoreFloor) {
      const reasons: string[] = [];
      if (conf < t.minConfidenceForMalicious) {
        reasons.push(`confidence too low (${conf.toFixed(2)} < ${t.minConfidenceForMalicious})`);
      }
      if (independentRiskSignals < t.minSignalsForMalicious) {
        reasons.push(
          `insufficient independent signals (${independentRiskSignals} < ${t.minSignalsForMalicious})`,
        );
      }
      reasoning.push(
        `Score ${riskScore} would indicate MALICIOUS but downgraded to RISKY: ${reasons.join(', ')}.`,
      );
      return { classification: RiskClassification.RISKY, reasoning };
    }

    // ── RULE 6: RISKY ─────────────────────────────────────────────────────
    if (riskScore >= t.riskyScoreFloor && conf >= 0.50) {
      reasoning.push(
        `Risk score ${riskScore} ≥ ${t.riskyScoreFloor} with confidence ${conf.toFixed(2)}.`,
      );
      return { classification: RiskClassification.RISKY, reasoning };
    }

    // ── RULE 7: LOW_RISK ──────────────────────────────────────────────────
    if (riskScore >= t.lowRiskScoreFloor) {
      reasoning.push(`Risk score ${riskScore} indicates low but non-zero risk.`);
      return { classification: RiskClassification.LOW_RISK, reasoning };
    }

    // ── RULE 8: SAFE ──────────────────────────────────────────────────────
    reasoning.push(`Risk score ${riskScore} with confidence ${conf.toFixed(2)} — no significant risk signals.`);
    return { classification: RiskClassification.SAFE, reasoning };
  }

  /**
   * Count how many INDEPENDENT risk signal categories are present.
   *
   * "Independent" means different signal categories, not just different factors.
   * A mixer hop and a sanctioned counterparty are independent.
   * Two mixer hops (1-hop and 2-hop) are NOT fully independent.
   */
  private countIndependentRiskSignals(factors: RiskFactor[]): number {
    const signalCategories = new Set<string>();

    const categoryMap: Record<string, string> = {
      SANCTIONED_ADDRESS:           'sanction',
      DIRECT_MIXER_INTERACTION:     'mixer',
      MIXER_PROXIMITY_1_HOP:        'mixer_proximity',
      MIXER_PROXIMITY_2_HOPS:       'mixer_proximity',  // same category as 1-hop
      HIGH_RISK_COUNTERPARTY_RATIO: 'counterparty_risk',
      ANOMALOUS_TX_FREQUENCY:       'behavior',
    };

    for (const factor of factors) {
      if (factor.type === FactorType.RISK && factor.impact > 0) {
        const category = categoryMap[factor.name] ?? factor.name;
        signalCategories.add(category);
      }
    }

    return signalCategories.size;
  }
}

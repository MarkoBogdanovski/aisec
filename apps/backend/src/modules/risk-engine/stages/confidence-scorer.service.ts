// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/stages/confidence-scorer.service.ts
//
// Stage 4: Confidence Scoring
//
// Answers: "How much should we trust this risk assessment?"
//
// Confidence is independent of risk score. A high-confidence result means
// we have strong data. A low-confidence result means we should say UNKNOWN
// even if the risk score appears high.
//
// KEY PRINCIPLE: Lack of data does not imply risk.
//                It implies uncertainty → UNKNOWN classification.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  ConfidenceComponent,
  ConfidenceResult,
  WalletArchetype,
  WalletClassification,
  WalletFeatures,
} from '../types/risk-engine.types';
import { clamp, round2, walletAgeDays } from '../utils/decay.util';

@Injectable()
export class ConfidenceScorerService {
  /**
   * Compute how confident we are in our risk assessment of this wallet.
   *
   * Components and their weights:
   *   - Transaction count    30%  (more txs = better signal)
   *   - Wallet age           25%  (older = more history = more signal)
   *   - Counterparty count   20%  (diversity = richer graph)
   *   - Label quality        15%  (known labels = anchored data)
   *   - Archetype clarity    10%  (confident archetype = better context)
   */
  compute(
    features: WalletFeatures,
    archetype: WalletClassification,
  ): ConfidenceResult {
    const components: ConfidenceComponent[] = [
      this.txCountComponent(features),
      this.walletAgeComponent(features),
      this.counterpartyComponent(features),
      this.labelComponent(features),
      this.archetypeComponent(archetype),
    ];

    // Weighted sum
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore = components.reduce(
      (sum, c) => sum + c.value * c.weight,
      0,
    );
    const raw = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const score = clamp(round2(raw), 0, 1);

    // NEW wallets and UNKNOWN archetypes hard-cap confidence
    const hardCap = this.getHardCap(features, archetype);
    const finalScore = Math.min(score, hardCap);

    return {
      score: round2(finalScore),
      components,
      hasEnoughData: finalScore >= 0.4,
    };
  }

  // ── Individual confidence components ─────────────────────────────────────

  /**
   * Transaction count component.
   * More transactions = more behavioural signal available.
   *
   * Score curve:
   *   0 tx  → 0.00
   *   5 tx  → 0.20
   *   20 tx → 0.50
   *   50 tx → 0.75
   *  200 tx → 0.95
   *  500+tx → 1.00
   */
  private txCountComponent(f: WalletFeatures): ConfidenceComponent {
    const tx = f.txCount;
    let value: number;

    if (tx === 0)        value = 0.00;
    else if (tx < 3)     value = 0.10;
    else if (tx < 5)     value = 0.18;
    else if (tx < 10)    value = 0.30;
    else if (tx < 20)    value = 0.45;
    else if (tx < 50)    value = 0.60;
    else if (tx < 100)   value = 0.75;
    else if (tx < 200)   value = 0.87;
    else if (tx < 500)   value = 0.93;
    else                 value = 1.00;

    return {
      name: 'transaction_count',
      value,
      weight: 0.30,
      description: `${tx} transactions on-chain`,
    };
  }

  /**
   * Wallet age component.
   * Older wallets have more observable history.
   *
   * Score curve:
   *   0 days  → 0.00
   *   7 days  → 0.15
   *   30 days → 0.40
   *   90 days → 0.65
   *  180 days → 0.80
   *  365 days → 0.95
   *  730+days → 1.00
   */
  private walletAgeComponent(f: WalletFeatures): ConfidenceComponent {
    const ageDays = walletAgeDays(f.firstSeenAt);
    let value: number;

    if (ageDays === 0)       value = 0.00;
    else if (ageDays < 1)    value = 0.05;
    else if (ageDays < 7)    value = 0.15;
    else if (ageDays < 30)   value = 0.35;
    else if (ageDays < 90)   value = 0.55;
    else if (ageDays < 180)  value = 0.72;
    else if (ageDays < 365)  value = 0.85;
    else if (ageDays < 730)  value = 0.95;
    else                     value = 1.00;

    return {
      name: 'wallet_age',
      value,
      weight: 0.25,
      description: `Wallet is ${ageDays.toFixed(0)} days old`,
    };
  }

  /**
   * Counterparty diversity component.
   * More unique counterparties = richer social graph = better risk signal.
   */
  private counterpartyComponent(f: WalletFeatures): ConfidenceComponent {
    const count = f.uniqueCounterparties;
    let value: number;

    if (count === 0)      value = 0.00;
    else if (count < 3)   value = 0.15;
    else if (count < 10)  value = 0.35;
    else if (count < 25)  value = 0.55;
    else if (count < 50)  value = 0.72;
    else if (count < 100) value = 0.87;
    else                  value = 1.00;

    return {
      name: 'counterparty_diversity',
      value,
      weight: 0.20,
      description: `${count} unique counterparties observed`,
    };
  }

  /**
   * Label quality component.
   * Known labels (exchange, protocol, verified) anchor our assessment.
   * Sanctioned or mixer labels also boost confidence (in the negative direction).
   */
  private labelComponent(f: WalletFeatures): ConfidenceComponent {
    const hasPositiveLabel = f.isKnownExchange || f.isKnownProtocol ||
      f.labels.some(l => ['verified', 'dao', 'multisig', 'exchange'].includes(l.toLowerCase()));

    const hasNegativeLabel = f.isSanctioned ||
      f.labels.some(l => ['mixer', 'sanctioned', 'hack', 'exploit'].includes(l.toLowerCase()));

    // Both positive and negative labels boost confidence (we know something)
    if (f.isSanctioned)      return { name: 'label_quality', value: 0.95, weight: 0.15,
                                       description: 'Address is on OFAC sanctions list' };
    if (hasPositiveLabel)    return { name: 'label_quality', value: 0.90, weight: 0.15,
                                       description: 'Address has verified positive labels' };
    if (hasNegativeLabel)    return { name: 'label_quality', value: 0.85, weight: 0.15,
                                       description: 'Address has negative labels from known sources' };
    if (f.labels.length > 0) return { name: 'label_quality', value: 0.60, weight: 0.15,
                                       description: `${f.labels.length} unclassified label(s)` };

    return {
      name: 'label_quality',
      value: 0.10,
      weight: 0.15,
      description: 'No known labels for this address',
    };
  }

  /**
   * Archetype clarity component.
   * A well-classified archetype means we can apply the right risk model.
   */
  private archetypeComponent(classification: WalletClassification): ConfidenceComponent {
    const isUnknownArchetype = classification.archetype === WalletArchetype.UNKNOWN;
    return {
      name: 'archetype_clarity',
      value: isUnknownArchetype ? 0.0 : round2(classification.confidence),
      weight: 0.10,
      description: isUnknownArchetype
        ? 'Wallet archetype could not be determined'
        : `Classified as ${classification.archetype} with ${(classification.confidence * 100).toFixed(0)}% confidence`,
    };
  }

  // ── Hard caps by archetype ────────────────────────────────────────────────

  /**
   * Some archetypes impose a ceiling on confidence regardless of
   * how much data we have, because the model is inherently limited.
   */
  private getHardCap(
    features: WalletFeatures,
    archetype: WalletClassification,
  ): number {
    switch (archetype.archetype) {
      case WalletArchetype.UNKNOWN:
        return 0.25;  // we know almost nothing

      case WalletArchetype.NEW:
        // New wallets: cap grows with transaction count
        // 0 tx → 0.25, 1-4 tx → 0.35
        return features.txCount === 0 ? 0.25 : 0.35;

      case WalletArchetype.BOT:
        // Bots have high tx count but low signal quality per-tx
        return 0.75;

      default:
        return 1.0;   // no cap
    }
  }
}

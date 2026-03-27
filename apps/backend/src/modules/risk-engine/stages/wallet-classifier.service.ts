// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/stages/wallet-classifier.service.ts
//
// Stage 2: Wallet Archetype Classification
//
// Classifies a wallet into a behavioural archetype BEFORE risk scoring.
// The archetype gates which risk rules apply and at what weight.
//
// KEY PRINCIPLE: archetypes are descriptive, not judgemental.
// DEPLOYER, BOT, TRADER are not risks — they are contexts.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  WalletArchetype,
  WalletClassification,
  WalletFeatures,
} from '../types/risk-engine.types';
import { walletAgeDays } from '../utils/decay.util';

@Injectable()
export class WalletClassifierService {
  /**
   * Classify a wallet into an archetype.
   *
   * Returns the most specific matching archetype along with a confidence
   * score for the classification itself and the signals that drove it.
   */
  classify(features: WalletFeatures): WalletClassification {
    // ── Insufficient data ─────────────────────────────────────────────────
    if (this.isUnknown(features)) {
      return {
        archetype: WalletArchetype.UNKNOWN,
        confidence: 0.1,
        signals: ['No transaction history available'],
      };
    }

    // ── NEW: very fresh wallet ────────────────────────────────────────────
    if (this.isNew(features)) {
      return {
        archetype: WalletArchetype.NEW,
        confidence: 0.9,
        signals: this.newSignals(features),
      };
    }

    // ── SANCTIONED: override archetype with minimal confidence boost ──────
    // Note: sanction check is in risk scoring; archetype stays NORMAL
    // to avoid prejudging — the risk scorer handles the hard flag.

    // ── DEPLOYER: primary activity is contract creation ───────────────────
    if (this.isDeployer(features)) {
      return {
        archetype: WalletArchetype.DEPLOYER,
        confidence: this.deployerConfidence(features),
        signals: this.deployerSignals(features),
      };
    }

    // ── BOT: very high frequency, automated pattern ───────────────────────
    if (this.isBot(features)) {
      return {
        archetype: WalletArchetype.BOT,
        confidence: this.botConfidence(features),
        signals: this.botSignals(features),
      };
    }

    // ── WHALE: high value, lower frequency ───────────────────────────────
    if (this.isWhale(features)) {
      return {
        archetype: WalletArchetype.WHALE,
        confidence: 0.75,
        signals: [`High balance: ${features.nativeBalanceEth.toFixed(2)} ETH`, 'Low tx frequency'],
      };
    }

    // ── TRADER: frequent DEX/DeFi interactions ────────────────────────────
    if (this.isTrader(features)) {
      return {
        archetype: WalletArchetype.TRADER,
        confidence: this.traderConfidence(features),
        signals: this.traderSignals(features),
      };
    }

    // ── NORMAL: default for established wallets ───────────────────────────
    return {
      archetype: WalletArchetype.NORMAL,
      confidence: this.normalConfidence(features),
      signals: ['Established wallet with standard activity pattern'],
    };
  }

  // ── Archetype predicates ─────────────────────────────────────────────────

  private isUnknown(f: WalletFeatures): boolean {
    return f.txCount === 0 && f.walletAgeHours < 1;
  }

  private isNew(f: WalletFeatures): boolean {
    const ageDays = walletAgeDays(f.firstSeenAt);
    return f.txCount < 5 || ageDays < 7;
  }

  private isDeployer(f: WalletFeatures): boolean {
    if (f.contractsDeployed === 0) return false;

    // Primary deployer: contracts deployed is a significant fraction of activity
    const deployRatio = f.contractsDeployed / Math.max(1, f.txCount);
    return deployRatio >= 0.10 || f.contractsDeployed >= 3;
  }

  private isBot(f: WalletFeatures): boolean {
    // Bots: very high frequency AND low counterparty diversity
    const highFrequency  = f.avgTxFrequencyPerDay > 50;
    const lowDiversity   = f.uniqueCounterparties < 10 && f.txCount > 100;
    const repetitiveTxs  = f.uniqueCounterparties > 0
      ? f.txCount / f.uniqueCounterparties > 20
      : false;

    // Need at least 2 of 3 signals to call it a bot
    const signals = [highFrequency, lowDiversity, repetitiveTxs].filter(Boolean).length;
    return signals >= 2;
  }

  private isWhale(f: WalletFeatures): boolean {
    return f.nativeBalanceEth > 100 && f.avgTxFrequencyPerDay < 5;
  }

  private isTrader(f: WalletFeatures): boolean {
    return f.dexInteractions > 10 || f.defiProtocols.length >= 3;
  }

  // ── Confidence calculators ───────────────────────────────────────────────

  private deployerConfidence(f: WalletFeatures): number {
    // More deployed contracts = more confident in DEPLOYER classification
    if (f.contractsDeployed >= 10) return 0.95;
    if (f.contractsDeployed >= 5)  return 0.85;
    if (f.contractsDeployed >= 3)  return 0.75;
    return 0.65;
  }

  private botConfidence(f: WalletFeatures): number {
    if (f.avgTxFrequencyPerDay > 200) return 0.90;
    if (f.avgTxFrequencyPerDay > 100) return 0.80;
    return 0.70;
  }

  private traderConfidence(f: WalletFeatures): number {
    const protocolBoost = Math.min(0.2, f.defiProtocols.length * 0.04);
    const dexBoost      = Math.min(0.2, f.dexInteractions * 0.005);
    return Math.min(0.95, 0.6 + protocolBoost + dexBoost);
  }

  private traderSignals(f: WalletFeatures): string[] {
    const signals: string[] = [];
    if (f.dexInteractions > 0) signals.push(`DEX interactions: ${f.dexInteractions}`);
    if (f.defiProtocols && f.defiProtocols.length > 0) {
      signals.push(`DeFi protocols: ${f.defiProtocols.join(', ')}`);
    }
    if (f.txCount > 0) signals.push(`Tx count: ${f.txCount}`);
    return signals.length ? signals : ['Frequent trading activity detected'];
  }

  private normalConfidence(f: WalletFeatures): number {
    const ageDays = walletAgeDays(f.firstSeenAt);
    // Older wallets with more counterparties = more data = more confident
    const ageScore   = Math.min(0.3, ageDays / 365 * 0.3);
    const txScore    = Math.min(0.3, f.txCount / 500 * 0.3);
    const cptyScore  = Math.min(0.2, f.uniqueCounterparties / 50 * 0.2);
    return Math.min(0.90, 0.2 + ageScore + txScore + cptyScore);
  }

  // ── Signal description builders ──────────────────────────────────────────

  private newSignals(f: WalletFeatures): string[] {
    const signals: string[] = [];
    const ageDays = walletAgeDays(f.firstSeenAt);
    if (f.txCount < 5) signals.push(`Very low transaction count: ${f.txCount}`);
    if (ageDays < 7)   signals.push(`Wallet age: ${ageDays.toFixed(1)} days`);
    return signals.length ? signals : ['Minimal on-chain history'];
  }

  private deployerSignals(f: WalletFeatures): string[] {
    return [
      `Deployed ${f.contractsDeployed} contract(s)`,
      `Deploy ratio: ${((f.contractsDeployed / Math.max(1, f.txCount)) * 100).toFixed(1)}% of activity`,
    ];
  }

  private botSignals(f: WalletFeatures): string[] {
    return [
      `High tx frequency: ${f.avgTxFrequencyPerDay.toFixed(1)} tx/day`,
      `Low counterparty diversity: ${f.uniqueCounterparties} unique addresses`,
      `Repetition ratio: ${(f.txCount / Math.max(1, f.uniqueCounterparties)).toFixed(1)} txs/counterparty`,
    ];
  }
}

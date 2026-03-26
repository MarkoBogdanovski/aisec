// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/wallet-risk-engine.service.ts
//
// MAIN ORCHESTRATOR — 5-Stage Pipeline
//
// Stage 1: Feature Extraction   (caller provides WalletFeatures)
// Stage 2: Archetype Detection  (WalletClassifierService)
// Stage 3: Factor Computation   (RiskFactorService)
// Stage 4: Confidence Scoring   (ConfidenceScorerService)
// Stage 5: Final Classification (FinalClassifierService)
//
// This service is the single entry point for all wallet risk scoring.
// It is stateless — every call is independent.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_SCORING_CONFIG,
  ScoringConfig,
  WalletFeatures,
  WalletRiskResult,
} from './types/risk-engine.types';
import { WalletClassifierService }  from './stages/wallet-classifier.service';
import { RiskFactorService }        from './stages/risk-factor.service';
import { ConfidenceScorerService }  from './stages/confidence-scorer.service';
import { FinalClassifierService }   from './stages/final-classifier.service';

const ENGINE_VERSION = '2.0.0';

@Injectable()
export class WalletRiskEngineService {
  private readonly logger = new Logger(WalletRiskEngineService.name);

  constructor(
    private readonly classifier:        WalletClassifierService,
    private readonly factorService:     RiskFactorService,
    private readonly confidenceScorer:  ConfidenceScorerService,
    private readonly finalClassifier:   FinalClassifierService,
  ) {}

  /**
   * Inject a non-default scoring configuration.
   * Useful for A/B testing or per-network config.
   */
  configure(config: ScoringConfig): void {
    this.factorService.setConfig(config);
    this.finalClassifier.setConfig(config);
  }

  /**
   * Run the full 5-stage risk scoring pipeline.
   *
   * @param features - pre-extracted wallet features (Stage 1 output)
   * @returns complete risk result with score, confidence, classification, factors
   */
  async score(features: WalletFeatures): Promise<WalletRiskResult> {
    const startTime = Date.now();
    const dataPoints: number[] = [];

    this.logger.debug(
      `[RiskEngine] Scoring wallet ${features.address} on chain ${features.chainId}`,
    );

    try {
      // ── Stage 2: Archetype Detection ─────────────────────────────────────
      const archetypeResult = this.classifier.classify(features);
      this.logger.debug(
        `[Stage 2] Archetype: ${archetypeResult.archetype} ` +
        `(confidence: ${archetypeResult.confidence.toFixed(2)})`,
      );
      dataPoints.push(features.txCount, features.uniqueCounterparties);

      // ── Stage 3: Risk Factor Computation ─────────────────────────────────
      const factors = this.factorService.computeFactors(features, archetypeResult);
      this.logger.debug(`[Stage 3] Computed ${factors.length} factors`);
      dataPoints.push(factors.length);

      // ── Stage 4: Confidence Scoring ───────────────────────────────────────
      const confidenceResult = this.confidenceScorer.compute(features, archetypeResult);
      this.logger.debug(`[Stage 4] Confidence: ${confidenceResult.score.toFixed(2)}`);

      // ── Stage 5a: Risk Score Aggregation ──────────────────────────────────
      const riskScore = this.finalClassifier.computeRiskScore(factors);
      this.logger.debug(`[Stage 5a] Risk score: ${riskScore}`);

      // ── Stage 5b: Final Classification ────────────────────────────────────
      const { classification, reasoning } = this.finalClassifier.classify(
        riskScore,
        confidenceResult,
        archetypeResult,
        factors,
        features,
      );
      this.logger.debug(`[Stage 5b] Classification: ${classification} — ${reasoning[0]}`);

      const durationMs = Date.now() - startTime;

      const result: WalletRiskResult = {
        address:          features.address,
        chainId:          features.chainId,
        risk_score:       riskScore,
        confidence_score: confidenceResult.score,
        classification,
        archetype:        archetypeResult.archetype,
        factors,
        meta: {
          analyzedAt:  new Date().toISOString(),
          version:     ENGINE_VERSION,
          durationMs,
          dataPoints:  dataPoints.reduce((sum, n) => sum + n, 0),
        },
      };

      this.logger.log(
        `[RiskEngine] ${features.address} → ${classification} ` +
        `score=${riskScore} conf=${confidenceResult.score.toFixed(2)} ` +
        `arch=${archetypeResult.archetype} (${durationMs}ms)`,
      );

      return result;

    } catch (error) {
      this.logger.error(
        `[RiskEngine] Pipeline failed for ${features.address}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Safe fallback — never crash callers, return UNKNOWN with explanation
      return this.unknownFallback(features, startTime, (error as Error).message);
    }
  }

  /**
   * Score multiple wallets in parallel.
   * Errors in individual wallets do not abort the batch.
   */
  async scoreBatch(featuresArray: WalletFeatures[]): Promise<WalletRiskResult[]> {
    this.logger.log(`[RiskEngine] Batch scoring ${featuresArray.length} wallets`);
    return Promise.all(featuresArray.map(f => this.score(f)));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private unknownFallback(
    features: WalletFeatures,
    startTime: number,
    errorMessage: string,
  ): WalletRiskResult {
    const { UNKNOWN: unkClass } = require('./types/risk-engine.types').RiskClassification;
    const { UNKNOWN: unkArch }  = require('./types/risk-engine.types').WalletArchetype;
    const { TRUST }             = require('./types/risk-engine.types').FactorType;

    return {
      address:          features.address,
      chainId:          features.chainId,
      risk_score:       0,
      confidence_score: 0,
      classification:   unkClass,
      archetype:        unkArch,
      factors: [{
        name:        'PIPELINE_ERROR',
        impact:      0,
        type:        TRUST,
        description: `Risk scoring pipeline encountered an error: ${errorMessage}`,
        weight:      0,
        confidence:  0,
      }],
      meta: {
        analyzedAt: new Date().toISOString(),
        version:    ENGINE_VERSION,
        durationMs: Date.now() - startTime,
        dataPoints: 0,
      },
    };
  }
}

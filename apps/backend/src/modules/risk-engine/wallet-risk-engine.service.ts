import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/logger/logger.service';
import {
  DEFAULT_SCORING_CONFIG,
  ScoringConfig,
  WalletFeatures,
  WalletRiskResult,
} from './types/risk-engine.types';
import { WalletClassifierService } from './stages/wallet-classifier.service';
import { RiskFactorService } from './stages/risk-factor.service';
import { ConfidenceScorerService } from './stages/confidence-scorer.service';
import { FinalClassifierService } from './stages/final-classifier.service';

const ENGINE_VERSION = '2.0.0';

@Injectable()
export class WalletRiskEngineService {
  private readonly context = WalletRiskEngineService.name;

  constructor(
    private readonly classifier: WalletClassifierService,
    private readonly factorService: RiskFactorService,
    private readonly confidenceScorer: ConfidenceScorerService,
    private readonly finalClassifier: FinalClassifierService,
    private readonly logger: LoggerService,
  ) {}

  configure(config: ScoringConfig): void {
    this.factorService.setConfig(config);
    this.finalClassifier.setConfig(config);
    this.logger.logWithContext(this.context, 'Scoring configuration updated', 'info', {
      type: 'risk-engine',
    });
  }

  async score(features: WalletFeatures): Promise<WalletRiskResult> {
    const startTime = Date.now();
    const dataPoints: number[] = [];

    this.logger.logWithContext(this.context, 'Scoring wallet', 'debug', {
      address: features.address,
      chainId: features.chainId,
      type: 'risk-engine',
    });

    try {
      const archetypeResult = this.classifier.classify(features);
      this.logger.logWithContext(this.context, 'Stage 2 archetype classified', 'debug', {
        address: features.address,
        archetype: archetypeResult.archetype,
        confidence: archetypeResult.confidence,
        type: 'risk-engine',
      });
      dataPoints.push(features.txCount, features.uniqueCounterparties);

      const factors = this.factorService.computeFactors(features, archetypeResult);
      this.logger.logWithContext(this.context, 'Stage 3 risk factors computed', 'debug', {
        address: features.address,
        factorCount: factors.length,
        type: 'risk-engine',
      });
      dataPoints.push(factors.length);

      const confidenceResult = this.confidenceScorer.compute(features, archetypeResult);
      this.logger.logWithContext(this.context, 'Stage 4 confidence scored', 'debug', {
        address: features.address,
        confidence: confidenceResult.score,
        type: 'risk-engine',
      });

      const riskScore = this.finalClassifier.computeRiskScore(factors);
      this.logger.logWithContext(this.context, 'Stage 5a risk score aggregated', 'debug', {
        address: features.address,
        riskScore,
        type: 'risk-engine',
      });

      const { classification, reasoning } = this.finalClassifier.classify(
        riskScore,
        confidenceResult,
        archetypeResult,
        factors,
        features,
      );
      this.logger.logWithContext(this.context, 'Stage 5b final classification complete', 'debug', {
        address: features.address,
        classification,
        reason: reasoning[0],
        type: 'risk-engine',
      });

      const durationMs = Date.now() - startTime;
      const result: WalletRiskResult = {
        address: features.address,
        chainId: features.chainId,
        risk_score: riskScore,
        confidence_score: confidenceResult.score,
        classification,
        archetype: archetypeResult.archetype,
        factors,
        meta: {
          analyzedAt: new Date().toISOString(),
          version: ENGINE_VERSION,
          durationMs,
          dataPoints: dataPoints.reduce((sum, n) => sum + n, 0),
        },
      };

      this.logger.logPerformance('wallet-risk-score', durationMs, {
        context: this.context,
        address: features.address,
        chainId: features.chainId,
        riskScore,
        classification,
      });

      return result;
    } catch (error) {
      this.logger.error(`Risk engine pipeline failed for ${features.address}`, error, {
        context: this.context,
        address: features.address,
        chainId: features.chainId,
        type: 'risk-engine',
      });
      return this.unknownFallback(features, startTime, (error as Error).message);
    }
  }

  async scoreBatch(featuresArray: WalletFeatures[]): Promise<WalletRiskResult[]> {
    this.logger.logWithContext(this.context, 'Batch scoring wallets', 'info', {
      walletCount: featuresArray.length,
      type: 'risk-engine',
    });
    return Promise.all(featuresArray.map((f) => this.score(f)));
  }

  private unknownFallback(
    features: WalletFeatures,
    startTime: number,
    errorMessage: string,
  ): WalletRiskResult {
    const { UNKNOWN: unkClass } = require('./types/risk-engine.types').RiskClassification;
    const { UNKNOWN: unkArch } = require('./types/risk-engine.types').WalletArchetype;
    const { TRUST } = require('./types/risk-engine.types').FactorType;

    return {
      address: features.address,
      chainId: features.chainId,
      risk_score: 0,
      confidence_score: 0,
      classification: unkClass,
      archetype: unkArch,
      factors: [{
        name: 'PIPELINE_ERROR',
        impact: 0,
        type: TRUST,
        description: `Risk scoring pipeline encountered an error: ${errorMessage}`,
        weight: 0,
        confidence: 0,
      }],
      meta: {
        analyzedAt: new Date().toISOString(),
        version: ENGINE_VERSION,
        durationMs: Date.now() - startTime,
        dataPoints: 0,
      },
    };
  }
}

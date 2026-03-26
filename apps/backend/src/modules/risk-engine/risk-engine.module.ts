// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/risk-engine.module.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { WalletRiskEngineService }  from './wallet-risk-engine.service';
import { WalletClassifierService }  from './stages/wallet-classifier.service';
import { RiskFactorService }        from './stages/risk-factor.service';
import { ConfidenceScorerService }  from './stages/confidence-scorer.service';
import { FinalClassifierService }   from './stages/final-classifier.service';
import { WalletFeatureExtractor }   from './stages/feature-extractor.service';

@Module({
  providers: [
    WalletRiskEngineService,
    WalletClassifierService,
    RiskFactorService,
    ConfidenceScorerService,
    FinalClassifierService,
    WalletFeatureExtractor,
  ],
  exports: [
    WalletRiskEngineService,
    WalletFeatureExtractor,
  ],
})
export class RiskEngineModule {}

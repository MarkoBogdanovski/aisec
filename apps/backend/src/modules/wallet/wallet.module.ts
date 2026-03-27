import { Module } from '@nestjs/common';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { WalletIntelligenceService } from './wallet-intelligence.service';

@Module({
  imports: [RiskEngineModule],
  providers: [WalletIntelligenceService],
  exports: [WalletIntelligenceService],
})
export class WalletModule {}

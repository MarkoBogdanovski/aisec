import { Module } from '@nestjs/common';
import { ContractAnalyzerModule } from '../contract-analyzer/contract-analyzer.module';
import { MarketModule } from '../market/market.module';
import { WalletIntelligenceModule } from '../wallet-intelligence/wallet-intelligence.module';
import { InvestigationsController } from './investigations.controller';
import { InvestigationsService } from './investigations.service';

@Module({
  imports: [ContractAnalyzerModule, WalletIntelligenceModule, MarketModule],
  controllers: [InvestigationsController],
  providers: [InvestigationsService],
})
export class InvestigationsModule {}

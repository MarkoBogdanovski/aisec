import { Module } from '@nestjs/common';
import { WalletIntelligenceController } from './wallet-intelligence.controller';
import { WalletIntelligenceService } from './wallet-intelligence.service';

@Module({
  controllers: [WalletIntelligenceController],
  providers: [WalletIntelligenceService],
})
export class WalletIntelligenceModule {}

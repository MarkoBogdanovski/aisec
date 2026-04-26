import { Module } from '@nestjs/common';
import { ChainIntelligenceController } from './chain-intelligence.controller';
import { ChainIntelligenceService } from './chain-intelligence.service';

@Module({
  controllers: [ChainIntelligenceController],
  providers: [ChainIntelligenceService],
  exports: [ChainIntelligenceService],
})
export class ChainIntelligenceModule {}

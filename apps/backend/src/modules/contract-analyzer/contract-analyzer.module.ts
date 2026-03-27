import { Module } from '@nestjs/common';
import { ContractAnalyzerService } from './contract-analyzer.service';
import { ContractAnalyzeWorkerService } from './contract-analyze.worker';
import { AnalysisController } from './analysis.controller';
import { ContractsReadController } from './contracts.controller';
import { JobsController } from './jobs.controller';
import { JobUpdatesService } from './job-updates.service';
import { RiskEngineModule }     from '../risk-engine/risk-engine.module';


@Module({
  imports: [
    RiskEngineModule,   // ← exports WalletRiskEngineService + WalletFeatureExtractor
  ],
  controllers: [AnalysisController, ContractsReadController, JobsController],
  providers: [ContractAnalyzerService, ContractAnalyzeWorkerService, JobUpdatesService],
  exports: [ContractAnalyzerService],
})
export class ContractAnalyzerModule {}
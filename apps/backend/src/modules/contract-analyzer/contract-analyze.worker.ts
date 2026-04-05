import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueService } from '../../queues/queue.service';
import { QUEUE_CONTRACT_ANALYZE } from '../../queues/queue.constants';
import { LoggerService } from '../../common/logger/logger.service';
import { ContractAnalyzerService } from './contract-analyzer.service';
import { ContractAnalysisJobDto } from './dto/contract-analysis.dto';
import { JobUpdatesService } from './job-updates.service';

@Injectable()
export class ContractAnalyzeWorkerService implements OnModuleInit {
  private readonly context = ContractAnalyzeWorkerService.name;

  constructor(
    private readonly queueService: QueueService,
    private readonly contractAnalyzerService: ContractAnalyzerService,
    private readonly jobUpdates: JobUpdatesService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    this.queueService.createQueue(QUEUE_CONTRACT_ANALYZE);
    const concurrency = parseInt(process.env.CONTRACT_QUEUE_CONCURRENCY || '10', 10);
    this.queueService.createWorker<ContractAnalysisJobDto>(
      QUEUE_CONTRACT_ANALYZE,
      async (job: Job<ContractAnalysisJobDto>) => {
        const startedAt = Date.now();
        const payload = { ...job.data, jobId: String(job.id) };
        const resultUrl = `/api/v1/contracts/${payload.chainId}/${payload.contractAddress}`;

        this.logger.logWithContext(this.context, 'Worker received contract analysis job', 'info', {
          jobId: String(job.id),
          chainId: payload.chainId,
          contractAddress: payload.contractAddress,
          type: 'contract-analysis-job',
        });
        await job.updateProgress(15);
        this.jobUpdates.publishJobStatus({
          job_id: String(job.id),
          status: 'active',
          ready: false,
          progress: 15,
          chain_id: payload.chainId,
          contract_address: payload.contractAddress,
          result_url: resultUrl,
        });

        try {
          const result = await this.contractAnalyzerService.analyzeContract(payload);
          await job.updateProgress(100);

          if (result.status === 'failed') {
            throw new Error(result.error || 'Analysis failed');
          }

          const analysis = await this.contractAnalyzerService.getAnalysisByJobId(String(job.id), payload);
          const update = {
            job_id: String(job.id),
            status: 'completed',
            ready: Boolean(analysis),
            progress: 100,
            chain_id: payload.chainId,
            contract_address: payload.contractAddress,
            result_url: resultUrl,
            analysis: analysis ?? undefined,
          };

          this.logger.logPerformance('contract-analysis-worker-job', Date.now() - startedAt, {
            context: this.context,
            jobId: String(job.id),
            chainId: payload.chainId,
            contractAddress: payload.contractAddress,
          });
          this.jobUpdates.publishJobStatus(update);
          this.jobUpdates.publishJobResult(update);
          return result;
        } catch (error) {
          const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
          const finalAttempt = job.attemptsMade + 1 >= attempts;
          const message = (error as Error).message;
          const update = {
            job_id: String(job.id),
            status: finalAttempt ? 'failed' : 'retrying',
            ready: false,
            progress: typeof job.progress === 'number' ? job.progress : 15,
            failed_reason: message,
            chain_id: payload.chainId,
            contract_address: payload.contractAddress,
            result_url: resultUrl,
          };

          this.logger.error('Contract analysis worker job failed', error, {
            context: this.context,
            jobId: String(job.id),
            chainId: payload.chainId,
            contractAddress: payload.contractAddress,
            type: 'contract-analysis-job',
          });
          this.jobUpdates.publishJobStatus(update);
          if (finalAttempt) {
            this.jobUpdates.publishJobResult(update);
          }

          throw error;
        }
      },
      { concurrency },
    );
    this.logger.logWithContext(this.context, 'Contract analysis worker is listening', 'info', {
      queueName: QUEUE_CONTRACT_ANALYZE,
      concurrency,
      type: 'contract-analysis-job',
    });
  }
}

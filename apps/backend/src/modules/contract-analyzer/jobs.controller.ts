import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueueService } from '../../queues/queue.service';
import { QUEUE_CONTRACT_ANALYZE } from '../../queues/queue.constants';
import { ContractAnalyzerService } from './contract-analyzer.service';
import type { ContractAnalysisJobDto } from './dto/contract-analysis.dto';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly queueService: QueueService,
    private readonly contractAnalyzer: ContractAnalyzerService,
  ) {}

  @Get(':jobId/result')
  @ApiOperation({ summary: 'Get persisted contract analysis result by job id' })
  async getJobResult(@Param('jobId') jobId: string) {
    const job = await this.queueService.getJob<ContractAnalysisJobDto>(QUEUE_CONTRACT_ANALYZE, jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    const analysis = await this.contractAnalyzer.getAnalysisByJobId(jobId, job.data);

    return {
      job_id: jobId,
      status: state,
      ready: state === 'completed' && Boolean(analysis),
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      failed_reason: job.failedReason || undefined,
      chain_id: job.data.chainId,
      contract_address: job.data.contractAddress,
      result_url:
        job.data.chainId && job.data.contractAddress
          ? `/api/v1/contracts/${job.data.chainId}/${job.data.contractAddress}`
          : undefined,
      analysis: state === 'completed' ? analysis ?? undefined : undefined,
    };
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Poll BullMQ job status for contract analysis' })
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.queueService.getJob(QUEUE_CONTRACT_ANALYZE, jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    return {
      job_id: jobId,
      status: state,
      progress: job.progress,
      result: job.returnvalue,
      failed_reason: job.failedReason,
    };
  }
}

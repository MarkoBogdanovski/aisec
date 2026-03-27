import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { ethers } from 'ethers';
import { ContractAnalyzerService } from './contract-analyzer.service';
import { AnalyzeContractV1Dto } from './dto/analyze-contract-v1.dto';
import { AnalyzeWalletV1Dto } from './dto/analyze-wallet-v1.dto';
import { JobUpdatesService } from './job-updates.service';
import { WalletIntelligenceService } from '../wallet/wallet-intelligence.service';

@ApiTags('Analysis')
@Controller('analyze')
export class AnalysisController {
  constructor(
    private readonly contractAnalyzer: ContractAnalyzerService,
    private readonly jobUpdates: JobUpdatesService,
    private readonly walletIntelligence: WalletIntelligenceService,
  ) {}

  @Post('contract')
  @HttpCode(202)
  @ApiOperation({ summary: 'Submit contract for async analysis (spec §7.3)' })
  @ApiResponse({ status: 202, description: 'Job accepted' })
  async analyzeContract(@Body() body: AnalyzeContractV1Dto) {
    let checksummed: string;
    try {
      checksummed = ethers.getAddress(body.contract_address.trim());
    } catch {
      throw new BadRequestException('Invalid contract_address');
    }

    const jobId = randomUUID();
    const resultUrl = `/api/v1/contracts/${body.chain_id}/${checksummed}`;

    await this.contractAnalyzer.enqueueContractAnalysis(
      {
        chainId: body.chain_id,
        contractAddress: checksummed,
        priority: body.priority ?? 'normal',
      },
      jobId,
    );

    this.jobUpdates.publishJobStatus({
      job_id: jobId,
      status: 'queued',
      ready: false,
      progress: 0,
      chain_id: body.chain_id,
      contract_address: checksummed,
      result_url: resultUrl,
    });

    return {
      job_id: jobId,
      status: 'queued' as const,
      estimated_seconds: 15,
      result_url: resultUrl,
    };
  }

  @Post('wallet')
  @HttpCode(200)
  @ApiOperation({ summary: 'Analyze wallet risk using risk engine and wallet intelligence modules' })
  @ApiResponse({ status: 200, description: 'Wallet risk analysis result' })
  async analyzeWallet(@Body() body: AnalyzeWalletV1Dto) {
    let checksummed: string;
    try {
      checksummed = ethers.getAddress(body.wallet_address.trim());
    } catch {
      throw new BadRequestException('Invalid wallet_address');
    }

    try {
      const result = await this.walletIntelligence.analyzeWallet({
        walletAddress: checksummed,
        chainId: body.chain_id,
        rpcUrl: body.rpc_url,
        forceReanalysis: body.forceReanalysis ?? false,
      });

      return {
        status: 'success' as const,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Wallet analysis failed: ${(error as Error).message}`);
    }
  }
}

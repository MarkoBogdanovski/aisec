import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractAnalyzerService } from './contract-analyzer.service';

@ApiTags('Contracts')
@Controller('contracts')
export class ContractsReadController {
  constructor(private readonly contractAnalyzer: ContractAnalyzerService) {}

  @Get(':chainId/:address')
  @ApiOperation({ summary: 'Latest contract risk analysis (spec §7.3)' })
  async getLatest(@Param('chainId') chainId: string, @Param('address') address: string) {
    const latest = await this.contractAnalyzer.getLatestAnalysis(chainId, address);
    if (!latest) {
      throw new NotFoundException('No analysis found for this contract');
    }

    return latest;
  }

  @Get(':chainId/:address/history')
  @ApiOperation({ summary: 'Analysis history for a contract' })
  async getHistory(@Param('chainId') chainId: string, @Param('address') address: string) {
    const history = await this.contractAnalyzer.getAnalysisHistory(chainId, address);
    if (!history) {
      throw new NotFoundException('Contract not found');
    }

    return history;
  }
}

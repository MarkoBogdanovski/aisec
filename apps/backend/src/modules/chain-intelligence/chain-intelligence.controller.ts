import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChainIntelligenceService } from './chain-intelligence.service';

@ApiTags('Chain Intelligence')
@Controller('chain')
export class ChainIntelligenceController {
  constructor(private readonly chainIntelligence: ChainIntelligenceService) {}

  @Get('contracts/:chainId/:address/ownership')
  @ApiOperation({ summary: 'Resolve ownership/admin information for a contract or program address' })
  async getOwnership(@Param('chainId') chainId: string, @Param('address') address: string) {
    return this.chainIntelligence.getContractOwnership(chainId, address);
  }

  @Get('wallets/:chainId/:address/assets')
  @ApiOperation({ summary: 'Resolve wallet holdings and recent activity from live chain/provider data' })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  async getWalletAssets(
    @Param('chainId') chainId: string,
    @Param('address') address: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.max(1, Math.min(100, Number(limit))) : 25;
    return this.chainIntelligence.getWalletSnapshot(chainId, address, parsedLimit);
  }
}

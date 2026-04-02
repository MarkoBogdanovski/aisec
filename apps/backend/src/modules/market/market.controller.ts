import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { PrismaService } from '../../common/database/prisma.service';
import { MarketService } from './market.service';

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'Live market analysis is generated per token and is not persisted' })
  async events() {
    return {
      persisted: false,
      message: 'Market activity is analyzed live per token via GET /market/token/:address?chainId=1&walletAddress=0x...',
    };
  }

  @Get('token/:address')
  @ApiOperation({ summary: 'Live token market analysis with optional wallet linkage' })
  @ApiQuery({ name: 'chainId', required: false, example: '1' })
  @ApiQuery({ name: 'walletAddress', required: false })
  async tokenSummary(
    @Param('address') address: string,
    @Query('chainId') chainId = '1',
    @Query('walletAddress') walletAddress?: string,
  ) {
    let checksummed: string;
    try {
      checksummed = ethers.getAddress(address.trim());
    } catch {
      throw new BadRequestException('Invalid token address');
    }

    let checksummedWallet: string | undefined;
    if (walletAddress) {
      try {
        checksummedWallet = ethers.getAddress(walletAddress.trim());
      } catch {
        throw new BadRequestException('Invalid walletAddress');
      }
    }

    const relatedContract = await this.prisma.contract.findFirst({
      where: {
        chainId,
        address: { equals: checksummed, mode: 'insensitive' },
      },
      include: { riskScores: { orderBy: { analyzedAt: 'desc' }, take: 1 } },
    });

    const analysis = await this.marketService.analyzeTokenActivity(
      chainId,
      checksummed,
      checksummedWallet,
    );

    return {
      token_address: checksummed,
      chain_id: chainId,
      symbol: analysis.token.symbol ?? relatedContract?.symbol ?? null,
      name: analysis.token.name ?? relatedContract?.name ?? null,
      standard: analysis.token.standard,
      latest_price: analysis.market.latest_price,
      price_unit: analysis.market.price_unit,
      market_cap_usd: analysis.market.market_cap_usd,
      volume_24h: analysis.market.volume_24h,
      price_change_24h: analysis.market.price_change_24h,
      price_change_1h: analysis.market.price_change_1h,
      token_analysis_score: analysis.analysis.score,
      token_analysis_severity: analysis.analysis.severity,
      contract_risk_score: relatedContract?.riskScores[0]?.score ?? null,
      recent_transaction_count: analysis.activity.recent_transaction_count,
      latest_transaction_at: analysis.activity.latest_transaction_at,
      wallet_connection: analysis.wallet_connection,
      signals: analysis.analysis.signals,
      sample_transactions: analysis.activity.sample_transactions,
      source: analysis.source,
      analyzed_at: analysis.analyzed_at,
    };
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/database/prisma.service';

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('events')
  @ApiOperation({ summary: 'Recent market anomaly events (spec §7.3)' })
  @ApiQuery({ name: 'limit', required: false })
  async events(@Query('limit') limit?: string) {
    const take = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.prisma.marketEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take,
    });
  }

  @Get('token/:address')
  @ApiOperation({ summary: 'Token threat summary (placeholder aggregation)' })
  async tokenSummary(@Param('address') address: string) {
    const rows = await this.prisma.marketEvent.findMany({
      where: { tokenAddress: { equals: address, mode: 'insensitive' } },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });
    const maxSeverity = rows[0]?.severity ?? 'none';
    return {
      token_address: address,
      event_count: rows.length,
      latest_severity: maxSeverity,
      recent_events: rows.slice(0, 10),
    };
  }
}

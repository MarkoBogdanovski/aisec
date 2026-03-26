import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IncidentStatus, Severity } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

@ApiTags('Incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List incidents (spec §7.3)' })
  @ApiQuery({ name: 'severity', required: false, enum: Severity })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  async list(
    @Query('severity') severity?: Severity,
    @Query('status') status?: IncidentStatus,
  ) {
    return this.prisma.incident.findMany({
      where: {
        ...(severity ? { severity } : {}),
        ...(status ? { status } : {}),
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Incident detail' })
  async get(@Param('id') id: string) {
    const row = await this.prisma.incident.findUnique({
      where: { id },
      include: { entities: true, findings: true },
    });
    if (!row) {
      throw new NotFoundException('Incident not found');
    }
    return row;
  }
}

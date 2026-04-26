import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthService } from './common/health/health.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed dependency health check endpoint' })
  async getHealth() {
    return this.healthService.getHealthReport();
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Basic liveness probe' })
  async getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Dependency readiness probe' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { LoggerService } from '../logger/logger.service';
import { resolveDatabaseProvider, resolveDatabaseUrl } from '../../config/database-url';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly context = PrismaService.name;

  constructor(private readonly logger: LoggerService) {
    const connectionString = resolveDatabaseUrl('runtime');
    if (!connectionString) {
      throw new Error('Missing required database connection string for the selected DATABASE_PROVIDER');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    } as any);

    this.pool = pool;
  }

  async onModuleInit() {
    const startedAt = Date.now();
    await this.$connect();

    (this as any).$on('query', (e: Prisma.QueryEvent) => {
      this.logger.logWithContext(this.context, 'Prisma query executed', 'debug', {
        query: e.query,
        params: e.params,
        duration: e.duration,
        type: 'database-query',
      });
      this.logger.logPerformance('prisma-query', e.duration, {
        context: this.context,
        query: e.query,
      });
    });

    (this as any).$on('error', (e: Prisma.LogEvent) => {
      this.logger.error('Database error', e, {
        context: this.context,
        type: 'database',
      });
    });

    (this as any).$on('info', (e: Prisma.LogEvent) => {
      this.logger.logWithContext(this.context, 'Database info', 'info', {
        message: e.message,
        type: 'database',
      });
    });

    (this as any).$on('warn', (e: Prisma.LogEvent) => {
      this.logger.logWithContext(this.context, 'Database warning', 'warn', {
        message: e.message,
        type: 'database',
      });
    });

    this.logger.logPerformance('database-connect', Date.now() - startedAt, {
      context: this.context,
      provider: resolveDatabaseProvider(),
    });
    this.logger.logWithContext(this.context, 'Database connected successfully');
  }

  async onModuleDestroy() {
    const startedAt = Date.now();
    await this.$disconnect();
    await this.pool.end();
    this.logger.logPerformance('database-disconnect', Date.now() - startedAt, {
      context: this.context,
    });
    this.logger.logWithContext(this.context, 'Database disconnected');
  }
}

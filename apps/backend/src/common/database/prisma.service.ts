import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Prisma 7 requires either an adapter or accelerateUrl in the PrismaClient ctor.
      // We fail fast with a clear message if the app is started without DATABASE_URL.
      throw new Error('Missing required environment variable: DATABASE_URL');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    } as any);

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    
    (this as any).$on('query', (e: Prisma.QueryEvent) => {
      this.logger.debug('Query: ' + e.query);
      this.logger.debug('Params: ' + e.params);
      this.logger.debug('Duration: ' + e.duration + 'ms');
    });

    (this as any).$on('error', (e: Prisma.LogEvent) => {
      this.logger.error('Database error:', e);
    });

    (this as any).$on('info', (e: Prisma.LogEvent) => {
      this.logger.info('Database info:', e);
    });

    (this as any).$on('warn', (e: Prisma.LogEvent) => {
      this.logger.warn('Database warning:', e);
    });

    this.logger.info('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.info('Database disconnected');
  }
}

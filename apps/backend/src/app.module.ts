import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';
import { QueueModule } from './queues/queue.module';
import { loggerConfig } from './config/logger.config';
import { ContractAnalyzerModule } from './modules/contract-analyzer/contract-analyzer.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { MarketModule } from './modules/market/market.module';
import { WalletIntelligenceModule } from './modules/wallet-intelligence/wallet-intelligence.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Logging
    WinstonModule.forRoot(loggerConfig),

    // Core modules
    DatabaseModule,
    RedisModule,
    LoggerModule,
    QueueModule,
    ContractAnalyzerModule,
    IncidentsModule,
    MarketModule,
    WalletIntelligenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

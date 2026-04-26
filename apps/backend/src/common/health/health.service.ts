import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../../queues/queue.service';

type HealthState = 'up' | 'degraded' | 'down';

type HealthCheck = {
  name: string;
  type: 'database' | 'redis' | 'queue' | 'http' | 'rpc';
  status: HealthState;
  endpoint?: string;
  configured: boolean;
  responseTimeMs?: number;
  details?: Record<string, unknown>;
};

const DEFAULT_EVM_ENDPOINTS: Array<{ name: string; env: string; endpoint: string }> = [
  { name: 'ethereum-rpc', env: 'ETHEREUM_RPC_URL', endpoint: 'https://eth.llamarpc.com' },
  { name: 'polygon-rpc', env: 'POLYGON_RPC_URL', endpoint: 'https://polygon-rpc.com' },
  { name: 'bsc-rpc', env: 'BSC_RPC_URL', endpoint: 'https://bsc-dataseed.binance.org' },
  { name: 'arbitrum-rpc', env: 'ARBITRUM_RPC_URL', endpoint: 'https://arb1.arbitrum.io/rpc' },
  { name: 'optimism-rpc', env: 'OPTIMISM_RPC_URL', endpoint: 'https://mainnet.optimism.io' },
  { name: 'avalanche-rpc', env: 'AVALANCHE_RPC_URL', endpoint: 'https://api.avax.network/ext/bc/C/rpc' },
  { name: 'fantom-rpc', env: 'FANTOM_RPC_URL', endpoint: 'https://rpc.ftm.tools' },
  { name: 'base-rpc', env: 'BASE_RPC_URL', endpoint: 'https://mainnet.base.org' },
];

@Injectable()
export class HealthService {
  private readonly cryptoApisBaseUrl = process.env.CRYPTOAPIS_BASE_URL || 'https://rest.cryptoapis.io';
  private readonly solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queueService: QueueService,
  ) {}

  async getHealthReport() {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
      this.checkCryptoApis(),
      ...DEFAULT_EVM_ENDPOINTS.map((entry) => this.checkEvmRpc(entry.name, process.env[entry.env] || entry.endpoint, Boolean(process.env[entry.env]))),
      this.checkSolanaRpc(this.solanaRpcUrl, Boolean(process.env.SOLANA_RPC_URL)),
    ]);

    const status = checks.some((check) => check.status === 'down')
      ? 'down'
      : checks.some((check) => check.status === 'degraded')
        ? 'degraded'
        : 'ok';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }

  async getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async getReadiness() {
    const report = await this.getHealthReport();
    return {
      status: report.status === 'down' ? 'down' : 'ready',
      timestamp: report.timestamp,
      checks: report.checks,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return {
        name: 'database',
        type: 'database',
        status: 'up',
        configured: true,
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        name: 'database',
        type: 'database',
        status: 'down',
        configured: true,
        responseTimeMs: Date.now() - startedAt,
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      const pong = await this.redis.getClient().ping();
      return {
        name: 'redis',
        type: 'redis',
        status: pong === 'PONG' ? 'up' : 'degraded',
        configured: true,
        responseTimeMs: Date.now() - startedAt,
        details: { pong },
      };
    } catch (error) {
      return {
        name: 'redis',
        type: 'redis',
        status: 'down',
        configured: true,
        responseTimeMs: Date.now() - startedAt,
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkQueue(): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      const queueNames = this.queueService.getQueueNames();
      const stats = await Promise.all(
        queueNames.map(async (queueName) => ({
          queueName,
          counts: await this.queueService.getJobCounts(queueName),
        })),
      );

      return {
        name: 'queue',
        type: 'queue',
        status: 'up',
        configured: true,
        responseTimeMs: Date.now() - startedAt,
        details: {
          queues: stats,
        },
      };
    } catch (error) {
      return {
        name: 'queue',
        type: 'queue',
        status: 'down',
        configured: true,
        responseTimeMs: Date.now() - startedAt,
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkCryptoApis(): Promise<HealthCheck> {
    const configured = Boolean(process.env.CRYPTOAPIS_API_KEY);
    const endpoint = `${this.cryptoApisBaseUrl}/market-data/assets/by-symbol/ETH`;
    if (!configured) {
      return {
        name: 'cryptoapis',
        type: 'http',
        status: 'degraded',
        configured: false,
        endpoint,
        details: { error: 'CRYPTOAPIS_API_KEY is not configured' },
      };
    }

    const startedAt = Date.now();
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CRYPTOAPIS_API_KEY as string,
        },
        signal: AbortSignal.timeout(10000),
      });
      const payload = await response.json().catch(() => null);
      return {
        name: 'cryptoapis',
        type: 'http',
        status: response.ok ? 'up' : 'down',
        configured,
        endpoint,
        responseTimeMs: Date.now() - startedAt,
        details: {
          httpStatus: response.status,
          error: response.ok ? undefined : payload?.error?.message || 'Crypto APIs health probe failed',
        },
      };
    } catch (error) {
      return {
        name: 'cryptoapis',
        type: 'http',
        status: 'down',
        configured,
        endpoint,
        responseTimeMs: Date.now() - startedAt,
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkEvmRpc(name: string, endpoint: string, configured: boolean): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: [],
        }),
        signal: AbortSignal.timeout(10000),
      });
      const payload = await response.json().catch(() => null);
      const ok = response.ok && typeof payload?.result === 'string';
      return {
        name,
        type: 'rpc',
        status: ok ? 'up' : 'down',
        configured,
        endpoint,
        responseTimeMs: Date.now() - startedAt,
        details: {
          latestBlock: payload?.result,
          httpStatus: response.status,
          error: ok ? undefined : payload?.error?.message || 'RPC health probe failed',
        },
      };
    } catch (error) {
      return {
        name,
        type: 'rpc',
        status: 'down',
        configured,
        endpoint,
        responseTimeMs: Date.now() - startedAt,
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkSolanaRpc(endpoint: string, configured: boolean): Promise<HealthCheck> {
    const startedAt = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: [],
        }),
        signal: AbortSignal.timeout(10000),
      });
      const payload = await response.json().catch(() => null);
      const ok = response.ok && payload?.result === 'ok';
      return {
        name: 'solana-rpc',
        type: 'rpc',
        status: ok ? 'up' : 'down',
        configured,
        endpoint,
        responseTimeMs: Date.now() - startedAt,
        details: {
          result: payload?.result,
          httpStatus: response.status,
          error: ok ? undefined : payload?.error?.message || 'Solana RPC health probe failed',
        },
      };
    } catch (error) {
      return {
        name: 'solana-rpc',
        type: 'rpc',
        status: 'down',
        configured,
        endpoint,
        responseTimeMs: Date.now() - startedAt,
        details: { error: (error as Error).message },
      };
    }
  }
}

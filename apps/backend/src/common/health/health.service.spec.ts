import { HealthService } from './health.service';

describe('HealthService', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.CRYPTOAPIS_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.CRYPTOAPIS_API_KEY = originalApiKey;
    jest.restoreAllMocks();
  });

  it('reports healthy configured dependencies and endpoints', async () => {
    process.env.CRYPTOAPIS_API_KEY = 'test-key';

    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;

      if (body?.method === 'eth_blockNumber') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: '0x123' }),
        } as Response;
      }

      if (body?.method === 'getHealth') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: 'ok' }),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { item: { symbol: 'ETH' } } }),
      } as Response;
    }) as typeof fetch;

    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const redis = {
      getClient: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      }),
    };
    const queue = {
      getQueueNames: jest.fn().mockReturnValue(['contract-analyze']),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 1,
        active: 0,
        completed: 2,
        failed: 0,
        delayed: 0,
        paused: 0,
      }),
    };

    const service = new HealthService(prisma as any, redis as any, queue as any);
    const report = await service.getHealthReport();

    expect(report.status).toBe('ok');
    expect(report.checks.find((check: any) => check.name === 'database')?.status).toBe('up');
    expect(report.checks.find((check: any) => check.name === 'redis')?.status).toBe('up');
    expect(report.checks.find((check: any) => check.name === 'queue')?.details?.queues).toHaveLength(1);
    expect(report.checks.find((check: any) => check.name === 'cryptoapis')?.status).toBe('up');
    expect(report.checks.find((check: any) => check.name === 'solana-rpc')?.status).toBe('up');
  });

  it('marks Crypto APIs as degraded when its key is missing', async () => {
    delete process.env.CRYPTOAPIS_API_KEY;

    global.fetch = jest.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: body?.method === 'getHealth' ? 'ok' : '0x123' }),
      } as Response;
    }) as typeof fetch;

    const service = new HealthService(
      { $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as any,
      { getClient: jest.fn().mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') }) } as any,
      { getQueueNames: jest.fn().mockReturnValue([]), getJobCounts: jest.fn() } as any,
    );

    const report = await service.getHealthReport();
    expect(report.status).toBe('degraded');
    expect(report.checks.find((check: any) => check.name === 'cryptoapis')?.status).toBe('degraded');
  });
});

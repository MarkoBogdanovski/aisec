import { Network } from '@prisma/client';
import { ChainIntelligenceService } from './chain-intelligence.service';

describe('ChainIntelligenceService', () => {
  const logger = {
    logWithContext: jest.fn(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves EVM contract ownership details', async () => {
    const service = new ChainIntelligenceService(logger as any);
    jest.spyOn(service as any, 'createEvmProvider').mockReturnValue({
      getCode: jest.fn().mockResolvedValue('0x60006000'),
    });
    jest.spyOn(service as any, 'tryContractMethod')
      .mockResolvedValueOnce('0x000000000000000000000000000000000000dEaD')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('0x000000000000000000000000000000000000bEEF')
      .mockResolvedValueOnce(null);
    jest.spyOn(service as any, 'resolveImplementation').mockResolvedValue('0x000000000000000000000000000000000000c0Fe');

    const result = await service.getContractOwnership('1', '0x0000000000000000000000000000000000000001');

    expect(result.address_type).toBe('contract');
    expect(result.owner_address).toBe('0x000000000000000000000000000000000000dEaD');
    expect(result.admin_address).toBe('0x000000000000000000000000000000000000bEEF');
    expect(result.implementation_address).toBe('0x000000000000000000000000000000000000c0Fe');
    expect(result.controlling_addresses).toEqual([
      '0x000000000000000000000000000000000000dEaD',
      '0x000000000000000000000000000000000000bEEF',
    ]);
  });

  it('returns EVM wallet token holdings and trade history', async () => {
    const service = new ChainIntelligenceService(logger as any);
    jest.spyOn(service as any, 'createEvmProvider').mockReturnValue({
      getBalance: jest.fn().mockResolvedValue(1000000000000000000n),
      getTransactionCount: jest.fn().mockResolvedValue(7),
      getBlockNumber: jest.fn().mockResolvedValue(123456),
      getCode: jest.fn().mockResolvedValue('0x'),
    });
    jest.spyOn(service as any, 'requestCryptoApisJson')
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              contractAddress: '0x00000000000000000000000000000000000000AA',
              symbol: 'USDC',
              name: 'USD Coin',
              type: 'ERC-20',
              balance: '1250000',
              decimals: 6,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              hash: '0xtx',
              sender: '0xfrom',
              recipient: '0xto',
              value: '42',
              timestamp: 1710000000,
              status: 'confirmed',
              blockHeight: 99,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              transactionHash: '0xtransfer',
              sender: '0xfrom',
              recipient: '0xto',
              timestamp: 1710000001,
              tokenData: {
                contractAddress: '0x00000000000000000000000000000000000000AA',
                symbol: 'USDC',
                name: 'USD Coin',
                fungibleValues: { amount: '1000' },
              },
            },
          ],
        },
      });

    const result = await service.getWalletSnapshot('1', '0x0000000000000000000000000000000000000002', 10) as any;

    expect(result.address_type).toBe('wallet');
    expect(result.native_balance).toBe('1.0');
    expect(result.token_holdings).toHaveLength(1);
    expect(result.token_holdings[0].symbol).toBe('USDC');
    expect(result.trade_history.transactions[0].hash).toBe('0xtx');
    expect(result.trade_history.token_transfers[0].token_symbol).toBe('USDC');
  });

  it('returns Solana wallet holdings and recent transactions', async () => {
    const service = new ChainIntelligenceService(logger as any);
    jest.spyOn(service as any, 'solanaRpc')
      .mockResolvedValueOnce({ value: 2500000000 })
      .mockResolvedValueOnce({
        value: [
          {
            pubkey: 'TokenAccount1',
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'Mint1',
                    owner: 'Wallet1',
                    tokenAmount: {
                      amount: '5000',
                      decimals: 6,
                      uiAmountString: '0.005',
                    },
                  },
                },
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce([
        {
          signature: 'Sig1',
          slot: 10,
          blockTime: 1710000020,
          confirmationStatus: 'finalized',
          err: null,
        },
      ])
      .mockResolvedValueOnce({
        meta: { fee: 5000 },
      });

    const result = await service.getWalletSnapshot('sol', 'Wallet1', 5) as any;

    expect(result.chain_family).toBe('solana');
    expect(result.native_balance_sol).toBe('2.5');
    expect(result.token_holdings[0].mint).toBe('Mint1');
    expect(result.trade_history.transactions[0].signature).toBe('Sig1');
    expect(result.trade_history.transactions[0].fee).toBe(5000);
  });

  it('returns Solana account owner for ownership lookups', async () => {
    const service = new ChainIntelligenceService(logger as any);
    jest.spyOn(service as any, 'solanaRpc').mockResolvedValue({
      value: {
        owner: 'BPFLoaderUpgradeab1e11111111111111111111111',
        executable: true,
        lamports: 1,
      },
    });

    const result = await service.getContractOwnership('solana', 'Program1111111111111111111111111111111111');

    expect(result.address_type).toBe('program');
    expect(result.owner_address).toBe('BPFLoaderUpgradeab1e11111111111111111111111');
    expect(result.controlling_addresses).toEqual(['BPFLoaderUpgradeab1e11111111111111111111111']);
  });
});

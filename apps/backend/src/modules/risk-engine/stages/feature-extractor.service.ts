import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { LoggerService } from '../../../common/logger/logger.service';
import { PrismaService } from '../../../common/database/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { WalletFeatures } from '../types/risk-engine.types';

const KNOWN_EXCHANGES = new Set([
  '0x28C6c06298d514Db089934071355E5743bf21d60',
  '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549',
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',
  '0xA9D1e08C7793af67e9d92fe308d5697FB81d3E43',
  '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3',
  '0x503828976D22510aad0201ac7EC88293211D23Da',
  '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
]);

const KNOWN_PROTOCOLS = new Set([
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
]);

const KNOWN_DEFI_LABELS = new Set(['uniswap', 'aave', 'compound', 'curve', 'balancer', 'makerdao', 'sushiswap', '1inch', 'lido', 'convex', 'yearn', 'gmx']);

const MIXER_ADDRESSES = new Set([
  '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
  '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
  '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
  '0x178169B423a011fff22B9e3F3abeA13414dDD0F1',
]);

const FEATURE_CACHE_TTL = 300;

@Injectable()
export class WalletFeatureExtractor {
  private readonly context = WalletFeatureExtractor.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async extract(
    address: string,
    chainId: string,
    provider: ethers.JsonRpcProvider,
  ): Promise<WalletFeatures> {
    const startedAt = Date.now();
    const checksummed = ethers.getAddress(address);
    const cacheKey = `wallet:features:v2:${chainId}:${checksummed.toLowerCase()}`;

    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        this.logger.logWithContext(this.context, 'Wallet feature cache hit', 'debug', {
          chainId,
          walletAddress: checksummed,
          type: 'wallet-features',
        });
        return JSON.parse(cached) as WalletFeatures;
      } catch {
        await this.redis.del(cacheKey).catch(() => null);
      }
    }

    const [walletRecord, balance, isSanctioned] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { chainId_address: { chainId, address: checksummed } },
      }).catch(() => null),
      provider.getBalance(checksummed).catch(() => 0n),
      this.checkSanctioned(checksummed),
    ]);

    const txCount = (walletRecord as any)?.txCount ?? 0;
    const firstSeenAt = (walletRecord as any)?.firstSeenAt ?? null;
    const lastSeenAt = (walletRecord as any)?.lastSeenAt ?? null;
    const labels = (walletRecord as any)?.labels ?? [];
    const contractsDeployed = (walletRecord as any)?.contractsDeployed ?? 0;

    const walletAgeMs = firstSeenAt ? Date.now() - new Date(firstSeenAt).getTime() : 0;
    const walletAgeHours = walletAgeMs / (1000 * 60 * 60);
    const walletAgeDays = walletAgeHours / 24;

    const avgTxFrequencyPerDay = walletAgeDays > 0 ? txCount / Math.max(1, walletAgeDays) : 0;
    const balanceEth = parseFloat(ethers.formatEther(balance));
    const defiProtocols = this.extractDefiProtocols(labels);

    const latestScore = (walletRecord as any)?.reputationScores?.[0];
    const mixerProximityHops = latestScore?.mixerProximity ?? null;
    const mixerInteractionDirect = MIXER_ADDRESSES.has(checksummed) ||
      (mixerProximityHops !== null && mixerProximityHops === 0);

    const uniqueCounterparties = (walletRecord as any)?.uniqueCounterparties ?? 0;
    const highRiskCounterparties = (walletRecord as any)?.highRiskCounterparties ?? 0;
    const totalCounterparties = (walletRecord as any)?.totalCounterparties ?? uniqueCounterparties;
    const dexInteractions = (walletRecord as any)?.dexInteractions ?? 0;

    const features: WalletFeatures = {
      address: checksummed,
      chainId,
      txCount,
      uniqueCounterparties,
      contractsDeployed,
      dexInteractions,
      defiProtocols,
      firstSeenAt: firstSeenAt ? new Date(firstSeenAt) : null,
      lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
      walletAgeHours,
      avgTxFrequencyPerDay,
      nativeBalanceEth: balanceEth,
      totalVolumeUsd: (walletRecord as any)?.totalVolumeUsd ?? 0,
      labels,
      isSanctioned,
      isKnownExchange: KNOWN_EXCHANGES.has(checksummed) || labels.some((l: string) => l.toLowerCase().includes('exchange')),
      isKnownProtocol: KNOWN_PROTOCOLS.has(checksummed) || labels.some((l: string) => l.toLowerCase().includes('protocol')),
      mixerProximityHops,
      mixerInteractionDirect,
      hasDeployedContracts: contractsDeployed > 0,
      deployedContractAddresses: (walletRecord as any)?.deployedContracts ?? [],
      highRiskCounterparties,
      totalCounterparties,
    };

    await this.redis.set(cacheKey, JSON.stringify(features), FEATURE_CACHE_TTL).catch(() => null);
    this.logger.logPerformance('wallet-feature-extraction', Date.now() - startedAt, {
      context: this.context,
      chainId,
      walletAddress: checksummed,
      txCount,
      type: 'wallet-features',
    });

    return features;
  }

  private extractDefiProtocols(labels: string[]): string[] {
    return labels.filter((l) => KNOWN_DEFI_LABELS.has(l.toLowerCase()));
  }

  private async checkSanctioned(address: string): Promise<boolean> {
    try {
      const record = (this.prisma as any).sanctionedAddress
        ? await (this.prisma as any).sanctionedAddress.findUnique({
            where: { address: address.toLowerCase() },
          })
        : null;
      return record !== null;
    } catch {
      return false;
    }
  }
}

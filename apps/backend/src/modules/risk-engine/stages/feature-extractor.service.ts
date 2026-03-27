// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/stages/feature-extractor.service.ts
//
// Stage 1: Feature Extraction
//
// Pulls raw on-chain + off-chain data and normalises it into WalletFeatures.
// This is the only stage that talks to external services (RPC, DB, Redis).
// All downstream stages are pure functions of WalletFeatures.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService } from '../../../common/database/prisma.service';
import { RedisService }  from '../../../common/redis/redis.service';
import { WalletFeatures } from '../types/risk-engine.types';

// Known protocol addresses — extend this from DB in production
const KNOWN_EXCHANGES = new Set([
  '0x28C6c06298d514Db089934071355E5743bf21d60', // Binance
  '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549', // Binance cold
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', // Binance whale
  '0xA9D1e08C7793af67e9d92fe308d5697FB81d3E43', // Coinbase
  '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3', // Coinbase 2
  '0x503828976D22510aad0201ac7EC88293211D23Da', // Coinbase 3
  '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', // Binance old
]);

const KNOWN_PROTOCOLS = new Set([
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
  '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Universal Router
  '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', // Aave V2
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3
  '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // Uniswap V2 Factory
]);

const KNOWN_DEFI_LABELS = new Set(['uniswap', 'aave', 'compound', 'curve', 'balancer',
  'makerdao', 'sushiswap', '1inch', 'lido', 'convex', 'yearn', 'gmx']);

// Mixer addresses — extend from DB
const MIXER_ADDRESSES = new Set([
  '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b', // Tornado Cash 0.1 ETH
  '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF', // Tornado Cash 1 ETH
  '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291', // Tornado Cash 10 ETH
  '0x178169B423a011fff22B9e3F3abeA13414dDD0F1', // Tornado Cash 100 ETH
]);

const FEATURE_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class WalletFeatureExtractor {
  private readonly logger = new Logger(WalletFeatureExtractor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
  ) {}

  async extract(
    address: string,
    chainId: string,
    provider: ethers.JsonRpcProvider,
  ): Promise<WalletFeatures> {
    const checksummed = ethers.getAddress(address);
    const cacheKey    = `wallet:features:v2:${chainId}:${checksummed.toLowerCase()}`;

    // ── Cache check ───────────────────────────────────────────────────────
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached) as WalletFeatures;
      } catch {
        await this.redis.del(cacheKey).catch(() => null);
      }
    }

    // ── Parallel data fetch ───────────────────────────────────────────────
    const [
      walletRecord,
      balance,
      isSanctioned,
    ] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { chainId_address: { chainId, address: checksummed } },
      }).catch(() => null),

      provider.getBalance(checksummed).catch(() => 0n),

      this.checkSanctioned(checksummed),
    ]);

    // ── Derive features from DB record ────────────────────────────────────
    const txCount              = walletRecord?.txCount ?? 0;
    const firstSeenAt          = walletRecord?.firstSeenAt ?? null;
    const lastSeenAt           = walletRecord?.lastSeenAt ?? null;
    const labels               = walletRecord?.labels ?? [];
    const contractsDeployed    = walletRecord?.contractsDeployed ?? 0;

    const walletAgeMs    = firstSeenAt ? Date.now() - new Date(firstSeenAt).getTime() : 0;
    const walletAgeHours = walletAgeMs / (1000 * 60 * 60);
    const walletAgeDays  = walletAgeHours / 24;

    const avgTxFrequencyPerDay = walletAgeDays > 0
      ? txCount / Math.max(1, walletAgeDays)
      : 0;

    const balanceEth = parseFloat(ethers.formatEther(balance));

    // ── Derive DeFi protocol interactions ─────────────────────────────────
    const defiProtocols = this.extractDefiProtocols(labels);

    // ── Mixer proximity from DB ───────────────────────────────────────────
    const latestScore           = walletRecord?.reputationScores[0];
    const mixerProximityHops    = latestScore?.mixerProximity ?? null;
    const mixerInteractionDirect = MIXER_ADDRESSES.has(checksummed) ||
      (mixerProximityHops !== null && mixerProximityHops === 0);

    // ── Counterparty risk data ────────────────────────────────────────────
    const uniqueCounterparties  = walletRecord?.uniqueCounterparties ?? 0;
    const highRiskCounterparties = walletRecord?.highRiskCounterparties ?? 0;
    const totalCounterparties   = walletRecord?.totalCounterparties ?? uniqueCounterparties;
    const dexInteractions       = walletRecord?.dexInteractions ?? 0;

    const features: WalletFeatures = {
      address:               checksummed,
      chainId,
      txCount,
      uniqueCounterparties,
      contractsDeployed,
      dexInteractions,
      defiProtocols,
      firstSeenAt:           firstSeenAt ? new Date(firstSeenAt) : null,
      lastSeenAt:            lastSeenAt  ? new Date(lastSeenAt)  : null,
      walletAgeHours,
      avgTxFrequencyPerDay,
      nativeBalanceEth:      balanceEth,
      totalVolumeUsd:        walletRecord?.totalVolumeUsd ?? 0,
      labels,
      isSanctioned,
      isKnownExchange:       KNOWN_EXCHANGES.has(checksummed) ||
                             labels.some(l => l.toLowerCase().includes('exchange')),
      isKnownProtocol:       KNOWN_PROTOCOLS.has(checksummed) ||
                             labels.some(l => l.toLowerCase().includes('protocol')),
      mixerProximityHops,
      mixerInteractionDirect,
      hasDeployedContracts:  contractsDeployed > 0,
      deployedContractAddresses: walletRecord?.deployedContracts ?? [],
      highRiskCounterparties,
      totalCounterparties,
    };

    // ── Cache result ──────────────────────────────────────────────────────
    await this.redis
      .set(cacheKey, JSON.stringify(features), FEATURE_CACHE_TTL)
      .catch(() => null);

    return features;
  }

  private extractDefiProtocols(labels: string[]): string[] {
    return labels.filter(l => KNOWN_DEFI_LABELS.has(l.toLowerCase()));
  }

  private async checkSanctioned(address: string): Promise<boolean> {
    try {
      const record = await this.prisma.sanctionedAddress.findUnique({
        where: { address: address.toLowerCase() },
      });
      return record !== null;
    } catch {
      return false;
    }
  }
}

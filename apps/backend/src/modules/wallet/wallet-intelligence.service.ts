import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LoggerService } from '../../common/logger/logger.service';
import { WalletRiskEngineService } from '../risk-engine/wallet-risk-engine.service';
import { WalletFeatureExtractor } from '../risk-engine/stages/feature-extractor.service';
import { WalletRiskResult } from '../risk-engine/types/risk-engine.types';

const RESULT_CACHE_TTL = 3600;

export interface WalletAnalysisJobDto {
  walletAddress: string;
  chainId: string;
  jobId?: string;
  rpcUrl?: string;
  forceReanalysis?: boolean;
}

@Injectable()
export class WalletIntelligenceService {
  private readonly context = WalletIntelligenceService.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly riskEngine: WalletRiskEngineService,
    private readonly extractor: WalletFeatureExtractor,
  ) {}

  async analyzeWallet(job: WalletAnalysisJobDto): Promise<WalletRiskResult> {
    const startTime = Date.now();
    let address: string;

    try {
      address = ethers.getAddress(job.walletAddress.trim());
    } catch {
      throw new Error(`Invalid wallet address: ${job.walletAddress}`);
    }

    const cacheKey = `wallet:result:v2:${job.chainId}:${address.toLowerCase()}`;

    if (!job.forceReanalysis) {
      const cached = await this.redis.get(cacheKey).catch(() => null);
      if (cached) {
        try {
          this.logger.logWithContext(this.context, 'Wallet analysis cache hit', 'debug', {
            chainId: job.chainId,
            walletAddress: address,
            type: 'wallet-analysis',
          });
          return JSON.parse(cached) as WalletRiskResult;
        } catch {
          await this.redis.del(cacheKey).catch(() => null);
        }
      }
    }

    const rpcUrl = job.rpcUrl || process.env.ETHEREUM_RPC_URL || '';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    this.logger.logWithContext(this.context, 'Extracting wallet features', 'info', {
      chainId: job.chainId,
      walletAddress: address,
      type: 'wallet-analysis',
    });
    const features = await this.extractor.extract(address, job.chainId, provider);

    this.logger.logWithContext(this.context, 'Running wallet risk pipeline', 'info', {
      chainId: job.chainId,
      walletAddress: address,
      type: 'wallet-analysis',
    });
    const result = await this.riskEngine.score(features);

    await this.persist(result, job.jobId);
    await this.redis.set(cacheKey, JSON.stringify(result), RESULT_CACHE_TTL).catch(() => null);

    this.logger.logPerformance('wallet-analysis', Date.now() - startTime, {
      context: this.context,
      chainId: job.chainId,
      walletAddress: address,
      classification: result.classification,
      riskScore: result.risk_score,
    });

    return result;
  }

  private async persist(result: WalletRiskResult, jobId?: string): Promise<void> {
    try {
      const walletRecord = await this.prisma.wallet.upsert({
        where: { chainId_address: { chainId: result.chainId, address: result.address } },
        create: {
          chainId: result.chainId,
          address: result.address,
        },
        update: {},
      });

      await this.prisma.walletReputationScore.create({
        data: {
          walletId: walletRecord.id,
          score: result.risk_score,
          sanctionFlag: result.factors.some((f) => f.name === 'SANCTIONED_ADDRESS'),
          mixerProximity: this.extractMixerHops(result),
          subScores: result.factors as object[],
        } as any,
      });
    } catch (error) {
      this.logger.error(`Failed to persist wallet result for ${result.address}`, error, {
        context: this.context,
        jobId,
        chainId: result.chainId,
        walletAddress: result.address,
        type: 'wallet-analysis',
      });
    }
  }

  private extractMixerHops(result: WalletRiskResult): number | null {
    const directMixer = result.factors.find((f) => f.name === 'DIRECT_MIXER_INTERACTION');
    if (directMixer) return 0;

    const hop1 = result.factors.find((f) => f.name === 'MIXER_PROXIMITY_1_HOP');
    if (hop1) return 1;

    const hop2 = result.factors.find((f) => f.name === 'MIXER_PROXIMITY_2_HOPS');
    if (hop2) return 2;

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/modules/wallet/wallet-intelligence.service.ts
//
// Wallet Intelligence Worker — updated to use 5-stage risk engine.
// Replaces the old hard-threshold scoring with the new probabilistic pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService }            from '../../common/database/prisma.service';
import { RedisService }             from '../../common/redis/redis.service';
import { WalletRiskEngineService }  from '../risk-engine/wallet-risk-engine.service';
import { WalletFeatureExtractor }   from '../risk-engine/stages/feature-extractor.service';
import { RiskClassification, WalletRiskResult } from '../risk-engine/types/risk-engine.types';
import { networkFromChainId }       from '../../common/web3/chain-mapping';

const RESULT_CACHE_TTL = 3600; // 1 hour

export interface WalletAnalysisJobDto {
  walletAddress: string;
  chainId:       string;
  jobId?:        string;
  rpcUrl?:       string;
  forceReanalysis?: boolean;
}

@Injectable()
export class WalletIntelligenceService {
  private readonly logger = new Logger(WalletIntelligenceService.name);

  constructor(
    private readonly prisma:     PrismaService,
    private readonly redis:      RedisService,
    private readonly riskEngine: WalletRiskEngineService,
    private readonly extractor:  WalletFeatureExtractor,
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

    // ── Cache check ───────────────────────────────────────────────────────
    if (!job.forceReanalysis) {
      const cached = await this.redis.get(cacheKey).catch(() => null);
      if (cached) {
        try {
          this.logger.debug(`Cache hit: wallet ${address}`);
          return JSON.parse(cached) as WalletRiskResult;
        } catch {
          await this.redis.del(cacheKey).catch(() => null);
        }
      }
    }

    const rpcUrl  = job.rpcUrl || process.env.ETHEREUM_RPC_URL || '';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // ── Stage 1: Feature Extraction ───────────────────────────────────────
    this.logger.log(`[WalletIntelligence] Extracting features for ${address}`);
    const features = await this.extractor.extract(address, job.chainId, provider);

    // ── Stages 2–5: Risk Engine Pipeline ──────────────────────────────────
    this.logger.log(`[WalletIntelligence] Running risk pipeline for ${address}`);
    const result = await this.riskEngine.score(features);

    // ── Persist to DB ─────────────────────────────────────────────────────
    await this.persist(result, job.jobId);

    // ── Cache result ──────────────────────────────────────────────────────
    await this.redis
      .set(cacheKey, JSON.stringify(result), RESULT_CACHE_TTL)
      .catch(() => null);

    this.logger.log(
      `[WalletIntelligence] Done ${address} → ` +
      `${result.classification} score=${result.risk_score} ` +
      `conf=${result.confidence_score.toFixed(2)} ` +
      `(${Date.now() - startTime}ms)`,
    );

    return result;
  }

  // ── DB persistence ────────────────────────────────────────────────────────

  private async persist(result: WalletRiskResult, jobId?: string): Promise<void> {
    try {
      const network = networkFromChainId(result.chainId);

      const walletRecord = await this.prisma.wallet.upsert({
        where: { chainId_address: { chainId: result.chainId, address: result.address } },
        create: {
          chainId:     result.chainId,
          address:     result.address,
        },
        update: {},
      });

      await this.prisma.walletReputationScore.create({
        data: {
          walletId:      walletRecord.id,
          score:         result.risk_score,
          classification: result.classification,
          archetype:     result.archetype,
          confidenceScore: result.confidence_score,
          sanctionFlag:  result.factors.some(f => f.name === 'SANCTIONED_ADDRESS'),
          mixerProximity: this.extractMixerHops(result),
          subScores:     result.factors as object[],
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist wallet result for ${result.address}: ${(error as Error).message}`,
      );
      // Don't throw — persist failure should not fail the analysis
    }
  }

  private extractMixerHops(result: WalletRiskResult): number | null {
    const directMixer = result.factors.find(f => f.name === 'DIRECT_MIXER_INTERACTION');
    if (directMixer) return 0;

    const hop1 = result.factors.find(f => f.name === 'MIXER_PROXIMITY_1_HOP');
    if (hop1) return 1;

    const hop2 = result.factors.find(f => f.name === 'MIXER_PROXIMITY_2_HOPS');
    if (hop2) return 2;

    return null;
  }
}

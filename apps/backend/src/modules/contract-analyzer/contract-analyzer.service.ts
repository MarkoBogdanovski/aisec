// ─────────────────────────────────────────────────────────────────────────────
// src/modules/contract-analyzer/contract-analyzer.service.ts
//
// INTEGRATION NOTES
// ─────────────────
// The WalletRiskEngineService is injected as an OPTIONAL dependency.
// If it is not available (e.g. in unit tests or isolated workers), the
// contract analyzer degrades gracefully — no wallet scoring, full contract
// analysis still runs.
//
// Risk engine touch-points:
//   1. deployerWalletScore()   — scores the contract deployer wallet
//                                and applies a trust discount to the
//                                contract's final score if the deployer
//                                is classified SAFE or LOW_RISK.
//   2. severityBucket()        — now accepts deployer classification
//                                as part of the context object.
//   3. KNOWN_SAFE_CONTRACTS    — allowlist short-circuit (unchanged).
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ethers } from 'ethers';
import {
  ContractType,
  FindingType as PrismaFindingType,
  Network as PrismaNetwork,
  Severity as PrismaSeverity,
} from '@prisma/client';
import { QueueService }     from '../../queues/queue.service';
import { QUEUE_CONTRACT_ANALYZE } from '../../queues/queue.constants';
import { PrismaService }    from '../../common/database/prisma.service';
import { RedisService }     from '../../common/redis/redis.service';
import { chainIdFromNetwork, networkFromChainId } from '../../common/web3/chain-mapping';
import { hashBytecode }     from '../../common/web3/bytecode-hash';
import {
  ContractAnalysisJobDto,
  ContractAnalysisResultDto,
  ContractFindingDto,
  FindingType,
  Network as NetworkEnum,
  Severity,
} from './dto/contract-analysis.dto';
import type { ContractAnalysisView } from './job-updates.types';

// ── Risk engine imports (new) ─────────────────────────────────────────────────
import { WalletRiskEngineService }  from '../risk-engine/wallet-risk-engine.service';
import { WalletFeatureExtractor }   from '../risk-engine/stages/feature-extractor.service';
import {
  RiskClassification,
  WalletRiskResult,
} from '../risk-engine/types/risk-engine.types';

// ─────────────────────────────────────────────────────────────────────────────

const ANALYZER_VERSION        = '2.0.0';  // bumped: now includes wallet scoring
const ANALYSIS_CACHE_TTL_SEC  = 86400;
const TRANSFER_EVENT_TOPIC    = ethers.id('Transfer(address,address,uint256)');

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];
const ERC721_ABI  = ['function name() view returns (string)', 'function symbol() view returns (string)'];
const ERC1155_ABI = ['function uri(uint256) view returns (string)'];

// ── Selector → signature map (unchanged) ─────────────────────────────────────
const SELECTOR_SIGNATURES: Record<string, string> = {
  '06fdde03': 'name()',
  '095ea7b3': 'approve(address,uint256)',
  '18160ddd': 'totalSupply()',
  '23b872dd': 'transferFrom(address,address,uint256)',
  '313ce567': 'decimals()',
  '40c10f19': 'mint(address,uint256)',
  '42966c68': 'burn(uint256)',
  '70a08231': 'balanceOf(address)',
  '715018a6': 'renounceOwnership()',
  '79ba5097': 'safeTransferFrom(address,address,uint256)',
  '8da5cb5b': 'owner()',
  '95d89b41': 'symbol()',
  'a22cb465': 'setApprovalForAll(address,bool)',
  'a9059cbb': 'transfer(address,uint256)',
  'c87b56dd': 'tokenURI(uint256)',
  'e985e9c5': 'isApprovedForAll(address,address)',
  'f2fde38b': 'transferOwnership(address)',
  'f851a440': 'pause()',
  '3659cfe6': 'upgradeTo(address)',
  '4f1ef286': 'upgradeToAndCall(address,bytes)',
  '5c975abb': 'paused()',
  '8456cb59': 'pause()',
  '3f4ba83a': 'unpause()',
  'dd62ed3e': 'allowance(address,address)',
  '6352211e': 'ownerOf(uint256)',
  '42842e0e': 'safeTransferFrom(address,address,uint256,bytes)',
  '2eb2c2d6': 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
  '00fdd58e': 'balanceOfBatch(address[],uint256[])',
  '248a9ca3': 'stake(uint256)',
  '2e1a7d4d': 'withdraw(uint256)',
  '4e71d92d': 'claim()',
  'c19d93fb': 'propose(address[],uint256[],string[],bytes[],string)',
  'c9d27afe': 'execute(address[],uint256[],string[],bytes[],bytes32)',
  '0121b93f': 'vote(uint256,bool)',
  'c01a8c84': 'blacklist(address)',
  '7088b0b4': 'implementation()',
  '5c60da1b': 'implementation()',
  'd4ee1d90': 'submitTransaction(address,uint256,bytes)',
  'c6427474': 'confirmTransaction(uint256)',
  'ee22610b': 'executeTransaction(uint256)',
};

const COMMON_PROXY_SLOTS = [
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  '0x7050c9e0f4ca769c69bd3a6dba6f5a6d8f2eb5b7c7a84d888fffbe671c5f3f7c',
];

// ── Internal types ────────────────────────────────────────────────────────────

type ContractFunctionShape = {
  name:        string;
  signature:   string;
  selector?:   string;
  visibility:  string;
  mutability?: string;
  inputs?:     Array<{ name: string; type: string }>;
  outputs?:    Array<{ name: string; type: string }>;
};

type SeverityContext = {
  isVerified:             boolean;
  isProxy:                boolean;
  hasRenounce:            boolean;
  deployerClassification: RiskClassification | null;   // NEW — from wallet engine
};

type DeploymentInfo = {
  deployerAddress?:  string;
  deploymentBlock?:  string;
  deploymentTx?:     string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure scoring helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a severity label from a numeric score with context adjustments.
 *
 * Context discounts applied:
 *   isVerified              → −5   (name/symbol resolved = on-chain metadata exists)
 *   hasRenounce             → −5   (ownership renounceable = reduced rug risk)
 *   deployer is SAFE        → −8   (known-good deployer wallet)
 *   deployer is LOW_RISK    → −4
 *   deployer is MALICIOUS   → +15  (bad actor deployer = escalate)
 *   deployer is RISKY       → +8
 */
function severityBucket(score: number, ctx?: SeverityContext): string {
  let adjusted = score;

  if (ctx?.isVerified)  adjusted = Math.max(0, adjusted - 5);
  if (ctx?.hasRenounce) adjusted = Math.max(0, adjusted - 5);

  // Deployer wallet classification adjusts contract score
  switch (ctx?.deployerClassification) {
    case RiskClassification.SAFE:
      adjusted = Math.max(0, adjusted - 8);
      break;
    case RiskClassification.LOW_RISK:
      adjusted = Math.max(0, adjusted - 4);
      break;
    case RiskClassification.RISKY:
      adjusted = Math.min(100, adjusted + 8);
      break;
    case RiskClassification.MALICIOUS:
      adjusted = Math.min(100, adjusted + 15);
      break;
    // UNKNOWN and null: no adjustment — neutral
  }

  if (adjusted <= 15) return 'low';
  if (adjusted <= 39) return 'medium';
  if (adjusted <= 64) return 'high';
  return 'critical';
}

/**
 * Weighted-average risk score with critical-finding amplifier.
 *
 * Replaces the original max+bonus formula that over-inflated scores
 * for legitimate contracts with multiple standard patterns.
 */
function aggregateRiskScore(findings: ContractFindingDto[]): number {
  if (!findings.length) return 0;

  const criticalCount = findings.filter(
    (f) => f.severity === Severity.CRITICAL || f.severity === Severity.HIGH,
  ).length;

  const totalWeight = findings.reduce((sum, f) => sum + (f.riskScore ?? 0), 0);
  const weightedAvg = totalWeight / findings.length;

  // Only amplify when 2+ HIGH/CRITICAL findings independently agree
  const amplifier = criticalCount >= 2 ? 1.2 : 1.0;

  return Math.min(100, Math.round(weightedAvg * amplifier));
}

function toPrismaFindingType(t: FindingType): PrismaFindingType {
  return t as unknown as PrismaFindingType;
}

function toPrismaSeverity(s: Severity): PrismaSeverity {
  return s as unknown as PrismaSeverity;
}

function normalizeTokenDecimals(value: bigint | number | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return Number.isInteger(value) ? value : Math.trunc(value);
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Token decimals out of safe range: ${value.toString()}`);
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ContractAnalyzerService {
  private readonly logger = new Logger(ContractAnalyzerService.name);

  private readonly rpcUrls: Record<NetworkEnum, string> = {
    [NetworkEnum.ETHEREUM]:  process.env.ETHEREUM_RPC_URL  || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    [NetworkEnum.POLYGON]:   process.env.POLYGON_RPC_URL   || 'https://polygon-rpc.com',
    [NetworkEnum.BSC]:       process.env.BSC_RPC_URL       || 'https://bsc-dataseed.binance.org',
    [NetworkEnum.ARBITRUM]:  process.env.ARBITRUM_RPC_URL  || 'https://arb1.arbitrum.io/rpc',
    [NetworkEnum.OPTIMISM]:  process.env.OPTIMISM_RPC_URL  || 'https://mainnet.optimism.io',
    [NetworkEnum.AVALANCHE]: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    [NetworkEnum.FANTOM]:    process.env.FANTOM_RPC_URL    || 'https://rpc.ftm.tools',
    [NetworkEnum.BASE]:      process.env.BASE_RPC_URL      || 'https://mainnet.base.org',
  };

  // Contracts that are definitively known-safe and skip analysis
  private readonly KNOWN_SAFE_CONTRACTS = new Set([
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Universal Router
    '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', // Aave V2
    '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3
  ]);

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma:       PrismaService,
    private readonly redis:        RedisService,
    // ── Risk engine: @Optional() so unit tests don't need to mock it ─────
    @Optional() private readonly riskEngine?: WalletRiskEngineService,
    @Optional() private readonly featureExtractor?: WalletFeatureExtractor,
  ) {}

  // ── Public read methods (unchanged) ────────────────────────────────────────

  async getLatestAnalysis(chainId: string, address: string): Promise<ContractAnalysisView | null> {
    const checksummed = this.toChecksumAddress(address);
    if (!checksummed) return null;

    const contract = await this.prisma.contract.findUnique({
      where:   { chainId_address: { chainId, address: checksummed } },
      include: { riskScores: { orderBy: { analyzedAt: 'desc' }, take: 1 } },
    });

    const latest = contract?.riskScores[0];
    if (!contract || !latest) return null;
    return this.toAnalysisView(chainId, checksummed, latest);
  }

  async getAnalysisHistory(chainId: string, address: string) {
    const checksummed = this.toChecksumAddress(address);
    if (!checksummed) return null;

    const contract = await this.prisma.contract.findUnique({
      where:   { chainId_address: { chainId, address: checksummed } },
      include: { riskScores: { orderBy: { analyzedAt: 'desc' } } },
    });

    if (!contract) return null;

    return {
      contract_address: checksummed,
      chain_id:         chainId,
      history: contract.riskScores.map((rs) => ({
        score:       rs.score,
        severity:    rs.severity,
        analyzed_at: rs.analyzedAt.toISOString(),
        job_id:      rs.jobId,
        findings:    rs.findings as Array<Record<string, unknown>>,
      })),
    };
  }

  async getAnalysisByJobId(
    jobId:    string,
    fallback?: Pick<ContractAnalysisJobDto, 'chainId' | 'contractAddress'>,
  ): Promise<ContractAnalysisView | null> {
    const riskScore = await this.prisma.contractRiskScore.findFirst({
      where:   { jobId },
      orderBy: { analyzedAt: 'desc' },
      include: { contract: true },
    });

    if (riskScore) {
      return this.toAnalysisView(
        riskScore.contract.chainId,
        riskScore.contract.address,
        riskScore,
      );
    }

    if (!fallback?.chainId || !fallback.contractAddress) return null;
    return this.getLatestAnalysis(fallback.chainId, fallback.contractAddress);
  }

  // ── Queue entry point (unchanged) ──────────────────────────────────────────

  async enqueueContractAnalysis(
    jobDto: ContractAnalysisJobDto,
    jobId:  string,
  ): Promise<{ jobId: string; queueName: string }> {
    const priorityMap: Record<string, number> = { low: 1, normal: 2, high: 3 };
    const p = priorityMap[jobDto.priority ?? 'normal'] ?? 2;

    await this.queueService.addJob(
      QUEUE_CONTRACT_ANALYZE,
      'analyze-contract',
      { ...jobDto, jobId },
      {
        jobId,
        priority:         p,
        attempts:         3,
        backoff:          { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail:     50,
      },
    );

    return { jobId, queueName: QUEUE_CONTRACT_ANALYZE };
  }

  // ── Main analysis entry point ───────────────────────────────────────────────

  async analyzeContract(jobDto: ContractAnalysisJobDto): Promise<ContractAnalysisResultDto> {
    const startTime = Date.now();

    // ── Address validation ──────────────────────────────────────────────────
    let checksumAddress: string;
    try {
      checksumAddress = ethers.getAddress(jobDto.contractAddress.trim());
    } catch {
      return {
        status:           'failed',
        error:            'Invalid EIP-55 contract address',
        analysisDuration: Date.now() - startTime,
      };
    }

    // ── Known-safe short circuit ────────────────────────────────────────────
    if (this.KNOWN_SAFE_CONTRACTS.has(checksumAddress)) {
      this.logger.debug(`Known-safe allowlist hit: ${checksumAddress}`);
      return {
        status:    'completed',
        score:     0,
        severity:  'low',
        findings:  [{
          category:    'KNOWN_SAFE',
          severity:    'informational',
          description: 'Address is in the verified-safe allowlist',
        }],
        analysisDuration: Date.now() - startTime,
      };
    }

    const networkEnum = jobDto.network ?? NetworkEnum.ETHEREUM;
    const chainId     = jobDto.chainId ?? chainIdFromNetwork(networkEnum as unknown as PrismaNetwork);

    this.logger.log(`Starting contract analysis chain=${chainId} addr=${checksumAddress}`);

    try {
      // ── Cache management ──────────────────────────────────────────────────
      if (jobDto.forceReanalysis) {
        await this.redis.del(this.cacheKey(chainId, checksumAddress));
      }

      if (!jobDto.forceReanalysis) {
        const cached = await this.redis.get(this.cacheKey(chainId, checksumAddress));
        if (cached) {
          try {
            this.logger.debug(`Cache hit for ${chainId}:${checksumAddress}`);
            return {
              status:           'completed',
              ...JSON.parse(cached),
              analysisDuration: Date.now() - startTime,
            } as ContractAnalysisResultDto;
          } catch {
            await this.redis.del(this.cacheKey(chainId, checksumAddress));
          }
        }

        const existing = await this.prisma.contract.findUnique({
          where: { chainId_address: { chainId, address: checksumAddress } },
        });
        if (existing) {
          this.logger.log(`Contract ${checksumAddress} already analyzed, skipping`);
          return {
            status:           'skipped',
            name:             existing.name ?? undefined,
            symbol:           existing.symbol ?? undefined,
            isVerified:       existing.isVerified,
            deployerAddress:  existing.deployerAddress ?? undefined,
            deploymentBlock:  existing.deploymentBlock?.toString(),
            analysisDuration: Date.now() - startTime,
          };
        }
      }

      // ── Provider setup ────────────────────────────────────────────────────
      const network = networkFromChainId(chainId);
      const rpcUrl  = this.getRpcUrl(networkEnum, jobDto.rpcUrl);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // ── Bytecode check ────────────────────────────────────────────────────
      const code = await provider.getCode(checksumAddress);
      if (code === '0x') {
        await this.persistNotAContract(chainId, checksumAddress, network, jobDto.jobId);
        return { status: 'completed', analysisDuration: Date.now() - startTime };
      }

      // ── Core analysis (all run in parallel where possible) ───────────────
      const [bytecodeHash, deployment, analysisResult] = await Promise.all([
        Promise.resolve(hashBytecode(code)),
        this.findDeployment(provider, checksumAddress),
        this.analyzeContractFunctions(checksumAddress, code, provider),
      ]);

      // ── NEW: Score the deployer wallet through the risk engine ────────────
      // Runs concurrently with no blocking — if it fails, analysis continues.
      const deployerRiskResult = await this.scoreDeployerWallet(
        deployment.deployerAddress,
        chainId,
        provider,
      );

      if (deployerRiskResult) {
        this.logger.debug(
          `Deployer ${deployment.deployerAddress} → ` +
          `${deployerRiskResult.classification} ` +
          `score=${deployerRiskResult.risk_score}`,
        );
      }

      // ── Security pattern detection ────────────────────────────────────────
      const findings = await this.detectSecurityPatterns(
        analysisResult.functions,
        {
          isProxy:   analysisResult.isProxy ?? false,
          isVerified: analysisResult.isVerified ?? false,
        },
      );

      // ── Add deployer risk as a finding if significant ─────────────────────
      if (deployerRiskResult) {
        const deployerFinding = this.deployerRiskToFinding(
          deployerRiskResult,
          deployment.deployerAddress!,
        );
        if (deployerFinding) findings.push(deployerFinding);
      }

      const prismaContractType = this.detectContractType(analysisResult.functions);

      // ── Persist contract record ───────────────────────────────────────────
      const contractRecord = await this.prisma.contract.upsert({
        where:  { chainId_address: { chainId, address: checksumAddress } },
        create: {
          chainId,
          address:         checksumAddress,
          bytecodeHash,
          name:            analysisResult.name,
          symbol:          analysisResult.symbol,
          network,
          contractType:    prismaContractType,
          deployerAddress: deployment.deployerAddress,
          deploymentBlock: deployment.deploymentBlock ? BigInt(deployment.deploymentBlock) : undefined,
          deploymentTx:    deployment.deploymentTx,
          abi:             analysisResult.functions,
          isProxy:         analysisResult.isProxy ?? false,
          proxyImpl:       analysisResult.proxyImplementation,
          isVerified:      analysisResult.isVerified ?? false,
          totalSupply:     analysisResult.totalSupply,
          decimals:        analysisResult.decimals,
        },
        update: {
          bytecodeHash,
          name:            analysisResult.name ?? undefined,
          symbol:          analysisResult.symbol ?? undefined,
          network,
          contractType:    prismaContractType,
          deployerAddress: deployment.deployerAddress ?? undefined,
          deploymentBlock: deployment.deploymentBlock ? BigInt(deployment.deploymentBlock) : undefined,
          deploymentTx:    deployment.deploymentTx ?? undefined,
          abi:             analysisResult.functions,
          isProxy:         analysisResult.isProxy ?? false,
          proxyImpl:       analysisResult.proxyImplementation ?? undefined,
          isVerified:      analysisResult.isVerified ?? false,
          totalSupply:     analysisResult.totalSupply ?? undefined,
          decimals:        analysisResult.decimals ?? undefined,
        },
      });

      // ── Clean stale findings on force-reanalysis ──────────────────────────
      if (jobDto.forceReanalysis) {
        await this.prisma.contractFinding.deleteMany({ where: { contractId: contractRecord.id } });
      }

      if (findings.length > 0) {
        await this.prisma.contractFinding.createMany({
          data: findings.map((f) => ({
            contractId:  contractRecord.id,
            findingType: toPrismaFindingType(f.findingType),
            severity:    toPrismaSeverity(f.severity),
            title:       f.title,
            description: f.description,
            details:     f.details as any, // Ensure compatibility with InputJsonValue
            confidence:  f.confidence ?? undefined,
            riskScore:   f.riskScore ?? undefined,
          })),
        });
      }

      // ── Score aggregation ─────────────────────────────────────────────────
      const score = aggregateRiskScore(findings);

      const names = analysisResult.functions.map((f) => f.name.toLowerCase());
      const hasRenounce = names.includes('renounceownership');

      const ctx: SeverityContext = {
        isVerified:             analysisResult.isVerified ?? false,
        isProxy:                analysisResult.isProxy    ?? false,
        hasRenounce,
        // Pass deployer classification — null if engine unavailable
        deployerClassification: deployerRiskResult?.classification ?? null,
      };
      const bucket = severityBucket(score, ctx);

      const findingsJson = findings.map((f) => ({
        category:    f.findingType,
        severity:    String(f.severity).toLowerCase(),
        weight:      f.riskScore ?? 0,
        description: `${f.title}: ${f.description}`,
      }));

      await this.prisma.contractRiskScore.create({
        data: {
          contractId:      contractRecord.id,
          score,
          severity:        bucket,
          findings:        findingsJson,
          analyzerVersion: ANALYZER_VERSION,
          jobId:           jobDto.jobId ?? null,
          expiresAt:       new Date(Date.now() + ANALYSIS_CACHE_TTL_SEC * 1000),
        },
      });

      // ── Cache result ──────────────────────────────────────────────────────
      const cachePayload = {
        name:            analysisResult.name,
        symbol:          analysisResult.symbol,
        totalSupply:     analysisResult.totalSupply,
        decimals:        analysisResult.decimals,
        isVerified:      analysisResult.isVerified,
        deployerAddress: deployment.deployerAddress,
        deploymentBlock: deployment.deploymentBlock,
        score,
        severity:        bucket,
        // Cache deployer result too so repeated calls don't re-score
        deployerRisk:    deployerRiskResult
          ? {
              classification:   deployerRiskResult.classification,
              risk_score:       deployerRiskResult.risk_score,
              confidence_score: deployerRiskResult.confidence_score,
              archetype:        deployerRiskResult.archetype,
            }
          : null,
      };

      await this.redis.set(
        this.cacheKey(chainId, checksumAddress),
        JSON.stringify(cachePayload),
        ANALYSIS_CACHE_TTL_SEC,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Contract analysis completed in ${duration}ms for ${checksumAddress} ` +
        `score=${score} severity=${bucket}` +
        (deployerRiskResult ? ` deployer=${deployerRiskResult.classification}` : ''),
      );

      return {
        status:          'completed',
        name:            analysisResult.name,
        symbol:          analysisResult.symbol,
        totalSupply:     analysisResult.totalSupply,
        decimals:        analysisResult.decimals,
        functions:       analysisResult.functions,
        isVerified:      analysisResult.isVerified,
        deployerAddress: deployment.deployerAddress,
        deploymentBlock: deployment.deploymentBlock,
        analysisDuration: duration,
        // Include deployer risk in result so callers can display it
        deployerRisk:    deployerRiskResult ?? undefined,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Contract analysis failed for ${checksumAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        status:           'failed',
        error:            (error as Error).message,
        analysisDuration: duration,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NEW: Deployer wallet scoring via risk engine
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Score the contract deployer wallet using the 5-stage risk engine.
   *
   * Returns null if:
   *   - deployerAddress is unknown
   *   - risk engine is not injected (graceful degradation)
   *   - risk engine throws (never propagates to contract analysis)
   *
   * This is intentionally fire-and-don't-crash: a failed wallet score
   * should never fail a contract analysis.
   */
  private async scoreDeployerWallet(
    deployerAddress: string | undefined,
    chainId:         string,
    provider:        ethers.JsonRpcProvider,
  ): Promise<WalletRiskResult | null> {
    // No address found → skip
    if (!deployerAddress) return null;

    // Risk engine not available → skip gracefully
    if (!this.riskEngine || !this.featureExtractor) {
      this.logger.debug('Risk engine not injected — skipping deployer wallet scoring');
      return null;
    }

    try {
      // Check if we already have a recent wallet score cached/persisted
      const existing = await this.getExistingWalletScore(deployerAddress, chainId);
      if (existing) {
        this.logger.debug(`Using existing wallet score for deployer ${deployerAddress}`);
        return existing;
      }

      // Extract features and run pipeline
      const features = await this.featureExtractor.extract(deployerAddress, chainId, provider);
      const result   = await this.riskEngine.score(features);
      return result;

    } catch (error) {
      // Never let deployer scoring break contract analysis
      this.logger.warn(
        `Deployer wallet scoring failed for ${deployerAddress}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Check if a recent wallet score already exists in the database.
   * Reuses the score if it was computed within the last 6 hours.
   */
  private async getExistingWalletScore(
    address: string,
    chainId: string,
  ): Promise<WalletRiskResult | null> {
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      const record = await this.prisma.walletReputationScore.findFirst({
        where: {
          wallet: { chainId, address },
          profiledAt: { gte: sixHoursAgo },
        },
        orderBy: { profiledAt: 'desc' },
        include: { wallet: true },
      });

      if (!record) return null;

      // Reconstruct a minimal WalletRiskResult from DB record
      return {
        address:          record.wallet.address,
        chainId:          record.wallet.chainId,
        risk_score:       record.score,
        confidence_score: (record as any).confidenceScore ?? 0.5,
        classification:   ((record as any).classification ?? 'UNKNOWN') as RiskClassification,
        archetype:        ((record as any).archetype ?? 'UNKNOWN') as any,
        factors:          (record.subScores as any[]) ?? [],
        meta: {
          analyzedAt: record.profiledAt.toISOString(),
          version:    'db-cached',
          durationMs: 0,
          dataPoints: 0,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Convert a deployer wallet risk result into a contract finding.
   *
   * Mapping:
   *   MALICIOUS deployer  → HIGH finding    riskScore 65
   *   RISKY deployer      → MEDIUM finding  riskScore 35
   *   SAFE/LOW_RISK       → INFORMATIONAL   riskScore 0  (trust signal, not risk)
   *   UNKNOWN             → null            (no finding — insufficient data)
   */
  private deployerRiskToFinding(
    result:          WalletRiskResult,
    deployerAddress: string,
  ): ContractFindingDto | null {
    const short = `${deployerAddress.slice(0, 8)}...${deployerAddress.slice(-6)}`;

    switch (result.classification) {
      case RiskClassification.MALICIOUS:
        return {
          findingType: FindingType.SUSPICIOUS_PATTERN,
          severity:    Severity.HIGH,
          title:       'Deployer Wallet Classified as Malicious',
          description:
            `The wallet that deployed this contract (${short}) has been classified as ` +
            `MALICIOUS with a risk score of ${result.risk_score}/100. ` +
            `Archetype: ${result.archetype}. ` +
            `This strongly suggests the contract warrants further scrutiny.`,
          details: {
            deployer_address:    deployerAddress,
            deployer_risk_score: result.risk_score,
            deployer_archetype:  result.archetype,
            top_risk_factors:    result.factors
              .filter(f => f.type === 'risk' && f.impact > 0)
              .slice(0, 3)
              .map(f => f.name),
          },
          confidence: result.confidence_score,
          riskScore:  65,
        };

      case RiskClassification.RISKY:
        return {
          findingType: FindingType.GOVERNANCE_RISK,
          severity:    Severity.MEDIUM,
          title:       'Deployer Wallet Has Elevated Risk Score',
          description:
            `The deployer wallet (${short}) has an elevated risk score of ` +
            `${result.risk_score}/100 (${result.classification}). ` +
            `Review deployer history before interacting with this contract.`,
          details: {
            deployer_address:    deployerAddress,
            deployer_risk_score: result.risk_score,
            deployer_archetype:  result.archetype,
          },
          confidence: result.confidence_score,
          riskScore:  35,
        };

      case RiskClassification.SAFE:
      case RiskClassification.LOW_RISK:
        // Safe deployer is a trust signal — report as informational
        return {
          findingType: FindingType.INFORMATIONAL,
          severity:    Severity.INFORMATIONAL,
          title:       'Deployer Wallet Has Good Reputation',
          description:
            `The deployer wallet (${short}) is classified as ` +
            `${result.classification} with a risk score of ${result.risk_score}/100.`,
          details: {
            deployer_address:    deployerAddress,
            deployer_risk_score: result.risk_score,
            deployer_archetype:  result.archetype,
          },
          confidence: result.confidence_score,
          riskScore:  0,    // zero weight — this is a trust signal, not a risk
        };

      case RiskClassification.UNKNOWN:
      default:
        // Insufficient data about deployer — add no finding, no adjustment
        // "We don't know" ≠ risky
        this.logger.debug(
          `Deployer ${deployerAddress} is UNKNOWN — no finding added`,
        );
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Security pattern detection (updated from previous refactor)
  // ─────────────────────────────────────────────────────────────────────────

  private async detectSecurityPatterns(
    functions:    ContractFunctionShape[],
    contractMeta: { isProxy: boolean; isVerified: boolean },
  ): Promise<ContractFindingDto[]> {
    const findings: ContractFindingDto[] = [];
    const names = functions.map((f) => f.name.toLowerCase());

    // ── MINT ────────────────────────────────────────────────────────────────
    const hasMint = names.some((n) => n === 'mint' || n === 'safemint');
    const hasAccessControl =
      names.includes('owner')           ||
      names.includes('hasrole')         ||
      names.includes('onlyminter')      ||
      names.includes('renounceownership') ||
      names.includes('grantrole');

    if (hasMint && !hasAccessControl) {
      findings.push({
        findingType: FindingType.VULNERABILITY,
        severity:    Severity.HIGH,
        title:       'Unprotected Mint Function',
        description:
          'Contract exposes a mint function with no detectable access-control sibling ' +
          '(no owner(), hasRole(), or renounceOwnership()). Anyone may be able to mint tokens.',
        details:    { recommendation: 'Add onlyOwner or AccessControl modifier', cwe: 'CWE-862' },
        confidence: 0.70,
        riskScore:  75,
      });
    }

    if (hasMint && hasAccessControl) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity:    Severity.INFORMATIONAL,
        title:       'Mint Function with Access Control',
        description: 'Contract has a mint function protected by access control. Standard pattern.',
        confidence:  0.8,
        riskScore:   10,
      });
    }

    // ── PAUSE ───────────────────────────────────────────────────────────────
    const hasPause = names.some((n) => n === 'pause' || n === 'pauseall');
    if (hasPause) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity:    Severity.INFORMATIONAL,
        title:       'Pausable Contract',
        description:
          'Contract implements pause/unpause. Standard OpenZeppelin safety pattern ' +
          'used by USDC, Aave, and most audited DeFi protocols.',
        confidence: 0.9,
        riskScore:  5,
      });
    }

    // ── BLACKLIST ───────────────────────────────────────────────────────────
    const hasBlacklist = names.some(
      (n) => n === 'blacklist' || n === 'addtoblacklist' || n === 'blocklist',
    );
    if (hasBlacklist) {
      findings.push({
        findingType: FindingType.GOVERNANCE_RISK,
        severity:    Severity.MEDIUM,
        title:       'Blacklist Capability',
        description:
          'Contract can blacklist addresses. Legitimate use exists (USDC, regulatory compliance) ' +
          'but centralises control. Verify governance.',
        details:    { recommendation: 'Check if blacklist is governed by multisig or timelock' },
        confidence: 0.75,
        riskScore:  35,
      });
    }

    // ── OWNERSHIP ───────────────────────────────────────────────────────────
    const hasOwner    = names.includes('owner') || names.includes('transferownership');
    const hasRenounce = names.includes('renounceownership');

    if (hasOwner && !hasRenounce) {
      findings.push({
        findingType: FindingType.GOVERNANCE_RISK,
        severity:    Severity.MEDIUM,
        title:       'Non-Renounceable Ownership',
        description:
          'Contract has owner functions but no renounceOwnership(). ' +
          'Owner retains permanent control with no exit path.',
        details:    { recommendation: 'Add renounceOwnership() or use a multisig/timelock' },
        confidence: 0.8,
        riskScore:  40,
      });
    }

    if (hasOwner && hasRenounce) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity:    Severity.INFORMATIONAL,
        title:       'Standard Ownable Pattern',
        description: 'Contract uses OpenZeppelin Ownable with renounceOwnership(). Standard pattern.',
        confidence:  0.95,
        riskScore:   5,
      });
    }

    // ── PROXY/UPGRADE ───────────────────────────────────────────────────────
    const hasUpgrade  = names.some((n) => n === 'upgradeto' || n === 'upgradetoandcall');
    const hasTimelock = names.some(
      (n) => n.includes('timelock') || n.includes('delay') || n === 'schedule' || n === 'queue',
    );

    if (hasUpgrade && !hasTimelock) {
      const isKnownProxy = contractMeta.isProxy;
      findings.push({
        findingType: FindingType.SUSPICIOUS_PATTERN,
        severity:    isKnownProxy ? Severity.MEDIUM : Severity.HIGH,
        title:       isKnownProxy
          ? 'Upgradeable Proxy (Standard Pattern)'
          : 'Upgradeability Without Timelock',
        description: isKnownProxy
          ? 'Contract is a standard UUPS/Transparent proxy. Verify the proxy admin.'
          : 'Contract can be upgraded without a timelock delay. Logic can change without warning.',
        details:    { recommendation: 'Add a TimelockController before the proxy admin' },
        confidence: isKnownProxy ? 0.6 : 0.8,
        riskScore:  isKnownProxy ? 30 : 65,
      });
    }

    if (hasUpgrade && hasTimelock) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity:    Severity.INFORMATIONAL,
        title:       'Upgradeable with Timelock',
        description: 'Proxy upgrades are gated by a timelock. Good practice.',
        confidence:  0.85,
        riskScore:   10,
      });
    }

    return findings;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Unchanged private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async persistNotAContract(
    chainId: string,
    address: string,
    network: PrismaNetwork,
    jobId?:  string,
  ): Promise<void> {
    const contractRecord = await this.prisma.contract.upsert({
      where:  { chainId_address: { chainId, address } },
      create: { chainId, address, network, contractType: ContractType.CUSTOM, isVerified: false },
      update: { network },
    });

    await this.prisma.contractRiskScore.create({
      data: {
        contractId:      contractRecord.id,
        score:           0,
        severity:        'low',
        findings:        [{
          category:    'NOT_A_CONTRACT',
          severity:    'low',
          weight:      0,
          description: 'No bytecode at this address',
        }],
        analyzerVersion: ANALYZER_VERSION,
        jobId:           jobId ?? null,
      },
    });
  }

  private async analyzeContractFunctions(
    address:  string,
    bytecode: string,
    provider: ethers.Provider,
  ): Promise<{
    name?:               string;
    symbol?:             string;
    totalSupply?:        string;
    decimals?:           number;
    functions:           ContractFunctionShape[];
    isVerified?:         boolean;
    isProxy?:            boolean;
    proxyImplementation?: string;
  }> {
    const functions = this.extractFunctionSelectors(bytecode);
    let name:               string | undefined;
    let symbol:             string | undefined;
    let totalSupply:        string | undefined;
    let decimals:           number | undefined;
    let isVerified      = functions.length > 0;
    let isProxy         = false;
    let proxyImplementation: string | undefined;

    try {
      proxyImplementation = await this.detectProxyImplementation(provider, address);
      isProxy = Boolean(proxyImplementation);

      try {
        const erc20 = new ethers.Contract(address, ERC20_ABI, provider);
        name        = await erc20.name().catch(() => undefined);
        symbol      = await erc20.symbol().catch(() => undefined);
        const rawDec = await erc20.decimals().catch(() => undefined);
        decimals    = normalizeTokenDecimals(rawDec);
        const supplyBN = await erc20.totalSupply().catch(() => undefined);
        totalSupply = supplyBN?.toString();
        if (name || symbol) isVerified = true;
      } catch (e) {
        this.logger.debug(`ERC20 probe failed: ${(e as Error).message}`);
      }

      if (!name && !symbol) {
        try {
          const erc721 = new ethers.Contract(address, ERC721_ABI, provider);
          name   = await erc721.name().catch(() => undefined);
          symbol = await erc721.symbol().catch(() => undefined);
          if (name || symbol) isVerified = true;
        } catch (e) {
          this.logger.debug(`ERC721 probe failed: ${(e as Error).message}`);
        }
      }

      if (!isVerified) {
        try {
          const erc1155 = new ethers.Contract(address, ERC1155_ABI, provider);
          const uri = await erc1155.uri(0n).catch(() => undefined);
          if (typeof uri === 'string' && uri.length > 0) isVerified = true;
        } catch (e) {
          this.logger.debug(`ERC1155 probe failed: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Function analysis failed: ${(e as Error).message}`);
    }

    return { name, symbol, totalSupply, decimals, functions, isVerified, isProxy, proxyImplementation };
  }

  private detectContractType(functions: ContractFunctionShape[]): ContractType {
    const n = functions.map((f) => f.name.toLowerCase());
    if (n.includes('transfer') && n.includes('approve') && n.includes('balanceof')) return ContractType.ERC20;
    if (n.includes('ownerof') && n.includes('transferfrom') && n.includes('tokenuri')) return ContractType.ERC721;
    if (n.includes('balanceofbatch') && n.includes('safebatchtransferfrom')) return ContractType.ERC1155;
    if (n.includes('vote') || n.includes('propose') || n.includes('execute')) return ContractType.GOVERNANCE;
    if (n.includes('stake') || n.includes('unstake') || n.includes('claim')) return ContractType.STAKING;
    if (n.includes('submittransaction') && n.includes('confirmtransaction')) return ContractType.MULTISIG;
    return ContractType.CUSTOM;
  }

  private extractFunctionSelectors(bytecode: string): ContractFunctionShape[] {
    const cleaned = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    const selectors = new Set<string>();
    let i = 0;

    while (i < cleaned.length - 1) {
      const opcode = parseInt(cleaned.slice(i, i + 2), 16);

      if (opcode >= 0x60 && opcode <= 0x7f) {
        const pushSize = opcode - 0x60 + 1;
        if (opcode === 0x63) {
          const candidate = cleaned.slice(i + 2, i + 10).toLowerCase();
          if (candidate.length === 8 && candidate !== 'ffffffff' && candidate !== '00000000') {
            selectors.add(candidate);
          }
        }
        i += 2 + pushSize * 2;
        continue;
      }
      i += 2;
    }

    return Array.from(selectors)
      .sort()
      .map((selector) => {
        const signature = SELECTOR_SIGNATURES[selector] ?? `unknown_${selector}()`;
        return {
          name:       signature.split('(')[0],
          signature,
          selector:   `0x${selector}`,
          visibility: 'external',
          mutability: 'unknown',
          inputs:     [],
          outputs:    [],
        };
      });
  }

  private async detectProxyImplementation(
    provider: ethers.Provider,
    address:  string,
  ): Promise<string | undefined> {
    for (const slot of COMMON_PROXY_SLOTS) {
      try {
        const raw       = await provider.getStorage(address, slot);
        const candidate = ethers.dataSlice(raw, 12);
        if (candidate && candidate !== '0x0000000000000000000000000000000000000000') {
          return ethers.getAddress(candidate);
        }
      } catch (e) {
        this.logger.debug(`Proxy slot probe failed: ${(e as Error).message}`);
      }
    }
    return undefined;
  }

  private async findDeployment(
    provider: ethers.JsonRpcProvider,
    address:  string,
  ): Promise<DeploymentInfo> {
    let deploymentBlock: number | undefined;

    try {
      const latestBlock = await provider.getBlockNumber();
      let low = 0;
      let high = latestBlock;

      while (low <= high) {
        const mid       = Math.floor((low + high) / 2);
        const codeAtMid = await provider.getCode(address, mid);
        if (codeAtMid && codeAtMid !== '0x') { deploymentBlock = mid; high = mid - 1; }
        else                                  { low = mid + 1; }
      }
    } catch (e) {
      this.logger.debug(`Binary deployment search failed: ${(e as Error).message}`);
    }

    if (deploymentBlock !== undefined) {
      try {
        const toBlock = Math.min(deploymentBlock + 5000, await provider.getBlockNumber());
        const logs    = await provider.getLogs({
          fromBlock: deploymentBlock,
          toBlock,
          address,
          topics:    [TRANSFER_EVENT_TOPIC],
        });

        if (logs.length > 0) {
          const first   = logs[0];
          const receipt = await provider.getTransactionReceipt(first.transactionHash);
          const tx      = await provider.getTransaction(first.transactionHash);
          return {
            deployerAddress: tx?.from ? ethers.getAddress(tx.from) : undefined,
            deploymentBlock: receipt?.blockNumber?.toString() ?? first.blockNumber.toString(),
            deploymentTx:    first.transactionHash,
          };
        }
      } catch (e) {
        this.logger.debug(`Transfer-log deployment lookup failed: ${(e as Error).message}`);
      }
      return { deploymentBlock: deploymentBlock.toString() };
    }

    try {
      const logs = await provider.getLogs({
        fromBlock: Math.max(0, (await provider.getBlockNumber()) - 5000),
        toBlock:   'latest',
        address,
        topics:    [TRANSFER_EVENT_TOPIC],
      });
      if (logs.length > 0) {
        const first   = logs[0];
        const receipt = await provider.getTransactionReceipt(first.transactionHash);
        const tx      = await provider.getTransaction(first.transactionHash);
        return {
          deployerAddress: tx?.from ? ethers.getAddress(tx.from) : undefined,
          deploymentBlock: receipt?.blockNumber?.toString() ?? first.blockNumber.toString(),
          deploymentTx:    first.transactionHash,
        };
      }
    } catch (e) {
      this.logger.debug(`Recent log lookup failed: ${(e as Error).message}`);
    }

    return {};
  }

  private cacheKey(chainId: string, address: string): string {
    return `contract:analysis:v2:${chainId}:${address.toLowerCase()}`;
  }

  private toChecksumAddress(address: string): string | null {
    try { return ethers.getAddress(address.trim()); }
    catch { return null; }
  }

  private getRpcUrl(network: NetworkEnum, override?: string): string {
    if (override && !override.includes('YOUR_')) return override;
    return this.rpcUrls[network];
  }

  private toAnalysisView(
    chainId:   string,
    address:   string,
    riskScore: { score: number; severity: string; analyzedAt: Date; findings: unknown },
  ): ContractAnalysisView {
    return {
      contract_address: address,
      chain_id:         chainId,
      score:            riskScore.score,
      severity:         riskScore.severity,
      analyzed_at:      riskScore.analyzedAt.toISOString(),
      findings:         riskScore.findings as Array<Record<string, unknown>>,
      ai_explanation:   null,
    };
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
  ContractType,
  FindingType as PrismaFindingType,
  Network as PrismaNetwork,
  Severity as PrismaSeverity,
} from '@prisma/client';
import { QueueService } from '../../queues/queue.service';
import { QUEUE_CONTRACT_ANALYZE } from '../../queues/queue.constants';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { chainIdFromNetwork, networkFromChainId } from '../../common/web3/chain-mapping';
import { hashBytecode } from '../../common/web3/bytecode-hash';
import {
  ContractAnalysisJobDto,
  ContractAnalysisResultDto,
  ContractFindingDto,
  FindingType,
  Network as NetworkEnum,
  Severity,
} from './dto/contract-analysis.dto';
import type { ContractAnalysisView } from './job-updates.types';

const ANALYZER_VERSION = '1.0.0';
const ANALYSIS_CACHE_TTL_SEC = 86400;
const SELECTOR_PUSH4 = '63';
const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];
const ERC721_ABI = ['function name() view returns (string)', 'function symbol() view returns (string)'];
const ERC1155_ABI = ['function uri(uint256) view returns (string)'];
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

type ContractFunctionShape = {
  name: string;
  signature: string;
  selector?: string;
  visibility: string;
  mutability?: string;
  inputs?: Array<{ name: string; type: string }>;
  outputs?: Array<{ name: string; type: string }>;
};

function severityBucket(score: number): string {
  if (score <= 24) return 'low';
  if (score <= 49) return 'medium';
  if (score <= 74) return 'high';
  return 'critical';
}

function aggregateRiskScore(findings: ContractFindingDto[]): number {
  if (!findings.length) return 0;

  // Separate critical/confirmed findings from informational ones
  const criticalFindings = findings.filter(
    (f) => f.severity === Severity.CRITICAL || f.severity === Severity.HIGH,
  );
  const infoFindings = findings.filter(
    (f) => f.severity === Severity.LOW || f.severity === Severity.INFORMATIONAL,
  );

  if (!criticalFindings.length && !infoFindings.length) return 0;

  // Weighted average instead of max+bonus
  const totalWeight = findings.reduce((sum, f) => sum + (f.riskScore ?? 0), 0);
  const weightedAvg = totalWeight / findings.length;

  // Only amplify when multiple HIGH/CRITICAL findings agree
  const amplifier = criticalFindings.length >= 2 ? 1.2 : 1.0;

  return Math.min(100, Math.round(weightedAvg * amplifier));
}

function toPrismaFindingType(t: FindingType): PrismaFindingType {
  return t as unknown as PrismaFindingType;
}

function toPrismaSeverity(s: Severity): PrismaSeverity {
  return s as unknown as PrismaSeverity;
}

function normalizeTokenDecimals(value: bigint | number | null | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : Math.trunc(value);
  }

  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)) {
    throw new Error(`Token decimals value is out of safe integer range: ${value.toString()}`);
  }

  return normalized;
}

@Injectable()
export class ContractAnalyzerService {
  private readonly logger = new Logger(ContractAnalyzerService.name);
  private readonly rpcUrls: Record<NetworkEnum, string> = {
    [NetworkEnum.ETHEREUM]: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    [NetworkEnum.POLYGON]: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    [NetworkEnum.BSC]: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    [NetworkEnum.ARBITRUM]: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    [NetworkEnum.OPTIMISM]: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    [NetworkEnum.AVALANCHE]: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    [NetworkEnum.FANTOM]: process.env.FANTOM_RPC_URL || 'https://rpc.ftm.tools',
    [NetworkEnum.BASE]: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  };

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getLatestAnalysis(chainId: string, address: string): Promise<ContractAnalysisView | null> {
    const checksummed = this.toChecksumAddress(address);
    if (!checksummed) {
      return null;
    }

    const contract = await this.prisma.contract.findUnique({
      where: { chainId_address: { chainId, address: checksummed } },
      include: { riskScores: { orderBy: { analyzedAt: 'desc' }, take: 1 } },
    });

    const latest = contract?.riskScores[0];
    if (!contract || !latest) {
      return null;
    }

    return this.toAnalysisView(chainId, checksummed, latest);
  }

  async getAnalysisHistory(chainId: string, address: string) {
    const checksummed = this.toChecksumAddress(address);
    if (!checksummed) {
      return null;
    }

    const contract = await this.prisma.contract.findUnique({
      where: { chainId_address: { chainId, address: checksummed } },
      include: { riskScores: { orderBy: { analyzedAt: 'desc' } } },
    });

    if (!contract) {
      return null;
    }

    return {
      contract_address: checksummed,
      chain_id: chainId,
      history: contract.riskScores.map((riskScore) => ({
        score: riskScore.score,
        severity: riskScore.severity,
        analyzed_at: riskScore.analyzedAt.toISOString(),
        job_id: riskScore.jobId,
        findings: riskScore.findings as Array<Record<string, unknown>>,
      })),
    };
  }

  async getAnalysisByJobId(
    jobId: string,
    fallback?: Pick<ContractAnalysisJobDto, 'chainId' | 'contractAddress'>,
  ): Promise<ContractAnalysisView | null> {
    const riskScore = await this.prisma.contractRiskScore.findFirst({
      where: { jobId },
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

    if (!fallback?.chainId || !fallback.contractAddress) {
      return null;
    }

    return this.getLatestAnalysis(fallback.chainId, fallback.contractAddress);
  }

  private cacheKey(chainId: string, address: string): string {
    return `contract:analysis:v1:${chainId}:${address.toLowerCase()}`;
  }

  private toChecksumAddress(address: string): string | null {
    try {
      return ethers.getAddress(address.trim());
    } catch {
      return null;
    }
  }

  private toAnalysisView(
    chainId: string,
    address: string,
    riskScore: {
      score: number;
      severity: string;
      analyzedAt: Date;
      findings: unknown;
    },
  ): ContractAnalysisView {
    return {
      contract_address: address,
      chain_id: chainId,
      score: riskScore.score,
      severity: riskScore.severity,
      analyzed_at: riskScore.analyzedAt.toISOString(),
      findings: riskScore.findings as Array<Record<string, unknown>>,
      ai_explanation: null,
    };
  }

  private getRpcUrl(network: NetworkEnum, override?: string): string {
    if (override && !override.includes('YOUR_')) {
      return override;
    }

    const configured = this.rpcUrls[network];
    if (configured && !configured.includes('YOUR_')) {
      return configured;
    }

    return this.rpcUrls[network];
  }

  async analyzeContract(jobDto: ContractAnalysisJobDto): Promise<ContractAnalysisResultDto> {
    const startTime = Date.now();
    let checksumAddress: string;
    try {
      checksumAddress = ethers.getAddress(jobDto.contractAddress.trim());
    } catch {
      return {
        status: 'failed',
        error: 'Invalid EIP-55 contract address',
        analysisDuration: Date.now() - startTime,
      };
    }

    const networkEnum = jobDto.network ?? NetworkEnum.ETHEREUM;
    const chainId = jobDto.chainId ?? chainIdFromNetwork(networkEnum as unknown as PrismaNetwork);
    this.logger.log(`Starting contract analysis chain=${chainId} addr=${checksumAddress}`);

    try {
      if (jobDto.forceReanalysis) {
        await this.redis.del(this.cacheKey(chainId, checksumAddress));
      }

      if (!jobDto.forceReanalysis) {
        const cached = await this.redis.get(this.cacheKey(chainId, checksumAddress));
        if (cached) {
          try {
            this.logger.debug(`Cache hit for ${chainId}:${checksumAddress}`);
            return {
              status: 'completed',
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
            status: 'skipped',
            name: existing.name ?? undefined,
            symbol: existing.symbol ?? undefined,
            isVerified: existing.isVerified,
            deployerAddress: existing.deployerAddress ?? undefined,
            deploymentBlock: existing.deploymentBlock?.toString(),
          };
        }
      }

      const network = networkFromChainId(chainId);
      const rpcUrl = this.getRpcUrl(networkEnum, jobDto.rpcUrl);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const code = await provider.getCode(checksumAddress);
      if (code === '0x') {
        const duration = Date.now() - startTime;
        await this.persistNotAContract(chainId, checksumAddress, network, jobDto.jobId);
        return {
          status: 'completed',
          analysisDuration: duration,
        };
      }

      const bytecodeHash = hashBytecode(code);
      const deployment = await this.findDeployment(provider, checksumAddress);
      const analysisResult = await this.analyzeContractFunctions(checksumAddress, code, provider);
      const findings = await this.detectSecurityPatterns(analysisResult.functions);
      const prismaContractType = this.detectContractType(analysisResult.functions);

      const contractRecord = await this.prisma.contract.upsert({
        where: { chainId_address: { chainId, address: checksumAddress } },
        create: {
          chainId,
          address: checksumAddress,
          bytecodeHash,
          name: analysisResult.name,
          symbol: analysisResult.symbol,
          network,
          contractType: prismaContractType,
          deployerAddress: deployment.deployerAddress,
          deploymentBlock: deployment.deploymentBlock ? BigInt(deployment.deploymentBlock) : undefined,
          deploymentTx: deployment.deploymentTx,
          abi: analysisResult.functions,
          isProxy: analysisResult.isProxy ?? false,
          proxyImpl: analysisResult.proxyImplementation,
          isVerified: analysisResult.isVerified ?? false,
          totalSupply: analysisResult.totalSupply,
          decimals: analysisResult.decimals,
        },
        update: {
          bytecodeHash,
          name: analysisResult.name ?? undefined,
          symbol: analysisResult.symbol ?? undefined,
          network,
          contractType: prismaContractType,
          deployerAddress: deployment.deployerAddress ?? undefined,
          deploymentBlock: deployment.deploymentBlock ? BigInt(deployment.deploymentBlock) : undefined,
          deploymentTx: deployment.deploymentTx ?? undefined,
          abi: analysisResult.functions,
          isProxy: analysisResult.isProxy ?? false,
          proxyImpl: analysisResult.proxyImplementation ?? undefined,
          isVerified: analysisResult.isVerified ?? false,
          totalSupply: analysisResult.totalSupply ?? undefined,
          decimals: analysisResult.decimals ?? undefined,
        },
      });

      if (jobDto.forceReanalysis) {
        await this.prisma.contractFinding.deleteMany({ where: { contractId: contractRecord.id } });
      }

      if (findings.length > 0) {
        await this.prisma.contractFinding.createMany({
          data: findings.map((finding) => ({
            contractId: contractRecord.id,
            findingType: toPrismaFindingType(finding.findingType),
            severity: toPrismaSeverity(finding.severity),
            title: finding.title,
            description: finding.description,
            details: finding.details ?? undefined,
            confidence: finding.confidence ?? undefined,
            riskScore: finding.riskScore ?? undefined,
          })),
        });
      }

      const score = aggregateRiskScore(findings);
      const bucket = severityBucket(score);
      const findingsJson = findings.map((f) => ({
        category: f.findingType,
        severity: String(f.severity).toLowerCase(),
        weight: f.riskScore ?? 0,
        description: `${f.title}: ${f.description}`,
      }));

      await this.prisma.contractRiskScore.create({
        data: {
          contractId: contractRecord.id,
          score,
          severity: bucket,
          findings: findingsJson,
          analyzerVersion: ANALYZER_VERSION,
          jobId: jobDto.jobId ?? null,
          expiresAt: new Date(Date.now() + ANALYSIS_CACHE_TTL_SEC * 1000),
        },
      });

      const duration = Date.now() - startTime;
      const result: ContractAnalysisResultDto = {
        status: 'completed',
        name: analysisResult.name,
        symbol: analysisResult.symbol,
        totalSupply: analysisResult.totalSupply,
        decimals: analysisResult.decimals,
        functions: analysisResult.functions,
        isVerified: analysisResult.isVerified,
        deployerAddress: deployment.deployerAddress,
        deploymentBlock: deployment.deploymentBlock,
        analysisDuration: duration,
      };

      await this.redis.set(
        this.cacheKey(chainId, checksumAddress),
        JSON.stringify({
          name: result.name,
          symbol: result.symbol,
          totalSupply: result.totalSupply,
          decimals: result.decimals,
          isVerified: result.isVerified,
          deployerAddress: result.deployerAddress,
          deploymentBlock: result.deploymentBlock,
          score,
          severity: bucket,
        }),
        ANALYSIS_CACHE_TTL_SEC,
      );

      this.logger.log(`Contract analysis completed in ${duration}ms for ${checksumAddress}`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Contract analysis failed for ${checksumAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        status: 'failed',
        error: (error as Error).message,
        analysisDuration: duration,
      };
    }
  }

  private async persistNotAContract(
    chainId: string,
    address: string,
    network: PrismaNetwork,
    jobId?: string,
  ): Promise<void> {
    const contractRecord = await this.prisma.contract.upsert({
      where: { chainId_address: { chainId, address } },
      create: {
        chainId,
        address,
        network,
        contractType: ContractType.CUSTOM,
        isVerified: false,
      },
      update: { network },
    });

    await this.prisma.contractRiskScore.create({
      data: {
        contractId: contractRecord.id,
        score: 0,
        severity: 'low',
        findings: [
          {
            category: 'NOT_A_CONTRACT',
            severity: 'low',
            weight: 0,
            description: 'No bytecode at this address',
          },
        ],
        analyzerVersion: ANALYZER_VERSION,
        jobId: jobId ?? null,
      },
    });
  }

  async enqueueContractAnalysis(
    jobDto: ContractAnalysisJobDto,
    jobId: string,
  ): Promise<{ jobId: string; queueName: string }> {
    const priorityMap: Record<string, number> = { low: 1, normal: 2, high: 3 };
    const p = priorityMap[jobDto.priority ?? 'normal'] ?? 2;

    await this.queueService.addJob(
      QUEUE_CONTRACT_ANALYZE,
      'analyze-contract',
      { ...jobDto, jobId },
      {
        jobId,
        priority: p,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return { jobId, queueName: QUEUE_CONTRACT_ANALYZE };
  }

  private async analyzeContractFunctions(
    address: string,
    bytecode: string,
    provider: ethers.Provider,
  ): Promise<{
    name?: string;
    symbol?: string;
    totalSupply?: string;
    decimals?: number;
    functions: ContractFunctionShape[];
    isVerified?: boolean;
    isProxy?: boolean;
    proxyImplementation?: string;
  }> {
    const functions = this.extractFunctionSelectors(bytecode);
    let name: string | undefined;
    let symbol: string | undefined;
    let totalSupply: string | undefined;
    let decimals: number | undefined;
    let isVerified = functions.length > 0;
    let isProxy = false;
    let proxyImplementation: string | undefined;

    try {
      proxyImplementation = await this.detectProxyImplementation(provider, address);
      isProxy = Boolean(proxyImplementation);

      try {
        const tokenContract = new ethers.Contract(
          address,
          ERC20_ABI,
          provider,
        );

        name = await tokenContract.name().catch(() => undefined);
        symbol = await tokenContract.symbol().catch(() => undefined);
        const rawDecimals = await tokenContract.decimals().catch(() => undefined);
        decimals = normalizeTokenDecimals(rawDecimals);
        const totalSupplyBN = await tokenContract.totalSupply().catch(() => undefined);
        totalSupply = totalSupplyBN?.toString();

        if (name || symbol) {
          isVerified = true;
        }
      } catch (error) {
        this.logger.debug(`ERC20 probe failed: ${(error as Error).message}`);
      }

      if (!name && !symbol) {
        try {
          const nftContract = new ethers.Contract(address, ERC721_ABI, provider);
          name = await nftContract.name().catch(() => undefined);
          symbol = await nftContract.symbol().catch(() => undefined);
          if (name || symbol) {
            isVerified = true;
          }
        } catch (error) {
          this.logger.debug(`ERC721 probe failed: ${(error as Error).message}`);
        }
      }

      if (!isVerified) {
        try {
          const multiToken = new ethers.Contract(address, ERC1155_ABI, provider);
          const uri = await multiToken.uri(0n).catch(() => undefined);
          if (typeof uri === 'string' && uri.length > 0) {
            isVerified = true;
          }
        } catch (error) {
          this.logger.debug(`ERC1155 probe failed: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Function analysis failed: ${(error as Error).message}`);
    }

    return {
      name,
      symbol,
      totalSupply,
      decimals,
      functions,
      isVerified,
      isProxy,
      proxyImplementation,
    };
  }

  private async detectSecurityPatterns(
    functions: ContractFunctionShape[],
    contractMeta: {
      isProxy: boolean;
      isVerified: boolean;
      deploymentAgeBlocks?: number;
    },
  ): Promise<ContractFindingDto[]> {
    const findings: ContractFindingDto[] = [];
    const names = functions.map((f) => f.name.toLowerCase());
  
    // ── MINT: only flag if NO owner/role functions exist alongside it ──
    const hasMint = names.some((n) => n === 'mint' || n === 'safemint');
    const hasAccessControl =
      names.includes('owner') ||
      names.includes('hasrole') ||
      names.includes('onlyminter') ||
      names.includes('renounceownership') ||
      names.includes('grantRole');      // OZ AccessControl
  
    if (hasMint && !hasAccessControl) {
      findings.push({
        findingType: FindingType.VULNERABILITY,
        severity: Severity.HIGH,
        title: 'Unprotected Mint Function',
        description:
          'Contract exposes a mint function with no detectable access-control ' +
          'sibling (no owner(), hasRole(), or renounceOwnership()). ' +
          'Anyone may be able to mint tokens.',
        details: { recommendation: 'Add onlyOwner or AccessControl modifier', cwe: 'CWE-862' },
        confidence: 0.70,   // reduced — we cannot read modifiers from bytecode
        riskScore: 75,
      });
    }
  
    // ── MINT with access control: informational only ──
    if (hasMint && hasAccessControl) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity: Severity.INFORMATIONAL,
        title: 'Mint Function with Access Control',
        description: 'Contract has a mint function protected by access control. Standard pattern.',
        confidence: 0.8,
        riskScore: 10,       // near-zero impact on score
      });
    }
  
    // ── PAUSE: informational only — this is a safety feature ──
    const hasPause = names.some((n) => n === 'pause' || n === 'pauseall');
    if (hasPause) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity: Severity.INFORMATIONAL,
        title: 'Pausable Contract',
        description:
          'Contract implements pause/unpause. This is a standard OpenZeppelin safety ' +
          'pattern used by USDC, Aave, and most audited DeFi protocols.',
        confidence: 0.9,
        riskScore: 5,        // effectively zero contribution to score
      });
    }
  
    // ── BLACKLIST: medium only, not high ──
    const hasBlacklist = names.some(
      (n) => n === 'blacklist' || n === 'addtoblacklist' || n === 'blocklist',
    );
    if (hasBlacklist) {
      findings.push({
        findingType: FindingType.GOVERNANCE_RISK,
        severity: Severity.MEDIUM,
        title: 'Blacklist Capability',
        description:
          'Contract can blacklist addresses. Legitimate use exists (USDC, regulatory ' +
          'compliance) but centralises control. Verify governance.',
        details: { recommendation: 'Check if blacklist is governed by multisig or timelock' },
        confidence: 0.75,
        riskScore: 35,       // was 65 — now proportionate
      });
    }
  
    // ── OWNER FUNCTIONS: only flag if renounceOwnership is ABSENT ──
    const hasOwner = names.includes('owner') || names.includes('transferownership');
    const hasRenounce = names.includes('renounceownership');
  
    if (hasOwner && !hasRenounce) {
      findings.push({
        findingType: FindingType.GOVERNANCE_RISK,
        severity: Severity.MEDIUM,
        title: 'Non-Renounceable Ownership',
        description:
          'Contract has owner functions but no renounceOwnership(). ' +
          'Owner retains permanent control with no exit path.',
        details: { recommendation: 'Add renounceOwnership() or use a multisig/timelock' },
        confidence: 0.8,
        riskScore: 40,
      });
    }
  
    // If renounce IS present — entirely informational
    if (hasOwner && hasRenounce) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity: Severity.INFORMATIONAL,
        title: 'Standard Ownable Pattern',
        description:
          'Contract uses OpenZeppelin Ownable with renounceOwnership(). Standard pattern.',
        confidence: 0.95,
        riskScore: 5,
      });
    }
  
    // ── PROXY/UPGRADE: only HIGH if no timelock pattern detected ──
    const hasUpgrade = names.some(
      (n) => n === 'upgradeto' || n === 'upgradetoandcall',
    );
    const hasTimelock = names.some(
      (n) => n.includes('timelock') || n.includes('delay') || n === 'schedule' || n === 'queue',
    );
  
    if (hasUpgrade && !hasTimelock) {
      // Only HIGH if not a known proxy standard
      const isKnownProxy = contractMeta.isProxy;
      findings.push({
        findingType: FindingType.SUSPICIOUS_PATTERN,
        severity: isKnownProxy ? Severity.MEDIUM : Severity.HIGH,
        title: isKnownProxy
          ? 'Upgradeable Proxy (Standard Pattern)'
          : 'Upgradeability Without Timelock',
        description: isKnownProxy
          ? 'Contract is a standard UUPS/Transparent proxy. Verify the proxy admin.'
          : 'Contract can be upgraded without a timelock delay. Logic can change without warning.',
        details: { recommendation: 'Add a TimelockController before the proxy admin' },
        confidence: isKnownProxy ? 0.6 : 0.8,
        riskScore: isKnownProxy ? 30 : 65,
      });
    }
  
    if (hasUpgrade && hasTimelock) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity: Severity.INFORMATIONAL,
        title: 'Upgradeable with Timelock',
        description: 'Proxy upgrades are gated by a timelock. Good practice.',
        confidence: 0.85,
        riskScore: 10,
      });
    }
  
    return findings;
  }

  private checkFunctionAccessControl(functionInfo: ContractFunctionShape): boolean {
    const accessControlPatterns = ['onlyowner', 'require', 'auth', 'role', 'permission'];
    const functionSignature = functionInfo.signature.toLowerCase();
    return accessControlPatterns.some((pattern) => functionSignature.includes(pattern));
  }

  private detectContractType(functions: ContractFunctionShape[]): ContractType {
    const functionNames = functions.map((f) => f.name.toLowerCase());

    if (
      functionNames.includes('transfer') &&
      functionNames.includes('approve') &&
      functionNames.includes('balanceof')
    ) {
      return ContractType.ERC20;
    }
    if (
      functionNames.includes('ownerof') &&
      functionNames.includes('transferfrom') &&
      functionNames.includes('tokenuri')
    ) {
      return ContractType.ERC721;
    }
    if (
      functionNames.includes('balanceofbatch') &&
      functionNames.includes('safebatchtransferfrom')
    ) {
      return ContractType.ERC1155;
    }
    if (
      functionNames.includes('vote') ||
      functionNames.includes('propose') ||
      functionNames.includes('execute')
    ) {
      return ContractType.GOVERNANCE;
    }
    if (
      functionNames.includes('stake') ||
      functionNames.includes('unstake') ||
      functionNames.includes('claim')
    ) {
      return ContractType.STAKING;
    }
    if (
      functionNames.includes('submittransaction') ||
      functionNames.includes('confirmtransaction') ||
      functionNames.includes('executetransaction')
    ) {
      return ContractType.MULTISIG;
    }

    return ContractType.CUSTOM;
  }

  private extractFunctionSelectors(bytecode: string): ContractFunctionShape[] {
    const cleaned = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    const selectors = new Set<string>();

    for (let i = 0; i <= cleaned.length - 10; i += 2) {
      if (cleaned.slice(i, i + 2) !== SELECTOR_PUSH4) {
        continue;
      }
      const selector = cleaned.slice(i + 2, i + 10).toLowerCase();
      if (selector === 'ffffffff' || selector === '00000000') {
        continue;
      }
      selectors.add(selector);
    }

    return Array.from(selectors)
      .sort()
      .map((selector) => {
        const signature = SELECTOR_SIGNATURES[selector] ?? `unknown_${selector}()`;
        return {
          name: signature.split('(')[0],
          signature,
          selector: `0x${selector}`,
          visibility: 'external',
          mutability: 'unknown',
          inputs: [],
          outputs: [],
        };
      });
  }

  private async detectProxyImplementation(
    provider: ethers.Provider,
    address: string,
  ): Promise<string | undefined> {
    for (const slot of COMMON_PROXY_SLOTS) {
      try {
        const raw = await provider.getStorage(address, slot);
        const candidate = ethers.dataSlice(raw, 12);
        if (candidate && candidate !== '0x0000000000000000000000000000000000000000') {
          return ethers.getAddress(candidate);
        }
      } catch (error) {
        this.logger.debug(`Proxy slot probe failed for ${address}: ${(error as Error).message}`);
      }
    }

    return undefined;
  }

  private async findDeployment(
    provider: ethers.JsonRpcProvider,
    address: string,
  ): Promise<{ deployerAddress?: string; deploymentBlock?: string; deploymentTx?: string }> {
    let deploymentBlock: number | undefined;

    try {
      const latestBlock = await provider.getBlockNumber();
      let low = 0;
      let high = latestBlock;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const codeAtMid = await provider.getCode(address, mid);
        if (codeAtMid && codeAtMid !== '0x') {
          deploymentBlock = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
    } catch (error) {
      this.logger.debug(`Binary deployment search failed: ${(error as Error).message}`);
    }

    if (deploymentBlock !== undefined) {
      try {
        const toBlock = Math.min(deploymentBlock + 5000, await provider.getBlockNumber());
        const logs = await provider.getLogs({
          fromBlock: deploymentBlock,
          toBlock,
          address,
          topics: [TRANSFER_EVENT_TOPIC],
        });

        if (logs.length > 0) {
          const first = logs[0];
          const receipt = await provider.getTransactionReceipt(first.transactionHash);
          const tx = await provider.getTransaction(first.transactionHash);
          return {
            deployerAddress: tx?.from ? ethers.getAddress(tx.from) : undefined,
            deploymentBlock: receipt?.blockNumber?.toString() ?? first.blockNumber.toString(),
            deploymentTx: first.transactionHash,
          };
        }
      } catch (error) {
        this.logger.debug(`Transfer-log deployment lookup failed: ${(error as Error).message}`);
      }

      return { deploymentBlock: deploymentBlock.toString() };
    }

    try {
      const logs = await provider.getLogs({
        fromBlock: Math.max(0, (await provider.getBlockNumber()) - 5000),
        toBlock: 'latest',
        address,
        topics: [TRANSFER_EVENT_TOPIC],
      });

      if (logs.length > 0) {
        const first = logs[0];
        const receipt = await provider.getTransactionReceipt(first.transactionHash);
        const tx = await provider.getTransaction(first.transactionHash);
        return {
          deployerAddress: tx?.from ? ethers.getAddress(tx.from) : undefined,
          deploymentBlock: receipt?.blockNumber?.toString() ?? first.blockNumber.toString(),
          deploymentTx: first.transactionHash,
        };
      }
    } catch (error) {
      this.logger.debug(`Recent transfer-log deployment lookup failed: ${(error as Error).message}`);
    }

    try {
      const history = await provider.send('eth_getCode', [address, '0x1']);
      if (history && history !== '0x') {
        return { deploymentBlock: '1' };
      }
    } catch (error) {
      this.logger.debug(`Historic code probe failed: ${(error as Error).message}`);
    }

    return {};
  }
}

import { ethers } from "ethers";
import { logger } from "@/lib/logger/server-logger";
import { hashBytecode } from "@/lib/web3/bytecode-hash";
import { chainIdFromNetwork, networkFromChainId } from "@/lib/web3/chain-mapping";
import { createProvider } from "@/lib/web3/provider";
import { Network } from "@/lib/web3/types";

export enum Severity {
  INFORMATIONAL = "INFORMATIONAL",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum FindingType {
  VULNERABILITY = "VULNERABILITY",
  SUSPICIOUS_PATTERN = "SUSPICIOUS_PATTERN",
  GOVERNANCE_RISK = "GOVERNANCE_RISK",
  SECURITY_BEST_PRACTICE = "SECURITY_BEST_PRACTICE",
  INFORMATIONAL = "INFORMATIONAL",
}

export interface ContractAnalysisJobDto {
  contractAddress: string;
  chainId?: string;
  network?: Network;
  rpcUrl?: string;
  priority?: "low" | "normal" | "high";
  jobId?: string;
  forceReanalysis?: boolean;
}

export interface ContractFindingDto {
  findingType: FindingType;
  severity: Severity;
  title: string;
  description: string;
  details?: Record<string, unknown>;
  confidence?: number;
  riskScore?: number;
}

export interface ContractAnalysisResultDto {
  status: "completed" | "failed" | "skipped";
  error?: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  decimals?: number;
  functions?: Array<{ selector: string; signature: string }>;
  isVerified?: boolean;
  deployerAddress?: string;
  deploymentBlock?: string;
  score?: number;
  severity?: string;
  findings?: Array<Record<string, unknown>>;
  bytecodeHash?: string;
  isProxy?: boolean;
  proxyImplementation?: string | null;
  analysisDuration: number;
}

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

const SELECTOR_SIGNATURES: Record<string, string> = {
  "06fdde03": "name()",
  "095ea7b3": "approve(address,uint256)",
  "18160ddd": "totalSupply()",
  "23b872dd": "transferFrom(address,address,uint256)",
  "313ce567": "decimals()",
  "40c10f19": "mint(address,uint256)",
  "42966c68": "burn(uint256)",
  "70a08231": "balanceOf(address)",
  "715018a6": "renounceOwnership()",
  "8da5cb5b": "owner()",
  "95d89b41": "symbol()",
  "a9059cbb": "transfer(address,uint256)",
  "c01a8c84": "blacklist(address)",
  "3659cfe6": "upgradeTo(address)",
  "4f1ef286": "upgradeToAndCall(address,bytes)",
  "f851a440": "pause()",
  "3f4ba83a": "unpause()",
};

const COMMON_PROXY_SLOTS = [
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
  "0x7050c9e0f4ca769c69bd3a6dba6f5a6d8f2eb5b7c7a84d888fffbe671c5f3f7c",
];

export class ContractAnalysisService {
  private readonly context = ContractAnalysisService.name;

  async analyzeContract(jobDto: ContractAnalysisJobDto): Promise<ContractAnalysisResultDto> {
    const startTime = Date.now();
    let checksumAddress: string;

    try {
      checksumAddress = ethers.getAddress(jobDto.contractAddress.trim());
    } catch {
      return {
        status: "failed",
        error: "Invalid EIP-55 contract address",
        analysisDuration: Date.now() - startTime,
      };
    }

    const networkEnum = jobDto.network ?? Network.ETHEREUM;
    const chainId = jobDto.chainId ?? chainIdFromNetwork(networkEnum);
    const network = networkFromChainId(chainId);
    const provider = createProvider(network, jobDto.rpcUrl);

    logger.logWithContext(this.context, "Starting contract analysis", "info", {
      chainId,
      contractAddress: checksumAddress,
      type: "contract-analysis",
    });

    try {
      const code = await provider.getCode(checksumAddress);
      if (code === "0x") {
        return {
          status: "failed",
          error: "Address has no deployed contract bytecode",
          analysisDuration: Date.now() - startTime,
        };
      }

      const [metadata, proxyImplementation] = await Promise.all([
        this.readTokenMetadata(checksumAddress, provider),
        this.detectProxyImplementation(checksumAddress, provider),
      ]);
      const functions = this.detectFunctions(code);
      const findings = this.detectSecurityPatterns(functions, Boolean(proxyImplementation));
      const score = this.aggregateRiskScore(findings);
      const severity = this.severityBucket(score);

      logger.logPerformance("contract-analysis", Date.now() - startTime, {
        context: this.context,
        chainId,
        contractAddress: checksumAddress,
        score,
        severity,
      });

      return {
        status: "completed",
        name: metadata.name ?? undefined,
        symbol: metadata.symbol ?? undefined,
        totalSupply: metadata.totalSupply ?? undefined,
        decimals: metadata.decimals ?? undefined,
        functions,
        isVerified: Boolean(metadata.name || metadata.symbol),
        score,
        severity,
        findings: findings.map((finding) => ({
          category: finding.findingType,
          severity: finding.severity.toLowerCase(),
          weight: finding.riskScore ?? 0,
          description: `${finding.title}: ${finding.description}`,
        })),
        bytecodeHash: hashBytecode(code),
        isProxy: Boolean(proxyImplementation),
        proxyImplementation,
        analysisDuration: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("Contract analysis failed", {
        context: this.context,
        contractAddress: checksumAddress,
        error: (error as Error).message,
      });

      return {
        status: "failed",
        error: (error as Error).message,
        analysisDuration: Date.now() - startTime,
      };
    }
  }

  private async readTokenMetadata(address: string, provider: ethers.JsonRpcProvider) {
    const contract = new ethers.Contract(address, ERC20_ABI, provider);
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name().catch(() => null),
      contract.symbol().catch(() => null),
      contract.decimals().catch(() => null),
      contract.totalSupply().catch(() => null),
    ]);

    return {
      name: typeof name === "string" ? name : null,
      symbol: typeof symbol === "string" ? symbol : null,
      decimals: typeof decimals === "number" ? decimals : decimals != null ? Number(decimals) : null,
      totalSupply: totalSupply != null ? totalSupply.toString() : null,
    };
  }

  private detectFunctions(code: string) {
    const normalized = code.toLowerCase();
    return Object.entries(SELECTOR_SIGNATURES)
      .filter(([selector]) => normalized.includes(selector.toLowerCase()))
      .map(([selector, signature]) => ({
        selector,
        signature,
      }));
  }

  private async detectProxyImplementation(address: string, provider: ethers.JsonRpcProvider) {
    for (const slot of COMMON_PROXY_SLOTS) {
      try {
        const value = await provider.getStorage(address, slot);
        if (!value || /^0x0+$/.test(value)) {
          continue;
        }

        const candidate = `0x${value.slice(-40)}`;
        if (/^0x0+$/.test(candidate)) {
          continue;
        }

        return ethers.getAddress(candidate);
      } catch {
        continue;
      }
    }

    return null;
  }

  private detectSecurityPatterns(
    functions: Array<{ selector: string; signature: string }>,
    isProxy: boolean,
  ): ContractFindingDto[] {
    const findings: ContractFindingDto[] = [];
    const names = functions.map((entry) => entry.signature.toLowerCase());

    if (names.some((entry) => entry.includes("mint("))) {
      findings.push({
        findingType: FindingType.GOVERNANCE_RISK,
        severity: Severity.MEDIUM,
        title: "Mint capability detected",
        description: "The contract exposes a mint function that can increase supply.",
        riskScore: 24,
      });
    }

    if (names.some((entry) => entry.includes("blacklist("))) {
      findings.push({
        findingType: FindingType.SUSPICIOUS_PATTERN,
        severity: Severity.HIGH,
        title: "Blacklist capability detected",
        description: "The contract exposes address blacklist controls.",
        riskScore: 42,
      });
    }

    if (names.some((entry) => entry.includes("pause(")) || names.some((entry) => entry.includes("unpause("))) {
      findings.push({
        findingType: FindingType.GOVERNANCE_RISK,
        severity: Severity.MEDIUM,
        title: "Pause control detected",
        description: "The contract can pause or unpause transfers or core logic.",
        riskScore: 18,
      });
    }

    if (isProxy) {
      findings.push({
        findingType: FindingType.INFORMATIONAL,
        severity: Severity.INFORMATIONAL,
        title: "Proxy pattern detected",
        description: "The contract appears to use an upgradeable proxy pattern.",
        riskScore: 6,
      });
    }

    if (names.some((entry) => entry.includes("renounceownership("))) {
      findings.push({
        findingType: FindingType.SECURITY_BEST_PRACTICE,
        severity: Severity.LOW,
        title: "Ownership renounce path exposed",
        description: "The contract exposes renounceOwnership, which can reduce admin risk if used correctly.",
        riskScore: 4,
      });
    }

    return findings;
  }

  private aggregateRiskScore(findings: ContractFindingDto[]) {
    if (!findings.length) {
      return 8;
    }

    const total = findings.reduce((sum, finding) => sum + (finding.riskScore ?? 0), 0);
    return Math.min(100, Math.round(total / findings.length + (findings.length > 2 ? 8 : 0)));
  }

  private severityBucket(score: number) {
    if (score <= 15) return "low";
    if (score <= 39) return "medium";
    if (score <= 64) return "high";
    return "critical";
  }
}

export const contractAnalysisService = new ContractAnalysisService();

// ─────────────────────────────────────────────────────────────────────────────
// src/modules/contract-analyzer/dto/contract-analysis.dto.ts
//
// Added:
//   - Severity.INFORMATIONAL  (new tier — prevents info findings from inflating score)
//   - FindingType.INFORMATIONAL
//   - ContractAnalysisResultDto.deployerRisk  (optional, populated when risk engine runs)
// ─────────────────────────────────────────────────────────────────────────────

import { WalletRiskResult } from '../../risk-engine/types/risk-engine.types';

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum Network {
  ETHEREUM  = 'ETHEREUM',
  POLYGON   = 'POLYGON',
  BSC       = 'BSC',
  ARBITRUM  = 'ARBITRUM',
  OPTIMISM  = 'OPTIMISM',
  AVALANCHE = 'AVALANCHE',
  FANTOM    = 'FANTOM',
  BASE      = 'BASE',
}

export enum Severity {
  INFORMATIONAL = 'INFORMATIONAL',   // ← NEW: zero/near-zero score impact
  LOW           = 'LOW',
  MEDIUM        = 'MEDIUM',
  HIGH          = 'HIGH',
  CRITICAL      = 'CRITICAL',
}

export enum FindingType {
  VULNERABILITY         = 'VULNERABILITY',
  SUSPICIOUS_PATTERN    = 'SUSPICIOUS_PATTERN',
  GOVERNANCE_RISK       = 'GOVERNANCE_RISK',
  SECURITY_BEST_PRACTICE = 'SECURITY_BEST_PRACTICE',
  INFORMATIONAL         = 'INFORMATIONAL',   // ← NEW
}

// ── Job input ─────────────────────────────────────────────────────────────────

export interface ContractAnalysisJobDto {
  contractAddress: string;
  chainId?:        string;
  network?:        Network;
  rpcUrl?:         string;
  priority?:       'low' | 'normal' | 'high';
  jobId?:          string;
  forceReanalysis?: boolean;
}

// ── Finding shape ─────────────────────────────────────────────────────────────

export interface ContractFindingDto {
  findingType: FindingType;
  severity:    Severity;
  title:       string;
  description: string;
  details?:    Record<string, unknown>;
  confidence?: number;   // 0–1
  riskScore?:  number;   // 0–100, contribution to aggregate
}

// ── Result shape ─────────────────────────────────────────────────────────────

export interface ContractAnalysisResultDto {
  status:           'completed' | 'failed' | 'skipped';
  error?:           string;

  // Contract metadata
  name?:            string;
  symbol?:          string;
  totalSupply?:     string;
  decimals?:        number;
  functions?:       unknown[];
  isVerified?:      boolean;
  deployerAddress?: string;
  deploymentBlock?: string;

  // Scoring
  score?:           number;
  severity?:        string;
  findings?:        unknown[];

  // NEW: deployer wallet risk result (null if engine unavailable or deployer unknown)
  deployerRisk?:    WalletRiskResult | null;

  analysisDuration: number;
}
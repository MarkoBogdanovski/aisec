import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';

// Enum definitions (matching Prisma schema)
export enum Network {
  ETHEREUM = 'ETHEREUM',
  POLYGON = 'POLYGON',
  BSC = 'BSC',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  AVALANCHE = 'AVALANCHE',
  FANTOM = 'FANTOM',
  BASE = 'BASE',
}

export enum FindingType {
  VULNERABILITY = 'VULNERABILITY',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  COMPLIANCE_ISSUE = 'COMPLIANCE_ISSUE',
  CODE_SMELL = 'CODE_SMELL',
  SECURITY_BEST_PRACTICE = 'SECURITY_BEST_PRACTICE',
  FINANCIAL_RISK = 'FINANCIAL_RISK',
  LIQUIDITY_RISK = 'LIQUIDITY_RISK',
  GOVERNANCE_RISK = 'GOVERNANCE_RISK',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class ContractAnalysisJobDto {
  @ApiPropertyOptional({
    description: 'EVM chain id as decimal string (e.g. "1" for Ethereum mainnet)',
    example: '1',
  })
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiProperty({
    description: 'Contract address to analyze',
    example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  })
  @IsString()
  contractAddress: string;

  @ApiPropertyOptional({
    description: 'Network where contract is deployed',
    example: 'ETHEREUM',
    enum: Network,
  })
  @IsOptional()
  @IsEnum(Network)
  network?: Network;

  @ApiPropertyOptional({
    description: 'Queue priority (spec §6.2)',
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({
    description: 'User or system id that triggered analysis',
  })
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Custom RPC URL to use for analysis',
    example: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
  })
  @IsOptional()
  @IsString()
  rpcUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether to force re-analysis even if contract exists',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceReanalysis?: boolean;
}

export class ContractFunctionDto {
  @ApiProperty({
    description: 'Function name',
    example: 'mint',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Function signature',
    example: 'mint(address to, uint256 amount)',
  })
  @IsString()
  signature: string;

  @ApiProperty({
    description: 'Function visibility',
    example: 'public',
  })
  @IsString()
  visibility: string;

  @ApiPropertyOptional({
    description: 'Function mutability',
    example: 'nonpayable',
  })
  @IsOptional()
  @IsString()
  mutability?: string;

  @ApiPropertyOptional({
    description: 'Function inputs',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  inputs?: any[];

  @ApiPropertyOptional({
    description: 'Function outputs',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  outputs?: any[];
}

export class ContractAnalysisResultDto {
  @ApiProperty({
    description: 'Analysis completion status',
    example: 'completed',
  })
  @IsString()
  status: string;

  @ApiPropertyOptional({
    description: 'Contract name if available',
    example: 'USD Coin',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Contract symbol if available',
    example: 'USDC',
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'Total supply if token contract',
    example: '1000000000000000',
  })
  @IsOptional()
  @IsString()
  totalSupply?: string;

  @ApiPropertyOptional({
    description: 'Decimals if token contract',
    example: 6,
  })
  @IsOptional()
  @IsString()
  decimals?: number;

  @ApiPropertyOptional({
    description: 'List of detected functions',
    type: [ContractFunctionDto],
  })
  @IsOptional()
  @IsArray()
  functions?: ContractFunctionDto[];

  @ApiPropertyOptional({
    description: 'Whether contract is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Deployer address if available',
    example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
  })
  @IsOptional()
  @IsString()
  deployerAddress?: string;

  @ApiPropertyOptional({
    description: 'Deployment block number',
    example: 12345678,
  })
  @IsOptional()
  @IsString()
  deploymentBlock?: string;

  @ApiPropertyOptional({
    description: 'Analysis duration in milliseconds',
    example: 2500,
  })
  @IsOptional()
  @IsString()
  analysisDuration?: number;

  @ApiPropertyOptional({
    description: 'Any errors encountered during analysis',
    example: 'Contract verification failed',
  })
  @IsOptional()
  @IsString()
  error?: string;
}

export class ContractFindingDto {
  @ApiProperty({
    description: 'Type of finding',
    example: 'VULNERABILITY',
    enum: FindingType,
  })
  @IsEnum(FindingType)
  findingType: FindingType;

  @ApiProperty({
    description: 'Severity level',
    example: 'HIGH',
    enum: Severity,
  })
  @IsEnum(Severity)
  severity: Severity;

  @ApiProperty({
    description: 'Finding title',
    example: 'Unprotected Mint Function',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed description',
    example: 'The mint function lacks access controls, allowing unlimited token creation.',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Additional structured data',
    example: { function: 'mint', line: 45, recommendation: 'Add access control' },
  })
  @IsOptional()
  @IsObject()
  details?: any;

  @ApiPropertyOptional({
    description: 'Confidence score (0-1)',
    example: 0.95,
  })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Risk score (0-100)',
    example: 85,
  })
  @IsOptional()
  @IsString()
  riskScore?: number;
}

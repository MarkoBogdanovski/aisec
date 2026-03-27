import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** POST /analyze/wallet request body - Wallet risk analysis */
export class AnalyzeWalletV1Dto {
  @ApiProperty({ description: 'EVM chain id', example: '1' })
  @IsString()
  chain_id: string;

  @ApiProperty({ description: 'Wallet address (checksummed or valid hex)' })
  @IsString()
  wallet_address: string;

  @ApiPropertyOptional({ description: 'Force re-analysis even if cached', default: false })
  @IsOptional()
  forceReanalysis?: boolean;

  @ApiPropertyOptional({ description: 'Custom RPC URL' })
  @IsOptional()
  @IsString()
  rpc_url?: string;

  @ApiPropertyOptional({ description: 'Request priority', default: 'normal' })
  @IsOptional()
  @IsString()
  priority?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Spec §7.4 — POST /analyze/contract request body */
export class AnalyzeContractV1Dto {
  @ApiProperty({ description: 'EVM chain id', example: '1' })
  @IsString()
  chain_id: string;

  @ApiProperty({ description: 'Checksummed or valid hex address' })
  @IsString()
  contract_address: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high'], default: 'normal' })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high';
}

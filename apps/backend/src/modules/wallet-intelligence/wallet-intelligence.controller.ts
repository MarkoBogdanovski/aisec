import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ethers } from 'ethers';
import { WalletIntelligenceService } from './wallet-intelligence.service';

class AnalyzeWalletIntelligenceV1Dto {
  @ApiProperty({ example: '1' })
  @IsString()
  chain_id: string;

  @ApiProperty()
  @IsString()
  wallet_address: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  priority?: string;
}

@ApiTags('Wallet intelligence')
@Controller()
export class WalletIntelligenceController {
  constructor(private readonly walletIntelligence: WalletIntelligenceService) {}

  @Post('analyze/wallet')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Profile wallet address from live chain data',
  })
  async analyzeWallet(@Body() body: AnalyzeWalletIntelligenceV1Dto) {
    try {
      ethers.getAddress(body.wallet_address.trim());
    } catch {
      throw new BadRequestException('Invalid wallet_address');
    }

    return this.walletIntelligence.profileWallet(body.chain_id, body.wallet_address);
  }
}

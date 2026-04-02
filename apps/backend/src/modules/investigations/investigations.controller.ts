import { BadRequestException, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { InvestigationsService } from './investigations.service';

@ApiTags('Investigations')
@Controller('investigations')
export class InvestigationsController {
  constructor(private readonly investigations: InvestigationsService) {}

  @Get(':subjectType/:chainId/:address')
  @ApiOperation({ summary: 'Build a correlated investigation graph for a wallet or contract' })
  async getInvestigation(
    @Param('subjectType') subjectType: string,
    @Param('chainId') chainId: string,
    @Param('address') address: string,
  ) {
    const normalizedType = subjectType.toLowerCase();
    if (normalizedType !== 'wallet' && normalizedType !== 'contract') {
      throw new BadRequestException('subjectType must be "wallet" or "contract"');
    }

    let checksumAddress: string;
    try {
      checksumAddress = ethers.getAddress(address.trim());
    } catch {
      throw new BadRequestException('Invalid address');
    }

    const result = normalizedType === 'wallet'
      ? await this.investigations.buildWalletInvestigation(chainId, checksumAddress)
      : await this.investigations.buildContractInvestigation(chainId, checksumAddress);

    if (!result) {
      throw new NotFoundException('No investigation data available for this address');
    }

    return result;
  }
}

import { Injectable } from '@nestjs/common';
import { Network, RiskLevel } from '@prisma/client';
import { ethers } from 'ethers';
import { PrismaService } from '../../common/database/prisma.service';
import { LoggerService } from '../../common/logger/logger.service';
import { networkFromChainId } from '../../common/web3/chain-mapping';
import { AnalysisStatus } from '../../enums/analysis-status.enum';

const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ZERO_TOPIC_PADDED = '0x000000000000000000000000';

type WalletProfileResult = {
  status: AnalysisStatus;
  chain_id: string;
  wallet_address: string;
  network: Network;
  is_contract: boolean;
  native_balance_wei: string;
  native_balance: string;
  nonce: number;
  latest_block: number;
  recent_token_transfers: number;
  recent_activity_block?: number;
  score: number;
  risk_level: RiskLevel;
  sanction_flag: boolean;
  mixer_proximity: number;
  sub_scores: Record<string, number>;
};

@Injectable()
export class WalletIntelligenceService {
  private readonly context = WalletIntelligenceService.name;
  private readonly rpcUrls: Record<Network, string> = {
    [Network.ETHEREUM]: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    [Network.POLYGON]: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    [Network.BSC]: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    [Network.ARBITRUM]: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    [Network.OPTIMISM]: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    [Network.AVALANCHE]: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    [Network.FANTOM]: process.env.FANTOM_RPC_URL || 'https://rpc.ftm.tools',
    [Network.BASE]: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async profileWallet(chainId: string, walletAddress: string): Promise<WalletProfileResult> {
    const startedAt = Date.now();
    const checksumAddress = ethers.getAddress(walletAddress.trim());
    const network = networkFromChainId(chainId);
    const provider = new ethers.JsonRpcProvider(this.getRpcUrl(network));

    this.logger.logWithContext(this.context, 'Starting wallet intelligence profiling', 'info', {
      chainId,
      walletAddress: checksumAddress,
      type: 'wallet-profile',
    });

    const [balance, nonce, code, latestBlock] = await Promise.all([
      provider.getBalance(checksumAddress),
      provider.getTransactionCount(checksumAddress),
      provider.getCode(checksumAddress),
      provider.getBlockNumber(),
    ]);

    const isContract = code !== '0x';
    const recentWindow = Math.min(latestBlock, 100_000);
    const [incomingTransfers, outgoingTransfers] = await Promise.all([
      this.countTransferLogs(provider, latestBlock - recentWindow, latestBlock, undefined, checksumAddress),
      this.countTransferLogs(provider, latestBlock - recentWindow, latestBlock, checksumAddress, undefined),
    ]);
    const recentTokenTransfers = incomingTransfers + outgoingTransfers;
    const score = this.calculateReputationScore({
      isContract,
      balance,
      nonce,
      recentTokenTransfers,
    });
    const riskLevel = this.toRiskLevel(score);
    const recentActivityBlock = recentTokenTransfers > 0 ? latestBlock : undefined;

    const subScores = this.buildSubScores({
      isContract,
      balance,
      nonce,
      recentTokenTransfers,
    });

    await this.persistProfile({
      chainId,
      checksumAddress,
      isContract,
      riskLevel,
      score,
      subScores,
    });

    this.logger.logPerformance('wallet-profile', Date.now() - startedAt, {
      context: this.context,
      chainId,
      walletAddress: checksumAddress,
      score,
    });

    return {
      status: AnalysisStatus.COMPLETED,
      chain_id: chainId,
      wallet_address: checksumAddress,
      network,
      is_contract: isContract,
      native_balance_wei: balance.toString(),
      native_balance: ethers.formatEther(balance),
      nonce,
      latest_block: latestBlock,
      recent_token_transfers: recentTokenTransfers,
      recent_activity_block: recentActivityBlock,
      score,
      risk_level: riskLevel,
      sanction_flag: false,
      mixer_proximity: 0,
      sub_scores: subScores,
    };
  }

  private getRpcUrl(network: Network): string {
    const configured = this.rpcUrls[network];
    if (configured && !configured.includes('YOUR_PROJECT_ID')) {
      return configured;
    }
    return this.rpcUrls[Network[network] ? network : Network.ETHEREUM] || this.rpcUrls[Network.ETHEREUM];
  }

  private async persistProfile(input: {
    chainId: string;
    checksumAddress: string;
    isContract: boolean;
    riskLevel: RiskLevel;
    score: number;
    subScores: Record<string, number>;
  }): Promise<void> {
    try {
      const wallet = await this.prisma.wallet.upsert({
        where: { chainId_address: { chainId: input.chainId, address: input.checksumAddress } },
        create: {
          chainId: input.chainId,
          address: input.checksumAddress,
          isContract: input.isContract,
          riskLevel: input.riskLevel,
        },
        update: {
          isContract: input.isContract,
          riskLevel: input.riskLevel,
        },
      });

      await this.prisma.walletReputationScore.create({
        data: {
          walletId: wallet.id,
          score: input.score,
          mixerProximity: 0,
          sanctionFlag: false,
          subScores: input.subScores,
        },
      });
    } catch (error) {
      this.logger.logWithContext(this.context, 'Wallet profile persistence failed; returning live analysis anyway', 'warn', {
        walletAddress: input.checksumAddress,
        chainId: input.chainId,
        error: (error as Error).message,
        type: 'wallet-profile',
      });
    }
  }

  private async countTransferLogs(
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    fromAddress?: string,
    toAddress?: string,
  ): Promise<number> {
    const topics: Array<string | null> = [TRANSFER_EVENT_TOPIC];
    topics.push(fromAddress ? `${ZERO_TOPIC_PADDED}${fromAddress.toLowerCase().slice(2)}` : null);
    topics.push(toAddress ? `${ZERO_TOPIC_PADDED}${toAddress.toLowerCase().slice(2)}` : null);

    try {
      const logs = await provider.getLogs({
        fromBlock: Math.max(0, fromBlock),
        toBlock,
        topics,
      });
      return logs.length;
    } catch (error) {
      this.logger.logWithContext(this.context, 'Transfer log lookup failed', 'debug', {
        error: (error as Error).message,
        type: 'wallet-profile',
      });
      return 0;
    }
  }

  private calculateReputationScore(input: {
    isContract: boolean;
    balance: bigint;
    nonce: number;
    recentTokenTransfers: number;
  }): number {
    const { isContract, balance, nonce, recentTokenTransfers } = input;
    let score = 50;

    if (isContract) score -= 10;
    if (balance > ethers.parseEther('10')) score += 15;
    else if (balance > ethers.parseEther('0.1')) score += 8;
    else if (balance === 0n) score -= 10;

    if (nonce >= 100) score += 20;
    else if (nonce >= 10) score += 10;
    else if (nonce === 0) score -= 10;

    if (recentTokenTransfers >= 50) score += 15;
    else if (recentTokenTransfers >= 5) score += 8;
    else if (recentTokenTransfers === 0) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private buildSubScores(input: {
    isContract: boolean;
    balance: bigint;
    nonce: number;
    recentTokenTransfers: number;
  }): Record<string, number> {
    return {
      contract_exposure: input.isContract ? 40 : 80,
      capitalization: input.balance > 0n ? Math.min(100, Number(ethers.formatEther(input.balance)) * 10) : 0,
      activity: Math.min(100, input.nonce),
      token_flow: Math.min(100, input.recentTokenTransfers * 2),
    };
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.MINIMAL;
    if (score >= 60) return RiskLevel.LOW;
    if (score >= 40) return RiskLevel.MEDIUM;
    if (score >= 20) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }
}

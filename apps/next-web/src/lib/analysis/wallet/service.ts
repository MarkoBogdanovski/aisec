import { ethers } from "ethers";
import { logger } from "@/lib/logger/server-logger";
import { AnalysisStatus, type RiskLevel } from "../shared";
import { networkFromChainId } from "@/lib/web3/chain-mapping";
import { createProvider } from "@/lib/web3/provider";
import type { Network } from "@/lib/web3/types";

const TRANSFER_EVENT_TOPIC = ethers.id("Transfer(address,address,uint256)");
const ZERO_TOPIC_PADDED = "0x000000000000000000000000";

export type WalletProfileResult = {
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

export class WalletAnalysisService {
  private readonly context = WalletAnalysisService.name;

  async profileWallet(chainId: string, walletAddress: string): Promise<WalletProfileResult> {
    const startedAt = Date.now();
    const checksumAddress = ethers.getAddress(walletAddress.trim());
    const network = networkFromChainId(chainId);
    const provider = createProvider(network);

    logger.logWithContext(this.context, "Starting wallet intelligence profiling", "info", {
      chainId,
      walletAddress: checksumAddress,
      type: "wallet-profile",
    });

    const [balance, nonce, code, latestBlock] = await Promise.all([
      provider.getBalance(checksumAddress),
      provider.getTransactionCount(checksumAddress),
      provider.getCode(checksumAddress),
      provider.getBlockNumber(),
    ]);

    const isContract = code !== "0x";
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

    logger.logPerformance("wallet-profile", Date.now() - startedAt, {
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

  private async countTransferLogs(
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    fromAddress?: string,
    toAddress?: string,
  ) {
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
      logger.logWithContext(this.context, "Transfer log lookup failed", "debug", {
        error: (error as Error).message,
        type: "wallet-profile",
      });
      return 0;
    }
  }

  private calculateReputationScore(input: {
    isContract: boolean;
    balance: bigint;
    nonce: number;
    recentTokenTransfers: number;
  }) {
    const { isContract, balance, nonce, recentTokenTransfers } = input;
    let score = 50;

    if (isContract) score -= 10;
    if (balance > ethers.parseEther("10")) score += 15;
    else if (balance > ethers.parseEther("0.1")) score += 8;
    else if (balance === BigInt(0)) score -= 10;

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
  }) {
    return {
      contract_exposure: input.isContract ? 40 : 80,
      capitalization: input.balance > BigInt(0) ? Math.min(100, Number(ethers.formatEther(input.balance)) * 10) : 0,
      activity: Math.min(100, input.nonce),
      token_flow: Math.min(100, input.recentTokenTransfers * 2),
    };
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= 80) return "MINIMAL";
    if (score >= 60) return "LOW";
    if (score >= 40) return "MEDIUM";
    if (score >= 20) return "HIGH";
    return "CRITICAL";
  }
}

export const walletAnalysisService = new WalletAnalysisService();

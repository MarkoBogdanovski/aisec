import { ServiceUnavailableError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/server-logger";
import { ethers } from "ethers";
import {
  MarketAnalysisSource,
  MarketConnectionDirection,
  MarketSignalSeverity,
} from "../shared";
import { networkFromChainId } from "@/lib/web3/chain-mapping";

type CryptoApisChain = {
  blockchain: string;
  network: string;
};

type MarketSignal = {
  type: string;
  severity: MarketSignalSeverity;
  description: string;
  value?: string | number | null;
  observedAt?: string | null;
};

type WalletConnection = {
  wallet_address: string;
  connected: boolean;
  recent_transfer_count: number;
  direction: MarketConnectionDirection;
  last_transfer_at: string | null;
  sample_transfers: Array<{
    transaction_hash: string | null;
    sender: string | null;
    recipient: string | null;
    amount: string | null;
    timestamp: string | null;
  }>;
};

export type TokenMarketAnalysis = {
  chain_id: string;
  token_address: string;
  source: MarketAnalysisSource;
  analyzed_at: string;
  token: {
    name: string | null;
    symbol: string | null;
    standard: string | null;
    decimals: number | null;
    total_supply: string | null;
  };
  market: {
    latest_price: string | null;
    price_unit: string | null;
    market_cap_usd: string | null;
    volume_24h: string | null;
    price_change_24h: string | null;
    price_change_1h: string | null;
    asset_reference_id: string | null;
    asset_slug: string | null;
  };
  activity: {
    recent_transaction_count: number;
    latest_transaction_at: string | null;
    sample_transactions: Array<{
      hash: string | null;
      sender: string | null;
      recipient: string | null;
      timestamp: string | null;
      status: string | null;
    }>;
  };
  analysis: {
    score: number;
    severity: MarketSignalSeverity;
    signals: MarketSignal[];
  };
  wallet_connection: WalletConnection | null;
};

export class MarketAnalysisService {
  private readonly context = MarketAnalysisService.name;
  private readonly baseUrl = process.env.CRYPTOAPIS_BASE_URL || "https://rest.cryptoapis.io";
  private readonly apiKey = process.env.CRYPTOAPIS_API_KEY || "";
  private readonly requestTimeoutMs = 15000;

  async analyzeTokenActivity(
    chainId: string,
    tokenAddress: string,
    walletAddress?: string,
  ): Promise<TokenMarketAnalysis> {
    const startedAt = Date.now();
    if (!this.apiKey) {
      throw new ServiceUnavailableError("CRYPTOAPIS_API_KEY is not configured");
    }

    const checksummedToken = ethers.getAddress(tokenAddress.trim());
    const checksummedWallet = walletAddress ? ethers.getAddress(walletAddress.trim()) : undefined;
    const chain = this.toCryptoApisChain(chainId);

    logger.logWithContext(this.context, "Starting market token analysis", "info", {
      chainId,
      tokenAddress: checksummedToken,
      walletAddress: checksummedWallet,
      type: "market-analysis",
    });

    const tokenDetails = await this.requestJson(
      `/contracts/evm/${chain.blockchain}/${chain.network}/${checksummedToken}/token-details`,
    );

    const tokenItem = tokenDetails?.data?.item ?? {};
    const symbol = this.asString(tokenItem.symbol);
    const assetDetails = symbol
      ? await this.tryRequestJson(`/market-data/assets/by-symbol/${encodeURIComponent(symbol)}`)
      : null;
    const transactions = await this.tryRequestJson(
      `/addresses-latest/evm/${chain.blockchain}/${chain.network}/${checksummedToken}/transactions?limit=10&sortingOrder=DESCENDING`,
    );
    const walletTransfers = checksummedWallet
      ? await this.tryRequestJson(
          `/addresses-latest/evm/${chain.blockchain}/${chain.network}/${checksummedWallet}/tokens-transfers?limit=50&sortingOrder=DESCENDING`,
        )
      : null;

    const assetItem = assetDetails?.data?.item ?? {};
    const specificData = assetItem.specificData ?? {};
    const txItems = Array.isArray(transactions?.data?.items) ? transactions.data.items : [];

    const analysisSignals = this.buildSignals({
      latestPrice: this.asString(assetItem.latestRate?.amount),
      volume24h: this.asString(specificData["24HoursTradingVolume"]),
      marketCap: this.asString(specificData.marketCapInUSD),
      priceChange24h: this.asString(specificData["24HoursPriceChangeInPercentage"]),
      priceChange1h: this.asString(specificData["1HourPriceChangeInPercentage"]),
      latestTransactionAt: this.toIso(txItems[0]?.timestamp),
      recentTransactionCount: txItems.length,
    });

    const walletConnection = checksummedWallet
      ? this.buildWalletConnection(checksummedToken, checksummedWallet, walletTransfers?.data?.items)
      : null;

    const score = this.computeScore(analysisSignals);
    const result = {
      chain_id: chainId,
      token_address: checksummedToken,
      source: MarketAnalysisSource.CRYPTOAPIS,
      analyzed_at: new Date().toISOString(),
      token: {
        name: this.asString(tokenItem.name),
        symbol,
        standard: this.asString(tokenItem.standard),
        decimals: this.asNumber(tokenItem.fungibleValues?.decimals),
        total_supply: this.asString(tokenItem.fungibleValues?.totalSupply),
      },
      market: {
        latest_price: this.asString(assetItem.latestRate?.amount),
        price_unit: this.asString(assetItem.latestRate?.unit),
        market_cap_usd: this.asString(specificData.marketCapInUSD),
        volume_24h: this.asString(specificData["24HoursTradingVolume"]),
        price_change_24h: this.asString(specificData["24HoursPriceChangeInPercentage"]),
        price_change_1h: this.asString(specificData["1HourPriceChangeInPercentage"]),
        asset_reference_id: this.asString(assetItem.referenceId),
        asset_slug: this.asString(assetItem.slug),
      },
      activity: {
        recent_transaction_count: txItems.length,
        latest_transaction_at: this.toIso(txItems[0]?.timestamp),
        sample_transactions: txItems.slice(0, 5).map((item: any) => ({
          hash: this.asString(item.hash),
          sender: this.asString(item.sender),
          recipient: this.asString(item.recipient),
          timestamp: this.toIso(item.timestamp),
          status: this.asString(item.status),
        })),
      },
      analysis: {
        score,
        severity: this.severityFromScore(score),
        signals: analysisSignals,
      },
      wallet_connection: walletConnection,
    };

    logger.logPerformance("market-token-analysis", Date.now() - startedAt, {
      context: this.context,
      chainId,
      tokenAddress: checksummedToken,
      signalCount: analysisSignals.length,
    });

    return result;
  }

  private async requestJson(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || `Crypto APIs request failed with status ${response.status}`;
      throw new ServiceUnavailableError(message);
    }

    return payload;
  }

  private async tryRequestJson(path: string) {
    try {
      return await this.requestJson(path);
    } catch (error) {
      logger.logWithContext(this.context, "Crypto APIs request failed", "warn", {
        path,
        error: (error as Error).message,
        type: "market-analysis",
      });
      return null;
    }
  }

  private toCryptoApisChain(chainId: string): CryptoApisChain {
    switch (networkFromChainId(chainId)) {
      case "POLYGON":
        return { blockchain: "polygon", network: "mainnet" };
      case "BSC":
        return { blockchain: "binance-smart-chain", network: "mainnet" };
      case "ARBITRUM":
        return { blockchain: "arbitrum", network: "mainnet" };
      case "OPTIMISM":
        return { blockchain: "optimism", network: "mainnet" };
      case "AVALANCHE":
        return { blockchain: "avalanche", network: "mainnet" };
      case "FANTOM":
        return { blockchain: "fantom", network: "mainnet" };
      case "BASE":
        return { blockchain: "base", network: "mainnet" };
      default:
        return { blockchain: "ethereum", network: "mainnet" };
    }
  }

  private buildSignals(input: {
    latestPrice: string | null;
    volume24h: string | null;
    marketCap: string | null;
    priceChange24h: string | null;
    priceChange1h: string | null;
    latestTransactionAt: string | null;
    recentTransactionCount: number;
  }): MarketSignal[] {
    const signals: MarketSignal[] = [];
    const absChange24h = Math.abs(Number(input.priceChange24h || 0));
    const absChange1h = Math.abs(Number(input.priceChange1h || 0));
    const volume24h = Number(input.volume24h || 0);
    const marketCap = Number(input.marketCap || 0);

    if (!input.latestPrice) {
      signals.push({
        type: "PRICE_COVERAGE_GAP",
        severity: MarketSignalSeverity.MEDIUM,
        description: "Crypto APIs did not return a latest price for this token symbol.",
        value: null,
      });
    }

    if (absChange24h >= 20) {
      signals.push({
        type: "HIGH_24H_VOLATILITY",
        severity: MarketSignalSeverity.HIGH,
        description: "Token price moved sharply over the last 24 hours.",
        value: input.priceChange24h,
      });
    } else if (absChange24h >= 10) {
      signals.push({
        type: "MODERATE_24H_VOLATILITY",
        severity: MarketSignalSeverity.MEDIUM,
        description: "Token price shows elevated 24h volatility.",
        value: input.priceChange24h,
      });
    }

    if (absChange1h >= 5) {
      signals.push({
        type: "SHORT_TERM_PRICE_SWING",
        severity: MarketSignalSeverity.MEDIUM,
        description: "Token price moved materially in the last hour.",
        value: input.priceChange1h,
      });
    }

    if (volume24h > 0 && marketCap > 0 && volume24h / marketCap > 1) {
      signals.push({
        type: "UNUSUAL_VOLUME_TO_MARKET_CAP",
        severity: MarketSignalSeverity.HIGH,
        description: "24h trading volume exceeds market cap, which can indicate abnormal churn.",
        value: `${volume24h}/${marketCap}`,
      });
    } else if (volume24h === 0) {
      signals.push({
        type: "LOW_LIQUIDITY_SIGNAL",
        severity: MarketSignalSeverity.MEDIUM,
        description: "No 24h trading volume was returned for this token.",
        value: input.volume24h,
      });
    }

    if (marketCap > 0 && marketCap < 1_000_000) {
      signals.push({
        type: "MICROCAP_EXPOSURE",
        severity: MarketSignalSeverity.MEDIUM,
        description: "Token market cap is below 1M USD.",
        value: input.marketCap,
      });
    }

    if (!input.latestTransactionAt || input.recentTransactionCount === 0) {
      signals.push({
        type: "LOW_ONCHAIN_ACTIVITY",
        severity: MarketSignalSeverity.LOW,
        description: "No recent contract-level transactions were observed in the sampled window.",
        observedAt: input.latestTransactionAt,
      });
    }

    return signals;
  }

  private buildWalletConnection(tokenAddress: string, walletAddress: string, items: any[] | undefined): WalletConnection {
    const normalizedToken = tokenAddress.toLowerCase();
    const relevant = Array.isArray(items)
      ? items.filter(
          (item) => String(item?.tokenData?.contractAddress || item?.contractAddress || "").toLowerCase() === normalizedToken,
        )
      : [];

    const inbound = relevant.some(
      (item) => String(item?.recipient || "").toLowerCase() === walletAddress.toLowerCase(),
    );
    const outbound = relevant.some(
      (item) => String(item?.sender || "").toLowerCase() === walletAddress.toLowerCase(),
    );

    let direction: WalletConnection["direction"] = MarketConnectionDirection.NONE;
    if (inbound && outbound) direction = MarketConnectionDirection.BIDIRECTIONAL;
    else if (inbound) direction = MarketConnectionDirection.INBOUND;
    else if (outbound) direction = MarketConnectionDirection.OUTBOUND;

    return {
      wallet_address: walletAddress,
      connected: relevant.length > 0,
      recent_transfer_count: relevant.length,
      direction,
      last_transfer_at: this.toIso(relevant[0]?.timestamp),
      sample_transfers: relevant.slice(0, 5).map((item) => ({
        transaction_hash: this.asString(item?.transactionHash || item?.transactionId),
        sender: this.asString(item?.sender),
        recipient: this.asString(item?.recipient),
        amount: this.asString(item?.tokenData?.fungibleValues?.amount),
        timestamp: this.toIso(item?.timestamp),
      })),
    };
  }

  private computeScore(signals: MarketSignal[]) {
    if (!signals.length) {
      return 12;
    }

    const severityWeight = {
      [MarketSignalSeverity.LOW]: 8,
      [MarketSignalSeverity.MEDIUM]: 18,
      [MarketSignalSeverity.HIGH]: 30,
      [MarketSignalSeverity.CRITICAL]: 45,
    };
    const total = signals.reduce((sum, signal) => sum + severityWeight[signal.severity], 0);
    return Math.min(100, total);
  }

  private severityFromScore(score: number) {
    if (score >= 80) return MarketSignalSeverity.CRITICAL;
    if (score >= 55) return MarketSignalSeverity.HIGH;
    if (score >= 25) return MarketSignalSeverity.MEDIUM;
    return MarketSignalSeverity.LOW;
  }

  private asString(value: unknown): string | null {
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
  }

  private asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toIso(value: unknown): string | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value * 1000).toISOString();
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    return null;
  }
}

export const marketAnalysisService = new MarketAnalysisService();

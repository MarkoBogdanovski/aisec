import { ethers } from "ethers";
import { Network } from "./types";

const RPC_URLS: Record<Network, string | undefined> = {
  [Network.ETHEREUM]: process.env.ETHEREUM_RPC_URL,
  [Network.POLYGON]: process.env.POLYGON_RPC_URL,
  [Network.BSC]: process.env.BSC_RPC_URL,
  [Network.ARBITRUM]: process.env.ARBITRUM_RPC_URL,
  [Network.OPTIMISM]: process.env.OPTIMISM_RPC_URL,
  [Network.AVALANCHE]: process.env.AVALANCHE_RPC_URL,
  [Network.FANTOM]: process.env.FANTOM_RPC_URL,
  [Network.BASE]: process.env.BASE_RPC_URL,
};

const DEFAULT_RPC_URLS: Record<Network, string> = {
  [Network.ETHEREUM]: "https://eth.llamarpc.com",
  [Network.POLYGON]: "https://polygon-rpc.com",
  [Network.BSC]: "https://bsc-dataseed.binance.org",
  [Network.ARBITRUM]: "https://arb1.arbitrum.io/rpc",
  [Network.OPTIMISM]: "https://mainnet.optimism.io",
  [Network.AVALANCHE]: "https://api.avax.network/ext/bc/C/rpc",
  [Network.FANTOM]: "https://rpc.ftm.tools",
  [Network.BASE]: "https://mainnet.base.org",
};

function isUsableRpcUrl(value: string | undefined) {
  return Boolean(value && !value.includes("YOUR_PROJECT_ID"));
}

export function getRpcUrl(network: Network, override?: string) {
  if (isUsableRpcUrl(override)) {
    return override;
  }

  const configured = RPC_URLS[network];
  if (isUsableRpcUrl(configured)) {
    return configured;
  }

  return DEFAULT_RPC_URLS[network];
}

export function createProvider(network: Network, override?: string) {
  return new ethers.JsonRpcProvider(getRpcUrl(network, override));
}

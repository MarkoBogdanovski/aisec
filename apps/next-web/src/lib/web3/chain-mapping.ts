import { Network } from "./types";

const CHAIN_ID_TO_NETWORK: Record<string, Network> = {
  "1": Network.ETHEREUM,
  "10": Network.OPTIMISM,
  "56": Network.BSC,
  "137": Network.POLYGON,
  "250": Network.FANTOM,
  "8453": Network.BASE,
  "43114": Network.AVALANCHE,
  "42161": Network.ARBITRUM,
};

const NETWORK_TO_CHAIN_ID: Record<Network, string> = {
  [Network.ETHEREUM]: "1",
  [Network.OPTIMISM]: "10",
  [Network.BSC]: "56",
  [Network.POLYGON]: "137",
  [Network.FANTOM]: "250",
  [Network.BASE]: "8453",
  [Network.AVALANCHE]: "43114",
  [Network.ARBITRUM]: "42161",
};

export function networkFromChainId(chainId: string): Network {
  return CHAIN_ID_TO_NETWORK[chainId] ?? Network.ETHEREUM;
}

export function chainIdFromNetwork(network: Network): string {
  return NETWORK_TO_CHAIN_ID[network] ?? "1";
}

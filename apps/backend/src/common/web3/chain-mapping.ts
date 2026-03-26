import { Network } from '@prisma/client';

const CHAIN_ID_TO_NETWORK: Record<string, Network> = {
  '1': Network.ETHEREUM,
  '137': Network.POLYGON,
  '56': Network.BSC,
  '42161': Network.ARBITRUM,
  '10': Network.OPTIMISM,
  '43114': Network.AVALANCHE,
  '250': Network.FANTOM,
  '8453': Network.BASE,
};

const NETWORK_TO_CHAIN_ID: Record<Network, string> = {
  [Network.ETHEREUM]: '1',
  [Network.POLYGON]: '137',
  [Network.BSC]: '56',
  [Network.ARBITRUM]: '42161',
  [Network.OPTIMISM]: '10',
  [Network.AVALANCHE]: '43114',
  [Network.FANTOM]: '250',
  [Network.BASE]: '8453',
};

export function networkFromChainId(chainId: string): Network {
  const net = CHAIN_ID_TO_NETWORK[chainId];
  if (!net) {
    return Network.ETHEREUM;
  }
  return net;
}

export function chainIdFromNetwork(network: Network): string {
  return NETWORK_TO_CHAIN_ID[network] ?? '1';
}

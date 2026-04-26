import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Network } from '@prisma/client';
import { ethers } from 'ethers';
import { LoggerService } from '../../common/logger/logger.service';
import { networkFromChainId } from '../../common/web3/chain-mapping';

const SOLANA_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const IMPLEMENTATION_SLOTS = [
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  '0x7050c9e0f4ca769c69bd3a6dba6f5a6d8f2eb5b7c7a84d888fffbe671c5f3f7c',
];

type EvmChainDescriptor = {
  blockchain: string;
  network: string;
};

@Injectable()
export class ChainIntelligenceService {
  private readonly context = ChainIntelligenceService.name;
  private readonly cryptoApisBaseUrl = process.env.CRYPTOAPIS_BASE_URL || 'https://rest.cryptoapis.io';
  private readonly cryptoApisApiKey = process.env.CRYPTOAPIS_API_KEY || '';
  private readonly solanaRpcUrl = process.env.SOLANA_RPC_URL || SOLANA_MAINNET_RPC;

  constructor(private readonly logger: LoggerService) {}

  async getContractOwnership(chainId: string, address: string) {
    if (this.isSolanaChain(chainId)) {
      return this.getSolanaOwnership(address);
    }

    const checksumAddress = this.toChecksumAddress(address);
    const network = networkFromChainId(chainId);
    const provider = this.createEvmProvider(network);
    const code = await provider.getCode(checksumAddress);
    const isContract = code !== '0x';

    if (!isContract) {
      return {
        chain_id: chainId,
        address: checksumAddress,
        chain_family: 'evm',
        address_type: 'wallet',
        owner_address: checksumAddress,
        admin_address: null,
        implementation_address: null,
        controlling_addresses: [checksumAddress],
      };
    }

    const ownerAddress = await this.tryContractMethod(provider, checksumAddress, 'owner');
    const getOwnerAddress = await this.tryContractMethod(provider, checksumAddress, 'getOwner');
    const adminAddress = await this.tryContractMethod(provider, checksumAddress, 'admin');
    const proxyAdmin = await this.tryContractMethod(provider, checksumAddress, 'proxyAdmin');
    const implementationAddress = await this.resolveImplementation(provider, checksumAddress);

    const controlling = [
      ownerAddress,
      getOwnerAddress,
      adminAddress,
      proxyAdmin,
    ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

    return {
      chain_id: chainId,
      address: checksumAddress,
      chain_family: 'evm',
      address_type: 'contract',
      owner_address: ownerAddress || getOwnerAddress || null,
      admin_address: adminAddress || proxyAdmin || null,
      implementation_address: implementationAddress,
      controlling_addresses: controlling,
    };
  }

  async getWalletSnapshot(chainId: string, address: string, limit = 25) {
    if (this.isSolanaChain(chainId)) {
      return this.getSolanaWalletSnapshot(address, limit);
    }

    const checksumAddress = this.toChecksumAddress(address);
    const network = networkFromChainId(chainId);
    const provider = this.createEvmProvider(network);
    const [nativeBalance, nonce, latestBlock, code] = await Promise.all([
      provider.getBalance(checksumAddress),
      provider.getTransactionCount(checksumAddress),
      provider.getBlockNumber(),
      provider.getCode(checksumAddress),
    ]);

    const chain = this.toCryptoApisChain(chainId);
    const [tokensResponse, txResponse, tokenTransfersResponse] = await Promise.all([
      this.requestCryptoApisJson(`/addresses-historical/evm/${chain.blockchain}/${chain.network}/${checksumAddress}/tokens?limit=100`),
      this.requestCryptoApisJson(`/addresses-latest/evm/${chain.blockchain}/${chain.network}/${checksumAddress}/transactions?limit=${limit}&sortingOrder=DESCENDING`),
      this.requestCryptoApisJson(`/addresses-latest/evm/${chain.blockchain}/${chain.network}/${checksumAddress}/tokens-transfers?limit=${limit}&sortingOrder=DESCENDING`),
    ]);

    const tokenItems = Array.isArray(tokensResponse?.data?.items) ? tokensResponse.data.items : [];
    const transactionItems = Array.isArray(txResponse?.data?.items) ? txResponse.data.items : [];
    const transferItems = Array.isArray(tokenTransfersResponse?.data?.items) ? tokenTransfersResponse.data.items : [];

    return {
      chain_id: chainId,
      address: checksumAddress,
      chain_family: 'evm',
      address_type: code === '0x' ? 'wallet' : 'contract',
      native_balance_wei: nativeBalance.toString(),
      native_balance: ethers.formatEther(nativeBalance),
      nonce,
      latest_block: latestBlock,
      token_holdings: tokenItems.map((item: any) => ({
        contract_address: this.pickString(item.contractAddress, item.tokenData?.contractAddress),
        symbol: this.pickString(item.symbol, item.tokenSymbol, item.tokenData?.symbol),
        name: this.pickString(item.name, item.tokenName, item.tokenData?.name),
        type: this.pickString(item.type, item.tokenType, item.tokenData?.type),
        balance: this.pickString(item.balance, item.confirmedBalance, item.tokenData?.confirmedBalance, item.tokenData?.balance),
        decimals: this.pickNumber(item.decimals, item.tokenData?.decimals),
      })),
      trade_history: {
        transactions: transactionItems.map((item: any) => ({
          hash: this.pickString(item.hash, item.transactionHash),
          from: this.pickString(item.sender, item.from),
          to: this.pickString(item.recipient, item.to),
          value: this.pickString(item.value, item.amount),
          timestamp: this.toIso(item.timestamp),
          status: this.pickString(item.status),
          block_number: this.pickNumber(item.blockHeight, item.blockNumber),
        })),
        token_transfers: transferItems.map((item: any) => ({
          transaction_hash: this.pickString(item.transactionHash, item.transactionId),
          token_address: this.pickString(item.tokenData?.contractAddress, item.contractAddress),
          token_symbol: this.pickString(item.tokenData?.symbol, item.symbol),
          token_name: this.pickString(item.tokenData?.name, item.name),
          from: this.pickString(item.sender),
          to: this.pickString(item.recipient),
          amount: this.pickString(item.tokenData?.fungibleValues?.amount, item.amount),
          timestamp: this.toIso(item.timestamp),
        })),
      },
    };
  }

  protected createEvmProvider(network: Network) {
    return new ethers.JsonRpcProvider(this.getRpcUrl(network));
  }

  protected async solanaRpc(method: string, params: unknown[]) {
    const response = await fetch(this.solanaRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(15000),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.error) {
      throw new ServiceUnavailableException(payload?.error?.message || `Solana RPC request failed: ${method}`);
    }

    return payload?.result;
  }

  protected async requestCryptoApisJson(path: string) {
    if (!this.cryptoApisApiKey) {
      throw new ServiceUnavailableException('CRYPTOAPIS_API_KEY is required for wallet holdings and trade history');
    }

    const response = await fetch(`${this.cryptoApisBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.cryptoApisApiKey,
      },
      signal: AbortSignal.timeout(15000),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ServiceUnavailableException(payload?.error?.message || `Crypto APIs request failed with status ${response.status}`);
    }

    return payload;
  }

  private async getSolanaOwnership(address: string) {
    const accountInfo = await this.solanaRpc('getAccountInfo', [address, { encoding: 'jsonParsed', commitment: 'finalized' }]);
    const value = accountInfo?.value;
    if (!value) {
      throw new BadRequestException('Solana account not found');
    }

    return {
      chain_id: 'solana',
      address,
      chain_family: 'solana',
      address_type: value.executable ? 'program' : 'account',
      owner_address: typeof value.owner === 'string' ? value.owner : null,
      admin_address: null,
      implementation_address: null,
      controlling_addresses: typeof value.owner === 'string' ? [value.owner] : [],
      executable: Boolean(value.executable),
      lamports: typeof value.lamports === 'number' ? value.lamports : null,
    };
  }

  private async getSolanaWalletSnapshot(address: string, limit: number) {
    const [balance, tokenAccounts, signatures] = await Promise.all([
      this.solanaRpc('getBalance', [address, { commitment: 'finalized' }]),
      this.solanaRpc('getTokenAccountsByOwner', [address, { programId: SPL_TOKEN_PROGRAM_ID }, { encoding: 'jsonParsed', commitment: 'finalized' }]),
      this.solanaRpc('getSignaturesForAddress', [address, { limit, commitment: 'finalized' }]),
    ]);

    const signatureItems = Array.isArray(signatures) ? signatures : [];
    const transactionDetails = await Promise.all(
      signatureItems.slice(0, limit).map(async (item: any) => {
        try {
          const tx = await this.solanaRpc('getTransaction', [item.signature, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]);
          return {
            signature: item.signature,
            slot: item.slot,
            block_time: item.blockTime ? new Date(item.blockTime * 1000).toISOString() : null,
            confirmation_status: item.confirmationStatus || null,
            err: item.err ?? null,
            fee: tx?.meta?.fee ?? null,
          };
        } catch (error) {
          this.logger.logWithContext(this.context, 'Failed to fetch Solana transaction details', 'warn', {
            address,
            signature: item.signature,
            error: (error as Error).message,
            type: 'solana-wallet',
          });
          return {
            signature: item.signature,
            slot: item.slot,
            block_time: item.blockTime ? new Date(item.blockTime * 1000).toISOString() : null,
            confirmation_status: item.confirmationStatus || null,
            err: item.err ?? null,
            fee: null,
          };
        }
      }),
    );

    return {
      chain_id: 'solana',
      address,
      chain_family: 'solana',
      address_type: 'wallet',
      native_balance_lamports: balance?.value ?? 0,
      native_balance_sol: typeof balance?.value === 'number' ? String(balance.value / 1_000_000_000) : '0',
      token_holdings: Array.isArray(tokenAccounts?.value)
        ? tokenAccounts.value.map((entry: any) => ({
            token_account: entry.pubkey,
            mint: entry.account?.data?.parsed?.info?.mint ?? null,
            owner: entry.account?.data?.parsed?.info?.owner ?? null,
            amount: entry.account?.data?.parsed?.info?.tokenAmount?.amount ?? null,
            decimals: entry.account?.data?.parsed?.info?.tokenAmount?.decimals ?? null,
            ui_amount: entry.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? null,
          }))
        : [],
      trade_history: {
        transactions: transactionDetails,
      },
    };
  }

  private async tryContractMethod(provider: ethers.Provider, address: string, methodName: 'owner' | 'getOwner' | 'admin' | 'proxyAdmin') {
    const abiMap = {
      owner: ['function owner() view returns (address)'],
      getOwner: ['function getOwner() view returns (address)'],
      admin: ['function admin() view returns (address)'],
      proxyAdmin: ['function proxyAdmin() view returns (address)'],
    };

    try {
      const contract = new ethers.Contract(address, abiMap[methodName], provider);
      const value = await contract[methodName]();
      if (typeof value === 'string' && value !== ZERO_ADDRESS) {
        return ethers.getAddress(value);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async resolveImplementation(provider: ethers.Provider, address: string) {
    for (const slot of IMPLEMENTATION_SLOTS) {
      try {
        const raw = await provider.getStorage(address, slot);
        const candidate = ethers.dataSlice(raw, 12);
        if (candidate && candidate !== ZERO_ADDRESS) {
          return ethers.getAddress(candidate);
        }
      } catch {
        continue;
      }
    }

    try {
      const contract = new ethers.Contract(address, ['function implementation() view returns (address)'], provider);
      const value = await contract.implementation();
      if (typeof value === 'string' && value !== ZERO_ADDRESS) {
        return ethers.getAddress(value);
      }
    } catch {
      return null;
    }

    return null;
  }

  private getRpcUrl(network: Network) {
    const map: Record<Network, string> = {
      [Network.ETHEREUM]: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      [Network.POLYGON]: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      [Network.BSC]: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      [Network.ARBITRUM]: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      [Network.OPTIMISM]: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      [Network.AVALANCHE]: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      [Network.FANTOM]: process.env.FANTOM_RPC_URL || 'https://rpc.ftm.tools',
      [Network.BASE]: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    };

    return map[network];
  }

  private toCryptoApisChain(chainId: string): EvmChainDescriptor {
    const network = networkFromChainId(chainId);
    const mapping: Record<Network, EvmChainDescriptor> = {
      [Network.ETHEREUM]: { blockchain: 'ethereum', network: 'mainnet' },
      [Network.POLYGON]: { blockchain: 'polygon', network: 'mainnet' },
      [Network.BSC]: { blockchain: 'binance-smart-chain', network: 'mainnet' },
      [Network.ARBITRUM]: { blockchain: 'arbitrum', network: 'mainnet' },
      [Network.OPTIMISM]: { blockchain: 'optimism', network: 'mainnet' },
      [Network.AVALANCHE]: { blockchain: 'avalanche', network: 'mainnet' },
      [Network.FANTOM]: { blockchain: 'fantom', network: 'mainnet' },
      [Network.BASE]: { blockchain: 'base', network: 'mainnet' },
    };

    return mapping[network];
  }

  private isSolanaChain(chainId: string) {
    const normalized = chainId.trim().toLowerCase();
    return normalized === 'sol' || normalized === 'solana' || normalized === '101' || normalized === 'mainnet-beta';
  }

  private toChecksumAddress(address: string) {
    try {
      return ethers.getAddress(address.trim());
    } catch {
      throw new BadRequestException('Invalid EVM address');
    }
  }

  private toIso(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value * 1000).toISOString();
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    return null;
  }

  private pickString(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return null;
  }

  private pickNumber(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }
}

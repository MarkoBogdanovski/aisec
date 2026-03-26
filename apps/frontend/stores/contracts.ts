import { defineStore } from 'pinia';
import { useApi } from '~/composables/useApi';
import type { ContractHistoryResponse, ContractLatestResponse } from '~/types/api';

export const useContractsStore = defineStore('contracts', {
  state: () => ({
    latest: null as ContractLatestResponse | null,
    history: null as ContractHistoryResponse | null,
    loading: false,
  }),
  actions: {
    async fetchLatest(chainId: string, address: string) {
      this.loading = true;
      try {
        const { getContractLatest } = useApi();
        this.latest = await getContractLatest(chainId, address);
      } catch (error) {
        console.error('Failed to fetch contract:', error);
      } finally {
        this.loading = false;
      }
    },
    async fetchHistory(chainId: string, address: string) {
      this.loading = true;
      try {
        const { getContractHistory } = useApi();
        this.history = await getContractHistory(chainId, address);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});

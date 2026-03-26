import { defineStore } from 'pinia';

export const useWalletsStore = defineStore('wallets', {
  state: () => ({
    lastResult: null as any,
  }),
});

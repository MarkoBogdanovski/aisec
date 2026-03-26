import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null as { email: string; role: string } | null,
  }),
  actions: {
    setToken(token: string | null) {
      this.token = token;
    },
  },
});

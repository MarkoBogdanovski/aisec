import { defineStore } from 'pinia';
import { useApi } from '~/composables/useApi';
import type { Incident } from '~/types/api';

export const useIncidentsStore = defineStore('incidents', {
  state: () => ({
    items: [] as Incident[],
    loading: false,
  }),
  actions: {
    async fetchIncidents(severity?: string, status?: string) {
      this.loading = true;
      try {
        const { getIncidents } = useApi();
        this.items = await getIncidents({ severity, status });
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});

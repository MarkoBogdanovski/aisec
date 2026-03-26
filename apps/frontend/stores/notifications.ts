import { defineStore } from 'pinia';

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    feed: [] as Array<{ id: string; message: string; createdAt: string }>,
  }),
  actions: {
    push(message: string) {
      this.feed.unshift({ id: crypto.randomUUID(), message, createdAt: new Date().toISOString() });
    },
  },
});

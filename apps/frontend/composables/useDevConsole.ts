import { computed, ref } from 'vue';
import type { DevConsoleEnvelope, DevLogEntry } from '~/types/api';

const connected = ref(false);
const logs = ref<DevLogEntry[]>([]);
let socket: WebSocket | null = null;

const getSocketUrl = () => {
  const config = useRuntimeConfig();
  const httpBase = config.public.apiBase.replace(/\/api\/v1\/?$/, '');
  return `${httpBase.replace(/^http/i, 'ws')}/ws/dev-console`;
};

const appendLogs = (entries: DevLogEntry[]) => {
  logs.value = [...logs.value, ...entries].slice(-300);
};

const connect = () => {
  const config = useRuntimeConfig();
  if (!process.client || !import.meta.dev || !config.public.enableDevConsole) {
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(getSocketUrl());

  socket.onopen = () => {
    connected.value = true;
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data) as DevConsoleEnvelope;
    if (message.event === 'connection.ready') {
      const recent = Array.isArray((message.data as { recent?: DevLogEntry[] }).recent)
        ? (message.data as { recent: DevLogEntry[] }).recent
        : [];
      logs.value = recent.slice(-300);
      return;
    }

    if (message.event === 'log.entry') {
      appendLogs([message.data as DevLogEntry]);
    }
  };

  socket.onclose = () => {
    connected.value = false;
    socket = null;
  };

  socket.onerror = () => {
    connected.value = false;
    socket?.close();
    socket = null;
  };
};

const disconnect = () => {
  socket?.close();
  socket = null;
  connected.value = false;
};

export const useDevConsole = () => ({
  connected,
  logs: computed(() => logs.value),
  connect,
  disconnect,
  clear: () => {
    logs.value = [];
  },
});

import { ref } from 'vue';
import type { JobRealtimeEnvelope } from '~/types/api';

type JobMessageHandler = (message: JobRealtimeEnvelope) => void;

const connected = ref(false);
const lastMessage = ref<JobRealtimeEnvelope | null>(null);
const handlers = new Map<string, Set<JobMessageHandler>>();
const subscriptionCounts = new Map<string, number>();

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = true;

const getSocketUrl = () => {
  const config = useRuntimeConfig();
  const httpBase = config.public.apiBase.replace(/\/api\/v1\/?$/, '');
  const wsBase = httpBase.replace(/^http/i, 'ws');
  return `${wsBase}/ws/jobs`;
};

const send = (payload: Record<string, unknown>) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(payload));
};

const flushSubscriptions = () => {
  for (const jobId of subscriptionCounts.keys()) {
    send({ action: 'subscribe', jobId });
  }
};

const connect = () => {
  if (!process.client) {
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  shouldReconnect = true;
  socket = new WebSocket(getSocketUrl());

  socket.onopen = () => {
    connected.value = true;
    flushSubscriptions();
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data) as JobRealtimeEnvelope;
    lastMessage.value = message;

    const jobId = typeof message.data.job_id === 'string' ? message.data.job_id : null;
    if (!jobId) {
      return;
    }

    const listeners = handlers.get(jobId);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(message);
    }
  };

  socket.onclose = () => {
    connected.value = false;
    socket = null;

    if (!shouldReconnect || subscriptionCounts.size === 0) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      connect();
    }, 1500);
  };

  socket.onerror = () => {
    connected.value = false;
  };
};

const disconnect = () => {
  shouldReconnect = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  connected.value = false;
};

const subscribeToJob = (jobId: string, handler: JobMessageHandler) => {
  if (!handlers.has(jobId)) {
    handlers.set(jobId, new Set());
  }
  handlers.get(jobId)!.add(handler);
  subscriptionCounts.set(jobId, (subscriptionCounts.get(jobId) ?? 0) + 1);

  connect();
  send({ action: 'subscribe', jobId });

  return () => {
    const listeners = handlers.get(jobId);
    listeners?.delete(handler);
    if (listeners && listeners.size === 0) {
      handlers.delete(jobId);
    }

    const nextCount = (subscriptionCounts.get(jobId) ?? 1) - 1;
    if (nextCount <= 0) {
      subscriptionCounts.delete(jobId);
      send({ action: 'unsubscribe', jobId });
    } else {
      subscriptionCounts.set(jobId, nextCount);
    }

    if (subscriptionCounts.size === 0) {
      disconnect();
    }
  };
};

export const useWebSocket = () => ({
  connected,
  lastMessage,
  connect,
  disconnect,
  subscribeToJob,
});

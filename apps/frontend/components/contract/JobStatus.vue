<template>
  <div class="job-status card">
    <h3>Analysis Status</h3>
    <p>Job ID: {{ jobId }}</p>
    <p>Status: {{ status }}</p>
    <p v-if="connected" class="socket-state">Live updates connected</p>
    <div v-if="status === 'active' || status === 'queued' || status === 'retrying'" class="progress">
      <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
    </div>
    <p v-if="failedReason" class="error">Error: {{ failedReason }}</p>
    <button v-if="status === 'completed' && result" @click="emit('completed', result)">View Results</button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useApi } from '~/composables/useApi';
import { useWebSocket } from '~/composables/useWebSocket';
import type { ContractLatestResponse, JobResultResponse } from '~/types/api';

const props = defineProps<{ jobId: string }>();
const emit = defineEmits<{ completed: [result: ContractLatestResponse] }>();

const { getJobResult } = useApi();
const { connected, subscribeToJob } = useWebSocket();
const status = ref<string>('waiting');
const progress = ref<number>(0);
const failedReason = ref<string>('');
const result = ref<ContractLatestResponse | null>(null);
let unsubscribe: (() => void) | null = null;

const applyUpdate = (update: JobResultResponse) => {
  status.value = update.status;
  progress.value = update.progress || 0;
  failedReason.value = update.failed_reason || '';

  if (update.analysis) {
    result.value = update.analysis;
  }
};

const refresh = async () => {
  const update = await getJobResult(props.jobId);
  applyUpdate(update);
};

onMounted(async () => {
  unsubscribe = subscribeToJob(props.jobId, (message) => {
    applyUpdate(message.data as unknown as JobResultResponse);
  });

  await refresh();
});

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
.progress { background: rgba(255, 255, 255, 0.08); border-radius: 999px; height: 8px; margin: 8px 0; }
.progress-bar { background: linear-gradient(90deg, #059669, #22c55e); height: 100%; border-radius: 999px; transition: width 0.3s; }
.error { color: #ef4444; }
.socket-state { color: #34d399; font-size: 13px; }
button { background: linear-gradient(90deg, #059669, #22c55e); color: white; padding: 8px 16px; border: none; border-radius: 10px; cursor: pointer; }
</style>

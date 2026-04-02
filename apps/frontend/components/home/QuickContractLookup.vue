<template>
  <div class="space-y-5 rounded-[22px] border border-white/20 bg-white/[0.035] p-5 text-left backdrop-blur-xl">
    <div class="space-y-3">
      <h3 class="flex items-center gap-2 text-lg font-semibold text-neutral-100">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/12 text-emerald-200">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
          </svg>
        </span>
        Contract Analysis
      </h3>
      <p class="text-sm text-neutral-400">Scan a contract and map the connected risk entities below.</p>
    </div>

    <form @submit.prevent="submit" class="space-y-4">
      <div>
        <SearchableDropdown
          v-model="form.chain_id"
          label="Network"
          :options="chainOptions"
          placeholder="Select a network"
          search-placeholder="Search networks..."
        />
      </div>

      <div>
        <label for="address" class="mb-2 block text-xs uppercase tracking-wide text-neutral-400">Contract Address</label>
        <input
          id="address"
          v-model="form.contract_address"
          type="text"
          placeholder="0x..."
          required
          class="w-full rounded-[18px] border border-white/20 bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition focus:border-emerald-400/55 focus:bg-white/[0.05] focus:ring-1 focus:ring-emerald-400/30"
        />
      </div>

      <div>
        <SearchableDropdown
          v-model="form.priority"
          label="Priority"
          :options="priorityOptions"
          placeholder="Select priority"
          :searchable="false"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-[18px] border border-emerald-300/35 bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ loading ? 'Analyzing...' : 'Analyze Contract' }}
      </button>
    </form>

    <div v-if="jobId" class="rounded-xl border border-emerald-400/30 bg-white/[0.03] p-3 backdrop-blur-xl">
      <p class="mb-1 text-xs text-neutral-300">Job ID: {{ jobId }}</p>
      <p class="text-xs text-emerald-300">Status: {{ jobStatus }}</p>
      <p v-if="socketConnected" class="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Live updates connected</p>
    </div>

    <div v-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import SearchableDropdown from '~/components/shared/SearchableDropdown.vue';
import { useApi } from '~/composables/useApi';
import { useWebSocket } from '~/composables/useWebSocket';
import type { AnalyzeContractRequest, ContractLatestResponse, JobResultResponse } from '~/types/api';
import type { InvestigationResult } from '~/types/investigation';

const emit = defineEmits<{
  completed: [result: InvestigationResult];
}>();

const { analyzeContract, getJobResult, getInvestigation } = useApi();
const { connected: socketConnected, subscribeToJob } = useWebSocket();
const loading = ref(false);
const jobId = ref<string | null>(null);
const jobStatus = ref<string>('idle');
const error = ref<string>('');

let unsubscribe: (() => void) | null = null;

const form = ref<AnalyzeContractRequest>({
  chain_id: '1',
  contract_address: '',
  priority: 'normal',
});

const chainOptions = [
  { value: '1', label: 'Ethereum Mainnet', description: 'Chain ID 1' },
  { value: '137', label: 'Polygon', description: 'Chain ID 137' },
  { value: '56', label: 'BNB Smart Chain', description: 'Chain ID 56' },
  { value: '42161', label: 'Arbitrum', description: 'Chain ID 42161' },
  { value: '10', label: 'Optimism', description: 'Chain ID 10' },
  { value: '43114', label: 'Avalanche', description: 'Chain ID 43114' },
  { value: '8453', label: 'Base', description: 'Chain ID 8453' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', description: 'Standard processing' },
  { value: 'normal', label: 'Normal', description: 'Balanced speed and cost' },
  { value: 'high', label: 'High', description: 'Fastest processing' },
];

const finishWithAnalysis = async (analysis: ContractLatestResponse) => {
  loading.value = false;
  jobStatus.value = 'completed';
  const investigation = await getInvestigation('contract', analysis.chain_id, analysis.contract_address);
  emit('completed', investigation);
};

const applyJobUpdate = (update: JobResultResponse) => {
  jobStatus.value = update.status;

  if (update.analysis) {
    void finishWithAnalysis(update.analysis);
    return;
  }

  if (update.status === 'failed') {
    loading.value = false;
    error.value = update.failed_reason || 'Analysis failed';
  }
};

const pollForResult = async (currentJobId: string) => {
  for (let i = 0; i < 30; i++) {
    const update = await getJobResult(currentJobId);
    applyJobUpdate(update);

    if (update.analysis || update.status === 'failed') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  loading.value = false;
  error.value = 'Timeout waiting for job completion';
};

const submit = async () => {
  error.value = '';
  loading.value = true;
  jobId.value = null;
  jobStatus.value = 'queued';
  unsubscribe?.();

  try {
    const response = await analyzeContract(form.value);
    jobId.value = response.job_id;

    unsubscribe = subscribeToJob(response.job_id, (message) => {
      applyJobUpdate(message.data as unknown as JobResultResponse);
    });

    await pollForResult(response.job_id);
  } catch (err) {
    loading.value = false;
    error.value = err instanceof Error ? err.message : 'Analysis failed';
  }
};

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>

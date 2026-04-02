<template>
  <div class="space-y-5 rounded-[22px] border border-white/20 bg-white/[0.035] p-5 text-left backdrop-blur-xl">
    <div class="space-y-3">
      <h3 class="flex items-center gap-2 text-lg font-semibold text-neutral-100">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/12 text-emerald-200">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z" />
          </svg>
        </span>
        Wallet Intelligence
      </h3>
      <p class="text-sm text-neutral-400">Trace wallet exposure and connected counterparties from the landing workspace.</p>
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
        <label for="walletAddress" class="mb-2 block text-xs uppercase tracking-wide text-neutral-400">Wallet Address</label>
        <input
          id="walletAddress"
          v-model="form.wallet_address"
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
        {{ loading ? 'Analyzing...' : 'Analyze Wallet' }}
      </button>
    </form>

    <div v-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SearchableDropdown from '~/components/shared/SearchableDropdown.vue';
import { useApi } from '~/composables/useApi';
import type { InvestigationResult } from '~/types/investigation';

const emit = defineEmits<{
  completed: [result: InvestigationResult];
}>();

interface AnalyzeWalletRequest {
  chain_id: string;
  wallet_address: string;
  priority?: string;
}

const { analyzeWallet, getInvestigation } = useApi();
const loading = ref(false);
const error = ref('');

const form = ref<AnalyzeWalletRequest>({
  chain_id: '1',
  wallet_address: '',
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

const submit = async () => {
  error.value = '';
  loading.value = true;
  try {
    const analysis = await analyzeWallet(form.value);
    const investigation = await getInvestigation('wallet', analysis.chain_id, analysis.wallet_address);
    emit('completed', investigation);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Analysis failed';
  } finally {
    loading.value = false;
  }
};
</script>

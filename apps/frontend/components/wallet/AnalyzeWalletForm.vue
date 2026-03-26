<template>
  <div class="analyze-form card">
    <h3>Wallet Analysis</h3>
    <p class="form-description">
      Submit wallet intelligence requests against the backend Phase 2 stub endpoint.
    </p>
    <form @submit.prevent="submit">
      <div class="form-group">
        <label for="address">Wallet Address</label>
        <input
          id="address"
          v-model="form.wallet_address"
          type="text"
          placeholder="0x..."
          required
          class="address-input"
        />
        <div v-if="isValidAddress" class="address-preview">
          <div class="preview-avatar">{{ form.wallet_address.slice(0, 6) }}</div>
          <div class="preview-balance">Valid wallet address</div>
        </div>
      </div>

      <div class="form-group">
        <label for="network">Network</label>
        <SearchableDropdown
          v-model="form.chain_id"
          :options="networkOptions"
          placeholder="Select a network"
          search-placeholder="Search networks..."
        />
      </div>

      <div class="form-group">
        <label for="priority">Priority</label>
        <div class="priority-options">
          <label
            v-for="priority in priorities"
            :key="priority.value"
            class="priority-label"
            :class="{ active: form.priority === priority.value }"
          >
            <input
              v-model="form.priority"
              type="radio"
              :value="priority.value"
              name="priority"
            />
            <span>{{ priority.label }}</span>
            <span class="priority-desc">{{ priority.description }}</span>
          </label>
        </div>
      </div>

      <div v-if="responseMessage" class="stub-response">
        <p class="stub-status">{{ responseStatus }}</p>
        <p>{{ responseMessage }}</p>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="loading || !isValidAddress" class="submit-button">
          <svg v-if="loading" class="animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9ZM7 10h10M7 14h6" />
          </svg>
          {{ loading ? 'Submitting...' : 'Analyze Wallet' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useApi } from '~/composables/useApi';
import type { AnalyzeWalletRequest } from '~/types/api';
import SearchableDropdown from '~/components/shared/SearchableDropdown.vue';

const { analyzeWallet } = useApi();
const loading = ref(false);
const responseStatus = ref('');
const responseMessage = ref('');

const priorities = [
  { value: 'low', label: 'Low', description: 'Standard processing' },
  { value: 'normal', label: 'Normal', description: 'Balanced speed and cost' },
  { value: 'high', label: 'High', description: 'Fastest processing' },
] as const;

const networkOptions = [
  { value: '1', label: 'Ethereum', description: 'Chain ID 1' },
  { value: '137', label: 'Polygon', description: 'Chain ID 137' },
  { value: '56', label: 'BSC', description: 'Chain ID 56' },
  { value: '42161', label: 'Arbitrum', description: 'Chain ID 42161' },
  { value: '10', label: 'Optimism', description: 'Chain ID 10' },
];

const form = ref<AnalyzeWalletRequest>({
  wallet_address: '',
  chain_id: '1',
  priority: 'normal',
});

const isValidAddress = computed(() => /^0x[a-fA-F0-9]{40}$/.test(form.value.wallet_address));

const submit = async () => {
  if (!isValidAddress.value) return;

  loading.value = true;
  responseStatus.value = '';
  responseMessage.value = '';

  try {
    const response = await analyzeWallet(form.value);
    responseStatus.value = response.status;
    responseMessage.value = response.message;
  } catch (error) {
    responseStatus.value = 'error';
    responseMessage.value = error instanceof Error ? error.message : 'Wallet analysis failed';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
}

.card h3 {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
  text-align: center;
}

.form-description {
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-bottom: 24px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
}

.address-input {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-family: monospace;
  transition: all 0.3s ease;
}

.address-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.address-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.preview-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.preview-balance {
  flex: 1;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.priority-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.priority-label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.priority-label:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.priority-label.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.priority-label input[type="radio"] {
  accent-color: #667eea;
}

.priority-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: auto;
}

.stub-response {
  margin-top: 20px;
  border-radius: 12px;
  border: 1px solid rgba(167, 139, 250, 0.2);
  background: rgba(139, 92, 246, 0.12);
  padding: 14px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
}

.stub-status {
  margin-bottom: 6px;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
}

.form-actions {
  margin-top: 32px;
}

.submit-button {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>

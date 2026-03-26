<template>
  <div class="analyze-form">
    <h3>Contract Analysis</h3>
    <p class="form-description">
      Analyze smart contracts for security vulnerabilities and compliance issues
    </p>
    <form @submit.prevent="submit">
      <div class="form-group">
        <label for="chainId">Network</label>
        <SearchableDropdown
          v-model="form.chain_id"
          :options="chainOptions"
          placeholder="Select a network"
          search-placeholder="Search networks..."
        />
      </div>
      
      <div class="form-group">
        <label for="address">Contract Address</label>
        <input 
          id="address" 
          v-model="form.contract_address" 
          type="text" 
          placeholder="0x..." 
          required 
          class="address-input"
        />
        <div class="address-preview" v-if="isValidAddress">
          <div class="preview-icon">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2v-4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="preview-info">
            <div class="preview-address">{{ form.contract_address.slice(0, 8) }}...{{ form.contract_address.slice(-6) }}</div>
            <div class="preview-status">Valid address</div>
          </div>
        </div>
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
              type="radio" 
              :value="priority.value" 
              v-model="form.priority" 
              name="priority"
            />
            <span>{{ priority.label }}</span>
            <span class="priority-desc">{{ priority.description }}</span>
          </label>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" :disabled="loading || !isValidAddress" class="submit-button">
          <svg v-if="loading" class="animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
          </svg>
          {{ loading ? 'Analyzing...' : 'Analyze Contract' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useApi } from '~/composables/useApi';
import type { AnalyzeContractRequest, AnalyzeContractResponse } from '~/types/api';
import SearchableDropdown from '~/components/shared/SearchableDropdown.vue';

const emit = defineEmits<{ analyzed: [jobId: string] }>();

const { analyzeContract } = useApi();
const loading = ref(false);

const priorities = [
  { value: 'low', label: 'Low', description: 'Standard processing' },
  { value: 'normal', label: 'Normal', description: 'Balanced speed and cost' },
  { value: 'high', label: 'High', description: 'Fastest processing' },
];

const chainOptions = [
  { value: '1', label: 'Ethereum Mainnet', description: 'Chain ID 1' },
  { value: '137', label: 'Polygon', description: 'Chain ID 137' },
  { value: '56', label: 'BSC', description: 'Chain ID 56' },
  { value: '42161', label: 'Arbitrum', description: 'Chain ID 42161' },
  { value: '10', label: 'Optimism', description: 'Chain ID 10' },
  { value: '43114', label: 'Avalanche', description: 'Chain ID 43114' },
  { value: '250', label: 'Fantom', description: 'Chain ID 250' },
  { value: '8453', label: 'Base', description: 'Chain ID 8453' },
];

const form = ref<AnalyzeContractRequest>({
  chain_id: '1',
  contract_address: '',
  priority: 'normal',
});

const isValidAddress = computed(() => {
  return /^0x[a-fA-F0-9]{40}$/.test(form.value.contract_address);
});

const submit = async () => {
  if (!isValidAddress.value) return;
  
  loading.value = true;
  try {
    const response = await analyzeContract(form.value);
    emit('analyzed', response.job_id);
  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.analyze-form {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 32px;
}

.analyze-form h3 {
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

.network-select {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
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

.preview-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.preview-info {
  flex: 1;
}

.preview-address {
  font-family: monospace;
  color: white;
  font-size: 14px;
  margin-bottom: 4px;
}

.preview-status {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
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

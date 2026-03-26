<template>
  <div class="contract-detail">
    <RiskScoreCard :score="contract.score" :severity="contract.severity" :analyzed-at="contract.analyzed_at" />
    <FindingsList :findings="contract.findings" />
    <div v-if="contract.ai_explanation" class="ai-explanation card">
      <h3>AI Explanation</h3>
      <p>{{ contract.ai_explanation }}</p>
    </div>
    <ContractHistory :chain-id="contract.chain_id" :address="contract.contract_address" />
  </div>
</template>

<script setup lang="ts">
import RiskScoreCard from './RiskScoreCard.vue';
import FindingsList from './FindingsList.vue';
import ContractHistory from './ContractHistory.vue';
import type { ContractLatestResponse } from '~/types/api';

defineProps<{ contract: ContractLatestResponse }>();
</script>

<style scoped>
.contract-detail { display: flex; flex-direction: column; gap: 16px; }
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
</style>

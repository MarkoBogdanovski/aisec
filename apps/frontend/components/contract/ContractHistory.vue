<template>
  <div class="contract-history card">
    <h3>Analysis History</h3>
    <div v-if="store.loading">Loading...</div>
    <div v-else-if="store.history?.history.length">
      <div v-for="(item, index) in store.history.history" :key="index" class="history-item">
        <p>Score: {{ item.score }} ({{ item.severity }})</p>
        <p>Analyzed: {{ item.analyzed_at }}</p>
        <FindingsList :findings="item.findings" />
      </div>
    </div>
    <p v-else>No history available.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useContractsStore } from '~/stores/contracts';
import FindingsList from './FindingsList.vue';

const props = defineProps<{ chainId: string; address: string }>();

const store = useContractsStore();

onMounted(() => {
  store.fetchHistory(props.chainId, props.address);
});
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
.history-item { margin-bottom: 16px; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; }
</style>

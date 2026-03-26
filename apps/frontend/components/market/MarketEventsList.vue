<template>
  <div class="market-events card">
    <h3>Recent Market Events</h3>
    <div v-if="loading">Loading...</div>
    <div v-else-if="events.length">
      <div v-for="event in events" :key="event.id" class="event-item">
        <p>Token: {{ event.tokenAddress }}</p>
        <p>Type: {{ event.eventType }}</p>
        <p>Severity: <ScoreBadge :severity="event.severity" /></p>
        <p>Detected: {{ event.detectedAt }}</p>
      </div>
    </div>
    <p v-else>No events found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';
import ScoreBadge from '~/components/shared/ScoreBadge.vue';
import type { MarketEvent } from '~/types/api';

const { request } = useApi();
const events = ref<MarketEvent[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    events.value = await request<MarketEvent[]>('market/events');
  } catch (error) {
    console.error('Failed to load events:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
.event-item { margin-bottom: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; }
</style>

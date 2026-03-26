<template>
  <div class="incident-detail">
    <h1>Incident Details</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="incident">
      <h2>{{ incident.title }}</h2>
      <p>Severity: <ScoreBadge :severity="incident.severity" /></p>
      <p>Status: {{ incident.status }}</p>
      <p>Created: {{ incident.createdAt }}</p>
      <!-- Add more details if available -->
    </div>
    <p v-else>Incident not found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useApi } from '~/composables/useApi';
import ScoreBadge from '~/components/shared/ScoreBadge.vue';
import type { Incident } from '~/types/api';

const route = useRoute();
const { request } = useApi();
const incident = ref<Incident | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    incident.value = await request<Incident>(`incidents/${route.params.id}`);
  } catch (error) {
    console.error('Failed to load incident:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.incident-detail { padding: 20px; }
</style>
<template>
  <div class="incident-list card">
    <h3>Incidents</h3>
    <div v-if="store.loading">Loading...</div>
    <div v-else-if="store.items.length">
      <div v-for="incident in store.items" :key="incident.id" class="incident-item">
        <h4>{{ incident.title }}</h4>
        <p>Severity: <ScoreBadge :severity="incident.severity" /></p>
        <p>Status: {{ incident.status }}</p>
        <p>Created: {{ incident.createdAt }}</p>
        <NuxtLink :to="`/incidents/${incident.id}`">View Details</NuxtLink>
      </div>
    </div>
    <p v-else>No incidents found.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useIncidentsStore } from '~/stores/incidents';
import ScoreBadge from '~/components/shared/ScoreBadge.vue';

const store = useIncidentsStore();

onMounted(() => {
  store.fetchIncidents();
});
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
.incident-item { margin-bottom: 16px; padding: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; }
a { color: #86efac; }
</style>

<template>
  <div class="incidents-page rounded-[28px] border border-white/20 bg-white/[0.04] p-6 backdrop-blur-xl">
    <h1 class="mb-5 text-3xl font-semibold text-[#b7f7d5]">Security Incidents</h1>
    <IncidentList />
  </div>
</template>

<script setup lang="ts">
import IncidentList from '~/components/incident/IncidentList.vue';
</script>

<style scoped>
.incidents-page { padding: 24px; }
</style>

<template>
  <div class="card">
    <h3>Risk Score</h3>
    <p class="score" :style="{ color: useRiskColor(score) }">{{ score }}</p>
    <ScoreBadge :score="score" :severity="severity" />
    <p class="meta">Analyzed at: {{ analyzedAt }}</p>
  </div>
</template>

<script setup lang="ts">
import ScoreBadge from '../shared/ScoreBadge.vue';
import { useRiskColor } from '~/composables/useRiskColor';

defineProps<{ score: number; severity: string; analyzedAt: string }>();
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
.score { font-size: 40px; font-weight: 800; margin: 8px 0; }
.meta { color: #a7f3d0; font-size: 13px; }
</style>

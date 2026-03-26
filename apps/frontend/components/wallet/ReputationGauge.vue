<template>
  <div class="card">
    <h3>Wallet Reputation</h3>
    <p class="score" :style="{ color: useRiskColor(score) }">{{ score }}</p>
  </div>
</template>

<script setup lang="ts">
import { useRiskColor } from '~/composables/useRiskColor';
defineProps<{ score: number }>();
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
.score { font-size: 34px; font-weight: 800; }
</style>

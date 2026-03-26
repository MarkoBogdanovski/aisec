<template>
  <span class="badge" :style="{ background: color }">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRiskColor } from '~/composables/useRiskColor';

const props = defineProps<{ score?: number; severity?: string }>();
const score = computed(() => props.score ?? 0);
const color = computed(() => useRiskColor(score.value));
const label = computed(() => (props.severity ? props.severity.toUpperCase() : `Score ${score.value}`));
</script>

<style scoped>
.badge { padding: 4px 8px; border-radius: 999px; color: #111; font-weight: 700; font-size: 12px; }
</style>

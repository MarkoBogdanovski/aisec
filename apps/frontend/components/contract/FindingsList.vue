<template>
  <div class="card">
    <h3>Findings</h3>
    <ul v-if="findings?.length">
      <li v-for="(f, i) in findings" :key="i">
        <strong>{{ f.category || f.severity || 'finding' }}:</strong>
        {{ f.description || JSON.stringify(f) }}
      </li>
    </ul>
    <p v-else>No findings.</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ findings: Array<Record<string, any>> }>();
</script>

<style scoped>
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 20px; backdrop-filter: blur(20px); }
ul { padding-left: 18px; }
li { margin: 8px 0; color: #d1fae5; }
</style>

<template>
  <div class="market-page rounded-[28px] border border-white/20 bg-white/[0.04] p-6 backdrop-blur-xl">
    <h1 class="mb-5 text-3xl font-semibold text-[#b7f7d5]">Market Anomalies</h1>
    <MarketEventsList />
  </div>
</template>

<script setup lang="ts">
import MarketEventsList from '~/components/market/MarketEventsList.vue';
</script>

<style scoped>
.market-page { padding: 24px; }
</style>

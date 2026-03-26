<template>
  <NuxtLink
    :to="feature.link"
    class="group relative overflow-hidden rounded-[22px] border border-white/20 bg-white/[0.035] p-6 transition duration-300 h-full flex flex-col gap-4 hover:border-emerald-400/45 hover:bg-white/[0.05] hover:backdrop-blur-xl"
  >
    <!-- Shine effect on hover -->
    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]"></div>

    <!-- Icon -->
    <div class="text-4xl">{{ feature.icon }}</div>

    <!-- Content -->
    <div class="flex-1">
      <h3 class="text-base font-semibold text-neutral-100 mb-2">{{ feature.title }}</h3>
      <p class="text-sm text-neutral-400 leading-relaxed">{{ feature.description }}</p>
    </div>

    <!-- Arrow -->
    <div class="flex items-center text-emerald-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
      <span class="text-sm font-medium">Explore</span>
      <span class="ml-2">→</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
}

defineProps<{
  feature: Feature;
}>();
</script>

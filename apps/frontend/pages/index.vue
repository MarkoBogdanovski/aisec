<template>
  <section class="relative flex min-h-[calc(100vh-120px)] items-center justify-center overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
    <div class="absolute inset-x-[12%] top-24 h-64 rounded-full bg-emerald-500/20 blur-[140px]"></div>

    <div class="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
      <p class="animate-rise text-sm font-semibold tracking-[0.12em] text-neutral-300 md:text-base">
        OSINT Platform Search
      </p>

      <h1 class="animate-rise-delay mt-8 max-w-5xl bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-500 bg-clip-text text-5xl font-black leading-[0.92] tracking-[-0.05em] text-transparent sm:text-6xl md:text-7xl lg:text-[6.25rem]">
        Reveal what&apos;s behind any data instantly
      </h1>

      <p class="animate-rise-delay-2 mt-8 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
        Search contracts, wallets, incidents, market entities, and threat signals through a single investigation surface built for speed.
      </p>

      <!--<div class="animate-rise-delay-2 mt-12 flex flex-wrap items-center justify-center gap-0 rounded-2xl border border-white/20 bg-white/5 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <button
          v-for="mode in searchModes"
          :key="mode.label"
          class="flex h-12 w-12 items-center justify-center rounded-xl border border-transparent text-neutral-300 transition hover:border-emerald-400/45 hover:bg-white/5 hover:text-white"
          :title="mode.label"
        >
          <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="mode.path" />
          </svg>
        </button>
      </div>-->

      <div class="animate-rise-delay-3 mt-8 w-full max-w-xl">
        <div class="rounded-[28px] border border-white/20 bg-white/[0.045] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-4">
          <div class="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/[0.035] px-4 py-3 backdrop-blur-xl">
            <div class="text-left">
              <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90">Active Search</p>
              <p class="mt-1 text-sm text-neutral-300">
                {{ analysisMode === 'contract' ? 'Smart contract lookup' : 'Wallet intelligence lookup' }}
              </p>
            </div>
            <span class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              {{ analysisMode === 'contract' ? 'Contract' : 'Wallet' }}
            </span>
          </div>

          <QuickContractLookup v-if="analysisMode === 'contract'" @completed="investigation = $event" />
          <QuickWalletLookup v-else @completed="investigation = $event" />
        </div>
      </div>

      <InvestigationWorkspace :result="investigation" />

      <div class="animate-rise-delay-3 mt-14 flex w-full max-w-lg flex-col gap-3">
        <NuxtLink
          v-for="item in highlightLinks"
          :key="item.title"
          :to="item.to"
          class="group flex items-center justify-between rounded-[22px] border border-white/20 bg-white/[0.04] px-4 py-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-emerald-400/45 hover:bg-white/[0.05] hover:backdrop-blur-xl"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5" :class="item.iconTone">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="item.iconPath" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-neutral-100">{{ item.title }}</p>
              <p class="text-xs text-neutral-400">{{ item.subtitle }}</p>
            </div>
          </div>
          <svg class="h-4 w-4 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12h14m-5-5 5 5-5 5" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import QuickContractLookup from '~/components/home/QuickContractLookup.vue';
import QuickWalletLookup from '~/components/home/QuickWalletLookup.vue';
import InvestigationWorkspace from '~/components/shared/InvestigationWorkspace.vue';
import type { InvestigationResult } from '~/types/investigation';

const analysisMode = useState<'contract' | 'wallet'>('analysis-mode', () => 'contract');
const investigation = ref<InvestigationResult | null>(null);

const searchModes = [
  {
    label: 'Phone',
    path: 'M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .95.68l1.49 4.49a1 1 0 0 1-.5 1.21l-2.26 1.13a11.04 11.04 0 0 0 5.52 5.52l1.13-2.26a1 1 0 0 1 1.21-.5l4.49 1.49a1 1 0 0 1 .69.95V19a2 2 0 0 1-2 2h-1C9.72 21 3 14.28 3 6V5Z',
  },
  {
    label: 'Email',
    path: 'M3 7.5 10.94 13a2 2 0 0 0 2.12 0L21 7.5M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z',
  },
  {
    label: 'Identity',
    path: 'M15 19a5 5 0 0 0-10 0m12-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm6 10a6.97 6.97 0 0 0-4-6.33M17 3.13a4 4 0 0 1 0 7.75',
  },
  {
    label: 'Organization',
    path: 'M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M9 14h.01M9 18h.01M15 10h.01M15 14h.01M15 18h.01',
  },
  {
    label: 'Crypto',
    path: 'M12 3v18M8 7.5h6a3 3 0 1 1 0 6H10a3 3 0 1 0 0 6h6',
  },
];

const highlightLinks = [
  {
    title: 'Spring Cleaning Update is live!',
    subtitle: "See what's new",
    to: '/market',
    iconTone: 'text-amber-300',
    iconPath: 'M12 3v3m0 12v3m6.36-15.36-2.12 2.12M7.76 16.24l-2.12 2.12M21 12h-3M6 12H3m15.36 6.36-2.12-2.12M7.76 7.76 5.64 5.64M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  },
  {
    title: 'Enhance your investigations with Palette',
    subtitle: 'Pivot across contracts, wallets, and incidents',
    to: '/',
    iconTone: 'text-emerald-300',
    iconPath: 'M12 21a9 9 0 1 1 9-9 2 2 0 0 1-2 2h-1a2 2 0 1 0 0 4h.5A2.5 2.5 0 0 1 21 20.5 8.5 8.5 0 0 1 12 21Zm-4.5-9a1 1 0 1 0 0-.01V12Zm4-4a1 1 0 1 0 0-.01V8Zm4 4a1 1 0 1 0 0-.01V12Zm-4 4a1 1 0 1 0 0-.01V16Z',
  },
];
</script>

<style scoped>
.animate-rise {
  animation: rise-in 0.7s ease-out both;
}

.animate-rise-delay {
  animation: rise-in 0.8s ease-out 0.08s both;
}

.animate-rise-delay-2 {
  animation: rise-in 0.8s ease-out 0.16s both;
}

.animate-rise-delay-3 {
  animation: rise-in 0.85s ease-out 0.24s both;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

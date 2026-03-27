<template>
  <div class="min-h-screen bg-[#0a0a10] text-neutral-100">
    <div class="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(65,184,131,0.18),_transparent_34%),linear-gradient(rgba(34,197,94,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.14)_1px,transparent_1px)] bg-[size:auto,106px_106px,106px_106px] bg-[position:center,center,center] opacity-75"></div>
    <div class="relative mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <nav class="sticky top-4 z-50 mx-auto w-full max-w-[1440px] rounded-[22px] border border-white/20 bg-[#06070c]/92 px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div class="flex items-center justify-between gap-4">
          <NuxtLink to="/" class="flex items-center gap-3 text-white">
            <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 shadow-[0_0_32px_rgba(34,197,94,0.18)]">
              <div class="h-5 w-5 rounded-full border-[3px] border-white border-r-transparent"></div>
            </div>
            <span class="text-2xl font-black tracking-[0.28em]">AISEC</span>
          </NuxtLink>

          <div class="hidden items-center gap-7 text-sm font-medium text-neutral-300 lg:flex">
            <NuxtLink to="/" class="nav-link">Workspace</NuxtLink>
            <NuxtLink to="/incidents" class="nav-link">Insights</NuxtLink>
            <NuxtLink to="/market" class="nav-link">Contact</NuxtLink>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <button
              @click="toggleAnalysisMode"
              class="hidden items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-emerald-400/55 hover:bg-white/8 md:flex"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 12H8m0 0 3.5-3.5M8 12l3.5 3.5M5 5h14v14H5z" />
              </svg>
              <span>{{ analysisMode === 'contract' ? 'Wallet View' : 'Contract View' }}</span>
            </button>

            <NuxtLink
              to="/"
              class="rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,197,94,0.35)] transition hover:brightness-110"
            >
              Open Workspace
            </NuxtLink>

            <button class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-600 text-white shadow-[0_0_28px_rgba(34,197,94,0.28)] transition hover:brightness-110">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v2.25M17.657 6.343l-1.59 1.59M21 12h-2.25M17.657 17.657l-1.59-1.59M12 18.75V21M7.933 16.067l-1.59 1.59M5.25 12H3M7.933 7.933l-1.59-1.59M12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25Z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main class="relative flex-1">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const analysisMode = useState<'contract' | 'wallet'>('analysis-mode', () => 'contract');

const toggleAnalysisMode = () => {
  analysisMode.value = analysisMode.value === 'contract' ? 'wallet' : 'contract';
};
</script>

<style>
html {
  background-color: #0a0a10;
  scrollbar-width: thin;
  scrollbar-color: rgba(16, 185, 129, 0.72) rgba(255, 255, 255, 0.06);
}

body {
  background: #0a0a10;
  font-family: Inter, "Segoe UI", sans-serif;
}

*::-webkit-scrollbar {
  width: 11px;
  height: 11px;
}

*::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.88), rgba(34, 197, 94, 0.72));
  border-radius: 999px;
  border: 2px solid rgba(10, 10, 16, 0.72);
}

*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.94), rgba(74, 222, 128, 0.82));
}

.nav-link {
  position: relative;
  color: #d4d4d8;
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link::after {
  position: absolute;
  bottom: -0.45rem;
  left: 0;
  width: 100%;
  height: 1px;
  transform: scaleX(0);
  transform-origin: left;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.1), rgba(110, 231, 183, 0.95), rgba(16, 185, 129, 0.1));
  content: "";
  transition: transform 0.2s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #ffffff;
}

.nav-link:hover::after,
.nav-link.router-link-active::after {
  transform: scaleX(1);
}
</style>

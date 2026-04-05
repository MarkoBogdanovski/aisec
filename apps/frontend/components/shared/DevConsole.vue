<template>
  <ClientOnly>
    <aside
      v-if="enabled"
      class="fixed bottom-4 right-4 z-[70] flex h-[420px] w-[min(540px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[24px] border border-emerald-400/30 bg-[#05070d]/94 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Dev Console</p>
          <p class="mt-1 text-xs text-neutral-400">Backend logger stream</p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
            :class="connected ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'"
          >
            {{ connected ? 'Live' : 'Offline' }}
          </span>
          <button
            class="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/40 hover:text-white"
            @click="clear"
          >
            Clear
          </button>
          <button
            class="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/40 hover:text-white"
            @click="enabled = false"
          >
            Hide
          </button>
        </div>
      </div>

      <div class="grid grid-cols-[88px_76px_1fr] gap-3 border-b border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        <span>Time</span>
        <span>Level</span>
        <span>Message</span>
      </div>

      <div ref="container" class="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs">
        <div v-if="logs.length === 0" class="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-neutral-500">
          Waiting for backend logs.
        </div>

        <div v-for="entry in logs" :key="entry.id" class="grid grid-cols-[88px_76px_1fr] gap-3 border-b border-white/5 py-2 align-top">
          <span class="text-neutral-500">{{ formatTime(entry.timestamp) }}</span>
          <span :class="levelClass(entry.level)" class="font-semibold uppercase">{{ entry.level }}</span>
          <div class="min-w-0">
            <p class="break-words text-neutral-100">{{ entry.message }}</p>
            <p v-if="entry.context || entry.type" class="mt-1 text-[11px] text-neutral-500">
              {{ [entry.context, entry.type].filter(Boolean).join(' • ') }}
            </p>
            <pre v-if="entry.meta && Object.keys(entry.meta).length" class="mt-2 overflow-x-auto rounded-xl bg-white/[0.03] p-2 text-[11px] text-neutral-400">{{ JSON.stringify(entry.meta, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </aside>

    <button
      v-else
      class="fixed bottom-4 right-4 z-[70] rounded-full border border-emerald-300/35 bg-[#07100d]/92 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:brightness-110"
      @click="enabled = true"
    >
      Open Dev Console
    </button>
  </ClientOnly>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDevConsole } from '~/composables/useDevConsole';

const { connected, logs, connect, disconnect, clear } = useDevConsole();
const enabled = ref(true);
const container = ref<HTMLElement | null>(null);

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

const levelClass = (level: string) => {
  if (level === 'error') return 'text-red-300';
  if (level === 'warn') return 'text-amber-300';
  if (level === 'debug') return 'text-sky-300';
  return 'text-emerald-300';
};

const scrollToBottom = async () => {
  await nextTick();
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight;
  }
};

onMounted(() => {
  connect();
});

watch(logs, () => {
  void scrollToBottom();
}, { deep: true });

onBeforeUnmount(() => {
  disconnect();
});
</script>

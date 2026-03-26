<template>
  <section v-if="result" class="mt-12 w-full max-w-6xl">
    <div class="glass-panel relative overflow-hidden p-6 md:p-7">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]"></div>

      <div class="relative mb-6 flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-2xl">
          <p class="eyebrow-label">Investigation Workspace</p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight text-neutral-100 md:text-[2rem]">{{ result.subject }}</h2>
          <p class="mt-3 text-sm leading-6 text-neutral-300/90">{{ result.summary }}</p>
        </div>
        <div class="grid min-w-[240px] gap-3 sm:grid-cols-2">
          <div class="glass-stat">
            <p class="panel-kicker">Severity</p>
            <p class="mt-2 text-sm font-medium tracking-wide text-neutral-100">{{ result.severity }}</p>
          </div>
          <div class="glass-stat">
            <p class="panel-kicker">Risk Score</p>
            <p class="mt-2 text-sm font-medium tracking-wide text-neutral-100">{{ result.score }}/100</p>
          </div>
        </div>
      </div>

      <div class="relative">
        <EntityRelationsGraph
          :entities="result.entities"
          :relations="result.relations"
        />
      </div>

      <div class="glass-panel-soft relative mt-5 p-5 md:p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <p class="panel-kicker">Fraud Signals</p>
            <h3 class="mt-2 text-lg font-semibold tracking-tight text-neutral-100">Key indicators</h3>
          </div>
          <span class="rounded-full border border-white/20 bg-[#06070c]/92 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-xl">
            {{ result.findings.length }} indicators
          </span>
        </div>
        <ul class="grid gap-3 md:grid-cols-2">
          <li
            v-for="(finding, index) in result.findings"
            :key="index"
            class="glass-stat min-h-[132px] text-sm text-neutral-300/90 transition-colors hover:border-white/20"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Signal {{ index + 1 }}
            </p>
            <p class="mt-3 font-medium text-neutral-100">{{ finding.category || finding.severity || 'Signal' }}</p>
            <p class="mt-2 leading-6">{{ finding.description || JSON.stringify(finding) }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { InvestigationResult } from '~/types/investigation';
import EntityRelationsGraph from './EntityRelationsGraph.vue';

const props = defineProps<{
  result: InvestigationResult | null;
}>();
</script>

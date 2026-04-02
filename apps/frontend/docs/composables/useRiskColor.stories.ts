import type { Meta, StoryObj } from '@nuxtjs/storybook';
import { defineComponent } from 'vue';

const UseRiskColorDoc = defineComponent({
  template: `
    <section class="mx-auto max-w-4xl space-y-6 rounded-[28px] border border-white/15 bg-[#06070c] p-8 text-neutral-100">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Composable</p>
        <h1 class="text-3xl font-semibold tracking-tight">useRiskColor</h1>
        <p class="text-sm leading-7 text-neutral-300">
          Utility helper that converts a numeric score into a consistent risk color used across badges and gauges.
        </p>
      </header>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Thresholds</h2>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">75+: <code>#ef4444</code></div>
          <div class="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">50-74: <code>#f97316</code></div>
          <div class="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">25-49: <code>#eab308</code></div>
          <div class="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">0-24: <code>#22c55e</code></div>
        </div>
      </section>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Used By</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-300">
          <li><code>ScoreBadge</code></li>
          <li><code>RiskScoreCard</code></li>
          <li><code>ReputationGauge</code></li>
        </ul>
      </section>
    </section>
  `,
});

const meta = {
  title: 'Documentation/Composables/useRiskColor',
  component: UseRiskColorDoc,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UseRiskColorDoc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reference: Story = {};

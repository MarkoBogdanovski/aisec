import type { Meta, StoryObj } from '@nuxtjs/storybook';
import { defineComponent } from 'vue';

const OverviewDoc = defineComponent({
  template: `
    <section class="mx-auto max-w-4xl space-y-6 rounded-[28px] border border-white/15 bg-[#06070c] p-8 text-neutral-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Documentation</p>
        <h1 class="text-3xl font-semibold tracking-tight">Frontend Storybook</h1>
        <p class="max-w-3xl text-sm leading-7 text-neutral-300">
          This Storybook covers both the visual component library and the shared frontend composables that drive API,
          realtime job status, and investigation flows.
        </p>
      </header>

      <section class="grid gap-4 md:grid-cols-2">
        <article class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
          <h2 class="text-lg font-medium text-neutral-100">Components</h2>
          <p class="mt-3 text-sm leading-7 text-neutral-300">
            Stories are organized by domain: Contract, Home, Incident, Market, Shared, and Wallet.
            Data-backed stories run against Storybook mocks, so they render without the backend.
          </p>
        </article>
        <article class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
          <h2 class="text-lg font-medium text-neutral-100">Composables</h2>
          <p class="mt-3 text-sm leading-7 text-neutral-300">
            Documentation pages exist for <code>useApi</code>, <code>useAnalysis</code>, <code>useRiskColor</code>,
            and <code>useWebSocket</code>. Use them as implementation reference while wiring new features.
          </p>
        </article>
      </section>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium text-neutral-100">Mocked Runtime</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-300">
          <li>API responses for contracts, wallets, incidents, market events, and investigations</li>
          <li>Simulated websocket updates for job progress components</li>
          <li>Seeded recent-search history for quick-search stories</li>
        </ul>
      </section>
    </section>
  `,
});

const meta = {
  title: 'Documentation/Overview',
  component: OverviewDoc,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'High-level guide to how this Storybook is structured and what is mocked locally.',
      },
    },
  },
} satisfies Meta<typeof OverviewDoc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Guide: Story = {};

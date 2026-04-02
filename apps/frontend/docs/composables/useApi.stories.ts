import type { Meta, StoryObj } from '@nuxtjs/storybook';
import { defineComponent } from 'vue';

const UseApiDoc = defineComponent({
  template: `
    <section class="mx-auto max-w-4xl space-y-6 rounded-[28px] border border-white/15 bg-[#06070c] p-8 text-neutral-100">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Composable</p>
        <h1 class="text-3xl font-semibold tracking-tight">useApi</h1>
        <p class="text-sm leading-7 text-neutral-300">
          Centralized API client for the frontend. It reads <code>runtimeConfig.public.apiBase</code>,
          normalizes request paths, and exposes typed helpers for contracts, jobs, incidents, market data,
          wallet analysis, and investigations.
        </p>
      </header>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Returns</h2>
        <pre class="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#020409] p-4 text-xs text-emerald-100"><code>const {
  request,
  health,
  analyzeContract,
  getJob,
  getJobResult,
  getContractLatest,
  getContractHistory,
  getIncidents,
  getIncident,
  getMarketEvents,
  getTokenSummary,
  analyzeWallet,
  getInvestigation,
} = useApi();</code></pre>
      </section>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Key Behavior</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-300">
          <li><code>request&lt;T&gt;()</code> resolves relative API paths against the configured base URL</li>
          <li>JSON headers are applied consistently</li>
          <li>Return types come from <code>types/api.ts</code></li>
          <li>Storybook intercepts these calls with local mocks so data-backed components still render</li>
        </ul>
      </section>
    </section>
  `,
});

const meta = {
  title: 'Documentation/Composables/useApi',
  component: UseApiDoc,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UseApiDoc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reference: Story = {};

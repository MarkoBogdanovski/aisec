import type { Meta, StoryObj } from '@nuxtjs/storybook';
import { defineComponent } from 'vue';

const UseAnalysisDoc = defineComponent({
  template: `
    <section class="mx-auto max-w-4xl space-y-6 rounded-[28px] border border-white/15 bg-[#06070c] p-8 text-neutral-100">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Composable</p>
        <h1 class="text-3xl font-semibold tracking-tight">useAnalysis</h1>
        <p class="text-sm leading-7 text-neutral-300">
          High-level contract analysis orchestrator. It submits a contract job, subscribes to realtime job updates,
          polls as a fallback, and resolves with the final analysis result.
        </p>
      </header>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Returns</h2>
        <pre class="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#020409] p-4 text-xs text-emerald-100"><code>const { submitAndPoll, loading, error, lastJobId } = useAnalysis();</code></pre>
      </section>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">submitAndPoll(chainId, contractAddress)</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-300">
          <li>Queues a contract analysis request through <code>useApi</code></li>
          <li>Stores the queued job id in <code>lastJobId</code></li>
          <li>Subscribes to websocket job updates through <code>useWebSocket</code></li>
          <li>Falls back to polling until the result is ready, failed, or timed out</li>
          <li>Resolves with <code>ContractLatestResponse</code></li>
        </ul>
      </section>
    </section>
  `,
});

const meta = {
  title: 'Documentation/Composables/useAnalysis',
  component: UseAnalysisDoc,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UseAnalysisDoc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reference: Story = {};

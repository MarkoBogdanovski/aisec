import type { Meta, StoryObj } from '@nuxtjs/storybook';
import { defineComponent } from 'vue';

const UseWebSocketDoc = defineComponent({
  template: `
    <section class="mx-auto max-w-4xl space-y-6 rounded-[28px] border border-white/15 bg-[#06070c] p-8 text-neutral-100">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Composable</p>
        <h1 class="text-3xl font-semibold tracking-tight">useWebSocket</h1>
        <p class="text-sm leading-7 text-neutral-300">
          Shared realtime client for job progress updates. It keeps a singleton websocket connection,
          tracks active subscriptions by job id, and reconnects when needed.
        </p>
      </header>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Returns</h2>
        <pre class="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#020409] p-4 text-xs text-emerald-100"><code>const {
  connected,
  lastMessage,
  connect,
  disconnect,
  subscribeToJob,
} = useWebSocket();</code></pre>
      </section>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">subscribeToJob(jobId, handler)</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-300">
          <li>Ensures the websocket is connected</li>
          <li>Sends a subscription message for the given job id</li>
          <li>Invokes all handlers registered for that job id</li>
          <li>Returns an unsubscribe function</li>
        </ul>
      </section>

      <section class="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <h2 class="text-lg font-medium">Notes</h2>
        <p class="mt-3 text-sm leading-7 text-neutral-300">
          Connection state is shared at module scope, so multiple components observe the same socket lifecycle.
          In Storybook, websocket events are simulated by the local mock runtime.
        </p>
      </section>
    </section>
  `,
});

const meta = {
  title: 'Documentation/Composables/useWebSocket',
  component: UseWebSocketDoc,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UseWebSocketDoc>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reference: Story = {};

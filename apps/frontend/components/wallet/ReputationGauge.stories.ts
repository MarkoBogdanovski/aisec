import type { Meta, StoryObj } from '@nuxtjs/storybook';

import ReputationGauge from './ReputationGauge.vue';

const meta = {
  title: 'Wallet/ReputationGauge',
  component: ReputationGauge,
  tags: ['autodocs'],
  args: {
    score: 61,
  },
} satisfies Meta<typeof ReputationGauge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

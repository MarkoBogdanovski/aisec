import type { Meta, StoryObj } from '@nuxtjs/storybook';

import FundFlowGraph from './FundFlowGraph.vue';

const meta = {
  title: 'Wallet/FundFlowGraph',
  component: FundFlowGraph,
  tags: ['autodocs'],
} satisfies Meta<typeof FundFlowGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

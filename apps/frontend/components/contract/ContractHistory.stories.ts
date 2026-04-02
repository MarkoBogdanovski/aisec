import type { Meta, StoryObj } from '@nuxtjs/storybook';

import ContractHistory from './ContractHistory.vue';

const meta = {
  title: 'Contract/ContractHistory',
  component: ContractHistory,
  tags: ['autodocs'],
  args: {
    chainId: '1',
    address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
} satisfies Meta<typeof ContractHistory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@nuxtjs/storybook';

import QuickContractLookup from './QuickContractLookup.vue';

const meta = {
  title: 'Home/QuickContractLookup',
  component: QuickContractLookup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof QuickContractLookup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@nuxtjs/storybook';

import QuickWalletLookup from './QuickWalletLookup.vue';

const meta = {
  title: 'Home/QuickWalletLookup',
  component: QuickWalletLookup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof QuickWalletLookup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

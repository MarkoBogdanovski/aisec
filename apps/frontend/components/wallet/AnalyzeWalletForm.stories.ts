import type { Meta, StoryObj } from '@nuxtjs/storybook';

import AnalyzeWalletForm from './AnalyzeWalletForm.vue';

const meta = {
  title: 'Wallet/AnalyzeWalletForm',
  component: AnalyzeWalletForm,
  tags: ['autodocs'],
} satisfies Meta<typeof AnalyzeWalletForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

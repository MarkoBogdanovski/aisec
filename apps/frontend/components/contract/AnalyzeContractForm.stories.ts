import type { Meta, StoryObj } from '@nuxtjs/storybook';

import AnalyzeContractForm from './AnalyzeContractForm.vue';

const meta = {
  title: 'Contract/AnalyzeContractForm',
  component: AnalyzeContractForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AnalyzeContractForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

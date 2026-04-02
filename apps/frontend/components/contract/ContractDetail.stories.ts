import type { Meta, StoryObj } from '@nuxtjs/storybook';

import { storybookMockData } from '../../.storybook/mocks';
import ContractDetail from './ContractDetail.vue';

const meta = {
  title: 'Contract/ContractDetail',
  component: ContractDetail,
  tags: ['autodocs'],
  args: {
    contract: storybookMockData.contractAnalysis,
  },
} satisfies Meta<typeof ContractDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

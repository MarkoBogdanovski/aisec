import type { Meta, StoryObj } from '@nuxtjs/storybook';

import { storybookMockData } from '../../.storybook/mocks';
import FindingsList from './FindingsList.vue';

const meta = {
  title: 'Contract/FindingsList',
  component: FindingsList,
  tags: ['autodocs'],
  args: {
    findings: storybookMockData.contractAnalysis.findings,
  },
} satisfies Meta<typeof FindingsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    findings: [],
  },
};

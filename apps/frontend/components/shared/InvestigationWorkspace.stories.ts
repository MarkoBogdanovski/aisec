import type { Meta, StoryObj } from '@nuxtjs/storybook';

import { storybookMockData } from '../../.storybook/mocks';
import InvestigationWorkspace from './InvestigationWorkspace.vue';

const meta = {
  title: 'Shared/InvestigationWorkspace',
  component: InvestigationWorkspace,
  tags: ['autodocs'],
  args: {
    result: storybookMockData.contractInvestigation,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof InvestigationWorkspace>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

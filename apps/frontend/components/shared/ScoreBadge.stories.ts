import type { Meta, StoryObj } from '@nuxtjs/storybook';

import ScoreBadge from './ScoreBadge.vue';

const meta = {
  title: 'Shared/ScoreBadge',
  component: ScoreBadge,
  tags: ['autodocs'],
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    severity: {
      control: 'text',
    },
  },
  args: {
    score: 72,
    severity: 'high',
  },
} satisfies Meta<typeof ScoreBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HighRisk: Story = {};

export const MediumRisk: Story = {
  args: {
    score: 54,
    severity: 'medium',
  },
};

export const LowRisk: Story = {
  args: {
    score: 18,
    severity: 'low',
  },
};

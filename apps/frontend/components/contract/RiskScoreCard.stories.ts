import type { Meta, StoryObj } from '@nuxtjs/storybook';

import RiskScoreCard from './RiskScoreCard.vue';

const meta = {
  title: 'Contract/RiskScoreCard',
  component: RiskScoreCard,
  tags: ['autodocs'],
  args: {
    score: 78,
    severity: 'HIGH',
    analyzedAt: '2026-04-02 18:30 UTC',
  },
} satisfies Meta<typeof RiskScoreCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

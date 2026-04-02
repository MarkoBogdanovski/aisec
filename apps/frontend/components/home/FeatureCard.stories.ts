import type { Meta, StoryObj } from '@nuxtjs/storybook';

import FeatureCard from './FeatureCard.vue';

const meta = {
  title: 'Home/FeatureCard',
  component: FeatureCard,
  tags: ['autodocs'],
  args: {
    feature: {
      id: 'contract-analysis',
      icon: 'C',
      title: 'Smart Contract Analysis',
      description: 'Scan production contracts for vulnerabilities, governance risk, and operational weaknesses.',
      link: '/',
    },
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FeatureCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

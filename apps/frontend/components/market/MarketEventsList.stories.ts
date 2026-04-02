import type { Meta, StoryObj } from '@nuxtjs/storybook';

import MarketEventsList from './MarketEventsList.vue';

const meta = {
  title: 'Market/MarketEventsList',
  component: MarketEventsList,
  tags: ['autodocs'],
} satisfies Meta<typeof MarketEventsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

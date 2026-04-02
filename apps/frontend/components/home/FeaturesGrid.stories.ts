import type { Meta, StoryObj } from '@nuxtjs/storybook';

import FeaturesGrid from './FeaturesGrid.vue';

const meta = {
  title: 'Home/FeaturesGrid',
  component: FeaturesGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof FeaturesGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@nuxtjs/storybook';

import QuickSearch from './QuickSearch.vue';

const meta = {
  title: 'Shared/QuickSearch',
  component: QuickSearch,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof QuickSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@nuxtjs/storybook';

import IncidentList from './IncidentList.vue';

const meta = {
  title: 'Incident/IncidentList',
  component: IncidentList,
  tags: ['autodocs'],
} satisfies Meta<typeof IncidentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@nuxtjs/storybook';

import JobStatus from './JobStatus.vue';

const meta = {
  title: 'Contract/JobStatus',
  component: JobStatus,
  tags: ['autodocs'],
  args: {
    jobId: 'job-contract-001',
  },
} satisfies Meta<typeof JobStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

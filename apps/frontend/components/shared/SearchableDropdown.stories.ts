import type { Meta, StoryObj } from '@nuxtjs/storybook';
import { ref } from 'vue';

import SearchableDropdown from './SearchableDropdown.vue';

const meta = {
  title: 'Shared/SearchableDropdown',
  component: SearchableDropdown,
  tags: ['autodocs'],
  args: {
    modelValue: '1',
    label: 'Network',
    placeholder: 'Select a network',
    searchPlaceholder: 'Search networks...',
    searchable: true,
    options: [
      { value: '1', label: 'Ethereum Mainnet', description: 'Chain ID 1' },
      { value: '137', label: 'Polygon', description: 'Chain ID 137' },
      { value: '56', label: 'BNB Smart Chain', description: 'Chain ID 56' },
      { value: '8453', label: 'Base', description: 'Chain ID 8453' },
    ],
  },
  render: (args) => ({
    components: { SearchableDropdown },
    setup() {
      const value = ref(args.modelValue);
      return { args, value };
    },
    template: `
      <div class="w-[360px]">
        <SearchableDropdown v-bind="args" v-model="value" />
        <p class="mt-3 text-xs text-neutral-300">Selected value: {{ value }}</p>
      </div>
    `,
  }),
} satisfies Meta<typeof SearchableDropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Searchable: Story = {};

export const NonSearchable: Story = {
  args: {
    searchable: false,
    label: 'Priority',
    modelValue: 'normal',
    options: [
      { value: 'low', label: 'Low', description: 'Standard processing' },
      { value: 'normal', label: 'Normal', description: 'Balanced speed and cost' },
      { value: 'high', label: 'High', description: 'Fastest processing' },
    ],
  },
};

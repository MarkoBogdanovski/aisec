import type { Meta, StoryObj } from '@nuxtjs/storybook';

import { storybookMockData } from '../../.storybook/mocks';
import EntityRelationsGraph from './EntityRelationsGraph.vue';

const meta = {
  title: 'Shared/EntityRelationsGraph',
  component: EntityRelationsGraph,
  tags: ['autodocs'],
  args: {
    entities: storybookMockData.contractInvestigation.entities,
    relations: storybookMockData.contractInvestigation.relations,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EntityRelationsGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

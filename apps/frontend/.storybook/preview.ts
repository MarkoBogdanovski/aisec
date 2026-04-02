import type { Preview } from '@nuxtjs/storybook';

import '../assets/css/tailwind.css';
import 'v-network-graph/lib/style.css';
import { installStorybookMocks } from './mocks';

installStorybookMocks();

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        security: { name: 'security', value: '#06070c' },
        slate: { name: 'slate', value: '#0f172a' },
        light: { name: 'light', value: '#f5f7fb' }
      }
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },

  initialGlobals: {
    backgrounds: {
      value: 'security'
    }
  }
};

export default preview;

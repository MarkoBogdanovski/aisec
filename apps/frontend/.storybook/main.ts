import type { StorybookConfig } from '@nuxtjs/storybook';

const config: StorybookConfig = {
  stories: ['../docs/**/*.stories.@(js|jsx|mjs|ts|tsx)', '../components/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  framework: {
    name: '@storybook-vue/nuxt',
    options: {},
  }
};

export default config;

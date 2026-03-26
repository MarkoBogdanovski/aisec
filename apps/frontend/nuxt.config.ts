export default defineNuxtConfig({
  compatibilityDate: '2025-03-01',
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css', 'v-network-graph/lib/style.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1',
      appName: 'AI Web3 Security Platform',
    },
  },
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: false,
  },
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // In development the API runs separately on port 3000.
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    // The Express app serves the built site, so one Node app is deployed to each cloud.
    outDir: '../backend/public',
    emptyOutDir: true,
  },
});

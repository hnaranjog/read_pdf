import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});

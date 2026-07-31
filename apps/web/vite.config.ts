import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
  },
  // OPFS requiere contexto seguro; localhost ya lo es.
  // Estas cabeceras habilitan cross-origin isolation si hiciera falta
  // para SharedArrayBuffer en el futuro.
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // проксируем нужные API-пути на backend:8180
      '^/(auth|me|profile|targets|foods|lipids|advice|analysis|assistant|uploads|billing)': {
        target: 'http://localhost:8180',
        changeOrigin: true,
      },
    },
  },
});

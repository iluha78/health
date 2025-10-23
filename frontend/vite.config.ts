import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // проксируем нужные API-пути на backend:8180
      '^/(auth|me|foods|lipids|targets|advice|analysis|assistant|uploads)': {
        target: 'http://localhost:8180',
        changeOrigin: true,
      },
    },
  },
});

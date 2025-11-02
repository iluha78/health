import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // проксируем нужные API-пути на backend:8180
      '^/(auth|me|profile|targets|foods|lipids|blood-pressure|advice|analysis|assistant|uploads|billing)': {
        target: 'http://localhost:8180',
        changeOrigin: true,
        bypass(req) {
          const acceptHeader = req.headers.accept ?? '';
          if (req.method === 'GET' && acceptHeader.includes('text/html')) {
            // Пусть запросы HTML обслуживаются самим Vite, чтобы SPA-маршруты работали при прямых заходах
            return '/index.html';
          }
          return undefined;
        },
      },
    },
  },
});

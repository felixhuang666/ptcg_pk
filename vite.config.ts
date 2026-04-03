import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true' ? {
        clientPort: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 5000,
        protocol: process.env.VITE_HMR_PROTOCOL || 'ws',
        host: process.env.VITE_HMR_HOST || '127.0.0.1'
      } : false,
      allowedHosts: [
        "felix9977.mooo.com",
        "127.0.0.1",
        "localhost"
      ],
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});


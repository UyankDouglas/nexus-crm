import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Em desenvolvimento o frontend chama `/api` na própria origem e o Vite repassa para a
  // API. Assim os cookies de sessão são first-party e não há CORS no navegador.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3333';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: false },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: false },
      },
    },
    build: {
      sourcemap: true,
    },
  };
});

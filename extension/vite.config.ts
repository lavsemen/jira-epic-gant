import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  return {
    root: resolve(__dirname),
    resolve: {
      alias: {
        '@jira-epic-gantt/shared': resolve(__dirname, '../shared/src/index.ts'),
      },
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          { src: 'public/manifest.json', dest: '.' },
          { src: 'public/icons/*', dest: 'icons' },
          { src: 'public/auth-callback.html', dest: '.' },
          { src: 'public/options.html', dest: '.' },
        ],
      }),
    ],
    define: {
      __BACKEND_URL__: JSON.stringify(env.VITE_BACKEND_URL || 'http://localhost:8787'),
      __JIRA_HOST__: JSON.stringify(env.VITE_JIRA_HOST || 'ytme.atlassian.net'),
      __CANCELLED_STATUS_IDS__: JSON.stringify(env.VITE_CANCELLED_STATUS_IDS || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
          options: resolve(__dirname, 'src/options/main.tsx'),
          'auth-callback': resolve(__dirname, 'src/auth-callback/main.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name][extname]',
          format: 'es',
        },
      },
    },
  };
});

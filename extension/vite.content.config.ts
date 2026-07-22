import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  return {
    root: resolve(__dirname),
    resolve: {
      alias: {
        '@jira-epic-gantt/shared': resolve(__dirname, '../shared/src/index.ts'),
      },
    },
    plugins: [react()],
    define: {
      __BACKEND_URL__: JSON.stringify(env.VITE_BACKEND_URL || 'http://localhost:8787'),
      __JIRA_HOST__: JSON.stringify(env.VITE_JIRA_HOST || 'ytme.atlassian.net'),
      __CANCELLED_STATUS_IDS__: JSON.stringify(env.VITE_CANCELLED_STATUS_IDS || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      cssCodeSplit: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/content/index.ts'),
        output: {
          entryFileNames: 'content.js',
          format: 'iife',
          name: 'JiraEpicGanttContent',
          inlineDynamicImports: true,
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  };
});

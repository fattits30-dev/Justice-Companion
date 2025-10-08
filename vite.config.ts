import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import { builtinModules } from 'module';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                'better-sqlite3',
                'node-llama-cpp',
                'express',
                // External all node-llama-cpp platform bindings
                '@node-llama-cpp/linux-arm64',
                '@node-llama-cpp/linux-armv7l',
                '@node-llama-cpp/linux-x64',
                '@node-llama-cpp/linux-x64-cuda',
                '@node-llama-cpp/linux-x64-cuda-ext',
                '@node-llama-cpp/linux-x64-vulkan',
                '@node-llama-cpp/mac-arm64-metal',
                '@node-llama-cpp/mac-x64',
                '@node-llama-cpp/win-arm64',
                '@node-llama-cpp/win-x64',
                '@node-llama-cpp/win-x64-cuda',
                '@node-llama-cpp/win-x64-cuda-ext',
                '@node-llama-cpp/win-x64-vulkan',
              ],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
      },
    ]),
    renderer({
      nodeIntegration: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/db': path.resolve(__dirname, './src/db'),
      '@/repositories': path.resolve(__dirname, './src/repositories'),
    },
  },
  build: {
    target: 'esnext', // Support top-level await
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        'node-llama-cpp',
        /^@node-llama-cpp\//,
      ],
    },
  },
  optimizeDeps: {
    exclude: [
      'node-llama-cpp',
      '@node-llama-cpp/linux-arm64',
      '@node-llama-cpp/linux-armv7l',
      '@node-llama-cpp/linux-x64',
      '@node-llama-cpp/linux-x64-cuda',
      '@node-llama-cpp/linux-x64-cuda-ext',
      '@node-llama-cpp/linux-x64-vulkan',
      '@node-llama-cpp/mac-arm64-metal',
      '@node-llama-cpp/mac-x64',
      '@node-llama-cpp/win-arm64',
      '@node-llama-cpp/win-x64',
      '@node-llama-cpp/win-x64-cuda',
      '@node-llama-cpp/win-x64-cuda-ext',
      '@node-llama-cpp/win-x64-vulkan',
    ],
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'node', // Use Node environment for tests (needed for fs, path, etc.)
    globals: true,
    setupFiles: [],
  },
});

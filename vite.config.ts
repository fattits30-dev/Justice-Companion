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
          // Copy migrations to dist-electron so they're available at runtime
          publicDir: false,
        },
        onstart(args) {
          // Copy migrations folder after build
          const fs = require('fs');
          const path = require('path');
          const src = path.join(__dirname, 'src', 'db', 'migrations');
          const dest = path.join(__dirname, 'dist-electron', 'migrations');

          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }

          fs.readdirSync(src).forEach(file => {
            if (file.endsWith('.sql')) {
              fs.copyFileSync(path.join(src, file), path.join(dest, file));
            }
          });

          args.startup();
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
});

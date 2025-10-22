import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Base path for Electron (must be relative)
  base: './',

  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],

    // Run repository tests sequentially to avoid database singleton conflicts
    // Other tests can still run in parallel for speed
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in single fork (sequential)
      },
    },

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },

  // Build configuration
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['framer-motion', 'lucide-react']
        }
      }
    }
  },

  // Development server
  server: {
    port: 5176,
    strictPort: true
  },

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Environment variables prefix
  envPrefix: 'VITE_',

  // Optimizations
  optimizeDeps: {
    exclude: ['better-sqlite3']
  }
});

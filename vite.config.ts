import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Base path for Electron (must be relative)
  base: './',

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
    port: 5173,
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

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load port configuration
function getVitePort(): number {
  // Check environment variable first
  if (process.env.VITE_DEV_SERVER_PORT) {
    return parseInt(process.env.VITE_DEV_SERVER_PORT, 10);
  }

  // Try to load from port configuration file
  try {
    const configPath = path.join(__dirname, 'config', 'ports.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const devConfig = config.development?.services?.find(
        (s: any) => s.service === 'vite-dev-server'
      );
      if (devConfig?.defaultPort) {
        return devConfig.defaultPort;
      }
    }
  } catch (error) {
    console.warn('Could not load port configuration:', error);
  }

  // Default fallback
  return 5176;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['process', 'buffer', 'util', 'stream', 'events', 'path', 'crypto', 'os', 'timers'],
      globals: {
        process: true,
        Buffer: true,
        global: true
      }
    })
  ],

  // Base path for Electron (must be relative)
  base: './',

  // Vitest configuration - temporarily disabled
  // test: {
  //   globals: true,
  //   environment: 'happy-dom',
  //   setupFiles: ['./src/test/setup.ts'],
  //   pool: 'forks',
  //   maxWorkers: 1,
  //   isolate: false,
  //   exclude: [
  //     '**/node_modules/**',
  //     '**/dist/**',
  //     '**/.{git,cache,output,temp}/**',
  //     '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
  //   ],
  //   coverage: {
  //     provider: 'v8',
  //     reporter: ['text', 'json', 'html'],
  //     exclude: [
  //       'node_modules/',
  //       'src/test/',
  //       '**/*.test.{ts,tsx}',
  //       '**/*.spec.{ts,tsx}',
  //     ],
  //   },
  //   server: {
  //     deps: {
  //       inline: ['parse5'],
  //     },
  //   },
  // },

  // Build configuration
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['electron'],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['framer-motion', 'lucide-react']
        }
      }
    }
  },

  // Development server with automatic port allocation
  server: {
    port: getVitePort(),
    strictPort: false, // Allow Vite to find an available port if the default is in use
    host: 'localhost',
    open: false, // Don't auto-open browser (Electron will handle this)
    cors: true,

    // HMR configuration
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
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
    exclude: ['better-sqlite3', 'electron']
  }
});
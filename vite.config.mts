import react from "@vitejs/plugin-react";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

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
    const configPath = path.join(__dirname, "config", "ports.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const devConfig = config.development?.services?.find(
        (s: any) => s.service === "vite-dev-server"
      );
      if (devConfig?.defaultPort) {
        return devConfig.defaultPort;
      }
    }
  } catch (error) {
    console.warn("Could not load port configuration:", error);
  }

  // Default fallback
  return 5176;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: [
        "process",
        "buffer",
        "util",
        "stream",
        "events",
        "path",
        "crypto",
        "os",
        "timers",
      ],
      globals: {
        process: true,
        Buffer: true,
        global: true,
      },
    }),
  ],

  // Base path for web deployment (absolute)
  base: "/",

  // Vitest configuration
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    pool: "forks",
    maxWorkers: 1,
    isolate: false,
    // CRITICAL: Force backend mode for tests (overrides .env.local)
    env: {
      VITE_LOCAL_MODE: "false",
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
    },
    server: {
      deps: {
        inline: ["parse5"],
      },
    },
  },

  // Build configuration
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "ui-vendor": ["framer-motion", "lucide-react"],
        },
      },
    },
  },

  // Development server with automatic port allocation
  server: {
    port: getVitePort(),
    strictPort: false, // Allow Vite to find an available port if the default is in use
    host: true, // Listen on all interfaces for Docker/network access
    open: false, // Don't auto-open browser (Electron will handle this)
    cors: true,
    // Allow Docker host and other testing hosts
    allowedHosts: ["host.docker.internal", "localhost", "127.0.0.1"],

    // HMR configuration
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },

  // Preview server configuration
  preview: {
    port: 4173,
    host: true, // Listen on all network interfaces
    strictPort: false,
    cors: true,
    // Allow Docker host to access preview server
    allowedHosts: ["host.docker.internal", ".railway.app", ".netlify.app"],
  },

  // Path aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },

  // Environment variables prefix
  envPrefix: "VITE_",

  // Optimizations
  optimizeDeps: {
    exclude: ["better-sqlite3"],
  },

  // No Electron-specific globals in PWA build
  define: {},
});

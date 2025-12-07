import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load port configuration
function getVitePort() {
    // Check environment variable first
    if (process.env.VITE_DEV_SERVER_PORT) {
        return parseInt(process.env.VITE_DEV_SERVER_PORT, 10);
    }
    // Try to load from port configuration file
    try {
        const configPath = path.join(__dirname, "config", "ports.json");
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            const devConfig = config.development?.services?.find((s) => s.service === "vite-dev-server");
            if (devConfig?.defaultPort) {
                return devConfig.defaultPort;
            }
        }
    }
    catch (error) {
        console.warn("Could not load port configuration:", error);
    }
    // Default fallback
    return 5176;
}
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
            manifest: {
                name: "Justice Companion - UK Legal AI Assistant",
                short_name: "JusticeAI",
                description: "Privacy-first AI-powered case management for UK legal matters",
                theme_color: "#1e40af",
                background_color: "#0B1120",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                icons: [
                    {
                        src: "/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/.*\.railway\.app\/api\/.*/i,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-cache",
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 300,
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /^https:\/\/.*\.railway\.app\/chat\/.*/i,
                        handler: "NetworkOnly",
                    },
                ],
            },
            devOptions: {
                enabled: true,
                type: "module",
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
        dedupe: ['react', 'react-dom'],
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

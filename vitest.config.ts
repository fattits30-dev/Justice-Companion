import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// This config file is intentionally ignored by linters as it's a configuration file
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/e2e/**",
      "tests/**/*.e2e.test.*",
      "tests/**/*.e2e.spec.*",
      "src/**/*.e2e.test.*",
      "src/**/*.e2e.spec.*",
      "e2e/**/*.test.*",
      "e2e/**/*.spec.*",
      // Integration tests that use native better-sqlite3 module
      "src/services/AuthorizationService.test.ts",
      "src/services/TagService.test.ts",
      "src/shared/infrastructure/di/container.test.ts",
      "src/shared/infrastructure/events/EventBus.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/.{idea,git,cache,output,temp}",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
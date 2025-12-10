import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for tests/e2e/ directory
 *
 * Use this config with: npx playwright test --config=playwright.config.js
 *
 * The main e2e tests are in ./e2e/ and use playwright.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5178",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  /* Run dev server before starting the tests */
  webServer: {
    command: "pnpm dev:full",
    url: "http://localhost:5178",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});

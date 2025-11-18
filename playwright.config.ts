import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-tests",
  fullyParallel: false,
  forbidOnly: !!(globalThis as any).process?.env?.CI,
  retries: (globalThis as any).process?.env?.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  testIgnore: ["e2e-tests/document-analysis.spec.ts"],

  use: {
    baseURL: "http://localhost:5176",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 15"] },
    },
  ],

  outputDir: "e2e-tests/test-results",
});

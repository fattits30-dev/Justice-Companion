import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Electron E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './specs',

  // Test timeout (90 seconds per test - increased for Electron app launch + authentication)
  timeout: 90000,

  // Global timeout for entire test run (10 minutes)
  globalTimeout: 600000,

  // Expect timeout for assertions (5 seconds)
  expect: {
    timeout: 5000,
  },

  // Run tests in serial (Electron app can't run multiple instances)
  fullyParallel: false,
  workers: 1,

  // Retry failed tests (helps with flaky tests)
  retries: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Shared test configuration
  use: {
    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Trace on failure
    trace: 'retain-on-failure',

    // Base URL (not used for Electron, but kept for consistency)
    baseURL: 'http://localhost:5173',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout (increased to 60s for Electron app startup)
    navigationTimeout: 60000,
  },

  // Output directory for artifacts
  outputDir: 'test-results/artifacts',

  // Global setup and teardown
  globalSetup: path.join(__dirname, 'setup', 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'setup', 'global-teardown.ts'),

  // Projects (Electron only)
  projects: [
    {
      name: 'electron',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});

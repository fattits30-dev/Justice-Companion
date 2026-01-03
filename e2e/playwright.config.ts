import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    expect: { timeout: 5000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
        headless: process.env.CI ? true : false, // run headless in CI
        // Optional: set PLAYWRIGHT_SLOWMO (ms) to slow actions for visual debugging, e.g. PLAYWRIGHT_SLOWMO=200
        slowMo: process.env.PLAYWRIGHT_SLOWMO ? Number(process.env.PLAYWRIGHT_SLOWMO) : 0,
        viewport: { width: 1280, height: 800 },
        actionTimeout: 10_000,
        trace: 'on-first-retry'
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } }
    ]
});

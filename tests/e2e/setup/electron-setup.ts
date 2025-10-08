import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { setupTestDatabase, cleanupTestDatabase } from './test-database.js';

/**
 * Electron app instance with test database and page
 */
export interface ElectronTestApp {
  app: ElectronApplication;
  window: Page;
  dbPath: string;
}

/**
 * Launch Electron app for E2E testing
 * - Creates isolated test database
 * - Launches Electron with test environment
 * - Waits for app to be ready
 * - Returns app, window, and database path
 */
export async function launchElectronApp(options?: {
  seedData?: boolean;
  headless?: boolean;
  timeout?: number;
}): Promise<ElectronTestApp> {
  const { seedData = false, timeout = 30000 } = options || {};

  // Setup test database
  const dbPath = await setupTestDatabase({ seedData });

  // Determine electron main file path
  const electronMainPath = path.join(process.cwd(), 'dist-electron', 'main.js');

  // Check if dist-electron exists, if not use electron directory
  const mainPath = fs.existsSync(electronMainPath)
    ? electronMainPath
    : path.join(process.cwd(), 'electron', 'main.ts');

  console.log(`Launching Electron from: ${mainPath}`);
  console.log(`Using test database: ${dbPath}`);

  try {
    // Launch Electron
    const app = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JUSTICE_DB_PATH: dbPath,
        // Disable dev server in test mode
        VITE_DEV_SERVER_URL: '',
      },
      timeout,
    });

    // Wait for first window
    const window = await app.firstWindow({
      timeout,
    });

    // Wait for app to be fully loaded
    // We'll wait for the main content area to be visible
    await window.waitForLoadState('domcontentloaded', { timeout });
    await window.waitForSelector('body', { timeout });

    // Give React time to hydrate
    await window.waitForTimeout(2000);

    console.log('Electron app launched successfully');

    return { app, window, dbPath };
  } catch (error) {
    console.error('Failed to launch Electron app:', error);
    // Cleanup database on failure
    await cleanupTestDatabase(dbPath);
    throw error;
  }
}

/**
 * Close Electron app and cleanup test database
 */
export async function closeElectronApp(testApp: ElectronTestApp): Promise<void> {
  const { app, dbPath } = testApp;

  try {
    // Close Electron app
    await app.close();
    console.log('Electron app closed');
  } catch (error) {
    console.error('Error closing Electron app:', error);
  }

  // Cleanup test database
  await cleanupTestDatabase(dbPath);
}

/**
 * Wait for element to be visible and return it
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Click element and wait for navigation/action to complete
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  options?: { timeout?: number; waitForNavigation?: boolean }
): Promise<void> {
  const { timeout = 5000, waitForNavigation = false } = options || {};

  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({ timeout }),
      page.click(selector, { timeout }),
    ]);
  } else {
    await page.click(selector, { timeout });
    // Small delay to allow UI to update
    await page.waitForTimeout(500);
  }
}

/**
 * Fill form field and wait for update
 */
export async function fillField(
  page: Page,
  selector: string,
  value: string,
  timeout = 5000
): Promise<void> {
  await page.fill(selector, value, { timeout });
  // Small delay to allow UI to update
  await page.waitForTimeout(200);
}

/**
 * Select dropdown option
 */
export async function selectOption(
  page: Page,
  selector: string,
  value: string,
  timeout = 5000
): Promise<void> {
  await page.selectOption(selector, value, { timeout });
  await page.waitForTimeout(200);
}

/**
 * Take screenshot for debugging
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const screenshotPath = path.join(process.cwd(), 'test-results', 'screenshots', `${name}.png`);
  const screenshotDir = path.dirname(screenshotPath);

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

/**
 * Get text content of element
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string | null> {
  const element = await page.$(selector);
  if (!element) return null;
  return element.textContent();
}

/**
 * Check if element exists
 */
export async function elementExists(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = await page.$(selector);
  return element !== null;
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * Execute JavaScript in page context
 */
export async function evaluateInPage<T>(
  page: Page,
  fn: () => T
): Promise<T> {
  return page.evaluate(fn);
}

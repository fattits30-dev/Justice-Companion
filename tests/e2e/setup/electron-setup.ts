import { expect, type Page, type Browser } from "@playwright/test";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cleanupTestDatabase, setupTestDatabase } from "./test-database.ts";

/**
 * Web app instance with test database and page
 */
export interface WebTestApp {
  browser: Browser;
  page: Page;
  dbPath: string;
}

/**
 * Electron app instance with test database and window
 */
export interface ElectronTestApp {
  window: any; // Electron BrowserWindow
  dbPath: string;
}

/**
 * Launch web app for E2E testing
 * - Creates isolated test database
 * - Launches browser and navigates to development server
 * - Waits for app to be ready
 * - Returns browser, page, and database path
 */
export async function launchWebApp(options?: {
  seedData?: boolean;
  timeout?: number;
}): Promise<WebTestApp> {
  const { seedData = false } = options || {};

  // Setup test database
  const dbPath = await setupTestDatabase({ seedData });

  console.warn(`[launchWebApp] Setting up test database: ${dbPath}`);

  // Set test environment variables
  const encryptionKey =
    process.env.ENCRYPTION_KEY_BASE64 ??
    crypto.randomBytes(32).toString("base64");
  process.env.ENCRYPTION_KEY_BASE64 = encryptionKey;
  process.env.JUSTICE_DB_PATH = dbPath;
  process.env.NODE_ENV = "test";

  console.warn(`[launchWebApp] Test database ready: ${dbPath}`);

  // Note: Browser will be launched by Playwright's test runner
  // We just need to return the setup info
  return { browser: {} as Browser, page: {} as Page, dbPath };
}

/**
 * Close web app and cleanup test database
 */
export async function closeWebApp(
  testApp: WebTestApp | undefined
): Promise<void> {
  if (!testApp) {
    return;
  }

  const { dbPath } = testApp;

  try {
    // Close browser (handled by Playwright)
    console.warn("Web app test completed");
  } catch (error) {
    console.error("Error closing web app:", error);
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
  await page.waitForSelector(selector, { state: "visible", timeout });
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
    const initialUrl = page.url();
    await Promise.all([
      page.waitForURL((url) => url.toString() !== initialUrl, { timeout }),
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
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const screenshotPath = path.join(
    process.cwd(),
    "test-results",
    "screenshots",
    `${name}.png`
  );
  const screenshotDir = path.dirname(screenshotPath);

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.warn(`Screenshot saved: ${screenshotPath}`);
}

/**
 * Get text content of element
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string | null> {
  const element = await page.$(selector);
  if (!element) {
    return null;
  }
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
  await page.waitForSelector(selector, { state: "hidden", timeout });
}

/**
 * Execute JavaScript in page context
 */
export async function evaluateInPage<T>(page: Page, fn: () => T): Promise<T> {
  return page.evaluate(fn);
}

/**
 * Authenticate test user via UI login
 * Use this after launching app with seedData: true to bypass login screen
 *
 * Uses Playwright web-first assertions for reliable waiting (no hard timeouts)
 */
export async function authenticateTestUser(
  page: Page,
  credentials: { username: string; password: string },
  timeout = 15000
): Promise<void> {
  try {
    console.warn(`[authenticateTestUser] Waiting for login screen...`);

    // ✅ Web-first assertion: Wait for login screen to be visible
    await expect(page.getByText("Sign In")).toBeVisible({ timeout });
    console.warn(`[authenticateTestUser] Login screen found`);

    // Fill login form
    console.warn(
      `[authenticateTestUser] Filling username: ${credentials.username}`
    );
    await page.fill("#username", credentials.username);

    console.warn(`[authenticateTestUser] Filling password`);
    await page.fill("#password", credentials.password);

    // ✅ Click login button using role-based selector (more reliable)
    console.warn(`[authenticateTestUser] Clicking Login button`);
    await page.getByRole("button", { name: "Login" }).click();

    // ✅ Web-first assertion: Wait for post-login element to appear
    // The app shows the Dashboard with "Welcome to Justice Companion" heading after successful login
    console.warn(
      `[authenticateTestUser] Waiting for authentication to complete...`
    );

    // Wait for the Dashboard welcome heading (most reliable post-login indicator)
    await expect(page.getByText("Welcome to Justice Companion")).toBeVisible({
      timeout: 15000,
    });
    console.warn(`[authenticateTestUser] ✅ Dashboard loaded`);

    console.warn(
      `[authenticateTestUser] ✅ Authenticated as ${credentials.username}`
    );
  } catch (error) {
    console.error(
      "[authenticateTestUser] ❌ Failed to authenticate test user:",
      error
    );

    // Take screenshot for debugging
    try {
      const screenshot = await page.screenshot();
      console.error(
        "[authenticateTestUser] Screenshot saved (base64 length):",
        screenshot.length
      );
    } catch (screenshotError) {
      console.error(
        "[authenticateTestUser] Failed to take screenshot:",
        screenshotError
      );
    }

    throw error;
  }
}

/**
 * Launch Electron app for E2E testing
 * - Creates isolated test database
 * - Launches Electron app
 * - Returns window and database path
 */
export async function launchElectronApp(options?: {
  seedData?: boolean;
  timeout?: number;
}): Promise<ElectronTestApp> {
  const { seedData = false } = options || {};

  // Setup test database
  const dbPath = await setupTestDatabase({ seedData });

  console.warn(`[launchElectronApp] Setting up test database: ${dbPath}`);

  // Set test environment variables
  const encryptionKey =
    process.env.ENCRYPTION_KEY_BASE64 ??
    crypto.randomBytes(32).toString("base64");
  process.env.ENCRYPTION_KEY_BASE64 = encryptionKey;
  process.env.JUSTICE_DB_PATH = dbPath;
  process.env.NODE_ENV = "test";

  console.warn(`[launchElectronApp] Test database ready: ${dbPath}`);

  // Note: Electron app will be launched by Playwright test runner
  // We just need to return the setup info
  return { window: {} as any, dbPath };
}

/**
 * Close Electron app and cleanup test database
 */
export async function closeElectronApp(
  testApp: ElectronTestApp | undefined
): Promise<void> {
  if (!testApp) {
    return;
  }

  const { dbPath } = testApp;

  try {
    // Close Electron window (handled by Playwright)
    console.warn("Electron app test completed");
  } catch (error) {
    console.error("Error closing Electron app:", error);
  }

  // Cleanup test database
  await cleanupTestDatabase(dbPath);
}

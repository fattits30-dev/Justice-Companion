import { expect, type Page, type Browser, _electron as electron } from "@playwright/test";
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
  headless?: boolean;
}): Promise<ElectronTestApp> {
  const timeout = options?.timeout ?? 30000;
  const { seedData = false } = options || {};

  // Setup test database
  const dbPath = await setupTestDatabase({ seedData });

  // Determine electron main file path
  const projectRoot = process.cwd();
  const compiledMainPath = path.join(projectRoot, "dist-electron", "main.js");
  const testMainPath = path.join(projectRoot, "electron", "main.test.ts");
  const sourceMainPath = path.join(projectRoot, "electron", "main.ts");

  // Use test version in test mode (check if test env vars are set)
  const isTestMode =
    process.env.JUSTICE_DB_PATH?.includes("test-") ||
    process.env.NODE_ENV === "test";
  const mainPath =
    isTestMode && fs.existsSync(testMainPath)
      ? testMainPath
      : fs.existsSync(compiledMainPath)
        ? compiledMainPath
        : sourceMainPath;

  console.warn(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.warn(`testMainPath exists: ${fs.existsSync(testMainPath)}`);
  console.warn(`compiledMainPath exists: ${fs.existsSync(compiledMainPath)}`);
  console.warn(`Launching Electron from: ${mainPath}`);
  console.warn(`Using test database: ${dbPath}`);

  try {
    // Launch Electron with Electron 38+ compatibility
    // Playwright needs to add --user-data-dir for Electron 38+ due to Chromium security changes
    const userDataDir = path.join(
      process.cwd(),
      "test-data",
      `electron-user-data-${Date.now()}`
    );
    fs.mkdirSync(userDataDir, { recursive: true });

    const electronBinary = path.join(
      projectRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "electron.cmd" : "electron"
    );

    if (!fs.existsSync(electronBinary)) {
      throw new Error(
        `Electron binary not found at ${electronBinary}. Did you run pnpm install?`
      );
    }

    const launchArgs = [mainPath, `--user-data-dir=${userDataDir}`];

    const encryptionKey =
      process.env.ENCRYPTION_KEY_BASE64 ??
      crypto.randomBytes(32).toString("base64");
    process.env.ENCRYPTION_KEY_BASE64 = encryptionKey;

    const app = await electron.launch({
      executablePath: electronBinary,
      args: launchArgs,
      env: {
        ...process.env,
        NODE_ENV: "test",
        JUSTICE_DB_PATH: dbPath,
        ENCRYPTION_KEY_BASE64: encryptionKey,
        NODE_OPTIONS: "--import=tsx",
        // Disable dev server in test mode
        VITE_DEV_SERVER_URL: "",
      },
      timeout,
    });

    const childProcess = app.process();
    childProcess?.stdout?.on("data", (chunk: Buffer) => {
      console.warn(`[Main stdout] ${chunk.toString()}`.trim());
    });
    childProcess?.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[Main stderr] ${chunk.toString()}`.trim());
    });

    // Wait for first window
    const window = await app.firstWindow({
      timeout,
    });

    // ✅ FIX #1: Capture renderer process console output for debugging
    window.on("console", (msg: any) => {
      const type = msg.type();
      const text = msg.text();
      console.warn(`[Renderer ${type}] ${text}`);
    });

    // Wait for app to be fully loaded
    // We'll wait for the main content area to be visible
    await window.waitForLoadState("domcontentloaded", { timeout });
    await window.waitForSelector("body", { timeout });

    // Give React time to hydrate
    await window.waitForTimeout(2000);

    console.warn("Electron app launched successfully");

    return { window, dbPath };
  } catch (error) {
    console.error("Failed to launch Electron app:", error);
    // Cleanup database on failure
    await cleanupTestDatabase(dbPath);
    throw error;
  }
}

/**
 * Close web app and cleanup test database
 */
export async function closeWebApp(
  testApp: WebTestApp | ElectronTestApp | undefined
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

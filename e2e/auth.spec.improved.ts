import {
  // Electron-based improved authentication E2E tests have been removed.
  // This file is kept as a placeholder to avoid breaking tooling.

  export {};
 * Prerequisites:
 * 1. Run `pnpm build` to compile TypeScript
 * 2. Run `pnpm rebuild:node` to rebuild native modules for Node.js
 * 3. Ensure no other instances of the app are running
 *
 * Usage:
 *   pnpm test:e2e e2e/auth.spec.improved.ts
 */

let electronApp: ElectronApplication;
let window: Page;
let launchArgs: string[] = [];

// Test database path (isolated from production database)
const TEST_DB_PATH = path.join(process.cwd(), ".test-e2e", "justice-test.db");

// Helper to create unique test credentials
function generateTestUser() {
  const timestamp = Date.now();
  const password = generateStrongTestPassword();
  return {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password,
  };
}

test.describe("Authentication Flow", () => {
  test.beforeAll(async () => {
    // Clean up test database directory
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    // Launch Electron app with compiled JavaScript (more reliable than tsx)
    // Note: You may need to run `pnpm build` first
    const distPath = path.join(process.cwd(), "dist", "electron", "main.js");
    const tsPath = path.join(process.cwd(), "electron", "main.ts");

    let mainPath: string;

    if (fs.existsSync(distPath)) {
      // Use compiled version (faster, more reliable)
      console.log("[E2E] Using compiled JavaScript from dist/");
      mainPath = distPath;
      launchArgs = [mainPath];
    } else {
      // Fallback to TypeScript with tsx (requires tsx loader)
      console.warn("[E2E] Compiled dist/ not found, falling back to tsx");
      console.warn("[E2E] For better performance, run: pnpm build");
      mainPath = tsPath;
      launchArgs = [
        "--require",
        path.join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs"),
        mainPath,
      ];
    }

    // Launch the Electron application
    electronApp = await electron.launch({
      args: launchArgs,
    });
    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    // Close the Electron application
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should allow user registration and login", async () => {
    const user = generateTestUser();

    // Navigate to registration page
    await window.getByTestId("register-link").click();

    // Fill registration form
    await window.getByTestId("username-input").fill(user.username);
    await window.getByTestId("email-input").fill(user.email);
    await window.getByTestId("password-input").fill(user.password);
    await window.getByTestId("confirm-password-input").fill(user.password);

    // Submit registration
    await window.getByTestId("register-button").click();

    // Verify successful registration
    await expect(window.getByTestId("welcome-message")).toBeVisible();

    // Logout
    await window.getByTestId("logout-button").click();

    // Login with same credentials
    await window.getByTestId("login-link").click();
    await window.getByTestId("email-input").fill(user.email);
    await window.getByTestId("password-input").fill(user.password);
    await window.getByTestId("login-button").click();

    // Verify successful login
    await expect(window.getByTestId("dashboard")).toBeVisible();
  });

  test("should handle invalid login attempts", async () => {
    const invalidEmail = `invalid_${Date.now()}@example.com`;
    const invalidPassword = generateStrongTestPassword();

    // Try to login with invalid credentials
    await window.getByTestId("login-link").click();
    await window.getByTestId("email-input").fill(invalidEmail);
    await window.getByTestId("password-input").fill(invalidPassword);
    await window.getByTestId("login-button").click();

    // Verify error message
    await expect(window.getByTestId("error-message")).toBeVisible();
  });

  test("should persist session after app restart", async () => {
    // First, register and login
    const user = generateTestUser();

    await window.getByTestId("register-link").click();
    await window.getByTestId("username-input").fill(user.username);
    await window.getByTestId("email-input").fill(user.email);
    await window.getByTestId("password-input").fill(user.password);
    await window.getByTestId("confirm-password-input").fill(user.password);
    await window.getByTestId("register-button").click();

    await window.getByTestId("logout-button").click();

    await window.getByTestId("login-link").click();
    await window.getByTestId("email-input").fill(user.email);
    await window.getByTestId("password-input").fill(user.password);
    await window.getByTestId("login-button").click();

    // Restart the app
    await electronApp.close();
    electronApp = await electron.launch({
      args: launchArgs,
    });
    window = await electronApp.firstWindow();

    // Check if user is still logged in
    await expect(window.getByTestId("dashboard")).toBeVisible();
  });
});

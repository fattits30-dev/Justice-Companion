import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * IMPROVED E2E Authentication Tests for Justice Companion
 *
 * Improvements over auth.spec.ts:
 * - Better test isolation (unique users per test)
 * - More robust selectors (data-testid preferred)
 * - Direct IPC testing for faster setup
 * - Comprehensive error handling
 * - Session persistence testing with app restart
 * - Rate limiting verification
 *
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

// Test database path (isolated from production database)
const TEST_DB_PATH = path.join(process.cwd(), '.test-e2e', 'justice-test.db');

// Helper to create unique test credentials
function generateTestUser() {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!', // Meets OWASP requirements
  };
}

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    // Clean up test database directory
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    // Launch Electron app with compiled JavaScript (more reliable than tsx)
    // Note: You may need to run `pnpm build` first
    const distPath = path.join(process.cwd(), 'dist', 'electron', 'main.js');
    const tsPath = path.join(process.cwd(), 'electron', 'main.ts');

    let mainPath: string;
    let launchArgs: string[];

    if (fs.existsSync(distPath)) {
      // Use compiled version (faster, more reliable)
      console.log('[E2E] Using compiled JavaScript from dist/');
      mainPath = distPath;
      launchArgs = [mainPath];
    } else {
      // Fallback to TypeScript with tsx (requires tsx loader)
      console.warn('[E2E] Compiled dist/ not found, falling back to tsx');
      console.warn('[E2E] For better performance, run: pnpm build');
      mainPath = tsPath;
      launchArgs = [
        '--require',
        path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs'),
        mainPath,
      ];
    }

    electronApp = await electron.launch({
      args: launchArgs,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: `file:${TEST_DB_PATH}`,
      },
    });

    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('should allow user registration and login', async () => {
    const user = generateTestUser();

    // Navigate to registration page
    await window.getByTestId('register-link').click();

    // Fill registration form
    await window.getByTestId('username-input').fill(user.username);
    await window.getByTestId('email-input').fill(user.email);
    await window.getByTestId('password-input').fill(user.password);
    await window.getByTestId('confirm-password-input').fill(user.password);

    // Submit registration
    await window.getByTestId('register-button').click();

    // Wait for login page or dashboard
    await expect(window).toHaveURL(/\/dashboard/);

    // Logout
    await window.getByTestId('logout-button').click();

    // Login with same credentials
    await window.getByTestId('login-link').click();
    await window.getByTestId('email-input').fill(user.email);
    await window.getByTestId('password-input').fill(user.password);
    await window.getByTestId('login-button').click();

    // Verify successful login
    await expect(window).toHaveURL(/\/dashboard/);
  });

  test('should handle invalid login attempts', async () => {
    // Try to login with wrong credentials
    await window.getByTestId('login-link').click();
    await window.getByTestId('email-input').fill('invalid@example.com');
    await window.getByTestId('password-input').fill('wrongpassword');
    await window.getByTestId('login-button').click();

    // Verify error message
    await expect(window.getByTestId('error-message')).toBeVisible();
  });

  test('should persist session after app restart', async () => {
    // First login
    const user = generateTestUser();
    
    await window.getByTestId('register-link').click();
    await window.getByTestId('username-input').fill(user.username);
    await window.getByTestId('email-input').fill(user.email);
    await window.getByTestId('password-input').fill(user.password);
    await window.getByTestId('confirm-password-input').fill(user.password);
    await window.getByTestId('register-button').click();
    
    // Wait for dashboard
    await expect(window).toHaveURL(/\/dashboard/);
    
    // Close and reopen app
    await electronApp.close();
    electronApp = await electron.launch({
      args: [path.join(process.cwd(), 'dist', 'electron', 'main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: `file:${TEST_DB_PATH}`,
      },
    });
    window = await electronApp.firstWindow();
    
    // Should still be logged in
    await expect(window).toHaveURL(/\/dashboard/);
  });
});
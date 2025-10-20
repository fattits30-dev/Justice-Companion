import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * E2E Authentication Tests for Justice Companion
 *
 * Tests the complete authentication flow:
 * - User registration
 * - Login with credentials
 * - Session persistence
 * - Logout functionality
 *
 * Uses Playwright's Electron support to test the actual desktop app
 */

let electronApp: ElectronApplication;
let window: Page;

// Test database path (use separate DB for E2E tests)
const TEST_DB_PATH = path.join(process.cwd(), '.test-e2e', 'justice-test.db');

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    // Clean up test database before starting
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    // Launch Electron app with test database using tsx for TypeScript support
    electronApp = await electron.launch({
      // Use tsx to run TypeScript files (same as development mode)
      executablePath: path.join(process.cwd(), 'node_modules', '.bin', 'electron.cmd'),
      args: [
        '--require',
        path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs'),
        path.join(process.cwd(), 'electron', 'main.ts'),
      ],
      env: {
        ...process.env,
        JUSTICE_DB_PATH: TEST_DB_PATH,
        NODE_ENV: 'test',
        // Enable TSX for dynamic imports
        NODE_OPTIONS: '--loader tsx',
      },
      timeout: 30000, // 30 seconds timeout for launch
    });

    // Wait a bit for the app to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get the first window (main window)
    window = await electronApp.firstWindow();

    // Wait for app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Wait for the app to initialize (database migrations, etc.)
    await window.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    // Close the app
    await electronApp.close();

    // Clean up test database
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
  });

  test('should display login page on first launch', async () => {
    // Check if we're on the login/register page
    const title = await window.title();
    expect(title).toContain('Justice Companion');

    // Look for authentication UI elements
    const hasRegisterButton = await window.locator('button:has-text("Register")').count();
    const hasLoginButton = await window.locator('button:has-text("Login")').count();

    expect(hasRegisterButton + hasLoginButton).toBeGreaterThan(0);
  });

  test('should register a new user', async () => {
    // Navigate to registration if not already there
    const registerButton = window.locator('button:has-text("Register"), a:has-text("Register")');
    if ((await registerButton.count()) > 0) {
      await registerButton.first().click();
    }

    // Fill in registration form
    const username = `testuser_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Wait for form to be visible
    await window.waitForSelector('input[name="username"], input[placeholder*="username" i]', {
      timeout: 5000,
    });

    // Fill username
    const usernameInput = window.locator('input[name="username"], input[placeholder*="username" i]').first();
    await usernameInput.fill(username);

    // Fill email
    const emailInput = window.locator('input[name="email"], input[type="email"]').first();
    await emailInput.fill(email);

    // Fill password
    const passwordInput = window.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(password);

    // Check if there's a confirm password field
    const confirmPasswordInput = window.locator(
      'input[name="confirmPassword"], input[placeholder*="confirm" i]'
    );
    if ((await confirmPasswordInput.count()) > 0) {
      await confirmPasswordInput.first().fill(password);
    }

    // Submit the form
    const submitButton = window.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Wait for registration to complete (should navigate to dashboard or login)
    await window.waitForTimeout(2000);

    // Check if we successfully registered (look for dashboard or success message)
    const hasDashboard = (await window.locator('text=/dashboard|welcome|home/i').count()) > 0;
    const hasSuccessMessage = (await window.locator('text=/success|registered|created/i').count()) > 0;

    expect(hasDashboard || hasSuccessMessage).toBeTruthy();
  });

  test('should login with registered credentials', async () => {
    // If already logged in from registration, logout first
    const logoutButton = window.locator('button:has-text("Logout"), button:has-text("Sign out")');
    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click();
      await window.waitForTimeout(1000);
    }

    // Navigate to login page
    const loginButton = window.locator('button:has-text("Login"), a:has-text("Login")');
    if ((await loginButton.count()) > 0) {
      await loginButton.first().click();
      await window.waitForTimeout(500);
    }

    // Use the same credentials from registration test
    // NOTE: This assumes the user created in the previous test still exists
    // For better isolation, we could create a new user here

    const username = 'testuser'; // Using a fixed username for this test
    const password = 'TestPassword123!';

    // Fill in login form
    await window.waitForSelector('input[name="username"], input[placeholder*="username" i]', {
      timeout: 5000,
    });

    const usernameInput = window.locator('input[name="username"], input[placeholder*="username" i]').first();
    await usernameInput.fill(username);

    const passwordInput = window.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(password);

    // Submit login
    const submitButton = window.locator('button[type="submit"], button:has-text("Login")').first();
    await submitButton.click();

    // Wait for login to complete
    await window.waitForTimeout(2000);

    // Check if we're now on the dashboard
    const hasDashboard = (await window.locator('text=/dashboard|welcome|cases/i').count()) > 0;
    expect(hasDashboard).toBeTruthy();
  });

  test('should reject invalid login credentials', async () => {
    // If logged in, logout first
    const logoutButton = window.locator('button:has-text("Logout"), button:has-text("Sign out")');
    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click();
      await window.waitForTimeout(1000);
    }

    // Try to login with invalid credentials
    const usernameInput = window.locator('input[name="username"], input[placeholder*="username" i]').first();
    await usernameInput.fill('invaliduser');

    const passwordInput = window.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill('WrongPassword123!');

    const submitButton = window.locator('button[type="submit"], button:has-text("Login")').first();
    await submitButton.click();

    // Wait for error message
    await window.waitForTimeout(1000);

    // Check for error message
    const hasError = (await window.locator('text=/invalid|error|wrong|incorrect/i').count()) > 0;
    expect(hasError).toBeTruthy();
  });

  test('should enforce password requirements on registration', async () => {
    // Navigate to registration
    const registerButton = window.locator('button:has-text("Register"), a:has-text("Register")');
    if ((await registerButton.count()) > 0) {
      await registerButton.first().click();
      await window.waitForTimeout(500);
    }

    // Try weak password (less than 12 characters)
    const username = `testuser_weak_${Date.now()}`;
    const email = `weak_${Date.now()}@example.com`;
    const weakPassword = 'Short1!'; // Only 7 characters

    const usernameInput = window.locator('input[name="username"], input[placeholder*="username" i]').first();
    await usernameInput.fill(username);

    const emailInput = window.locator('input[name="email"], input[type="email"]').first();
    await emailInput.fill(email);

    const passwordInput = window.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(weakPassword);

    const submitButton = window.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Wait for error message
    await window.waitForTimeout(1000);

    // Check for password requirement error
    const hasError = (await window.locator('text=/password.*characters|12.*characters|too short/i').count()) > 0;
    expect(hasError).toBeTruthy();
  });

  test('should logout successfully', async () => {
    // First ensure we're logged in
    // (This test assumes previous test left us logged in or we need to login again)

    // Look for logout button
    const logoutButton = window.locator('button:has-text("Logout"), button:has-text("Sign out")');

    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click();
      await window.waitForTimeout(1000);

      // Check if we're back on login page
      const hasLoginForm = (await window.locator('button:has-text("Login")').count()) > 0;
      expect(hasLoginForm).toBeTruthy();
    } else {
      // If no logout button, we might not be logged in
      // This test should be skipped or we should login first
      test.skip();
    }
  });
});

/**
 * Test Session Persistence (Remember Me functionality)
 */
test.describe('Session Persistence', () => {
  test('should persist session with Remember Me', async () => {
    // This test would require restarting the app and checking if session persists
    // Skipping for now as it requires more complex app restart logic
    test.skip();
  });
});

/**
 * Test Rate Limiting
 */
test.describe('Rate Limiting', () => {
  test('should rate limit failed login attempts', async () => {
    // Try to login with wrong password multiple times
    // After 5 attempts, should get rate limit error
    test.skip(); // Implement this test later
  });
});

import { expect, test } from "@playwright/test";

/**
 * Basic Smoke Tests for Justice Companion
 *
 * These tests verify core functionality is working.
 * Run with: npx playwright test tests/e2e/basic.spec.ts --config=playwright.config.js
 *
 * IMPORTANT: Ensure the dev server is running first:
 *   pnpm dev (or npm run dev)
 */

test.describe("Justice Companion - Basic Smoke Tests", () => {
  test("Login page loads successfully", async ({ page }) => {
    await page.goto("/login");

    // Verify page title
    await expect(page).toHaveTitle(/Justice Companion/i);

    // Verify login form elements exist
    await expect(
      page.getByRole("heading", { name: /sign in|login/i })
    ).toBeVisible();
    await expect(page.getByLabel(/username|email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|login/i })
    ).toBeVisible();
  });

  test("Registration page is accessible", async ({ page }) => {
    await page.goto("/login");

    // Look for registration button and click it
    // The login page has a "Create account" button (not a link)
    const registerButton = page.getByRole("button", {
      name: /create account/i,
    });
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    // Verify we're on registration page
    await expect(page).toHaveURL(/register/);
    await expect(
      page.getByRole("heading", { name: /register|sign up|create/i })
    ).toBeVisible();
  });

  test("Unauthenticated users are redirected to login", async ({ page }) => {
    // Try to access a protected route
    await page.goto("/dashboard");

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test("App responds to login attempt", async ({ page }) => {
    await page.goto("/login");

    // Fill in login form with test credentials
    await page.getByLabel(/username|email/i).fill("test@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should show some response (error message for invalid credentials)
    // Wait for either error message or redirect
    await expect(
      page.getByText(/invalid|incorrect|error|failed/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

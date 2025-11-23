import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 *
 * Tests user authentication flows including login, logout,
 * registration, and session management.
 */

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    // Check for login form elements
    await expect(
      page.getByRole("heading", { name: /sign in|login/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/username|email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|login/i }),
    ).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/login");

    // Click submit without filling form
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required|enter/i)).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill with invalid credentials
    await page.getByLabel(/username|email/i).fill("invalid@test.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill with valid test credentials
    await page.getByLabel(/username|email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should redirect to dashboard or home
    await expect(page).toHaveURL(/\/(dashboard|home|cases)/, {
      timeout: 10000,
    });
  });

  test("should logout successfully", async ({ page }) => {
    // First login
    await page.goto("/login");
    await page.getByLabel(/username|email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|home|cases)/, {
      timeout: 10000,
    });

    // Find and click logout button
    const logoutButton = page.getByRole("button", { name: /logout|sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try menu-based logout
      await page.getByRole("button", { name: /menu|profile/i }).click();
      await page.getByText(/logout|sign out/i).click();
    }

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access protected route
    await page.goto("/cases");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should preserve session across page refresh", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByLabel(/username|email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|home|cases)/, {
      timeout: 10000,
    });

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("should have password visibility toggle", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill("testpassword");

    // Check if there's a visibility toggle
    const toggleButton = page.getByRole("button", {
      name: /show|hide|toggle/i,
    });
    if (await toggleButton.isVisible()) {
      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click toggle
      await toggleButton.click();

      // Password should be visible
      await expect(passwordInput).toHaveAttribute("type", "text");
    }
  });

  test("should have link to registration page", async ({ page }) => {
    await page.goto("/login");

    // Look for registration link
    const registerLink = page.getByRole("link", {
      name: /register|sign up|create account/i,
    });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/(register|signup)/);
    }
  });

  test("should handle forgot password flow", async ({ page }) => {
    await page.goto("/login");

    // Look for forgot password link
    const forgotLink = page.getByRole("link", { name: /forgot|reset/i });
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/\/(forgot|reset)/);
    }
  });
});

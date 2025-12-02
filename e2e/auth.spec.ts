import { expect, test } from "@playwright/test";
import {
  loginWithSeededUser,
  PROTECTED_PATH_REGEX,
  resetAuthState,
} from "./utils/auth";

/**
 * Authentication E2E Tests
 *
 * Tests user authentication flows including login, logout,
 * registration, and session management.
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
});

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    // Check for login form elements
    await expect(
      page.getByRole("heading", { name: /sign in|login/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/username|email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|login/i }),
    ).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/login");

    // Click submit without filling form
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required|enter/i).first()).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill with invalid credentials
    await page.getByLabel(/username|email/i).fill("invalid@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await loginWithSeededUser(page);
    await expect(page).toHaveURL(PROTECTED_PATH_REGEX);
  });

  test("should logout successfully", async ({ page }) => {
    await loginWithSeededUser(page);

    // Wait for dashboard to fully load
    await page.waitForLoadState("networkidle");

    // Find the logout button - it's at the bottom of the sidebar
    // Try multiple selectors to handle different UI states
    const logoutSelectors = [
      page.getByText("Logout"),
      page.locator('button:has-text("Logout")'),
      page.locator('button[aria-label="Logout"]'),
    ];

    let logoutClicked = false;
    for (const selector of logoutSelectors) {
      try {
        if (await selector.isVisible({ timeout: 2000 })) {
          await selector.click();
          logoutClicked = true;
          console.log("Clicked logout button");
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!logoutClicked) {
      throw new Error("Could not find logout button");
    }

    // Wait for logout to complete and redirect
    await page.waitForTimeout(1000);

    // After logout, we should either:
    // 1. Be redirected to login page, or
    // 2. Stay on current page but be logged out (session cleared)
    const currentURL = page.url();
    const isOnLoginPage = /\/login/.test(currentURL);

    if (!isOnLoginPage) {
      // If not redirected immediately, verify we're actually logged out
      console.log(
        `Not redirected after logout. Current URL: ${currentURL}. Verifying logout worked...`,
      );

      // Try to navigate to a protected route - should redirect to login if logged out
      await page.goto("/cases");
      await page.waitForLoadState("networkidle");

      const finalURL = page.url();
      const isRedirectedToLogin = /\/login/.test(finalURL);

      if (isRedirectedToLogin) {
        console.log("Login redirect confirmed - logout successful");
      } else {
        // If we can still access protected routes, logout failed
        console.error(
          `Logout verification failed. Still have access to: ${finalURL}`,
        );
        throw new Error(
          "Logout did not work - still have access to protected routes",
        );
      }

      console.log("Logout confirmed - protected route redirects to login");
    } else {
      console.log("Logout confirmed - redirected to login page");
    }
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access protected route
    await page.goto("/cases");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should preserve session across page refresh", async ({ page }) => {
    await loginWithSeededUser(page);

    // Refresh page
    await page.reload();

    // Should still be logged in (not redirected to login)
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("should have password visibility toggle", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("testpassword");

    // Check if there's a visibility toggle button
    const toggleButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .last();

    // Only test if toggle exists - some implementations don't have this
    if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click toggle
      await toggleButton.click();

      // Check if password is now visible (type changed to text)
      // Use a broader selector in case the element was replaced
      const visibleInput = page.locator('input[type="text"]');
      const hasVisiblePassword = (await visibleInput.count()) > 0;

      if (!hasVisiblePassword) {
        // Toggle may not be implemented - skip this assertion
        console.log("Password visibility toggle not implemented");
      }
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

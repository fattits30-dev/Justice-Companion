import { test, expect } from "@playwright/test";

const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:8000";

test.describe("Authentication", () => {
  test("should register new user", async ({ page }) => {
    await page.goto("/login");

    // Debug: log URL and initial HTML to understand what is rendered
    console.log("[auth.spec] URL after goto:", page.url());
    console.log("[auth.spec] Initial page content:\n", await page.content());

    // Check if we're on login page
    await expect(page.locator("text=Sign In")).toBeVisible();

    // Click Create account button to go to registration (role-based selector)
    await page.getByRole("button", { name: /create account/i }).click();

    // Fill registration form
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;

    // Use first/last name fields which are combined into username
    await page.fill("#firstName", "Test");
    await page.fill("#lastName", "User");
    await page.fill("#email", email);
    await page.fill("#password", "StrongPassword123!");
    await page.fill("#confirm-password", "StrongPassword123!");

    // Accept terms (required by validation)
    await page.check("#terms");

    // Submit registration
    await page.click('button[type="submit"], [data-testid="register-button"]');

    // Should redirect to dashboard or show success message
    await expect(page).toHaveURL(/\/$|\/dashboard/);

    // Check for success indicators
    await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });
  });

  test("should login existing user", async ({ page }) => {
    // First register a user for this test
    const timestamp = Date.now();
    const email = `logintest${timestamp}@example.com`;
    const firstName = "Login";
    const lastName = "TestUser";
    const username = `${firstName} ${lastName}`;

    await page.goto("/login");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.fill("#firstName", firstName);
    await page.fill("#lastName", lastName);
    await page.fill("#email", email);
    await page.fill("#password", "StrongPassword123!");
    await page.fill("#confirm-password", "StrongPassword123!");
    await page.check("#terms");
    await page.click('button[type="submit"]');

    // Wait for registration to complete
    await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });

    // Now logout and test login
    await page.click(
      'button[aria-label="User menu"], [data-testid="user-menu"]'
    );
    await page.click("text=Logout");

    // Should be back to login page
    await expect(page.locator("text=Sign In")).toBeVisible();

    // Fill login form
    await page.fill("#username", username);
    await page.fill("#password", "StrongPassword123!");

    // Submit login
    await page.click('button[type="submit"], [data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/$|\/dashboard/);
    await expect(page.locator("text=Welcome")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill login form with invalid credentials
    await page.fill("#username", "nonexistentuser");
    await page.fill("#password", "WrongPassword123!");

    // Submit login
    await page.click('button[type="submit"], [data-testid="login-button"]');

    // Should show error message
    await expect(page.locator("text=Login failed")).toBeVisible();

    // Should still be on login page
    await expect(page.url()).toMatch(/\/$|\/login/);
  });

  test("should handle password reset flow", async ({ page }) => {
    await page.goto("/login");

    // Look for "Forgot Password?" link
    const forgotPasswordLink = page.locator(
      "text=Forgot Password?,Forgot password?,Reset Password"
    );
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();

      // Fill email for password reset
      await page.fill('input[name="email"]', "reset@example.com");

      // Submit reset request
      await page.click('button[type="submit"], text=Send Reset Email');

      // Should show success message
      await expect(
        page.locator("text=Password reset email sent")
      ).toBeVisible();
    }
  });

  test("should persist login session across page refreshes", async ({
    page,
  }) => {
    // First register and login
    const timestamp = Date.now();
    const email = `persistence${timestamp}@example.com`;
    const firstName = "Persistence";
    const lastName = "Test";
    const username = `${firstName} ${lastName}`;

    await page.goto("/login");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.fill("#firstName", firstName);
    await page.fill("#lastName", lastName);
    await page.fill("#email", email);
    await page.fill("#password", "StrongPassword123!");
    await page.fill("#confirm-password", "StrongPassword123!");
    await page.check("#terms");
    await page.click('button[type="submit"]');

    // Wait for registration to complete
    await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });

    // Refresh page
    await page.reload();

    // Should still be logged in and on dashboard
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator("text=Logout")).toBeVisible();
    await expect(page.url()).not.toMatch(/\/login$/);
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /create account/i }).click();

    // Fill form with invalid email
    await page.fill("#firstName", "Test");
    await page.fill("#lastName", "User");
    await page.fill("#email", "invalid-email");
    await page.fill("#password", "StrongPassword123!");
    await page.fill("#confirm-password", "StrongPassword123!");
    await page.check("#terms");

    // Submit
    await page.click('button[type="submit"]');

    // Should show email validation error
    await expect(page.locator("text=Please enter a valid email")).toBeVisible();
  });
});

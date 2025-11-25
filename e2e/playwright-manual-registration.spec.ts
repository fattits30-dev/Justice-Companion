import { expect, Page, test } from "@playwright/test";
import { generateTestPassword, TEST_CONFIG } from "./testConfig";

async function loginNewlyRegisteredUser(
  page: Page,
  email: string,
  password: string
) {
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  await page.getByLabel(/username|email/i).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Manual Registration Flow Test
 * Based on successful Playwright manual navigation demonstration
 * Tests the complete user registration and login flow
 */

test.describe("Manual Registration Flow", () => {
  test("should successfully register a new user and navigate to dashboard", async ({
    page,
  }) => {
    // Generate unique user data with timestamp
    const timestamp = Date.now();
    const firstName = `Claude${timestamp}`;
    const lastName = "TestUser";
    const email = `claude.test${timestamp}@example.com`;
    const password = generateTestPassword();

    // Step 1: Navigate to login page
    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await expect(page).toHaveURL(/\/login/);

    // Step 2: Verify login page loaded
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Step 3: Click "Create account" button
    await page.getByRole("button", { name: /create account/i }).click();

    // Step 4: Verify navigation to registration page
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: /create account/i })
    ).toBeVisible();

    // Step 5: Fill registration form
    await page.getByRole("textbox", { name: /first name/i }).fill(firstName);
    await page.getByRole("textbox", { name: /last name/i }).fill(lastName);
    await page.getByRole("textbox", { name: /email/i }).fill(email);
    await page.getByRole("textbox", { name: /^password$/i }).fill(password);
    await page
      .getByRole("textbox", { name: /confirm password/i })
      .fill(password);
    await page
      .getByRole("checkbox", { name: /i agree to the terms/i })
      .setChecked(true);

    // Step 6: Submit registration form
    await page.getByRole("button", { name: /sign up/i }).click();

    // Step 7: Verify redirected to login and then sign in with new credentials
    await loginNewlyRegisteredUser(page, email, password);

    // Step 8: Verify dashboard content
    await expect(
      page.getByRole("heading", { name: /welcome to justice companion/i })
    ).toBeVisible();

    // Step 9: Verify user is logged in (check for user profile button)
    await expect(
      page.getByRole("button", { name: /open profile manager/i })
    ).toBeVisible();

    // Step 10: Verify dashboard stats are displayed
    await expect(page.getByText(/your cases/i).first()).toBeVisible();
    await expect(page.getByText(/currently active/i).first()).toBeVisible();
    await expect(page.getByText(/evidence collected/i).first()).toBeVisible();

    // Step 11: Verify quick action buttons are available
    await expect(page.getByRole("button", { name: /new case/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /upload evidence/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /start chat/i })
    ).toBeVisible();

    // Step 12: Verify user info in profile section
    const profileButton = page.getByRole("button", {
      name: /open profile manager/i,
    });
    await expect(profileButton).toContainText(firstName);
    await expect(profileButton).toContainText(email);

    // Step 13: Take screenshot for documentation
    await page.screenshot({
      path: `e2e-tests/screenshots/successful-registration-${timestamp}.png`,
      fullPage: true,
    });
  });

  test("should persist session after page refresh", async ({ page }) => {
    // First, register a new user
    const timestamp = Date.now();
    const firstName = `Persist${timestamp}`;
    const lastName = "Test";
    const email = `persist${timestamp}@example.com`;
    const password = generateTestPassword();

    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.getByRole("textbox", { name: /first name/i }).fill(firstName);
    await page.getByRole("textbox", { name: /last name/i }).fill(lastName);
    await page.getByRole("textbox", { name: /email/i }).fill(email);
    await page.getByRole("textbox", { name: /^password$/i }).fill(password);
    await page
      .getByRole("textbox", { name: /confirm password/i })
      .fill(password);
    await page
      .getByRole("checkbox", { name: /i agree to the terms/i })
      .setChecked(true);

    await page.getByRole("button", { name: /sign up/i }).click();
    await loginNewlyRegisteredUser(page, email, password);

    // Refresh the page
    await page.reload();

    // Verify user is still logged in
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /welcome to justice companion/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /open profile manager/i })
    ).toBeVisible();
  });

  test("should handle logout and return to login page", async ({ page }) => {
    // Register a new user
    const timestamp = Date.now();
    const firstName = `Logout${timestamp}`;
    const lastName = "Test";
    const email = `logout${timestamp}@example.com`;
    const password = generateTestPassword();

    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.getByRole("textbox", { name: /first name/i }).fill(firstName);
    await page.getByRole("textbox", { name: /last name/i }).fill(lastName);
    await page.getByRole("textbox", { name: /email/i }).fill(email);
    await page.getByRole("textbox", { name: /^password$/i }).fill(password);
    await page
      .getByRole("textbox", { name: /confirm password/i })
      .fill(password);
    await page
      .getByRole("checkbox", { name: /i agree to the terms/i })
      .setChecked(true);

    await page.getByRole("button", { name: /sign up/i }).click();
    await loginNewlyRegisteredUser(page, email, password);

    // Click logout button
    await page.getByRole("button", { name: /logout/i }).click();

    // Verify redirected to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("should validate password match requirement", async ({ page }) => {
    const timestamp = Date.now();
    const password = generateTestPassword();

    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.getByRole("button", { name: /create account/i }).click();

    // Fill form with mismatched passwords
    await page
      .getByRole("textbox", { name: /first name/i })
      .fill(`Test${timestamp}`);
    await page.getByRole("textbox", { name: /last name/i }).fill("User");
    await page
      .getByRole("textbox", { name: /email/i })
      .fill(`test${timestamp}@example.com`);
    await page.getByRole("textbox", { name: /^password$/i }).fill(password);
    await page
      .getByRole("textbox", { name: /confirm password/i })
      .fill(`${password}MISMATCH`);
    await page
      .getByRole("checkbox", { name: /i agree to the terms/i })
      .setChecked(true);

    // Try to submit
    await page.getByRole("button", { name: /sign up/i }).click();

    // Should show validation error and stay on registration page
    await expect(page).toHaveURL(/\/register/);
    // The form should prevent submission or show error
    await expect(page.getByRole("button", { name: /sign up/i })).toBeVisible();
  });

  test("should require terms acceptance", async ({ page }) => {
    const timestamp = Date.now();
    const password = generateTestPassword();

    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.getByRole("button", { name: /create account/i }).click();

    // Fill form but don't accept terms
    await page
      .getByRole("textbox", { name: /first name/i })
      .fill(`Test${timestamp}`);
    await page.getByRole("textbox", { name: /last name/i }).fill("User");
    await page
      .getByRole("textbox", { name: /email/i })
      .fill(`test${timestamp}@example.com`);
    await page.getByRole("textbox", { name: /^password$/i }).fill(password);
    await page
      .getByRole("textbox", { name: /confirm password/i })
      .fill(password);
    // Don't check the terms checkbox

    // Try to submit
    await page.getByRole("button", { name: /sign up/i }).click();

    // Should stay on registration page
    await expect(page).toHaveURL(/\/register/);
  });
});

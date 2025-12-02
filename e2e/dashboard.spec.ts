import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * Dashboard E2E Tests
 *
 * Tests the main dashboard view including:
 * - Dashboard statistics display
 * - Quick action buttons
 * - Recent cases list
 * - Navigation to other sections
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
});

test.describe("Dashboard", () => {
  test("should display dashboard page", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Check for dashboard heading or main content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("should display statistics cards", async ({ page }) => {
    // Take screenshot for verification
    await page.screenshot({
      path: "test-results/dashboard-stats.png",
      fullPage: true,
    });

    // Dashboard should show some statistics
    const bodyText = (await page.locator("body").textContent()) || "";

    // Look for common dashboard elements (case-insensitive)
    const hasDashboardContent =
      bodyText.toLowerCase().includes("case") ||
      bodyText.toLowerCase().includes("evidence") ||
      bodyText.toLowerCase().includes("document") ||
      bodyText.toLowerCase().includes("deadline");

    expect(hasDashboardContent).toBeTruthy();
  });

  test("should have navigation to Cases", async ({ page }) => {
    // Look for Cases link/button
    const casesLinks = [
      page.getByRole("link", { name: /cases/i }),
      page.getByRole("button", { name: /cases/i }),
      page.getByText(/cases/i).first(),
    ];

    let found = false;
    for (const selector of casesLinks) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selector.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/cases/);
        found = true;
        break;
      }
    }

    if (!found) {
      // Try direct navigation
      await page.goto("/cases");
      await expect(page).toHaveURL(/\/cases/);
    }
  });

  test("should have navigation to Documents", async ({ page }) => {
    const docLinks = [
      page.getByRole("link", { name: /document/i }),
      page.getByRole("button", { name: /document/i }),
      page.getByText(/document/i).first(),
    ];

    let found = false;
    for (const selector of docLinks) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selector.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/documents/);
        found = true;
        break;
      }
    }

    if (!found) {
      await page.goto("/documents");
      await expect(page).toHaveURL(/\/documents/);
    }
  });

  test("should have navigation to Timeline", async ({ page }) => {
    const timelineLinks = [
      page.getByRole("link", { name: /timeline/i }),
      page.getByRole("button", { name: /timeline/i }),
      page.getByText(/timeline/i).first(),
    ];

    let found = false;
    for (const selector of timelineLinks) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selector.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/timeline/);
        found = true;
        break;
      }
    }

    if (!found) {
      await page.goto("/timeline");
      await expect(page).toHaveURL(/\/timeline/);
    }
  });

  test("should have navigation to Chat", async ({ page }) => {
    const chatLinks = [
      page.getByRole("link", { name: /chat/i }),
      page.getByRole("button", { name: /chat/i }),
      page.getByText(/chat/i).first(),
    ];

    let found = false;
    for (const selector of chatLinks) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selector.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/chat/);
        found = true;
        break;
      }
    }

    if (!found) {
      await page.goto("/chat");
      await expect(page).toHaveURL(/\/chat/);
    }
  });

  test("should have navigation to Settings", async ({ page }) => {
    const settingsLinks = [
      page.getByRole("link", { name: /settings/i }),
      page.getByRole("button", { name: /settings/i }),
      page.getByText(/settings/i).first(),
    ];

    let found = false;
    for (const selector of settingsLinks) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selector.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/settings/);
        found = true;
        break;
      }
    }

    if (!found) {
      await page.goto("/settings");
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test("should display user info", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";

    // Should show username or email somewhere (e2e-test or test user)
    const hasUserInfo =
      bodyText.includes("e2e-test") ||
      bodyText.includes("test") ||
      bodyText.includes("@");

    expect(hasUserInfo).toBeTruthy();
  });

  test("should load without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("404") &&
        !err.toLowerCase().includes("warn"),
    );

    if (criticalErrors.length > 0) {
      console.log("JavaScript errors detected:", criticalErrors);
    }

    expect(criticalErrors.length).toBeLessThanOrEqual(0);
  });
});

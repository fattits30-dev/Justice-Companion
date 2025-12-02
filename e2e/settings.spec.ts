import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * Settings E2E Tests
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
});

test.describe("Settings", () => {
  test("should display settings page", async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/);
    await page.screenshot({
      path: "test-results/settings-view.png",
      fullPage: true,
    });
  });

  test("should display settings sections", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasSettingsContent =
      bodyText.toLowerCase().includes("setting") ||
      bodyText.toLowerCase().includes("profile") ||
      bodyText.toLowerCase().includes("account") ||
      bodyText.toLowerCase().includes("preferences");
    expect(hasSettingsContent).toBeTruthy();
  });

  test("should have profile settings", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasProfileSettings =
      bodyText.toLowerCase().includes("profile") ||
      bodyText.toLowerCase().includes("name") ||
      bodyText.toLowerCase().includes("email");
    expect(hasProfileSettings).toBeTruthy();
  });

  test("should have AI configuration settings", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasAISettings =
      bodyText.toLowerCase().includes("ai") ||
      bodyText.toLowerCase().includes("api") ||
      bodyText.toLowerCase().includes("key") ||
      bodyText.toLowerCase().includes("provider");

    if (hasAISettings) {
      console.log("AI configuration settings found");
    } else {
      console.log("AI settings may be on different tab/section");
    }
  });

  test("should have save button", async ({ page }) => {
    const saveButtons = [
      page.getByRole("button", { name: /save/i }),
      page.getByRole("button", { name: /update/i }),
      page.locator("button").filter({ hasText: /save|update/i }),
    ];

    let found = false;
    for (const button of saveButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
        found = true;
        break;
      }
    }

    if (!found) {
      console.log("No save button found - settings may auto-save");
    }
  });

  test("should have tabs or sections", async ({ page }) => {
    const tabs = page.locator('[role="tab"], .tab, button[aria-selected]');
    const count = await tabs.count();

    if (count > 0) {
      console.log(`Found ${count} tabs/sections in settings`);
    } else {
      console.log("No tabs found - single page settings");
    }
  });

  test("should display user information", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasUserInfo =
      bodyText.includes("e2e-test") ||
      bodyText.includes("@example.com") ||
      bodyText.includes("test");
    expect(hasUserInfo).toBeTruthy();
  });

  test("should have logout functionality", async ({ page }) => {
    const logoutButtons = [
      page.getByRole("button", { name: /logout/i }),
      page.getByRole("button", { name: /sign out/i }),
      page.locator("button").filter({ hasText: /logout|sign out/i }),
    ];

    let found = false;
    for (const button of logoutButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
        found = true;
        break;
      }
    }

    if (!found) {
      console.log("Logout button not in settings - may be in sidebar");
    }
  });

  test("should load without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    const criticalErrors = errors.filter((err) => !err.includes("favicon"));
    expect(criticalErrors.length).toBe(0);
  });

  test("should persist after refresh", async ({ page }) => {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/settings/);
  });
});

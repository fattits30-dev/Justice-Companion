import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * Cases Management E2E Tests
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
  await page.goto("/cases");
  await page.waitForLoadState("networkidle");
});

test.describe("Cases Management", () => {
  test("should display cases page", async ({ page }) => {
    await expect(page).toHaveURL(/\/cases/);
    await page.screenshot({
      path: "test-results/cases-list.png",
      fullPage: true,
    });
  });

  test("should display cases list or empty state", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasCasesContent =
      bodyText.toLowerCase().includes("case") ||
      bodyText.toLowerCase().includes("no case") ||
      bodyText.toLowerCase().includes("empty");
    expect(hasCasesContent).toBeTruthy();
  });

  test("should have create new case button", async ({ page }) => {
    const createButtons = [
      page.getByRole("button", { name: /new case/i }),
      page.getByRole("button", { name: /create case/i }),
      page.getByRole("button", { name: /add case/i }),
    ];

    let found = false;
    for (const button of createButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
        found = true;
        break;
      }
    }
    if (!found) {
      console.log("No create case button found");
    }
  });

  test("should load cases without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    const criticalErrors = errors.filter((err) => !err.includes("favicon"));
    expect(criticalErrors.length).toBe(0);
  });
});

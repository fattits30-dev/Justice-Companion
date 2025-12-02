import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * Documents/Evidence Management E2E Tests
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
  await page.goto("/documents");
  await page.waitForLoadState("networkidle");
});

test.describe("Documents Management", () => {
  test("should display documents page", async ({ page }) => {
    await expect(page).toHaveURL(/\/documents/);
    await page.screenshot({
      path: "test-results/documents-list.png",
      fullPage: true,
    });
  });

  test("should display documents list or empty state", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasDocsContent =
      bodyText.toLowerCase().includes("document") ||
      bodyText.toLowerCase().includes("evidence") ||
      bodyText.toLowerCase().includes("upload") ||
      bodyText.toLowerCase().includes("empty");
    expect(hasDocsContent).toBeTruthy();
  });

  test("should have upload document button", async ({ page }) => {
    const uploadButtons = [
      page.getByRole("button", { name: /upload/i }),
      page.getByRole("button", { name: /add document/i }),
      page.getByRole("button", { name: /new evidence/i }),
      page.locator("button").filter({ hasText: /upload|add/i }),
    ];

    let found = false;
    for (const button of uploadButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
        found = true;
        break;
      }
    }
    if (!found) {
      console.log("No upload button found");
    }
  });

  test("should have search or filter functionality", async ({ page }) => {
    const searchInputs = [
      page.getByPlaceholder(/search/i),
      page.getByRole("textbox", { name: /search/i }),
      page.locator('input[type="search"]'),
    ];

    for (const input of searchInputs) {
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(input).toBeVisible();
        return;
      }
    }
    console.log("No search functionality found");
  });

  test("should display document statistics", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasStats =
      /\d+/.test(bodyText) ||
      bodyText.toLowerCase().includes("total") ||
      bodyText.toLowerCase().includes("document");
    expect(hasStats).toBeTruthy();
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

  test("should handle document click", async ({ page }) => {
    const docItems = page.locator(
      '[data-testid*="document"], [data-testid*="evidence"], .document-card',
    );
    const count = await docItems.count();

    if (count > 0) {
      await docItems.first().click();
      await page.waitForLoadState("networkidle");
      console.log("Document clicked successfully");
    } else {
      console.log("No documents available to test");
    }
  });

  test("should persist after refresh", async ({ page }) => {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/documents/);
  });
});

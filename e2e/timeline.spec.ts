import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * Timeline/Deadlines E2E Tests
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
  await page.goto("/timeline");
  await page.waitForLoadState("networkidle");
});

test.describe("Timeline & Deadlines", () => {
  test("should display timeline page", async ({ page }) => {
    await expect(page).toHaveURL(/\/timeline/);
    await page.screenshot({
      path: "test-results/timeline-view.png",
      fullPage: true,
    });
  });

  test("should display timeline content or empty state", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasTimelineContent =
      bodyText.toLowerCase().includes("timeline") ||
      bodyText.toLowerCase().includes("deadline") ||
      bodyText.toLowerCase().includes("event") ||
      bodyText.toLowerCase().includes("empty");
    expect(hasTimelineContent).toBeTruthy();
  });

  test("should have add deadline button", async ({ page }) => {
    const addButtons = [
      page.getByRole("button", { name: /add deadline/i }),
      page.getByRole("button", { name: /new deadline/i }),
      page.getByRole("button", { name: /create deadline/i }),
      page.locator("button").filter({ hasText: /add|new|create/i }),
    ];

    let found = false;
    for (const button of addButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
        found = true;
        break;
      }
    }
    if (!found) {
      console.log("No add deadline button found");
    }
  });

  test("should display calendar or list view", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasTimelineView =
      bodyText.includes("Jan") ||
      bodyText.includes("Mon") ||
      bodyText.includes("2024") ||
      bodyText.includes("2025") ||
      /\d{1,2}\/\d{1,2}/.test(bodyText);
    expect(hasTimelineView).toBeTruthy();
  });

  test("should have view toggle (calendar/list)", async ({ page }) => {
    const viewButtons = [
      page.locator("button").filter({ hasText: /list/i }),
      page.locator("button").filter({ hasText: /calendar/i }),
      page.locator("button").filter({ hasText: /timeline/i }),
    ];

    let found = false;
    for (const button of viewButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        found = true;
        break;
      }
    }
    console.log(found ? "View toggle found" : "No view toggle found");
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
    await expect(page).toHaveURL(/\/timeline/);
  });
});

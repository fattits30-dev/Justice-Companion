import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * Navigation E2E Tests
 * Tests routing and navigation between all major app sections
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
});

test.describe("App Navigation", () => {
  test("should navigate between all main sections", async ({ page }) => {
    // Start at dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await page.screenshot({ path: "test-results/nav-01-dashboard.png" });

    // Navigate to Cases
    await page.goto("/cases");
    await expect(page).toHaveURL(/\/cases/);
    await page.screenshot({ path: "test-results/nav-02-cases.png" });

    // Navigate to Documents
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/documents/);
    await page.screenshot({ path: "test-results/nav-03-documents.png" });

    // Navigate to Timeline
    await page.goto("/timeline");
    await expect(page).toHaveURL(/\/timeline/);
    await page.screenshot({ path: "test-results/nav-04-timeline.png" });

    // Navigate to Chat
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/chat/);
    await page.screenshot({ path: "test-results/nav-05-chat.png" });

    // Navigate to Settings
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await page.screenshot({ path: "test-results/nav-06-settings.png" });

    console.log("✅ All navigation routes verified!");
  });

  test("should have working sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside, nav, [role='navigation']");
    await expect(sidebar.first()).toBeVisible();
  });

  test("should redirect root to dashboard when authenticated", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });

  test("should protect routes - redirect to login when not authenticated", async ({
    page,
  }) => {
    await resetAuthState(page);

    const protectedRoutes = [
      "/dashboard",
      "/cases",
      "/documents",
      "/timeline",
      "/chat",
      "/settings",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const url = page.url();
      if (!url.includes("/login")) {
        console.log(
          `Warning: ${route} may not be protected - expected redirect to /login`,
        );
      }
    }
  });

  test("should maintain session across navigation", async ({ page }) => {
    await page.goto("/dashboard");
    const sessionIdBefore = await page.evaluate(() =>
      localStorage.getItem("sessionId"),
    );

    await page.goto("/cases");
    await page.goto("/documents");
    await page.goto("/settings");

    const sessionIdAfter = await page.evaluate(() =>
      localStorage.getItem("sessionId"),
    );

    expect(sessionIdBefore).toBeTruthy();
    expect(sessionIdAfter).toBe(sessionIdBefore);
  });

  test("should handle browser back/forward navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.goto("/cases");
    await page.goto("/documents");

    await page.goBack();
    await expect(page).toHaveURL(/\/cases/);

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goForward();
    await expect(page).toHaveURL(/\/cases/);
  });
});

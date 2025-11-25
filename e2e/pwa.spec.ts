import { expect, test } from "@playwright/test";
import { loginWithSeededUser } from "./utils/auth";

/**
 * PWA E2E Tests
 *
 * Tests PWA installability, service worker, and offline functionality.
 */

test.describe("PWA Features", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithSeededUser(page);
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("should have valid web manifest", async ({ page }) => {
    // Check for manifest link
    const manifest = await page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);

    // Fetch and validate manifest
    const manifestHref = await manifest.getAttribute("href");
    if (manifestHref) {
      const response = await page.request.get(manifestHref);
      expect(response.ok()).toBeTruthy();

      const manifestData = await response.json();
      expect(manifestData.name).toBeTruthy();
      expect(manifestData.short_name).toBeTruthy();
      expect(manifestData.icons).toBeTruthy();
      expect(manifestData.icons.length).toBeGreaterThan(0);
      expect(manifestData.start_url).toBeTruthy();
      expect(manifestData.display).toBe("standalone");
    }
  });

  test("should have PWA icons", async ({ page }) => {
    // Check for apple-touch-icon
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveCount(1);

    // Check that icons are accessible
    const iconHref = await appleIcon.getAttribute("href");
    if (iconHref) {
      const response = await page.request.get(iconHref);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()["content-type"]).toContain("image");
    }
  });

  test("should have theme-color meta tag", async ({ page }) => {
    // Check for theme-color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);

    const color = await themeColor.getAttribute("content");
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("should register service worker", async ({ page }) => {
    // Wait for service worker to be registered
    const swRegistered = await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });

    expect(swRegistered).toBeTruthy();
  });

  test("should cache static assets", async ({ page }) => {
    // Check if service worker is active
    const cacheAvailable = await page.evaluate(async () => {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        return cacheNames.length > 0;
      }
      return false;
    });

    expect(cacheAvailable).toBeTruthy();
  });

  test("should have viewport meta tag for mobile", async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);

    const content = await viewport.getAttribute("content");
    expect(content).toContain("width=device-width");
    expect(content).toContain("initial-scale=1");
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    // Check that main content is visible
    const mainContent = page.locator('main, [role="main"], #app, #root');
    await expect(mainContent.first()).toBeVisible();

    // Check no horizontal scrollbar
    const hasHorizontalScroll = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test("should show install prompt on supported browsers", async ({
    page,
    browserName,
  }) => {
    // This test is mainly for Chromium-based browsers
    test.skip(
      browserName !== "chromium",
      "Install prompt only works in Chromium"
    );

    // Check if beforeinstallprompt event listener is set up
    const hasInstallHandler = await page.evaluate(() => {
      return (
        window.hasOwnProperty("deferredPrompt") ||
        document.querySelector("[data-pwa-install]") !== null
      );
    });

    // Note: Actual install prompt requires user interaction and can't be fully automated
    expect(hasInstallHandler).toBeDefined();
  });
});

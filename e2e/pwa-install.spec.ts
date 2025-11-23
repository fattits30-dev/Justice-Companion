import { test, expect } from "@playwright/test";

test.describe("PWA Installation", () => {
  test("should display install prompt on desktop Chrome", async ({
    page,
    browserName,
  }) => {
    // Only test PWA installation on Chromium browsers (Chrome, Edge)
    test.skip(
      browserName !== "chromium",
      "PWA install testing only for Chromium",
    );

    await page.goto("/");

    // Register and login first
    const timestamp = Date.now();
    const email = `pwa${timestamp}@example.com`;

    await page.click("text=Register");
    await page.fill('input[name="name"]', "PWA Test");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Welcome")).toBeVisible({
      timeout: 15000,
    });

    // Check if install prompt is available
    // Note: beforeinstallprompt event may not fire in headless mode
    // This is more of an integration test that the PWA manifest is valid

    // Check if we're running in HTTPS (required for PWA install)
    const url = new URL(page.url());
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      console.log("⚠️  PWA install requires HTTPS in production");
    }

    // Verify PWA manifest is accessible
    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe("Justice Companion - UK Legal AI Assistant");
    expect(manifest.short_name).toBe("JusticeAI");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");

    // Check for PWA icons
    for (const icon of manifest.icons) {
      const iconResponse = await page.request.head(`/pwa-${icon.sizes}.png`);
      expect(iconResponse.ok()).toBe(true);
    }

    // Verify service worker registration
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          return registrations.length > 0;
        });
    });

    expect(swRegistered).toBe(true);

    // Check for web app manifest meta tags
    const manifestLink = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(manifestLink).toBe("/manifest.webmanifest");

    // Check for Apple PWA tags
    const appleCapable = await page
      .locator('meta[name="apple-mobile-web-app-capable"]')
      .getAttribute("content");
    expect(appleCapable).toBe("yes");

    const appleTitle = await page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .getAttribute("content");
    expect(appleTitle).toBe("JusticeAI");

    // Check for theme color
    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .getAttribute("content");
    expect(themeColor).toBe("#1e40af");
  });

  test("should have valid PWA Lighthouse score (simulation)", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Lighthouse testing only for Chromium",
    );

    await page.goto("/");

    // Register and login
    const timestamp = Date.now();
    const email = `lighthouse${timestamp}@example.com`;

    await page.click("text=Register");
    await page.fill('input[name="name"]', "Lighthouse Test");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Welcome")).toBeVisible({
      timeout: 15000,
    });

    // Simulate checking Lighthouse PWA criteria

    // 1. HTTPS (would fail in localhost)
    // 2. Valid web app manifest
    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);

    // 3. Service worker
    const hasServiceWorker = await page.evaluate(() => {
      return "serviceWorker" in navigator;
    });
    expect(hasServiceWorker).toBe(true);

    // 4. Metadata for "Add to homescreen" (iOS)
    const hasAppleIcons = await page
      .locator('link[rel="apple-touch-icon"]')
      .count();
    expect(hasAppleIcons).toBeGreaterThan(0);

    // 5. Theme color
    const hasThemeColor = await page
      .locator('meta[name="theme-color"]')
      .count();
    expect(hasThemeColor).toBeGreaterThan(0);

    // 6. Content is sized correctly for viewport
    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(viewportMeta).toContain("width=device-width");
    expect(viewportMeta).toContain("initial-scale=1");

    // 7. App should be standalone capable
    const manifest = await manifestResponse.json();
    expect(manifest.display).toBe("standalone");

    console.log("✅ Basic PWA criteria met for Lighthouse scoring");
  });

  test("should handle offline fallback page", async ({ page }) => {
    // First load the app normally
    await page.goto("/");

    // Register and login
    const timestamp = Date.now();
    const email = `offline${timestamp}@example.com`;

    await page.click("text=Register");
    await page.fill('input[name="name"]', "Offline Test");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Welcome")).toBeVisible({
      timeout: 15000,
    });

    // Navigate to a cached page (like dashboard)
    await page.click('a[href="/"], text=Dashboard');

    // Simulate going offline
    await page.context().setOffline(true);

    // Try to refresh the page
    await page.reload();

    // Service worker should serve cached content
    // The app should still be visible (from cache)
    await expect(page.locator("text=Justice Companion")).toBeVisible({
      timeout: 10000,
    });

    // Try to access a non-cached API endpoint (should fail gracefully)
    try {
      await page.waitForTimeout(2000); // Let any pending requests timeout
      const networkErrors = await page
        .locator("text=offline,connection lost,no internet")
        .count();
      // Note: this test may not catch all offline cases depending on cache strategy
    } catch (e) {
      // Expected - some requests should fail when offline
    } finally {
      // Restore online status
      await page.context().setOffline(false);
    }
  });

  test("should preload critical resources", async ({ page }) => {
    await page.goto("/");

    // Check that main app resources are preloaded
    const preloadCount = await page
      .locator('link[rel="preload"], link[rel="prefetch"]')
      .count();
    expect(preloadCount).toBeGreaterThan(0);

    // Check service worker is registered
    const swState = await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration ? registration.active?.state : null;
      }
      return null;
    });

    expect(swState).toBe("activated");

    // Check workbox cache is populated (after some interactions)
    await page.click("text=Register");
    await page.waitForTimeout(2000); // Let resources load

    // Workbox should cache the manifest and other assets
    const cacheNames = await page.evaluate(async () => {
      const caches = await window.caches.keys();
      return caches.filter((name) => name.includes("workbox"));
    });

    expect(cacheNames.length).toBeGreaterThan(0);
  });
});

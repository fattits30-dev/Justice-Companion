import { test } from "@playwright/test";

/**
 * Interactive browser test - Claude controlling the browser
 */
test("interactive app exploration", async ({ page }) => {
  console.log("🌐 Navigating to Justice Companion...");
  await page.goto("http://localhost:5178");
  await page.waitForLoadState("networkidle");

  // Take screenshot of initial state
  await page.screenshot({
    path: "test-results/01-initial-load.png",
    fullPage: true,
  });
  console.log("📸 Screenshot saved: 01-initial-load.png");

  // Check what page we're on
  const url = page.url();
  const title = await page.title();
  console.log(`📍 Current URL: ${url}`);
  console.log(`📄 Page title: ${title}`);

  // Get visible text
  const bodyText = await page.locator("body").textContent();
  console.log(`📝 Page content preview: ${bodyText?.substring(0, 200)}...`);

  // Check if login page
  if (url.includes("/login")) {
    console.log("🔐 On login page - ready for authentication");
    await page.screenshot({ path: "test-results/02-login-page.png" });
  }

  console.log("✅ Interactive exploration complete!");
});

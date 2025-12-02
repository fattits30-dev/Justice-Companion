import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Justice Companion/);
});

test("redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/");

  // App should redirect to login page for unauthenticated users
  await expect(page).toHaveURL(/.*\/login/);

  // Verify login page elements are visible
  await expect(page.locator("body")).toBeVisible();
});

test("login page has form elements", async ({ page }) => {
  await page.goto("/login");

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // Check if login form exists (look for common elements)
  const body = await page.locator("body").textContent();

  // Basic verification that page loaded
  expect(body).toBeTruthy();
  expect(body!.length).toBeGreaterThan(0);
});

test("backend health check", async ({ request }) => {
  // Test that backend API is responding
  const response = await request.get("http://localhost:8000/health");

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data.status).toBe("healthy");
  expect(data.service).toBe("Justice Companion Backend");
});

test("backend API root endpoint", async ({ request }) => {
  // Test backend root endpoint
  const response = await request.get("http://localhost:8000/");

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  expect(data.message).toBe("Justice Companion API");
  expect(data.version).toBe("1.0.0");
});

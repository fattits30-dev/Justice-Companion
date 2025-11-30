import { test, expect } from "@playwright/test";

test.describe("End-to-End Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Runs before each test - navigate to home page
    await page.goto("http://localhost:3000");
  });

  test("Main page loads successfully", async ({ page }) => {
    // Verify page title and critical elements exist
    await expect(page).toHaveTitle(/Your App Name/);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Navigation to key sections works", async ({ page }) => {
    // Test navigation to different sections
    await page.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/.*about/);
    await expect(page.getByRole("heading", { name: "About Us" })).toBeVisible();

    await page.getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/.*contact/);
    await expect(
      page.getByRole("heading", { name: "Contact Us" }),
    ).toBeVisible();
  });

  test("Core user interactions work", async ({ page }) => {
    // Test form submission
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Thank you for your submission")).toBeVisible();

    // Test search functionality
    await page.getByPlaceholder("Search").fill("test query");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(
      page.getByText("Search results for: test query"),
    ).toBeVisible();
  });
});

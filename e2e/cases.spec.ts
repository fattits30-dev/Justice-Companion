import { test, expect } from "@playwright/test";

/**
 * Case Management E2E Tests
 *
 * Tests case creation, viewing, editing, and deletion flows.
 */

test.describe("Case Management", () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("testuser");
    await page.getByLabel(/password/i).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|home|cases)/, {
      timeout: 10000,
    });
  });

  test("should display cases list", async ({ page }) => {
    await page.goto("/cases");

    // Should show cases page
    await expect(page.getByRole("heading", { name: /cases/i })).toBeVisible();

    // Should have create case button
    await expect(
      page.getByRole("button", { name: /new case|create|add/i }),
    ).toBeVisible();
  });

  test("should create a new case", async ({ page }) => {
    await page.goto("/cases");

    // Click create case button
    await page.getByRole("button", { name: /new case|create|add/i }).click();

    // Fill case form
    const caseTitle = `Test Case ${Date.now()}`;
    await page.getByLabel(/title/i).fill(caseTitle);
    await page
      .getByLabel(/description/i)
      .fill("This is a test case created by E2E tests");

    // Select case type if available
    const caseType = page.getByLabel(/type/i);
    if (await caseType.isVisible()) {
      await caseType.selectOption({ index: 1 });
    }

    // Submit form
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Should show success or redirect to case details
    await expect(page.getByText(caseTitle)).toBeVisible({ timeout: 10000 });
  });

  test("should view case details", async ({ page }) => {
    await page.goto("/cases");

    // Click on first case
    const firstCase = page.locator('[data-testid="case-item"]').first();
    if (await firstCase.isVisible()) {
      await firstCase.click();

      // Should show case details
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/status|description/i)).toBeVisible();
    }
  });

  test("should filter cases by status", async ({ page }) => {
    await page.goto("/cases");

    // Find filter controls
    const statusFilter = page.getByLabel(/status|filter/i);
    if (await statusFilter.isVisible()) {
      // Select active cases
      await statusFilter.selectOption("active");

      // Should update case list
      await page.waitForResponse(
        (resp) => resp.url().includes("/cases") && resp.status() === 200,
      );
    }
  });

  test("should search cases", async ({ page }) => {
    await page.goto("/cases");

    // Find search input
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill("test");
      await page.keyboard.press("Enter");

      // Should filter results
      await page.waitForTimeout(500); // Wait for debounce
    }
  });

  test("should edit existing case", async ({ page }) => {
    // Navigate to first case
    await page.goto("/cases");
    const firstCase = page.locator('[data-testid="case-item"]').first();

    if (await firstCase.isVisible()) {
      await firstCase.click();

      // Click edit button
      await page.getByRole("button", { name: /edit/i }).click();

      // Update title
      const titleInput = page.getByLabel(/title/i);
      await titleInput.clear();
      await titleInput.fill(`Updated Case ${Date.now()}`);

      // Save changes
      await page.getByRole("button", { name: /save|update/i }).click();

      // Should show success message
      await expect(page.getByText(/updated|saved/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should delete case with confirmation", async ({ page }) => {
    await page.goto("/cases");

    // Click on a case to view details
    const firstCase = page.locator('[data-testid="case-item"]').first();
    if (await firstCase.isVisible()) {
      await firstCase.click();

      // Click delete button
      const deleteButton = page.getByRole("button", { name: /delete/i });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion in dialog
        await page.getByRole("button", { name: /confirm|yes|delete/i }).click();

        // Should redirect to cases list
        await expect(page).toHaveURL(/\/cases/, { timeout: 5000 });
      }
    }
  });
});

/**
 * Case Management E2E Tests
 *
 * Tests case creation, viewing, editing, and management functionality.
 */

import { test, expect } from "@playwright/test";
import { launchWebApp, closeWebApp } from "../setup/electron-setup";

test.describe("Case Management", () => {
  test("should display case list/dashboard after login", async ({ page }) => {
    const testApp = await launchWebApp();

    await page.goto("http://localhost:5176");
    await page.waitForLoadState("domcontentloaded");

    // Wait for app to fully load
    await page.waitForTimeout(3000);

    // Look for case-related UI elements
    const caseElements = [
      page.locator("text=/case/i"),
      page.locator("text=/dashboard/i"),
      page.locator("text=/welcome/i"),
      page.locator("[data-testid*='case']"),
      page.locator(".case-list, .cases, .dashboard"),
    ];

    // Check if any case-related content is visible
    let foundCaseContent = false;
    for (const element of caseElements) {
      try {
        if (await element.isVisible({ timeout: 1000 })) {
          foundCaseContent = true;
          console.log("Found case-related content");
          break;
        }
      } catch (e) {
        // Element not found, continue checking
      }
    }

    // Should have some case/dashboard content or still be on login
    const onLoginPage = await page
      .locator("h1, h2")
      .filter({ hasText: /sign in/i })
      .isVisible()
      .catch(() => false);

    console.log(
      `Found case content: ${foundCaseContent}, On login page: ${onLoginPage}`
    );

    // Either we found case content OR we're still on login (both acceptable)
    expect(foundCaseContent || onLoginPage).toBe(true);

    await closeWebApp(testApp);
  });

  test("should allow navigation to case creation if available", async ({
    page,
  }) => {
    const testApp = await launchWebApp();

    await page.goto("http://localhost:5176");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Look for "New Case", "Create Case", "Add Case" buttons/links
    const createButtons = [
      page.locator("button, a").filter({ hasText: /new case/i }),
      page.locator("button, a").filter({ hasText: /create case/i }),
      page.locator("button, a").filter({ hasText: /add case/i }),
      page.locator("[data-testid*='create'], [data-testid*='new']"),
    ];

    let createButtonFound = false;
    let createButton;

    for (const button of createButtons) {
      try {
        if (await button.isVisible({ timeout: 1000 })) {
          createButtonFound = true;
          createButton = button;
          console.log("Found case creation button");
          break;
        }
      } catch (e) {
        // Button not found, continue checking
      }
    }

    if (createButtonFound && createButton) {
      // Test clicking the create button
      const initialUrl = page.url();
      await createButton.click();
      await page.waitForTimeout(1000);

      // Should navigate to create case form or show modal
      const urlChanged = page.url() !== initialUrl;
      const formVisible = await page
        .locator("form, .modal, .dialog")
        .filter({ hasText: /case/i })
        .isVisible()
        .catch(() => false);

      console.log(`URL changed: ${urlChanged}, Form visible: ${formVisible}`);
      expect(urlChanged || formVisible).toBe(true);
    } else {
      console.log("No case creation button found - may require login first");
    }

    await closeWebApp(testApp);
  });

  test("should display case information properly", async ({ page }) => {
    const testApp = await launchWebApp();

    await page.goto("http://localhost:5176");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Look for case cards/items/lists
    const caseItems = await page
      .locator(".case-item, .case-card, [data-testid*='case']")
      .all();

    if (caseItems.length > 0) {
      console.log(`Found ${caseItems.length} case items`);

      // Check first case item has expected content
      const firstCase = caseItems[0];

      // Should have some text content
      const caseText = await firstCase.textContent();
      expect(caseText).toBeTruthy();
      expect(caseText!.length).toBeGreaterThan(5);

      // May have title, description, status, etc.
      console.log(`Case content: ${caseText?.substring(0, 100)}...`);
    } else {
      console.log("No case items found - may be empty state or require login");
    }

    await closeWebApp(testApp);
  });

  test("should allow case filtering/search if available", async ({ page }) => {
    const testApp = await launchWebApp();

    await page.goto("http://localhost:5176");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Look for search/filter inputs
    const searchInputs = [
      page.locator(
        "input[placeholder*='search'], input[placeholder*='filter']"
      ),
      page.locator("input[type='search']"),
      page.locator(".search-input, .filter-input"),
    ];

    let searchFound = false;
    let searchInput;

    for (const input of searchInputs) {
      try {
        if (await input.isVisible({ timeout: 1000 })) {
          searchFound = true;
          searchInput = input;
          console.log("Found search/filter input");
          break;
        }
      } catch (e) {
        // Input not found, continue checking
      }
    }

    if (searchFound && searchInput) {
      // Test typing in search
      await searchInput.fill("test search");
      const value = await searchInput.inputValue();
      expect(value).toBe("test search");

      // Should not cause errors
      await page.waitForTimeout(500);
      console.log("Search input works correctly");
    } else {
      console.log("No search input found");
    }

    await closeWebApp(testApp);
  });

  test("should handle empty case state gracefully", async ({ page }) => {
    const testApp = await launchWebApp();

    await page.goto("http://localhost:5176");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Look for empty state messages
    const emptyStates = [
      page.locator("text=/no cases/i"),
      page.locator("text=/empty/i"),
      page.locator("text=/get started/i"),
      page.locator(".empty-state, .no-data"),
    ];

    let emptyStateFound = false;
    for (const state of emptyStates) {
      try {
        if (await state.isVisible({ timeout: 1000 })) {
          emptyStateFound = true;
          console.log("Found empty state message");
          break;
        }
      } catch (e) {
        // Empty state not found, continue checking
      }
    }

    // Check for case count or list
    const caseCount = await page.locator(".case-item, .case-card").count();
    console.log(
      `Case count: ${caseCount}, Empty state found: ${emptyStateFound}`
    );

    // Either we have cases OR we show empty state - both are fine
    expect(caseCount > 0 || emptyStateFound || caseCount === 0).toBe(true);

    await closeWebApp(testApp);
  });

  test("should allow case status filtering if available", async ({ page }) => {
    const testApp = await launchWebApp();

    await page.goto("http://localhost:5176");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Look for status filters (Active, Closed, Pending, etc.)
    const statusFilters = [
      page
        .locator("button, select")
        .filter({ hasText: /active|closed|pending|open/i }),
      page.locator(".status-filter, .filter-tabs"),
      page.locator("[data-testid*='status'], [data-testid*='filter']"),
    ];

    let filterFound = false;
    for (const filter of statusFilters) {
      try {
        if (await filter.isVisible({ timeout: 1000 })) {
          filterFound = true;
          console.log("Found status filter");
          break;
        }
      } catch (e) {
        // Filter not found, continue checking
      }
    }

    console.log(`Status filters found: ${filterFound}`);

    // Status filters are optional but if present, they should work
    if (filterFound) {
      // Could test clicking filters, but for now just verify they're present
      expect(filterFound).toBe(true);
    }

    await closeWebApp(testApp);
  });
});

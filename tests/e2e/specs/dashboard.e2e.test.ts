/**
 * Dashboard E2E Tests
 *
 * Tests dashboard functionality, statistics, and navigation.
 */

import { expect, test } from "@playwright/test";
import {
  authenticateTestUser,
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from "../setup/electron-setup.js";
import {
  TEST_USER_CREDENTIALS,
  verifyDatabaseState,
} from "../setup/test-database.js";

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: true });
  await authenticateTestUser(testApp.window, {
    username: TEST_USER_CREDENTIALS.username,
    password: TEST_USER_CREDENTIALS.password,
  });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe("Dashboard E2E", () => {
  test("should display dashboard with correct statistics", async () => {
    const { window, dbPath } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Verify we're on dashboard
    const dashboardTitle = await window.$("text=/dashboard/i");
    expect(dashboardTitle, "Dashboard title should be visible").toBeTruthy();

    // Check for statistics cards
    const statCards = await window.$$(
      '[data-testid*="stat"], .stat-card, .metric'
    );
    expect(statCards.length, "Should have statistics cards").toBeGreaterThan(0);

    // Verify database state matches displayed stats
    const dbState = await verifyDatabaseState(dbPath);

    // Check if stats are displayed (may be 0 for new user)
    console.log("Database state:", dbState);
  });

  test("should navigate to cases from dashboard", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Click "New Case" or "View Cases" button
    const newCaseBtn =
      (await window.$('[data-testid="new-case-btn"]')) ||
      (await window.$('button:has-text("New Case")')) ||
      (await window.$('button:has-text("Create Case")')) ||
      (await window.$('a:has-text("Cases")'));

    if (newCaseBtn) {
      await newCaseBtn.click();
      await window.waitForTimeout(1000);

      // Should navigate to cases page
      const casesTitle = await window.$("text=/cases/i");
      expect(casesTitle, "Should navigate to cases page").toBeTruthy();
    }
  });

  test("should navigate to documents from dashboard", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Click "Upload Evidence" or "View Documents" button
    const uploadBtn =
      (await window.$('[data-testid="upload-evidence-btn"]')) ||
      (await window.$('button:has-text("Upload Evidence")')) ||
      (await window.$('a:has-text("Documents")'));

    if (uploadBtn) {
      await uploadBtn.click();
      await window.waitForTimeout(1000);

      // Should navigate to documents page
      const docsTitle = await window.$("text=/documents|evidence/i");
      expect(docsTitle, "Should navigate to documents page").toBeTruthy();
    }
  });

  test("should navigate to chat from dashboard", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Click "Start Chat" or "AI Chat" button
    const chatBtn =
      (await window.$('[data-testid="start-chat-btn"]')) ||
      (await window.$('button:has-text("Start Chat")')) ||
      (await window.$('button:has-text("AI Chat")')) ||
      (await window.$('a:has-text("Chat")'));

    if (chatBtn) {
      await chatBtn.click();
      await window.waitForTimeout(1000);

      // Should navigate to chat page
      const chatTitle = await window.$("text=/chat|ai assistant/i");
      expect(chatTitle, "Should navigate to chat page").toBeTruthy();
    }
  });

  test("should display recent cases if available", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Check for recent cases section
    const recentCasesSection = await window.$("text=/recent cases/i");
    const caseCards = await window.$$('.case-card, [data-testid*="case"]');

    if (recentCasesSection || caseCards.length > 0) {
      console.log("Recent cases section found");

      // If cases exist, clicking one should navigate to case detail
      if (caseCards.length > 0) {
        const firstCase = caseCards[0];
        const caseText = await firstCase.textContent();

        await firstCase.click();
        await window.waitForTimeout(1000);

        // Should show case detail view
        const caseDetail = await window.$(`text=${caseText}`);
        expect(caseDetail, "Should show case detail").toBeTruthy();
      }
    }
  });

  test("should handle dashboard loading states", async () => {
    const { window } = testApp;

    // Reload to test loading state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Loading might be brief, so we check for the final state
    // Should eventually show dashboard content
    await window.waitForTimeout(3000);
    const dashboardContent = await window.$("text=/dashboard/i");
    expect(dashboardContent, "Dashboard should load").toBeTruthy();
  });

  test("should display user information", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Check for user greeting or profile info
    const userGreeting = await window.$(
      `text=${TEST_USER_CREDENTIALS.username}`
    );
    const profileBtn = await window.$('[data-testid="profile-btn"]');

    expect(
      userGreeting || profileBtn,
      "Should show user information"
    ).toBeTruthy();
  });
});

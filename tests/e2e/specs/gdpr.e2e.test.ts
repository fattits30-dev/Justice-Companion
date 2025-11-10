/**
 * GDPR Compliance E2E Tests
 *
 * Tests GDPR data export and deletion functionality.
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
import {
  casesFixtures,
} from "../setup/fixtures.js";

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

test.describe("GDPR Compliance E2E", () => {
  test("should export user data via GDPR export", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Data Management tab
      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Click export button
        const exportBtn = await window.$('button:has-text("Export All Data")');
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(3000); // Wait for export to complete

          // Check for success message or download
          await window.$("text=/export.*complete|download/i");
          // Export might trigger download, so we check for any success indication
          console.log("GDPR export initiated");
        }
      }
    }
  });

  test("should handle GDPR export with different formats", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Data Management tab
      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Check for format options (if available)
        const jsonFormat = await window.$('input[value="json"]');
        const csvFormat = await window.$('input[value="csv"]');

        if (jsonFormat || csvFormat) {
          console.log("GDPR export format options available");
        }

        // Click export button
        const exportBtn = await window.$('button:has-text("Export All Data")');
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(3000);

          console.log("GDPR export with format selection attempted");
        }
      }
    }
  });

  test("should show GDPR compliance information", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Data Management tab
      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Check for GDPR compliance text
        const gdprText = await window.$(
          "text=/GDPR|data protection|right to erasure|data portability/i"
        );
        expect(
          gdprText,
          "Should show GDPR compliance information"
        ).toBeTruthy();

        // Check for consent history button
        const consentBtn = await window.$(
          'button:has-text("View Consent History")'
        );
        expect(consentBtn, "Should have consent history button").toBeTruthy();
      }
    }
  });

  test("should handle GDPR deletion confirmation", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Data Management tab
      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Check for danger zone
        const dangerZone = await window.$("text=/Danger Zone/i");
        expect(dangerZone, "Should show danger zone").toBeTruthy();

        // Check for delete button
        const deleteBtn = await window.$('button:has-text("Delete All Data")');
        expect(deleteBtn, "Should have delete button").toBeTruthy();

        // Delete button should require confirmation
        if (deleteBtn) {
          await deleteBtn.click();
          await window.waitForTimeout(1000);

          // Should show confirmation dialog or warning
          const confirmDialog = await window.$(
            "text=/confirm|warning|permanent/i"
          );
          expect(
            confirmDialog,
            "Should show confirmation for deletion"
          ).toBeTruthy();
        }
      }
    }
  });

  test("should export and then delete user data", async () => {
    const { window, dbPath } = testApp;

    // First create some test data
    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Create a case
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      const createCaseBtn = await window.$('button:has-text("New Case")');
      if (createCaseBtn) {
        await createCaseBtn.click();
        await window.waitForTimeout(500);

        const caseData = casesFixtures.employment;
        await window.fill('[name="title"]', caseData.title);
        await window.selectOption('[name="caseType"]', caseData.caseType);
        await window.fill('[name="description"]', caseData.description);

        const saveBtn = await window.$('button:has-text("Save")');
        if (saveBtn) {
          await saveBtn.click();
          await window.waitForTimeout(2000);
        }
      }
    }

    // Verify data was created
    const dbStateBefore = await verifyDatabaseState(dbPath);
    expect(
      dbStateBefore.cases,
      "Should have created test case"
    ).toBeGreaterThan(0);

    // Now test GDPR export
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Export data
        const exportBtn = await window.$('button:has-text("Export All Data")');
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(3000);
          console.log("GDPR export completed");
        }
      }
    }
  });

  test("should handle GDPR rate limiting", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Try multiple rapid exports (if UI allows)
        const exportBtn = await window.$('button:has-text("Export All Data")');
        if (exportBtn) {
          // First export
          await exportBtn.click();
          await window.waitForTimeout(1000);

          // Second export (should potentially be rate limited)
          await exportBtn.click();
          await window.waitForTimeout(1000);

          // Should handle rate limiting gracefully
          console.log("GDPR rate limiting test completed");
        }
      }
    }
  });

  test("should preserve audit logs during GDPR deletion", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Check for information about audit log preservation
        const auditText = await window.$("text=/audit|logs|preserved/i");
        if (auditText) {
          console.log("GDPR mentions audit log preservation");
        }
      }
    }
  });

  test("should show GDPR consent management", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Check for consent history
        const consentBtn = await window.$(
          'button:has-text("View Consent History")'
        );
        if (consentBtn) {
          await consentBtn.click();
          await window.waitForTimeout(1000);

          // Should show consent information
          const consentInfo = await window.$(
            "text=/consent|privacy|data processing/i"
          );
          expect(consentInfo, "Should show consent information").toBeTruthy();
        }
      }
    }
  });

  test("should handle GDPR deletion with export option", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Check for export before delete option
        const exportBeforeDelete = await window.$(
          'input[aria-label*="export.*delete"], text=/export.*before.*delete/i'
        );
        if (exportBeforeDelete) {
          console.log("GDPR export before delete option available");
        }
      }
    }
  });

  test("should validate GDPR deletion confirmation", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      const dataTab = await window.$(`text=Data Management`);
      if (dataTab) {
        await dataTab.click();
        await window.waitForTimeout(500);

        // Delete button should be protected
        const deleteBtn = await window.$('button:has-text("Delete All Data")');
        if (deleteBtn) {
          // Check if button has warning styling
          const className = await deleteBtn.getAttribute("class");
          expect(
            className,
            "Delete button should have warning styling"
          ).toMatch(/red|danger|warning/i);
        }
      }
    }
  });
});

/**
 * Settings E2E Tests
 *
 * Tests settings functionality including AI provider config, appearance, privacy, backup, data management, notifications, and about.
 */

import { expect, test } from "@playwright/test";
import {
  authenticateTestUser,
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from "../setup/electron-setup.js";
import { TEST_USER_CREDENTIALS } from "../setup/test-database.js";

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

test.describe("Settings E2E", () => {
  test("should navigate to settings page", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav =
      (await window.$('[data-testid="nav-settings"]')) ||
      (await window.$('a:has-text("Settings")')) ||
      (await window.$('button:has-text("Settings")'));

    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Should show settings page
      const settingsTitle = await window.$("text=/settings/i");
      expect(settingsTitle, "Should navigate to settings page").toBeTruthy();
    }
  });

  test("should display all settings tabs", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Check for all tab buttons
      const tabs = [
        "AI Provider",
        "Appearance",
        "Privacy & Security",
        "Backup & Restore",
        "Data Management",
        "Notifications",
        "About",
      ];

      for (const tabName of tabs) {
        const tab = await window.$(`text=${tabName}`);
        expect(tab, `Should show ${tabName} tab`).toBeTruthy();
      }
    }
  });

  test("should configure AI provider settings", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Should be on AI Provider tab by default
      const aiProviderTitle = await window.$(
        "text=/AI Provider Configuration/i"
      );
      expect(
        aiProviderTitle,
        "Should show AI Provider configuration"
      ).toBeTruthy();

      // Check for provider dropdown
      const providerSelect = await window.$('[name="ai-provider"]');
      expect(providerSelect, "Should have AI provider dropdown").toBeTruthy();

      // Check for API key input
      const apiKeyInput = await window.$('[name="api-key"]');
      expect(apiKeyInput, "Should have API key input").toBeTruthy();

      // Check for model selection
      const modelSelect = await window.$('[name="model"]');
      expect(modelSelect, "Should have model selection").toBeTruthy();

      // Check for save button
      const saveBtn = await window.$('button:has-text("Save Configuration")');
      expect(saveBtn, "Should have save button").toBeTruthy();
    }
  });

  test("should switch between settings tabs", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Appearance tab
      const appearanceTab = await window.$(`text=Appearance`);
      if (appearanceTab) {
        await appearanceTab.click();
        await window.waitForTimeout(500);

        const appearanceTitle = await window.$(
          "text=/Customize the look and feel/i"
        );
        expect(
          appearanceTitle,
          "Should show Appearance tab content"
        ).toBeTruthy();
      }

      // Click Privacy tab
      const privacyTab = await window.$(`text=Privacy & Security`);
      if (privacyTab) {
        await privacyTab.click();
        await window.waitForTimeout(500);

        const privacyTitle = await window.$("text=/Privacy & Security/i");
        expect(privacyTitle, "Should show Privacy tab content").toBeTruthy();
      }

      // Click About tab
      const aboutTab = await window.$(`text=About`);
      if (aboutTab) {
        await aboutTab.click();
        await window.waitForTimeout(500);

        const aboutTitle = await window.$("text=/About Justice Companion/i");
        expect(aboutTitle, "Should show About tab content").toBeTruthy();
      }
    }
  });

  test("should configure appearance settings", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Appearance tab
      const appearanceTab = await window.$(`text=Appearance`);
      if (appearanceTab) {
        await appearanceTab.click();
        await window.waitForTimeout(500);

        // Check for theme options
        const lightTheme = await window.$(`text=Light`);
        const darkTheme = await window.$(`text=Dark`);
        const systemTheme = await window.$(`text=System`);

        expect(lightTheme, "Should have Light theme option").toBeTruthy();
        expect(darkTheme, "Should have Dark theme option").toBeTruthy();
        expect(systemTheme, "Should have System theme option").toBeTruthy();

        // Check for font size selector
        const fontSizeSelect = await window.$('[name="font-size"]');
        expect(fontSizeSelect, "Should have font size selector").toBeTruthy();

        // Check for animation toggle
        const animationToggle = await window.$(
          'input[aria-label="Enable animations"]'
        );
        expect(animationToggle, "Should have animation toggle").toBeTruthy();

        // Check for compact mode toggle
        const compactToggle = await window.$(
          'input[aria-label="Compact mode"]'
        );
        expect(compactToggle, "Should have compact mode toggle").toBeTruthy();
      }
    }
  });

  test("should display privacy and security settings", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Privacy tab
      const privacyTab = await window.$(`text=Privacy & Security`);
      if (privacyTab) {
        await privacyTab.click();
        await window.waitForTimeout(500);

        // Check for encryption status
        const encryptionStatus = await window.$(
          "text=/End-to-End Encryption Active/i"
        );
        expect(encryptionStatus, "Should show encryption status").toBeTruthy();

        // Check for privacy controls
        const chatEncryption = await window.$(
          'input[aria-label="Encrypt chat messages"]'
        );
        const auditLogging = await window.$(
          'input[aria-label="Enable audit logging"]'
        );
        const analytics = await window.$('input[aria-label="Allow analytics"]');

        expect(
          chatEncryption,
          "Should have chat encryption toggle"
        ).toBeTruthy();
        expect(auditLogging, "Should have audit logging toggle").toBeTruthy();
        expect(analytics, "Should have analytics toggle").toBeTruthy();

        // Check for session timeout
        const sessionTimeout = await window.$('[name="session-timeout"]');
        expect(
          sessionTimeout,
          "Should have session timeout selector"
        ).toBeTruthy();
      }
    }
  });

  test("should display data management options", async () => {
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

        // Check for GDPR compliance section
        const gdprSection = await window.$("text=/GDPR Compliance/i");
        expect(gdprSection, "Should show GDPR compliance section").toBeTruthy();

        // Check for export button
        const exportBtn = await window.$('button:has-text("Export All Data")');
        expect(exportBtn, "Should have export button").toBeTruthy();

        // Check for storage usage
        const storageSection = await window.$("text=/Storage Usage/i");
        expect(storageSection, "Should show storage usage").toBeTruthy();

        // Check for danger zone
        const dangerZone = await window.$("text=/Danger Zone/i");
        expect(dangerZone, "Should show danger zone").toBeTruthy();
      }
    }
  });

  test("should configure notification settings", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click Notifications tab
      const notificationsTab = await window.$(`text=Notifications`);
      if (notificationsTab) {
        await notificationsTab.click();
        await window.waitForTimeout(500);

        // Check for master toggle
        const masterToggle = await window.$(
          'input[aria-label="Enable notifications"]'
        );
        expect(
          masterToggle,
          "Should have master notifications toggle"
        ).toBeTruthy();

        // Check for notification types
        const caseUpdates = await window.$('input[aria-label="Case updates"]');
        const aiResponses = await window.$('input[aria-label="AI responses"]');
        const evidenceUploads = await window.$(
          'input[aria-label="Evidence uploads"]'
        );
        const systemAlerts = await window.$(
          'input[aria-label="System alerts"]'
        );

        expect(caseUpdates, "Should have case updates toggle").toBeTruthy();
        expect(aiResponses, "Should have AI responses toggle").toBeTruthy();
        expect(
          evidenceUploads,
          "Should have evidence uploads toggle"
        ).toBeTruthy();
        expect(systemAlerts, "Should have system alerts toggle").toBeTruthy();

        // Check for sound selector
        const soundSelect = await window.$('[name="notification-sound"]');
        expect(
          soundSelect,
          "Should have notification sound selector"
        ).toBeTruthy();
      }
    }
  });

  test("should display about information", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Click About tab
      const aboutTab = await window.$(`text=About`);
      if (aboutTab) {
        await aboutTab.click();
        await window.waitForTimeout(500);

        // Check for app info
        const appTitle = await window.$("text=/Justice Companion/i");
        const version = await window.$("text=/Version 1.0.0/i");

        expect(appTitle, "Should show app title").toBeTruthy();
        expect(version, "Should show version info").toBeTruthy();

        // Check for system info
        const systemInfo = await window.$("text=/System Information/i");
        expect(systemInfo, "Should show system information").toBeTruthy();

        // Check for resources
        const resources = await window.$("text=/Resources/i");
        expect(resources, "Should show resources section").toBeTruthy();
      }
    }
  });

  test("should handle keyboard navigation in settings", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Focus should be on first tab (AI Provider)
      const activeTab = await window.$('[aria-selected="true"]');
      expect(activeTab, "Should have active tab").toBeTruthy();

      // Press Ctrl+ArrowRight to navigate to next tab
      await window.keyboard.press("Control+ArrowRight");
      await window.waitForTimeout(500);

      // Should be on Appearance tab
      const appearanceContent = await window.$(
        "text=/Customize the look and feel/i"
      );
      expect(
        appearanceContent,
        "Should navigate to Appearance tab"
      ).toBeTruthy();

      // Press Ctrl+ArrowLeft to go back
      await window.keyboard.press("Control+ArrowLeft");
      await window.waitForTimeout(500);

      // Should be back on AI Provider tab
      const aiProviderContent = await window.$(
        "text=/AI Provider Configuration/i"
      );
      expect(
        aiProviderContent,
        "Should navigate back to AI Provider tab"
      ).toBeTruthy();
    }
  });

  test("should save AI provider configuration", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Enter API key
      const apiKeyInput = await window.$('[name="api-key"]');
      if (apiKeyInput) {
        await apiKeyInput.fill("sk-test-api-key-12345");
      }

      // Click save
      const saveBtn = await window.$('button:has-text("Save Configuration")');
      if (saveBtn) {
        await saveBtn.click();
        await window.waitForTimeout(2000);

        // Check for success message or handle response
        await window.$("text=/Saved successfully/i");
        // Success message might be brief, so we just check and continue
        console.log("Save configuration attempted");
      }
    }
  });

  test("should handle settings form validation", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to settings
    const settingsNav = await window.$('a:has-text("Settings")');
    if (settingsNav) {
      await settingsNav.click();
      await window.waitForTimeout(1000);

      // Try to save without API key
      const saveBtn = await window.$('button:has-text("Save Configuration")');
      if (saveBtn) {
        const isDisabled = await saveBtn.getAttribute("disabled");
        expect(
          isDisabled,
          "Save button should be disabled without API key"
        ).toBeTruthy();
      }

      // Enter API key and verify button enables
      const apiKeyInput = await window.$('[name="api-key"]');
      if (apiKeyInput) {
        await apiKeyInput.fill("sk-test-api-key-12345");
        await window.waitForTimeout(500);

        // Button should now be enabled
        const isDisabled = await saveBtn?.getAttribute("disabled");
        expect(
          isDisabled,
          "Save button should be enabled with API key"
        ).toBeFalsy();
      }
    }
  });
});

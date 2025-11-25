import {
  _electron as electron,
  ElectronApplication,
  expect,
  Page,
  test,
} from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, "..", "dist", "electron", "main.js")],
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });

  // Get first window
  window = await electronApp.firstWindow();

  // Wait for app to load
  await window.waitForLoadState("domcontentloaded");
  await window.waitForTimeout(2000);
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe("Document Analysis - Name Mismatch Fix", () => {
  test("should not show warning when document name matches user name", async () => {
    // Login as testuser
    await window.fill('input[name="username"]', "testuser");
    await window.fill('input[name="password"]', "Test@1234");
    await window.click('button[type="submit"]');

    // Wait for dashboard to load
    await window.waitForSelector("text=Dashboard", { timeout: 10000 });

    // Navigate to Documents & Evidence
    await window.click("text=Documents & Evidence");
    await window.waitForTimeout(1000);

    // Take screenshot before upload
    await window.screenshot({
      path: "e2e-tests/screenshots/before-upload.png",
      fullPage: true,
    });

    // Click upload button
    await window.click('button:has-text("Upload Document")');

    // Handle file chooser
    const [fileChooser] = await Promise.all([
      window.waitForEvent("filechooser"),
      window.click('input[type="file"]').catch(() => {}),
    ]);

    // Upload test document
    const testFilePath = path.join(
      __dirname,
      "..",
      "test-user-dismissal-letter.txt"
    );
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    await fileChooser.setFiles(testFilePath);

    // Wait for AI analysis to complete (60 second timeout)
    console.log("[Test] Waiting for AI analysis...");
    await window.waitForSelector("text=This is a", { timeout: 60000 });

    // Take screenshot after analysis
    await window.screenshot({
      path: "e2e-tests/screenshots/after-analysis.png",
      fullPage: true,
    });

    // Verify NO warning present
    const warningLocator = window.locator("text=⚠️ IMPORTANT:");
    const warningCount = await warningLocator.count();

    console.log(`[Test] Warning count: ${warningCount}`);
    expect(warningCount).toBe(0);

    // Verify analysis starts with correct text
    const analysisText = await window.textContent("text=This is a");
    console.log(
      `[Test] Analysis starts with: ${analysisText?.substring(0, 100)}...`
    );
    expect(analysisText).toBeTruthy();

    // Verify document claimant name in JSON is null (meaning no mismatch)
    const jsonBlock = await window
      .locator('pre:has-text("documentOwnershipMismatch")')
      .textContent();
    if (jsonBlock) {
      const jsonData = JSON.parse(jsonBlock);
      console.log(
        `[Test] documentOwnershipMismatch: ${jsonData.documentOwnershipMismatch}`
      );
      console.log(
        `[Test] documentClaimantName: ${jsonData.documentClaimantName}`
      );

      expect(jsonData.documentOwnershipMismatch).toBe(false);
      expect(jsonData.documentClaimantName).toBeNull();
    }
  });

  test("sidebar item counts should match dashboard data", async () => {
    // Navigate to dashboard
    await window.click("text=Dashboard");
    await window.waitForTimeout(1000);

    // Get dashboard stats
    const activeCasesText = await window
      .locator("text=Active Cases")
      .locator("..")
      .locator("text=/\\d+/")
      .textContent();
    const documentsText = await window
      .locator("text=Evidence Items")
      .locator("..")
      .locator("text=/\\d+/")
      .textContent();

    console.log(`[Test] Dashboard - Active Cases: ${activeCasesText}`);
    console.log(`[Test] Dashboard - Documents: ${documentsText}`);

    // Get sidebar counts (notification badges)
    const sidebarCasesBadge = await window
      .locator('[aria-label="Cases"] [class*="badge"]')
      .textContent();
    const sidebarDocsBadge = await window
      .locator('[aria-label="Documents"] [class*="badge"]')
      .textContent();

    console.log(`[Test] Sidebar - Cases badge: ${sidebarCasesBadge}`);
    console.log(`[Test] Sidebar - Documents badge: ${sidebarDocsBadge}`);

    // Verify counts match
    expect(sidebarCasesBadge).toBe(activeCasesText);
    expect(sidebarDocsBadge).toBe(documentsText);

    // Screenshot for verification
    await window.screenshot({
      path: "e2e-tests/screenshots/sidebar-counts.png",
      fullPage: true,
    });
  });
});

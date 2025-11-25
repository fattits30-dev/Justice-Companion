import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { TEST_CONFIG } from "./testConfig";
import { loginWithSeededUser } from "./utils/auth";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simplified Document Upload E2E Test
 *
 * This test assumes:
 * 1. Backend is running on http://localhost:8000
 * 2. Frontend is running on http://localhost:5220
 * 3. Test document exists at test-documents/test-user-dismissal-letter.txt
 */

const APP_URL = TEST_CONFIG.baseURL;
const TEST_DOCUMENT_PATH = path.join(
  __dirname,
  "..",
  TEST_CONFIG.testDocuments.dismissalLetter
);

test.describe("Document Upload - Simplified Flow", () => {
  test("complete document upload and analysis workflow", async ({ page }) => {
    // Verify test document exists
    if (!fs.existsSync(TEST_DOCUMENT_PATH)) {
      throw new Error(`Test document not found: ${TEST_DOCUMENT_PATH}`);
    }

    console.log("\n===== DOCUMENT UPLOAD AND ANALYSIS TEST =====\n");

    // Enable detailed logging
    page.on("console", (msg) => console.log(`[Browser]: ${msg.text()}`));
    page.on("pageerror", (err) =>
      console.error(`[Page Error]: ${err.message}`)
    );
    page.on("requestfailed", (req) =>
      console.log(`[Request Failed]: ${req.url()}`)
    );

    console.log("[1/5] Authenticating seeded test user...");
    await loginWithSeededUser(page);
    await page.screenshot({
      path: "e2e-tests/screenshots/step1-authenticated.png",
      fullPage: true,
    });

    // STEP 2: Navigate to chat page
    console.log("[2/5] Navigating to chat page...");
    await page.goto(`${APP_URL}/chat`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: "e2e-tests/screenshots/step3-chat-page.png",
      fullPage: true,
    });

    console.log(`    Chat page URL: ${page.url()}`);

    // STEP 3: Upload document
    console.log("[3/5] Uploading document...");

    // Find the Upload button (has Upload icon)
    const uploadButton = page
      .locator('button[title*="Upload document" i]')
      .first();

    // Set up file chooser handler BEFORE clicking the button
    const fileChooserPromise = page.waitForEvent("filechooser");

    // Click the upload button (this will create the hidden file input and trigger file dialog)
    await uploadButton.click();
    console.log("    Clicked upload button");

    // Wait for file chooser and select the file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(TEST_DOCUMENT_PATH);

    console.log(
      "    File selected, upload and analysis starting automatically..."
    );

    // Wait for upload message to appear in chat
    await page.waitForSelector("text=/Uploaded document/i", { timeout: 10000 });
    console.log("    Upload message appeared in chat");

    await page.screenshot({
      path: "e2e-tests/screenshots/step4-document-uploaded.png",
      fullPage: true,
    });

    // STEP 4: Wait for AI analysis to complete (automatic after upload)
    console.log(
      "[4/5] Waiting for AI analysis to complete (up to 90 seconds)..."
    );

    const startTime = Date.now();

    try {
      // Wait for either success or error
      await Promise.race([
        page.waitForSelector(
          "text=/This is a|Analysis|employment|dismissal|case type/i",
          {
            timeout: 90000,
            state: "visible",
          }
        ),
        page
          .waitForSelector('[role="alert"]:has-text("error")', {
            timeout: 90000,
            state: "visible",
          })
          .then(() => {
            throw new Error("Error alert detected during analysis");
          }),
      ]);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`    Analysis completed in ${duration}s`);

      await page.screenshot({
        path: "e2e-tests/screenshots/step5-analysis-complete.png",
        fullPage: true,
      });

      // Verify results
      const analysisText = await page
        .locator("text=/This is a|Analysis/i")
        .first()
        .textContent();
      console.log(
        `    Analysis preview: "${analysisText?.substring(0, 100)}..."`
      );

      expect(analysisText).toBeTruthy();
      expect(analysisText!.length).toBeGreaterThan(20);

      // Check for Create Case button
      const createCaseButton = page.getByRole("button", {
        name: /create.*case/i,
      });
      const hasCreateButton = (await createCaseButton.count()) > 0;

      console.log(`    Create Case button present: ${hasCreateButton}`);
      expect(hasCreateButton).toBe(true);

      console.log("\n===== TEST PASSED =====");
      console.log("✓ Document uploaded successfully");
      console.log("✓ AI analysis completed without errors");
      console.log("✓ Analysis results displayed");
      console.log("✓ Create Case button available\n");
    } catch (error) {
      console.error(`    Analysis failed: ${error}`);
      await page.screenshot({
        path: "e2e-tests/screenshots/step5-analysis-failed.png",
        fullPage: true,
      });

      // Check for error messages
      const errorMsg = await page
        .locator('[role="alert"], .error')
        .first()
        .textContent()
        .catch(() => null);
      if (errorMsg) {
        console.error(`    Error message: ${errorMsg}`);
      }

      throw error;
    }
  });
});

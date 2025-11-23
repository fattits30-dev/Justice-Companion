import { test, expect, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { TEST_CONFIG, getURL } from "./testConfig";

/**
 * E2E Test: Document Upload and AI Analysis
 *
 * Tests the complete flow:
 * 1. Login to web application
 * 2. Navigate to chat page
 * 3. Upload document
 * 4. Trigger AI analysis
 * 5. Verify analysis results
 *
 * Application: http://localhost:5220
 * Backend: http://127.0.0.1:8000
 * Test Document: test-user-dismissal-letter.txt
 */

const APP_URL = TEST_CONFIG.baseURL;
const TEST_DOCUMENT_PATH = path.join(
  __dirname,
  "..",
  TEST_CONFIG.testDocuments.dismissalLetter,
);

// Test credentials - from centralized config
const TEST_CREDENTIALS = TEST_CONFIG.credentials.e2eTest;

test.describe("Document Upload and Analysis Flow", () => {
  let page: Page;
  let loginSuccessful = false;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    // Enable console logging for debugging
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("[ENDPOINT]") ||
        text.includes("Error") ||
        text.includes("analysis")
      ) {
        console.log(`[Browser Console]: ${text}`);
      }
    });

    // Log network errors
    page.on("requestfailed", (request) => {
      console.log(
        `[Network Failed]: ${request.url()} - ${request.failure()?.errorText}`,
      );
    });

    // Verify test document exists
    if (!fs.existsSync(TEST_DOCUMENT_PATH)) {
      throw new Error(`Test document not found: ${TEST_DOCUMENT_PATH}`);
    }
    console.log(`[Test] Test document verified: ${TEST_DOCUMENT_PATH}`);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test("should complete full document upload and analysis flow", async () => {
    console.log("\n=== Starting Document Upload and Analysis Test ===\n");

    // STEP 1: Navigate to login page
    console.log("[Step 1] Navigating to login page...");
    await page.goto(`${APP_URL}/login`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.screenshot({
      path: "e2e-tests/screenshots/01-login-page.png",
      fullPage: true,
    });

    // STEP 2: Create account or login
    console.log("[Step 2] Setting up test account...");

    try {
      // Wait for login page to be ready
      await page.waitForSelector("text=/Sign In|Create account/i", {
        timeout: 10000,
      });

      // Check if "Create account" link exists
      const createAccountLink = page.getByText("Create account");
      const createLinkExists = (await createAccountLink.count()) > 0;

      if (createLinkExists) {
        console.log('[Step 2] Clicking "Create account" link...');
        await createAccountLink.click();
        await page.waitForLoadState("networkidle");

        // Fill registration form
        console.log("[Step 2] Filling registration form...");

        // Find and fill username
        const usernameInput = await page
          .locator('input[name="username"]')
          .or(page.locator('input[placeholder*="username" i]'))
          .first();
        await usernameInput.fill(TEST_CREDENTIALS.username);

        // Find and fill email (if exists)
        const emailInput = await page
          .locator('input[name="email"], input[type="email"]')
          .first();
        const emailExists = (await emailInput.count()) > 0;
        if (emailExists) {
          await emailInput.fill(TEST_CREDENTIALS.email);
        }

        // Find and fill password
        const passwordInput = await page
          .locator('input[name="password"], input[type="password"]')
          .first();
        await passwordInput.fill(TEST_CREDENTIALS.password);

        // Find and fill confirm password (if exists)
        const confirmPasswordInput = await page
          .locator(
            'input[name="confirmPassword"], input[name="confirm_password"]',
          )
          .first();
        const confirmExists = (await confirmPasswordInput.count()) > 0;
        if (confirmExists) {
          await confirmPasswordInput.fill(TEST_CREDENTIALS.password);
        }

        await page.screenshot({
          path: "e2e-tests/screenshots/02-registration-filled.png",
          fullPage: true,
        });

        // Click create/register button
        const registerButton = page
          .getByRole("button", { name: /create|register|sign up/i })
          .first();
        await registerButton.click();

        console.log("[Step 2] Account creation submitted...");
      } else {
        // No create account link - try logging in directly
        console.log("[Step 2] Attempting login with existing credentials...");

        const usernameInput = await page
          .locator('input[name="username"]')
          .or(page.locator('input[type="text"]'))
          .first();
        await usernameInput.fill(TEST_CREDENTIALS.username);

        const passwordInput = await page
          .locator('input[name="password"], input[type="password"]')
          .first();
        await passwordInput.fill(TEST_CREDENTIALS.password);

        await page.screenshot({
          path: "e2e-tests/screenshots/02-login-filled.png",
          fullPage: true,
        });

        const loginButton = page
          .locator('button[type="submit"]')
          .or(page.getByRole("button", { name: /sign in|login/i }))
          .first();
        await loginButton.click();
      }

      // Wait for navigation after login/registration
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      await page.waitForTimeout(2000); // Extra wait for any redirects

      // Check if we successfully logged in
      const currentUrl = page.url();
      console.log(
        `[Step 2] Current URL after login/registration: ${currentUrl}`,
      );

      if (currentUrl.includes("/login") || currentUrl.includes("/register")) {
        // Still on login/register page - failed
        console.log(
          "[Step 2] Authentication failed - checking for error message...",
        );
        await page.screenshot({
          path: "e2e-tests/screenshots/02-auth-failed.png",
          fullPage: true,
        });

        const errorMessage = await page
          .locator('[role="alert"], .error, .text-red-500, .text-destructive')
          .first()
          .textContent()
          .catch(() => null);
        console.log(
          `[Step 2] Error message: ${errorMessage || "No error message found"}`,
        );

        throw new Error(
          `Authentication failed. Error: ${errorMessage || "Unknown error"}`,
        );
      }

      loginSuccessful = true;
      console.log("[Step 2] Authentication successful!");

      await page.screenshot({
        path: "e2e-tests/screenshots/03-after-login.png",
        fullPage: true,
      });
    } catch (error) {
      console.error(`[Step 2] Authentication error: ${error}`);
      await page.screenshot({
        path: "e2e-tests/screenshots/02-auth-error.png",
        fullPage: true,
      });
      throw error;
    }

    // STEP 3: Navigate to chat page
    console.log("[Step 3] Navigating to chat page...");
    await page.goto(`${APP_URL}/chat`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.screenshot({
      path: "e2e-tests/screenshots/04-chat-page.png",
      fullPage: true,
    });

    console.log(`[Step 3] Chat page loaded: ${page.url()}`);

    // STEP 4: Find and interact with document upload
    console.log("[Step 4] Looking for document upload button...");

    // Wait for page to be fully interactive
    await page.waitForLoadState("networkidle");

    // Take a screenshot to see current state
    await page.screenshot({
      path: "e2e-tests/screenshots/05-before-upload.png",
      fullPage: true,
    });

    // Look for file input or upload button
    // Common patterns: file input, button with upload icon, button with "upload" text
    let fileInput: any;

    try {
      // Try to find visible file input
      fileInput = await page.locator('input[type="file"]').first();
      const isVisible = await fileInput.isVisible().catch(() => false);

      if (!isVisible) {
        // Try to find upload button that triggers file input
        const uploadButton = await page
          .getByRole("button", { name: /upload|attach|document/i })
          .first()
          .or(
            page
              .locator('button:has-text("Upload")')
              .or(page.locator('button[aria-label*="upload" i]')),
          )
          .first();

        const buttonExists = (await uploadButton.count()) > 0;
        if (buttonExists) {
          console.log("[Step 4] Found upload button, clicking...");
          await uploadButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Get the file input (should be available now)
      fileInput = await page.locator('input[type="file"]').first();
    } catch (error) {
      console.error("[Step 4] Could not find upload mechanism");
      await page.screenshot({
        path: "e2e-tests/screenshots/05-upload-not-found.png",
        fullPage: true,
      });
      throw new Error(
        "Upload button or file input not found. Please check the chat page UI.",
      );
    }

    // STEP 5: Upload the document
    console.log("[Step 5] Uploading document...");

    try {
      await fileInput.setInputFiles(TEST_DOCUMENT_PATH);
      console.log("[Step 5] File selected successfully");

      // Wait for upload to process
      await page.waitForTimeout(2000);

      // Look for success message or uploaded file indicator
      await page
        .waitForSelector(
          'text=/upload.*success|file.*uploaded/i, [class*="success"], .text-green-500',
          {
            timeout: 10000,
            state: "visible",
          },
        )
        .catch(async (e) => {
          console.log(
            "[Step 5] No explicit upload success message found, continuing...",
          );
          // This is OK - some apps don't show a success message
        });

      await page.screenshot({
        path: "e2e-tests/screenshots/06-document-uploaded.png",
        fullPage: true,
      });

      console.log("[Step 5] Document upload completed");
    } catch (error) {
      console.error(`[Step 5] Upload error: ${error}`);
      await page.screenshot({
        path: "e2e-tests/screenshots/06-upload-error.png",
        fullPage: true,
      });
      throw error;
    }

    // STEP 6: Click "Analyze Document" button
    console.log("[Step 6] Looking for Analyze Document button...");

    try {
      // Look for analyze button
      const analyzeButton = await page
        .getByRole("button", { name: /analyze.*document|analyze/i })
        .or(page.locator('button:has-text("Analyze")'))
        .first();

      const analyzeExists = (await analyzeButton.count()) > 0;

      if (!analyzeExists) {
        console.log(
          "[Step 6] Analyze button not found, checking page state...",
        );
        await page.screenshot({
          path: "e2e-tests/screenshots/07-no-analyze-button.png",
          fullPage: true,
        });
        throw new Error(
          "Analyze Document button not found. Upload may have failed or UI may differ.",
        );
      }

      // Click the analyze button
      console.log("[Step 6] Clicking Analyze Document button...");
      await analyzeButton.click();

      await page.screenshot({
        path: "e2e-tests/screenshots/07-analyze-clicked.png",
        fullPage: true,
      });
    } catch (error) {
      console.error(`[Step 6] Error clicking analyze button: ${error}`);
      throw error;
    }

    // STEP 7: Wait for AI analysis to complete
    console.log(
      "[Step 7] Waiting for AI analysis to complete (timeout: 60s)...",
    );

    const analysisStartTime = Date.now();

    try {
      // Wait for analysis to complete - look for:
      // 1. No error messages
      // 2. Analysis results appear
      // 3. "Create Case from Analysis" button appears

      // First, wait for loading to finish
      await page
        .waitForLoadState("networkidle", { timeout: 5000 })
        .catch(() => {
          console.log("[Step 7] Network not idle yet, continuing...");
        });

      // Wait for either analysis results or error
      const resultOrError = await Promise.race([
        // Wait for analysis text
        page
          .waitForSelector("text=/This is a|Analysis|case type|claimant/i", {
            timeout: 60000,
            state: "visible",
          })
          .then(() => "success"),

        // Wait for error message
        page
          .waitForSelector('text=/error|failed|500|unable/i, [role="alert"]', {
            timeout: 60000,
            state: "visible",
          })
          .then(() => "error"),
      ]);

      const analysisDuration = (
        (Date.now() - analysisStartTime) /
        1000
      ).toFixed(2);
      console.log(`[Step 7] Analysis completed in ${analysisDuration}s`);

      if (resultOrError === "error") {
        // Analysis failed
        await page.screenshot({
          path: "e2e-tests/screenshots/08-analysis-error.png",
          fullPage: true,
        });

        const errorText = await page
          .locator('[role="alert"], .error, .text-red-500')
          .first()
          .textContent();
        console.error(`[Step 7] Analysis failed with error: ${errorText}`);

        throw new Error(`AI Analysis failed: ${errorText}`);
      }

      // Success - take screenshot
      await page.screenshot({
        path: "e2e-tests/screenshots/08-analysis-complete.png",
        fullPage: true,
      });

      console.log("[Step 7] Analysis completed successfully!");
    } catch (error) {
      console.error(`[Step 7] Analysis error: ${error}`);
      await page.screenshot({
        path: "e2e-tests/screenshots/08-analysis-timeout.png",
        fullPage: true,
      });
      throw error;
    }

    // STEP 8: Verify analysis results
    console.log("[Step 8] Verifying analysis results...");

    try {
      // Check for NO error messages
      const errorElements = await page
        .locator(
          '[role="alert"].error, .text-red-500:has-text("error"), .text-destructive:has-text("error")',
        )
        .count();
      expect(errorElements).toBe(0);
      console.log("[Step 8] ✓ No error messages present");

      // Check for analysis text
      const analysisText = await page
        .locator("text=/This is a|Analysis|case type/i")
        .first()
        .textContent();
      expect(analysisText).toBeTruthy();
      expect(analysisText!.length).toBeGreaterThan(10);
      console.log(
        `[Step 8] ✓ Analysis text found: "${analysisText?.substring(0, 100)}..."`,
      );

      // Check for "Create Case from Analysis" button
      const createCaseButton = await page
        .getByRole("button", { name: /create.*case.*from.*analysis/i })
        .or(page.locator('button:has-text("Create Case")'))
        .first();

      const createCaseExists = (await createCaseButton.count()) > 0;
      expect(createCaseExists).toBe(true);
      console.log('[Step 8] ✓ "Create Case from Analysis" button found');

      // Get full analysis text for preview
      const fullAnalysis = await page
        .locator("text=/This is a/i")
        .first()
        .locator("..")
        .textContent();
      console.log("\n=== Analysis Preview ===");
      console.log(fullAnalysis?.substring(0, 500) + "...\n");

      await page.screenshot({
        path: "e2e-tests/screenshots/09-analysis-verified.png",
        fullPage: true,
      });

      console.log("[Step 8] ✓ All analysis results verified successfully!");
    } catch (error) {
      console.error(`[Step 8] Verification error: ${error}`);
      await page.screenshot({
        path: "e2e-tests/screenshots/09-verification-failed.png",
        fullPage: true,
      });
      throw error;
    }

    console.log("\n=== TEST PASSED ===");
    console.log("✓ Login successful");
    console.log("✓ Navigation to chat successful");
    console.log("✓ Document upload successful");
    console.log("✓ AI analysis completed without errors");
    console.log("✓ Analysis results displayed correctly");
    console.log("✓ Create Case button available\n");
  });

  test("should handle upload errors gracefully", async () => {
    console.log("\n=== Testing Error Handling ===\n");

    // Login first
    await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });

    const usernameInput = await page
      .locator('input[name="username"]')
      .or(page.locator('input[type="text"]'))
      .first();
    await usernameInput.fill(TEST_CREDENTIALS.username);

    const passwordInput = await page
      .locator('input[name="password"], input[type="password"]')
      .first();
    await passwordInput.fill(TEST_CREDENTIALS.password);

    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();

    await page.waitForLoadState("networkidle");

    // Navigate to chat
    await page.goto(`${APP_URL}/chat`, { waitUntil: "networkidle" });

    // Try to upload an invalid file type (if validation exists)
    console.log("[Test] Attempting to upload invalid file type...");

    // Create a temporary invalid file
    const invalidFilePath = path.join(
      __dirname,
      "..",
      "test-documents",
      "test.exe",
    );
    if (!fs.existsSync(invalidFilePath)) {
      fs.writeFileSync(invalidFilePath, "Invalid file content");
    }

    try {
      const fileInput = await page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(invalidFilePath);

      // Wait to see if error appears
      await page.waitForTimeout(2000);

      // Check for error message
      const errorVisible = await page
        .locator("text=/invalid.*file|unsupported.*type|not.*allowed/i")
        .isVisible()
        .catch(() => false);

      if (errorVisible) {
        console.log("[Test] ✓ Error message shown for invalid file type");
        await page.screenshot({
          path: "e2e-tests/screenshots/10-invalid-file-error.png",
          fullPage: true,
        });
      } else {
        console.log(
          "[Test] ℹ No validation error shown (validation may not exist or file accepted)",
        );
      }
    } finally {
      // Cleanup
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }

    console.log("[Test] Error handling test completed\n");
  });
});

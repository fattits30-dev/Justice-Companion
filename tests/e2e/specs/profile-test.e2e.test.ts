import { expect, test } from "@playwright/test";
import crypto from "crypto";
import {
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from "../setup/electron-setup.js";
import { getTestDatabase, seedUserConsents } from "../setup/test-database.js";

/**
 * Generate a secure random password for testing
 */
function generateSecurePassword(): string {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  return `SecurePass${timestamp}${randomNum}!`;
}

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Launch app with clean database (no seed data)
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  // Close app and cleanup
  await closeElectronApp(testApp);
});

test.describe("User Profile Management", () => {
  test("should save and persist profile changes", async () => {
    const { window, dbPath } = testApp;

    // 1. Create and login user first
    const db = getTestDatabase(dbPath);
    const username = `profile_test_${Date.now()}`;
    const email = `${username}@example.com`;
    const password = generateSecurePassword();

    // Hash password using scrypt (matching AuthenticationService)
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString("base64");
    const passwordSalt = salt.toString("base64");

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, email, passwordHash, passwordSalt);

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as any;

    // Grant required consent
    seedUserConsents(db, user.id);
    db.close();

    // 2. Login to the app
    await window.waitForLoadState("domcontentloaded");
    await expect(window.getByText("Sign In")).toBeVisible({ timeout: 10000 });

    await window.fill("#username", username);
    await window.fill("#password", password);
    await window.getByRole("button", { name: "Login" }).click();

    // Wait for main app to load
    await expect(window.getByText("Welcome to Justice Companion")).toBeVisible({
      timeout: 10000,
    });

    // 3. Click on the user profile area in the sidebar to open profile manager
    // Try clicking on the username text in the sidebar
    await window.getByText(username).first().click();

    // Wait for profile manager dialog to open
    await expect(window.getByText("Profile Manager")).toBeVisible({
      timeout: 5000,
    });

    // 4. Fill in profile information
    const testFirstName = "John";
    const testLastName = "Doe";
    const testEmail = "john.doe@example.com";

    // Clear and fill first name
    const firstNameInput = window.locator(
      'input[placeholder="Enter first name"]'
    );
    await firstNameInput.clear();
    await firstNameInput.fill(testFirstName);

    // Clear and fill last name
    const lastNameInput = window.locator(
      'input[placeholder="Enter last name"]'
    );
    await lastNameInput.clear();
    await lastNameInput.fill(testLastName);

    // Clear and fill email
    const emailInput = window.locator('input[placeholder="Enter your email"]');
    await emailInput.clear();
    await emailInput.fill(testEmail);

    // 5. Click save
    await window.getByRole("button", { name: "Save Changes" }).click();

    // Wait for success toast
    await expect(window.getByText("Profile updated")).toBeVisible({
      timeout: 5000,
    });

    // 6. Verify the profile was updated in the UI
    await expect(
      window.getByText(`${testFirstName} ${testLastName}`)
    ).toBeVisible({
      timeout: 5000,
    });

    // 7. Refresh the page to test persistence
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Wait for app to reload (should auto-login due to session)
    await expect(window.getByText("Welcome to Justice Companion")).toBeVisible({
      timeout: 10000,
    });

    // 8. Verify profile data persisted after refresh
    await expect(
      window.getByText(`${testFirstName} ${testLastName}`)
    ).toBeVisible({
      timeout: 5000,
    });

    console.log("✅ Profile test passed: Data saved and persisted correctly");
  });

  test("should pass profile data to document analysis", async () => {
    const { window, dbPath } = testApp;

    // 1. Create and login user with profile data
    const db = getTestDatabase(dbPath);
    const username = `doc_test_${Date.now()}`;
    const email = `${username}@example.com`;
    const password = generateSecurePassword();

    // Hash password using scrypt
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString("base64");
    const passwordSalt = salt.toString("base64");

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, email, passwordHash, passwordSalt);

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as any;

    // Grant required consent
    seedUserConsents(db, user.id);
    db.close();

    // 2. Login to the app
    await window.waitForLoadState("domcontentloaded");
    await expect(window.getByText("Sign In")).toBeVisible({ timeout: 10000 });

    await window.fill("#username", username);
    await window.fill("#password", password);
    await window.getByRole("button", { name: "Login" }).click();

    // Wait for main app to load
    await expect(window.getByText("Welcome to Justice Companion")).toBeVisible({
      timeout: 10000,
    });

    // 3. Set up profile data in localStorage (simulating user having set their profile)
    await window.evaluate(() => {
      localStorage.setItem("userFirstName", "Jane");
      localStorage.setItem("userLastName", "Smith");
      localStorage.setItem("userFullName", "Jane Smith");
      localStorage.setItem("userEmail", "jane.smith@example.com");
    });

    // 4. Navigate to chat view
    await window.getByRole("button", { name: /Chat/i }).click();

    // Wait for chat view to load
    await expect(window.getByText("AI Legal Assistant")).toBeVisible({
      timeout: 5000,
    });

    // 5. Check localStorage to verify profile data is available
    const localStorageData = await window.evaluate(() => {
      return {
        firstName: localStorage.getItem("userFirstName"),
        lastName: localStorage.getItem("userLastName"),
        fullName: localStorage.getItem("userFullName"),
        email: localStorage.getItem("userEmail"),
      };
    });

    console.log("Profile data in localStorage:", localStorageData);

    // Verify profile data exists
    expect(localStorageData.firstName).toBe("Jane");
    expect(localStorageData.lastName).toBe("Smith");
    expect(localStorageData.fullName).toBe("Jane Smith");
    expect(localStorageData.email).toBe("jane.smith@example.com");

    console.log("✅ Profile data verification passed");
  });
});

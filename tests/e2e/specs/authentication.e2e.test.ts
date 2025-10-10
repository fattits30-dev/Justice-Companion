import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, type ElectronTestApp } from '../setup/electron-setup.js';
import { getTestDatabase } from '../setup/test-database.js';
import crypto from 'crypto';

/**
 * E2E Tests for Authentication System
 *
 * Tests cover:
 * 1. First-time user registration with consent
 * 2. Returning user login
 * 3. Invalid login attempts
 * 4. Session persistence across page refreshes
 * 5. User logout flow
 * 6. Password validation requirements
 * 7. Session expiration handling
 *
 * All tests use real UI interactions and verify database state.
 */

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Launch app with clean database (no seed data)
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  // Close app and cleanup
  await closeElectronApp(testApp);
});

test.describe('Authentication E2E', () => {
  /**
   * Scenario 1: First-Time User Registration
   * User creates new account → accepts consent → accesses app
   */
  test('should allow new user to register, accept consent, and access app', async () => {
    const { window, dbPath } = testApp;

    // 1. Start app, should show login screen
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);

    // Verify we're on the login screen
    const loginHeading = await window.$('text=Sign In');
    expect(loginHeading).toBeTruthy();

    // 2. Click "Create Account" button
    const createAccountBtn = await window.$('button:has-text("Create Account")');
    expect(createAccountBtn).toBeTruthy();
    await createAccountBtn?.click();
    await window.waitForTimeout(500);

    // Verify registration screen is shown
    const registerHeading = await window.$('text=Create Account');
    expect(registerHeading).toBeTruthy();

    // 3. Fill registration form
    const username = `testuser_${Date.now()}`;
    const email = `${username}@example.com`;
    const password = 'SecurePassword123!';

    await window.fill('#username', username);
    await window.fill('#email', email);
    await window.fill('#password', password);
    await window.fill('#confirmPassword', password);

    // 4. Click "Register" button
    const registerBtn = await window.$('button:has-text("Create Account")');
    expect(registerBtn).toBeTruthy();
    await registerBtn?.click();
    await window.waitForTimeout(2000);

    // 5. Should show consent banner
    const consentHeading = await window.$('text=Privacy & Consent');
    expect(consentHeading).toBeTruthy();

    // Verify required consent checkbox is present
    const dataProcessingCheckbox = await window.$('input[type="checkbox"]');
    expect(dataProcessingCheckbox).toBeTruthy();

    // 6. Click first checkbox (data processing - required)
    const checkboxes = await window.$$('input[type="checkbox"]');
    await checkboxes[0]?.check(); // Data processing
    await window.waitForTimeout(300);

    // Click "Accept All" or "Accept & Continue" button
    const acceptBtn = await window.$('button:has-text("Accept")');
    expect(acceptBtn).toBeTruthy();
    await acceptBtn?.click();
    await window.waitForTimeout(2000);

    // 7. Should show main app (dashboard or main content)
    // Check if we've navigated past the consent screen
    const consentBanner = await window.$('text=Privacy & Consent');
    expect(consentBanner).toBeFalsy(); // Should be gone

    // 8. Verify user info is displayed (check for username in UI)
    // The sidebar or header should show the logged-in username
    const userElement = await window.$(`text=${username}`);
    expect(userElement).toBeTruthy();

    // Verify database state
    const db = getTestDatabase(dbPath);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    expect(user).toBeDefined();
    expect(user.username).toBe(username);
    expect(user.email).toBe(email);

    // Verify session exists
    const session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id);
    expect(session).toBeDefined();

    // Verify consent was granted
    const consent = db.prepare('SELECT * FROM consents WHERE user_id = ? AND consent_type = ?')
      .get(user.id, 'data_processing');
    expect(consent).toBeDefined();

    db.close();
  });

  /**
   * Scenario 2: Returning User Login
   * Existing user logs in → immediately accesses app (no consent banner)
   */
  test('should allow existing user to login', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user in database first
    const db = getTestDatabase(dbPath);
    const username = `existing_${Date.now()}`;
    const email = `${username}@example.com`;
    const password = 'SecurePassword123!';

    // Hash password using scrypt (matching AuthenticationService)
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString('base64');

    db.prepare(`
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(username, email, passwordHash);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant required consent
    db.prepare(`
      INSERT INTO consents (user_id, consent_type, granted, granted_at)
      VALUES (?, 'data_processing', 1, datetime('now'))
    `).run(user.id);

    db.close();

    // 2. Start app, should show login screen
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);

    const loginHeading = await window.$('text=Sign In');
    expect(loginHeading).toBeTruthy();

    // 3. Fill login form
    await window.fill('#username', username);
    await window.fill('#password', password);

    // 4. Click "Login" button
    const loginBtn = await window.$('button:has-text("Sign In")');
    expect(loginBtn).toBeTruthy();
    await loginBtn?.click();
    await window.waitForTimeout(2000);

    // 5. Should show main app immediately (no consent banner)
    const consentBanner = await window.$('text=Privacy & Consent');
    expect(consentBanner).toBeFalsy();

    // 6. Verify user name in UI
    const userElement = await window.$(`text=${username}`);
    expect(userElement).toBeTruthy();

    // Verify session was created
    const dbVerify = getTestDatabase(dbPath);
    const session = dbVerify.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id);
    expect(session).toBeDefined();
    dbVerify.close();
  });

  /**
   * Scenario 3: Invalid Login
   * User enters wrong credentials → error shown → remains on login screen
   */
  test('should show error for invalid credentials', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user
    const db = getTestDatabase(dbPath);
    const username = `testuser_${Date.now()}`;
    const correctPassword = 'CorrectPassword123!';

    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(correctPassword, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString('base64');

    db.prepare(`
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(username, `${username}@example.com`, passwordHash);

    db.close();

    // 2. Start app at login screen
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);

    // 3. Fill login form with wrong password
    await window.fill('#username', username);
    await window.fill('#password', 'WrongPassword123!');

    // 4. Click "Login" button
    const loginBtn = await window.$('button:has-text("Sign In")');
    await loginBtn?.click();
    await window.waitForTimeout(1500);

    // 5. Should show error message
    const errorMessage = await window.$('text=/Invalid.*credentials|Login failed|Authentication failed/i');
    expect(errorMessage).toBeTruthy();

    // 6. Should remain on login screen
    const loginHeading = await window.$('text=Sign In');
    expect(loginHeading).toBeTruthy();

    // User should NOT be in main app
    const mainContent = await window.$('[data-testid="dashboard"]');
    expect(mainContent).toBeFalsy();
  });

  /**
   * Scenario 4: Session Persistence
   * User logs in → refreshes page → still logged in
   */
  test('should maintain session after page refresh', async () => {
    const { window, dbPath } = testApp;

    // 1. Create and login user
    const db = getTestDatabase(dbPath);
    const username = `persistent_${Date.now()}`;
    const password = 'SecurePassword123!';

    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString('base64');

    db.prepare(`
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(username, `${username}@example.com`, passwordHash);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant consent
    db.prepare(`
      INSERT INTO consents (user_id, consent_type, granted, granted_at)
      VALUES (?, 'data_processing', 1, datetime('now'))
    `).run(user.id);

    db.close();

    // Login
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);
    await window.fill('#username', username);
    await window.fill('#password', password);
    const loginBtn = await window.$('button:has-text("Sign In")');
    await loginBtn?.click();
    await window.waitForTimeout(2000);

    // 2. Verify logged in
    let userElement = await window.$(`text=${username}`);
    expect(userElement).toBeTruthy();

    // 3. Refresh page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // 4. Should still be logged in (no login screen shown)
    const loginScreen = await window.$('text=Sign In');
    expect(loginScreen).toBeFalsy();

    // 5. User name still displayed
    userElement = await window.$(`text=${username}`);
    expect(userElement).toBeTruthy();
  });

  /**
   * Scenario 5: Logout
   * User logs out → returns to login screen → session invalidated
   */
  test('should logout user and return to login screen', async () => {
    const { window, dbPath } = testApp;

    // 1. Create and login user
    const db = getTestDatabase(dbPath);
    const username = `logout_${Date.now()}`;
    const password = 'SecurePassword123!';

    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString('base64');

    db.prepare(`
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(username, `${username}@example.com`, passwordHash);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant consent
    db.prepare(`
      INSERT INTO consents (user_id, consent_type, granted, granted_at)
      VALUES (?, 'data_processing', 1, datetime('now'))
    `).run(user.id);

    db.close();

    // Login
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);
    await window.fill('#username', username);
    await window.fill('#password', password);
    const loginBtn = await window.$('button:has-text("Sign In")');
    await loginBtn?.click();
    await window.waitForTimeout(2000);

    // 2. Click logout button (usually in sidebar or user menu)
    // Try multiple possible logout button locations
    let logoutBtn = await window.$('button:has-text("Logout")') ||
                     await window.$('button:has-text("Log Out")') ||
                     await window.$('button:has-text("Sign Out")') ||
                     await window.$('[data-testid="logout-btn"]');

    // If not found, try clicking on user menu first
    if (!logoutBtn) {
      const userMenu = await window.$('[data-testid="user-menu"]') ||
                        await window.$(`text=${username}`);
      if (userMenu) {
        await userMenu.click();
        await window.waitForTimeout(500);
        logoutBtn = await window.$('button:has-text("Logout")') ||
                    await window.$('button:has-text("Log Out")');
      }
    }

    expect(logoutBtn).toBeTruthy();

    // 3. Click logout button
    await logoutBtn?.click();
    await window.waitForTimeout(500);

    // 4. May show confirmation dialog
    const confirmBtn = await window.$('button:has-text("Logout")') ||
                        await window.$('button:has-text("Yes")') ||
                        await window.$('button:has-text("Confirm")');
    if (confirmBtn) {
      await confirmBtn.click();
      await window.waitForTimeout(1000);
    }

    // 5. Should return to login screen
    await window.waitForTimeout(1000);
    const loginScreen = await window.$('text=Sign In');
    expect(loginScreen).toBeTruthy();

    // 6. Session should be invalidated in database
    const dbVerify = getTestDatabase(dbPath);
    const session = dbVerify.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id);
    // Session either deleted or has deleted_at timestamp
    if (session) {
      expect((session as any).deleted_at).toBeTruthy();
    }
    dbVerify.close();
  });

  /**
   * Scenario 6: Password Validation
   * User tries various invalid passwords → sees specific error messages
   */
  test('should enforce password requirements during registration', async () => {
    const { window } = testApp;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);

    // Navigate to registration screen
    const createAccountBtn = await window.$('button:has-text("Create Account")');
    await createAccountBtn?.click();
    await window.waitForTimeout(500);

    const username = `passtest_${Date.now()}`;
    const email = `${username}@example.com`;

    // Fill username and email
    await window.fill('#username', username);
    await window.fill('#email', email);

    // Test 1: Password too short (< 12 characters)
    await window.fill('#password', 'Short1A');
    await window.fill('#confirmPassword', 'Short1A');
    const registerBtn1 = await window.$('button:has-text("Create Account")');
    await registerBtn1?.click();
    await window.waitForTimeout(800);

    let errorMsg = await window.$('text=/at least 12 characters/i');
    expect(errorMsg).toBeTruthy();

    // Test 2: Password missing uppercase
    await window.fill('#password', 'nouppercase123');
    await window.fill('#confirmPassword', 'nouppercase123');
    const registerBtn2 = await window.$('button:has-text("Create Account")');
    await registerBtn2?.click();
    await window.waitForTimeout(800);

    errorMsg = await window.$('text=/uppercase/i');
    expect(errorMsg).toBeTruthy();

    // Test 3: Password missing lowercase
    await window.fill('#password', 'NOLOWERCASE123');
    await window.fill('#confirmPassword', 'NOLOWERCASE123');
    const registerBtn3 = await window.$('button:has-text("Create Account")');
    await registerBtn3?.click();
    await window.waitForTimeout(800);

    errorMsg = await window.$('text=/lowercase/i');
    expect(errorMsg).toBeTruthy();

    // Test 4: Password missing number
    await window.fill('#password', 'NoNumbersHere!');
    await window.fill('#confirmPassword', 'NoNumbersHere!');
    const registerBtn4 = await window.$('button:has-text("Create Account")');
    await registerBtn4?.click();
    await window.waitForTimeout(800);

    errorMsg = await window.$('text=/number/i');
    expect(errorMsg).toBeTruthy();

    // Test 5: Passwords don't match
    await window.fill('#password', 'ValidPassword123!');
    await window.fill('#confirmPassword', 'DifferentPassword123!');
    const registerBtn5 = await window.$('button:has-text("Create Account")');
    await registerBtn5?.click();
    await window.waitForTimeout(800);

    errorMsg = await window.$('text=/do not match|don\'t match/i');
    expect(errorMsg).toBeTruthy();

    // Test 6: Valid password - should proceed to consent
    await window.fill('#password', 'ValidPassword123!');
    await window.fill('#confirmPassword', 'ValidPassword123!');
    const registerBtn6 = await window.$('button:has-text("Create Account")');
    await registerBtn6?.click();
    await window.waitForTimeout(2000);

    // Should reach consent screen or next step
    const registrationScreen = await window.$('text=Create Account');
    // If we're no longer on registration screen, validation passed
    // (We'll be on consent screen or logged in)
    const consentOrDashboard = await window.$('text=Privacy & Consent') ||
                               await window.$(`text=${username}`);
    expect(consentOrDashboard).toBeTruthy();
  });

  /**
   * Scenario 7: Session Expiration
   * User's session expires → redirected to login on next action
   */
  test('should redirect to login after session expires', async () => {
    const { window, dbPath } = testApp;

    // 1. Create and login user
    const db = getTestDatabase(dbPath);
    const username = `expire_${Date.now()}`;
    const password = 'SecurePassword123!';

    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = Buffer.concat([salt, hash]).toString('base64');

    db.prepare(`
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(username, `${username}@example.com`, passwordHash);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant consent
    db.prepare(`
      INSERT INTO consents (user_id, consent_type, granted, granted_at)
      VALUES (?, 'data_processing', 1, datetime('now'))
    `).run(user.id);

    db.close();

    // Login
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);
    await window.fill('#username', username);
    await window.fill('#password', password);
    const loginBtn = await window.$('button:has-text("Sign In")');
    await loginBtn?.click();
    await window.waitForTimeout(2000);

    // Verify logged in
    let userElement = await window.$(`text=${username}`);
    expect(userElement).toBeTruthy();

    // 2. Manually expire session in database
    const dbExpire = getTestDatabase(dbPath);
    dbExpire.prepare(`
      UPDATE sessions
      SET expires_at = datetime('now', '-1 day')
      WHERE user_id = ?
    `).run(user.id);
    dbExpire.close();

    // 3. Try to access protected route or refresh
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // 4. Should redirect to login screen
    const loginScreen = await window.$('text=Sign In');
    expect(loginScreen).toBeTruthy();

    // User should not be logged in
    userElement = await window.$(`text=${username}`);
    expect(userElement).toBeFalsy();
  });
});

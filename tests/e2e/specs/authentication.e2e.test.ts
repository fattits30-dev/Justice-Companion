import { expect, test } from '@playwright/test';
import crypto from 'crypto';
import {
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import { getTestDatabase, seedUserConsents } from '../setup/test-database.js';

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

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 2. Click "Create Account" button (full text: "Don't have an account? Create one")
    await window.getByRole('button', { name: /Create one/i }).click();

    // ✅ Web-first assertion: Wait for registration screen
    await expect(window.getByText('Create Account')).toBeVisible({ timeout: 5000 });

    // 3. Fill registration form
    const username = `testuser_${Date.now()}`;
    const email = `${username}@example.com`;
    const password = 'SecurePassword123!';

    await window.fill('#username', username);
    await window.fill('#email', email);
    await window.fill('#password', password);
    await window.fill('#confirmPassword', password);

    // 4. Click "Register" button and wait for navigation to consent screen
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Web-first assertion: Wait for consent screen to appear after registration
    await expect(window.getByText('Privacy & Consent')).toBeVisible({ timeout: 10000 });

    // 5. Verify required consent checkbox is present and check it
    const checkboxes = await window.$$('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    await checkboxes[0]?.check(); // Data processing

    // 6. Click "Accept" button and wait for navigation to main app
    await window.getByRole('button', { name: /Accept/i }).click();

    // ✅ Web-first assertion: Wait for consent screen to disappear
    await expect(window.getByText('Privacy & Consent')).toBeHidden({ timeout: 10000 });

    // 7. Verify successful login by checking Dashboard is displayed
    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
      timeout: 5000,
    });

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
    const consent = db
      .prepare('SELECT * FROM consents WHERE user_id = ? AND consent_type = ?')
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
    const passwordSalt = salt.toString('base64');

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, email, passwordHash, passwordSalt);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant required consent using shared function
    seedUserConsents(db, user.id);

    db.close();

    // 2. Start app, should show login screen
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 3. Fill login form
    await window.fill('#username', username);
    await window.fill('#password', password);

    // 4. Click "Login" button and wait for navigation
    await window.getByRole('button', { name: 'Login' }).click();

    // ✅ Web-first assertion: Wait for main app (no consent banner should appear)
    await expect(window.getByText('Privacy & Consent')).toBeHidden({ timeout: 5000 });

    // 5. Verify successful login by checking Dashboard is displayed
    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
      timeout: 5000,
    });

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
    const passwordSalt = salt.toString('base64');

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, `${username}@example.com`, passwordHash, passwordSalt);

    db.close();

    // 2. Start app at login screen
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 3. Fill login form with wrong password
    await window.fill('#username', username);
    await window.fill('#password', 'WrongPassword123!');

    // 4. Click "Login" button
    await window.getByRole('button', { name: 'Login' }).click();

    // ✅ Web-first assertion: Wait for error message to appear
    await expect(
      window.getByText(/Invalid.*credentials|Login failed|Authentication failed/i)
    ).toBeVisible({ timeout: 5000 });

    // 5. Should remain on login screen
    await expect(window.getByText('Sign In')).toBeVisible();

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
    const passwordHash = hash.toString('hex');
    const passwordSalt = salt.toString('hex');

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, `${username}@example.com`, passwordHash, passwordSalt);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant consent
    db.prepare(
      `
      INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
      VALUES (?, 'data_processing', 1, datetime('now'), '1.0')
    `
    ).run(user.id);

    db.close();

    // Login
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    await window.fill('#username', username);
    await window.fill('#password', password);
    await window.getByRole('button', { name: 'Login' }).click();

    // 2. Verify logged in by checking Dashboard is displayed
    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
      timeout: 10000,
    });

    // 3. Refresh page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Login screen should NOT appear
    await expect(window.getByText('Sign In')).toBeHidden({ timeout: 5000 });

    // 4. Dashboard still displayed (session persisted)
    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
      timeout: 5000,
    });
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
    const passwordHash = hash.toString('hex');
    const passwordSalt = salt.toString('hex');

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, `${username}@example.com`, passwordHash, passwordSalt);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant consent
    db.prepare(
      `
      INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
      VALUES (?, 'data_processing', 1, datetime('now'), '1.0')
    `
    ).run(user.id);

    db.close();

    // Login
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    await window.fill('#username', username);
    await window.fill('#password', password);
    await window.getByRole('button', { name: 'Login' }).click();

    // ✅ Wait for successful login by checking Dashboard is displayed
    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
      timeout: 10000,
    });

    // 2. Click logout button (usually in sidebar or user menu)
    // Try multiple possible logout button locations
    let logoutBtn =
      (await window.$('button:has-text("Logout")')) ||
      (await window.$('button:has-text("Log Out")')) ||
      (await window.$('button:has-text("Sign Out")')) ||
      (await window.$('[data-testid="logout-btn"]'));

    // If not found, try clicking on user menu first
    if (!logoutBtn) {
      const userMenu =
        (await window.$('[data-testid="user-menu"]')) || (await window.$(`text=${username}`));
      if (userMenu) {
        await userMenu.click();
        // ✅ Wait for menu to open
        await window.waitForTimeout(300);
        logoutBtn =
          (await window.$('button:has-text("Logout")')) ||
          (await window.$('button:has-text("Log Out")'));
      }
    }

    expect(logoutBtn).toBeTruthy();

    // 3. Click logout button
    await logoutBtn?.click();

    // 4. May show confirmation dialog
    const confirmBtn =
      (await window.$('button:has-text("Logout")')) ||
      (await window.$('button:has-text("Yes")')) ||
      (await window.$('button:has-text("Confirm")'));
    if (confirmBtn) {
      await confirmBtn.click();
    }

    // ✅ Web-first assertion: Should return to login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

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

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // Navigate to registration screen
    await window.getByRole('button', { name: /Create one/i }).click();

    // ✅ Wait for registration screen
    await expect(window.getByText('Create Account')).toBeVisible({ timeout: 5000 });

    const username = `passtest_${Date.now()}`;
    const email = `${username}@example.com`;

    // Fill username and email
    await window.fill('#username', username);
    await window.fill('#email', email);

    // Test 1: Password too short (< 12 characters)
    await window.fill('#password', 'Short1A');
    await window.fill('#confirmPassword', 'Short1A');
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Wait for error message
    await expect(window.getByText(/at least 12 characters/i)).toBeVisible({ timeout: 3000 });

    // Test 2: Password missing uppercase
    await window.fill('#password', 'nouppercase123');
    await window.fill('#confirmPassword', 'nouppercase123');
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Wait for error message
    await expect(window.getByText(/uppercase/i)).toBeVisible({ timeout: 3000 });

    // Test 3: Password missing lowercase
    await window.fill('#password', 'NOLOWERCASE123');
    await window.fill('#confirmPassword', 'NOLOWERCASE123');
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Wait for error message
    await expect(window.getByText(/lowercase/i)).toBeVisible({ timeout: 3000 });

    // Test 4: Password missing number
    await window.fill('#password', 'NoNumbersHere!');
    await window.fill('#confirmPassword', 'NoNumbersHere!');
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Wait for error message
    await expect(window.getByText(/number/i)).toBeVisible({ timeout: 3000 });

    // Test 5: Passwords don't match
    await window.fill('#password', 'ValidPassword123!');
    await window.fill('#confirmPassword', 'DifferentPassword123!');
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Wait for error message
    await expect(window.getByText(/do not match|don't match/i)).toBeVisible({ timeout: 3000 });

    // Test 6: Valid password - should proceed to consent
    await window.fill('#password', 'ValidPassword123!');
    await window.fill('#confirmPassword', 'ValidPassword123!');
    await window.getByRole('button', { name: /Create Account/i }).click();

    // ✅ Should reach consent screen (registration screen should disappear)
    await expect(window.getByText('Privacy & Consent')).toBeVisible({ timeout: 10000 });
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
    const passwordSalt = salt.toString('base64');

    db.prepare(
      `
      INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(username, `${username}@example.com`, passwordHash, passwordSalt);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    // Grant consent
    db.prepare(
      `
      INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
      VALUES (?, 'data_processing', 1, datetime('now'), '1.0')
    `
    ).run(user.id);

    db.close();

    // Login
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Wait for login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    await window.fill('#username', username);
    await window.fill('#password', password);
    await window.getByRole('button', { name: 'Login' }).click();

    // ✅ Verify logged in by checking Dashboard is displayed
    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
      timeout: 10000,
    });

    // 2. Manually expire session in database
    const dbExpire = getTestDatabase(dbPath);
    dbExpire
      .prepare(
        `
      UPDATE sessions
      SET expires_at = datetime('now', '-1 day')
      WHERE user_id = ?
    `
      )
      .run(user.id);
    dbExpire.close();

    // 3. Try to access protected route or refresh
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // ✅ Web-first assertion: Should redirect to login screen
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // Dashboard should not be visible (user logged out)
    await expect(window.getByText('Welcome to Justice Companion')).toBeHidden({
      timeout: 3000,
    });
  });

  /**
   * Scenario 8: Remember Me Checkbox Visibility
   * Verify Remember Me checkbox is visible and accessible on login screen
   */
  test('should display Remember Me checkbox on login screen', async () => {
    const { window } = testApp;

    // 1. Navigate to login screen
    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 2. Verify Remember Me checkbox is visible
    const rememberMeCheckbox = window.getByLabel('Remember me for 30 days');
    await expect(rememberMeCheckbox).toBeVisible();

    // 3. Verify checkbox is not checked by default
    await expect(rememberMeCheckbox).not.toBeChecked();

    // 4. Verify checkbox can be toggled
    await rememberMeCheckbox.check();
    await expect(rememberMeCheckbox).toBeChecked();

    await rememberMeCheckbox.uncheck();
    await expect(rememberMeCheckbox).not.toBeChecked();

    // 5. Verify label text is correct
    await expect(window.getByText('Remember me for 30 days')).toBeVisible();
  });
});

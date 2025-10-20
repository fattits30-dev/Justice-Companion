import { expect, test } from '@playwright/test';
import crypto from 'crypto';
import {
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import { getTestDatabase, seedUserConsents } from '../setup/test-database.js';

/**
 * E2E Tests for Remember Me Feature
 *
 * Tests cover:
 * 1. Remember Me login flow and session persistence across app restarts
 * 2. Login without Remember Me (no session persistence)
 * 3. Logout clears persisted session
 * 4. Expired session handling on app startup
 * 5. Security warning UI when Remember Me is checked
 * 6. Rate limiting integration with Remember Me
 *
 * All tests use real UI interactions and verify database state.
 * Tests require app restart functionality to validate session persistence.
 */

/**
 * Helper: Create test user in database
 */
async function createTestUser(
  dbPath: string,
  username: string,
  password: string
): Promise<{ userId: number }> {
  const db = getTestDatabase(dbPath);

  try {
    const email = `${username}@example.com`;
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

    // Grant required consent
    seedUserConsents(db, user.id);

    return { userId: user.id };
  } finally {
    db.close();
  }
}

/**
 * Helper: Login with Remember Me
 */
async function loginWithRememberMe(
  testApp: ElectronTestApp,
  username: string,
  password: string,
  rememberMe: boolean = true
): Promise<void> {
  const { window } = testApp;

  await window.waitForLoadState('domcontentloaded');
  await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

  await window.fill('#username', username);
  await window.fill('#password', password);

  if (rememberMe) {
    await window.getByLabel('Remember me for 30 days').check();
  }

  await window.getByRole('button', { name: 'Login' }).click();

  // Wait for successful login
  await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Verify user is logged in
 */
async function verifyUserLoggedIn(testApp: ElectronTestApp): Promise<void> {
  const { window } = testApp;
  await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({ timeout: 5000 });
}

/**
 * Helper: Verify user is logged out
 */
async function verifyUserLoggedOut(testApp: ElectronTestApp): Promise<void> {
  const { window } = testApp;
  await expect(window.getByText('Sign In')).toBeVisible({ timeout: 5000 });
  await expect(window.getByLabel('Username')).toBeVisible();
}

/**
 * Helper: Logout user
 */
async function logoutUser(testApp: ElectronTestApp): Promise<void> {
  const { window } = testApp;

  // Find and click logout button
  let logoutBtn =
    (await window.$('button:has-text("Logout")')) ||
    (await window.$('button:has-text("Log Out")')) ||
    (await window.$('button:has-text("Sign Out")')) ||
    (await window.$('[data-testid="logout-btn"]'));

  // If not found, try clicking on user menu first
  if (!logoutBtn) {
    const userMenu =
      (await window.$('[data-testid="user-menu"]')) ||
      (await window.$('[data-testid="profile-menu"]'));
    if (userMenu) {
      await userMenu.click();
      await window.waitForTimeout(300);
      logoutBtn =
        (await window.$('button:has-text("Logout")')) ||
        (await window.$('button:has-text("Log Out")'));
    }
  }

  expect(logoutBtn).toBeTruthy();
  await logoutBtn?.click();

  // May show confirmation dialog
  const confirmBtn =
    (await window.$('button:has-text("Logout")')) ||
    (await window.$('button:has-text("Yes")')) ||
    (await window.$('button:has-text("Confirm")'));
  if (confirmBtn) {
    await confirmBtn.click();
  }

  // Wait for login screen
  await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Restart Electron app
 * Closes current app and launches new instance with same database
 */
async function restartApp(currentApp: ElectronTestApp): Promise<ElectronTestApp> {
  const dbPath = currentApp.dbPath;

  // Close current app
  await currentApp.app.close();
  console.warn('[restartApp] App closed, waiting for cleanup...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Launch new app instance with same database
  console.warn('[restartApp] Launching new app instance...');
  const newApp = await launchElectronApp({ seedData: false });

  // Override database path to use the same one
  newApp.dbPath = dbPath;

  return newApp;
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

test.describe('Remember Me E2E', () => {
  /**
   * Scenario 1: Remember Me Login Flow
   * User logs in with Remember Me checked → session persists across app restart
   */
  test('should persist session when Remember Me is checked', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user
    const username = `rememberme_${Date.now()}`;
    const password = 'SecureTestPassword123!';
    const { userId } = await createTestUser(dbPath, username, password);

    // 2. Login with Remember Me checked
    await loginWithRememberMe(testApp, username, password, true);

    // 3. Verify successful login
    await verifyUserLoggedIn(testApp);

    // 4. Verify database has persisted session
    let db = getTestDatabase(dbPath);
    let session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(userId) as any;
    expect(session).toBeDefined();
    expect(session.remember_me).toBe(1); // Remember Me flag set
    const sessionId = session.session_id;
    db.close();

    // 5. Close app
    console.warn('[Test] Closing app to simulate restart...');
    await testApp.app.close();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Reopen app (session should be restored)
    console.warn('[Test] Reopening app...');
    testApp = await launchElectronApp({ seedData: false });
    // Use same database
    testApp.dbPath = dbPath;

    // Wait for app to load
    await testApp.window.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. Verify user is still logged in (session restored)
    await verifyUserLoggedIn(testApp);

    // 8. Verify session still exists in database
    db = getTestDatabase(dbPath);
    session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
    expect(session).toBeDefined();
    expect(session.user_id).toBe(userId);
    db.close();
  });

  /**
   * Scenario 2: Login Without Remember Me
   * User logs in without Remember Me → session NOT persisted across app restart
   */
  test('should NOT persist session when Remember Me is unchecked', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user
    const username = `no_remember_${Date.now()}`;
    const password = 'SecureTestPassword123!';
    const { userId } = await createTestUser(dbPath, username, password);

    // 2. Login WITHOUT Remember Me
    await loginWithRememberMe(testApp, username, password, false);

    // 3. Verify successful login
    await verifyUserLoggedIn(testApp);

    // 4. Verify database has session but NOT persisted
    let db = getTestDatabase(dbPath);
    let session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(userId) as any;
    expect(session).toBeDefined();
    expect(session.remember_me).toBe(0); // Remember Me flag NOT set
    db.close();

    // 5. Close app
    console.warn('[Test] Closing app to simulate restart...');
    await testApp.app.close();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Reopen app
    console.warn('[Test] Reopening app...');
    testApp = await launchElectronApp({ seedData: false });
    testApp.dbPath = dbPath;

    // Wait for app to load
    await testApp.window.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. Verify user is logged out (back to login screen)
    await verifyUserLoggedOut(testApp);

    // 8. Verify session was NOT restored (deleted or expired)
    db = getTestDatabase(dbPath);
    session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(userId) as any;
    // Session should not exist or should be deleted
    if (session) {
      expect(session.deleted_at).toBeTruthy();
    }
    db.close();
  });

  /**
   * Scenario 3: Logout Clears Persisted Session
   * User logs in with Remember Me → logs out → session cleared, no persistence
   */
  test('should clear persisted session on logout', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user
    const username = `logout_persist_${Date.now()}`;
    const password = 'SecureTestPassword123!';
    const { userId } = await createTestUser(dbPath, username, password);

    // 2. Login with Remember Me
    await loginWithRememberMe(testApp, username, password, true);

    // 3. Verify logged in
    await verifyUserLoggedIn(testApp);

    // 4. Verify session persisted
    let db = getTestDatabase(dbPath);
    let session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(userId) as any;
    expect(session).toBeDefined();
    expect(session.remember_me).toBe(1);
    db.close();

    // 5. Logout
    await logoutUser(testApp);

    // 6. Verify logged out
    await verifyUserLoggedOut(testApp);

    // 7. Verify session invalidated in database
    db = getTestDatabase(dbPath);
    session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(userId) as any;
    // Session either deleted or has deleted_at timestamp
    if (session) {
      expect(session.deleted_at).toBeTruthy();
    }
    db.close();

    // 8. Close and reopen app
    console.warn('[Test] Closing app to verify session not restored...');
    await testApp.app.close();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.warn('[Test] Reopening app...');
    testApp = await launchElectronApp({ seedData: false });
    testApp.dbPath = dbPath;

    await testApp.window.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 9. Verify user is logged out (session not restored)
    await verifyUserLoggedOut(testApp);
  });

  /**
   * Scenario 4: Session Expiration
   * User logs in with Remember Me → session expires → cleared on app startup
   */
  test('should clear expired persisted session on app startup', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user
    const username = `expire_persist_${Date.now()}`;
    const password = 'SecureTestPassword123!';
    const { userId } = await createTestUser(dbPath, username, password);

    // 2. Login with Remember Me
    await loginWithRememberMe(testApp, username, password, true);

    // 3. Verify logged in
    await verifyUserLoggedIn(testApp);

    // 4. Manually expire session in database
    let db = getTestDatabase(dbPath);
    db.prepare(
      `
      UPDATE sessions
      SET expires_at = datetime('now', '-1 day')
      WHERE user_id = ?
    `
    ).run(userId);
    db.close();

    // 5. Close and reopen app
    console.warn('[Test] Closing app with expired session...');
    await testApp.app.close();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.warn('[Test] Reopening app...');
    testApp = await launchElectronApp({ seedData: false });
    testApp.dbPath = dbPath;

    await testApp.window.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Verify user is logged out (expired session cleared)
    await verifyUserLoggedOut(testApp);

    // 7. Verify session was cleared from database
    db = getTestDatabase(dbPath);
    const session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(userId) as any;
    // Session should be deleted or marked as deleted
    if (session) {
      expect(session.deleted_at).toBeTruthy();
    }
    db.close();
  });

  /**
   * Scenario 5: Security Warning UI
   * User checks Remember Me → security warning appears with animation
   */
  test('should show security warning when Remember Me is checked', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user (for realistic state)
    const username = `warning_test_${Date.now()}`;
    const password = 'SecureTestPassword123!';
    await createTestUser(dbPath, username, password);

    // 2. Navigate to login screen
    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 3. Verify warning is NOT visible initially
    const warningText = 'Only use on trusted devices';
    const warningElement = window.getByText(warningText);
    await expect(warningElement).toBeHidden();

    // 4. Check "Remember Me" checkbox
    const rememberMeCheckbox = window.getByLabel('Remember me for 30 days');
    await rememberMeCheckbox.check();

    // 5. Verify security warning appears with animation
    await expect(warningElement).toBeVisible({ timeout: 2000 });

    // 6. Verify warning text is correct
    await expect(warningElement).toContainText('Only use on trusted devices');
    await expect(warningElement).toContainText('Your session will remain active for 30 days');

    // 7. Verify alert icon is visible
    const alertIcon = window.locator('[role="alert"]', { has: window.locator('svg') });
    await expect(alertIcon).toBeVisible();

    // 8. Uncheck "Remember Me"
    await rememberMeCheckbox.uncheck();

    // 9. Verify warning disappears
    await expect(warningElement).toBeHidden({ timeout: 2000 });
  });

  /**
   * Scenario 6: Rate Limiting Integration
   * User attempts multiple failed logins with Remember Me → rate limiting enforced
   */
  test('should enforce rate limiting even with Remember Me', async () => {
    const { window, dbPath } = testApp;

    // 1. Create test user
    const username = `ratelimit_${Date.now()}`;
    const password = 'CorrectPassword123!';
    await createTestUser(dbPath, username, password);

    // 2. Navigate to login screen
    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 3. Attempt login 5 times with wrong password (Remember Me checked)
    const wrongPassword = 'WrongPassword123!';

    for (let i = 0; i < 5; i++) {
      console.warn(`[Test] Failed login attempt ${i + 1}/5`);

      await window.fill('#username', username);
      await window.fill('#password', wrongPassword);
      await window.getByLabel('Remember me for 30 days').check();
      await window.getByRole('button', { name: 'Login' }).click();

      // Wait for error message
      await expect(
        window.getByText(/Invalid.*credentials|Login failed|Authentication failed/i)
      ).toBeVisible({ timeout: 5000 });

      // Small delay before next attempt
      await window.waitForTimeout(500);
    }

    // 4. Verify account locked error
    await window.fill('#username', username);
    await window.fill('#password', password); // Even with correct password
    await window.getByLabel('Remember me for 30 days').check();
    await window.getByRole('button', { name: 'Login' }).click();

    // 5. Verify error message shows lock duration
    await expect(
      window.getByText(/locked|too many attempts|rate limit/i)
    ).toBeVisible({ timeout: 5000 });

    // 6. Verify database shows failed attempts
    const db = getTestDatabase(dbPath);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    const attempts = db
      .prepare('SELECT COUNT(*) as count FROM login_attempts WHERE user_id = ?')
      .get(user.id) as any;

    expect(attempts.count).toBeGreaterThanOrEqual(5);
    db.close();
  });

  /**
   * Additional Test: Remember Me Checkbox Visibility
   * Verify Remember Me checkbox and label are visible and accessible
   */
  test('should display Remember Me checkbox with proper label and accessibility', async () => {
    const { window } = testApp;

    // 1. Navigate to login screen
    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // 2. Verify checkbox is visible
    const checkbox = window.getByLabel('Remember me for 30 days');
    await expect(checkbox).toBeVisible();

    // 3. Verify checkbox is not checked by default
    await expect(checkbox).not.toBeChecked();

    // 4. Verify checkbox can be toggled
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    // 5. Verify ARIA attributes for accessibility
    const checkboxElement = await checkbox.elementHandle();
    const ariaDescribedBy = await checkboxElement?.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBeTruthy();
    expect(ariaDescribedBy).toContain('remember-me');
  });
});

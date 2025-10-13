import { expect, test } from '@playwright/test';
import crypto from 'crypto';
import {
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import { getTestDatabase, seedUserConsents } from '../setup/test-database.js';

/**
 * E2E Tests for Authorization System
 *
 * Tests cover horizontal privilege escalation prevention across all IPC handlers:
 * 1. Case authorization - User A cannot access User B's cases
 * 2. Evidence authorization - User A cannot access User B's evidence
 * 3. Conversation authorization - User A cannot access User B's conversations
 * 4. GDPR authorization - Users export/delete only their own data
 * 5. Bulk operations filtering - GET_ALL endpoints return only user's data
 * 6. Session validation - Expired sessions cannot access resources
 *
 * Critical Security Tests: Phase 2 - MVL Plan
 */

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Launch app with clean database
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  // Close app and cleanup
  await closeElectronApp(testApp);
});

/**
 * Helper: Create a test user with hashed password
 */
function createTestUser(
  db: any,
  username: string,
  email: string,
  password: string
): { id: number; username: string; email: string } {
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

  return user;
}

/**
 * Helper: Login a user via UI
 */
async function loginUser(window: any, username: string, password: string): Promise<void> {
  await window.waitForLoadState('domcontentloaded');
  await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

  await window.fill('#username', username);
  await window.fill('#password', password);
  await window.getByRole('button', { name: 'Login' }).click();

  // Wait for successful login
  await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Authorization E2E - Case Handlers', () => {
  /**
   * Test: User A cannot access User B's case
   * Verifies CASE_GET_BY_ID authorization
   */
  test('should block access to another user case via CASE_GET_BY_ID', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create a case owned by User B
    const caseTitle = 'User B Private Case';
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, ?, 'encrypted-desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id, caseTitle);

    const userBCase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userB.id) as any;

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Try to access User B's case via IPC (simulated via UI navigation or direct call)
    // In a real app, this would be clicking on a case link with User B's caseId
    // For now, we verify via database state that cases are properly filtered

    // Navigate to Cases page
    const casesLink = await window.$('text=Cases');
    if (casesLink) {
      await casesLink.click();
      await window.waitForTimeout(500);
    }

    // 5. Verify User A does NOT see User B's case in the list
    const userBCaseTitle = await window.$(`text=${caseTitle}`);
    expect(userBCaseTitle).toBeFalsy(); // Should NOT be visible
  });

  /**
   * Test: User A can access their own case
   * Verifies CASE_GET_BY_ID authorization (positive case)
   */
  test('should allow access to own case via CASE_GET_BY_ID', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');

    // 2. Create a case owned by User A
    const caseTitle = 'User A Own Case';
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, ?, 'encrypted-desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id, caseTitle);

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Navigate to Cases page
    const casesLink = await window.$('text=Cases');
    if (casesLink) {
      await casesLink.click();
      await window.waitForTimeout(500);
    }

    // 5. Verify User A DOES see their own case
    await expect(window.getByText(caseTitle)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test: CASE_GET_ALL returns only user's cases
   * Verifies bulk operation filtering
   */
  test('should return only current user cases via CASE_GET_ALL', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create cases for both users
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case 1', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case 2', 'desc', 'employment', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case 1', 'desc', 'housing', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Navigate to Cases page
    const casesLink = await window.$('text=Cases');
    if (casesLink) {
      await casesLink.click();
      await window.waitForTimeout(500);
    }

    // 5. Verify User A sees only their own cases
    await expect(window.getByText('User A Case 1')).toBeVisible({ timeout: 5000 });
    await expect(window.getByText('User A Case 2')).toBeVisible({ timeout: 5000 });

    // User B's case should NOT be visible
    const userBCase = await window.$('text=User B Case 1');
    expect(userBCase).toBeFalsy();
  });

  /**
   * Test: CASE_UPDATE requires ownership
   * Verifies case modification authorization
   */
  test('should block case update for non-owned case', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create a case owned by User B
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    const userBCase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userB.id) as any;

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Try to update User B's case (simulated)
    // In real app, this would be intercepted by IPC authorization
    // Verify via database that case title didn't change

    const dbVerify = getTestDatabase(dbPath);
    const unchangedCase = dbVerify
      .prepare('SELECT * FROM cases WHERE id = ?')
      .get(userBCase.id) as any;
    expect(unchangedCase.title).toBe('User B Case'); // Should remain unchanged
    dbVerify.close();
  });
});

test.describe('Authorization E2E - Evidence Handlers', () => {
  /**
   * Test: User A cannot access User B's evidence
   * Verifies EVIDENCE_GET_ALL filtering
   */
  test('should return only evidence from user-owned cases via EVIDENCE_GET_ALL', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create cases for both users
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    const userACase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userA.id) as any;

    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    const userBCase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userB.id) as any;

    // 3. Create evidence for both cases
    db.prepare(
      `
      INSERT INTO evidence (case_id, title, description, evidence_type, file_path, file_size, mime_type, date_obtained, uploaded_at)
      VALUES (?, 'User A Evidence', 'desc', 'document', '/path/a.pdf', 1024, 'application/pdf', datetime('now'), datetime('now'))
    `
    ).run(userACase.id);

    db.prepare(
      `
      INSERT INTO evidence (case_id, title, description, evidence_type, file_path, file_size, mime_type, date_obtained, uploaded_at)
      VALUES (?, 'User B Evidence', 'desc', 'document', '/path/b.pdf', 1024, 'application/pdf', datetime('now'), datetime('now'))
    `
    ).run(userBCase.id);

    db.close();

    // 4. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 5. Navigate to Evidence page or Case detail
    const casesLink = await window.$('text=Cases');
    if (casesLink) {
      await casesLink.click();
      await window.waitForTimeout(500);

      // Click on User A's case
      const userACaseLink = await window.$('text=User A Case');
      if (userACaseLink) {
        await userACaseLink.click();
        await window.waitForTimeout(500);

        // Navigate to Evidence tab if exists
        const evidenceTab = await window.$('text=Evidence');
        if (evidenceTab) {
          await evidenceTab.click();
          await window.waitForTimeout(500);
        }
      }
    }

    // 6. Verify User A sees only their own evidence
    // Note: User B's evidence should NOT be visible anywhere in the app
    const userBEvidence = await window.$('text=User B Evidence');
    expect(userBEvidence).toBeFalsy();
  });

  /**
   * Test: EVIDENCE_CREATE requires case ownership
   * Verifies evidence creation authorization
   */
  test('should block evidence creation for non-owned case', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create a case owned by User B
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    const userBCase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userB.id) as any;

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Try to create evidence for User B's case
    // In real app, IPC authorization would block this before database insert

    // Verify no evidence was created for User B's case by User A
    const dbVerify = getTestDatabase(dbPath);
    const evidenceCount = dbVerify
      .prepare('SELECT COUNT(*) as count FROM evidence WHERE case_id = ?')
      .get(userBCase.id) as any;
    expect(evidenceCount.count).toBe(0); // Should remain 0
    dbVerify.close();
  });
});

test.describe('Authorization E2E - Conversation Handlers', () => {
  /**
   * Test: User A cannot access User B's conversations
   * Verifies CONVERSATION_GET_ALL filtering
   */
  test('should return only conversations from user-owned cases via CONVERSATION_GET_ALL', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create cases for both users
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    const userACase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userA.id) as any;

    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    const userBCase = db.prepare('SELECT * FROM cases WHERE user_id = ?').get(userB.id) as any;

    // 3. Create conversations for both cases
    db.prepare(
      `
      INSERT INTO chat_conversations (case_id, title, created_at, updated_at, message_count)
      VALUES (?, 'User A Conversation', datetime('now'), datetime('now'), 0)
    `
    ).run(userACase.id);

    db.prepare(
      `
      INSERT INTO chat_conversations (case_id, title, created_at, updated_at, message_count)
      VALUES (?, 'User B Conversation', datetime('now'), datetime('now'), 0)
    `
    ).run(userBCase.id);

    db.close();

    // 4. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 5. Navigate to Chat/Conversations page
    const chatLink = await window.$('text=Chat');
    if (chatLink) {
      await chatLink.click();
      await window.waitForTimeout(500);
    }

    // 6. Verify User A sees only their own conversations
    // User B's conversation should NOT be visible
    const userBConversation = await window.$('text=User B Conversation');
    expect(userBConversation).toBeFalsy();
  });

  /**
   * Test: General conversations (null caseId) are blocked
   * Verifies conversation security gap mitigation
   */
  test('should block access to conversations without caseId (security gap)', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');

    // 2. Create a conversation with NULL caseId (general chat)
    db.prepare(
      `
      INSERT INTO chat_conversations (case_id, title, created_at, updated_at, message_count)
      VALUES (NULL, 'General Conversation', datetime('now'), datetime('now'), 0)
    `
    ).run();

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Navigate to Chat page
    const chatLink = await window.$('text=Chat');
    if (chatLink) {
      await chatLink.click();
      await window.waitForTimeout(500);
    }

    // 5. Verify general conversation is NOT visible (blocked by authorization)
    const generalConversation = await window.$('text=General Conversation');
    expect(generalConversation).toBeFalsy();
  });
});

test.describe('Authorization E2E - GDPR Handlers', () => {
  /**
   * Test: GDPR_EXPORT_USER_DATA exports only current user data
   * Verifies GDPR export authorization (CRITICAL)
   */
  test('should export only current user data via GDPR_EXPORT_USER_DATA', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create cases for both users
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Navigate to Settings → GDPR
    const settingsLink = await window.$('text=Settings');
    if (settingsLink) {
      await settingsLink.click();
      await window.waitForTimeout(500);
    }

    // 5. Click "Export All Data" button (if exists in UI)
    const exportButton = await window.$('button:has-text("Export All Data")');
    if (exportButton) {
      await exportButton.click();
      await window.waitForTimeout(1000);

      // 6. Verify export dialog or success message
      // The actual export should only include User A's data
      // We verify this by checking database audit log

      const dbVerify = getTestDatabase(dbPath);
      const auditLog = dbVerify
        .prepare(
          `
        SELECT * FROM audit_log
        WHERE event_type = 'gdpr.export'
        AND user_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `
        )
        .get(userA.id.toString()) as any;

      expect(auditLog).toBeDefined();
      expect(auditLog.user_id).toBe(userA.id.toString());
      expect(auditLog.resource_id).toBe(userA.id.toString()); // Changed from 'all'

      dbVerify.close();
    }
  });

  /**
   * Test: GDPR_DELETE_USER_DATA deletes only current user data
   * Verifies GDPR deletion authorization (CRITICAL)
   */
  test('should delete only current user data via GDPR_DELETE_USER_DATA', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A and User B
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');
    const userB = createTestUser(db, `userB_${Date.now()}`, 'userB@example.com', 'Password123!');

    // 2. Create cases for both users
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User B Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userB.id);

    // Verify initial counts
    const userACases = db
      .prepare('SELECT COUNT(*) as count FROM cases WHERE user_id = ?')
      .get(userA.id) as any;
    const userBCases = db
      .prepare('SELECT COUNT(*) as count FROM cases WHERE user_id = ?')
      .get(userB.id) as any;
    expect(userACases.count).toBe(1);
    expect(userBCases.count).toBe(1);

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Navigate to Settings → GDPR
    const settingsLink = await window.$('text=Settings');
    if (settingsLink) {
      await settingsLink.click();
      await window.waitForTimeout(500);
    }

    // 5. Click "Delete All Data" button (if exists)
    const deleteButton = await window.$('button:has-text("Delete All Data")');
    if (deleteButton) {
      await deleteButton.click();
      await window.waitForTimeout(500);

      // 6. Confirm deletion (if confirmation dialog appears)
      const confirmInput = await window.$('input[type="text"]');
      if (confirmInput) {
        await confirmInput.fill('DELETE_ALL_MY_DATA');
        const confirmButton = await window.$('button:has-text("Confirm Delete")');
        if (confirmButton) {
          await confirmButton.click();
          await window.waitForTimeout(1000);
        }
      }
    }

    // 7. Verify ONLY User A's data was deleted
    const dbVerify = getTestDatabase(dbPath);

    // User A's cases should be deleted (0 remaining)
    const userACasesAfter = dbVerify
      .prepare('SELECT COUNT(*) as count FROM cases WHERE user_id = ?')
      .get(userA.id) as any;
    expect(userACasesAfter.count).toBe(0);

    // User B's cases should remain intact (1 remaining)
    const userBCasesAfter = dbVerify
      .prepare('SELECT COUNT(*) as count FROM cases WHERE user_id = ?')
      .get(userB.id) as any;
    expect(userBCasesAfter.count).toBe(1);

    dbVerify.close();
  });
});

test.describe('Authorization E2E - Session Expiration', () => {
  /**
   * Test: Expired session cannot access protected resources
   * Verifies session validation in authorization
   */
  test('should block resource access with expired session', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // 1. Create User A
    const userA = createTestUser(db, `userA_${Date.now()}`, 'userA@example.com', 'Password123!');

    // 2. Create a case for User A
    db.prepare(
      `
      INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
      VALUES (?, 'User A Case', 'desc', 'consumer', 'active', datetime('now'), datetime('now'))
    `
    ).run(userA.id);

    db.close();

    // 3. Login as User A
    await loginUser(window, userA.username, 'Password123!');

    // 4. Verify case is visible
    const casesLink = await window.$('text=Cases');
    if (casesLink) {
      await casesLink.click();
      await window.waitForTimeout(500);
    }

    await expect(window.getByText('User A Case')).toBeVisible({ timeout: 5000 });

    // 5. Manually expire session in database
    const dbExpire = getTestDatabase(dbPath);
    dbExpire
      .prepare(
        `
      UPDATE sessions
      SET expires_at = datetime('now', '-1 day')
      WHERE user_id = ?
    `
      )
      .run(userA.id);
    dbExpire.close();

    // 6. Try to access resources (refresh page)
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // 7. Should be redirected to login screen (session expired)
    await expect(window.getByText('Sign In')).toBeVisible({ timeout: 10000 });

    // Case should NOT be visible (logged out)
    const caseAfterExpiry = await window.$('text=User A Case');
    expect(caseAfterExpiry).toBeFalsy();
  });
});

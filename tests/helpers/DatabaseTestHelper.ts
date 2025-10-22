import { getDb } from '../../src/db/database';
import type { Database } from 'better-sqlite3';

/**
 * Database Test Helper
 *
 * Provides utilities for:
 * - Test database initialization
 * - Data cleanup between tests
 * - Database state verification
 * - In-memory database setup for unit tests
 */

export class DatabaseTestHelper {
  private db: Database | null = null;

  /**
   * Initialize in-memory database for unit tests
   * Faster than file-based database and automatically cleaned up
   */
  static async initInMemoryDatabase(): Promise<void> {
    // Initialize in-memory SQLite database
    // The ':memory:' string tells SQLite to use in-memory storage
    // This is perfect for unit tests as it's fast and isolated

    // Note: Implementation depends on your database initialization code
    // Typically you'd call something like:
    // await DatabaseManager.initialize(':memory:');
    // await DatabaseManager.runMigrations();

    console.log('[Test] In-memory database initialized');
  }

  /**
   * Clean up all test data from database
   * Respects foreign key constraints by deleting in correct order
   */
  static cleanupDatabase(): void {
    const db = getDb();

    try {
      // Disable foreign key checks temporarily
      db.pragma('foreign_keys = OFF');

      // Delete in reverse order of dependencies to avoid constraint violations
      // Order: leaf tables first, then parent tables

      // 1. Delete sessions (no dependencies)
      db.prepare('DELETE FROM sessions').run();

      // 2. Delete evidence (depends on cases)
      db.prepare('DELETE FROM evidence').run();

      // 3. Delete documents (depends on cases)
      db.prepare('DELETE FROM documents').run();

      // 4. Delete chat messages (depends on conversations)
      db.prepare('DELETE FROM chat_messages').run();

      // 5. Delete conversations (depends on cases and users)
      db.prepare('DELETE FROM conversations').run();

      // 6. Delete case participants (depends on cases and users)
      db.prepare('DELETE FROM case_participants').run();

      // 7. Delete cases (depends on users)
      db.prepare('DELETE FROM cases').run();

      // 8. Delete consents (depends on users)
      db.prepare('DELETE FROM user_consents').run();

      // 9. Delete user facts (depends on users)
      db.prepare('DELETE FROM user_facts').run();

      // 10. Delete audit logs (no foreign keys, but keep at end)
      db.prepare('DELETE FROM audit_logs').run();

      // 11. Delete users (parent table for most others)
      db.prepare('DELETE FROM users').run();

      // Re-enable foreign key checks
      db.pragma('foreign_keys = ON');

      console.log('[Test] Database cleaned up successfully');
    } catch (error) {
      console.error('[Test] Error cleaning up database:', error);
      throw error;
    }
  }

  /**
   * Clean up only authentication-related tables (faster for auth tests)
   */
  static cleanupAuthTables(): void {
    const db = getDb();

    try {
      db.pragma('foreign_keys = OFF');

      // Only clean auth-related tables
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM users').run();

      db.pragma('foreign_keys = ON');

      console.log('[Test] Auth tables cleaned up');
    } catch (error) {
      console.error('[Test] Error cleaning up auth tables:', error);
      throw error;
    }
  }

  /**
   * Get count of records in a table
   */
  static getTableCount(tableName: string): number {
    const db = getDb();
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    return result.count;
  }

  /**
   * Check if a user exists by username
   */
  static userExists(username: string): boolean {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get(username) as {
      count: number;
    };
    return result.count > 0;
  }

  /**
   * Check if a session exists by ID
   */
  static sessionExists(sessionId: string): boolean {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId) as {
      count: number;
    };
    return result.count > 0;
  }

  /**
   * Get user by username (for verification)
   */
  static getUserByUsername(username: string): any | null {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  /**
   * Get session by ID (for verification)
   */
  static getSessionById(sessionId: string): any | null {
    const db = getDb();
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  static getUserSessions(userId: number): any[] {
    const db = getDb();
    return db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(userId);
  }

  /**
   * Count active sessions for a user
   */
  static countActiveSessions(userId: number): number {
    const db = getDb();
    const result = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM sessions
      WHERE user_id = ? AND expires_at > datetime('now')
    `
      )
      .get(userId) as { count: number };
    return result.count;
  }

  /**
   * Manually expire a session (for testing expiration logic)
   */
  static expireSession(sessionId: string): void {
    const db = getDb();
    db.prepare(
      `
      UPDATE sessions
      SET expires_at = datetime('now', '-1 hour')
      WHERE id = ?
    `
    ).run(sessionId);
  }

  /**
   * Manually expire all sessions for a user
   */
  static expireUserSessions(userId: number): void {
    const db = getDb();
    db.prepare(
      `
      UPDATE sessions
      SET expires_at = datetime('now', '-1 hour')
      WHERE user_id = ?
    `
    ).run(userId);
  }

  /**
   * Get audit logs for a specific event type
   */
  static getAuditLogs(eventType?: string): any[] {
    const db = getDb();

    if (eventType) {
      return db.prepare('SELECT * FROM audit_logs WHERE event_type = ? ORDER BY created_at DESC').all(eventType);
    } else {
      return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC').all();
    }
  }

  /**
   * Count audit logs by event type
   */
  static countAuditLogs(eventType: string): number {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE event_type = ?').get(eventType) as {
      count: number;
    };
    return result.count;
  }

  /**
   * Verify password is hashed (not plaintext)
   */
  static verifyPasswordHashed(username: string): boolean {
    const user = this.getUserByUsername(username);
    if (!user) return false;

    // Hashed password should be 128 hex characters (64 bytes)
    // Salt should be 32 hex characters (16 bytes)
    const isHashedCorrectly = user.password_hash?.length === 128 && /^[0-9a-f]+$/i.test(user.password_hash);

    const isSaltCorrect = user.password_salt?.length === 32 && /^[0-9a-f]+$/i.test(user.password_salt);

    return isHashedCorrectly && isSaltCorrect;
  }

  /**
   * Get database statistics (for debugging)
   */
  static getDatabaseStats(): Record<string, number> {
    const tables = [
      'users',
      'sessions',
      'cases',
      'evidence',
      'documents',
      'conversations',
      'chat_messages',
      'audit_logs',
      'user_consents',
      'user_facts',
    ];

    const stats: Record<string, number> = {};

    for (const table of tables) {
      try {
        stats[table] = this.getTableCount(table);
      } catch (error) {
        stats[table] = -1; // Table doesn't exist or error
      }
    }

    return stats;
  }

  /**
   * Reset auto-increment counters (for consistent test IDs)
   */
  static resetAutoIncrement(tableName: string): void {
    const db = getDb();

    // SQLite uses sqlite_sequence to track auto-increment values
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(tableName);
      console.log(`[Test] Reset auto-increment for ${tableName}`);
    } catch (error) {
      // sqlite_sequence might not exist if no auto-increment used yet
      console.warn(`[Test] Could not reset auto-increment for ${tableName}:`, error);
    }
  }

  /**
   * Dump database contents (for debugging)
   */
  static dumpDatabase(): void {
    console.log('\n===== DATABASE DUMP =====');
    console.log(JSON.stringify(this.getDatabaseStats(), null, 2));

    const db = getDb();

    console.log('\n--- USERS ---');
    const users = db.prepare('SELECT id, username, email, role, is_active, created_at FROM users').all();
    console.table(users);

    console.log('\n--- SESSIONS ---');
    const sessions = db
      .prepare('SELECT id, user_id, expires_at, remember_me, created_at FROM sessions')
      .all();
    console.table(sessions);

    console.log('\n--- AUDIT LOGS (last 10) ---');
    const auditLogs = db
      .prepare('SELECT event_type, user_id, success, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10')
      .all();
    console.table(auditLogs);

    console.log('========================\n');
  }

  /**
   * Execute raw SQL query (for custom test setup)
   */
  static executeRawSQL(sql: string, params?: any[]): any {
    const db = getDb();

    try {
      if (params && params.length > 0) {
        return db.prepare(sql).run(...params);
      } else {
        return db.exec(sql);
      }
    } catch (error) {
      console.error('[Test] Error executing raw SQL:', error);
      throw error;
    }
  }

  /**
   * Backup test database to file (for debugging)
   */
  static backupDatabase(backupPath: string): void {
    const db = getDb();
    const backup = db.backup(backupPath);

    backup.step(-1); // Copy all pages at once
    backup.finish();

    console.log(`[Test] Database backed up to: ${backupPath}`);
  }
}

/**
 * Usage Examples:
 *
 * ```typescript
 * // In beforeEach or beforeAll:
 * DatabaseTestHelper.cleanupDatabase();
 *
 * // After creating test data:
 * const userCount = DatabaseTestHelper.getTableCount('users');
 * expect(userCount).toBe(1);
 *
 * // Verify user was created:
 * const userExists = DatabaseTestHelper.userExists('testuser');
 * expect(userExists).toBe(true);
 *
 * // Verify session was created:
 * const sessionExists = DatabaseTestHelper.sessionExists(sessionId);
 * expect(sessionExists).toBe(true);
 *
 * // Manually expire session for testing:
 * DatabaseTestHelper.expireSession(sessionId);
 *
 * // Get audit logs:
 * const loginLogs = DatabaseTestHelper.getAuditLogs('user.login');
 * expect(loginLogs.length).toBeGreaterThan(0);
 *
 * // Debug database state:
 * DatabaseTestHelper.dumpDatabase();
 * ```
 */

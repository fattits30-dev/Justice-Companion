import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Test database helper for running integration tests
 * Creates an in-memory SQLite database with the production schema
 */
export class TestDatabaseHelper {
  private db: Database.Database | null = null;

  /**
   * Initialize an in-memory test database with schema
   */
  initialize(): Database.Database {
    // Create in-memory database
    this.db = new Database(':memory:');

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Load ALL migrations in order (not just 001)
    const migrations = [
      '001_initial_schema.sql',
      '002_chat_history_and_profile.sql',
      '003_audit_logs.sql',
      '004_encryption_expansion.sql',
      '005_user_and_case_facts.sql',
      '010_authentication_system.sql',
      '011_add_user_ownership.sql',
      '012_consent_management.sql',
    ];

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '../../src/db/migrations', migration);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Extract UP section only (ignore DOWN for tests)
      // Migrations have "-- UP" and "-- DOWN" sections
      const upSection = migrationSQL.split('-- DOWN')[0];

      // Execute the UP migration
      this.db.exec(upSection);
    }

    return this.db;
  }

  /**
   * Get the database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Test database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Clean up: close database and release resources
   */
  cleanup(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Clear all data from tables (useful for test isolation)
   */
  clearAllTables(): void {
    if (!this.db) {
      return;
    }

    // Delete in reverse foreign key order to avoid constraint violations
    const tables = [
      'chat_messages',
      'chat_conversations',
      'case_facts',
      'user_facts',
      'actions',
      'timeline_events',
      'notes',
      'evidence',
      'legal_issues',
      'cases',
      'consents',          // Phase 1
      'sessions',          // Phase 1
      'user_profile',
      'audit_logs',
      'error_logs',
      // Note: users table deleted last (has foreign keys from many tables)
      'users',             // Phase 1
    ];

    this.db.exec('PRAGMA foreign_keys = OFF');

    for (const table of tables) {
      try {
        this.db.prepare(`DELETE FROM ${table}`).run();
      } catch (_error) {
        // Table might not exist yet, ignore
      }
    }

    this.db.exec('PRAGMA foreign_keys = ON');
  }
}

/**
 * Create a test database helper instance
 */
export function createTestDatabase(): TestDatabaseHelper {
  return new TestDatabaseHelper();
}

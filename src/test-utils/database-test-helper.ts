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

    // Load and execute schema
    const schemaPath = path.join(__dirname, '../../src/db/migrations/001_initial_schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        this.db.exec(statement);
      } catch (error) {
        console.error('Failed to execute statement:', statement);
        throw error;
      }
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
      'messages',
      'chat_conversations',
      'actions',
      'timeline_events',
      'notes',
      'evidence',
      'legal_issues',
      'cases',
      'user_profile',
      'error_logs',
    ];

    this.db.exec('PRAGMA foreign_keys = OFF');

    for (const table of tables) {
      try {
        this.db.prepare(`DELETE FROM ${table}`).run();
      } catch (error) {
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

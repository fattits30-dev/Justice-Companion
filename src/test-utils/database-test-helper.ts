import Database from "better-sqlite3-multiple-ciphers";
import { readFileSync } from "fs";
import path from "path";
import { EncryptionService } from "../services/EncryptionService.ts";

// PERFORMANCE OPTIMIZATION: Cache the migration SQL to avoid repeated file reads
let cachedMigrationSql: string | null = null;

/**
 * Test database helper for running integration tests
 * Creates an in-memory SQLite database with the production schema
 * Initializes EncryptionService with a test key for encrypted field testing
 */
export class TestDatabaseHelper {
  private db: Database.Database | null = null;
  private encryptionService: EncryptionService | null = null;

  /**
   * Initialize an in-memory test database with schema and encryption service
   */
  initialize(): Database.Database {
    // Create in-memory database
    this.db = new Database(":memory:");

    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");

    // Use consistent test encryption key (matches DI container default for 'test' environment)
    // This ensures encryption/decryption works across TestDatabaseHelper and DI container
    const testKey = Buffer.from("test-key-for-testing-32-bytes!!!").toString(
      "base64"
    );
    this.encryptionService = new EncryptionService(testKey);

    // PERFORMANCE OPTIMIZATION: Load and cache migrations only once
    if (!cachedMigrationSql) {
      // Try multiple paths to find migrations (PWA/web compatible)
      const possiblePaths = [
        path.join(process.cwd(), "src", "db", "migrations"), // Development source (most common for tests)
        path.join(__dirname, "..", "db", "migrations"), // Relative from test-utils
      ];

      let migrationsDir = "";
      for (const dir of possiblePaths) {
        if (require("fs").existsSync(dir)) {
          migrationsDir = dir;
          break;
        }
      }

      if (!migrationsDir) {
        throw new Error(
          `[TestDatabaseHelper] Migrations directory not found! Searched paths: ${possiblePaths.join(", ")}`
        );
      }

      // Load ALL migrations in order (not just 001)
      const migrations = [
        "001_initial_schema.sql",
        "002_chat_history_and_profile.sql",
        "003_audit_logs.sql",
        "004_encryption_expansion.sql",
        "005_user_and_case_facts.sql",
        "010_authentication_system.sql",
        "011_add_user_ownership.sql",
        "012_consent_management.sql",
        "013_add_remember_me_to_sessions.sql",
        "014_remove_unused_remember_me_index.sql",
        "015_add_performance_indexes.sql",
        "016_create_deadlines_table.sql",
        "017_create_search_tables.sql",
        "018_create_notifications_table.sql",
        "020_create_templates_system.sql",
        "021_create_events_table.sql",
        "022_add_backup_settings.sql",
        "023_create_deadline_dependencies.sql",
        "024_add_evidence_updated_at.sql",
      ];

      // Combine all migration SQL into one cached string
      const allMigrationsSql: string[] = [];
      for (const migration of migrations) {
        const migrationPath = path.join(migrationsDir, migration);
        const migrationSql = readFileSync(migrationPath, "utf8");
        // Only execute UP section (before "-- DOWN" marker)
        const upSection = migrationSql.split("-- DOWN")[0];
        allMigrationsSql.push(upSection);
      }

      cachedMigrationSql = allMigrationsSql.join("\n");
    }

    // Execute all cached migrations at once
    this.db.exec(cachedMigrationSql);

    return this.db;
  }

  /**
   * Close the database connection and clear encryption service
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.encryptionService = null;
  }

  /**
   * Get the database instance (throws if not initialized)
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  /**
   * Get the database instance (legacy method, returns null if not initialized)
   */
  getDb(): Database.Database | null {
    return this.db;
  }

  /**
   * Get the encryption service instance (throws if not initialized)
   */
  getEncryptionService(): EncryptionService {
    if (!this.encryptionService) {
      throw new Error(
        "EncryptionService not initialized. Call initialize() first."
      );
    }
    return this.encryptionService;
  }

  /**
   * Clear all tables for test isolation
   */
  clearAllTables(): void {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }

    // Disable foreign keys temporarily to avoid constraint errors
    this.db.pragma("foreign_keys = OFF");

    // Get all table names (excluding virtual tables and SQLite internals)
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all() as { name: string }[];

    // Clear all tables, skipping FTS5 virtual tables (they end with _data, _idx, _content, _docsize, _config)
    for (const { name } of tables) {
      // Skip FTS5 internal tables (virtual tables cannot be modified with DELETE)
      if (
        name.endsWith("_data") ||
        name.endsWith("_idx") ||
        name.endsWith("_content") ||
        name.endsWith("_docsize") ||
        name.endsWith("_config")
      ) {
        continue;
      }

      this.db.prepare(`DELETE FROM ${name}`).run();
    }

    // Re-enable foreign keys
    this.db.pragma("foreign_keys = ON");
  }

  /**
   * Cleanup: close the database connection (alias for close)
   */
  cleanup(): void {
    this.close();
  }
}

/**
 * Convenience function to create a test database helper
 * @returns TestDatabaseHelper instance
 */
export function createTestDatabase(): TestDatabaseHelper {
  return new TestDatabaseHelper();
}

import Database from "better-sqlite3-multiple-ciphers";
import { readFileSync } from "fs";
import path from "path";
import { EncryptionService } from "../services/EncryptionService.ts";

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
    console.log("[TestDatabaseHelper] Initializing in-memory database...");

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
    console.log(
      "[TestDatabaseHelper] Encryption service initialized with test key"
    );

    console.log("[TestDatabaseHelper] Finding migrations directory...");
    console.log("[TestDatabaseHelper] process.cwd():", process.cwd());
    console.log("[TestDatabaseHelper] __dirname:", __dirname);

    // Try multiple paths to find migrations (same logic as migrate.ts)
    const possiblePaths = [
      path.join(process.cwd(), "src", "db", "migrations"), // Development source (most common for tests)
      path.join(__dirname, "..", "db", "migrations"), // Relative from test-utils
      path.join(process.cwd(), "dist-electron", "migrations"), // Development bundled
      path.join(process.resourcesPath || "", "migrations"), // Production (unlikely in tests)
    ];

    let migrationsDir = "";
    for (const dir of possiblePaths) {
      console.log(`[TestDatabaseHelper] Checking path: ${dir}`);
      if (require("fs").existsSync(dir)) {
        migrationsDir = dir;
        console.log(`[TestDatabaseHelper] ✅ Found migrations at: ${dir}`);
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
      "015_fix_consent_cascade_gdpr.sql",
      "016_remove_consent_foreign_key_gdpr.sql",
      "024_add_evidence_updated_at.sql",
    ];

    console.log(
      `[TestDatabaseHelper] Running ${migrations.length} migrations...`
    );

    for (const migration of migrations) {
      const migrationPath = path.join(migrationsDir, migration);
      console.log(`[TestDatabaseHelper] Applying migration: ${migration}`);

      const migrationSql = readFileSync(migrationPath, "utf8");

      // Only execute UP section (before "-- DOWN" marker)
      // This prevents DOWN (rollback) statements from undoing the migration
      const upSection = migrationSql.split("-- DOWN")[0];
      this.db.exec(upSection);
    }

    console.log("[TestDatabaseHelper] All migrations applied successfully.");
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

    // Get all table names
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all() as { name: string }[];

    // Clear all tables
    for (const { name } of tables) {
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

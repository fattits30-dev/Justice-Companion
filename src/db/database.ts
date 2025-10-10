import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { errorLogger } from '../utils/error-logger';

const resolveDatabasePath = (): string => {
  if (process.env.JUSTICE_DB_PATH) {
    return process.env.JUSTICE_DB_PATH;
  }

  if (process.versions?.electron && app && typeof app.getPath === 'function') {
    try {
      return path.join(app.getPath('userData'), 'justice.db');
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'database-path-resolution' });
    }
  }

  const fallbackDir = path.join(process.cwd(), '.justice-companion');
  fs.mkdirSync(fallbackDir, { recursive: true });

  return path.join(fallbackDir, 'justice.db');
};

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      try {
        const dbPath = resolveDatabasePath();
        this.db = new Database(dbPath);

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');

        errorLogger.logError('Database initialized successfully', { path: dbPath });
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'database-init' });
        throw error;
      }
    }
    return this.db;
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        errorLogger.logError('Database closed successfully', {});
      } catch (error) {
        errorLogger.logError(error as Error, { context: 'database-close' });
      }
    }
  }

  public runMigrations(): void {
    const db = this.getDatabase();

    try {
      // Create migrations table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      errorLogger.logError('Migrations table ready', {});
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'migrations-table-creation' });
      throw error;
    }
  }

  /**
   * TEST ONLY: Inject a test database instance
   * This allows tests to override the singleton with an in-memory database
   */
  public setTestDatabase(testDb: Database.Database): void {
    if (this.db && this.db !== testDb) {
      this.db.close();
    }
    this.db = testDb;
  }

  /**
   * TEST ONLY: Reset the database instance
   * Clears the singleton state for test isolation
   */
  public resetDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const databaseManager = DatabaseManager.getInstance();
export const getDb = (): Database => databaseManager.getDatabase();

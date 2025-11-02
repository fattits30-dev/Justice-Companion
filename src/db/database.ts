import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { errorLogger } from '../utils/error-logger.ts';

const resolveDatabasePath = (): string => {
  if (process.env.JUSTICE_DB_PATH) {
    return process.env.JUSTICE_DB_PATH;
  }

  // Conditional import of electron to avoid hanging in Node.js test environment
  if (process.versions?.electron) {
    try {
      // Dynamic import only when running in Electron
      const { app } = require('electron');
      if (app && typeof app.getPath === 'function') {
        return path.join(app.getPath('userData'), 'justice.db');
      }
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

        // Prevent immediate lock failures - wait 5 seconds for locks (critical for E2E tests)
        this.db.pragma('busy_timeout = 5000');

        // Performance optimizations
        this.db.pragma('cache_size = -40000'); // 40MB cache
        this.db.pragma('synchronous = NORMAL'); // Faster writes (safe with WAL)
        this.db.pragma('temp_store = MEMORY'); // Temp tables in RAM

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

  /**
   * Test helper: Set a test database instance (for unit tests)
   * @param testDb - Test database instance to use
   */
  public setTestDatabase(testDb: Database.Database): void {
    if (this.db && this.db !== testDb) {
      this.close();
    }
    this.db = testDb;
  }

  /**
   * Test helper: Reset database to null (for test cleanup)
   */
  public resetDatabase(): void {
    this.db = null;
  }
}

// Export singleton instance (for easier imports)
const databaseManager = DatabaseManager.getInstance();

// Helper function for legacy imports
export const getDb = (): Database.Database => {
  return databaseManager.getDatabase();
};

export { DatabaseManager, databaseManager };
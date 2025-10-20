"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.databaseManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const error_logger_ts_1 = require("../utils/error-logger.ts");
const resolveDatabasePath = () => {
    if (process.env.JUSTICE_DB_PATH) {
        return process.env.JUSTICE_DB_PATH;
    }
    if (process.versions?.electron && electron_1.app && typeof electron_1.app.getPath === 'function') {
        try {
            return path_1.default.join(electron_1.app.getPath('userData'), 'justice.db');
        }
        catch (error) {
            error_logger_ts_1.errorLogger.logError(error, { context: 'database-path-resolution' });
        }
    }
    const fallbackDir = path_1.default.join(process.cwd(), '.justice-companion');
    fs_1.default.mkdirSync(fallbackDir, { recursive: true });
    return path_1.default.join(fallbackDir, 'justice.db');
};
class DatabaseManager {
    static instance;
    db = null;
    constructor() { }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    getDatabase() {
        if (!this.db) {
            try {
                const dbPath = resolveDatabasePath();
                this.db = new better_sqlite3_1.default(dbPath);
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
                error_logger_ts_1.errorLogger.logError('Database initialized successfully', { path: dbPath });
            }
            catch (error) {
                error_logger_ts_1.errorLogger.logError(error, { context: 'database-init' });
                throw error;
            }
        }
        return this.db;
    }
    close() {
        if (this.db) {
            try {
                this.db.close();
                this.db = null;
                error_logger_ts_1.errorLogger.logError('Database closed successfully', {});
            }
            catch (error) {
                error_logger_ts_1.errorLogger.logError(error, { context: 'database-close' });
            }
        }
    }
    runMigrations() {
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
            error_logger_ts_1.errorLogger.logError('Migrations table ready', {});
        }
        catch (error) {
            error_logger_ts_1.errorLogger.logError(error, { context: 'migrations-table-creation' });
            throw error;
        }
    }
    /**
     * TEST ONLY: Inject a test database instance
     * This allows tests to override the singleton with an in-memory database
     */
    setTestDatabase(testDb) {
        if (this.db && this.db !== testDb) {
            this.db.close();
        }
        this.db = testDb;
    }
    /**
     * TEST ONLY: Reset the database instance
     * Clears the singleton state for test isolation
     */
    resetDatabase() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
exports.databaseManager = DatabaseManager.getInstance();
const getDb = () => exports.databaseManager.getDatabase();
exports.getDb = getDb;

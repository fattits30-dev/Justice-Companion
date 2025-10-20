import Database from 'better-sqlite3';
declare class DatabaseManager {
    private static instance;
    private db;
    private constructor();
    static getInstance(): DatabaseManager;
    getDatabase(): Database.Database;
    close(): void;
    runMigrations(): void;
    /**
     * TEST ONLY: Inject a test database instance
     * This allows tests to override the singleton with an in-memory database
     */
    setTestDatabase(testDb: Database.Database): void;
    /**
     * TEST ONLY: Reset the database instance
     * Clears the singleton state for test isolation
     */
    resetDatabase(): void;
}
export declare const databaseManager: DatabaseManager;
export declare const getDb: () => Database.Database;
export {};

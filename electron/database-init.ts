/**
 * Database initialization wrapper for Electron main process
 *
 * This wrapper allows importing database functions from src/ without
 * TypeScript compilation issues (src/ is outside electron/ rootDir).
 */

/**
 * Initialize database and run migrations
 *
 * Uses dynamic require to import from src/ at runtime
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('[Database] Initializing database...');

    // Dynamic require to avoid TypeScript cross-directory issues
    // Runtime path: from dist/electron/ to src/ (two levels up)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { databaseManager } = require('../../src/db/database');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runMigrations } = require('../../src/db/migrate');

    // Initialize database connection
    databaseManager.getDatabase();
    console.log('[Database] Connection established');

    // Run migrations
    console.log('[Database] Running migrations...');
    runMigrations();
    console.log('[Database] Migrations complete');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  try {
    // Runtime path: from dist/electron/ to src/ (two levels up)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { databaseManager } = require('../../src/db/database');

    databaseManager.close();
    console.log('[Database] Connection closed');
  } catch (error) {
    console.error('[Database] Error closing connection:', error);
  }
}

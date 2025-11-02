/**
 * Database initialization wrapper for Electron main process
 *
 * This wrapper allows importing database functions from src/ without
 * TypeScript compilation issues (src/ is outside electron/ rootDir).
 */

/**
 * Initialize database and run migrations
 *
 * Uses dynamic import to load from src/ at runtime (ESM compatible)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.warn('[Database] Initializing database...');

    // Dynamic import for ESM compatibility (tsx requires this)
    // Runtime path: from electron/ to src/ (sibling directory - one level up)

    const { databaseManager } = await import('../src/db/database.ts');

    const { runMigrations } = await import('../src/db/migrate.ts');

    // Initialize database connection
    databaseManager.getDatabase();
    console.warn('[Database] Connection established');

    // Run migrations
    console.warn('[Database] Running migrations...');
    runMigrations();
    console.warn('[Database] Migrations complete');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    // Dynamic import for ESM compatibility (tsx requires this)
    // Runtime path: from electron/ to src/ (sibling directory - one level up)

    const { databaseManager } = await import('../src/db/database.ts');

    databaseManager.close();
    console.warn('[Database] Connection closed');
  } catch (error) {
    console.error('[Database] Error closing connection:', error);
  }
}

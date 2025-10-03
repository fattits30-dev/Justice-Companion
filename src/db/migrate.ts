import fs from 'fs';
import path from 'path';
import { getDb } from './database';
import { errorLogger } from '../utils/error-logger';

export function runMigrations(): void {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    // Ensure migrations table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get list of migration files
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // Get already applied migrations
    const appliedMigrations = db
      .prepare('SELECT name FROM migrations')
      .all()
      .map((row: any) => row.name);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        errorLogger.logError(`Running migration: ${file}`, {
          type: 'info',
        });

        // Execute migration in a transaction
        const applyMigration = db.transaction(() => {
          db.exec(migrationSQL);
          db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        });

        applyMigration();

        errorLogger.logError(`Migration completed: ${file}`, {
          type: 'info',
        });
      }
    }

    errorLogger.logError('All migrations completed', { type: 'info' });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'run-migrations' });
    throw error;
  }
}

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from './database';
import { errorLogger } from '../utils/error-logger';

/**
 * Migration status type
 */
export type MigrationStatus = 'applied' | 'rolled_back' | 'failed';

/**
 * Migration record from database
 */
export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  applied_at: string;
  applied_by: string | null;
  duration_ms: number | null;
  status: MigrationStatus;
}

/**
 * Enhanced migration table with checksum, duration, and status tracking
 */
function ensureMigrationsTable(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      applied_by TEXT,
      duration_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'applied' CHECK(status IN ('applied', 'rolled_back', 'failed'))
    )
  `);
}

/**
 * Calculate SHA-256 checksum of migration file
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse migration file into UP and DOWN sections
 */
export function parseMigration(content: string): { up: string; down: string } {
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

  const up = upMatch ? upMatch[1].trim() : content.trim();
  const down = downMatch ? downMatch[1].trim() : '';

  return { up, down };
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    ensureMigrationsTable();

    // Get list of migration files
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // Get already applied migrations
    const appliedMigrations = db
      .prepare('SELECT name, checksum FROM migrations WHERE status = ?')
      .all('applied')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => ({
        name: row.name as string,
        checksum: row.checksum as string,
      }));

    const appliedNames = appliedMigrations.map((m) => m.name);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!appliedNames.includes(file)) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');
        const checksum = calculateChecksum(migrationContent);
        const { up } = parseMigration(migrationContent);

        errorLogger.logError(`Running migration: ${file}`, { type: 'info' });

        const startTime = Date.now();

        // Execute migration in a transaction
        const applyMigration = db.transaction(() => {
          db.exec(up);

          const duration = Date.now() - startTime;

          db.prepare(`
            INSERT INTO migrations (name, checksum, duration_ms, status)
            VALUES (?, ?, ?, 'applied')
          `).run(file, checksum, duration);
        });

        applyMigration();

        errorLogger.logError(`Migration completed: ${file} (${Date.now() - startTime}ms)`, {
          type: 'info',
        });
      } else {
        // Verify checksum for already-applied migrations
        const applied = appliedMigrations.find((m) => m.name === file);
        const migrationPath = path.join(migrationsDir, file);
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');
        const currentChecksum = calculateChecksum(migrationContent);

        if (applied && applied.checksum !== currentChecksum) {
          errorLogger.logError(
            `WARNING: Migration ${file} has been modified after being applied! ` +
            `Original checksum: ${applied.checksum}, Current: ${currentChecksum}`,
            { type: 'warn' },
          );
        }
      }
    }

    errorLogger.logError('All migrations completed', { type: 'info' });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'run-migrations' });
    throw error;
  }
}

/**
 * Rollback a specific migration by name
 */
export function rollbackMigration(migrationName: string): void {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    ensureMigrationsTable();

    // Check if migration is applied
    const migration = db
      .prepare('SELECT * FROM migrations WHERE name = ? AND status = ?')
      .get(migrationName, 'applied') as MigrationRecord | undefined;

    if (!migration) {
      throw new Error(`Migration ${migrationName} is not applied or already rolled back`);
    }

    const migrationPath = path.join(migrationsDir, migrationName);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const { down } = parseMigration(migrationContent);

    if (!down || down.length === 0) {
      throw new Error(`Migration ${migrationName} has no DOWN section - cannot rollback`);
    }

    errorLogger.logError(`Rolling back migration: ${migrationName}`, { type: 'info' });

    const startTime = Date.now();

    // Execute rollback in a transaction
    const rollback = db.transaction(() => {
      db.exec(down);

      db.prepare(`
        UPDATE migrations
        SET status = 'rolled_back'
        WHERE name = ?
      `).run(migrationName);
    });

    rollback();

    errorLogger.logError(`Rollback completed: ${migrationName} (${Date.now() - startTime}ms)`, {
      type: 'info',
    });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'rollback-migration' });
    throw error;
  }
}

/**
 * Get migration status (applied, pending, rolled back)
 */
export function getMigrationStatus(): {
  applied: MigrationRecord[];
  pending: string[];
  rolledBack: MigrationRecord[];
  } {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  ensureMigrationsTable();

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const applied = db
    .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at ASC')
    .all('applied') as MigrationRecord[];

  const rolledBack = db
    .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at DESC')
    .all('rolled_back') as MigrationRecord[];

  const appliedNames = applied.map((m) => m.name);
  const pending = migrationFiles.filter((file) => !appliedNames.includes(file));

  return { applied, pending, rolledBack };
}

/**
 * Validate migration file format
 */
export function validateMigration(migrationName: string): {
  valid: boolean;
  errors: string[];
} {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationPath = path.join(migrationsDir, migrationName);

  const errors: string[] = [];

  if (!fs.existsSync(migrationPath)) {
    errors.push('Migration file does not exist');
    return { valid: false, errors };
  }

  const content = fs.readFileSync(migrationPath, 'utf8');
  const { up, down } = parseMigration(content);

  if (!up || up.length === 0) {
    errors.push('Migration has no UP section');
  }

  if (!down || down.length === 0) {
    errors.push('Migration has no DOWN section (rollback not supported)');
  }

  // Check for basic SQL syntax issues
  if (up && !up.toUpperCase().includes('CREATE') && !up.toUpperCase().includes('INSERT') &&
      !up.toUpperCase().includes('ALTER') && !up.toUpperCase().includes('UPDATE')) {
    errors.push('UP section does not appear to contain valid SQL statements');
  }

  return { valid: errors.length === 0, errors };
}

// Run migrations when script is executed directly
if (require.main === module) {
  try {
    console.log('🔄 Running database migrations...');
    runMigrations();
    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

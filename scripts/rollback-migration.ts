/**
 * Rollback Migration Script
 * Rolls back a specific database migration by name
 *
 * Usage: npm run db:migrate:rollback -- <migration-name>
 * Example: npm run db:migrate:rollback -- 003_audit_logs.sql
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Initialize database directly (no Electron context)
const dbPath = path.join(process.cwd(), 'justice.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');

/**
 * Parse migration file into UP and DOWN sections
 */
function parseMigration(content: string): { up: string; down: string } {
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

  const up = upMatch ? upMatch[1].trim() : content.trim();
  const down = downMatch ? downMatch[1].trim() : '';

  return { up, down };
}

// Get migration name from command line arguments
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Error: Migration name is required\n');
  console.log('Usage: npm run db:migrate:rollback -- <migration-name>');
  console.log('Example: npm run db:migrate:rollback -- 003_audit_logs.sql\n');

  // Display available migrations
  try {
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

    const applied = db
      .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at ASC')
      .all('applied') as any[];

    if (applied.length > 0) {
      console.log('Available migrations to rollback:');
      applied.forEach((migration: any) => {
        console.log(`  • ${migration.name}`);
      });
    } else {
      console.log('No applied migrations available to rollback.');
    }
  } catch (error) {
    console.error(error);
  }

  db.close();
  process.exit(1);
}

console.log(`🔄 Rolling back migration: ${migrationName}\n`);
console.log('⚠️  WARNING: This will execute the DOWN section of the migration');
console.log('⚠️  WARNING: A backup will be created automatically before rollback\n');

try {
  // Ensure migrations table exists
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

  // Check if migration is applied
  const migration = db
    .prepare('SELECT * FROM migrations WHERE name = ? AND status = ?')
    .get(migrationName, 'applied') as any;

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

  // Create backup before rollback
  console.log('📦 Creating backup before rollback...');
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `pre_rollback_${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup created: ${backupPath}\n`);

  console.log('🔄 Executing rollback...');
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

  const duration = Date.now() - startTime;

  console.log(`\n✅ Migration rolled back successfully: ${migrationName} (${duration}ms)`);
  console.log('\n💡 Tip: Run "npm run db:migrate:status" to verify migration status');

  db.close();
  process.exit(0);
} catch (error) {
  console.error(`\n❌ Rollback failed: ${migrationName}`);
  console.error(error);
  db.close();
  process.exit(1);
}

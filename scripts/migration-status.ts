/**
 * Migration Status Script
 * Displays the status of all database migrations (applied, pending, rolled back)
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface MigrationRow {
  id: number;
  name: string;
  checksum: string;
  applied_at: string;
  applied_by: string | null;
  duration_ms: number | null;
  status: 'applied' | 'rolled_back' | 'failed';
}

// Initialize database directly (no Electron context)
const dbPath = path.join(process.cwd(), 'justice.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');

/**
 * Parse migration file into UP and DOWN sections
 * @deprecated - not currently used but kept for future migration tooling
 */
function _parseMigration(content: string): { up: string; down: string } {
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

  const up = upMatch ? upMatch[1].trim() : content.trim();
  const down = downMatch ? downMatch[1].trim() : '';

  return { up, down };
}

/**
 * Calculate SHA-256 checksum of migration file
 * @deprecated - not currently used but kept for future migration verification
 */
function _calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('📊 Migration Status Report\n');
console.log('='.repeat(80));

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

  // Get migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  // Get applied migrations
  const applied = db
    .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at ASC')
    .all('applied') as MigrationRow[];

  // Get rolled back migrations
  const rolledBack = db
    .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at DESC')
    .all('rolled_back') as MigrationRow[];

  const appliedNames = applied.map((m) => m.name);
  const pending = migrationFiles.filter((file) => !appliedNames.includes(file));

  const status = { applied, pending, rolledBack };

  // Display applied migrations
  if (status.applied.length > 0) {
    console.log('\n✅ Applied Migrations:');
    console.log('-'.repeat(80));
    status.applied.forEach((migration) => {
      const checksumMatch = '✓';
      const duration = migration.duration_ms ? `${migration.duration_ms}ms` : 'N/A';
      console.log(`  ${checksumMatch} ${migration.name}`);
      console.log(`     Applied: ${migration.applied_at}`);
      console.log(`     Duration: ${duration}`);
      console.log(`     Checksum: ${migration.checksum.substring(0, 16)}...`);
    });
  } else {
    console.log('\n✅ Applied Migrations: None');
  }

  // Display pending migrations
  if (status.pending.length > 0) {
    console.log('\n⏳ Pending Migrations:');
    console.log('-'.repeat(80));
    status.pending.forEach((migration) => {
      console.log(`  • ${migration}`);
    });
  } else {
    console.log('\n⏳ Pending Migrations: None');
  }

  // Display rolled back migrations
  if (status.rolledBack.length > 0) {
    console.log('\n↩️  Rolled Back Migrations:');
    console.log('-'.repeat(80));
    status.rolledBack.forEach((migration) => {
      console.log(`  • ${migration.name}`);
      console.log(`     Applied: ${migration.applied_at}`);
      console.log(`     Rolled back at: (see database for details)`);
    });
  } else {
    console.log('\n↩️  Rolled Back Migrations: None');
  }

  console.log('\n' + '='.repeat(80));
  console.log(
    `\nSummary: ${status.applied.length} applied, ${status.pending.length} pending, ${status.rolledBack.length} rolled back\n`
  );

  if (status.pending.length > 0) {
    console.log('💡 Tip: Run "npm run db:migrate" to apply pending migrations');
  }

  db.close();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error retrieving migration status:');
  console.error(error);
  db.close();
  process.exit(1);
}

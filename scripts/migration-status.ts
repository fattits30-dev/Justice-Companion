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

console.warn('📊 Migration Status Report\n');
console.warn('='.repeat(80));

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

  console.log(`✅ Applied Migrations (${applied.length}):`);
  if (applied.length > 0) {
    applied.forEach((migration) => {
      console.log(`  • ${migration.name} (${migration.applied_at})`);
    });
  } else {
    console.log('  No migrations applied');
  }

  console.log(`\n🔄 Rolled Back Migrations (${rolledBack.length}):`);
  if (rolledBack.length > 0) {
    rolledBack.forEach((migration) => {
      console.log(`  • ${migration.name} (${migration.applied_at})`);
    });
  } else {
    console.log('  No migrations rolled back');
  }

  console.log(`\n⏳ Pending Migrations (${pending.length}):`);
  if (pending.length > 0) {
    pending.forEach((file) => {
      console.log(`  • ${file}`);
    });
  } else {
    console.log('  All migrations applied');
  }

  console.warn('\n' + '='.repeat(80));
} catch (error) {
  console.error('❌ Error running migration status:', error);
  process.exit(1);
}
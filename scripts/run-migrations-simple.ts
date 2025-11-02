/**
 * Simple Migration Runner
 * Directly applies all pending SQL migrations without fancy logging
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.join(process.cwd(), 'justice.db');
const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');

console.log(`Database: ${dbPath}`);
console.log(`Migrations: ${migrationsDir}\n`);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create migrations table
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

console.log('✓ Migrations table ready\n');

// Get migration files
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql') && !file.endsWith('.backup'))
  .sort();

console.log(`Found ${migrationFiles.length} migration files:\n`);
migrationFiles.forEach(f => console.log(`  - ${f}`));
console.log('');

// Get applied migrations
const applied = db
  .prepare('SELECT name FROM migrations WHERE status = ?')
  .all('applied') as Array<{ name: string }>;

const appliedNames = applied.map(m => m.name);
const pending = migrationFiles.filter(file => !appliedNames.includes(file));

console.log(`Applied: ${appliedNames.length}`);
console.log(`Pending: ${pending.length}\n`);

if (pending.length === 0) {
  console.log('✓ All migrations already applied');
  db.close();
  process.exit(0);
}

// Run pending migrations
for (const file of pending) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');

  // Parse UP section
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
  const up = upMatch ? upMatch[1].trim() : content.trim();

  console.log(`Applying: ${file}...`);
  const startTime = Date.now();

  try {
    db.exec(up);
    const duration = Date.now() - startTime;

    db.prepare(`
      INSERT INTO migrations (name, checksum, duration_ms, status)
      VALUES (?, ?, ?, 'applied')
    `).run(file, checksum, duration);

    console.log(`  ✓ Success (${duration}ms)\n`);
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}\n`);
    db.close();
    process.exit(1);
  }
}

db.close();
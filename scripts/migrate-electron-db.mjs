import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(process.env.APPDATA || '', 'justice-companion', 'justice.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');

console.log('🔄 Running migrations on Electron database...');
console.log('📂 Database:', DB_PATH);
console.log('📁 Migrations:', MIGRATIONS_DIR);

const db = new Database(DB_PATH);

// Check if old migrations table exists and drop it if it has the wrong schema
const oldTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get();
if (oldTableCheck) {
  const columns = db.prepare('PRAGMA table_info(migrations)').all();
  const hasChecksum = columns.some(col => col.name === 'checksum');
  if (!hasChecksum) {
    console.log('⚠️  Old migrations table found - backing up and recreating...');
    const oldMigrations = db.prepare('SELECT * FROM migrations').all();
    console.log(`   Backed up ${oldMigrations.length} old migration records`);
    db.exec('DROP TABLE migrations');
  }
}

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

// Get applied migrations
const appliedMigrations = db.prepare('SELECT name, checksum FROM migrations WHERE status = ?').all('applied');
const appliedNames = appliedMigrations.map(m => m.name);

// Get migration files
const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`\n📋 Found ${migrationFiles.length} migration files`);
console.log(`✅ Already applied: ${appliedNames.length}`);
console.log(`⏳ Pending: ${migrationFiles.length - appliedNames.length}\n`);

// Run pending migrations
for (const file of migrationFiles) {
  if (!appliedNames.includes(file)) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(migrationContent).digest('hex');

    // Parse UP section
    const upMatch = migrationContent.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const up = upMatch ? upMatch[1].trim() : migrationContent.trim();

    console.log(`  🔄 Running: ${file}`);

    const startTime = Date.now();
    try {
      db.exec(up);
      const durationMs = Date.now() - startTime;

      db.prepare('INSERT INTO migrations (name, checksum, duration_ms, status) VALUES (?, ?, ?, ?)')
        .run(file, checksum, durationMs, 'applied');

      console.log(`  ✅ Completed in ${durationMs}ms`);
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Verify results
console.log('\n📊 Final database state:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log('  -', t.name));

console.log('\n🔍 Authentication tables:');
['users', 'sessions', 'consents'].forEach(table => {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`  ✅ ${table}: ${count.count} rows`);
  } catch (e) {
    console.log(`  ❌ ${table}: NOT FOUND`);
  }
});

db.close();
console.log('\n✅ Migration complete!');

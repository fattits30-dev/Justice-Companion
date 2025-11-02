import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(process.env.APPDATA || '', 'justice-companion', 'justice.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');

console.log('🔧 Fixing migration tracking...');
console.log('📂 Database:', DB_PATH);

const db = new Database(DB_PATH);

// Check what tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\n📊 Existing tables:', tables.map(t => t.name).join(', '));

// Check current migrations
const migrations = db.prepare('SELECT name FROM migrations').all();
console.log('\n📋 Tracked migrations:', migrations.map(m => m.name).join(', '));

// Mark migrations 003, 004, 005 as applied if their tables exist
const toMark = [
  { file: '003_audit_logs.sql', table: 'audit_logs' },
  { file: '004_encryption_expansion.sql', table: 'encryption_metadata' },
  { file: '005_user_and_case_facts.sql', table: 'user_facts' },
];

for (const { file, table } of toMark) {
  const tableExists = tables.some(t => t.name === table);
  const alreadyTracked = migrations.some(m => m.name === file);

  if (tableExists && !alreadyTracked) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(migrationContent).digest('hex');

    console.log(`\n✅ Marking ${file} as applied (table ${table} exists)`);
    db.prepare('INSERT INTO migrations (name, checksum, duration_ms, status) VALUES (?, ?, ?, ?)')
      .run(file, checksum, 0, 'applied');
  } else if (alreadyTracked) {
    console.log(`\n✓ ${file} already tracked`);
  } else {
    console.log(`\n⏭️ ${file} skipped (table ${table} doesn't exist)`);
  }
}

// Show final state
const finalMigrations = db.prepare('SELECT name FROM migrations ORDER BY name').all();
console.log('\n📋 Final tracked migrations:');
finalMigrations.forEach(m => console.log('  -', m.name));

db.close();
console.log('\n✅ Migration tracking fixed!');

/**
 * Simple script to run migration 025 - Add multiuser profiles
 * This avoids the module version mismatch issues
 */

const Database = require('better-sqlite3-multiple-ciphers');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'justice.db');
console.log(`Running migration on: ${dbPath}`);

try {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Check if migration already applied
  const applied = db.prepare("SELECT 1 FROM migrations WHERE name = '025_add_multiuser_profiles.sql'").get();
  if (applied) {
    console.log('Migration 025 already applied.');
    process.exit(0);
  }

  // Read migration file
  const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', '025_add_multiuser_profiles.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration 025...');

  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  try {
    // Execute migration
    db.exec(migrationSQL);

    // Record in migrations table
    db.prepare(`
      INSERT INTO migrations (name, checksum, applied_by, duration_ms, status)
      VALUES (?, ?, 'manual', 0, 'applied')
    `).run('025_add_multiuser_profiles.sql', 'manual');

    // Commit
    db.exec('COMMIT');
    console.log('✓ Migration 025 applied successfully!');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }

  db.close();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
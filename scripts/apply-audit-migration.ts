import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const db = new Database('justice.db');

console.log('📋 Applying audit_logs migration...');

// Read the migration SQL
const migrationPath = join(process.cwd(), 'src', 'db', 'migrations', '003_audit_logs.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

try {
  // Apply the migration
  db.exec(migrationSQL);
  console.log('✅ Migration applied successfully');

  // Verify the table exists
  const tableInfo = db.pragma("table_info('audit_logs')");
  console.log('\n📊 audit_logs table structure:');
  console.table(tableInfo);

  // Check for existing logs
  const count = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };
  console.log(`\n📝 Current audit log entries: ${count.count}`);

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

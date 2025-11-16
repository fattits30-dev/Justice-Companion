import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Windows AppData path for database
const userDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const dbPath = path.join(userDataPath, 'justice-companion', 'database', 'legal_cases.db');

console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  // Check if action_logs table exists
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='action_logs'
  `).get();

  if (tableCheck) {
    console.log('✅ action_logs table EXISTS');

    // Get table schema
    const schema = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='action_logs'
    `).get();

    console.log('\n📋 Table Schema:');
    console.log(schema.sql);

    // Get index count
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND tbl_name='action_logs'
    `).all();

    console.log(`\n🔍 Indexes (${indexes.length}):`);
    indexes.forEach(idx => console.log('  -', idx.name));

    // Get row count
    const count = db.prepare('SELECT COUNT(*) as count FROM action_logs').get();
    console.log(`\n📊 Total action logs: ${count.count}`);

    // Get sample logs (last 5)
    if (count.count > 0) {
      const samples = db.prepare(`
        SELECT timestamp, action, service, status, duration
        FROM action_logs
        ORDER BY timestamp DESC
        LIMIT 5
      `).all();

      console.log('\n📝 Sample logs (last 5):');
      samples.forEach(log => {
        console.log(`  ${log.timestamp} | ${log.service}.${log.action} | ${log.status} (${log.duration}ms)`);
      });
    }

  } else {
    console.log('❌ action_logs table DOES NOT EXIST');
    console.log('Migration 029 may not have run successfully');
  }

  // Check migration status
  const migrationCheck = db.prepare(`
    SELECT id, name, applied_at
    FROM migrations
    WHERE id = 29
  `).get();

  console.log('\n🔄 Migration 029 status:');
  if (migrationCheck) {
    console.log('✅ Migration 029 APPLIED');
    console.log(`   Name: ${migrationCheck.name}`);
    console.log(`   Applied: ${migrationCheck.applied_at}`);
  } else {
    console.log('❌ Migration 029 NOT APPLIED');
  }

  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Full error:', error);
}

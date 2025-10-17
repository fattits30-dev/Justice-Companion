import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const dbPath = path.join(process.env.APPDATA, 'justice-companion', 'justice.db');

try {
  const db = new Database(dbPath, { readonly: true });

  console.log('📊 Database Tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => console.log('  -', t.name));

  console.log('\n🔍 Authentication Tables:');
  ['users', 'sessions', 'consents'].forEach(table => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`  ✅ ${table}: ${count.count} rows`);
    } catch (e) {
      console.log(`  ❌ ${table}: NOT FOUND`);
    }
  });

  db.close();
  console.log('\n✅ Database check complete!');
} catch (error) {
  console.error('❌ Error:', error.message);
}

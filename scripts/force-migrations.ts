import { app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate';

// Force Electron app paths before running
if (!app.isReady()) {
  app.setPath('userData', path.join(process.env.APPDATA || '', 'justice-companion'));
}

// Set database path to Electron's UserData
process.env.JUSTICE_DB_PATH = path.join(
  process.env.APPDATA || '',
  'justice-companion',
  'justice.db'
);

console.log('🔄 Force-running migrations...');
console.log('📂 Database path:', process.env.JUSTICE_DB_PATH);

try {
  runMigrations();
  console.log('✅ Migrations completed successfully!');

  // Verify tables were created
  const db = new Database(process.env.JUSTICE_DB_PATH, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('\n📊 Tables in database:');
  tables.forEach((t: { name: string }) => console.log('  -', t.name));

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  console.log('\n👤 User count:', userCount.count);

  db.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

const Database = require('better-sqlite3');

try {
  const db = new Database('./justice-companion.db');

  console.log('=== chat_conversations table schema ===');
  const schema = db.prepare('PRAGMA table_info(chat_conversations)').all();
  schema.forEach((col) => {
    console.log(
      `${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value || ''}`
    );
  });

  console.log('\n=== Applied migrations ===');
  const migrations = db.prepare('SELECT * FROM migrations ORDER BY id').all();
  migrations.forEach((m) => {
    console.log(`${m.id}. ${m.name} - Applied: ${m.applied_at}`);
  });

  db.close();
  console.log('\n✅ Database inspection complete');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

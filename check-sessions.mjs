import Database from 'better-sqlite3';

const db = new Database('./justice_companion.db');

console.log('=== CHECKING SESSIONS ===\n');

const sessions = db.prepare(`
  SELECT id, user_id, expires_at, created_at, remember_me
  FROM sessions
  ORDER BY created_at DESC
  LIMIT 10
`).all();

if (sessions.length === 0) {
  console.log('No sessions found in database.');
} else {
  console.log(`Found ${sessions.length} session(s):\n`);
  sessions.forEach((session, index) => {
    console.log(`Session ${index + 1}:`);
    console.log(`  ID: ${session.id}`);
    console.log(`  User ID: ${session.user_id}`);
    console.log(`  Expires At: ${session.expires_at}`);
    console.log(`  Created At: ${session.created_at}`);
    console.log(`  Remember Me: ${session.remember_me}`);
    console.log('');
  });
}

db.close();

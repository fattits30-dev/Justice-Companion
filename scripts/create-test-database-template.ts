import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Create a pre-migrated database template for E2E tests
 *
 * This script runs migrations and creates a test user in a template database.
 * The template is then copied by test setup, avoiding the need to use better-sqlite3
 * in Playwright's Node.js runtime (which has a different NODE_MODULE_VERSION than Electron).
 *
 * Run this script whenever:
 * - Migrations change
 * - Test user requirements change
 * - After npm install (to rebuild better-sqlite3 for Node runtime)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.join(path.dirname(__dirname), 'tests', 'e2e', 'fixtures');
const TEMPLATE_PATH = path.join(TEMPLATE_DIR, 'test-database-template.db');

async function createTemplate(): Promise<void> {
  console.warn('🔧 Creating test database template...');

  // Create fixtures directory
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
    console.warn(`✅ Created fixtures directory: ${TEMPLATE_DIR}`);
  }

  // Delete existing template
  if (fs.existsSync(TEMPLATE_PATH)) {
    fs.unlinkSync(TEMPLATE_PATH);
    console.warn('🗑️  Deleted existing template');
  }

  // Create new database
  const db = new Database(TEMPLATE_PATH);
  console.warn(`✅ Created template database: ${TEMPLATE_PATH}`);

  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    console.warn('📚 Running migrations...');

    // Run all migrations (inline for simplicity)
    await runMigrations(db);

    console.warn('✅ Migrations completed');

    // Create test user
    console.warn('👤 Creating test user...');
    await createTestUser(db);
    console.warn('✅ Test user created');

    // Verify template
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const consentCount = db.prepare('SELECT COUNT(*) as count FROM consents').get() as { count: number };

    console.warn(`\n✅ Template created successfully:`);
    console.warn(`   - Users: ${userCount.count}`);
    console.warn(`   - Consents: ${consentCount.count}`);
    console.warn(`   - Location: ${TEMPLATE_PATH}`);
    console.warn(`\n🎯 Test credentials: username=testuser, password=TestPassword123!`);

  } finally {
    db.close();
  }
}

async function runMigrations(db: Database): Promise<void> {
  // Example migration - replace with actual migration logic
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      consent_type TEXT NOT NULL,
      granted BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
}

async function createTestUser(db: Database): Promise<void> {
  const password = 'TestPassword123!';
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  
  const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)');
  stmt.run('testuser', passwordHash);
  
  // Insert sample consent
  const consentStmt = db.prepare('INSERT OR IGNORE INTO consents (user_id, consent_type, granted) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?)');
  consentStmt.run('testuser', 'marketing', true);
}

createTemplate().catch(console.error);
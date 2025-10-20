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

async function runMigrations(db: Database.Database): Promise<void> {
  const migrationsDir = path.join(path.dirname(__dirname), 'src', 'db', 'migrations');

  // Get all migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.warn(`   Found ${files.length} migrations`);

  for (const file of files) {
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by -- UP and -- DOWN markers
    const upSection = sql.split('-- DOWN')[0];
    const upSQL = upSection.replace(/-- UP\s*/, '').trim();

    if (upSQL) {
      db.exec(upSQL);
      console.warn(`   ✓ ${file}`);
    }
  }
}

async function createTestUser(db: Database.Database): Promise<void> {
  // Create test user with authentication
  // Password: "TestPassword123!" (for use in tests)
  const password = 'TestPassword123!';
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  const passwordHash = hash.toString('hex');
  const passwordSalt = salt.toString('hex');

  // Insert test user
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(1, 'testuser', 'testuser@example.com', passwordHash, passwordSalt);

  // Grant required consent (data_processing with version 1.0)
  db.prepare(`
    INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
    VALUES (?, ?, ?, datetime('now'), ?)
  `).run(1, 'data_processing', 1, '1.0');
}

// Run the script
createTemplate().catch(error => {
  console.error('❌ Failed to create template:', error);
  process.exit(1);
});

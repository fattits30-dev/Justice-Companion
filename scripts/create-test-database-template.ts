import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const TEMPLATE_DIR = path.join(
  path.dirname(__dirname),
  "tests",
  "e2e",
  "fixtures"
);
const TEMPLATE_PATH = path.join(TEMPLATE_DIR, "test-database-template.db");

async function createTemplate(): Promise<void> {
  console.warn("🔧 Creating test database template...");

  // Create fixtures directory
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
    console.warn(`✅ Created fixtures directory: ${TEMPLATE_DIR}`);
  }

  // Delete existing template
  if (fs.existsSync(TEMPLATE_PATH)) {
    fs.unlinkSync(TEMPLATE_PATH);
    console.warn("🗑️  Deleted existing template");
  }

  // Create new database
  const db = new Database(TEMPLATE_PATH);
  console.warn(`✅ Created template database: ${TEMPLATE_PATH}`);

  try {
    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Enable WAL mode for better concurrency
    db.pragma("journal_mode = WAL");

    console.warn("📚 Running migrations...");

    // Run all migrations (inline for simplicity)
    await runMigrations(db);

    console.warn("✅ Migrations completed");

    // Create test user
    console.warn("👤 Creating test user...");
    await createTestUser(db);
    console.warn("✅ Test user created");

    // Verify template
    const userCount = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get() as { count: number };
    const consentCount = db
      .prepare("SELECT COUNT(*) as count FROM consents")
      .get() as { count: number };

    console.warn(`\n✅ Template created successfully:`);
    console.warn(`   - Users: ${userCount.count}`);
    console.warn(`   - Consents: ${consentCount.count}`);
    console.warn(`   - Location: ${TEMPLATE_PATH}`);
    console.warn(
      `\n🎯 Test credentials: username=testuser, password=TestPassword123!`
    );
  } finally {
    db.close();
  }
}

// Migration functions
async function runMigrations(db: DatabaseType): Promise<void> {
  const migrationsDir = path.join(__dirname, "..", "src", "db", "migrations");

  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      applied_by TEXT,
      duration_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'applied' CHECK(status IN ('applied', 'rolled_back', 'failed'))
    )
  `);

  // Get migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !file.endsWith(".backup"))
    .sort();

  // Get applied migrations
  const applied = db
    .prepare("SELECT name FROM migrations WHERE status = ?")
    .all("applied") as Array<{ name: string }>;

  const appliedNames = applied.map((m) => m.name);
  const pending = migrationFiles.filter((file) => !appliedNames.includes(file));

  // Run pending migrations
  for (const file of pending) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    // Parse UP section
    const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const up = upMatch ? upMatch[1].trim() : content.trim();

    db.exec(up);

    // Record migration
    db.prepare(
      `
      INSERT INTO migrations (name, checksum, status)
      VALUES (?, ?, 'applied')
    `
    ).run(file, crypto.createHash("sha256").update(content).digest("hex"));
  }
}

async function createTestUser(db: DatabaseType): Promise<void> {
  // Create test user with proper password hashing
  const username = "testuser";
  const password = "TestPassword123!";

  // Hash password (simple for testing - in real app use proper hashing)
  const passwordHash = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  // Insert user
  db.prepare(
    `
    INSERT INTO users (username, password_hash, email, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `
  ).run(username, passwordHash, "test@example.com");

  // Create consent record
  const userId = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username) as { id: number };

  db.prepare(
    `
    INSERT INTO consents (user_id, consent_type, granted, granted_at, consent_text)
    VALUES (?, 'data_processing', 1, datetime('now'), 'Test consent for data processing')
  `
  ).run(userId.id);

  db.prepare(
    `
    INSERT INTO consents (user_id, consent_type, granted, granted_at, consent_text)
    VALUES (?, 'terms_of_service', 1, datetime('now'), 'Test consent for terms of service')
  `
  ).run(userId.id);
}

// Execute the script
createTemplate().catch((error) => {
  console.error("❌ Error creating template:", error);
  process.exit(1);
});

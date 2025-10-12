import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../../../src/db/migrate.js';

/**
 * Test database configuration
 */
export interface TestDatabaseConfig {
  dbPath: string;
  seedData?: boolean;
}

/**
 * Setup a clean test database
 * - Creates new database file
 * - Runs all migrations
 * - Optionally seeds test data
 */
export async function setupTestDatabase(config?: Partial<TestDatabaseConfig>): Promise<string> {
  const testDataDir = path.join(process.cwd(), 'test-data');
  const dbPath = config?.dbPath || path.join(testDataDir, `test-${Date.now()}.db`);

  // Create test-data directory if it doesn't exist
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Delete existing test database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Set environment variable for database path
  process.env.JUSTICE_DB_PATH = dbPath;

  // Run migrations to create schema
  try {
    await runMigrations();
    console.log(`Test database created at: ${dbPath}`);
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  // Always create test user and consent (needed for authentication)
  // But don't create session - let actual login flow handle that
  await createTestUser(dbPath);

  // Seed additional test data if requested (cases, evidence, etc.)
  if (config?.seedData) {
    await seedTestData(dbPath);
  }

  return dbPath;
}

/**
 * Cleanup test database after tests
 */
export async function cleanupTestDatabase(dbPath: string): Promise<void> {
  try {
    if (fs.existsSync(dbPath)) {
      // Close any open connections first
      const db = new Database(dbPath);
      db.close();

      // Delete database file
      fs.unlinkSync(dbPath);
      console.log(`Test database cleaned up: ${dbPath}`);
    }

    // Also cleanup WAL and SHM files
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    // Don't throw - cleanup is best effort
  }
}

/**
 * Create test user with authentication credentials
 * This is called for ALL tests to ensure a user exists for login
 * Does NOT create a session - that will be created during actual login flow
 */
async function createTestUser(dbPath: string): Promise<void> {
  const db = new Database(dbPath);

  try {
    // Create test user with authentication
    // Password: "TestPassword123!" (for reference in tests)
    const crypto = await import('crypto');
    const password = 'TestPassword123!';
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    const passwordHash = hash.toString('hex');
    const passwordSalt = salt.toString('hex');

    // Insert test user
    db.exec(`
      INSERT INTO users (id, username, email, password_hash, password_salt, created_at, updated_at)
      VALUES (
        1,
        'testuser',
        'testuser@example.com',
        '${passwordHash}',
        '${passwordSalt}',
        datetime('now'),
        datetime('now')
      );
    `);

    // Grant required consent (data_processing with version 1.0)
    db.exec(`
      INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
      VALUES (1, 'data_processing', 1, datetime('now'), '1.0');
    `);

    console.log('Test user created successfully');
    console.log('Test user credentials: username=testuser, password=TestPassword123!');
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Seed test database with additional sample data
 * Includes cases, evidence, facts, etc.
 * Note: Test user is created separately by createTestUser()
 */
async function seedTestData(dbPath: string): Promise<void> {
  const db = new Database(dbPath);

  try {
    // Note: User and consent are created by createTestUser(), not here

    // Insert sample case (owned by test user)
    db.exec(`
      INSERT INTO cases (id, user_id, title, case_type, description, status, created_at, updated_at)
      VALUES (
        1,
        1,
        'Employment Discrimination Case',
        'employment',
        'Sample employment discrimination case for testing',
        'active',
        datetime('now'),
        datetime('now')
      );
    `);

    // Insert sample evidence
    db.exec(`
      INSERT INTO evidence (id, case_id, title, file_path, evidence_type, created_at)
      VALUES (
        1,
        1,
        'Employment Contract',
        '/test/evidence/contract.pdf',
        'document',
        datetime('now')
      );
    `);

    // Insert sample user facts
    db.exec(`
      INSERT INTO user_facts (id, case_id, fact_type, fact_content, created_at, updated_at)
      VALUES (
        1,
        1,
        'personal',
        'Test user fact: personal information',
        datetime('now'),
        datetime('now')
      );
    `);

    // Insert sample case facts
    db.exec(`
      INSERT INTO case_facts (id, case_id, fact_category, fact_content, importance, created_at, updated_at)
      VALUES (
        1,
        1,
        'timeline',
        'Test case fact: important timeline event',
        'critical',
        datetime('now'),
        datetime('now')
      );
    `);

    console.log('Additional test data seeded successfully (cases, evidence, facts)');
  } catch (error) {
    console.error('Failed to seed test data:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Get database connection for verification in tests
 */
export function getTestDatabase(dbPath: string): Database.Database {
  return new Database(dbPath);
}

/**
 * Verify database state (useful for test assertions)
 */
export async function verifyDatabaseState(dbPath: string): Promise<{
  cases: number;
  evidence: number;
  userFacts: number;
  caseFacts: number;
}> {
  const db = new Database(dbPath);

  try {
    const cases = db.prepare('SELECT COUNT(*) as count FROM cases').get() as { count: number };
    const evidence = db.prepare('SELECT COUNT(*) as count FROM evidence').get() as {
      count: number;
    };
    const userFacts = db.prepare('SELECT COUNT(*) as count FROM user_facts').get() as {
      count: number;
    };
    const caseFacts = db.prepare('SELECT COUNT(*) as count FROM case_facts').get() as {
      count: number;
    };

    return {
      cases: cases.count,
      evidence: evidence.count,
      userFacts: userFacts.count,
      caseFacts: caseFacts.count,
    };
  } finally {
    db.close();
  }
}

/**
 * Clean up all test databases in test-data directory
 */
export async function cleanupAllTestDatabases(): Promise<void> {
  const testDataDir = path.join(process.cwd(), 'test-data');

  if (!fs.existsSync(testDataDir)) {
    return;
  }

  const files = fs.readdirSync(testDataDir);

  for (const file of files) {
    if (file.startsWith('test-') && file.endsWith('.db')) {
      const filePath = path.join(testDataDir, file);
      await cleanupTestDatabase(filePath);
    }
  }

  console.log('All test databases cleaned up');
}

/**
 * Seed GDPR consents for a test user
 * This ensures the user can access the app without being blocked by the consent banner
 *
 * @param db - Database instance
 * @param userId - User ID to seed consents for
 */
export function seedUserConsents(db: Database, userId: number): void {
  // Required: data_processing consent (must be granted for app access)
  db.prepare(
    `
    INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
    VALUES (?, 'data_processing', 1, datetime('now'), '1.0')
  `
  ).run(userId);

  console.log(`✅ Seeded data_processing consent for user ${userId}`);
}

/**
 * Test user credentials (for use in tests that need to authenticate)
 */
export const TEST_USER_CREDENTIALS = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  userId: 1,
};

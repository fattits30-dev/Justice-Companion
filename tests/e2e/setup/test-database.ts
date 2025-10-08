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

  // Seed test data if requested
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
 * Seed test database with sample data
 */
async function seedTestData(dbPath: string): Promise<void> {
  const db = new Database(dbPath);

  try {
    // Insert sample case
    db.exec(`
      INSERT INTO cases (id, case_number, title, case_type, description, status, created_at, updated_at)
      VALUES (
        1,
        'CASE-2024-001',
        'Employment Discrimination Case',
        'employment',
        'Sample employment discrimination case for testing',
        'open',
        datetime('now'),
        datetime('now')
      );
    `);

    // Insert sample evidence
    db.exec(`
      INSERT INTO evidence (id, case_id, title, description, file_path, file_type, upload_date)
      VALUES (
        1,
        1,
        'Employment Contract',
        'Original employment contract',
        '/test/evidence/contract.pdf',
        'application/pdf',
        datetime('now')
      );
    `);

    // Insert sample user facts
    db.exec(`
      INSERT INTO user_facts (id, fact_type, fact_content, importance, created_at, updated_at)
      VALUES (
        1,
        'personal',
        'Test user fact: personal information',
        'high',
        datetime('now'),
        datetime('now')
      );
    `);

    // Insert sample case facts
    db.exec(`
      INSERT INTO case_facts (id, case_id, category, fact_content, importance, created_at, updated_at)
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

    console.log('Test data seeded successfully');
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
    const evidence = db.prepare('SELECT COUNT(*) as count FROM evidence').get() as { count: number };
    const userFacts = db.prepare('SELECT COUNT(*) as count FROM user_facts').get() as { count: number };
    const caseFacts = db.prepare('SELECT COUNT(*) as count FROM case_facts').get() as { count: number };

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

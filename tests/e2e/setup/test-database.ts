import fs from 'fs';
import path from 'path';

/**
 * Test database configuration
 */
export interface TestDatabaseConfig {
  dbPath: string;
  seedData?: boolean;
}

/**
 * Setup a clean test database by copying pre-migrated template
 *
 * ARCHITECTURE NOTE: This function runs in Playwright's Node.js runtime (v22.20.0),
 * NOT in Electron's embedded Node.js (v22.19.0). Therefore, it CANNOT use better-sqlite3
 * directly because the binary is compiled for Electron's runtime.
 *
 * Solution: Copy a pre-migrated database template (created by scripts/create-test-database-template.ts)
 * which already has all migrations applied and a test user created.
 *
 * - Copies pre-migrated database template
 * - Template includes: schema, test user, and consent
 * - NO better-sqlite3 usage (file copy only)
 */
export async function setupTestDatabase(config?: Partial<TestDatabaseConfig>): Promise<string> {
  const testDataDir = path.join(process.cwd(), 'test-data');
  const dbPath = config?.dbPath || path.join(testDataDir, `test-${Date.now()}.db`);

  // Create test-data directory if it doesn't exist
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Delete existing test database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Copy pre-migrated template database
  const templatePath = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'test-database-template.db');

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Database template not found at: ${templatePath}\n` +
      `Please run: pnpm exec tsx scripts/create-test-database-template.ts`
    );
  }

  fs.copyFileSync(templatePath, dbPath);
  console.log(`Test database created at: ${dbPath}`);
  console.log(`Copied from template: ${templatePath}`);

  // Set environment variable for database path
  process.env.JUSTICE_DB_PATH = dbPath;

  // TODO: Implement seedData functionality if needed
  // For now, the template includes just the test user and consent
  // Additional seeding can be added by creating a seeded template or
  // by letting Electron app seed data after launch
  if (config?.seedData) {
    console.log('Note: seedData is requested but not yet implemented in template approach');
    console.log('Template includes: test user and consent');
  }

  return dbPath;
}

/**
 * Cleanup test database after tests
 * NO better-sqlite3 usage - just file operations
 */
export async function cleanupTestDatabase(dbPath: string): Promise<void> {
  try {
    // Delete database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`Test database cleaned up: ${dbPath}`);
    }

    // Also cleanup WAL and SHM files (SQLite journal files)
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
 * DEPRECATED: Test user is now included in the database template
 * No longer needed - kept for reference only
 */

/**
 * DEPRECATED: Seeding is handled by database template
 * No longer needed - kept for reference only
 */

/**
 * NOTE: The following functions would require better-sqlite3, which can only be used
 * from Electron runtime. If tests need to verify database state, they should do so
 * through the Electron app's IPC handlers, not directly from test setup code.
 */

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
 * DEPRECATED: Consents are now included in the database template
 * The template includes data_processing consent for the test user
 */

/**
 * Test user credentials (for use in tests that need to authenticate)
 */
export const TEST_USER_CREDENTIALS = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  userId: 1,
};

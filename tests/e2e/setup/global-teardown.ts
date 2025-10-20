import { FullConfig } from '@playwright/test';
import { cleanupAllTestDatabases } from './test-database.js';
import { cleanupTestFiles } from './fixtures.js';

/**
 * Global teardown - runs once after all tests
 */
async function globalTeardown(_config: FullConfig): Promise<void> {
  console.warn('\n=== E2E Global Teardown ===');

  // Cleanup all test databases
  try {
    await cleanupAllTestDatabases();
    console.warn('Test databases cleaned up');
  } catch (error) {
    console.warn('Error cleaning up test databases:', error);
  }

  // Cleanup test files
  try {
    cleanupTestFiles();
    console.warn('Test files cleaned up');
  } catch (error) {
    console.warn('Error cleaning up test files:', error);
  }

  console.warn('=== E2E Global Teardown Complete ===');
}

export default globalTeardown;

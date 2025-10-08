import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global setup - runs once before all tests
 */
async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('=== E2E Global Setup ===');

  // Create test-results directory structure
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const screenshotsDir = path.join(testResultsDir, 'screenshots');
  const artifactsDir = path.join(testResultsDir, 'artifacts');
  const videosDir = path.join(testResultsDir, 'videos');

  for (const dir of [testResultsDir, screenshotsDir, artifactsDir, videosDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }

  // Create test-data directory
  const testDataDir = path.join(process.cwd(), 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log(`Created directory: ${testDataDir}`);
  }

  // Clean up old test databases
  if (fs.existsSync(testDataDir)) {
    const files = fs.readdirSync(testDataDir);
    const dbFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.db-wal') || f.endsWith('.db-shm'));

    for (const file of dbFiles) {
      try {
        fs.unlinkSync(path.join(testDataDir, file));
        console.log(`Cleaned up old test file: ${file}`);
      } catch (error) {
        console.warn(`Could not delete ${file}:`, error);
      }
    }
  }

  console.log('=== E2E Global Setup Complete ===\n');
}

export default globalSetup;

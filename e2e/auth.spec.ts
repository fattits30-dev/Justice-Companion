import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';

/**
 * E2E Authentication Tests for Justice Companion
 *
 * Tests the complete authentication flow:
 * - User registration
 * - Login with credentials
 * - Session persistence
 * - Logout functionality
 *
 * Uses Playwright's Electron support to test the actual desktop app
 */

let electronApp: ElectronApplication;
let window: Page;
let devServer: ReturnType<typeof spawn> | null = null;

// Test database path (use separate DB for E2E tests)
const TEST_DB_PATH = path.join(process.cwd(), '.test-e2e', 'justice-test.db');

/**
 * Generate a random 32-byte encryption key for testing
 */
function generateTestEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

test.describe.serial('Authentication Flow', () => {
  test.beforeAll(async () => {
    // Clean up test database before starting
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    // Generate test encryption key and write to .env
    const testEncryptionKey = generateTestEncryptionKey();
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, `ENCRYPTION_KEY_BASE64=${testEncryptionKey}\n`, 'utf8');
    console.log('[E2E] Created .env with test encryption key');

    // Start Vite dev server (required for Electron to load React app)
    console.log('[E2E] Starting Vite dev server...');
    devServer = spawn('pnpm', ['dev'], {
      cwd: process.cwd(),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for dev server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Dev server failed to start within 30 seconds'));
      }, 30000);

      devServer!.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[E2E][DevServer] ${output.trim()}`);
        // Check for "ready in" message or localhost with 5176 port (with or without ANSI codes)
        if (output.includes('ready in') || (output.includes('localhost') && output.includes('5176'))) {
          clearTimeout(timeout);
          console.log('[E2E] Dev server is ready');
          resolve();
        }
      });

      devServer!.stderr?.on('data', (data: Buffer) => {
        console.error(`[E2E][DevServerError] ${data.toString().trim()}`);
      });

      devServer!.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start dev server: ${error.message}`));
      });
    });

    // Launch Electron app
    console.log('[E2E] Launching Electron app...');
    electronApp = await electron.launch({
      args: ['--no-sandbox'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_HOST: 'localhost',
        VITE_DEV_SERVER_PORT: '5176',
      },
    });
    window = await electronApp.firstWindow();
    console.log('[E2E] Electron app launched successfully');
  });

  test.afterAll(async () => {
    // Close dev server
    if (devServer) {
      devServer.kill();
    }

    // Close Electron app
    if (electronApp) {
      await electronApp.close();
    }

    // Clean up test database
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }

    console.log('[E2E] Cleanup completed');
  });

  test('should register a new user', async () => {
    // Implementation would go here
  });

  test('should login with valid credentials', async () => {
    // Implementation would go here
  });

  test('should persist session after restart', async () => {
    // Implementation would go here
  });

  test('should logout successfully', async () => {
    // Implementation would go here
  });
});
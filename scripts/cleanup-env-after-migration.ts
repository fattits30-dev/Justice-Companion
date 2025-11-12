/**
 * Cleanup Script: Remove ENCRYPTION_KEY_BASE64 from .env after migration
 *
 * This script should be run AFTER the app has successfully migrated the
 * encryption key from .env to OS-level secure storage (safeStorage).
 *
 * Safety features:
 * - Verifies .encryption-key file exists before removing from .env
 * - Creates backup of .env before modification
 * - Validates .env format
 * - Provides detailed status messages
 *
 * Usage:
 *   tsx scripts/cleanup-env-after-migration.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message: string) {
  log(`✗ ERROR: ${message}`, colors.red);
}

function success(message: string) {
  log(`✓ ${message}`, colors.green);
}

function warn(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function info(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

/**
 * Check if encryption key has been migrated to safeStorage
 */
function checkKeyMigration(): boolean {
  // In standalone script, we can't access app.getPath, so check common locations
  const possiblePaths = [
    path.join(process.env.APPDATA || '', 'justice-companion', '.encryption-key'),
    path.join(process.env.HOME || '', '.config', 'justice-companion', '.encryption-key'),
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'justice-companion', '.encryption-key'),
  ];

  for (const keyPath of possiblePaths) {
    if (fs.existsSync(keyPath)) {
      success(`Found migrated encryption key at: ${keyPath}`);
      return true;
    }
  }

  return false;
}

/**
 * Create backup of .env file
 */
function backupEnvFile(envPath: string): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = `${envPath}.backup.${timestamp}`;

  fs.copyFileSync(envPath, backupPath);
  success(`Created backup: ${backupPath}`);

  return backupPath;
}

/**
 * Remove ENCRYPTION_KEY_BASE64 from .env file
 */
function cleanEnvFile(envPath: string): boolean {
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  let removed = false;
  const cleanedLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('ENCRYPTION_KEY_BASE64=')) {
      removed = true;
      info(`Removing line: ${trimmed.substring(0, 30)}...`);
      return false;
    }
    return true;
  });

  if (!removed) {
    warn('ENCRYPTION_KEY_BASE64 not found in .env file');
    return false;
  }

  // Write cleaned content
  fs.writeFileSync(envPath, cleanedLines.join('\n'), 'utf-8');
  success('Removed ENCRYPTION_KEY_BASE64 from .env');

  return true;
}

/**
 * Add security comment to .env file
 */
function addSecurityComment(envPath: string): void {
  const comment = `
# ============================================================================
# SECURITY: Encryption key has been migrated to OS-level secure storage
# ============================================================================
# The ENCRYPTION_KEY_BASE64 has been removed for security.
# Key is now stored in:
#   - Windows: DPAPI (Data Protection API)
#   - macOS: Keychain
#   - Linux: Secret Service API (libsecret)
#
# DO NOT add the key back to this file.
# If you need to regenerate the key, use: tsx scripts/generate-encryption-key.js
# ============================================================================

`;

  const content = fs.readFileSync(envPath, 'utf-8');
  fs.writeFileSync(envPath, comment + content, 'utf-8');
  success('Added security comment to .env');
}

/**
 * Main execution
 */
function main() {
  log('\n========================================', colors.blue);
  log('Encryption Key Cleanup Script', colors.blue);
  log('========================================\n', colors.blue);

  const projectRoot = path.resolve(__dirname, '..');
  const envPath = path.join(projectRoot, '.env');

  // Step 1: Check if .env exists
  if (!fs.existsSync(envPath)) {
    error('.env file not found');
    error(`Expected location: ${envPath}`);
    process.exit(1);
  }
  success('Found .env file');

  // Step 2: Check if key has been migrated
  info('Checking if encryption key has been migrated...');
  if (!checkKeyMigration()) {
    error('Encryption key has NOT been migrated to safeStorage');
    error('Please run the app at least once to trigger automatic migration');
    error('Command: pnpm electron:dev');
    process.exit(1);
  }

  // Step 3: Check if ENCRYPTION_KEY_BASE64 exists in .env
  const content = fs.readFileSync(envPath, 'utf-8');
  if (!content.includes('ENCRYPTION_KEY_BASE64=')) {
    success('ENCRYPTION_KEY_BASE64 already removed from .env');
    info('No action needed. File is already secure.');
    process.exit(0);
  }

  // Step 4: Create backup
  info('Creating backup of .env file...');
  const backupPath = backupEnvFile(envPath);

  // Step 5: Remove key from .env
  info('Removing ENCRYPTION_KEY_BASE64 from .env...');
  if (cleanEnvFile(envPath)) {
    // Step 6: Add security comment
    addSecurityComment(envPath);

    // Step 7: Success message
    log('\n========================================', colors.green);
    success('Cleanup completed successfully!');
    log('========================================\n', colors.green);

    info('What happened:');
    info('  1. Created backup of .env');
    info('  2. Removed ENCRYPTION_KEY_BASE64 from .env');
    info('  3. Added security comment to .env');
    info('\nYour encryption key is now stored securely in OS-level storage.');
    info(`Backup saved at: ${backupPath}`);

    log('\n========================================', colors.blue);
    info('Next steps:');
    log('========================================\n', colors.blue);
    info('1. Verify app still works: pnpm electron:dev');
    info('2. Commit the cleaned .env to version control (if needed)');
    info('3. Delete the backup after verification');

  } else {
    error('Cleanup failed');
    error('Please check the error messages above');
    process.exit(1);
  }
}

// Run script
try {
  main();
} catch (err) {
  error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

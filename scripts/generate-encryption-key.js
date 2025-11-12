/**
 * Generate Encryption Key Script
 *
 * Generates a secure 32-byte encryption key for AES-256-GCM encryption.
 * Used in CI environments where .env file doesn't exist.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateEncryptionKey() {
  const key = crypto.randomBytes(32);
  const base64Key = key.toString('base64');
  console.log('[GENERATE-KEY] 🔑 Generated 32-byte encryption key');
  return base64Key;
}

function writeEnvFile(key) {
  const envPath = path.join(__dirname, '..', '.env');

  // Use try-catch to handle file operations atomically (fixes TOCTOU race condition)
  try {
    // Try to read existing file
    const existingEnv = fs.readFileSync(envPath, 'utf8');

    // Check if key already exists
    if (existingEnv.includes('ENCRYPTION_KEY_BASE64=')) {
      console.log('[GENERATE-KEY] ⚠️  Key already exists, skipping');
      return;
    }

    // Append to existing file
    fs.appendFileSync(envPath, `\nENCRYPTION_KEY_BASE64=${key}\n`);
    console.log('[GENERATE-KEY] ✅ Added key to existing .env');
  } catch (error) {
    // File doesn't exist or can't be read - create new file
    if (error.code === 'ENOENT') {
      fs.writeFileSync(envPath, `ENCRYPTION_KEY_BASE64=${key}\n`);
      console.log('[GENERATE-KEY] ✅ Created .env with key');
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}

try {
  const key = generateEncryptionKey();
  writeEnvFile(key);
  console.log('[GENERATE-KEY] ✅ Complete');
  process.exit(0);
} catch (error) {
  console.error('[GENERATE-KEY] ❌ Error:', error.message);
  process.exit(1);
}
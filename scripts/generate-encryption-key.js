#!/usr/bin/env node
/**
 * Generate Encryption Key for CI/CD and Testing
 *
 * Generates a secure 32-byte encryption key and writes it to .env file
 * for use in CI/CD pipelines and local testing.
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *   CI=true node scripts/generate-encryption-key.js  # For CI environments
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate 32-byte (256-bit) encryption key
const generateEncryptionKey = () => {
  const key = crypto.randomBytes(32);
  return key.toString('base64');
};

// Write encryption key to .env file
const writeEncryptionKey = (key, isCI = false) => {
  const rootDir = path.resolve(__dirname, '..');
  const envFile = path.join(rootDir, '.env');

  // Check if .env already exists
  let envContent = '';
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf-8');

    // Check if ENCRYPTION_KEY_BASE64 already exists
    if (envContent.includes('ENCRYPTION_KEY_BASE64=')) {
      if (!isCI) {
        console.log('✅ Encryption key already exists in .env');
        console.log('   To regenerate, delete ENCRYPTION_KEY_BASE64 from .env first');
        return;
      }
      // In CI, replace the key
      envContent = envContent.replace(
        /ENCRYPTION_KEY_BASE64=.*/,
        `ENCRYPTION_KEY_BASE64=${key}`
      );
    } else {
      // Add key to existing .env
      envContent += `\n# Generated encryption key for testing\nENCRYPTION_KEY_BASE64=${key}\n`;
    }
  } else {
    // Create new .env file
    envContent = `# Auto-generated encryption key for testing
# DO NOT commit this file to git!

ENCRYPTION_KEY_BASE64=${key}

# Add other environment variables below
`;
  }

  fs.writeFileSync(envFile, envContent, 'utf-8');

  if (isCI) {
    console.log('✅ Generated encryption key for CI environment');
  } else {
    console.log('✅ Generated encryption key and wrote to .env');
    console.log('   Key:', key.substring(0, 20) + '...');
  }
};

// Main execution
const main = () => {
  const isCI = process.env.CI === 'true';

  console.log('🔐 Generating encryption key...');

  const key = generateEncryptionKey();
  writeEncryptionKey(key, isCI);

  if (isCI) {
    console.log('📝 For CI/CD, set ENCRYPTION_KEY_BASE64 as a secret in your repository settings');
  } else {
    console.log('⚠️  Remember: Never commit .env to git!');
    console.log('   Make sure .env is in your .gitignore');
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateEncryptionKey };

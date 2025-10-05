#!/usr/bin/env node
/**
 * Generate a secure 256-bit encryption key for Justice Companion
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *
 * This will output a base64-encoded 32-byte key suitable for .env file
 */

const crypto = require('crypto');

console.log('\n🔐 Justice Companion - Encryption Key Generator');
console.log('='.repeat(60));
console.log('\nGenerating cryptographically secure 256-bit key...\n');

// Generate 32 bytes (256 bits) of random data
const key = crypto.randomBytes(32);
const keyBase64 = key.toString('base64');

console.log('✅ Key generated successfully!\n');
console.log('📋 Add this to your .env file:');
console.log('-'.repeat(60));
console.log(`ENCRYPTION_KEY_BASE64=${keyBase64}`);
console.log('-'.repeat(60));

console.log('\n⚠️  SECURITY WARNINGS:');
console.log('  • Keep this key SECRET and SECURE');
console.log('  • NEVER commit .env file to git');
console.log('  • NEVER log this key in your application');
console.log('  • If lost, encrypted data CANNOT be recovered');
console.log('  • If compromised, ALL encrypted data is at risk');
console.log('  • Store backup in secure password manager\n');

console.log('📝 Key Statistics:');
console.log(`  • Length: ${key.length} bytes (${key.length * 8} bits)`);
console.log(`  • Algorithm: AES-256-GCM`);
console.log(`  • Entropy: ${(key.length * 8).toFixed(0)} bits\n`);

console.log('✅ Done! Copy the key above to your .env file.\n');

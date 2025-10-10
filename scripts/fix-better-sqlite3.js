#!/usr/bin/env node
/**
 * Fix better-sqlite3 for Node 22.x
 * This script removes and reinstalls better-sqlite3 with the correct binaries
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing better-sqlite3 for Node', process.version);
console.log('');

// Step 1: Remove current better-sqlite3
console.log('📦 Removing current better-sqlite3...');
try {
  execSync('pnpm remove better-sqlite3', { stdio: 'inherit' });
  console.log('✅ Removed');
} catch (error) {
  console.log('⚠️  Error removing (continuing anyway)');
}

// Step 2: Clear pnpm cache for better-sqlite3
console.log('');
console.log('🧹 Clearing pnpm cache...');
try {
  execSync('pnpm store prune', { stdio: 'inherit' });
  console.log('✅ Cache cleared');
} catch (error) {
  console.log('⚠️  Error clearing cache (continuing anyway)');
}

// Step 3: Reinstall better-sqlite3
console.log('');
console.log('📥 Reinstalling better-sqlite3...');
try {
  execSync('pnpm add better-sqlite3@12.4.1', { stdio: 'inherit' });
  console.log('✅ Reinstalled');
} catch (error) {
  console.error('❌ Failed to reinstall');
  process.exit(1);
}

// Step 4: Test it works
console.log('');
console.log('🧪 Testing better-sqlite3...');
try {
  const Database = require('better-sqlite3');
  const testDb = new Database(':memory:');
  testDb.close();
  console.log('✅ better-sqlite3 works correctly!');
  console.log('');
  console.log('🎉 All done! You can now run tests.');
} catch (error) {
  console.error('❌ Still having issues:', error.message);
  console.log('');
  console.log('💡 Try manually downloading the prebuilt binary:');
  console.log('   https://github.com/WiseLibs/better-sqlite3/releases');
  process.exit(1);
}

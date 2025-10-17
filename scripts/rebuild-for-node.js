#!/usr/bin/env node
/**
 * Rebuild better-sqlite3 for Node.js
 *
 * better-sqlite3 is a native module that needs to be rebuilt for different runtimes:
 * - Electron runtime (for the app)
 * - Node.js runtime (for tests)
 *
 * This script rebuilds better-sqlite3 for Node.js so tests can run.
 *
 * Usage:
 *   node scripts/rebuild-for-node.js
 *   pnpm rebuild:node
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Rebuilding better-sqlite3 for Node.js...');

try {
  // Get Node.js version
  const nodeVersion = process.version;
  console.log(`   Node.js version: ${nodeVersion}`);

  // Check if better-sqlite3 is installed
  const betterSqlitePath = path.resolve(__dirname, '..', 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(betterSqlitePath)) {
    console.error('❌ better-sqlite3 not found in node_modules');
    console.error('   Run "pnpm install" first');
    process.exit(1);
  }

  // Rebuild for Node.js (not Electron)
  console.log('   Rebuilding for Node.js runtime...');
  
  const rebuildCommand = 'node-gyp rebuild';
  
  execSync(rebuildCommand, {
    cwd: betterSqlitePath,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_runtime: 'node',
      npm_config_target: process.version.replace('v', ''),
    },
  });

  console.log('✅ Successfully rebuilt better-sqlite3 for Node.js');
  console.log('   Tests can now run with: pnpm test');
} catch (error) {
  console.error('❌ Failed to rebuild better-sqlite3:', error.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('1. Ensure you have build tools installed:');
  console.error('   - Windows: npm install --global windows-build-tools');
  console.error('   - macOS: xcode-select --install');
  console.error('   - Linux: apt-get install build-essential');
  console.error('2. Try: pnpm install (will rebuild with postinstall)');
  console.error('3. Try: pnpm rebuild better-sqlite3');
  process.exit(1);
}

#!/usr/bin/env node

/**
 * Rebuild better-sqlite3 for current Node.js version
 * Used by Playwright tests (Node v20) vs Electron (Node v22)
 */

const { execSync } = require('child_process');
const path = require('path');

function getCurrentNodeVersion() {
  return process.version; // e.g., "v20.0.0" or "v22.0.0"
}

function rebuildForNode() {
  console.log(`\n🔧 Rebuilding better-sqlite3 for Node.js ${getCurrentNodeVersion()}`);

  try {
    // Rebuild better-sqlite3 for current Node.js version
    execSync('npm rebuild better-sqlite3', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('✅ better-sqlite3 rebuilt successfully for current Node.js version\n');
  } catch (error) {
    console.error('❌ Failed to rebuild better-sqlite3:', error.message);
    process.exit(1);
  }
}

// Run rebuild
rebuildForNode();

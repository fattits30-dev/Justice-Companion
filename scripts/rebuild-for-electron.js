#!/usr/bin/env node

/**
 * Rebuild better-sqlite3 for Electron's Node.js version
 * Used after running Playwright tests to restore Electron compatibility
 */

const { execSync } = require('child_process');
const path = require('path');

function rebuildForElectron() {
  console.log('\n🔧 Rebuilding better-sqlite3 for Electron');

  try {
    // Rebuild better-sqlite3 for Electron
    execSync('npx electron-rebuild -f -w better-sqlite3', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    console.log('✅ better-sqlite3 rebuilt successfully for Electron\n');
  } catch (error) {
    console.error('❌ Failed to rebuild better-sqlite3:', error.message);
    process.exit(1);
  }
}

// Run rebuild
rebuildForElectron();

#!/usr/bin/env node

/**
 * Rebuild better-sqlite3 for current Node.js version (with retry logic)
 * Used by Playwright tests (Node.js runtime) vs Electron (Electron runtime)
 * 
 * This version includes:
 * - Retry logic for Windows file locks
 * - Better error messages
 * - Process detection
 * - Graceful fallback
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function getCurrentNodeVersion() {
  return process.version; // e.g., "v22.20.0"
}

function getBinaryPath() {
  const binaryPath = path.join(
    __dirname,
    '..',
    'node_modules',
    '.pnpm',
    'better-sqlite3@12.4.1',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  );
  return binaryPath;
}

function checkBinaryExists() {
  const binaryPath = getBinaryPath();
  return fs.existsSync(binaryPath);
}

function checkForRunningProcesses() {
  if (process.platform !== 'win32') {
    return { electron: false, node: false };
  }

  try {
    // Check for Electron processes
    const electronCheck = execSync('tasklist /FI "IMAGENAME eq electron.exe" 2>nul', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const hasElectron = electronCheck.includes('electron.exe');

    // Check for Node processes (excluding current process)
    const nodeCheck = execSync('tasklist /FI "IMAGENAME eq node.exe" 2>nul', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const nodeLines = nodeCheck.split('\n').filter(line => line.includes('node.exe'));
    const hasMultipleNode = nodeLines.length > 2; // More than just current process

    return { electron: hasElectron, node: hasMultipleNode };
  } catch (error) {
    // If we can't check, assume no processes
    return { electron: false, node: false };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rebuildWithRetry(attempt = 1) {
  console.log(`\n🔧 Rebuilding better-sqlite3 for Node.js ${getCurrentNodeVersion()} (Attempt ${attempt}/${MAX_RETRIES})`);

  try {
    // Try to rebuild
    execSync('npm rebuild better-sqlite3', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('✅ better-sqlite3 rebuilt successfully for current Node.js version\n');
    return true;
  } catch (error) {
    const errorMessage = error.message || '';
    
    // Check if it's a file lock error
    if (errorMessage.includes('EBUSY') || errorMessage.includes('EPERM') || errorMessage.includes('resource busy')) {
      console.error(`\n⚠️  File lock detected (Attempt ${attempt}/${MAX_RETRIES})`);
      
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Waiting ${RETRY_DELAY_MS / 1000} seconds before retry...`);
        await sleep(RETRY_DELAY_MS);
        return rebuildWithRetry(attempt + 1);
      } else {
        console.error('\n❌ Failed to rebuild after multiple attempts due to file lock.');
        return false;
      }
    } else {
      // Different error - don't retry
      console.error('\n❌ Failed to rebuild better-sqlite3:', error.message);
      return false;
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  better-sqlite3 Rebuild Script (Safe Mode)');
  console.log('='.repeat(60));

  // Check for running processes
  const processes = checkForRunningProcesses();
  
  if (processes.electron || processes.node) {
    console.log('\n⚠️  WARNING: Detected running processes that may lock the binary:');
    if (processes.electron) {
      console.log('   • Electron processes detected');
    }
    if (processes.node) {
      console.log('   • Multiple Node.js processes detected');
    }
    console.log('\n💡 Recommendation: Run cleanup script first:');
    console.log('   pnpm run test:e2e:cleanup\n');
  }

  // Check if binary exists
  const binaryExists = checkBinaryExists();
  if (binaryExists) {
    console.log('✓ Binary file found at expected location');
  } else {
    console.log('ℹ️  Binary file not found (will be created during rebuild)');
  }

  // Attempt rebuild with retry logic
  const success = await rebuildWithRetry();

  if (!success) {
    console.log('\n' + '='.repeat(60));
    console.log('  TROUBLESHOOTING STEPS');
    console.log('='.repeat(60));
    console.log('\n1. Run the cleanup script:');
    console.log('   pnpm run test:e2e:cleanup');
    console.log('\n2. Close all VS Code terminals and reopen');
    console.log('\n3. Stop any running dev servers (Ctrl+C)');
    console.log('\n4. Try running tests without rebuild:');
    console.log('   npx playwright test tests/e2e/specs/authentication.e2e.test.ts');
    console.log('\n5. If all else fails, restart your computer');
    console.log('\n📖 Full guide: docs/troubleshooting/E2E_TEST_SETUP.md\n');
    
    // Exit with error code
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('  Ready to run E2E tests!');
  console.log('='.repeat(60) + '\n');
}

// Run the script
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});


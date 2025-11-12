const fs = require('fs');
const path = require('path');

// List of redundant launcher and test files
const filesToArchive = [
  // Launcher scripts - obsolete workarounds for Electron module issues
  'electron-launcher.js',         // Old workaround for Electron 39.x module resolution
  'electron-launcher-v2.js',      // Workaround for Electron 25
  'electron-launcher-npm.js',     // Simple spawn approach, unused
  'electron-main.js',             // Simple loader, not needed (package.json points directly to dist)
  'debug-electron.js',            // Debug script, can use npm scripts instead

  // Test files - one-off debugging scripts
  'test-electron.js',
  'test-electron-22.js',
  'test-electron-25.js',
  'test-electron-33.js',
  'test-electron-api.js',
  'test-electron-import.js',
  'test-electron-main.js',
  'test-linked-binding.js',
  'simple-test.js',

  // Python test scripts
  'test-api.py',
  'test-api-direct.py',

  // Temporary scripts
  'fix-double-extensions.js',     // One-time fix script
  'run-migration-025.js',         // One-time migration
  'fix-test-types.js',           // One-time fix
];

// Create archive directory
const archiveDir = 'archived-scripts';
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir);
}

// Create README for archived scripts
const readme = `# Archived Scripts

These scripts were used during development and debugging but are no longer needed.
They have been archived for reference purposes.

## Launcher Scripts
- **electron-launcher.js** - Workaround for Electron 39.x module resolution issue
- **electron-launcher-v2.js** - Workaround for Electron 25
- **electron-launcher-npm.js** - Simple spawn approach, replaced by npm scripts
- **electron-main.js** - Simple loader, not needed as package.json points directly to dist

## Test Scripts
Various one-off test scripts used for debugging specific issues.

## Why Archived?
- The Electron module resolution issues have been resolved in current version (33+)
- Package.json now uses standard electron commands
- Test scripts were for specific debugging sessions

## Current Launch Method
Use the npm scripts defined in package.json:
- \`npm run electron:dev\` - Development mode with hot reload
- \`npm run build:electron\` - Build for production

Archived on: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(archiveDir, 'README.md'), readme);

// Archive files
let archivedCount = 0;
let skippedCount = 0;

filesToArchive.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(__dirname, archiveDir, file);

  if (fs.existsSync(sourcePath)) {
    try {
      fs.renameSync(sourcePath, destPath);
      console.log(`✅ Archived: ${file}`);
      archivedCount++;
    } catch (error) {
      console.error(`❌ Failed to archive ${file}:`, error.message);
    }
  } else {
    console.log(`⏭️  Skipped: ${file} (not found)`);
    skippedCount++;
  }
});

console.log(`\n📦 Archive Summary:`);
console.log(`   - ${archivedCount} files archived to /${archiveDir}`);
console.log(`   - ${skippedCount} files skipped (not found)`);
console.log(`\n✨ Cleanup complete! Use 'npm run electron:dev' to launch the app.`);
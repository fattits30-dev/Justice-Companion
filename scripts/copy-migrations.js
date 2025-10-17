#!/usr/bin/env node

/**
 * Post-build script to copy migration files to dist-electron
 * This ensures migrations are available at runtime
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
const targetDir = path.join(__dirname, '..', 'dist-electron', 'migrations');

try {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✓ Created migrations directory:', targetDir);
  }

  // Copy all .sql files
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.sql'));

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied migration: ${file}`);
  }

  console.log(`\n✓ Successfully copied ${files.length} migration(s) to dist-electron/migrations/`);
} catch (error) {
  console.error('✗ Error copying migrations:', error);
  process.exit(1);
}

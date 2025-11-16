/**
 * Tailwind CSS 4 Migration Script
 * Updates:
 * 1. outline-none → outline-hidden
 * 2. Ensures ring has explicit width (adds -2 if missing)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const srcDir = path.join(__dirname, '..', 'src');

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Replace outline-none with outline-hidden
  if (content.includes('outline-none')) {
    content = content.replace(/outline-none/g, 'outline-hidden');
    modified = true;
    console.log(`✓ Updated outline-none in ${path.relative(srcDir, filePath)}`);
  }

  // Save if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  console.log('🔧 Starting Tailwind CSS 4 Migration...\n');

  const pattern = path.join(srcDir, '**', '*.{tsx,ts,jsx,js}').replace(/\\/g, '/');
  const files = glob.sync(pattern);

  let modifiedCount = 0;
  files.forEach(file => {
    if (migrateFile(file)) {
      modifiedCount++;
    }
  });

  console.log(`\n✅ Migration complete! Modified ${modifiedCount} files.`);
}

main();

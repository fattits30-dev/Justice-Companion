import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Recursively find all TypeScript files
function findTsFiles(dir) {
  const files = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const electronFiles = findTsFiles('electron');
const srcFiles = findTsFiles('src');
const files = [...electronFiles, ...srcFiles];

console.log(`Found ${files.length} TypeScript files in electron and src directories`);

let totalChanges = 0;

files.forEach((file) => {
  let content = readFileSync(file, 'utf8');
  const originalContent = content;

  // Replace .ts extensions in imports (from './file.ts' -> from './file')
  content = content.replace(
    /from\s+['"]([^'"]+)\.ts['"]/g,
    "from '$1'"
  );

  // Replace .ts extensions in require (require('./file.ts') -> require('./file'))
  content = content.replace(
    /require\s*\(\s*['"]([^'"]+)\.ts['"]\s*\)/g,
    "require('$1')"
  );

  // Replace .ts extensions in dynamic imports
  content = content.replace(
    /import\s*\(\s*['"]([^'"]+)\.ts['"]\s*\)/g,
    "import('$1')"
  );

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf8');
    totalChanges++;
    console.log(`✓ Fixed: ${file}`);
  }
});

console.log(`\nFixed ${totalChanges} files`);

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Recursively find all TypeScript files
function findTsFiles(dir) {
  const files = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
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

console.log(`Found ${files.length} TypeScript files`);

let totalChanges = 0;

files.forEach((file) => {
  let content = readFileSync(file, 'utf8');
  const originalContent = content;

  // Add .ts extensions to relative imports (from './file' -> from './file.ts')
  // But only if it doesn't already have an extension
  content = content.replace(
    /from\s+(['"])(\.[^'"]+)(?<!\.ts|\.js|\.json)\1/g,
    (match, quote, path) => {
      return `from ${quote}${path}.ts${quote}`;
    }
  );

  // Add .ts extensions to require (require('./file') -> require('./file.ts'))
  content = content.replace(
    /require\s*\(\s*(['"])(\.[^'"]+)(?<!\.ts|\.js|\.json)\1\s*\)/g,
    (match, quote, path) => {
      return `require(${quote}${path}.ts${quote})`;
    }
  );

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf8');
    totalChanges++;
    console.log(`✓ Fixed: ${file}`);
  }
});

console.log(`\nFixed ${totalChanges} files`);

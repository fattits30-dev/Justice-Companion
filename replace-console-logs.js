/**
 * Script to replace console.log statements with structured logger
 *
 * This script replaces console.log/warn/error statements with the
 * proper logger from src/utils/logger.ts
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to process
const files = [
  ...glob.sync('src/**/*.{ts,tsx}', { absolute: true }),
  ...glob.sync('electron/**/*.{ts,tsx}', { absolute: true })
].filter(file =>
  !file.includes('node_modules') &&
  !file.includes('.test.') &&
  !file.includes('.spec.') &&
  !file.includes('logger.ts') // Don't modify the logger itself
);

let totalFixed = 0;
const fileChanges = {};

console.log(`🔍 Analyzing ${files.length} TypeScript files for console statements...\n`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let changes = [];
  let needsLoggerImport = false;

  // Skip test files and the logger itself
  if (file.includes('test') || file.includes('spec') || file.endsWith('logger.ts')) {
    return;
  }

  // Check if file has console statements
  if (!content.includes('console.')) {
    return;
  }

  // Check if logger is already imported
  const hasLoggerImport = content.includes("from '../utils/logger'") ||
                          content.includes('from "./utils/logger"') ||
                          content.includes('from "../../utils/logger"') ||
                          content.includes('from "../../../utils/logger"') ||
                          content.includes('from "../../../../utils/logger"') ||
                          content.includes('from "../utils/logger"');

  // Patterns to replace console statements
  // Handle different console methods with proper logger levels
  const replacements = [
    // console.log -> logger.info
    {
      pattern: /console\.log\(/g,
      replacement: 'logger.info(',
      description: 'console.log → logger.info'
    },
    // console.warn -> logger.warn
    {
      pattern: /console\.warn\(/g,
      replacement: 'logger.warn(',
      description: 'console.warn → logger.warn'
    },
    // console.error -> logger.error
    {
      pattern: /console\.error\(/g,
      replacement: 'logger.error(',
      description: 'console.error → logger.error'
    },
    // console.info -> logger.info
    {
      pattern: /console\.info\(/g,
      replacement: 'logger.info(',
      description: 'console.info → logger.info'
    },
    // console.debug -> logger.debug
    {
      pattern: /console\.debug\(/g,
      replacement: 'logger.debug(',
      description: 'console.debug → logger.debug'
    },
    // console.trace -> logger.debug (with [TRACE] prefix)
    {
      pattern: /console\.trace\(/g,
      replacement: 'logger.debug("[TRACE]",',
      description: 'console.trace → logger.debug'
    }
  ];

  // Apply replacements
  replacements.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes.push(`  ✓ ${description} (${matches.length} occurrences)`);
      needsLoggerImport = true;
    }
  });

  // Add logger import if needed and not already present
  if (needsLoggerImport && !hasLoggerImport) {
    // Calculate relative path to logger
    const fileDir = path.dirname(file);
    const loggerPath = path.join(process.cwd(), 'src', 'utils', 'logger.ts');
    let relativePath = path.relative(fileDir, loggerPath)
      .replace(/\\/g, '/')  // Use forward slashes
      .replace(/\.ts$/, ''); // Remove .ts extension

    // Ensure it starts with ./ for relative imports
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    // Add import at the top of the file after other imports
    const importStatement = `import { logger } from '${relativePath}';\n`;

    // Find where to insert the import
    const firstImportMatch = content.match(/^import .* from/m);
    if (firstImportMatch) {
      // Add after the last import
      const lastImportMatch = content.match(/(import .* from .*;\n)(?!import)/);
      if (lastImportMatch) {
        const insertPos = content.indexOf(lastImportMatch[0]) + lastImportMatch[0].length;
        content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
      } else {
        // Add at the beginning if no imports found
        content = importStatement + '\n' + content;
      }
    } else {
      // Add at the beginning if no imports found
      content = importStatement + '\n' + content;
    }

    changes.push('  ✓ Added logger import');
  }

  // Special case: Some files use console for specific purposes that should be preserved
  // For example, CLI scripts, build scripts, or startup messages
  const isCliScript = file.includes('cli') ||
                      file.includes('scripts/') ||
                      file.includes('build') ||
                      file.includes('workflow') ||
                      file.endsWith('main.ts'); // Electron main process startup

  if (isCliScript && content.includes('logger.')) {
    // For CLI scripts, we might want to keep some console statements
    // Revert logger.info back to console.log for startup messages
    content = content.replace(/logger\.info\(\[\"IPC\"\]/g, 'console.warn("[IPC]"');
    content = content.replace(/logger\.info\(\"Setting up/g, 'console.warn("Setting up');
    changes.push('  ✓ Preserved startup console messages for CLI');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    const relPath = path.relative(process.cwd(), file);
    console.log(`📝 Fixed: ${relPath}`);
    changes.forEach(change => console.log(change));
    console.log('');
    fileChanges[relPath] = changes;
    totalFixed++;
  }
});

// Generate summary report
console.log('═'.repeat(80));
console.log(`✨ Replaced console statements in ${totalFixed} files`);
console.log('═'.repeat(80));

if (totalFixed > 0) {
  console.log('\n📊 Summary of changes:\n');

  // Count total replacements by type
  const replacementCounts = {};
  Object.values(fileChanges).forEach(changes => {
    changes.forEach(change => {
      if (change.includes('→')) {
        const key = change.split('(')[0].replace('  ✓ ', '').trim();
        replacementCounts[key] = (replacementCounts[key] || 0) + 1;
      }
    });
  });

  Object.entries(replacementCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([replacement, count]) => {
      console.log(`  ${count}x: ${replacement}`);
    });

  console.log(`\n  ${Object.values(fileChanges).filter(changes =>
    changes.some(c => c.includes('Added logger import'))
  ).length} files: Added logger import`);
}

console.log('\n🎯 Next steps:');
console.log('1. Run: npm run lint to verify remaining warnings');
console.log('2. Run: npm test to ensure no broken tests');
console.log('3. Review any CLI/startup scripts to ensure proper console usage');
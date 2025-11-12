/**
 * Targeted script to fix TypeScript any type warnings
 *
 * This script carefully fixes specific patterns of any type usage
 * with proper type safety.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Safe replacements that won't break type safety
const SAFE_REPLACEMENTS = [
  // Error handling - these are always safe
  {
    pattern: /catch\s*\(\s*error:\s*any\s*\)/g,
    replacement: 'catch (error)',
    description: 'Remove explicit any from catch blocks (TypeScript 4.4+ infers unknown)'
  },
  {
    pattern: /catch\s*\(\s*e:\s*any\s*\)/g,
    replacement: 'catch (e)',
    description: 'Remove explicit any from catch blocks'
  },
  {
    pattern: /catch\s*\(\s*err:\s*any\s*\)/g,
    replacement: 'catch (err)',
    description: 'Remove explicit any from catch blocks'
  },

  // IPC event handlers - specific to Electron
  {
    pattern: /async\s+\(event:\s*any,/g,
    replacement: 'async (event: Electron.IpcMainInvokeEvent,',
    description: 'Type IPC event handlers correctly'
  },
  {
    pattern: /\(event:\s*any\)/g,
    replacement: '(event: Electron.IpcMainInvokeEvent)',
    description: 'Type IPC events correctly'
  },

  // Common React event patterns
  {
    pattern: /onChange=\{[^}]*\(e:\s*any\)/g,
    replacement: (match) => match.replace('(e: any)', '(e)'),
    description: 'Let TypeScript infer React event types'
  },
  {
    pattern: /onClick=\{[^}]*\(e:\s*any\)/g,
    replacement: (match) => match.replace('(e: any)', '(e)'),
    description: 'Let TypeScript infer React event types'
  },

  // Rest parameters
  {
    pattern: /\.\.\.args:\s*any\[\]/g,
    replacement: '...args: unknown[]',
    description: 'Type rest parameters as unknown[]'
  },
  {
    pattern: /args:\s*any\[\]/g,
    replacement: 'args: unknown[]',
    description: 'Type args arrays as unknown[]'
  },

  // Metadata and generic data
  {
    pattern: /metadata\?:\s*Record<string,\s*any>/g,
    replacement: 'metadata?: Record<string, unknown>',
    description: 'Type metadata as Record<string, unknown>'
  },
  {
    pattern: /data:\s*Record<string,\s*any>/g,
    replacement: 'data: Record<string, unknown>',
    description: 'Type generic data as Record<string, unknown>'
  },

  // Promise return types
  {
    pattern: /:\s*Promise<any>/g,
    replacement: ': Promise<unknown>',
    description: 'Type generic promises as Promise<unknown>'
  },

  // Generic arrays (but not function signatures)
  {
    pattern: /:\s*any\[\]\s*[,;)]/g,
    replacement: (match) => match.replace('any[]', 'unknown[]'),
    description: 'Type generic arrays as unknown[]'
  }
];

// Files to process
const files = [
  ...glob.sync('src/**/*.{ts,tsx}', { absolute: true }),
  ...glob.sync('electron/**/*.{ts,tsx}', { absolute: true })
].filter(file => !file.includes('node_modules') && !file.endsWith('.d.ts'));

let totalFixed = 0;
const fileChanges = {};

console.log(`🔍 Analyzing ${files.length} TypeScript files for any type usage...\n`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let changes = [];

  // Skip test files for now
  if (file.includes('.test.') || file.includes('.spec.')) {
    return;
  }

  // Apply safe replacements
  SAFE_REPLACEMENTS.forEach(({ pattern, replacement, description }) => {
    let newContent;
    if (typeof replacement === 'function') {
      const matches = content.match(pattern);
      if (matches) {
        newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          changes.push(`  ✓ ${description} (${matches.length} occurrences)`);
          content = newContent;
        }
      }
    } else {
      const matches = content.match(pattern);
      if (matches) {
        newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          changes.push(`  ✓ ${description} (${matches.length} occurrences)`);
          content = newContent;
        }
      }
    }
  });

  // Special case: Fix database query results with proper type assertions
  if (file.includes('repositories')) {
    // Fix db.get() calls
    content = content.replace(
      /const\s+(\w+)\s*=\s*db\.get\((.*?)\)\s*as\s*any/g,
      'const $1 = db.get($2)'
    );

    // Fix db.all() calls
    content = content.replace(
      /const\s+(\w+)\s*=\s*db\.all\((.*?)\)\s*as\s*any/g,
      'const $1 = db.all($2)'
    );

    // Count if changes were made
    if (content.includes('db.get(') && !content.includes('as any')) {
      changes.push('  ✓ Removed unnecessary type assertions from database queries');
    }
  }

  // Special case: Fix import extensions warnings by adding type annotations
  if (file.includes('ipc-handlers')) {
    // Add proper imports if missing
    if (!content.includes('import type { Electron }') && content.includes('IpcMainInvokeEvent')) {
      content = `import type { Electron } from 'electron';\n${content}`;
      changes.push('  ✓ Added Electron type import');
    }
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
console.log(`✨ Safely fixed any type warnings in ${totalFixed} files`);
console.log('═'.repeat(80));

if (totalFixed > 0) {
  console.log('\n📊 Summary of applied fixes:\n');

  // Count total fixes by type
  const fixCounts = {};
  Object.values(fileChanges).forEach(changes => {
    changes.forEach(change => {
      const key = change.replace(/\s*\(\d+ occurrences\)/, '').replace('  ✓ ', '');
      fixCounts[key] = (fixCounts[key] || 0) + 1;
    });
  });

  Object.entries(fixCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([fix, count]) => {
      console.log(`  ${count}x: ${fix}`);
    });
}

console.log('\n🎯 Next steps:');
console.log('1. Run: npm run type-check to ensure no type errors');
console.log('2. Run: npm run lint to check remaining warnings');
console.log('3. Manually review remaining complex any types');
console.log('\n📌 Note: This script applied only safe transformations that won\'t break type safety.');
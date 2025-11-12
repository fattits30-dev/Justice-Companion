/**
 * Script to fix TypeScript any type warnings
 *
 * This script identifies and fixes common patterns of any type usage
 * in the Justice Companion codebase.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common type replacements for known patterns
const TYPE_REPLACEMENTS = {
  // Error handling patterns
  'catch (error: any)': 'catch (error: unknown)',
  'catch (e: any)': 'catch (e: unknown)',
  'catch (err: any)': 'catch (err: unknown)',

  // Response data patterns
  'response.data as any': 'response.data as unknown',
  'axiosError.response.data as any': 'axiosError.response.data as Record<string, unknown>',

  // Event handler patterns
  '(e: any)': '(e: Event | React.ChangeEvent<HTMLInputElement>)',
  'onChange={(e: any)': 'onChange={(e: React.ChangeEvent<HTMLInputElement>)',
  'onClick={(e: any)': 'onClick={(e: React.MouseEvent<HTMLButtonElement>)',

  // Generic object patterns
  'Record<string, any>': 'Record<string, unknown>',
  'metadata?: Record<string, any>': 'metadata?: Record<string, unknown>',

  // Array patterns
  'any[]': 'unknown[]',
  'Array<any>': 'Array<unknown>',

  // Function parameters
  'args: any[]': 'args: unknown[]',
  '...args: any[]': '...args: unknown[]',

  // Common service patterns
  'data: any': 'data: unknown',
  'result: any': 'result: unknown',
  'value: any': 'value: unknown',
  'payload: any': 'payload: unknown',
  'params: any': 'params: unknown',

  // Type assertions
  ' as any;': ' as unknown;',
  ' as any)': ' as unknown)',
};

// Patterns that need context-aware replacement
const CONTEXT_PATTERNS = [
  {
    pattern: /localStorage\.getItem\((.*?)\) as any/g,
    replacement: 'localStorage.getItem($1)',
    comment: '// localStorage returns string | null'
  },
  {
    pattern: /JSON\.parse\((.*?)\) as any/g,
    replacement: 'JSON.parse($1) as unknown',
    comment: '// JSON.parse returns unknown'
  },
  {
    pattern: /window\.(.*?) as any/g,
    replacement: 'window.$1',
    comment: '// Window properties should be properly typed'
  },
  {
    pattern: /error instanceof Error \? error\.message : \(error as any\)\.toString\(\)/g,
    replacement: 'error instanceof Error ? error.message : String(error)',
    comment: '// Convert unknown errors to string'
  }
];

// Files to process
const files = [
  ...glob.sync('src/**/*.{ts,tsx}', { absolute: true }),
  ...glob.sync('electron/**/*.{ts,tsx}', { absolute: true })
].filter(file => !file.includes('node_modules'));

let totalFixed = 0;
const fileChanges = {};

console.log(`🔍 Analyzing ${files.length} TypeScript files for any type usage...\n`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let changes = [];

  // Skip type definition files and test files for now
  if (file.endsWith('.d.ts') || file.includes('.test.') || file.includes('.spec.')) {
    return;
  }

  // Apply simple replacements
  Object.entries(TYPE_REPLACEMENTS).forEach(([pattern, replacement]) => {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, replacement);
      changes.push(`  ✓ Replaced "${pattern}" with "${replacement}" (${matches.length} occurrences)`);
    }
  });

  // Apply context-aware patterns
  CONTEXT_PATTERNS.forEach(({ pattern, replacement, comment }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes.push(`  ✓ Applied context pattern: ${comment} (${matches.length} occurrences)`);
    }
  });

  // Special case: Fix function parameter types in IPC handlers
  if (file.includes('ipc-handlers')) {
    // Fix IPC handler function signatures
    content = content.replace(
      /async \(event: any, (.*?)\)/g,
      'async (event: Electron.IpcMainInvokeEvent, $1)'
    );

    content = content.replace(
      /\(event: any\)/g,
      '(event: Electron.IpcMainInvokeEvent)'
    );
  }

  // Special case: Fix React component props
  if (file.endsWith('.tsx')) {
    // Fix component props that use any
    content = content.replace(
      /interface (\w+Props) \{([^}]*?)(\w+): any;/g,
      (match, interfaceName, before, propName) => {
        // Try to infer type based on prop name
        if (propName.includes('handler') || propName.includes('Handler')) {
          return `interface ${interfaceName} {${before}${propName}: () => void;`;
        }
        if (propName.includes('children')) {
          return `interface ${interfaceName} {${before}${propName}: React.ReactNode;`;
        }
        if (propName.includes('style')) {
          return `interface ${interfaceName} {${before}${propName}: React.CSSProperties;`;
        }
        if (propName.includes('className')) {
          return `interface ${interfaceName} {${before}${propName}: string;`;
        }
        // Default to unknown
        return `interface ${interfaceName} {${before}${propName}: unknown;`;
      }
    );
  }

  // Special case: Repository and Service files
  if (file.includes('repositories') || file.includes('services')) {
    // Fix database query results
    content = content.replace(
      /db\.get\((.*?)\) as any/g,
      'db.get($1) as unknown'
    );

    content = content.replace(
      /db\.all\((.*?)\) as any/g,
      'db.all($1) as unknown[]'
    );

    // Fix service method return types
    content = content.replace(
      /: Promise<any>/g,
      ': Promise<unknown>'
    );

    content = content.replace(
      /: any \| null/g,
      ': unknown | null'
    );
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
console.log(`✨ Fixed any type warnings in ${totalFixed} files`);
console.log('═'.repeat(80));

if (totalFixed > 0) {
  console.log('\n📊 Summary of changes:\n');

  // Count total replacements by type
  const replacementCounts = {};
  Object.values(fileChanges).forEach(changes => {
    changes.forEach(change => {
      const match = change.match(/Replaced "(.*?)" with "(.*?)"/);
      if (match) {
        const key = `${match[1]} → ${match[2]}`;
        replacementCounts[key] = (replacementCounts[key] || 0) + 1;
      }
    });
  });

  Object.entries(replacementCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([replacement, count]) => {
      console.log(`  ${count}x: ${replacement}`);
    });
}

console.log('\n🎯 Next steps:');
console.log('1. Run: npm run lint to verify remaining warnings');
console.log('2. Run: npm run type-check to ensure no type errors');
console.log('3. Run: npm test to verify no broken tests');
console.log('4. Manual review of complex any types that need custom typing');
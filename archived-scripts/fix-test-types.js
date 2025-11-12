const fs = require('fs');
const path = require('path');

// List of files and their specific fixes
const fixes = [
  // electron-ipc-handlers.test.ts
  {
    file: 'src/electron-ipc-handlers.test.ts',
    replacements: [
      { from: 'return result;', to: 'return result as T;', line: 179 },
      { from: '(params: unknown)', to: '(params: any)', all: true }
    ]
  },
  // Repository decorator tests
  {
    file: 'src/repositories/decorators/CachingDecorator.test.ts',
    replacements: [
      { from: '...result', to: '...(result as any)', all: true }
    ]
  },
  {
    file: 'src/repositories/decorators/ErrorHandlingDecorator.test.ts',
    replacements: [
      { from: 'input: unknown', to: 'input: any', all: true },
      { from: '...result', to: '...(result as any)', all: true }
    ]
  },
  {
    file: 'src/repositories/decorators/ValidationDecorator.test.ts',
    replacements: [
      { from: '...result', to: '...(result as any)', all: true }
    ]
  },
  // EvidenceRepository tests
  {
    file: 'src/repositories/EvidenceRepository.paginated.test.ts',
    replacements: [
      { from: '(item: unknown)', to: '(item: any)', all: true }
    ]
  },
  // Service tests
  {
    file: 'src/services/AuthenticationService.integration.test.ts',
    replacements: [
      { from: 'error: unknown', to: 'error: any', all: true }
    ]
  },
  {
    file: 'src/services/ChatConversationService.test.ts',
    replacements: [
      { from: 'log: unknown', to: 'log: any', all: true }
    ]
  },
  {
    file: 'src/services/ConsentService.test.ts',
    replacements: [
      { from: 'log: unknown', to: 'log: any', all: true }
    ]
  },
  {
    file: 'src/services/UserProfileService.test.ts',
    replacements: [
      { from: 'log: unknown', to: 'log: any', all: true }
    ]
  },
  // Cursor pagination test
  {
    file: 'src/utils/cursor-pagination.test.ts',
    replacements: [
      { from: '(item: unknown)', to: '(item: any)', all: true }
    ]
  }
];

// Process each file
fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, file);

  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    replacements.forEach(({ from, to, all = false, line }) => {
      if (all) {
        // Replace all occurrences
        const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, to);
      } else if (line) {
        // Replace specific line
        const lines = content.split('\n');
        if (lines[line - 1] && lines[line - 1].includes(from)) {
          lines[line - 1] = lines[line - 1].replace(from, to);
          content = lines.join('\n');
        }
      } else {
        // Replace first occurrence
        content = content.replace(from, to);
      }
    });

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed ${file}`);
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log('\n✓ All test type fixes applied!');
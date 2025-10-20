const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Find duplicate code blocks
function findDuplicates(dir) {
  const files = [];
  const codeBlocks = new Map();
  const duplicates = [];

  // Get all TS/TSX files
  function getFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!item.includes('node_modules') && !item.includes('.venv')) {
          getFiles(fullPath);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  getFiles(dir);

  // Analyze each file for duplicate blocks
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    // Check blocks of 10+ lines
    for (let i = 0; i <= lines.length - 10; i++) {
      const block = lines.slice(i, i + 10)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('*'))
        .join('\n');

      if (block.length < 50) continue;

      const hash = crypto.createHash('md5').update(block).digest('hex');

      if (codeBlocks.has(hash)) {
        const existing = codeBlocks.get(hash);
        if (existing.file !== file) {
          duplicates.push({
            hash,
            files: [existing.file, file],
            lines: [existing.line, i + 1],
            size: 10,
            preview: block.substring(0, 100)
          });
        }
      } else {
        codeBlocks.set(hash, { file, line: i + 1 });
      }
    }
  });

  return duplicates;
}

// Analyze
console.log('Searching for duplicate code blocks...\n');
const duplicates = findDuplicates('src');
duplicates.push(...findDuplicates('electron'));

// Group duplicates by hash
const grouped = {};
duplicates.forEach(dup => {
  if (!grouped[dup.hash]) {
    grouped[dup.hash] = {
      files: new Set(),
      occurrences: 0,
      preview: dup.preview
    };
  }
  dup.files.forEach(f => grouped[dup.hash].files.add(f));
  grouped[dup.hash].occurrences++;
});

// Report
console.log('DUPLICATE CODE ANALYSIS REPORT');
console.log('==============================\n');

const sortedGroups = Object.values(grouped)
  .sort((a, b) => b.occurrences - a.occurrences)
  .slice(0, 20);

sortedGroups.forEach((group, i) => {
  console.log(`Duplicate Block #${i + 1}`);
  console.log(`Occurrences: ${group.occurrences}`);
  console.log(`Files affected: ${group.files.size}`);
  console.log('Files:');
  Array.from(group.files).slice(0, 5).forEach(f => {
    console.log(`  - ${path.relative(process.cwd(), f)}`);
  });
  console.log(`Preview: ${group.preview}...`);
  console.log();
});

console.log(`Total unique duplicate blocks: ${Object.keys(grouped).length}`);

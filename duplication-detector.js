const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DuplicationDetector {
  constructor() {
    this.codeBlocks = [];
    this.duplicates = [];
    this.similarPatterns = [];
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.relative(process.cwd(), filePath);

      // Skip test files
      if (fileName.includes('.test.') || fileName.includes('.spec.')) {
        return;
      }

      const lines = content.split('\n');

      // Extract code blocks (5+ lines)
      for (let i = 0; i < lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n');

        // Skip empty blocks or imports
        if (block.trim().length < 50 || block.includes('import ') || block.includes('export {')) {
          continue;
        }

        // Normalize for comparison (remove whitespace variations)
        const normalized = this.normalizeCode(block);
        const hash = crypto.createHash('md5').update(normalized).digest('hex');

        this.codeBlocks.push({
          file: fileName,
          startLine: i + 1,
          content: block,
          normalized: normalized,
          hash: hash
        });
      }

      // Look for common patterns
      this.extractPatterns(content, fileName);

    } catch (error) {
      // Skip files that can't be read
    }
  }

  normalizeCode(code) {
    return code
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/['"].*?['"]/g, 'STRING')  // Normalize strings
      .replace(/\d+/g, 'NUM')  // Normalize numbers
      .replace(/\/\/.*/g, '')  // Remove comments
      .trim();
  }

  extractPatterns(content, fileName) {
    // Common patterns to detect
    const patterns = [
      {
        name: 'try-catch-log',
        regex: /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[^}]*(?:console\.log|logger\.error)[^}]*\}/g,
        description: 'Try-catch blocks with logging'
      },
      {
        name: 'validation-chain',
        regex: /if\s*\([^)]*\)\s*\{\s*throw[^}]*\}\s*if\s*\([^)]*\)\s*\{\s*throw[^}]*\}/g,
        description: 'Sequential validation checks'
      },
      {
        name: 'promise-chain',
        regex: /\.then\([^)]*\)[^;]*\.then\([^)]*\)[^;]*\.catch/g,
        description: 'Promise chains (could use async/await)'
      },
      {
        name: 'switch-case',
        regex: /switch\s*\([^)]*\)\s*\{(?:\s*case[^:]*:[^}]*break;){3,}/g,
        description: 'Large switch statements'
      },
      {
        name: 'nested-if',
        regex: /if\s*\([^)]*\)\s*\{[^}]*if\s*\([^)]*\)\s*\{[^}]*if\s*\([^)]*\)/g,
        description: 'Deeply nested conditionals'
      }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches && matches.length > 0) {
        this.similarPatterns.push({
          file: fileName,
          pattern: pattern.name,
          description: pattern.description,
          occurrences: matches.length
        });
      }
    });
  }

  findDuplicates() {
    // Group blocks by hash
    const blocksByHash = {};

    this.codeBlocks.forEach(block => {
      if (!blocksByHash[block.hash]) {
        blocksByHash[block.hash] = [];
      }
      blocksByHash[block.hash].push(block);
    });

    // Find duplicates
    Object.values(blocksByHash).forEach(blocks => {
      if (blocks.length > 1) {
        this.duplicates.push({
          hash: blocks[0].hash,
          occurrences: blocks.length,
          locations: blocks.map(b => ({
            file: b.file,
            startLine: b.startLine
          })),
          preview: blocks[0].content.substring(0, 100) + '...'
        });
      }
    });
  }

  generateReport() {
    console.log('\n=== CODE DUPLICATION ANALYSIS ===\n');

    // Duplication Summary
    console.log('## DUPLICATE CODE BLOCKS\n');
    console.log(`Total duplicate groups found: ${this.duplicates.length}`);

    const totalDuplicateLines = this.duplicates.reduce((sum, dup) =>
      sum + (dup.occurrences - 1) * 5, 0);
    console.log(`Estimated duplicate lines: ~${totalDuplicateLines}`);

    if (this.duplicates.length > 0) {
      console.log('\nTop 10 Most Duplicated Blocks:');
      this.duplicates
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 10)
        .forEach((dup, index) => {
          console.log(`\n${index + 1}. Duplicated ${dup.occurrences} times:`);
          console.log(`   Preview: ${dup.preview}`);
          console.log('   Locations:');
          dup.locations.slice(0, 5).forEach(loc => {
            console.log(`   - ${loc.file}:${loc.startLine}`);
          });
        });
    }

    // Pattern Analysis
    console.log('\n## COMMON CODE PATTERNS\n');

    const patternSummary = {};
    this.similarPatterns.forEach(item => {
      if (!patternSummary[item.pattern]) {
        patternSummary[item.pattern] = {
          description: item.description,
          files: [],
          totalOccurrences: 0
        };
      }
      patternSummary[item.pattern].files.push(item.file);
      patternSummary[item.pattern].totalOccurrences += item.occurrences;
    });

    Object.entries(patternSummary).forEach(([pattern, data]) => {
      console.log(`\n${data.description}:`);
      console.log(`- Found in ${data.files.length} files`);
      console.log(`- Total occurrences: ${data.totalOccurrences}`);
      if (data.files.length <= 5) {
        data.files.forEach(file => console.log(`  - ${file}`));
      }
    });

    // Refactoring Opportunities
    console.log('\n## REFACTORING OPPORTUNITIES\n');

    const opportunities = [];

    // High duplication files
    const fileOccurrences = {};
    this.duplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        fileOccurrences[loc.file] = (fileOccurrences[loc.file] || 0) + 1;
      });
    });

    Object.entries(fileOccurrences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([file, count]) => {
        opportunities.push({
          type: 'High Duplication',
          file: file,
          description: `Contains ${count} duplicate code blocks`,
          priority: 'High'
        });
      });

    // Files with multiple patterns
    const patternFiles = {};
    this.similarPatterns.forEach(item => {
      if (!patternFiles[item.file]) {
        patternFiles[item.file] = [];
      }
      patternFiles[item.file].push(item.pattern);
    });

    Object.entries(patternFiles)
      .filter(([_, patterns]) => patterns.length >= 3)
      .slice(0, 5)
      .forEach(([file, patterns]) => {
        opportunities.push({
          type: 'Pattern Overuse',
          file: file,
          description: `Contains ${patterns.length} different code patterns`,
          priority: 'Medium'
        });
      });

    console.log('Top Refactoring Candidates:');
    opportunities.forEach((opp, index) => {
      console.log(`${index + 1}. [${opp.priority}] ${opp.file}`);
      console.log(`   Type: ${opp.type}`);
      console.log(`   ${opp.description}`);
    });
  }
}

// Main execution
async function detectDuplication() {
  const detector = new DuplicationDetector();
  const srcDir = path.join(process.cwd(), 'src');
  const electronDir = path.join(process.cwd(), 'electron');

  // Get all TypeScript files
  const getAllFiles = (dir, fileList = []) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          if (!['node_modules', 'dist', 'release', '.git'].includes(file)) {
            getAllFiles(filePath, fileList);
          }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          fileList.push(filePath);
        }
      });
    } catch (error) {
      // Skip directories that can't be read
    }
    return fileList;
  };

  const files = [...getAllFiles(srcDir), ...getAllFiles(electronDir)];

  console.log(`Analyzing ${files.length} files for duplication...\n`);

  // Analyze each file
  files.forEach(file => {
    detector.analyzeFile(file);
  });

  // Find duplicates
  detector.findDuplicates();

  // Generate report
  detector.generateReport();
}

detectDuplication();
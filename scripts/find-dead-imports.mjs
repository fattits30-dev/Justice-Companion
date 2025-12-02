#!/usr/bin/env node
/**
 * Dead Import Finder - Justice Companion Cleanup Tool
 * 
 * Scans TypeScript/JavaScript files for unused imports and reports them.
 * Sheffield-approved code hygiene, innit.
 * 
 * Usage: node scripts/find-dead-imports.mjs [--fix] [--json] [path]
 * 
 * Options:
 *   --fix    Auto-remove dead imports (creates backup first)
 *   --json   Output results as JSON
 *   path     Specific directory to scan (default: src)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  ignoreDirs: ['node_modules', 'dist', 'build', '.git', '.venv', 'coverage', '__pycache__'],
  ignoreFiles: ['vite-env.d.ts', 'env.d.ts'],
};

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  json: args.includes('--json'),
  path: args.find(a => !a.startsWith('--')) || 'src',
};

// Colors for terminal output (disabled if JSON mode)
const colors = options.json ? {
  reset: '', red: '', green: '', yellow: '', blue: '', cyan: '', dim: ''
} : {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Recursively find all source files
 */
function findSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!CONFIG.ignoreDirs.includes(entry.name)) {
        findSourceFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (CONFIG.extensions.includes(ext) && !CONFIG.ignoreFiles.includes(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Extract imports from a file
 */
function extractImports(content) {
  const imports = [];
  const lines = content.split('\n');
  
  // Regex patterns for different import styles
  const patterns = [
    // import { foo, bar } from 'module'
    /import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g,
    // import foo from 'module'
    /import\s+(\w+)\s+from\s+['"][^'"]+['"]/g,
    // import * as foo from 'module'
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"][^'"]+['"]/g,
    // import foo, { bar } from 'module'
    /import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g,
  ];
  
  let lineNum = 0;
  let inMultilineImport = false;
  let multilineBuffer = '';
  let multilineStartLine = 0;
  
  for (const line of lines) {
    lineNum++;
    
    // Handle multiline imports
    if (inMultilineImport) {
      multilineBuffer += ' ' + line.trim();
      if (line.includes('}') || line.includes("from '") || line.includes('from "')) {
        inMultilineImport = false;
        processImportLine(multilineBuffer, multilineStartLine, imports);
        multilineBuffer = '';
      }
      continue;
    }
    
    // Check for start of import
    if (line.trim().startsWith('import ')) {
      if ((line.includes('{') && !line.includes('}')) || 
          (line.includes('import ') && !line.includes('from '))) {
        inMultilineImport = true;
        multilineBuffer = line.trim();
        multilineStartLine = lineNum;
        continue;
      }
      processImportLine(line, lineNum, imports);
    }
  }
  
  return imports;
}

/**
 * Process a single import line
 */
function processImportLine(line, lineNum, imports) {
  // Skip type-only imports (these are compile-time only)
  if (line.includes('import type ')) {
    return;
  }
  
  // Extract named imports: import { foo, bar as baz } from 'module'
  const namedMatch = line.match(/\{([^}]+)\}/);
  if (namedMatch) {
    const names = namedMatch[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim(); // Use alias if present
    }).filter(n => n && !n.startsWith('type '));
    
    names.forEach(name => {
      if (name) {
        imports.push({ name, line: lineNum, type: 'named' });
      }
    });
  }
  
  // Extract default imports: import Foo from 'module'
  const defaultMatch = line.match(/import\s+(\w+)\s+from/);
  if (defaultMatch && defaultMatch[1] !== 'type') {
    imports.push({ name: defaultMatch[1], line: lineNum, type: 'default' });
  }
  
  // Extract namespace imports: import * as Foo from 'module'
  const namespaceMatch = line.match(/import\s+\*\s+as\s+(\w+)/);
  if (namespaceMatch) {
    imports.push({ name: namespaceMatch[1], line: lineNum, type: 'namespace' });
  }
  
  // Extract combined: import Foo, { bar } from 'module'
  const combinedMatch = line.match(/import\s+(\w+)\s*,\s*\{/);
  if (combinedMatch && combinedMatch[1] !== 'type') {
    imports.push({ name: combinedMatch[1], line: lineNum, type: 'default' });
  }
}

/**
 * Check if an import is used in the file content
 */
function isImportUsed(importName, content, importLines) {
  // Remove all import statements and comments for checking
  const cleanContent = content
    .split('\n')
    .filter((_, i) => !importLines.includes(i + 1))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '');        // Remove line comments
  
  // Check for usage with word boundaries
  // This catches: Component, <Component, Component., Component(, etc.
  const usagePatterns = [
    new RegExp(`\\b${importName}\\b`, 'g'),           // General usage
    new RegExp(`<${importName}[\\s/>]`, 'g'),         // JSX opening tag
    new RegExp(`</${importName}>`, 'g'),              // JSX closing tag
  ];
  
  for (const pattern of usagePatterns) {
    if (pattern.test(cleanContent)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Analyze a single file for dead imports
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = extractImports(content);
  const importLines = imports.map(i => i.line);
  
  const deadImports = imports.filter(imp => !isImportUsed(imp.name, content, importLines));
  
  return {
    file: path.relative(projectRoot, filePath),
    totalImports: imports.length,
    deadImports: deadImports,
  };
}

/**
 * Remove dead imports from a file
 */
function removeDeadImports(filePath, deadImports) {
  if (deadImports.length === 0) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const deadNames = new Set(deadImports.map(d => d.name));
  
  // Create backup
  fs.writeFileSync(filePath + '.bak', content);
  
  let modified = false;
  const newLines = [];
  let skipUntilCloseBrace = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if this is an import line
    if (line.trim().startsWith('import ')) {
      // Check for named imports that we can clean
      const namedMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
      if (namedMatch) {
        const names = namedMatch[1].split(',').map(n => n.trim());
        const liveNames = names.filter(n => {
          const actualName = n.split(/\s+as\s+/).pop().trim();
          return !deadNames.has(actualName);
        });
        
        if (liveNames.length === 0) {
          // Entire import is dead, skip this line
          modified = true;
          continue;
        } else if (liveNames.length < names.length) {
          // Some imports are dead, rewrite the line
          line = line.replace(/\{[^}]+\}/, `{ ${liveNames.join(', ')} }`);
          modified = true;
        }
      }
      
      // Check for default import that's dead
      const defaultMatch = line.match(/^import\s+(\w+)\s+from/);
      if (defaultMatch && deadNames.has(defaultMatch[1])) {
        modified = true;
        continue;
      }
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'));
  }
  
  return modified;
}

/**
 * Main execution
 */
async function main() {
  const scanPath = path.resolve(projectRoot, options.path);
  
  if (!fs.existsSync(scanPath)) {
    console.error(`${colors.red}Error: Path not found: ${scanPath}${colors.reset}`);
    process.exit(1);
  }
  
  if (!options.json) {
    console.log(`\n${colors.cyan}🔍 Dead Import Finder - Justice Companion${colors.reset}`);
    console.log(`${colors.dim}Scanning: ${scanPath}${colors.reset}\n`);
  }
  
  const files = findSourceFiles(scanPath);
  const results = [];
  let totalDead = 0;
  let filesWithDead = 0;
  
  for (const file of files) {
    try {
      const analysis = analyzeFile(file);
      
      if (analysis.deadImports.length > 0) {
        filesWithDead++;
        totalDead += analysis.deadImports.length;
        results.push(analysis);
        
        if (options.fix) {
          removeDeadImports(path.join(projectRoot, analysis.file), analysis.deadImports);
        }
      }
    } catch (err) {
      if (!options.json) {
        console.error(`${colors.red}Error processing ${file}: ${err.message}${colors.reset}`);
      }
    }
  }
  
  // Output results
  if (options.json) {
    console.log(JSON.stringify({
      scannedFiles: files.length,
      filesWithDeadImports: filesWithDead,
      totalDeadImports: totalDead,
      results: results,
      fixed: options.fix,
    }, null, 2));
  } else {
    // Pretty print results
    if (results.length === 0) {
      console.log(`${colors.green}✅ No dead imports found! Your code is proper clean, like.${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}Found ${totalDead} dead imports in ${filesWithDead} files:${colors.reset}\n`);
      
      for (const result of results) {
        console.log(`${colors.blue}📄 ${result.file}${colors.reset}`);
        for (const dead of result.deadImports) {
          console.log(`   ${colors.red}✗${colors.reset} Line ${dead.line}: ${colors.yellow}${dead.name}${colors.reset} ${colors.dim}(${dead.type})${colors.reset}`);
        }
        console.log('');
      }
      
      if (options.fix) {
        console.log(`${colors.green}✅ Removed dead imports (backups created with .bak extension)${colors.reset}\n`);
      } else {
        console.log(`${colors.dim}Run with --fix to auto-remove dead imports${colors.reset}\n`);
      }
    }
    
    // Summary
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}📊 Summary${colors.reset}`);
    console.log(`   Files scanned:     ${files.length}`);
    console.log(`   Files with issues: ${filesWithDead}`);
    console.log(`   Dead imports:      ${totalDead}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  }
  
  process.exit(results.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});

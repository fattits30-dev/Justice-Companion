#!/usr/bin/env node
/**
 * Simple import fixer - adds .ts extensions to relative imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.includes('.test.') && !file.includes('.spec.') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const srcDir = path.join(__dirname, 'src');
const files = getAllTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to process...\n`);

let totalFixed = 0;

files.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Add .ts to relative imports that don't have it
    content = content.replace(
      /from\s+['"](\.\.?\/[^'"]+)(?<!\.ts)(?<!\.json)(?<!\.css)(?<!\.js)['"]/g,
      (match, importPath) => {
        if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css')) {
          return match;
        }
        return `from '${importPath}.ts'`;
      }
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      console.log(`✅ Fixed: ${relativePath}`);
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with missing .ts extensions`);

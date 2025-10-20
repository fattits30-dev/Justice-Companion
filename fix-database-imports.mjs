#!/usr/bin/env node
/**
 * Bulk fix for missing .ts extensions on database imports
 * Adds .ts extension to all imports from '../db/database' that don't have it
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'src/benchmarks/cache-performance-benchmark.ts',
  'src/repositories/CaseFactsRepository.ts',
  'src/repositories/CaseRepository.ts',
  'src/repositories/CaseRepositoryPaginated.ts',
  'src/repositories/ChatConversationRepository.ts',
  'src/repositories/ConsentRepository.ts',
  'src/repositories/EvidenceRepository.ts',
  'src/repositories/LegalIssuesRepository.ts',
  'src/repositories/NotesRepository.ts',
  'src/repositories/TimelineRepository.ts',
  'src/repositories/UserFactsRepository.ts',
  'src/repositories/UserProfileRepository.ts',
];

let totalFixed = 0;

files.forEach((file) => {
  const filePath = path.join(__dirname, file);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Fix database imports: add .ts extension if missing
    content = content.replace(
      /from ['"]\.\.\/db\/database['"]/g,
      "from '../db/database.ts'"
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  Skipped (already fixed): ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with missing .ts extensions`);

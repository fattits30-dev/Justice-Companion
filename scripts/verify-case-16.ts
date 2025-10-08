/**
 * Verify Case #16 Exists
 *
 * Diagnostic script to check if the test case exists and verify the
 * case loading logic that the sidebar uses.
 *
 * Usage: node --loader ts-node/esm scripts/verify-case-16.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get database path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(
  process.env.APPDATA || 'C:\\Users\\sava6\\AppData\\Roaming',
  'justice-companion',
  'justice-companion.db'
);

console.log(`📂 Database: ${dbPath}\n`);

const db = new Database(dbPath);

// 1. Check if Case #16 exists
console.log('🔍 Checking for Case #16...');
const case16 = db.prepare('SELECT * FROM cases WHERE id = ?').get(16);

if (!case16) {
  console.log('❌ Case #16 NOT FOUND in database\n');
  console.log('💡 Run this to create it:');
  console.log('   node --loader ts-node/esm scripts/create-test-case-with-evidence.ts\n');
} else {
  console.log('✅ Case #16 EXISTS');
  console.log(`   Title: ${case16.title}`);
  console.log(`   Type: ${case16.case_type}`);
  console.log(`   Status: ${case16.status}`);
  console.log(`   Created: ${case16.created_at}\n`);
}

// 2. List ALL cases (simulate what sidebar does)
console.log('📋 All cases in database (what sidebar should show):');
const allCases = db.prepare('SELECT id, title, case_type, status, created_at FROM cases ORDER BY created_at DESC').all();

if (allCases.length === 0) {
  console.log('   ⚠️  No cases found!\n');
} else {
  console.log(`   Found ${allCases.length} case(s):\n`);
  allCases.forEach((c: any) => {
    console.log(`   • Case #${c.id}: ${c.title}`);
    console.log(`     Type: ${c.case_type} | Status: ${c.status}`);
    console.log(`     Created: ${c.created_at}\n`);
  });
}

// 3. Check evidence for Case #16
if (case16) {
  console.log('📄 Evidence for Case #16:');
  const evidence = db.prepare('SELECT id, title, evidence_type FROM evidence WHERE case_id = ?').all(16);

  if (evidence.length === 0) {
    console.log('   ⚠️  No evidence found for this case\n');
  } else {
    console.log(`   Found ${evidence.length} evidence item(s):\n`);
    evidence.forEach((e: any) => {
      console.log(`   • Evidence #${e.id}: ${e.title}`);
      console.log(`     Type: ${e.evidence_type}\n`);
    });
  }
}

db.close();

console.log('✅ Diagnostic complete');

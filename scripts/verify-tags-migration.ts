/**
 * Verify Tags Migration
 * Checks that the tags tables were created correctly
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'justice.db');
const db = new Database(dbPath);

console.log('Verifying tags migration...\n');

// Check tags table
const tagsTable = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name='tags'
`).get();

if (tagsTable) {
  console.log('✓ Tags table exists');

  // Get column info
  const columns = db.prepare('PRAGMA table_info(tags)').all();
  console.log('  Columns:', columns.map((c: any) => c.name).join(', '));
} else {
  console.log('✗ Tags table NOT found');
}

// Check evidence_tags table
const evidenceTagsTable = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name='evidence_tags'
`).get();

if (evidenceTagsTable) {
  console.log('✓ Evidence_tags table exists');

  // Get column info
  const columns = db.prepare('PRAGMA table_info(evidence_tags)').all();
  console.log('  Columns:', columns.map((c: any) => c.name).join(', '));
} else {
  console.log('✗ Evidence_tags table NOT found');
}

// Check indexes
const indexes = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='index' AND (
    name LIKE 'idx_tags%' OR
    name LIKE 'idx_evidence_tags%'
  )
`).all();

console.log('\n✓ Indexes created:', indexes.length);
indexes.forEach((idx: any) => {
  console.log('  -', idx.name);
});

db.close();

console.log('\n✅ Tags migration verification complete!');

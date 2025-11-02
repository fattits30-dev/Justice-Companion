/**
 * Database Schema Validation Script
 * Validates database schema against expected structure
 * Run: npx ts-node scripts/validate-database-schema.ts
 */

import { getDb } from '../src/db/database';

interface ValidationResult {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

function validate(category: string, check: boolean, passMsg: string, failMsg: string, details?: string): void {
  results.push({
    category,
    status: check ? 'PASS' : 'FAIL',
    message: check ? passMsg : failMsg,
    details,
  });
}

function warn(category: string, message: string, details?: string): void {
  results.push({
    category,
    status: 'WARN',
    message,
    details,
  });
}

function printResults(): void {
  console.warn('\n=== DATABASE SCHEMA VALIDATION REPORT ===\n');

  const categories = [...new Set(results.map((r) => r.category))];

  categories.forEach((category) => {
    console.warn(`\n${category}:`);
    const categoryResults = results.filter((r) => r.category === category);

    categoryResults.forEach((result) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.warn(`  ${icon} ${result.message}`);
      if (result.details) {
        console.warn(`     ${result.details}`);
      }
    });
  });

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const total = results.length;

  console.warn(`\n=== SUMMARY ===`);
  console.warn(`Total Checks: ${total}`);
  console.warn(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.warn(`Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
  console.warn(`Warnings: ${warned} (${((warned / total) * 100).toFixed(1)}%)`);

  if (failed === 0) {
    console.warn('\n🎉 ALL CRITICAL CHECKS PASSED!');
  } else {
    console.warn('\n⚠️ SOME CHECKS FAILED - Review DATABASE_AUDIT_REPORT.md for fixes');
  }

  console.warn('\n');
}

async function validateSchema(): Promise<void> {
  const db = getDb();

  // 1. Check all expected tables exist
  console.warn('Checking tables...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  const tableNames = tables.map((t) => t.name);

  const expectedTables = [
    'cases',
    'legal_items',
    'case_assignments',
    'users',
    'documents',
    'hearings',
    'courtrooms',
    'case_notes',
    'evidence',
    'witnesses',
    'charges',
    'sentences',
    'case_status_history'
  ];

  expectedTables.forEach((tableName) => {
    validate(
      'Tables',
      tableNames.includes(tableName),
      `Table '${tableName}' exists`,
      `Missing table: '${tableName}'`,
      `Expected table '${tableName}' not found in database`
    );
  });

  // 2. Validate specific table structures
  console.warn('Validating table structures...');

  // cases table
  const casesColumns = db.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string; type: string; notnull: number }>;
  const casesColumnNames = casesColumns.map((c) => c.name);
  
  validate(
    'Cases Table',
    casesColumnNames.includes('id') && casesColumnNames.includes('title') && casesColumnNames.includes('description'),
    'Cases table has required columns',
    'Cases table missing required columns',
    'Required columns: id, title, description'
  );

  // legal_items table
  const legalItemsColumns = db.prepare("PRAGMA table_info(legal_items)").all() as Array<{ name: string; type: string; notnull: number }>;
  const legalItemsColumnNames = legalItemsColumns.map((c) => c.name);
  
  validate(
    'Legal Items Table',
    legalItemsColumnNames.includes('id') && legalItemsColumnNames.includes('name') && legalItemsColumnNames.includes('type'),
    'Legal items table has required columns',
    'Legal items table missing required columns',
    'Required columns: id, name, type'
  );

  // 3. Check for indexes
  console.warn('Checking indexes...');
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
  const indexNames = indexes.map((i) => i.name);

  const expectedIndexes = [
    'idx_cases_title',
    'idx_cases_status',
    'idx_legal_items_name',
    'idx_case_assignments_case_id',
    'idx_case_assignments_user_id'
  ];

  expectedIndexes.forEach((indexName) => {
    validate(
      'Indexes',
      indexNames.includes(indexName),
      `Index '${indexName}' exists`,
      `Missing index: '${indexName}'`,
      `Expected index '${indexName}' not found in database`
    );
  });

  printResults();
}

validateSchema().catch((error) => {
  console.error('Error during schema validation:', error);
  process.exit(1);
});
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
    'legal_issues',
    'evidence',
    'timeline_events',
    'event_evidence',
    'actions',
    'notes',
    'chat_conversations',
    'chat_messages',
    'user_profile',
    'user_facts',
    'case_facts',
    'audit_logs',
    'encryption_metadata',
    'migrations',
  ];

  expectedTables.forEach((table) => {
    validate(
      'Tables',
      tableNames.includes(table),
      `Table '${table}' exists`,
      `Table '${table}' is MISSING`,
    );
  });

  // 2. Check evidence_type constraint
  console.warn('Checking constraints...');
  const evidenceSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='evidence'").get() as { sql: string } | undefined;

  if (!evidenceSchema) {
    validate(
      'Constraints',
      false,
      '',
      "evidence table does not exist - run migrations first",
    );
  } else {
    const hasWitnessType = evidenceSchema.sql.includes("'witness'");

    validate(
      'Constraints',
      hasWitnessType,
      "evidence_type constraint includes 'witness'",
      "evidence_type constraint MISSING 'witness' - see migration 006",
      'Fix: Run migration 006_fix_evidence_type_constraint.sql',
    );
  }

  // 3. Check indexes
  console.warn('Checking indexes...');
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
  const indexNames = indexes.map((i) => i.name);

  const requiredIndexes = [
    'idx_legal_issues_case_id',
    'idx_evidence_case_id',
    'idx_timeline_events_case_id',
    'idx_timeline_events_event_date',
    'idx_actions_case_id',
    'idx_actions_due_date',
    'idx_actions_status',
    'idx_notes_case_id',
    'idx_chat_conversations_case_id',
    'idx_chat_messages_conversation_id',
    'idx_user_facts_case_id',
    'idx_case_facts_case_id',
    'idx_audit_logs_timestamp',
    'idx_audit_logs_resource',
    'idx_audit_logs_event_type',
  ];

  requiredIndexes.forEach((index) => {
    validate(
      'Indexes (Required)',
      indexNames.includes(index),
      `Index '${index}' exists`,
      `Index '${index}' is MISSING`,
    );
  });

  // Performance indexes (P1 - recommended but not critical)
  const performanceIndexes = [
    'idx_cases_case_type',
    'idx_evidence_evidence_type',
    'idx_cases_status_updated_at',
    'idx_evidence_case_type',
  ];

  performanceIndexes.forEach((index) => {
    if (!indexNames.includes(index)) {
      warn(
        'Indexes (Performance)',
        `Performance index '${index}' is MISSING`,
        'Fix: Run migration 009_add_performance_indexes.sql',
      );
    } else {
      validate(
        'Indexes (Performance)',
        true,
        `Performance index '${index}' exists`,
        '',
      );
    }
  });

  // 4. Check triggers
  console.warn('Checking triggers...');
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as Array<{ name: string }>;
  const triggerNames = triggers.map((t) => t.name);

  const requiredTriggers = [
    'update_case_timestamp',
    'update_note_timestamp',
    'update_conversation_timestamp',
    'update_profile_timestamp',
    'increment_message_count',
    'update_user_facts_timestamp',
    'update_case_facts_timestamp',
  ];

  requiredTriggers.forEach((trigger) => {
    validate(
      'Triggers (Required)',
      triggerNames.includes(trigger),
      `Trigger '${trigger}' exists`,
      `Trigger '${trigger}' is MISSING`,
    );
  });

  // Check for missing triggers (P1)
  const missingTriggers = [
    'update_legal_issue_timestamp',
    'update_timeline_event_timestamp',
  ];

  missingTriggers.forEach((trigger) => {
    if (!triggerNames.includes(trigger)) {
      warn(
        'Triggers (Missing)',
        `Trigger '${trigger}' is MISSING`,
        'Fix: Run migration 007_add_missing_updated_at_triggers.sql',
      );
    } else {
      validate(
        'Triggers (Missing)',
        true,
        `Trigger '${trigger}' exists`,
        '',
      );
    }
  });

  // 5. Check columns for updated_at
  console.warn('Checking columns...');
  const legalIssuesColumns = db.prepare("PRAGMA table_info(legal_issues)").all() as Array<{ name: string }>;
  const legalIssuesHasUpdatedAt = legalIssuesColumns.some((c) => c.name === 'updated_at');

  if (!legalIssuesHasUpdatedAt) {
    warn(
      'Columns',
      "legal_issues table MISSING 'updated_at' column",
      'Fix: Run migration 008_add_updated_at_columns.sql',
    );
  } else {
    validate(
      'Columns',
      true,
      "legal_issues table has 'updated_at' column",
      '',
    );
  }

  const timelineEventsColumns = db.prepare("PRAGMA table_info(timeline_events)").all() as Array<{ name: string }>;
  const timelineEventsHasUpdatedAt = timelineEventsColumns.some((c) => c.name === 'updated_at');

  if (!timelineEventsHasUpdatedAt) {
    warn(
      'Columns',
      "timeline_events table MISSING 'updated_at' column",
      'Fix: Run migration 008_add_updated_at_columns.sql',
    );
  } else {
    validate(
      'Columns',
      true,
      "timeline_events table has 'updated_at' column",
      '',
    );
  }

  // 6. Check encryption_metadata
  console.warn('Checking encryption metadata...');

  let encryptionMetadata: Array<{ table_name: string; column_name: string }> = [];

  try {
    encryptionMetadata = db.prepare("SELECT table_name, column_name FROM encryption_metadata").all() as Array<{
      table_name: string;
      column_name: string;
    }>;
  } catch (_error) {
    warn(
      'Encryption Metadata',
      'encryption_metadata table does not exist - run migrations first',
    );
  }

  const expectedEncryptedFields = [
    { table: 'cases', column: 'description' },
    { table: 'evidence', column: 'content' },
    { table: 'notes', column: 'content' },
    { table: 'chat_messages', column: 'content' },
    { table: 'chat_messages', column: 'thinking_content' },
    { table: 'user_profile', column: 'email' },
    { table: 'user_profile', column: 'name' },
    { table: 'legal_issues', column: 'description' },
    { table: 'timeline_events', column: 'description' },
    { table: 'user_facts', column: 'fact_content' },
    { table: 'case_facts', column: 'fact_content' },
  ];

  if (encryptionMetadata.length > 0) {
    expectedEncryptedFields.forEach(({ table, column }) => {
      const exists = encryptionMetadata.some((m) => m.table_name === table && m.column_name === column);
      validate(
        'Encryption Metadata',
        exists,
        `Encrypted field '${table}.${column}' is documented`,
        `Encrypted field '${table}.${column}' is NOT documented`,
      );
    });

    validate(
      'Encryption Coverage',
      encryptionMetadata.length === 11,
      `All 11 encrypted fields documented (found ${encryptionMetadata.length})`,
      `Expected 11 encrypted fields, found ${encryptionMetadata.length}`,
    );
  }

  // 7. Check migrations table
  console.warn('Checking migrations...');

  let migrations: Array<{ name: string; status: string }> = [];

  try {
    migrations = db.prepare("SELECT name, status FROM migrations WHERE status = 'applied' ORDER BY id ASC").all() as Array<{
      name: string;
      status: string;
    }>;

    validate(
      'Migrations',
      migrations.length >= 5,
      `${migrations.length} migrations applied`,
      `Only ${migrations.length} migrations applied (expected at least 5)`,
    );

    migrations.forEach((m) => {
      validate(
        'Migrations',
        m.status === 'applied',
        `Migration '${m.name}' status: ${m.status}`,
        `Migration '${m.name}' status: ${m.status}`,
      );
    });
  } catch (_error) {
    warn(
      'Migrations',
      'migrations table does not exist - run migrations first',
    );
  }

  // 8. Check repository coverage
  console.warn('Checking repository coverage...');
  warn(
    'Repository Coverage',
    'ActionRepository is MISSING (actions table has no repository)',
    'Fix: Implement ActionRepository (see DATABASE_AUDIT_REPORT.md Section 4.6)',
  );

  // 9. Check junction table usage
  console.warn('Checking junction tables...');
  warn(
    'Junction Tables',
    'event_evidence table has NO repository methods',
    'Fix: Add methods to TimelineRepository (see DATABASE_AUDIT_REPORT.md Section 4.7)',
  );

  // Print final report
  printResults();
}

// Run validation
validateSchema().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});

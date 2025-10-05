# Migration System Guide
**Justice Companion - Database Migration Management**
**Version**: Phase 4 Complete
**Last Updated**: 2025-10-05

---

## Overview

Justice Companion uses a comprehensive migration system with rollback support, checksum verification, and automatic backup creation. This guide covers everything you need to know about creating, applying, and rolling back database migrations.

---

## Architecture

### Migration File Format

Migrations use SQL files with `-- UP` and `-- DOWN` markers:

```sql
-- Migration NNN: Description of migration
-- Created: YYYY-MM-DD
-- Author: Agent Hotel / Developer Name

-- UP
CREATE TABLE example (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO example (name) VALUES ('Initial data');

-- DOWN
DROP TABLE IF EXISTS example;
```

### Migration Table Schema

```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,          -- SHA-256 of migration file
  applied_at TEXT NOT NULL,        -- Timestamp of application
  applied_by TEXT,                 -- Optional: user/process
  duration_ms INTEGER,             -- Execution time in milliseconds
  status TEXT NOT NULL             -- 'applied', 'rolled_back', 'failed'
    CHECK(status IN ('applied', 'rolled_back', 'failed'))
);
```

---

## Creating Migrations

### Manual Creation

1. **File naming convention**: `NNN_descriptive_name.sql`
   - `NNN`: Sequential 3-digit number (001, 002, 003, ...)
   - Use underscores for spaces
   - Be descriptive but concise

2. **Template structure**:

```sql
-- Migration NNN: [CLEAR DESCRIPTION]
-- Created: [DATE]
-- Author: [NAME]

-- UP
-- Write forward migration SQL here
-- Use transactions where appropriate
-- Include comments for complex operations


-- DOWN
-- Write rollback SQL here
-- Must reverse all UP changes
-- Order matters: reverse order of UP operations

```

### Example: Adding a Column

```sql
-- Migration 005: Add phone_number to user_profile
-- Created: 2025-10-05
-- Author: Development Team

-- UP
ALTER TABLE user_profile ADD COLUMN phone_number TEXT;

-- Create index if needed
CREATE INDEX IF NOT EXISTS idx_user_profile_phone
  ON user_profile(phone_number);

-- DOWN
-- SQLite doesn't support DROP COLUMN, so we recreate the table
CREATE TABLE user_profile_backup AS SELECT id, name, email, avatar_url, created_at, updated_at FROM user_profile;
DROP TABLE user_profile;
ALTER TABLE user_profile_backup RENAME TO user_profile;
```

### Example: Adding a New Table

```sql
-- Migration 006: Add user_preferences table
-- Created: 2025-10-05
-- Author: Development Team

-- UP
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
  language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'es', 'fr')),
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);

-- Insert default preferences
INSERT INTO user_preferences (user_id) VALUES (1);

-- DOWN
DROP TABLE IF EXISTS user_preferences;
DROP INDEX IF EXISTS idx_user_preferences_user_id;
```

---

## Applying Migrations

### Automatic Application (Recommended)

Migrations run automatically when the application starts:

```typescript
// In electron/main.ts or src/db/database.ts
import { runMigrations } from './db/migrate';

runMigrations();
```

### Manual Application

```typescript
import { runMigrations, getMigrationStatus } from './db/migrate';

// Check what will be applied
const status = getMigrationStatus();
console.log('Pending migrations:', status.pending);

// Apply all pending migrations
runMigrations();
```

### What Happens During Application

1. **Pre-check**: System verifies migrations table exists
2. **Discovery**: Scans `src/db/migrations/` for `.sql` files
3. **Filtering**: Identifies migrations not yet applied
4. **Checksum**: Calculates SHA-256 hash of each pending migration
5. **Execution**: Runs UP section in a transaction
6. **Recording**: Inserts migration record with checksum and duration
7. **Verification**: Checks existing migrations for tampering

---

## Rolling Back Migrations

### Single Migration Rollback

```typescript
import { rollbackMigration } from './db/migrate';

rollbackMigration('004_encryption_expansion.sql');
```

### What Happens During Rollback

1. **Verification**: Checks migration is currently applied
2. **File Check**: Verifies migration file exists
3. **DOWN Section**: Parses and validates DOWN SQL
4. **Backup**: Recommends creating backup first (manual step)
5. **Execution**: Runs DOWN section in a transaction
6. **Status Update**: Marks migration as 'rolled_back'

### Rollback Best Practices

1. **Always backup before rollback**:
   ```typescript
   import { createBackup } from './db/backup';

   createBackup('pre_rollback_004');
   rollbackMigration('004_encryption_expansion.sql');
   ```

2. **Test rollbacks on dev database first**
3. **Document why rollback was necessary**
4. **Verify data integrity after rollback**
5. **Consider data loss implications**

---

## Backup System Integration

### Auto-Backup Before Migrations

```typescript
import { runMigrations } from './db/migrate';
import { createPreMigrationBackup } from './db/backup';

// Create backup before applying migrations
createPreMigrationBackup();
runMigrations();
```

### Manual Backup Operations

```typescript
import { createBackup, restoreBackup, listBackups, deleteBackup } from './db/backup';

// Create backup with custom name
const backup = createBackup('before_major_update');
console.log(`Backup created: ${backup.filename} (${backup.size} bytes)`);

// List all backups
const backups = listBackups();
backups.forEach((b) => {
  console.log(`${b.filename} - ${b.created_at} - ${b.size} bytes`);
});

// Restore from backup
restoreBackup('justice_backup_2025-10-05T12-30-00.db');

// Delete old backup
deleteBackup('justice_backup_2025-09-01T10-00-00.db');
```

---

## Migration Status Checking

### Get Migration Status

```typescript
import { getMigrationStatus } from './db/migrate';

const status = getMigrationStatus();

console.log('Applied migrations:');
status.applied.forEach((m) => {
  console.log(`  ${m.name} - ${m.applied_at} (${m.duration_ms}ms)`);
});

console.log('\nPending migrations:');
status.pending.forEach((name) => {
  console.log(`  ${name}`);
});

console.log('\nRolled back migrations:');
status.rolledBack.forEach((m) => {
  console.log(`  ${m.name} - ${m.applied_at}`);
});
```

---

## Validation

### Validate Migration Format

```typescript
import { validateMigration } from './db/migrate';

const result = validateMigration('005_add_preferences.sql');

if (!result.valid) {
  console.error('Migration validation errors:');
  result.errors.forEach((err) => console.error(`  - ${err}`));
} else {
  console.log('Migration is valid!');
}
```

### Common Validation Errors

- Missing UP section
- Missing DOWN section (prevents rollback)
- No SQL statements in UP section
- File does not exist
- Invalid SQL syntax (detected at runtime)

---

## Best Practices

### 1. Migration Design

- **One logical change per migration**: Don't combine unrelated changes
- **Idempotent operations**: Use `IF NOT EXISTS` / `IF EXISTS` where possible
- **Test on sample data**: Always test with realistic data volume
- **Document breaking changes**: Note in migration comments if breaking
- **Consider performance**: Index creation on large tables may take time

### 2. Rollback Safety

- **Always include DOWN section**: Even if "this will never be rolled back"
- **Reverse order in DOWN**: Undo operations in reverse order of UP
- **Handle data loss**: Document if DOWN section loses data
- **Test rollback on dev**: Verify UP → DOWN → UP cycle works

### 3. Data Migrations

For data transformations (e.g., encryption Phase 3):

```sql
-- Migration: Encrypt existing plaintext data

-- UP
UPDATE notes SET content = encrypt_field(content) WHERE content IS NOT NULL;

-- DOWN
-- WARNING: This loses encrypted data!
-- Only rollback if migration just applied and original data still available
UPDATE notes SET content = decrypt_field(content) WHERE content IS NOT NULL;
```

Document data loss risks prominently!

### 4. Schema Changes

SQLite limitations:
- **Cannot DROP COLUMN**: Must recreate table
- **Cannot MODIFY COLUMN**: Must recreate table
- **Cannot ADD CONSTRAINT**: Must recreate table (except NOT NULL)

Table recreation pattern:

```sql
-- UP
BEGIN TRANSACTION;

-- 1. Create new table with desired schema
CREATE TABLE new_table (...);

-- 2. Copy data from old table
INSERT INTO new_table SELECT ... FROM old_table;

-- 3. Drop old table
DROP TABLE old_table;

-- 4. Rename new table
ALTER TABLE new_table RENAME TO old_table;

-- 5. Recreate indexes
CREATE INDEX ...;

COMMIT;

-- DOWN
-- (Reverse the process)
```

---

## Troubleshooting

### Migration Failed Mid-Execution

**Symptom**: Migration marked as 'failed' in migrations table

**Solution**:
1. Check error logs for failure reason
2. Fix the migration SQL
3. Manually mark as 'rolled_back' in database
4. Re-run migrations

```sql
-- Manual recovery
UPDATE migrations SET status = 'rolled_back' WHERE name = 'failed_migration.sql';
```

### Checksum Mismatch Warning

**Symptom**: WARNING: Migration X has been modified after being applied!

**Cause**: Migration file changed after application

**Solutions**:
- **If intentional**: Update checksum in database (advanced)
- **If accidental**: Revert file to original content
- **If unclear**: Investigate git history for changes

```sql
-- Update checksum (DANGEROUS - only if you know what you're doing)
UPDATE migrations
SET checksum = 'new_checksum_here'
WHERE name = 'migration.sql';
```

### Rollback Fails

**Common causes**:
1. DOWN section has errors
2. Data dependencies prevent rollback
3. File deleted after migration applied

**Solutions**:
- Review DOWN SQL syntax
- Check foreign key constraints
- Manually write recovery SQL if needed

---

## Phase 4 Enhancements Summary

### New Features

1. **Rollback Support**: Full DOWN section parsing and execution
2. **Checksum Verification**: SHA-256 hashing prevents tampering
3. **Performance Tracking**: Duration measurement for each migration
4. **Status Management**: Track applied/rolled_back/failed states
5. **Validation**: Pre-flight checks for migration format
6. **Backup Integration**: Auto-backup before migrations

### Migration Table Upgrade

Existing migrations table will auto-upgrade on first Phase 4 migration run. Old migrations will have NULL checksum and duration (acceptable).

---

## Future Enhancements

Planned for post-Phase 4:

1. **Migration Dependencies**: Declare required prior migrations
2. **Data Validation Hooks**: Run tests after migration
3. **Dry-Run Mode**: Preview changes without applying
4. **Migration Branching**: Handle merge conflicts in migration order
5. **Schema Snapshot**: Export current schema for comparison
6. **Migration Squashing**: Combine multiple migrations into one

---

## Examples Gallery

### Example 1: Add Email Verification

```sql
-- Migration 007: Add email verification to user_profile
-- Created: 2025-10-06

-- UP
ALTER TABLE user_profile ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profile ADD COLUMN verification_token TEXT;
ALTER TABLE user_profile ADD COLUMN verification_sent_at TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profile_verification_token
  ON user_profile(verification_token);

-- DOWN
-- Recreate table without new columns
CREATE TABLE user_profile_backup AS
  SELECT id, name, email, avatar_url, created_at, updated_at
  FROM user_profile;

DROP TABLE user_profile;
ALTER TABLE user_profile_backup RENAME TO user_profile;
```

### Example 2: Add Full-Text Search

```sql
-- Migration 008: Add FTS5 table for case search
-- Created: 2025-10-07

-- UP
-- Create FTS5 virtual table
CREATE VIRTUAL TABLE cases_fts USING fts5(
  title,
  case_type,
  content='cases',
  content_rowid='id'
);

-- Populate FTS table
INSERT INTO cases_fts(rowid, title, case_type)
  SELECT id, title, case_type FROM cases;

-- Create triggers to keep FTS in sync
CREATE TRIGGER cases_fts_insert AFTER INSERT ON cases BEGIN
  INSERT INTO cases_fts(rowid, title, case_type)
    VALUES (new.id, new.title, new.case_type);
END;

CREATE TRIGGER cases_fts_delete AFTER DELETE ON cases BEGIN
  DELETE FROM cases_fts WHERE rowid = old.id;
END;

CREATE TRIGGER cases_fts_update AFTER UPDATE ON cases BEGIN
  UPDATE cases_fts
    SET title = new.title, case_type = new.case_type
    WHERE rowid = new.id;
END;

-- DOWN
DROP TRIGGER IF EXISTS cases_fts_insert;
DROP TRIGGER IF EXISTS cases_fts_delete;
DROP TRIGGER IF EXISTS cases_fts_update;
DROP TABLE IF EXISTS cases_fts;
```

---

## Appendix: SQL Best Practices

### Transactions

Always use transactions for multi-step migrations:

```sql
-- UP
BEGIN TRANSACTION;

CREATE TABLE step1 (...);
INSERT INTO step1 VALUES (...);
CREATE INDEX ...;

COMMIT;
```

If any step fails, entire transaction rolls back automatically.

### Foreign Keys

Remember to enable foreign keys in database connection:

```sql
PRAGMA foreign_keys = ON;
```

Use appropriate ON DELETE / ON UPDATE clauses:

```sql
FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
```

### Indexes

Create indexes for:
- Foreign key columns
- Columns used in WHERE clauses
- Columns used in ORDER BY
- Columns used in JOINs

Don't over-index (slows INSERT/UPDATE).

---

**Document Version**: 1.0
**Author**: Agent Hotel (Database & Migration Specialist)
**Status**: Production Ready
**Next Review**: Post-Phase 4 User Feedback

---
name: database-migration
description: "Database migration management for Justice Companion using Drizzle ORM: creates migrations, handles rollbacks, validates schema changes, and manages encryption on 11 fields. Use when modifying database schema, adding tables, or troubleshooting migration errors."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "mcp__memory__*"]
---

# Database Migration Skill

## Purpose
Safe database schema management with Drizzle ORM for Justice Companion's encrypted SQLite database.

## When Claude Uses This
- User requests database schema changes ("add a column", "create a table")
- Migration errors occur
- User asks "how do I migrate the database?"
- Before modifying `src/db/schema.ts`

## Critical Constraints

### Encryption Fields (11 Total)
These fields MUST use EncryptionService:
1. `users.email`
2. `users.full_name`
3. `cases.title`
4. `cases.description`
5. `evidence.file_path`
6. `evidence.notes`
7. `chat_conversations.message_content`
8. `documents.file_path`
9. `contacts.email`
10. `contacts.phone_number`
11. `contacts.address`

**Rule:** If adding columns to these tables, determine if encryption is needed.

### Migration Safety
- ✅ Always create backup before migration
- ✅ Test on in-memory database first
- ✅ Use transactions (all-or-nothing)
- ❌ Never delete production data without user confirmation

## Workflow

### 1. Schema Change
```typescript
// Edit src/db/schema.ts
import { text, integer } from 'drizzle-orm/sqlite-core';

export const cases = sqliteTable('cases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(), // ENCRYPTED via EncryptionService
  // Add new column:
  case_number: text('case_number'),
});
```

### 2. Generate Migration
```bash
pnpm db:generate
# Creates: src/db/migrations/0001_add_case_number.sql
```

### 3. Review Migration SQL
```sql
-- Check generated SQL for safety
ALTER TABLE cases ADD COLUMN case_number TEXT;
```

### 4. Test Migration
```bash
# Run in test environment first
pnpm test src/db/database.test.ts
```

### 5. Apply Migration
```bash
pnpm db:migrate
# Automatic backup created before migration
```

### 6. Rollback (If Needed)
```bash
pnpm db:migrate:rollback
# Reverts last migration
```

## Common Scenarios

### Adding a New Table
```typescript
// 1. Define schema in src/db/schema.ts
export const legal_documents = sqliteTable('legal_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  case_id: integer('case_id').references(() => cases.id),
  document_type: text('document_type').notNull(),
  file_path: text('file_path').notNull(), // ENCRYPT THIS
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 2. If file_path needs encryption, update EncryptionService
// 3. Generate migration: pnpm db:generate
// 4. Apply: pnpm db:migrate
```

### Adding Encrypted Column
```typescript
// 1. Add column to schema
export const contacts = sqliteTable('contacts', {
  // ... existing fields
  address: text('address'), // NEW - needs encryption
});

// 2. Update EncryptionService to handle contacts.address
// src/services/EncryptionService.ts:
async encryptField(tableName: string, fieldName: string, value: string) {
  if (tableName === 'contacts' && fieldName === 'address') {
    return this.encrypt(value);
  }
  // ... existing encryption logic
}

// 3. Generate migration: pnpm db:generate
// 4. Migrate existing data:
//    - Read all contacts
//    - Encrypt address field
//    - Update records
// 5. Apply migration: pnpm db:migrate
```

### Foreign Key Changes
```typescript
// DANGER: Changing foreign keys requires careful migration

// Step 1: Create new table with correct FK
// Step 2: Copy data from old table
// Step 3: Drop old table
// Step 4: Rename new table

// Example migration SQL:
CREATE TABLE cases_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NEW FK
  title TEXT NOT NULL
);

INSERT INTO cases_new SELECT * FROM cases;
DROP TABLE cases;
ALTER TABLE cases_new RENAME TO cases;
```

## Troubleshooting

### Migration Failed
```bash
# 1. Check migration status
pnpm db:migrate:status

# 2. Rollback failed migration
pnpm db:migrate:rollback

# 3. Fix schema.ts or migration SQL
# 4. Re-run: pnpm db:generate && pnpm db:migrate
```

### Encryption Service Not Working
```typescript
// Verify EncryptionService handles new field
const service = new EncryptionService(encryptionKey);

// Test encryption
const encrypted = await service.encryptField('contacts', 'address', 'test');
const decrypted = await service.decryptField('contacts', 'address', encrypted);

console.assert(decrypted === 'test', 'Encryption failed');
```

### Foreign Key Violation
```sql
-- Check existing data before adding FK
SELECT cases.* FROM cases
LEFT JOIN users ON cases.user_id = users.id
WHERE users.id IS NULL;

-- If rows exist, fix orphaned records first:
DELETE FROM cases WHERE user_id NOT IN (SELECT id FROM users);
```

## Best Practices

### Before Migration
- [ ] Backup database: `pnpm db:backup`
- [ ] Review generated SQL in `src/db/migrations/`
- [ ] Test on in-memory database
- [ ] Check for data loss scenarios

### After Migration
- [ ] Verify migration applied: `pnpm db:migrate:status`
- [ ] Test encrypted fields still encrypt/decrypt
- [ ] Run full test suite: `pnpm test`
- [ ] Check audit logs for migration events

### Encryption Guidelines
1. **Always encrypt PII** (names, emails, addresses, phone numbers)
2. **Never encrypt foreign keys** (breaks referential integrity)
3. **Never encrypt primary keys** (breaks auto-increment)
4. **Test encryption before migration** (avoid data corruption)

## Example: Adding Case Priority

### Schema Change
```typescript
// src/db/schema.ts
export const cases = sqliteTable('cases', {
  // ... existing fields
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
    .default('medium'),
});
```

### Generate Migration
```bash
pnpm db:generate
# Creates: src/db/migrations/0012_add_case_priority.sql
```

### Review Generated SQL
```sql
-- src/db/migrations/0012_add_case_priority.sql
ALTER TABLE cases ADD COLUMN priority TEXT DEFAULT 'medium';
```

### Apply Migration
```bash
# Automatic backup created
pnpm db:migrate

# Output:
# ✓ Backup created: justice-companion-backup-20251021-143022.db
# ✓ Migration 0012_add_case_priority.sql applied
```

### Verify
```bash
# Check migration status
pnpm db:migrate:status

# Test in code
pnpm test src/repositories/CaseRepository.test.ts
```

## Migration History

Track all migrations in `mcp__memory`:
```typescript
// After successful migration
user: "Remember that we added case_priority field with enum values"
// Claude stores in memory for future reference
```

## Emergency Rollback

```bash
# If migration breaks production:
1. Stop application
2. pnpm db:migrate:rollback
3. Restore from backup: pnpm db:backup:restore <backup-file>
4. Investigate issue
5. Fix and retry
```

## References

- Schema: `src/db/schema.ts`
- Migrations: `src/db/migrations/`
- Migration Runner: `src/db/migrate.ts`
- Encryption: `src/services/EncryptionService.ts`
- Tests: `src/db/database.test.ts`

---

**Golden Rule:** Test migrations on in-memory database before applying to production. ALWAYS backup first.

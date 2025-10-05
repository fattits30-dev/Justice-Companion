# Audit Logs - Quick Reference Card

## File Location
```
src/db/migrations/003_audit_logs.sql
```

## Table Name
```sql
audit_logs
```

## Required Fields (Minimum Insert)
```typescript
{
  id: string;                    // UUID v4
  timestamp: string;             // new Date().toISOString()
  event_type: string;            // e.g., 'case.create', 'evidence.decrypt'
  resource_type: string;         // 'case', 'evidence', etc.
  resource_id: string;           // ID of affected resource
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'decrypt';
  integrity_hash: string;        // SHA-256 hex (64 chars)
  previous_log_hash: string | null;  // null for first log
}
```

## Optional Fields
```typescript
{
  user_id?: string | null;       // Future use
  details?: string | null;       // JSON string
  ip_address?: string | null;
  user_agent?: string | null;
  success?: 0 | 1;               // Default: 1
  error_message?: string | null;
  created_at?: string;           // Auto-set by DB
}
```

## Insert Example
```typescript
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Get previous hash
const prev = db
  .prepare('SELECT integrity_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1')
  .get();

// Create log entry
const log = {
  id: uuidv4(),
  timestamp: new Date().toISOString(),
  event_type: 'case.create',
  resource_type: 'case',
  resource_id: '123',
  action: 'create',
  details: JSON.stringify({ title: 'New Case' }),
  success: 1,
  previous_log_hash: prev?.integrity_hash || null,
};

// Calculate hash
const hashData = JSON.stringify(log);
log.integrity_hash = crypto.createHash('sha256').update(hashData).digest('hex');

// Insert
db.prepare(`
  INSERT INTO audit_logs (
    id, timestamp, event_type, resource_type, resource_id,
    action, details, success, integrity_hash, previous_log_hash
  ) VALUES (@id, @timestamp, @event_type, @resource_type, @resource_id,
    @action, @details, @success, @integrity_hash, @previous_log_hash)
`).run(log);
```

## Query Examples

### Get all logs for a resource
```sql
SELECT * FROM audit_logs
WHERE resource_type = 'case' AND resource_id = '123'
ORDER BY timestamp ASC;
```

### Get recent decryptions
```sql
SELECT * FROM audit_logs
WHERE action = 'decrypt'
  AND timestamp > datetime('now', '-24 hours')
ORDER BY timestamp DESC;
```

### Get failed operations
```sql
SELECT * FROM audit_logs
WHERE success = 0
ORDER BY timestamp DESC
LIMIT 50;
```

### Verify chain integrity
```sql
SELECT
  a.id,
  a.timestamp,
  a.previous_log_hash,
  b.integrity_hash as expected_previous_hash,
  CASE
    WHEN a.previous_log_hash = b.integrity_hash THEN 'OK'
    WHEN a.previous_log_hash IS NULL AND b.id IS NULL THEN 'OK (first log)'
    ELSE 'BROKEN!'
  END as chain_status
FROM audit_logs a
LEFT JOIN audit_logs b ON b.timestamp = (
  SELECT MAX(timestamp)
  FROM audit_logs
  WHERE timestamp < a.timestamp
)
ORDER BY a.timestamp ASC;
```

## Indexes Available

| Index | Columns | Use For |
|-------|---------|---------|
| `idx_audit_logs_timestamp` | timestamp | Date range queries |
| `idx_audit_logs_resource` | resource_type, resource_id | Resource audit trails |
| `idx_audit_logs_event_type` | event_type | Event filtering |
| `idx_audit_logs_user_id` | user_id (partial) | User activity |
| `idx_audit_logs_chain` | timestamp, id | Chain verification |

## Event Types (Recommended Convention)

```
{resource}.{action}

Examples:
- case.create
- case.update
- case.delete
- evidence.create
- evidence.decrypt
- evidence.export
- document.upload
- document.delete
```

## Success Codes

```
1 = Success
0 = Failure (see error_message field)
```

## Allowed Actions

```
'create'  - Resource created
'read'    - Resource accessed/viewed
'update'  - Resource modified
'delete'  - Resource removed
'export'  - Resource exported/downloaded
'decrypt' - Encrypted resource decrypted
```

## Important Notes

1. **INSERT ONLY** - Never UPDATE or DELETE audit logs
2. **Chain order** - Always get previous hash before inserting
3. **Hash calculation** - Include previous_log_hash in hash calculation
4. **Timestamps** - Use ISO 8601 format with milliseconds
5. **Details** - Store as JSON string, not object
6. **Concurrency** - Use transactions when inserting to prevent race conditions

## Migration Status

Check if migration has been applied:
```sql
SELECT * FROM migrations WHERE name = '003_audit_logs.sql';
```

Apply pending migrations:
```typescript
import { runMigrations } from './db/migrate';
runMigrations();
```

## See Also

- Full documentation: `AUDIT_LOGS_MIGRATION_SUMMARY.md`
- Schema diagram: `AUDIT_LOGS_SCHEMA.txt`

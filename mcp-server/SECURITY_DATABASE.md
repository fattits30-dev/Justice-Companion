# Database Tools Security

This document outlines the security measures implemented in the database tools for the MCP server to protect against SQL injection, data corruption, and unauthorized access.

---

## SQL Injection Prevention

The `database:query` tool implements **multiple layers of protection** to prevent SQL injection attacks:

### Layer 1: Whitelist Approach (Tool Level)
Only SELECT statements are allowed. The tool validates that queries start with "SELECT" (case-insensitive):

```typescript
if (!sql.toUpperCase().startsWith("SELECT")) {
  throw new Error("Only SELECT queries are allowed...");
}
```

### Layer 2: Keyword Blacklist (Tool Level)
Additional validation rejects queries containing dangerous keywords:

**Blocked Keywords:**
- `DROP` - Prevents table/database deletion
- `DELETE` - Prevents row deletion
- `UPDATE` - Prevents data modification
- `INSERT` - Prevents data insertion
- `ALTER` - Prevents schema changes
- `CREATE` - Prevents object creation
- `TRUNCATE` - Prevents table clearing
- `EXEC` / `EXECUTE` - Prevents stored procedure execution

**Example Rejection:**
```sql
-- This will be REJECTED:
SELECT * FROM cases; DROP TABLE cases;

-- Error: Query contains dangerous keyword 'DROP'
```

### Layer 3: Server-Side Validation (IPC Handler)
The Electron IPC handler (`dev-api:database:query`) also validates queries before execution:

```typescript
if (!sql.trim().toUpperCase().startsWith("SELECT")) {
  throw new Error("Only SELECT queries allowed via dev API");
}
```

This **defense-in-depth** approach ensures that even if one layer fails, others will catch malicious queries.

---

## Why No Write Operations?

Write operations (INSERT, UPDATE, DELETE) are **intentionally excluded** from the dev API for multiple reasons:

### 1. Prevents Accidental Data Corruption
- Claude could accidentally modify production data
- No risk of breaking referential integrity
- Reduces testing complexity

### 2. Forces Use of Proper Application Logic
- Case creation should go through `CaseService.createCase()`
- Ensures validation, business rules, and audit trails
- Maintains data consistency

### 3. Reduces Attack Surface
- Limits potential damage from compromised MCP server
- Prevents unauthorized data modification
- Simplifies security model

### 4. Schema Changes Via Migrations
- Schema changes should use `database:migrate` tool
- Ensures migrations are tracked and versioned
- Prevents ad-hoc schema modifications

---

## Path Traversal Prevention

The `database:backup` tool validates file paths to prevent directory traversal attacks:

### Validation Rules

1. **Reject ".." in paths**
   ```typescript
   if (path.includes("..")) {
     throw new Error("Directory traversal not allowed");
   }
   ```

   **Example Attack (Blocked):**
   ```
   Input: ../../../etc/passwd.db
   Result: ERROR - Directory traversal not allowed
   ```

2. **Enforce .db or .sqlite Extension**
   ```typescript
   if (!path.endsWith(".db") && !path.endsWith(".sqlite")) {
     throw new Error("Backup must have .db or .sqlite extension");
   }
   ```

   **Example Attack (Blocked):**
   ```
   Input: ./backups/secrets.txt
   Result: ERROR - Backup must have .db or .sqlite extension
   ```

3. **Server-Side Absolute Path Resolution**
   The IPC handler should convert paths to absolute paths and validate they're within allowed directories:

   ```typescript
   const absolutePath = resolve(backupPath);
   // Additional validation: ensure path is within allowed directory
   ```

---

## Query Result Limits

To prevent memory exhaustion and performance issues:

### Recommended Limits (IPC Handler)
```typescript
const MAX_ROWS = 1000;

const rows = db.prepare(sql).all();
if (rows.length > MAX_ROWS) {
  return rows.slice(0, MAX_ROWS);
}
```

### Query Timeout
Consider adding query timeout to prevent long-running queries:

```typescript
db.prepare(sql).timeout(5000); // 5 second timeout
```

---

## Rate Limiting (Future Enhancement)

### Recommended Implementation
```typescript
const queryRateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limit = queryRateLimiter.get(clientId);

  if (!limit || now > limit.resetTime) {
    // Reset limit every minute
    queryRateLimiter.set(clientId, {
      count: 1,
      resetTime: now + 60000
    });
    return true;
  }

  if (limit.count >= 100) {
    throw new Error('Rate limit exceeded: max 100 queries per minute');
  }

  limit.count++;
  return true;
}
```

**Configuration:**
- Max 100 queries per minute per client
- 1-minute rolling window
- Returns 429 status on limit exceeded

---

## Audit Logging

### Recommended Implementation
All database operations should be logged for security audit:

```typescript
ipcMain.handle('dev-api:database:query', async (_, sql: string) => {
  // Log query attempt
  errorLogger.logError('Database query via MCP', {
    type: 'info',
    sql: sql.substring(0, 200), // Log first 200 chars
    timestamp: new Date().toISOString(),
    source: 'mcp-server'
  });

  // Execute query...
});
```

**Log Contents:**
- Timestamp
- SQL query (truncated)
- Result row count
- Execution time
- Error status

---

## Migration Safety

The `database:migrate` tool includes safety measures:

### 1. Idempotency
Migrations can be run multiple times safely:

```typescript
// Migrations track which versions have been applied
db.prepare('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)').run();
```

### 2. Transaction Wrapping
Each migration runs in a transaction:

```typescript
db.transaction(() => {
  // Apply migration
  // If any step fails, entire migration is rolled back
})();
```

### 3. Version Validation
Migrations are applied in order and cannot be skipped:

```typescript
if (targetVersion < currentVersion) {
  throw new Error('Cannot downgrade database version');
}
```

---

## Backup Safety

The `database:backup` tool uses SQLite's built-in backup API:

### Benefits
1. **Online Backup** - Database remains accessible during backup
2. **Consistent Snapshot** - Backup is transactionally consistent
3. **No Lock Contention** - Minimal impact on app performance

### Implementation
```typescript
const db = databaseManager.getDatabase();
const backupDb = new Database(path);
await db.backup(backupDb); // SQLite online backup
backupDb.close();
```

---

## Security Checklist

Before deploying database tools to production:

- [ ] Verify SELECT-only validation in both tool and IPC handler
- [ ] Test SQL injection prevention with malicious queries
- [ ] Validate path traversal prevention with "../" attacks
- [ ] Implement query result size limits (1000 rows max)
- [ ] Implement query timeout (5 seconds max)
- [ ] Add rate limiting (100 queries/min)
- [ ] Enable audit logging for all operations
- [ ] Test backup path validation
- [ ] Verify migrations are idempotent
- [ ] Document allowed backup directories

---

## Example Attack Scenarios

### Scenario 1: SQL Injection via Stacked Queries
**Attack:**
```sql
SELECT * FROM cases; DROP TABLE users;
```

**Result:** ✅ BLOCKED
- Reason: Contains "DROP" keyword
- Blocked by: Layer 2 keyword blacklist

---

### Scenario 2: UPDATE Disguised as SELECT
**Attack:**
```sql
SELECT * FROM cases WHERE id = (UPDATE cases SET status = 'closed' RETURNING id);
```

**Result:** ✅ BLOCKED
- Reason: Contains "UPDATE" keyword
- Blocked by: Layer 2 keyword blacklist

---

### Scenario 3: Directory Traversal via Backup
**Attack:**
```
Path: ../../../home/user/.ssh/id_rsa.db
```

**Result:** ✅ BLOCKED
- Reason: Contains ".." in path
- Blocked by: Path traversal validation

---

### Scenario 4: Backup to Arbitrary Location
**Attack:**
```
Path: /etc/passwd.db
```

**Result:** ⚠️ PARTIALLY BLOCKED
- Blocked by: Extension validation
- Should also block: Absolute path outside allowed directories
- **TODO:** Add allowed directory whitelist in IPC handler

---

## Recommendations for Production

1. **Environment Separation**
   - Only enable dev API in development environment
   - Use environment variable: `NODE_ENV !== 'production'`

2. **Authentication**
   - Add API key authentication for MCP server connections
   - Rotate keys periodically

3. **Network Security**
   - Run MCP server on localhost only (no external access)
   - Use encrypted transport (HTTPS/WSS)

4. **Monitoring**
   - Alert on suspicious query patterns
   - Monitor query frequency and volume
   - Track backup operations

5. **Principle of Least Privilege**
   - Consider running MCP server with read-only database connection
   - Use separate database user with limited permissions

---

## Conclusion

The database tools implement **defense-in-depth security** with multiple validation layers, preventing common attacks like SQL injection and directory traversal. However, additional safeguards (rate limiting, audit logging, allowed directory whitelist) should be implemented before production deployment.

**Key Principle:** The dev API should be **read-only by default**, with write operations restricted to proper application services and migration tools.

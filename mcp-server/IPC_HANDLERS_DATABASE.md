# IPC Handlers Required for Database Tools

Agent Alpha should implement these handlers in electron/main.ts:

## 1. dev-api:database:query

Execute SELECT query

**Input:**
- `sql` (string) - SQL SELECT query only

**Output:**
- Array of row objects (e.g., `[{ id: 1, name: "John" }, ...]`)

**Security Requirements:**
- MUST validate that query starts with SELECT (case-insensitive)
- MUST reject queries containing dangerous keywords:
  - DROP, DELETE, UPDATE, INSERT
  - ALTER, CREATE, TRUNCATE
  - EXEC, EXECUTE
- MUST use parameterized queries if user input is involved
- MUST limit result set size (recommend max 1000 rows)

**Example Implementation:**
```typescript
ipcMain.handle('dev-api:database:query', async (_, sql: string) => {
  // Security validation
  const trimmed = sql.trim();
  if (!trimmed.toUpperCase().startsWith('SELECT')) {
    throw new Error('Only SELECT queries allowed');
  }

  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'];
  const upper = trimmed.toUpperCase();
  for (const keyword of dangerous) {
    if (upper.includes(keyword)) {
      throw new Error(`Dangerous keyword detected: ${keyword}`);
    }
  }

  // Execute query
  const db = databaseManager.getDatabase();
  const stmt = db.prepare(sql);
  const rows = stmt.all();

  // Limit result size
  if (rows.length > 1000) {
    return rows.slice(0, 1000);
  }

  return rows;
});
```

---

## 2. dev-api:database:migrate

Run database migrations

**Input:**
- `targetVersion` (number, optional) - Target migration version, defaults to latest

**Output:**
```typescript
{
  success: true,
  version: number,  // Current version after migration
  message: string   // Description of what was migrated
}
```

**Implementation Notes:**
- Use existing `runMigrations()` function from `src/db/migrate.ts`
- If `targetVersion` is provided, migrate to that specific version
- If `targetVersion` is omitted, migrate to latest
- Should be idempotent (safe to run multiple times)

**Example Implementation:**
```typescript
ipcMain.handle('dev-api:database:migrate', async (_, targetVersion?: number) => {
  try {
    const db = databaseManager.getDatabase();

    // Run migrations (modify runMigrations to accept target version)
    runMigrations(targetVersion);

    // Get current version
    const versionRow = db.prepare('SELECT MAX(version) as version FROM migrations').get();
    const currentVersion = versionRow?.version || 0;

    return {
      success: true,
      version: currentVersion,
      message: targetVersion
        ? `Migrated to version ${targetVersion}`
        : `Migrated to latest version ${currentVersion}`
    };
  } catch (error) {
    throw new Error(`Migration failed: ${error.message}`);
  }
});
```

---

## 3. dev-api:database:backup

Create database backup

**Input:**
- `path` (string) - Backup file path (e.g., `./backups/backup-2024-10-04.db`)

**Output:**
```typescript
{
  success: true,
  path: string,      // Absolute path to backup file
  size: number,      // Backup file size in bytes
  timestamp: string  // ISO timestamp of backup
}
```

**Security Requirements:**
- MUST validate path to prevent directory traversal (reject paths with "..")
- MUST enforce .db or .sqlite extension
- MUST convert to absolute path for safety
- RECOMMEND creating backups directory if it doesn't exist
- RECOMMEND adding timestamp to filename if not provided

**Example Implementation:**
```typescript
import { copyFile, mkdir, stat } from 'fs/promises';
import { resolve, dirname, extname } from 'path';

ipcMain.handle('dev-api:database:backup', async (_, backupPath: string) => {
  // Security validation
  if (backupPath.includes('..')) {
    throw new Error('Directory traversal not allowed');
  }

  const ext = extname(backupPath).toLowerCase();
  if (ext !== '.db' && ext !== '.sqlite') {
    throw new Error('Backup must have .db or .sqlite extension');
  }

  // Convert to absolute path
  const absolutePath = resolve(backupPath);

  // Ensure backup directory exists
  await mkdir(dirname(absolutePath), { recursive: true });

  // Get source database path
  const db = databaseManager.getDatabase();
  const sourcePath = db.name; // SQLite database file path

  // Copy database file
  await copyFile(sourcePath, absolutePath);

  // Get backup file stats
  const stats = await stat(absolutePath);

  return {
    success: true,
    path: absolutePath,
    size: stats.size,
    timestamp: new Date().toISOString()
  };
});
```

---

## Testing Recommendations

1. **Test Query Tool:**
   - Valid SELECT: `SELECT * FROM cases LIMIT 10`
   - Rejected UPDATE: `UPDATE cases SET status = 'closed'` (should fail)
   - SQL injection attempt: `SELECT * FROM cases; DROP TABLE cases;` (should fail)

2. **Test Migrate Tool:**
   - Run without version (should go to latest)
   - Run with specific version
   - Run twice (should be idempotent)

3. **Test Backup Tool:**
   - Valid path: `./backups/test.db` (should succeed)
   - Directory traversal: `../../../etc/passwd.db` (should fail)
   - Invalid extension: `./backups/test.txt` (should fail)

---

## Integration with MCP Server

The MCP server will call these handlers via IPC:

```typescript
// In DatabaseTools class
const result = await this.ipcClient.invoke('dev-api:database:query', sql);
```

The IPC client will connect to the Electron main process via WebSocket or stdio, depending on the transport configured in the MCP server setup.

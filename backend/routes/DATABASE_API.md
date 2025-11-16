# Database Management API

FastAPI endpoints for database management operations, migrated from `electron/ipc-handlers/database.ts`.

## Base Path
`/database`

## Authentication
All endpoints require authentication via session ID in the `Authorization` header or `session_id` query parameter.

Admin-only endpoints additionally require the user to have the `admin` role.

## Endpoints

### 1. GET /database/stats
Get database statistics including table counts and file size.

**Authentication:** Required (any authenticated user)

**Response:** `200 OK`
```json
{
  "connected": true,
  "database_path": "./data/justice.db",
  "database_size_bytes": 1048576,
  "database_size_mb": 1.0,
  "table_count": 15,
  "total_records": 1234,
  "tables": {
    "users": 10,
    "cases": 45,
    "evidence": 123,
    "audit_logs": 1056
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:8000/database/stats" \
  -H "Authorization: <session_id>"
```

---

### 2. POST /database/backup
Create a timestamped database backup.

**Authentication:** Required (any authenticated user)

**Response:** `201 Created`
```json
{
  "filename": "backup_2025-11-13_14-30-00.db",
  "path": "./data/backups/backup_2025-11-13_14-30-00.db",
  "size_bytes": 1048576,
  "size_mb": 1.0,
  "created_at": "2025-11-13T14:30:00.000Z",
  "is_valid": true,
  "metadata": {
    "version": "1.0.0",
    "record_count": 1234,
    "tables": ["users", "cases", "evidence", "audit_logs"]
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/database/backup" \
  -H "Authorization: <session_id>"
```

---

### 3. GET /database/backups
List all available database backups.

**Authentication:** Required (any authenticated user)

**Response:** `200 OK`
```json
{
  "backups": [
    {
      "filename": "backup_2025-11-13_14-30-00.db",
      "path": "./data/backups/backup_2025-11-13_14-30-00.db",
      "size_bytes": 1048576,
      "size_mb": 1.0,
      "created_at": "2025-11-13T14:30:00.000Z",
      "is_valid": true,
      "metadata": {
        "version": "1.0.0",
        "record_count": 1234,
        "tables": ["users", "cases", "evidence"]
      }
    }
  ],
  "count": 1
}
```

**Notes:**
- Backups are sorted by creation time (newest first)
- Invalid backups (corrupted files) are marked with `is_valid: false`
- Metadata is only available for valid SQLite databases

**Example:**
```bash
curl -X GET "http://localhost:8000/database/backups" \
  -H "Authorization: <session_id>"
```

---

### 4. POST /database/restore
Restore database from a backup (ADMIN ONLY).

**Authentication:** Required (admin role)

**Request Body:**
```json
{
  "backup_filename": "backup_2025-11-13_14-30-00.db"
}
```

**Response:** `200 OK`
```json
{
  "restored": true,
  "message": "Database restored successfully",
  "pre_restore_backup": "./data/backups/pre-restore_2025-11-13_14-35-00.db"
}
```

**Security:**
- Only users with `admin` role can restore backups
- Filename is validated to prevent path traversal attacks
- Creates automatic pre-restore backup before restoring
- Verifies backup is valid SQLite database before restoring

**Example:**
```bash
curl -X POST "http://localhost:8000/database/restore" \
  -H "Authorization: <session_id>" \
  -H "Content-Type: application/json" \
  -d '{"backup_filename": "backup_2025-11-13_14-30-00.db"}'
```

**Error Responses:**
- `403 Forbidden` - User is not admin
- `404 Not Found` - Backup file not found
- `400 Bad Request` - Invalid filename or corrupted backup

---

### 5. POST /database/vacuum
Run VACUUM operation to optimize database (ADMIN ONLY).

**Authentication:** Required (admin role)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Database optimized successfully",
  "size_before_bytes": 1048576,
  "size_after_bytes": 524288,
  "space_reclaimed_bytes": 524288,
  "space_reclaimed_mb": 0.5
}
```

**What VACUUM does:**
- Defragments the database file
- Reclaims unused space from deleted records
- Optimizes page layout for better performance
- Rebuilds database file from scratch

**Notes:**
- This is a blocking operation (may take time for large databases)
- Database remains accessible during VACUUM
- Recommended to run periodically to maintain performance

**Example:**
```bash
curl -X POST "http://localhost:8000/database/vacuum" \
  -H "Authorization: <session_id>"
```

**Error Responses:**
- `403 Forbidden` - User is not admin

---

### 6. DELETE /database/backups/{backup_filename}
Delete a database backup (ADMIN ONLY).

**Authentication:** Required (admin role)

**Path Parameters:**
- `backup_filename` (string) - Name of backup file to delete

**Response:** `200 OK`
```json
{
  "deleted": true,
  "message": "Backup deleted successfully"
}
```

**Security:**
- Only users with `admin` role can delete backups
- Filename is validated to prevent path traversal attacks
- Verifies file is within backup directory

**Example:**
```bash
curl -X DELETE "http://localhost:8000/database/backups/backup_2025-11-13_14-30-00.db" \
  -H "Authorization: <session_id>"
```

**Error Responses:**
- `403 Forbidden` - User is not admin
- `404 Not Found` - Backup file not found
- `400 Bad Request` - Invalid filename (path traversal attempt)

---

## Security Features

### Path Traversal Prevention
All backup filename operations validate against path traversal attacks:
- Reject filenames containing `/`, `\`, or `..`
- Verify resolved paths remain within backup directory
- Use `os.path.abspath()` to resolve paths securely

### Admin Role Enforcement
Destructive operations require admin role:
- Restore database
- VACUUM database
- Delete backups

These checks are implemented via the `require_admin_user` dependency.

### Audit Logging
All database operations are logged to the immutable audit trail:
- Database stats viewed
- Backup created
- Backup restored
- Database vacuumed
- Backup deleted

### Backup Integrity Validation
Before restoring:
1. Verify backup file exists
2. Validate filename (no path traversal)
3. Check backup is valid SQLite database
4. Create automatic pre-restore backup

---

## Configuration

### Environment Variables
Configure paths via environment variables:

```bash
# Database file path
DATABASE_PATH=./data/justice.db

# Backup directory
BACKUP_DIR=./data/backups
```

### Default Values
If not set, defaults are:
- `DATABASE_PATH`: `./data/justice.db`
- `BACKUP_DIR`: `./data/backups`

---

## Error Handling

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Resource created (backup) |
| 400  | Bad request (invalid input, path traversal) |
| 401  | Unauthorized (no session ID or invalid session) |
| 403  | Forbidden (admin role required) |
| 404  | Not found (backup file not found) |
| 500  | Internal server error |

### Error Response Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Testing

Use the provided test script:

```bash
python backend/test_database_api.py
```

This tests all endpoints including:
- Database statistics
- Backup creation
- Listing backups
- VACUUM operation
- Restore operation (with confirmation)
- Backup deletion (with confirmation)

---

## Comparison with Electron IPC

| Electron IPC Channel | FastAPI Endpoint | Notes |
|----------------------|------------------|-------|
| `db:status` | `GET /database/stats` | Expanded to include stats |
| `db:backup` | `POST /database/backup` | Same functionality |
| `db:listBackups` | `GET /database/backups` | Same functionality |
| `db:restore` | `POST /database/restore` | Added admin check |
| `db:deleteBackup` | `DELETE /database/backups/{filename}` | Added admin check |
| (new) | `POST /database/vacuum` | New endpoint for optimization |
| `db:migrate` | *(not migrated)* | Migration handled separately |

---

## Best Practices

### Regular Backups
- Create backups before major operations (migrations, bulk updates)
- Schedule automatic backups (daily/weekly)
- Implement retention policy (keep last N backups)

### Periodic VACUUM
- Run VACUUM monthly or after significant deletions
- Monitor space reclaimed to assess benefit
- Consider running during off-peak hours

### Backup Management
- Review and delete old backups regularly
- Test restore procedure periodically
- Store critical backups offsite (manual copy)

### Security
- Restrict admin role to trusted users
- Monitor audit logs for backup/restore operations
- Never expose backup directory to public access

---

## Implementation Notes

### Async Compatibility
All endpoints use async/await for FastAPI compatibility, though underlying operations (file I/O, SQLite) are synchronous.

### Database Connection Management
The `restore` endpoint closes the database connection before copying the backup. In production, consider:
- Connection pool management
- Graceful connection draining
- Read replicas for zero-downtime restores

### File Operations
Uses Python's `shutil.copyfile()` for atomic file copying. This ensures:
- Backup consistency (no partial writes)
- Original file remains unchanged if copy fails
- Metadata (timestamps) preserved

### SQLite VACUUM
VACUUM rebuilds the database file, which:
- Locks database during operation (use with caution)
- Requires free disk space ≥ database size
- Returns error if insufficient space

---

## Future Enhancements

1. **Incremental Backups** - Only backup changes since last full backup
2. **Compression** - Compress backups with gzip/zstd
3. **Encryption** - Encrypt backups at rest
4. **Cloud Storage** - Upload backups to S3/Azure/GCS
5. **Scheduled Backups** - Cron-based automatic backup scheduling
6. **Backup Verification** - Automated restore testing
7. **Point-in-Time Recovery** - WAL-based restore to specific timestamp
8. **Retention Policies** - Automatic cleanup of old backups

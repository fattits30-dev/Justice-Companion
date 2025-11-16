# Database API Quick Reference

One-page reference for Justice Companion database management endpoints.

## Base URL
```
http://localhost:8000/database
```

## Authentication
All endpoints require session ID:
```bash
# Header (preferred)
Authorization: <session_id>

# Query parameter (alternative)
?session_id=<session_id>
```

---

## Endpoints Overview

| Endpoint | Method | Auth | Admin | Description |
|----------|--------|------|-------|-------------|
| `/stats` | GET | ✓ | ✗ | Database statistics |
| `/backup` | POST | ✓ | ✗ | Create backup |
| `/backups` | GET | ✓ | ✗ | List all backups |
| `/restore` | POST | ✓ | ✓ | Restore from backup |
| `/vacuum` | POST | ✓ | ✓ | Optimize database |
| `/backups/{filename}` | DELETE | ✓ | ✓ | Delete backup |

---

## Quick Examples

### Get Database Stats
```bash
curl http://localhost:8000/database/stats \
  -H "Authorization: <session_id>"
```

**Response:**
```json
{
  "database_size_mb": 1.5,
  "table_count": 15,
  "total_records": 1234,
  "tables": {"users": 10, "cases": 45}
}
```

---

### Create Backup
```bash
curl -X POST http://localhost:8000/database/backup \
  -H "Authorization: <session_id>"
```

**Response:**
```json
{
  "filename": "backup_2025-11-13_14-30-00.db",
  "size_mb": 1.5,
  "is_valid": true
}
```

---

### List Backups
```bash
curl http://localhost:8000/database/backups \
  -H "Authorization: <session_id>"
```

**Response:**
```json
{
  "backups": [
    {
      "filename": "backup_2025-11-13_14-30-00.db",
      "size_mb": 1.5,
      "created_at": "2025-11-13T14:30:00Z",
      "is_valid": true
    }
  ],
  "count": 1
}
```

---

### Restore Backup (Admin Only)
```bash
curl -X POST http://localhost:8000/database/restore \
  -H "Authorization: <session_id>" \
  -H "Content-Type: application/json" \
  -d '{"backup_filename": "backup_2025-11-13_14-30-00.db"}'
```

**Response:**
```json
{
  "restored": true,
  "message": "Database restored successfully",
  "pre_restore_backup": "pre-restore_2025-11-13_14-35-00.db"
}
```

---

### VACUUM Database (Admin Only)
```bash
curl -X POST http://localhost:8000/database/vacuum \
  -H "Authorization: <session_id>"
```

**Response:**
```json
{
  "success": true,
  "space_reclaimed_mb": 0.5
}
```

---

### Delete Backup (Admin Only)
```bash
curl -X DELETE http://localhost:8000/database/backups/backup_2025-11-13_14-30-00.db \
  -H "Authorization: <session_id>"
```

**Response:**
```json
{
  "deleted": true,
  "message": "Backup deleted successfully"
}
```

---

## Common HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Operation completed |
| 201 | Created | Backup created |
| 400 | Bad Request | Invalid input, path traversal |
| 401 | Unauthorized | No/invalid session |
| 403 | Forbidden | Admin required |
| 404 | Not Found | Backup not found |
| 500 | Server Error | Internal error |

---

## Error Response Format
```json
{
  "detail": "Error message"
}
```

---

## Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000"
session_id = "<your_session_id>"

# Get stats
stats = requests.get(
    f"{BASE_URL}/database/stats",
    headers={"Authorization": session_id}
).json()

print(f"Database size: {stats['database_size_mb']} MB")
print(f"Total records: {stats['total_records']}")

# Create backup
backup = requests.post(
    f"{BASE_URL}/database/backup",
    headers={"Authorization": session_id}
).json()

print(f"Backup created: {backup['filename']}")

# List backups
backups = requests.get(
    f"{BASE_URL}/database/backups",
    headers={"Authorization": session_id}
).json()

for b in backups['backups']:
    print(f"- {b['filename']}: {b['size_mb']} MB")
```

---

## TypeScript/Axios Client Example

```typescript
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';
const sessionId = '<your_session_id>';

// Create axios instance with auth header
const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: sessionId }
});

// Get stats
const stats = await api.get('/database/stats');
console.log('Database size:', stats.data.database_size_mb, 'MB');

// Create backup
const backup = await api.post('/database/backup');
console.log('Backup created:', backup.data.filename);

// List backups
const backups = await api.get('/database/backups');
console.log('Found', backups.data.count, 'backups');

// VACUUM (admin only)
await api.post('/database/vacuum');
console.log('Database optimized');
```

---

## Testing

Run test suite:
```bash
python backend/test_database_api.py
```

Requirements:
- Backend running on port 8000
- Test user: `admin@test.com` / `Admin123!`
- Admin role assigned

---

## Interactive Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Try endpoints directly in browser with Swagger UI.

---

## Security Notes

**Admin-Only Operations:**
- Database restore
- Database VACUUM
- Backup deletion

**Path Traversal Protection:**
- All filenames validated
- No `..`, `/`, `\` allowed
- Paths verified within backup directory

**Audit Logging:**
- All operations logged
- Immutable audit trail
- SHA-256 hash chaining

---

## Configuration

Set via environment variables:
```bash
export DATABASE_PATH="./data/justice.db"
export BACKUP_DIR="./data/backups"
```

Defaults:
- Database: `./data/justice.db`
- Backups: `./data/backups`

---

## Troubleshooting

**"Invalid or expired session"**
- Session ID expired (24hr timeout)
- Login again to get new session

**"Admin privileges required"**
- User doesn't have admin role
- Check role in database: `SELECT role FROM users WHERE id=?`

**"Backup file not found"**
- Backup was deleted or moved
- Check backups: `GET /database/backups`

**"Invalid backup filename"**
- Filename contains path traversal (`..`, `/`)
- Use exact filename from `GET /database/backups`

---

## Best Practices

1. **Before migrations:** Create backup
2. **Before major operations:** Create backup
3. **Weekly:** Run VACUUM
4. **Monthly:** Delete old backups
5. **Test restores:** Verify backups work
6. **Monitor:** Check disk space

---

## File Locations

**Implementation:** `backend/routes/database.py`
**Tests:** `backend/test_database_api.py`
**Documentation:** `backend/routes/DATABASE_API.md`
**Summary:** `backend/routes/DATABASE_MIGRATION_SUMMARY.md`

---

**For detailed information, see `DATABASE_API.md`**

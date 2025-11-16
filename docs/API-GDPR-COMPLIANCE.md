# GDPR Compliance API Documentation

Complete API reference for GDPR Articles 17 & 20 implementation in Justice Companion.

## Overview

The GDPR compliance routes implement:
- **Article 20**: Data Portability (Right to Export)
- **Article 17**: Right to Erasure (Right to Delete)

All endpoints require authentication via session ID and enforce rate limiting to prevent abuse.

## Base URL

```
http://localhost:8000/gdpr
```

## Authentication

All GDPR endpoints require a valid session ID provided in one of two ways:

1. **Authorization Header** (recommended):
   ```
   Authorization: Bearer <session_id>
   ```

2. **Query Parameter**:
   ```
   ?session_id=<session_id>
   ```

## Endpoints

### 1. Export User Data

**POST** `/gdpr/export`

Export all user data in machine-readable JSON format. Implements GDPR Article 20 (Data Portability).

#### Request

**Headers:**
```http
Authorization: Bearer <session_id>
Content-Type: application/json
```

**Body:**
```json
{
  "format": "json"
}
```

**Parameters:**
- `format` (string, optional): Export format. Options: `json` or `csv`. Default: `json`.

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "filePath": "exports/user_1_export_1699900000.json",
  "totalRecords": 247,
  "exportDate": "2024-11-13T10:30:00.000Z",
  "format": "json",
  "auditLogId": "uuid-v4-string"
}
```

**Rate Limit Exceeded (429 Too Many Requests):**
```json
{
  "detail": "Rate limit exceeded for export. Try again after 2024-11-14T10:30:00.000Z"
}
```

**No Consent (403 Forbidden):**
```json
{
  "detail": "Active consent required for data_processing"
}
```

**Unauthorized (401 Unauthorized):**
```json
{
  "detail": "Session ID required (provide in Authorization header or session_id query param)"
}
```

#### Rate Limits

- **5 exports per 24 hours per user**
- Counter resets 24 hours after first export

#### Consent Requirements

User must have active `data_processing` consent (not revoked).

#### Exported Data Structure

The exported JSON file contains:

```json
{
  "metadata": {
    "exportDate": "2024-11-13T10:30:00.000Z",
    "userId": 1,
    "format": "json",
    "totalRecords": 247,
    "schemaVersion": "1.0"
  },
  "userData": {
    "profile": {
      "tableName": "users",
      "records": [...],
      "count": 1
    },
    "cases": {
      "tableName": "cases",
      "records": [...],
      "count": 10
    },
    "evidence": {
      "tableName": "evidence",
      "records": [...],
      "count": 45
    },
    "legalIssues": { ... },
    "timelineEvents": { ... },
    "actions": { ... },
    "notes": { ... },
    "chatConversations": { ... },
    "chatMessages": { ... },
    "userFacts": { ... },
    "caseFacts": { ... },
    "sessions": { ... },
    "consents": { ... }
  }
}
```

**13 tables exported:**
1. `profile` (users table - excludes password hash)
2. `cases` (with decrypted descriptions)
3. `evidence` (with decrypted content)
4. `legalIssues`
5. `timelineEvents` (with decrypted descriptions)
6. `actions` (with decrypted descriptions)
7. `notes` (with decrypted content)
8. `chatConversations`
9. `chatMessages` (with decrypted messages/responses)
10. `userFacts`
11. `caseFacts`
12. `sessions` (active sessions only)
13. `consents` (all consent records)

**Important Notes:**
- Password hashes are NEVER exported (security)
- All encrypted fields are automatically decrypted before export
- Timestamps are in ISO 8601 format (UTC)
- File is saved to `exports/` directory

---

### 2. Delete User Data

**POST** `/gdpr/delete`

Delete all user data (cascading deletion). Implements GDPR Article 17 (Right to Erasure).

**WARNING:** This operation is PERMANENT and cannot be undone. Audit logs and consent records are preserved (legal requirement).

#### Request

**Headers:**
```http
Authorization: Bearer <session_id>
Content-Type: application/json
```

**Body:**
```json
{
  "confirmed": true,
  "exportBeforeDelete": true,
  "reason": "User requested account deletion"
}
```

**Parameters:**
- `confirmed` (boolean, **required**): Must be `true` to proceed. Safety check.
- `exportBeforeDelete` (boolean, optional): Export data before deletion. Default: `false`.
- `reason` (string, optional): Reason for deletion (max 500 chars).

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "deletionDate": "2024-11-13T10:35:00.000Z",
  "deletedCounts": {
    "chat_messages": 120,
    "chat_conversations": 5,
    "case_facts": 30,
    "notes": 25,
    "actions": 15,
    "timeline_events": 10,
    "legal_issues": 8,
    "evidence": 45,
    "cases": 10,
    "user_facts": 5,
    "sessions": 2,
    "users": 1
  },
  "preservedAuditLogs": 48,
  "preservedConsents": 3,
  "exportPath": "exports/user_1_pre_deletion_export_1699900000.json",
  "auditLogId": "uuid-v4-string"
}
```

**Confirmation Required (400 Bad Request):**
```json
{
  "detail": "Deletion requires explicit confirmation (confirmed: true)"
}
```

**Rate Limit Exceeded (429 Too Many Requests):**
```json
{
  "detail": "Rate limit exceeded for delete. Try again after 2024-12-13T10:30:00.000Z"
}
```

**No Consent (403 Forbidden):**
```json
{
  "detail": "Active consent required for data_erasure_request"
}
```

#### Rate Limits

- **1 deletion per 30 days per user**
- Prevents accidental deletions

#### Consent Requirements

User must have active `data_erasure_request` consent (not revoked).

#### Deletion Order

Data is deleted in the following order (respecting foreign key constraints):

1. Chat messages
2. Chat conversations
3. Case facts
4. Notes
5. Actions
6. Timeline events
7. Legal issues
8. Evidence
9. Cases
10. User facts
11. Sessions
12. User profile

**Preserved Records (Legal Requirement):**
- Audit logs (all GDPR operations are logged)
- Consent records (proof of consent/withdrawal)

#### Transaction Safety

Deletion is **atomic** (all-or-nothing):
- If any step fails, entire transaction is rolled back
- Database remains in consistent state
- Error is logged and returned to client

---

### 3. Get User Consents

**GET** `/gdpr/consents`

Retrieve all consent records for the authenticated user.

#### Request

**Headers:**
```http
Authorization: Bearer <session_id>
```

#### Response

**Success (200 OK):**
```json
{
  "consents": [
    {
      "id": 1,
      "consentType": "data_processing",
      "granted": true,
      "grantedAt": "2024-11-01T08:00:00.000Z",
      "revokedAt": null,
      "createdAt": "2024-11-01T08:00:00.000Z"
    },
    {
      "id": 2,
      "consentType": "marketing",
      "granted": false,
      "grantedAt": "2024-11-01T08:00:00.000Z",
      "revokedAt": "2024-11-10T12:00:00.000Z",
      "createdAt": "2024-11-01T08:00:00.000Z"
    },
    {
      "id": 3,
      "consentType": "data_erasure_request",
      "granted": true,
      "grantedAt": "2024-11-12T15:30:00.000Z",
      "revokedAt": null,
      "createdAt": "2024-11-12T15:30:00.000Z"
    }
  ]
}
```

**Common Consent Types:**
- `data_processing` - Required for data export
- `data_erasure_request` - Required for account deletion
- `marketing` - Marketing communications
- `analytics` - Usage analytics
- `ai_training` - Use data for AI model training

---

### 4. Update User Consent

**POST** `/gdpr/consents`

Grant or revoke user consent for a specific consent type.

#### Request

**Headers:**
```http
Authorization: Bearer <session_id>
Content-Type: application/json
```

**Body (Grant Consent):**
```json
{
  "consentType": "data_processing",
  "granted": true
}
```

**Body (Revoke Consent):**
```json
{
  "consentType": "marketing",
  "granted": false
}
```

**Parameters:**
- `consentType` (string, **required**): Type of consent to update.
- `granted` (boolean, **required**): `true` to grant, `false` to revoke.

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "consentType": "data_processing",
  "granted": true
}
```

#### Behavior

**Granting Consent:**
- Creates new consent record with `granted_at` timestamp
- Sets `granted = 1`
- Logs audit event

**Revoking Consent:**
- Updates existing consent record
- Sets `revoked_at` timestamp
- Does NOT delete record (legal requirement)
- Logs audit event

---

## Error Responses

### 400 Bad Request
Invalid request parameters or missing required fields.

```json
{
  "detail": "Deletion requires explicit confirmation (confirmed: true)"
}
```

### 401 Unauthorized
Missing or invalid session ID.

```json
{
  "detail": "Session ID required (provide in Authorization header or session_id query param)"
}
```

### 403 Forbidden
User lacks required consent or permissions.

```json
{
  "detail": "Active consent required for data_processing"
}
```

### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "detail": "Rate limit exceeded for export. Try again after 2024-11-14T10:30:00.000Z"
}
```

### 500 Internal Server Error
Server error during operation.

```json
{
  "detail": "Export failed: Database connection timeout"
}
```

---

## Audit Logging

All GDPR operations are automatically logged with:
- **Event Type**: `gdpr.export`, `gdpr.erasure`, `consent.updated`
- **User ID**: Authenticated user
- **Resource**: `user_data` or `consent`
- **Action**: `export`, `delete`, `update`
- **Success/Failure**: Operation status
- **Details**: Additional context (file paths, counts, etc.)

Audit logs are:
- **Immutable** (cannot be modified after creation)
- **Hash-chained** (blockchain-style integrity)
- **Preserved** during account deletion (legal requirement)

---

## Rate Limiting Implementation

Rate limits are enforced in-memory using a map:

```python
{
  "userId:operation": {
    "count": 3,
    "resetAt": 1699900000000  # Unix timestamp (ms)
  }
}
```

**Limits:**
- **Export**: 5 requests per 24 hours
- **Delete**: 1 request per 30 days

**Production Deployment:**
For multi-instance deployments, use Redis for distributed rate limiting:

```python
import redis
rate_limiter = redis.Redis(host='localhost', port=6379, db=0)
```

---

## Security Considerations

1. **Encryption**: All sensitive fields are decrypted before export
2. **Authentication**: All endpoints require valid session
3. **Consent Verification**: Operations blocked without active consent
4. **Rate Limiting**: Prevents abuse (DDoS, data harvesting)
5. **Audit Trail**: All operations logged (tamper-evident)
6. **Transaction Safety**: Deletions are atomic (rollback on error)
7. **Data Preservation**: Audit logs and consents preserved (compliance)
8. **Password Protection**: Password hashes NEVER exported

---

## Testing

Run the test suite:

```bash
# All GDPR tests
pytest backend/test_gdpr.py -v

# Specific test
pytest backend/test_gdpr.py::test_gdpr_export_success -v

# With coverage
pytest backend/test_gdpr.py --cov=backend.routes.gdpr --cov-report=html
```

**Test Coverage:**
- Export success and rate limiting
- Delete with/without export
- Consent management (grant/revoke)
- Authorization failures
- Error handling and rollback

---

## Example Usage

### Python (Requests)

```python
import requests

BASE_URL = "http://localhost:8000"
SESSION_ID = "your-session-id-here"

# Export user data
response = requests.post(
    f"{BASE_URL}/gdpr/export",
    json={"format": "json"},
    headers={"Authorization": f"Bearer {SESSION_ID}"}
)

if response.status_code == 200:
    export_data = response.json()
    print(f"Exported {export_data['totalRecords']} records")
    print(f"File: {export_data['filePath']}")
else:
    print(f"Error: {response.json()['detail']}")

# Delete account with export
response = requests.post(
    f"{BASE_URL}/gdpr/delete",
    json={
        "confirmed": True,
        "exportBeforeDelete": True,
        "reason": "User requested deletion"
    },
    headers={"Authorization": f"Bearer {SESSION_ID}"}
)

if response.status_code == 200:
    result = response.json()
    print(f"Deleted {sum(result['deletedCounts'].values())} records")
    print(f"Preserved {result['preservedAuditLogs']} audit logs")
else:
    print(f"Error: {response.json()['detail']}")
```

### JavaScript (Fetch)

```javascript
const BASE_URL = "http://localhost:8000";
const SESSION_ID = "your-session-id-here";

// Export user data
async function exportUserData() {
  const response = await fetch(`${BASE_URL}/gdpr/export`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SESSION_ID}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ format: "json" })
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`Exported ${data.totalRecords} records`);
    console.log(`File: ${data.filePath}`);
  } else {
    const error = await response.json();
    console.error(`Error: ${error.detail}`);
  }
}

// Delete account
async function deleteAccount() {
  const response = await fetch(`${BASE_URL}/gdpr/delete`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SESSION_ID}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      confirmed: true,
      exportBeforeDelete: true,
      reason: "User requested deletion"
    })
  });

  if (response.ok) {
    const result = await response.json();
    const totalDeleted = Object.values(result.deletedCounts)
      .reduce((sum, count) => sum + count, 0);
    console.log(`Deleted ${totalDeleted} records`);
    console.log(`Preserved ${result.preservedAuditLogs} audit logs`);
  } else {
    const error = await response.json();
    console.error(`Error: ${error.detail}`);
  }
}
```

### cURL

```bash
# Export user data
curl -X POST http://localhost:8000/gdpr/export \
  -H "Authorization: Bearer your-session-id-here" \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}'

# Delete account
curl -X POST http://localhost:8000/gdpr/delete \
  -H "Authorization: Bearer your-session-id-here" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmed": true,
    "exportBeforeDelete": true,
    "reason": "User requested deletion"
  }'

# Get consents
curl -X GET http://localhost:8000/gdpr/consents \
  -H "Authorization: Bearer your-session-id-here"

# Update consent
curl -X POST http://localhost:8000/gdpr/consents \
  -H "Authorization: Bearer your-session-id-here" \
  -H "Content-Type: application/json" \
  -d '{
    "consentType": "data_processing",
    "granted": true
  }'
```

---

## Swagger UI

Interactive API documentation is available at:

```
http://localhost:8000/docs
```

Test all endpoints directly from the browser with authentication support.

---

## Compliance Checklist

- [x] **GDPR Article 20** (Data Portability)
  - [x] Machine-readable format (JSON)
  - [x] All user data across 13 tables
  - [x] Encrypted fields decrypted
  - [x] Rate limiting (5 per 24h)
  - [x] Consent verification
  - [x] Audit logging

- [x] **GDPR Article 17** (Right to Erasure)
  - [x] Cascading deletion (all user data)
  - [x] Explicit confirmation required
  - [x] Preserved audit logs (legal requirement)
  - [x] Preserved consent records (proof)
  - [x] Transaction safety (rollback on error)
  - [x] Rate limiting (1 per 30 days)
  - [x] Optional pre-deletion export

- [x] **Consent Management**
  - [x] Grant/revoke consent
  - [x] Consent history preserved
  - [x] Timestamps for all actions
  - [x] Audit logging

- [x] **Security**
  - [x] Session-based authentication
  - [x] Encryption/decryption
  - [x] Rate limiting
  - [x] Audit trail
  - [x] Password hashes never exported
  - [x] Transaction rollback on errors

---

## Troubleshooting

### Issue: "Rate limit exceeded"
**Solution:** Wait until the reset time shown in the error message. Rate limits reset after 24 hours (export) or 30 days (delete).

### Issue: "Active consent required"
**Solution:** Grant the required consent using `POST /gdpr/consents` before attempting the operation.

### Issue: Export file not found
**Solution:** Check the `exports/` directory exists. The backend creates it automatically, but ensure write permissions are correct.

### Issue: "Deletion requires explicit confirmation"
**Solution:** Set `"confirmed": true` in the request body. This safety check prevents accidental deletions.

### Issue: "Invalid or expired session"
**Solution:** Obtain a new session ID by logging in via `POST /auth/login`.

---

## Support

For issues or questions:
- GitHub Issues: [github.com/yourusername/justice-companion/issues](https://github.com/yourusername/justice-companion/issues)
- Email: support@justicecompanion.com
- Documentation: [Full GDPR Compliance Guide](./GDPR-COMPLIANCE.md)

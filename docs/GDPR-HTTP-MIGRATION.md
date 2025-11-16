# GDPR HTTP API Migration Guide

**Date:** January 2025
**Status:** Complete
**Migration:** Electron IPC → FastAPI HTTP REST API

---

## Overview

Justice Companion's GDPR compliance features (Articles 17 & 20) have been migrated from Electron IPC to HTTP REST API. This document provides comprehensive guidance for using the new API.

---

## Table of Contents

1. [GDPR Articles Overview](#gdpr-articles-overview)
2. [API Endpoints](#api-endpoints)
3. [Rate Limiting](#rate-limiting)
4. [Consent Management](#consent-management)
5. [Export Formats](#export-formats)
6. [Components](#components)
7. [Usage Examples](#usage-examples)
8. [Testing Procedures](#testing-procedures)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

---

## GDPR Articles Overview

### Article 20 - Right to Data Portability

Users have the right to:
- **Receive** personal data in a structured, machine-readable format
- **Transfer** data to another controller without hindrance

**Implementation:**
- JSON export with all 13 database tables
- Encrypted fields automatically decrypted
- Metadata includes record counts and schema version
- Alternative formats: PDF (human-readable), DOCX (editable), CSV (spreadsheet)

### Article 17 - Right to Erasure

Users have the right to:
- **Delete** personal data when no longer necessary
- **Erase** data upon withdrawal of consent

**Implementation:**
- 15-step cascading deletion (respects foreign key constraints)
- Audit logs preserved (legal requirement)
- Consent records preserved (legal requirement)
- Optional export before deletion
- Irreversible operation with explicit confirmation required

---

## API Endpoints

### Base URL

```
http://127.0.0.1:8000
```

### Authentication

All requests require valid session ID in header:
```
X-Session-Id: <session-id>
```

### Endpoints

#### 1. Export User Data

**Endpoint:** `POST /gdpr/export`

**Request:**
```json
{
  "format": "json"
}
```

**Parameters:**
- `format` (string, optional): Export format (`json` or `csv`). Default: `json`

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "filePath": "exports/user_1_export_1704067200.json",
    "totalRecords": 1523,
    "exportDate": "2025-01-15T10:30:00Z",
    "format": "json",
    "auditLogId": "abc123"
  }
}
```

**Rate Limit:** 5 exports per 24 hours per user

**Required Consent:** `data_processing`

---

#### 2. Delete User Account

**Endpoint:** `POST /gdpr/delete`

**Request:**
```json
{
  "confirmed": true,
  "exportBeforeDelete": true,
  "reason": "No longer need the service"
}
```

**Parameters:**
- `confirmed` (boolean, required): Must be `true` to confirm deletion
- `exportBeforeDelete` (boolean, optional): Export data before deletion. Default: `false`
- `reason` (string, optional): Reason for deletion (max 500 chars)

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "deletionDate": "2025-01-15T11:00:00Z",
    "deletedCounts": {
      "cases": 15,
      "evidence": 42,
      "chat_messages": 127,
      "chat_conversations": 8,
      "notes": 23,
      "actions": 18,
      "timeline_events": 31,
      "legal_issues": 12,
      "case_facts": 45,
      "user_facts": 8,
      "sessions": 3,
      "users": 1
    },
    "exportPath": "exports/user_1_pre_deletion_export_1704067200.json",
    "preservedAuditLogs": 156,
    "preservedConsents": 4,
    "auditLogId": "def456"
  }
}
```

**Rate Limit:** 1 deletion per 30 days per user

**Required Consent:** `data_erasure_request`

---

#### 3. Get User Consents

**Endpoint:** `GET /gdpr/consents`

**Response:**
```json
{
  "success": true,
  "data": {
    "consents": [
      {
        "id": 1,
        "consentType": "data_processing",
        "granted": true,
        "grantedAt": "2025-01-01T00:00:00Z",
        "revokedAt": null,
        "createdAt": "2025-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "consentType": "data_erasure_request",
        "granted": false,
        "grantedAt": null,
        "revokedAt": "2025-01-10T12:00:00Z",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### 4. Update Consent

**Endpoint:** `POST /gdpr/consents`

**Request:**
```json
{
  "consentType": "data_processing",
  "granted": true
}
```

**Parameters:**
- `consentType` (string, required): Type of consent
  - `data_processing` - Required for exports
  - `data_erasure_request` - Required for deletions
  - `marketing` - Optional marketing consent
- `granted` (boolean, required): Grant (`true`) or revoke (`false`)

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "consentType": "data_processing",
    "granted": true
  }
}
```

---

#### 5. Export Single Case

**Endpoint:** `POST /export/case/{case_id}?format=pdf`

**Parameters:**
- `case_id` (number, path): Case ID
- `format` (string, query): Export format (`json`, `pdf`, `docx`)

**Response:** Binary blob (file download)

---

#### 6. Export Single Evidence

**Endpoint:** `POST /export/evidence/{evidence_id}?format=docx`

**Parameters:**
- `evidence_id` (number, path): Evidence ID
- `format` (string, query): Export format (`json`, `pdf`, `docx`)

**Response:** Binary blob (file download)

---

#### 7. Export Search Results

**Endpoint:** `POST /export/search-results?query=contract&format=csv`

**Parameters:**
- `query` (string, query): Search query
- `format` (string, query): Export format (`json`, `csv`)

**Response:** Binary blob (file download)

---

## Rate Limiting

### Limits

| Operation | Limit | Window | Purpose |
|-----------|-------|--------|---------|
| Export Data | 5 requests | 24 hours | Prevent abuse |
| Delete Account | 1 request | 30 days | Prevent accidents |

### Rate Limit Responses

**Status Code:** `429 Too Many Requests`

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded for export. Try again after 2025-01-16T10:30:00Z",
    "details": {
      "resetAt": "2025-01-16T10:30:00Z",
      "remaining": 0,
      "limit": 5
    }
  }
}
```

### Rate Limit Storage

**Current:** In-memory dictionary (development)
**Production:** Redis recommended for multi-instance deployments

---

## Consent Management

### Consent Types

#### 1. `data_processing`
- **Required for:** Data exports
- **Description:** Consent to process personal data
- **GDPR Basis:** Article 6(1)(a) - Consent

#### 2. `data_erasure_request`
- **Required for:** Account deletion
- **Description:** Request to erase personal data
- **GDPR Basis:** Article 17 - Right to Erasure

#### 3. `marketing` (optional)
- **Required for:** Marketing communications
- **Description:** Consent to receive promotional emails
- **GDPR Basis:** Article 6(1)(a) - Consent

### Consent Lifecycle

1. **Grant Consent:**
   ```typescript
   await apiClient.gdpr.updateConsent({
     consentType: "data_processing",
     granted: true
   });
   ```

2. **Revoke Consent:**
   ```typescript
   await apiClient.gdpr.updateConsent({
     consentType: "data_processing",
     granted: false
   });
   ```

3. **Check Consent:**
   ```typescript
   const response = await apiClient.gdpr.getConsents();
   const dataProcessingConsent = response.data.consents.find(
     c => c.consentType === "data_processing"
   );
   const isActive = dataProcessingConsent?.granted && !dataProcessingConsent?.revokedAt;
   ```

### Consent Enforcement

- **Before Export:** API checks for active `data_processing` consent
- **Before Deletion:** API checks for active `data_erasure_request` consent
- **Missing Consent:** Returns `403 Forbidden`

---

## Export Formats

### JSON (Machine-Readable)

**Use Case:** Data portability, migration, backup
**Structure:**
```json
{
  "metadata": {
    "exportDate": "2025-01-15T10:30:00Z",
    "userId": 1,
    "format": "json",
    "totalRecords": 1523,
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
      "count": 15
    },
    "evidence": {
      "tableName": "evidence",
      "records": [...],
      "count": 42
    }
  }
}
```

**Tables Included (13 total):**
1. `users` - User profile
2. `cases` - Cases
3. `evidence` - Evidence items
4. `legal_issues` - Legal issues
5. `timeline_events` - Timeline events
6. `actions` - Actions/tasks
7. `notes` - Notes
8. `chat_conversations` - AI chat conversations
9. `chat_messages` - AI chat messages
10. `user_facts` - User facts
11. `case_facts` - Case facts
12. `sessions` - Sessions
13. `consents` - Consent records

**Encrypted Fields:** Automatically decrypted before export

---

### CSV (Spreadsheet-Compatible)

**Use Case:** Data analysis in Excel/Google Sheets
**Structure:** Flattened tables with headers

---

### PDF (Human-Readable)

**Use Case:** Printing, archiving, legal submissions
**Structure:** Formatted report with sections

---

### DOCX (Editable)

**Use Case:** Editing, customization, presentations
**Structure:** Microsoft Word document

---

## Components

### 1. GdprDashboard

**Location:** `src/components/gdpr/GdprDashboard.tsx`

**Features:**
- Export data with format selection
- Delete account with confirmation
- Consent management toggles
- Rate limit indicators
- Consent history table

**Props:**
```typescript
interface GdprDashboardProps {
  sessionId: string;
  onLogout?: () => void;
}
```

**Usage:**
```tsx
import { GdprDashboard } from "@/components/gdpr/GdprDashboard";

<GdprDashboard
  sessionId={sessionId}
  onLogout={() => router.push("/login")}
/>
```

---

### 2. ExportMenu

**Location:** `src/components/export/ExportMenu.tsx`

**Features:**
- Dropdown menu with format options
- Export single case or evidence
- Progress indicator
- Automatic file download
- Error notifications

**Props:**
```typescript
interface ExportMenuProps {
  entityType: "case" | "evidence";
  entityId: number;
  entityName?: string;
  sessionId: string;
}
```

**Usage:**
```tsx
import { ExportMenu } from "@/components/export/ExportMenu";

<ExportMenu
  entityType="case"
  entityId={caseId}
  entityName={caseName}
  sessionId={sessionId}
/>
```

---

### 3. DeleteAccountModal

**Location:** `src/components/gdpr/DeleteAccountModal.tsx`

**Features:**
- Warning messages
- Consequences list
- Export before delete option
- Reason textarea
- Acknowledgment checkbox

**Props:**
```typescript
interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: DeleteDataRequest) => Promise<void>;
  isDeleting: boolean;
}
```

**Usage:**
```tsx
import { DeleteAccountModal } from "@/components/gdpr/DeleteAccountModal";

<DeleteAccountModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleDelete}
  isDeleting={isDeleting}
/>
```

---

## Usage Examples

### Example 1: Export User Data

```typescript
import { apiClient } from "@/lib/apiClient";

async function exportUserData() {
  try {
    apiClient.setSessionId(sessionId);

    const response = await apiClient.gdpr.exportData({
      format: "json"
    });

    if (response.success && response.data) {
      console.log(`Exported ${response.data.totalRecords} records`);
      console.log(`File saved at: ${response.data.filePath}`);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isStatus(429)) {
        console.error("Rate limit exceeded");
      } else if (error.isStatus(403)) {
        console.error("Consent required");
      } else {
        console.error(error.message);
      }
    }
  }
}
```

---

### Example 2: Delete Account with Export

```typescript
import { apiClient } from "@/lib/apiClient";

async function deleteAccount() {
  try {
    apiClient.setSessionId(sessionId);

    const response = await apiClient.gdpr.deleteData({
      confirmed: true,
      exportBeforeDelete: true,
      reason: "No longer using the service"
    });

    if (response.success && response.data) {
      const totalDeleted = Object.values(response.data.deletedCounts)
        .reduce((sum, count) => sum + count, 0);

      console.log(`Deleted ${totalDeleted} records`);
      console.log(`Preserved ${response.data.preservedAuditLogs} audit logs`);

      if (response.data.exportPath) {
        console.log(`Pre-deletion export: ${response.data.exportPath}`);
      }
    }
  } catch (error) {
    console.error("Deletion failed:", error);
  }
}
```

---

### Example 3: Export Single Case

```typescript
import { apiClient } from "@/lib/apiClient";

async function exportCase(caseId: number) {
  try {
    apiClient.setSessionId(sessionId);

    const blob = await apiClient.export.exportCase(caseId, "pdf");

    // Download file
    const filename = `case-${caseId}-${Date.now()}.pdf`;
    apiClient.export.downloadBlob(blob, filename);

    console.log("Case exported successfully");
  } catch (error) {
    console.error("Export failed:", error);
  }
}
```

---

## Testing Procedures

### Test Checklist

#### 1. Data Export Tests

- [ ] Export data as JSON
- [ ] Export data as CSV
- [ ] Export data as PDF (if implemented)
- [ ] Export data as DOCX (if implemented)
- [ ] Verify all 13 tables included
- [ ] Verify encrypted fields decrypted
- [ ] Verify metadata correct (record count, user ID, timestamp)
- [ ] Verify file downloads correctly
- [ ] Verify file size reasonable

#### 2. Rate Limiting Tests

- [ ] Perform 5 exports successfully
- [ ] Verify 6th export returns 429 error
- [ ] Verify error message includes reset time
- [ ] Wait until reset time (or mock time)
- [ ] Verify exports allowed again
- [ ] Test deletion rate limit (1 per 30 days)

#### 3. Account Deletion Tests

- [ ] Delete account without export
- [ ] Delete account with export
- [ ] Verify cascading deletion (all tables)
- [ ] Verify audit logs preserved
- [ ] Verify consent records preserved
- [ ] Verify user cannot login after deletion
- [ ] Verify deletion count correct
- [ ] Verify export file created (if requested)

#### 4. Consent Management Tests

- [ ] Grant data processing consent
- [ ] Revoke data processing consent
- [ ] Grant data erasure consent
- [ ] Export without consent (should fail with 403)
- [ ] Delete without consent (should fail with 403)
- [ ] View consent history

#### 5. Entity Export Tests

- [ ] Export single case as PDF
- [ ] Export single case as DOCX
- [ ] Export single case as JSON
- [ ] Export single evidence item
- [ ] Export search results as CSV
- [ ] Export search results as JSON

#### 6. Error Scenario Tests

- [ ] Export without session ID (401 Unauthorized)
- [ ] Export beyond rate limit (429 Too Many Requests)
- [ ] Export without consent (403 Forbidden)
- [ ] Delete without confirmation (400 Bad Request)
- [ ] Delete without consent (403 Forbidden)
- [ ] Invalid export format (400 Bad Request)
- [ ] Invalid entity ID (404 Not Found)

---

## Error Handling

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid session ID |
| 403 | Forbidden | Missing required consent |
| 404 | Not Found | Entity not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additionalInfo": "value"
    }
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait until reset time |
| `CONSENT_REQUIRED` | Missing consent | Grant required consent |
| `INVALID_SESSION` | Session expired | Login again |
| `EXPORT_FAILED` | Export operation failed | Check logs, retry |
| `DELETION_FAILED` | Deletion operation failed | Contact support |
| `INVALID_FORMAT` | Unsupported format | Use supported format |

---

## Security Considerations

### Data Protection

1. **Encryption at Rest:**
   - 11 database fields encrypted with AES-256-GCM
   - Automatically decrypted during export

2. **Encryption in Transit:**
   - All HTTP requests use session-based authentication
   - Consider HTTPS for production

3. **Access Control:**
   - Session-based authorization
   - Users can only access their own data
   - Consent requirements enforced

### Audit Logging

All GDPR operations are logged:
- Export requests
- Deletion requests
- Consent changes
- Rate limit violations

**Audit Log Fields:**
- Timestamp
- User ID
- Operation type
- Success/failure
- IP address (if available)
- User agent

### Compliance

1. **Data Retention:**
   - Audit logs preserved indefinitely (legal requirement)
   - Consent records preserved indefinitely (legal requirement)
   - User data deleted upon request

2. **Right to Erasure Exceptions:**
   - Audit logs (legal obligation)
   - Consent records (legal obligation)
   - Anonymous usage statistics (legitimate interest)

3. **Data Portability:**
   - Machine-readable JSON format
   - Complete data across all tables
   - Encrypted fields decrypted

---

## Migration Checklist

If migrating from Electron IPC to HTTP API:

- [ ] Update all `window.justiceAPI.exportUserData()` calls to `apiClient.gdpr.exportData()`
- [ ] Update all `window.justiceAPI.deleteUserData()` calls to `apiClient.gdpr.deleteData()`
- [ ] Update all `window.justiceAPI.getConsents()` calls to `apiClient.gdpr.getConsents()`
- [ ] Update all `window.justiceAPI.updateConsent()` calls to `apiClient.gdpr.updateConsent()`
- [ ] Update all `window.justiceAPI.exportCase()` calls to `apiClient.export.exportCase()`
- [ ] Update all `window.justiceAPI.exportEvidence()` calls to `apiClient.export.exportEvidence()`
- [ ] Replace IPC error handling with HTTP error handling
- [ ] Update component props to include `sessionId`
- [ ] Test all GDPR operations end-to-end
- [ ] Verify rate limiting works
- [ ] Verify consent enforcement works
- [ ] Update documentation

---

## Support

For questions or issues with GDPR compliance features:

1. **Documentation:** Review this guide and API documentation
2. **Testing:** Use provided test procedures to verify functionality
3. **Logs:** Check backend logs at `backend/logs/`
4. **Audit Trail:** Review audit logs for operation history

---

## Changelog

### v2.0.0 (January 2025)
- Migrated from Electron IPC to HTTP REST API
- Added FastAPI backend endpoints
- Created React components (GdprDashboard, ExportMenu, DeleteAccountModal)
- Implemented rate limiting
- Added consent management UI
- Created comprehensive documentation

### v1.0.0 (December 2024)
- Initial GDPR implementation with Electron IPC
- Basic export and deletion functionality
- Consent tracking

---

## References

- [GDPR Official Text](https://gdpr-info.eu/)
- [Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Article 20 - Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Justice Companion Backend API](../backend/routes/gdpr.py)

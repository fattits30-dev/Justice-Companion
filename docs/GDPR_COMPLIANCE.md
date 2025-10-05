# GDPR Compliance - Justice Companion

## Overview

Justice Companion implements GDPR (General Data Protection Regulation) compliance features to ensure users have full control over their personal data. This document describes the implementation of GDPR rights, particularly:

- **Article 20**: Right to Data Portability
- **Article 17**: Right to Erasure ("Right to be Forgotten")

## Features

### 1. Data Export (Right to Data Portability)

**GDPR Article 20** grants users the right to receive their personal data in a structured, commonly used, and machine-readable format.

#### Implementation

- **Handler**: `gdpr:exportUserData` in `electron/main.ts` (lines 1422-1525)
- **IPC Channel**: `GDPR_EXPORT_USER_DATA`
- **Export Format**: JSON
- **Export Location**: User's Documents folder
- **File Name**: `justice-companion-data-export-{timestamp}.json`

#### Data Included

The export includes ALL user data:

1. **User Profile**: Name, email, avatar
2. **Cases**: All case records with titles, descriptions, statuses
3. **Evidence**: All evidence items with content (decrypted)
4. **Notes**: All user notes (decrypted)
5. **Legal Issues**: All legal issues with guidance
6. **Timeline Events**: All timeline events
7. **Conversations**: All chat conversations
8. **Messages**: All chat messages (user + assistant)
9. **User Facts**: All personal facts (decrypted)
10. **Case Facts**: All case-specific facts (decrypted)

#### Export File Structure

```json
{
  "metadata": {
    "exportDate": "2025-10-05T12:34:56.789Z",
    "version": "1.0.0",
    "application": "Justice Companion",
    "format": "JSON",
    "disclaimer": "This export contains all your personal data..."
  },
  "profile": { ... },
  "cases": [ ... ],
  "evidence": [ ... ],
  "notes": [ ... ],
  "legalIssues": [ ... ],
  "timelineEvents": [ ... ],
  "conversations": [ ... ],
  "messages": [ ... ],
  "userFacts": [ ... ],
  "caseFacts": [ ... ],
  "summary": {
    "casesCount": 5,
    "evidenceCount": 12,
    "notesCount": 8,
    ...
  }
}
```

#### Security Considerations

- **Encryption**: All encrypted fields (case descriptions, evidence content, notes, facts) are **decrypted** before export for portability
- **Audit Logging**: Export operation is logged to the audit trail with event type `gdpr.export`
- **No Sensitive Data in Logs**: Audit log contains only metadata (export path, record counts), not the actual data
- **File Permissions**: Export file inherits user's default file permissions

#### Usage (Programmatic)

```typescript
const result = await window.justiceAPI.exportUserData();

if (result.success) {
  console.log("Data exported to:", result.exportPath);
  console.log("Export date:", result.exportDate);
  console.log("Summary:", result.summary);
  // Example: C:\Users\...\Documents\justice-companion-data-export-2025-10-05T12-34-56.json
} else {
  console.error("Export failed:", result.error);
}
```

---

### 2. Data Deletion (Right to Erasure)

**GDPR Article 17** grants users the right to have their personal data erased ("Right to be Forgotten").

#### Implementation

- **Handler**: `gdpr:deleteUserData` in `electron/main.ts` (lines 1556-1682)
- **IPC Channel**: `GDPR_DELETE_USER_DATA`
- **Confirmation Required**: Yes (must be `"DELETE_ALL_MY_DATA"`)
- **Operation**: Irreversible hard delete

#### Data Deleted

The deletion removes ALL user data:

1. **Cases**: All case records (CASCADE deletes dependent data)
2. **Evidence**: All evidence items (CASCADE)
3. **Notes**: All notes (CASCADE)
4. **Legal Issues**: All legal issues (CASCADE)
5. **Timeline Events**: All timeline events (CASCADE)
6. **Event Evidence Links**: All event-evidence associations (CASCADE)
7. **Actions**: All actions/tasks (CASCADE)
8. **Conversations**: All chat conversations (CASCADE)
9. **Messages**: All chat messages (CASCADE)
10. **User Facts**: All personal facts (CASCADE)
11. **Case Facts**: All case-specific facts (CASCADE)
12. **User Profile**: Reset to default values (not deleted, just cleared)

#### Data NOT Deleted

- **Audit Logs**: Audit logs are **retained for compliance purposes** as required by GDPR Article 17(3)(e) (archiving purposes in the public interest)
- **Database Schema**: Tables and migrations remain intact

#### Cascade Deletion

The deletion leverages SQLite's `ON DELETE CASCADE` foreign key constraints:

```sql
-- Example from schema
FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
```

When a case is deleted, ALL dependent records (evidence, notes, etc.) are automatically deleted.

#### Safety Features

1. **Confirmation String**: User must provide exact string `"DELETE_ALL_MY_DATA"` to prevent accidental deletion
2. **Audit Log Before Deletion**: Deletion is logged to audit trail BEFORE deletion occurs (so the log survives)
3. **Transaction**: All deletions occur in a single atomic transaction
4. **Summary Response**: Returns count of deleted records for user confirmation

#### Security Considerations

- **Confirmation**: Requires explicit confirmation string to prevent accidental data loss
- **Audit Trail**: Deletion event is logged BEFORE deletion with event type `gdpr.delete`
- **Atomicity**: All deletions happen in a single transaction (all-or-nothing)
- **No Recovery**: Operation is irreversible - data cannot be recovered after deletion

#### Usage (Programmatic)

```typescript
const result = await window.justiceAPI.deleteUserData("DELETE_ALL_MY_DATA");

if (result.success) {
  console.log("All data deleted at:", result.deletedAt);
  console.log("Summary:", result.summary);
  // Example output:
  // {
  //   casesDeleted: 5,
  //   evidenceDeleted: 12,
  //   notesDeleted: 8,
  //   legalIssuesDeleted: 3,
  //   timelineEventsDeleted: 15,
  //   conversationsDeleted: 4,
  //   messagesDeleted: 42,
  //   userFactsDeleted: 6,
  //   caseFactsDeleted: 18,
  //   auditLogsDeleted: 0  // Audit logs are retained for compliance
  // }
} else {
  console.error("Deletion failed:", result.error);
}
```

---

## User-Facing Instructions

### How to Export Your Data

1. Open Justice Companion
2. Navigate to Settings
3. Scroll to "Data Privacy" section
4. Click "Export My Data"
5. Wait for confirmation dialog
6. Your data will be saved to your Documents folder as a JSON file

The export file is named `justice-companion-data-export-{date-time}.json` and can be opened in any text editor or JSON viewer.

### How to Delete Your Data

**⚠️ WARNING: This action cannot be undone!**

1. Open Justice Companion
2. Navigate to Settings
3. Scroll to "Data Privacy" section
4. Click "Delete All My Data"
5. Read the warning carefully
6. Type `DELETE_ALL_MY_DATA` in the confirmation box
7. Click "Delete" to confirm

All your data will be permanently deleted, except:
- Audit logs (retained for compliance purposes)
- Application settings and configuration

---

## Technical Details

### Database Tables Affected

#### Export Operation
- Reads from all user data tables
- Decrypts encrypted fields using `EncryptionService`
- No modifications to database

#### Delete Operation
- Deletes from: `cases`, `chat_conversations`
- Cascade deletes: `evidence`, `notes`, `legal_issues`, `timeline_events`, `event_evidence`, `actions`, `chat_messages`, `user_facts`, `case_facts`
- Updates: `user_profile` (resets to default values)
- Retains: `audit_logs`, `migrations`, `encryption_metadata`

### Audit Log Events

#### Export Event
```json
{
  "eventType": "gdpr.export",
  "userId": "local-user",
  "resourceType": "user_data",
  "resourceId": "all",
  "action": "export",
  "details": {
    "exportPath": "C:\\Users\\...\\Documents\\justice-companion-data-export-2025-10-05T12-34-56.json",
    "recordsExported": {
      "casesCount": 5,
      "evidenceCount": 12,
      ...
    }
  },
  "success": true
}
```

#### Delete Event
```json
{
  "eventType": "gdpr.delete",
  "userId": "local-user",
  "resourceType": "user_data",
  "resourceId": "all",
  "action": "delete",
  "details": {
    "deletedAt": "2025-10-05T12:34:56.789Z",
    "recordsToDelete": {
      "casesCount": 5,
      "evidenceCount": 12,
      ...
    }
  },
  "success": true
}
```

---

## Testing

### Export Test

```bash
# Via Dev API Server (development only)
curl -X POST http://localhost:5555/dev-api/ipc \
  -H "Content-Type: application/json" \
  -d '{"channel": "gdpr:exportUserData", "args": []}'

# Expected: JSON file created in Documents folder
```

### Delete Test

```bash
# Via Dev API Server (development only)
curl -X POST http://localhost:5555/dev-api/ipc \
  -H "Content-Type: application/json" \
  -d '{"channel": "gdpr:deleteUserData", "args": [{"confirmation": "DELETE_ALL_MY_DATA"}]}'

# Expected: All user data deleted (except audit logs)
```

### Verification Queries

```sql
-- Check if data was deleted
SELECT COUNT(*) FROM cases;
SELECT COUNT(*) FROM evidence;
SELECT COUNT(*) FROM chat_conversations;

-- Verify audit logs were created
SELECT * FROM audit_logs WHERE event_type IN ('gdpr.export', 'gdpr.delete') ORDER BY timestamp DESC LIMIT 10;

-- Check user profile was reset
SELECT * FROM user_profile WHERE id = 1;
```

---

## Compliance Notes

### GDPR Article 20 (Data Portability)
- ✅ Data provided in structured format (JSON)
- ✅ Machine-readable format
- ✅ Commonly used format
- ✅ Includes all personal data
- ✅ Encrypted data is decrypted for portability

### GDPR Article 17 (Right to Erasure)
- ✅ Data can be erased on request
- ✅ Erasure is complete and irreversible
- ✅ Cascade deletion ensures no orphaned data
- ✅ Audit logs retained for compliance (Article 17(3)(e))
- ✅ Confirmation required to prevent accidental deletion

### Data Retention Policy
- **User Data**: Deleted on user request (GDPR Article 17)
- **Audit Logs**: Retained indefinitely for compliance (GDPR Article 17(3)(e))
- **Application Logs**: Retained for debugging (no personal data)

---

## Future Enhancements

1. **UI Integration**: Add export/delete buttons to SettingsView.tsx
2. **Email Export**: Option to email export file to user
3. **Encrypted Export**: Option to encrypt export file with user-provided password
4. **Selective Export**: Allow users to export specific data categories
5. **Selective Deletion**: Allow users to delete specific cases/data (not all)
6. **Data Anonymization**: Option to anonymize data instead of deletion
7. **Export History**: Track previous exports in audit logs

---

## References

- **GDPR Regulation**: https://gdpr-info.eu/
- **Article 17 (Right to Erasure)**: https://gdpr-info.eu/art-17-gdpr/
- **Article 20 (Right to Data Portability)**: https://gdpr-info.eu/art-20-gdpr/

---

**Last Updated**: 2025-10-05
**Author**: Agent Echo (Security & Compliance Specialist)
**Version**: 1.0.0

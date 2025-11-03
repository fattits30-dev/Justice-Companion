# CRITICAL Security Issues - GitHub Issue Templates

**Generated:** 2025-11-03
**Source:** TECHNICAL_DEBT_BACKLOG.md TODO analysis
**Action Required:** Create these 4 GitHub issues immediately

---

## Issue 1: [CRITICAL] Implement Session Management & Authorization (CVSS 9.8)

**Labels:** `security`, `critical`, `authentication`, `authorization`

### Summary

**CRITICAL SECURITY VULNERABILITY** - Authorization checks are bypassed. The `isAuthenticated()` function always returns `true`, allowing unauthenticated users to access all IPC handlers.

**Related TODOs:**
- `electron/utils/audit-helper.ts:120-124` - Session-based user ID extraction
- `electron/utils/audit-helper.ts:131-135` - Session validation

### Impact

**CVSS 9.8 - Critical**

- Any process can call IPC handlers without authentication
- No authorization layer protects sensitive data
- Audit logs cannot track which user performed actions (all show `userId: null`)
- GDPR compliance broken (cannot track data access or investigate security incidents)
- No user accountability in audit logs

### Current Implementation

```typescript
export function getUserIdFromEvent(_event: IpcMainInvokeEvent): string | null {
  // TODO: Implement session-based user ID extraction
  // For now, return null (will be implemented in Phase 2)
  return null;
}

export function isAuthenticated(_event: IpcMainInvokeEvent): boolean {
  // TODO: Implement session validation
  // For now, return true (will be implemented in Phase 2)
  return true;
}
```

### Proposed Solution

#### 1. Create SessionManager Service
- Implement in-memory or database-backed session store
- Map sessionId → userId
- Track session creation time and expiration (24 hours)
- Handle session cleanup and expiration

#### 2. Implement Session Validation
- Extract sessionId from IPC event context
- Look up userId from session store
- Validate session exists and is not expired
- Return false if session invalid or expired

#### 3. Update IPC Handlers
- Pass sessionId to all IPC handlers
- Use `requireAuth()` middleware to enforce authentication
- Add audit logging for failed auth attempts

#### 4. Integrate with AuthContext
- Store sessionId in React context after login
- Include sessionId in all IPC calls
- Handle session expiration gracefully in UI

### Effort Estimate

**Large: 24-32 hours**
- SessionManager implementation: 8-10 hours
- IPC handler updates: 6-8 hours
- AuthContext integration: 4-6 hours
- Testing (unit + E2E): 6-8 hours

### Dependencies

- Must be implemented before production release
- Blocks multi-user support
- Required for GDPR compliance

### Acceptance Criteria

- [ ] Unauthenticated requests rejected with 401 error
- [ ] Expired sessions automatically invalidated
- [ ] All audit events include correct userId
- [ ] Session validation works across all IPC handlers
- [ ] Failed authentication attempts logged
- [ ] All sensitive IPC handlers protected
- [ ] Session expires after 24 hours (per security requirements)
- [ ] Unauthorized access logged and blocked

### Testing Requirements

- [ ] Unit tests for SessionManager
- [ ] E2E tests for login/logout flow with session validation
- [ ] Test unauthorized access scenarios
- [ ] Test session expiration handling
- [ ] Load test session store with 1000+ concurrent sessions

### References

- OWASP Top 10: A01:2021 - Broken Access Control
- Justice Companion CLAUDE.md - Security Architecture
- TECHNICAL_DEBT_BACKLOG.md - TODO #2 and #3

---

## Issue 2: [CRITICAL] Complete Database Migration System

**Labels:** `database`, `critical`, `migrations`, `data-integrity`

### Summary

The `db:migrate` IPC handler is a placeholder that doesn't actually run migrations. Users calling this handler believe migrations are executed, but nothing happens.

**Location:** `electron/ipc-handlers/database.ts:68-70`

### Context

```typescript
// TODO: Create backup before migration
// TODO: Call runMigrations() from migrate.ts
// TODO: Return detailed migration results
```

### Impact

- Users cannot upgrade database schema
- Migration failures are not detected
- No rollback mechanism if migrations fail
- Silent failure leads to schema inconsistencies
- Production deployments at risk (schema drift)

### Current Implementation

The `db:migrate` IPC handler is a stub that returns success without executing migrations:

```typescript
ipcMain.handle('db:migrate', async () => {
  try {
    // TODO: Create backup before migration
    // TODO: Call runMigrations() from migrate.ts
    // TODO: Return detailed migration results
    return successResponse({ message: 'Migrations completed' });
  } catch (error) {
    return errorResponse(IPCErrorCode.DATABASE_ERROR, 'Migration failed');
  }
});
```

### Proposed Solution

#### 1. Import Migration System
```typescript
import { runMigrations } from '../../src/db/migrate.ts';
import { createBackup } from './backup-helper.ts'; // Use existing backup system
```

#### 2. Implement Pre-Migration Backup
- Call existing `db:backup` handler before migrations
- Verify backup integrity
- Store backup metadata (timestamp, schema version)

#### 3. Execute Migrations
- Call `runMigrations()` from `src/db/migrate.ts`
- Capture migration results (success/failure for each migration)
- Track applied migration IDs

#### 4. Return Detailed Results
```typescript
interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  errors: string[];
  backupPath: string;
  duration: number;
}
```

#### 5. Implement Rollback on Failure
- If any migration fails, restore from pre-migration backup
- Log rollback event to audit log
- Return detailed error information

#### 6. Add Audit Logging
- Log migration start/end events
- Track which migrations were applied
- Log any errors or rollbacks

### Effort Estimate

**Medium: 8-12 hours**
- Integration with migrate.ts: 2-3 hours
- Backup integration: 1-2 hours
- Error handling and rollback: 3-4 hours
- Audit logging: 1 hour
- Testing: 2-3 hours

### Dependencies

- Requires `src/db/migrate.ts` integration
- Needs pre-migration backup system (already exists via `db:backup`)
- Must implement migration result tracking

### Acceptance Criteria

- [ ] Migrations actually run when `db:migrate` is called
- [ ] Automatic backup created before migration
- [ ] Detailed results returned (migrations applied, errors)
- [ ] Audit log entry created for migration events
- [ ] Failed migrations trigger automatic rollback
- [ ] Schema version tracked in database
- [ ] Idempotent (safe to run multiple times)

### Testing Requirements

- [ ] Unit test: Successful migration applies schema changes
- [ ] Unit test: Failed migration triggers rollback
- [ ] Unit test: Backup created before migration
- [ ] Integration test: Multi-step migration sequence
- [ ] E2E test: Full migration flow from UI

### References

- TECHNICAL_DEBT_BACKLOG.md - TODO #1
- `src/db/migrate.ts` - Migration runner implementation
- Drizzle ORM Migration Documentation

---

## Issue 3: [CRITICAL] Add File Upload Validation for Evidence

**Labels:** `security`, `critical`, `file-upload`, `evidence`

### Summary

Users can upload any file type without validation. No file size limits enforced. PDF/DOCX text extraction not implemented (breaks search functionality).

**Location:** `electron/ipc-handlers/evidence.ts:40-41`

### Context

```typescript
// TODO: Validate file type and size if filePath provided
// TODO: Extract text if PDF/DOCX
```

### Impact

- **Security Risk:** Users can upload executable files (malware vector)
- **Disk Exhaustion:** Large files can exhaust disk space (no size limits)
- **Broken Search:** Search doesn't work on PDF/DOCX evidence (major UX issue)
- **No Preview:** No preview generation for documents
- **Compliance Risk:** Cannot verify file integrity for legal evidence

### Current Implementation

No validation is performed on uploaded files:

```typescript
const evidence = await evidenceRepository.create({
  caseId,
  title,
  description,
  filePath, // No validation - accepts any file
  fileType,
  uploadedBy,
});
```

### Proposed Solution

#### 1. Add File Type Validation

Install dependencies:
```bash
pnpm add file-type pdf-parse mammoth
pnpm add -D @types/pdf-parse
```

Implement validation:
```typescript
import { fileTypeFromFile } from 'file-type';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'image/jpeg',
  'image/png',
  'video/mp4',
  'audio/mpeg',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB (configurable)

async function validateFile(filePath: string): Promise<void> {
  const fileType = await fileTypeFromFile(filePath);
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new ValidationError('File type not allowed');
  }

  const stats = await fs.promises.stat(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new ValidationError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
}
```

#### 2. Extract Text from Documents

```typescript
async function extractText(filePath: string, fileType: string): Promise<string | null> {
  if (fileType === 'application/pdf') {
    const dataBuffer = await fs.promises.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (fileType === 'text/plain') {
    return await fs.promises.readFile(filePath, 'utf-8');
  }
  return null;
}
```

#### 3. Integrate with DocumentParserService

The `DocumentParserService` already exists in the codebase. Use it:

```typescript
import { DocumentParserService } from '../../src/services/DocumentParserService.ts';

const parserService = new DocumentParserService();
const extractedText = await parserService.parseDocument(filePath);
```

#### 4. Store Extracted Text

Update database schema to include extracted text:

```typescript
const evidence = await evidenceRepository.create({
  caseId,
  title,
  description,
  filePath,
  fileType: validatedFileType,
  extractedText, // Store for FTS5 search
  uploadedBy,
});
```

#### 5. Index in Full-Text Search

Ensure FTS5 index includes `extracted_text`:

```sql
CREATE VIRTUAL TABLE evidence_fts USING fts5(
  title,
  description,
  extracted_text, -- Add this field
  content='evidence',
  content_rowid='id'
);
```

#### 6. Add Audit Logging

Log rejected uploads:

```typescript
if (!isValidFileType) {
  auditLogger.log({
    userId,
    action: 'FILE_UPLOAD_REJECTED',
    resource: 'evidence',
    details: `Rejected file: ${filePath} (type: ${fileType})`,
  });
  throw new ValidationError('File type not allowed');
}
```

### Effort Estimate

**Medium: 8-12 hours**
- File type validation: 2-3 hours
- Text extraction integration: 3-4 hours
- FTS5 search integration: 2 hours
- Audit logging: 1 hour
- Testing: 2-3 hours

### Dependencies

- Requires `file-type`, `pdf-parse`, `mammoth` packages
- Must integrate with `DocumentParserService` (already exists)
- Requires FTS5 index update

### Acceptance Criteria

- [ ] Only whitelisted file types allowed (.pdf, .docx, .txt, .jpg, .png, .mp4, .mp3)
- [ ] File size limit enforced (100MB default, configurable)
- [ ] Executable files rejected (.exe, .bat, .sh, .ps1)
- [ ] Text extracted from PDF/DOCX files
- [ ] Extracted text stored in `evidence.extracted_text` field
- [ ] Extracted text indexed in FTS5 search
- [ ] Rejected uploads logged to audit log
- [ ] Clear error messages for invalid files

### Testing Requirements

- [ ] Unit test: Validate allowed file types
- [ ] Unit test: Reject disallowed file types
- [ ] Unit test: Enforce file size limits
- [ ] Unit test: Extract text from PDF
- [ ] Unit test: Extract text from DOCX
- [ ] Integration test: Upload and search extracted text
- [ ] E2E test: Upload evidence file and verify search works

### Security Considerations

- **MIME Type Validation:** Use `file-type` library (magic number detection) instead of file extension
- **Path Traversal Prevention:** Validate file paths to prevent directory traversal attacks
- **Virus Scanning:** Consider integrating ClamAV or similar for antivirus scanning (future enhancement)
- **File Integrity:** Store SHA-256 hash of uploaded files for integrity verification

### References

- OWASP: Unrestricted File Upload
- TECHNICAL_DEBT_BACKLOG.md - TODO #4
- `src/services/DocumentParserService.ts` - Existing text extraction service

---

## Issue 4: [HIGH] Add Input Validation Schemas (Zod)

**Labels:** `security`, `high`, `validation`, `data-integrity`

### Summary

Multiple IPC handlers lack proper input validation. This creates data integrity risks and potential security vulnerabilities.

**Locations:**
- `electron/middleware/ValidationMiddleware.ts:11` - Schema registry not implemented
- Multiple IPC handlers missing Zod validation

### Context

```typescript
// TODO: Implement schema registry for common validations
```

### Impact

- **Data Integrity:** Invalid data can be inserted into database
- **Type Safety:** Runtime type mismatches not caught
- **Security:** Potential SQL injection or XSS vectors
- **Developer Experience:** No autocomplete for validation schemas
- **Error Messages:** Generic errors instead of field-specific validation messages

### Current State

Many IPC handlers accept raw user input without validation:

```typescript
ipcMain.handle('cases:create', async (_event, caseData) => {
  // No validation - assumes caseData is valid
  const newCase = await caseRepository.create(caseData);
  return successResponse(newCase);
});
```

### Proposed Solution

#### 1. Create Validation Schema Registry

Create `electron/schemas/index.ts`:

```typescript
import { z } from 'zod';

export const CaseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'closed']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.number().int().positive().optional(),
});

export const EvidenceCreateSchema = z.object({
  caseId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  filePath: z.string().optional(),
  fileType: z.string().optional(),
});

export const DeadlineCreateSchema = z.object({
  caseId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  dueDate: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high']),
  notificationEnabled: z.boolean().default(true),
});

// Add schemas for all IPC handlers
```

#### 2. Implement ValidationMiddleware

Update `electron/middleware/ValidationMiddleware.ts`:

```typescript
import { z } from 'zod';
import { errorResponse, IPCErrorCode } from '../utils/ipc-response.ts';

export function validateInput<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
}

export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (validatedData: z.infer<T>) => Promise<any>
) {
  return async (_event: any, data: unknown) => {
    try {
      const validatedData = validateInput(schema, data);
      return await handler(validatedData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Validation failed')) {
        return errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
      }
      return errorResponse(IPCErrorCode.UNKNOWN_ERROR, 'Request failed');
    }
  };
}
```

#### 3. Apply Validation to IPC Handlers

Example for cases:

```typescript
import { CaseCreateSchema, CaseUpdateSchema } from '../schemas/index.ts';
import { withValidation } from '../middleware/ValidationMiddleware.ts';

ipcMain.handle(
  'cases:create',
  withValidation(CaseCreateSchema, async (validatedData) => {
    const newCase = await caseRepository.create(validatedData);
    return successResponse(newCase);
  })
);

ipcMain.handle(
  'cases:update',
  withValidation(CaseUpdateSchema, async (validatedData) => {
    const { id, ...updateData } = validatedData;
    const updatedCase = await caseRepository.update(id, updateData);
    return successResponse(updatedCase);
  })
);
```

#### 4. Add Validation to All Critical Handlers

Priority order:
1. **Auth handlers** (register, login) - Highest priority
2. **GDPR handlers** (export, delete) - Compliance critical
3. **Data mutation handlers** (create, update, delete)
4. **File upload handlers** (evidence, documents)
5. **Search/query handlers** (lower priority)

### Effort Estimate

**Medium: 12-16 hours**
- Schema registry creation: 3-4 hours (20+ schemas)
- ValidationMiddleware implementation: 2 hours
- Apply to all IPC handlers: 5-7 hours (50+ handlers)
- Testing: 2-3 hours

### Dependencies

- Zod already installed (listed in package.json)
- Requires ErrorBoundary for UI error handling
- Must coordinate with frontend validation

### Acceptance Criteria

- [ ] Schema registry created with 20+ validation schemas
- [ ] ValidationMiddleware implemented and tested
- [ ] All auth handlers use validation
- [ ] All GDPR handlers use validation
- [ ] All data mutation handlers use validation
- [ ] File upload handlers validate file metadata
- [ ] Clear field-specific error messages returned to UI
- [ ] Validation errors logged to audit log (security events)

### Testing Requirements

- [ ] Unit test: Each schema validates correct data
- [ ] Unit test: Each schema rejects invalid data
- [ ] Unit test: ValidationMiddleware returns correct errors
- [ ] Integration test: IPC handler rejects invalid input
- [ ] E2E test: UI displays validation errors correctly

### Example Validation Errors

Good error messages:
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed: title: String must contain at least 1 character(s), priority: Invalid enum value. Expected "low" | "medium" | "high", received "urgent"'
  }
}
```

### References

- Zod Documentation: https://zod.dev
- TECHNICAL_DEBT_BACKLOG.md - TODO in ValidationMiddleware.ts:11
- Justice Companion CLAUDE.md - Validation Architecture

---

## Next Steps

1. **Create GitHub issues** - Copy each issue template above into a new GitHub issue
2. **Assign priority labels** - All 4 are CRITICAL or HIGH priority
3. **Start with Session Management** - This blocks the other issues (CVSS 9.8)
4. **Create milestones** - Group into Sprint 1 (Session + Migration) and Sprint 2 (File Upload + Validation)

## Priority Order for Implementation

1. **Issue 1: Session Management** (CVSS 9.8) - **START HERE**
2. **Issue 2: Database Migration** - Unblocks schema upgrades
3. **Issue 3: File Upload Validation** - Prevents malware uploads
4. **Issue 4: Input Validation Schemas** - Improves data integrity

## Total Effort

- **Session Management:** 24-32 hours
- **Database Migration:** 8-12 hours
- **File Upload Validation:** 8-12 hours
- **Input Validation:** 12-16 hours

**Total:** 52-72 hours (1.5-2 sprint cycles)

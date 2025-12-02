# 🧹 Cleanup: Remove 218 Dead Imports Across Codebase

## Summary

Automated scan found **218 unused imports** across **62 files** in the codebase. These are imports that are declared but never used, adding unnecessary bloat and slowing down builds/linting.

| Location                  | Files Scanned | Files with Issues | Dead Imports |
| ------------------------- | ------------- | ----------------- | ------------ |
| `src/` (TypeScript/React) | 655           | 22                | 22           |
| `backend/` (Python)       | 195           | 31                | 172          |
| `ai-service/` (Python)    | 22            | 9                 | 24           |
| **TOTAL**                 | **872**       | **62**            | **218**      |

## Priority

- **Priority**: Medium
- **Type**: Tech Debt / Code Quality
- **Effort**: Low (mostly automated with `--fix` flag)

## Scripts Available

Two cleanup scripts have been created:

```bash
# TypeScript/React dead imports
node scripts/find-dead-imports.mjs src --fix

# Python dead imports (backend)
python scripts/find-dead-imports-python.py backend --fix

# Python dead imports (ai-service)
python scripts/find-dead-imports-python.py ai-service --fix
```

Running with `--fix` will:

1. Create `.bak` backup files
2. Remove dead imports automatically
3. For multi-import lines, only remove the dead ones

---

## TypeScript/React Dead Imports (22)

All of these are legacy `import React from 'react'` statements that are no longer needed since React 17's new JSX transform.

### Components - Deadlines

- [ ] `src/components/deadlines/DeadlineBadge.js` - Line 6: `React` (default)
- [ ] `src/components/deadlines/DeadlinePriorityBadge.js` - Line 6: `React` (default)
- [ ] `src/components/deadlines/DeadlineStatusBadge.js` - Line 6: `React` (default)
- [ ] `src/components/deadlines/DeadlineWidget.js` - Line 6: `React` (default)

### Components - Export

- [ ] `src/components/export/ExportMenu.js` - Line 9: `React` (default)

### Components - GDPR

- [ ] `src/components/gdpr/DeleteAccountModal.js` - Line 9: `React` (default)
- [ ] `src/components/gdpr/GdprDashboard.js` - Line 12: `React` (default)

### Components - Notifications

- [ ] `src/components/notifications/NotificationBadge.js` - Line 18: `React` (default)
- [ ] `src/components/notifications/NotificationCard.js` - Line 24: `React` (default)
- [ ] `src/components/notifications/NotificationCenter.js` - Line 25: `React` (default)
- [ ] `src/components/notifications/NotificationPreferences.js` - Line 19: `React` (default)

### Components - Other

- [ ] `src/components/PortStatusMonitor.js` - Line 1: `React` (default)

### Components - Tags

- [ ] `src/components/tags/TagColorPicker.js` - Line 5: `React` (default)
- [ ] `src/components/tags/TagSelector.js` - Line 5: `React` (default)

### Components - Templates

- [ ] `src/components/templates/TemplateCard.js` - Line 7: `React` (default)
- [ ] `src/components/templates/TemplateLibrary.js` - Line 7: `React` (default)

### Components - UI

- [ ] `src/components/ui/ConfirmationModal.js` - Line 1: `React` (default)
- [ ] `src/components/ui/TagBadge.js` - Line 5: `React` (default)

### Library / Examples

- [ ] `src/lib/examples/apiClientUsage.js` - Line 12: `React` (default)

### Types

- [ ] `src/types/window.d.ts` - Line 25: `_logger` (named)

### Views - Settings

- [ ] `src/views/settings/AIServiceSettings.js` - Line 6: `React` (default)
- [ ] `src/views/settings/RoleManagementTab.js` - Line 1: `React` (default)

---

## Python Backend Dead Imports (172)

### Core Files

#### `backend/conftest.py`

- [ ] Line 51: `Conversation` (from backend.models.chat)
- [ ] Line 51: `Message` (from backend.models.chat)

#### `backend/main.py`

- [ ] Line 40: `action_logs_router` (from backend.routes.action_logs)

### Models

#### `backend/models/backup.py`

- [ ] Line 23: `User` (from backend.models.user)

#### `backend/models/base.py` (13 dead imports)

- [ ] Line 95: `user` (from backend.models)
- [ ] Line 95: `session` (from backend.models)
- [ ] Line 95: `case` (from backend.models)
- [ ] Line 95: `evidence` (from backend.models)
- [ ] Line 95: `deadline` (from backend.models)
- [ ] Line 95: `tag` (from backend.models)
- [ ] Line 95: `template` (from backend.models)
- [ ] Line 95: `chat` (from backend.models)
- [ ] Line 95: `profile` (from backend.models)
- [ ] Line 95: `consent` (from backend.models)
- [ ] Line 95: `notification` (from backend.models)
- [ ] Line 95: `backup` (from backend.models)
- [ ] Line 95: `ai_provider_config` (from backend.models)

#### `backend/models/case.py`

- [ ] Line 19: `User` (from backend.models.user)

#### `backend/models/template.py`

- [ ] Line 16: `Case` (from backend.models.case)

#### `backend/models/user.py`

- [ ] Line 18: `NotificationPreferences` (from backend.models.notification)
- [ ] Line 22: `UserProfile` (from backend.models.profile)

#### `backend/models/__init__.py` (19 dead imports - barrel exports)

- [ ] Line 5: `AIProviderConfig`
- [ ] Line 6: `BackupSettings`
- [ ] Line 7: `Base`
- [ ] Line 8: `Case`
- [ ] Line 9: `Conversation`, `Message`
- [ ] Line 10: `Consent`, `ConsentType`
- [ ] Line 11: `Deadline`
- [ ] Line 12: `Evidence`
- [ ] Line 13: `Notification`, `NotificationPreferences`
- [ ] Line 14: `PasswordResetToken`
- [ ] Line 15: `UserProfile`
- [ ] Line 16: `Session`
- [ ] Line 17: `Tag`
- [ ] Line 18: `CaseTemplate`, `TemplateUsage`
- [ ] Line 19: `User`

### Repositories

#### `backend/repositories/evidence_repository.py`

- [ ] Line 15: `datetime` (from datetime)

#### `backend/repositories/__init__.py` (5 dead imports)

- [ ] Line 15: `BaseRepository`
- [ ] Line 16: `CaseRepository`
- [ ] Line 17: `EvidenceRepository`
- [ ] Line 18: `DeadlineRepository`
- [ ] Line 19: `DashboardRepository`

### Routes

#### `backend/routes/auth.py`

- [ ] Line 50: `UserResponse`, `SessionResponse`, `RateLimitInfo`

#### `backend/routes/cases.py` (8 dead imports)

- [ ] Line 29: `datetime`
- [ ] Line 40: `CaseUpdate`
- [ ] Line 60: `PaginationMetadata`, `CaseListResponse`, `VALID_CASE_TYPES`, `VALID_CASE_STATUSES`, `VALID_FACT_CATEGORIES`, `VALID_IMPORTANCE_LEVELS`

#### `backend/routes/chat.py`

- [ ] Line 51: `AIProviderConfig`

#### `backend/routes/deadlines.py`

- [ ] Line 41: `get_encryption_service`

#### `backend/routes/search.py` (6 dead imports)

- [ ] Line 17: `datetime`
- [ ] Line 34: `SearchResultItem`, `VALID_ENTITY_TYPES`, `VALID_SORT_BY`, `VALID_SORT_ORDER`, `VALID_CASE_STATUSES`

#### `backend/routes/__init__.py`

- [ ] Line 5: `auth_router`
- [ ] Line 6: `gdpr_router`
- [ ] Line 7: `search_router`

### Services

#### `backend/services/ai/__init__.py` (15 dead imports - deferred v2.0)

- [ ] Line 12: `UnifiedAIService`, `UKJurisdiction`, `LegalCaseType`, `DocumentType`, `ActionPriority`, `IssueSeverity`, `EvidenceImportance`
- [ ] Line 21: `AIServiceFactory`
- [ ] Line 22: `RAGService`
- [ ] Line 23: `AIProviderConfigService`
- [ ] Line 24: `AIToolDefinitions`
- [ ] Line 25: `AISDKService`
- [ ] Line 26: `StubAIService`
- [ ] Line 27: `PythonAIClient`
- [ ] Line 28: `ModelDownloadService`

#### `backend/services/ai_service_client.py`

- [ ] Line 11: `BaseModel` (from pydantic)

#### `backend/services/auth/__init__.py` (4 dead imports)

- [ ] Line 11: `AuthenticationError`
- [ ] Line 12: `AuthorizationService`
- [ ] Line 13: `SessionManager`
- [ ] Line 14: `SessionPersistenceService`

#### `backend/services/backup/__init__.py` (3 dead imports)

- [ ] Line 3: `BackupService`
- [ ] Line 4: `BackupRetentionPolicy`
- [ ] Line 5: `BackupScheduler`

#### `backend/services/date_extraction_service.py`

- [ ] Line 10: `datetime`

#### `backend/services/export/__init__.py` (7 dead imports)

- [ ] Line 9: `TemplateEngine`, `Template`, `TemplateTimelineEvent`, `TemplateCaseExportData`, `TemplateEvidenceExportData`, `TemplateTimelineExportData`, `TemplateNotesExportData`

#### `backend/services/gdpr/__init__.py` (15 dead imports)

- [ ] Line 12: `DataDeleter`, `GdprDeleteOptions`, `GdprDeleteResult`
- [ ] Line 13: `DataExporter`, `TableExport`, `ExportMetadata`, `UserDataExport`, `GdprExportOptions`
- [ ] Line 20: `GdprService`, `GdprExportResult`, `GdprDeleteResultExtended`, `RateLimitError`, `ConsentRequiredError`, `GdprOperationError`, `create_gdpr_service`

#### `backend/services/profile_service.py`

- [ ] Line 28: `datetime`

#### `backend/services/security/__init__.py` (9 dead imports)

- [ ] Line 11: `EncryptionService`, `EncryptedData`
- [ ] Line 12: `DecryptionCache`
- [ ] Line 13: `KeyManager`, `KeyManagerError`, `KeyEncryptionNotAvailableError`
- [ ] Line 14: `SecureStorageService`, `SecureStorageError`, `EncryptionNotAvailableError`

#### `backend/services/__init__.py` (43 dead imports - massive barrel file)

- [ ] Lines 14-65: Multiple AI, Auth, Security, and utility service exports

### Tests

#### `backend/tests/routes/test_ai_config_routes.py`

- [ ] Line 25: `secrets`

#### `backend/tests/routes/test_profile_routes.py`

- [ ] Line 15: `uuid`

#### `backend/tests/services/ai/python_ai_client.py`

- [ ] Line 9: `Mock` (from unittest.mock)

#### `backend/tests/test_routes_tags.py`

- [ ] Line 27: `text` (from sqlalchemy)

#### `backend/test_logs.py`

- [ ] Line 6: `os`

---

## AI Service Dead Imports (24)

### Agents

#### `ai-service/agents/__init__.py`

- [ ] Line 7: `BaseAgent`, `AgentResponse`
- [ ] Line 8: `OrchestratorAgent`

### Main

#### `ai-service/main.py`

- [ ] Line 12: `os`

### Prompts

#### `ai-service/prompts/legal/__init__.py`

- [ ] Line 7: `UK_EMPLOYMENT_SYSTEM`, `UK_HOUSING_SYSTEM`, `UK_BENEFITS_SYSTEM`, `UK_DISCRIMINATION_SYSTEM`, `UK_GENERAL_SYSTEM`

#### `ai-service/prompts/__init__.py`

- [ ] Line 7: `UK_EMPLOYMENT_SYSTEM`, `UK_HOUSING_SYSTEM`, `UK_BENEFITS_SYSTEM`, `UK_DISCRIMINATION_SYSTEM`, `UK_GENERAL_SYSTEM`

### Providers

#### `ai-service/providers/huggingface/__init__.py`

- [ ] Line 7: `HuggingFaceClient`

#### `ai-service/providers/__init__.py`

- [ ] Line 7: `HuggingFaceClient`

### Routes

#### `ai-service/routes/vision.py`

- [ ] Line 9: `Field` (from pydantic)
- [ ] Line 12: `base64`

#### `ai-service/routes/__init__.py`

- [ ] Line 7: `chat`, `vision`, `analysis`, `drafting`, `research`

### Tests

#### `ai-service/tests/test_orchestrator.py`

- [ ] Line 14: `get_agent_tools`

---

## Acceptance Criteria

- [ ] All 218 dead imports removed
- [ ] No new TypeScript/ESLint errors introduced
- [ ] No new Python/Flake8 errors introduced
- [ ] All tests still pass
- [ ] Build completes successfully

## Notes

- Many of the Python `__init__.py` dead imports are "barrel exports" - imports meant for re-export but never actually used by consumers. These might indicate over-engineering or can be safely removed.
- The React imports are from before React 17's new JSX transform and are all safe to remove.
- Some dead imports in `backend/services/ai/` are deferred v2.0 features that were never completed.

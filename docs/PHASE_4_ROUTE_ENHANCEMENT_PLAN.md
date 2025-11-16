# Phase 4: Route Enhancement Plan

## Status

**Routes Created:** ✅ All 19 route files exist
**Service Layer:** ✅ 48 services converted (Batches 1-6)
**Integration Status:** ⚠️ Routes need enhancement to use service layer

---

## Current State

### Existing Routes (19 files)
1. `auth.py` - Authentication endpoints
2. `cases.py` - Case management endpoints
3. `dashboard.py` - Dashboard data endpoints
4. `profile.py` - User profile endpoints
5. `evidence.py` - Evidence management endpoints
6. `chat.py` - AI chat endpoints
7. `deadlines.py` - Deadline management endpoints
8. `database.py` - Database operations endpoints
9. `templates.py` - Template management endpoints
10. `export.py` - Export endpoints
11. `gdpr.py` - GDPR compliance endpoints
12. `tags.py` - Tag management endpoints
13. `notifications.py` - Notification endpoints
14. `search.py` - Search endpoints
15. `port_status.py` - Port management endpoints
16. `action_logs.py` - Action logging endpoints
17. `ai_status.py` - AI service status endpoints
18. `ui.py` - UI dialog endpoints
19. `ai_config.py` - AI configuration endpoints

###Available Services (48 converted)
From Batches 1-6:
- **Batch 1:** ChatConversationService, EncryptionService, NotificationService, SearchService, TagService, TemplateService, RateLimitService
- **Batch 2:** BulkOperationService, CitationService, ConsentService, DocumentParserService, ProfileService, UserProfileService, CacheService, SessionPersistenceService
- **Batch 3:** GdprService, DataExporter, DataDeleter, ExportService, PDFGenerator, DOCXGenerator, TemplateEngine, DeadlineReminderScheduler
- **Batch 4:** AIServiceFactory, RAGService, LegalAPIService, UnifiedAIService, ModelDownloadService, AIProviderConfigService, AISDKService, AIToolDefinitions
- **Batch 5:** EnhancedErrorTracker, DecryptionCache, SecureStorageService, ProcessManager, PortManager, StartupMetrics, AutoUpdater, ServiceContainer
- **Batch 6:** AuthorizationService, KeyManager, BackupScheduler, BackupRetentionPolicy, SearchIndexBuilder, TemplateSeeder, PythonAIClient, SessionManager

---

## Enhancement Strategy

### Approach: Service Layer Integration

**Goal:** Replace direct database queries in routes with service layer calls

**Benefits:**
- Separation of concerns (routes handle HTTP, services handle logic)
- Reusable business logic
- Easier testing (mock services, not database)
- Consistent error handling
- Audit logging in one place

### Current Pattern (Anti-Pattern)
```python
# ❌ Direct database query in route
@router.get("/notifications")
async def list_notifications(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM notifications"))
    return result.fetchall()
```

### Target Pattern (Clean Architecture)
```python
# ✅ Service layer call in route
@router.get("/notifications")
async def list_notifications(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    notification_service = NotificationService(db, encryption_service, audit_logger)
    notifications = await notification_service.list_notifications(user_id)
    return notifications
```

---

## Route Enhancement Batches

### Batch 7: Core Routes (High Priority)

| Route File | Services to Integrate | Status |
|------------|----------------------|--------|
| `auth.py` | AuthenticationService, SessionManager, RateLimitService | ⚠️ Needs enhancement |
| `cases.py` | CaseService, BulkOperationService, AuditLogger | ⚠️ Needs enhancement |
| `chat.py` | ChatConversationService, UnifiedAIService, RAGService | ⚠️ Needs enhancement |
| `profile.py` | ProfileService, UserProfileService, EncryptionService | ⚠️ Needs enhancement |

**Estimated Effort:** 4-6 hours with 4 parallel agents

### Batch 8: Feature Routes (Medium Priority)

| Route File | Services to Integrate | Status |
|------------|----------------------|--------|
| `notifications.py` | NotificationService, DeadlineReminderScheduler | ⚠️ Needs enhancement |
| `search.py` | SearchService, SearchIndexBuilder | ⚠️ Needs enhancement |
| `tags.py` | TagService | ⚠️ Needs enhancement |
| `templates.py` | TemplateService, TemplateSeeder | ⚠️ Needs enhancement |

**Estimated Effort:** 3-5 hours with 4 parallel agents

### Batch 9: GDPR/Export Routes (Medium Priority)

| Route File | Services to Integrate | Status |
|------------|----------------------|--------|
| `gdpr.py` | GdprService, DataExporter, DataDeleter, ConsentService | ⚠️ Needs enhancement |
| `export.py` | ExportService, PDFGenerator, DOCXGenerator, TemplateEngine | ⚠️ Needs enhancement |
| `deadlines.py` | DeadlineReminderScheduler, NotificationService | ⚠️ Needs enhancement |

**Estimated Effort:** 3-4 hours with 3 parallel agents

### Batch 10: AI/System Routes (Low Priority)

| Route File | Services to Integrate | Status |
|------------|----------------------|--------|
| `ai_status.py` | UnifiedAIService, AIServiceFactory, ModelDownloadService | ⚠️ Needs enhancement |
| `ai_config.py` | AIProviderConfigService, SecureStorageService | ⚠️ Needs enhancement |
| `database.py` | BackupScheduler, BackupRetentionPolicy, AuditLogger | ⚠️ Needs enhancement |
| `port_status.py` | PortManager, ProcessManager | ⚠️ Needs enhancement |

**Estimated Effort:** 3-4 hours with 4 parallel agents

### Batch 11: Utility Routes (Low Priority)

| Route File | Services to Integrate | Status |
|------------|----------------------|--------|
| `action_logs.py` | EnhancedErrorTracker (integrate existing action-logger) | ⚠️ Needs enhancement |
| `evidence.py` | DocumentParserService, CitationService | ⚠️ Needs enhancement |
| `dashboard.py` | CaseService, NotificationService, DeadlineReminderScheduler | ⚠️ Needs enhancement |
| `ui.py` | (501 Not Implemented - Electron-specific) | ✅ No enhancement needed |

**Estimated Effort:** 2-3 hours with 3 parallel agents

---

## Enhancement Checklist (Per Route)

### Code Quality
- [ ] Replace direct `db.execute(text(...))` with service calls
- [ ] Use dependency injection for services
- [ ] Add proper type hints (Python 3.9+)
- [ ] Implement comprehensive error handling
- [ ] Add input validation with Pydantic models
- [ ] Ensure user ownership verification (user_id filtering)
- [ ] Add audit logging for sensitive operations

### Documentation
- [ ] Update docstrings for all endpoints
- [ ] Add OpenAPI schema examples
- [ ] Document authentication requirements
- [ ] Document error responses
- [ ] Add usage examples in comments

### Testing
- [ ] Create route test file (`test_<route_name>.py`)
- [ ] Test authentication/authorization
- [ ] Test input validation
- [ ] Test error handling
- [ ] Test service integration
- [ ] Mock external dependencies

---

## Sample Enhancement (notifications.py)

### Before (Direct DB Query)
```python
@router.get("/notifications")
async def list_notifications(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # ❌ Direct database query
    result = db.execute(
        text("SELECT * FROM notifications WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    notifications = result.fetchall()
    return {"notifications": notifications}
```

### After (Service Layer)
```python
@router.get("/notifications")
async def list_notifications(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
    user_id: int = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False)
):
    """
    List user notifications with optional filtering.

    **Authentication Required**

    Args:
        limit: Maximum number of notifications to return (1-100)
        unread_only: If true, return only unread notifications

    Returns:
        List of notification objects sorted by creation date (newest first)
    """
    try:
        # ✅ Use service layer
        notification_service = NotificationService(db, encryption_service, audit_logger)

        notifications = await notification_service.list_notifications(
            user_id=user_id,
            limit=limit,
            unread_only=unread_only
        )

        return {"notifications": notifications}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list notifications: {str(e)}"
        )
```

---

## Dependency Injection Pattern

### Create Service Factory (backend/dependencies.py)
```python
"""
Dependency injection for FastAPI routes.
Provides service instances with proper initialization.
"""

from functools import lru_cache
from fastapi import Depends
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.services.notification_service import NotificationService
from backend.services.key_manager import KeyManager


@lru_cache()
def get_key_manager() -> KeyManager:
    """Get singleton KeyManager instance."""
    return KeyManager.get_instance()


def get_encryption_service(
    key_manager: KeyManager = Depends(get_key_manager)
) -> EncryptionService:
    """Get EncryptionService with loaded key."""
    key = key_manager.get_key()
    return EncryptionService(key)


def get_audit_logger(
    db: Session = Depends(get_db)
) -> AuditLogger:
    """Get AuditLogger instance."""
    return AuditLogger(db)


def get_notification_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> NotificationService:
    """Get NotificationService with dependencies."""
    return NotificationService(db, encryption_service, audit_logger)
```

### Use in Routes
```python
from backend.dependencies import get_notification_service

@router.get("/notifications")
async def list_notifications(
    notification_service: NotificationService = Depends(get_notification_service),
    user_id: int = Depends(get_current_user_id)
):
    """List notifications using injected service."""
    notifications = await notification_service.list_notifications(user_id)
    return {"notifications": notifications}
```

---

## Timeline

### Parallel Agent Strategy (Batches 7-11)

| Batch | Routes | Agents | Estimated Time | Priority |
|-------|--------|--------|----------------|----------|
| **Batch 7** | 4 core routes | 4 agents | 4-6 hours | High |
| **Batch 8** | 4 feature routes | 4 agents | 3-5 hours | Medium |
| **Batch 9** | 3 GDPR/export routes | 3 agents | 3-4 hours | Medium |
| **Batch 10** | 4 AI/system routes | 4 agents | 3-4 hours | Low |
| **Batch 11** | 3-4 utility routes | 3 agents | 2-3 hours | Low |
| **TOTAL** | **18-19 routes** | **18 agents** | **15-22 hours** | |

**With Maximum Parallelization:** Can complete all 5 batches in 1-2 sessions (same day)

---

## Success Criteria

### Code Quality
- [ ] Zero direct database queries in routes
- [ ] All routes use service layer
- [ ] Comprehensive error handling
- [ ] Input validation with Pydantic
- [ ] Proper HTTP status codes
- [ ] Audit logging for sensitive operations

### Documentation
- [ ] OpenAPI schemas complete
- [ ] All endpoints documented
- [ ] Examples provided
- [ ] Error responses documented

### Testing
- [ ] Unit tests for all routes (mock services)
- [ ] Integration tests (real database)
- [ ] Auth/authorization tests
- [ ] Error handling tests
- [ ] Input validation tests

### Performance
- [ ] No N+1 query problems
- [ ] Proper use of async/await
- [ ] Efficient database queries
- [ ] Caching where appropriate

---

## Next Steps

1. **Create Dependency Injection System** (backend/dependencies.py)
2. **Launch Batch 7** (4 core routes with parallel agents)
3. **Launch Batch 8** (4 feature routes with parallel agents)
4. **Launch Batch 9** (3 GDPR/export routes with parallel agents)
5. **Launch Batch 10** (4 AI/system routes with parallel agents)
6. **Launch Batch 11** (3-4 utility routes with parallel agents)
7. **Create API Test Suite** (integration tests for all endpoints)
8. **Documentation Update** (Swagger/ReDoc examples)

---

## Estimated Completion

**With maximum parallelization (8 agents per batch):**
- **Phase 4 Route Enhancement:** 1-2 sessions (same day completion)
- **Total Time:** 15-22 hours of agent execution

**Phase 4 Status:** ⚠️ **READY TO START**
**Next Action:** Create dependency injection system + Launch Batch 7

---

**Generated:** 2025-01-13
**Status:** Planning Complete
**Routes to Enhance:** 18-19 routes
**Services Available:** 48 services
**Strategy:** Service layer integration with dependency injection

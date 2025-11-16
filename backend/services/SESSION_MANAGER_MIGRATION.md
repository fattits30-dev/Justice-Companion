# SessionManager Migration Guide
## TypeScript → Python FastAPI

This guide provides step-by-step instructions for migrating from the TypeScript SessionManager to the Python FastAPI version.

---

## Table of Contents
1. [Overview](#overview)
2. [Key Differences](#key-differences)
3. [Migration Steps](#migration-steps)
4. [Code Comparison](#code-comparison)
5. [Testing Migration](#testing-migration)
6. [Deployment Checklist](#deployment-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What Changed?
The TypeScript SessionManager was designed for Electron's main process with in-memory session storage. The Python version adds database persistence while maintaining similar API semantics.

### Migration Timeline
- **Preparation**: 1-2 hours (read this guide, set up database)
- **Implementation**: 2-4 hours (code changes, testing)
- **Validation**: 1-2 hours (integration testing, performance testing)
- **Total**: 4-8 hours

---

## Key Differences

### 1. Storage Model
| Aspect | TypeScript | Python |
|--------|-----------|--------|
| **Storage** | In-memory Map | Database + optional cache |
| **Persistence** | Lost on restart | Persisted across restarts |
| **Concurrency** | Single-process only | Multi-process safe |
| **Performance** | O(1) always | O(1) cached, O(log n) uncached |

### 2. API Changes
| TypeScript | Python | Notes |
|-----------|--------|-------|
| `createSession()` | `create_session()` | Now async, returns UUID |
| `validateSession()` | `validate_session()` | Now async, returns Pydantic model |
| `destroySession()` | `destroy_session()` | Now async |
| `cleanupExpiredSessions()` | `cleanup_expired_sessions()` | Now async |
| `getSessionCount()` | `get_session_count()` | Sync, returns dict with cache/db counts |
| `getActiveSessionIds()` | `get_active_session_ids()` | Sync |

### 3. New Features in Python Version
- Database persistence (SQLAlchemy + SQLite/PostgreSQL)
- Optional in-memory cache for performance
- User session management (`get_user_sessions()`)
- Session revocation (`revoke_user_sessions()`)
- IP address and user agent tracking
- Audit logging integration
- Pydantic models for type safety

### 4. Dependencies
**TypeScript:**
```json
{
  "uuid": "^9.0.0"
}
```

**Python:**
```txt
fastapi>=0.115.0
sqlalchemy>=2.0.35
pydantic[email]>=2.9.2
```

---

## Migration Steps

### Step 1: Database Setup

#### 1.1 Ensure Database Schema Exists
The `sessions` table should already exist from migration `010_authentication_system.sql`:

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,              -- UUID v4
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### 1.2 Verify Database Connection
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine("sqlite:///justice_companion.db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Test connection
from backend.models.session import Session as SessionModel
count = db.query(SessionModel).count()
print(f"Current sessions in database: {count}")
```

---

### Step 2: Replace TypeScript Imports

#### Before (TypeScript):
```typescript
import { getSessionManager } from '../services/SessionManager';

const sessionManager = getSessionManager();
```

#### After (Python):
```python
from backend.services.session_manager import SessionManager, get_session_manager
from sqlalchemy.orm import Session
from backend.database import get_db

# Option 1: Direct instantiation
manager = SessionManager(db=db, enable_memory_cache=True)

# Option 2: Singleton pattern (recommended)
manager = get_session_manager(db, enable_memory_cache=True)
```

---

### Step 3: Update Method Calls

#### 3.1 Create Session

**Before (TypeScript):**
```typescript
const sessionId = sessionManager.createSession({
  userId: 123,
  username: 'john_doe',
  rememberMe: false
});
```

**After (Python):**
```python
session_id = await manager.create_session(
    user_id=123,
    username='john_doe',
    remember_me=False,
    ip_address='192.168.1.100',  # Optional
    user_agent='Mozilla/5.0'      # Optional
)
```

**Changes:**
- Add `await` keyword (async)
- Use snake_case for parameters
- Can optionally add IP and user agent

---

#### 3.2 Validate Session

**Before (TypeScript):**
```typescript
const result = sessionManager.validateSession(sessionId);

if (result.valid) {
  console.log(`User ${result.username} (${result.userId}) authenticated`);
} else {
  console.log('Invalid session');
}
```

**After (Python):**
```python
result = await manager.validate_session(session_id)

if result.valid:
    print(f"User {result.username} ({result.user_id}) authenticated")
else:
    print("Invalid session")
```

**Changes:**
- Add `await` keyword (async)
- Access `result.user_id` instead of `result.userId` (snake_case)
- `result` is now a Pydantic `SessionValidationResult` model

---

#### 3.3 Destroy Session

**Before (TypeScript):**
```typescript
const success = sessionManager.destroySession(sessionId);
```

**After (Python):**
```python
success = await manager.destroy_session(session_id)
```

**Changes:**
- Add `await` keyword (async)

---

#### 3.4 Cleanup Expired Sessions

**Before (TypeScript):**
```typescript
const cleanedCount = sessionManager.cleanupExpiredSessions();
console.log(`Cleaned up ${cleanedCount} sessions`);
```

**After (Python):**
```python
cleaned_count = await manager.cleanup_expired_sessions()
print(f"Cleaned up {cleaned_count} sessions")
```

**Changes:**
- Add `await` keyword (async)
- Use snake_case

---

#### 3.5 Get Session Count

**Before (TypeScript):**
```typescript
const count = sessionManager.getSessionCount();
console.log(`Active sessions: ${count}`);
```

**After (Python):**
```python
counts = manager.get_session_count()
print(f"Active sessions: {counts['active']}")
print(f"Cached sessions: {counts['memory_cache']}")
print(f"Database sessions: {counts['database']}")
```

**Changes:**
- Returns dictionary with multiple counts
- Provides insight into cache vs database state

---

### Step 4: Integrate with FastAPI

#### 4.1 Dependency Injection
```python
from fastapi import Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.session_manager import get_session_manager, SessionManager

def get_session_manager_dep(
    db: Session = Depends(get_db)
) -> SessionManager:
    """Dependency for SessionManager."""
    return get_session_manager(db, enable_memory_cache=True)
```

#### 4.2 Authentication Middleware
```python
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class SessionAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        if request.url.path in ["/login", "/register", "/health"]:
            return await call_next(request)

        # Get session ID
        session_id = request.headers.get("X-Session-ID") or \
                     request.cookies.get("session_id")

        if not session_id:
            raise HTTPException(status_code=401, detail="No session ID")

        # Validate session
        manager = get_session_manager(request.state.db)
        result = await manager.validate_session(session_id)

        if not result.valid:
            raise HTTPException(status_code=401, detail="Invalid session")

        # Add user info to request
        request.state.user_id = result.user_id
        request.state.username = result.username

        return await call_next(request)
```

#### 4.3 Login Endpoint
```python
from fastapi import APIRouter, Depends, HTTPException
from backend.services.session_manager import SessionManager, get_session_manager

router = APIRouter()

@router.post("/login")
async def login(
    username: str,
    password: str,
    remember_me: bool = False,
    manager: SessionManager = Depends(get_session_manager_dep)
):
    # Authenticate user (simplified)
    user = authenticate_user(username, password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create session
    session_id = await manager.create_session(
        user_id=user.id,
        username=user.username,
        remember_me=remember_me
    )

    return {
        "session_id": session_id,
        "expires_in": "30 days" if remember_me else "24 hours"
    }
```

---

### Step 5: Periodic Cleanup Task

Set up automatic cleanup of expired sessions using APScheduler or FastAPI's background tasks.

#### Option 1: APScheduler (Recommended)
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from backend.services.session_manager import get_session_manager
from backend.database import SessionLocal

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", minutes=5)
async def cleanup_sessions():
    """Clean up expired sessions every 5 minutes."""
    db = SessionLocal()
    try:
        manager = get_session_manager(db, enable_memory_cache=True)
        cleaned = await manager.cleanup_expired_sessions()

        if cleaned > 0:
            print(f"[Scheduler] Cleaned up {cleaned} expired sessions")

    finally:
        db.close()

# Start scheduler
scheduler.start()
```

#### Option 2: FastAPI Background Task
```python
from fastapi import BackgroundTasks

async def periodic_cleanup():
    """Background task for session cleanup."""
    db = SessionLocal()
    try:
        manager = get_session_manager(db)
        await manager.cleanup_expired_sessions()
    finally:
        db.close()

@app.on_event("startup")
async def startup_cleanup():
    """Run cleanup on startup."""
    background_tasks = BackgroundTasks()
    background_tasks.add_task(periodic_cleanup)
```

---

### Step 6: Enable Memory Cache (Optional)

For high-traffic applications, enable memory cache for O(1) validation:

```python
# In your dependency injection setup
def get_session_manager_dep(db: Session = Depends(get_db)) -> SessionManager:
    return get_session_manager(
        db,
        enable_memory_cache=True  # Enable cache for performance
    )
```

**Trade-offs:**
- **Pros**: Faster validation (O(1) vs O(log n))
- **Cons**: Memory usage, not suitable for multi-server setups

**Recommendation:**
- **Single-server**: Enable cache
- **Multi-server (load balanced)**: Disable cache (database is source of truth)

---

## Code Comparison

### Complete Example: Login Flow

#### TypeScript (Electron)
```typescript
import { ipcMain } from 'electron';
import { getSessionManager } from './services/SessionManager';
import { authenticate } from './services/AuthenticationService';

const sessionManager = getSessionManager();

ipcMain.handle('auth:login', async (event, { username, password, rememberMe }) => {
  try {
    // Authenticate user
    const user = await authenticate(username, password);

    // Create session
    const sessionId = sessionManager.createSession({
      userId: user.id,
      username: user.username,
      rememberMe
    });

    return {
      success: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
```

#### Python (FastAPI)
```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.session_manager import SessionManager, get_session_manager
from backend.services.auth_service import AuthenticationService

router = APIRouter()

@router.post("/auth/login")
async def login(
    username: str,
    password: str,
    remember_me: bool = False,
    request: Request,
    db: Session = Depends(get_db),
    manager: SessionManager = Depends(get_session_manager)
):
    try:
        # Authenticate user
        auth_service = AuthenticationService(db)
        result = await auth_service.login(username, password, remember_me)

        # Create session (already done in auth_service.login)
        # But if you want to use SessionManager directly:
        session_id = await manager.create_session(
            user_id=result['user']['id'],
            username=result['user']['username'],
            remember_me=remember_me,
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent")
        )

        return {
            "success": True,
            "session_id": session_id,
            "user": result['user']
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
```

---

## Testing Migration

### Unit Tests

Create test file: `test_session_manager_migration.py`

```python
import pytest
from backend.services.session_manager import SessionManager

@pytest.mark.asyncio
async def test_typescript_parity_create_session(db_session, test_user):
    """Test that create_session behaves like TypeScript version."""
    manager = SessionManager(db=db_session)

    session_id = await manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Verify UUID format
    assert isinstance(session_id, str)
    assert len(session_id) == 36

@pytest.mark.asyncio
async def test_typescript_parity_validate_session(db_session, test_user):
    """Test that validate_session behaves like TypeScript version."""
    manager = SessionManager(db=db_session)

    session_id = await manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    result = await manager.validate_session(session_id)

    assert result.valid is True
    assert result.user_id == test_user.id
    assert result.username == test_user.username
```

Run tests:
```bash
pytest backend/services/test_session_manager_migration.py -v
```

---

### Integration Tests

Test full authentication flow:

```python
from fastapi.testclient import TestClient

def test_login_creates_session(client: TestClient):
    """Test login endpoint creates session."""
    response = client.post("/auth/login", json={
        "username": "test_user",
        "password": "Test123456",
        "remember_me": False
    })

    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert len(data["session_id"]) == 36  # UUID format

def test_validate_session_middleware(client: TestClient):
    """Test session validation middleware."""
    # Login first
    login_response = client.post("/auth/login", json={
        "username": "test_user",
        "password": "Test123456"
    })
    session_id = login_response.json()["session_id"]

    # Access protected endpoint
    response = client.get(
        "/api/protected",
        headers={"X-Session-ID": session_id}
    )

    assert response.status_code == 200
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Database schema migrated (sessions table exists)
- [ ] Database indexes created (user_id, expires_at)
- [ ] All tests passing (unit + integration)
- [ ] Performance testing completed
- [ ] Memory cache configured appropriately

### Configuration
- [ ] Database connection string configured
- [ ] Memory cache enabled/disabled based on deployment
- [ ] Periodic cleanup task scheduled
- [ ] Audit logging configured (if needed)
- [ ] Session expiration times configured

### Monitoring
- [ ] Session count metrics exposed
- [ ] Cleanup task logging enabled
- [ ] Audit events logged
- [ ] Error tracking configured

### Rollback Plan
- [ ] TypeScript version backed up
- [ ] Database backup created
- [ ] Rollback procedure documented
- [ ] Feature flag for gradual rollout (optional)

---

## Troubleshooting

### Issue 1: Sessions Not Persisting
**Symptom**: Sessions lost after server restart
**Cause**: Using in-memory SQLite or cache-only mode
**Solution**:
```python
# Ensure database persistence
engine = create_engine("sqlite:///justice_companion.db")  # File-based
# NOT: create_engine("sqlite:///:memory:")  # In-memory

# Enable memory cache but keep database persistence
manager = SessionManager(db=db, enable_memory_cache=True)
```

---

### Issue 2: Slow Validation Performance
**Symptom**: Session validation takes >10ms
**Cause**: Memory cache disabled
**Solution**:
```python
# Enable memory cache for O(1) validation
manager = SessionManager(db=db, enable_memory_cache=True)
```

---

### Issue 3: Memory Cache Not Working
**Symptom**: All validations query database
**Cause**: Cache not enabled or sessions not cached
**Solution**:
```python
# Verify cache is enabled
manager = SessionManager(db=db, enable_memory_cache=True)

# Check cache size
counts = manager.get_session_count()
print(f"Cached: {counts['memory_cache']}")  # Should be > 0
```

---

### Issue 4: Sessions Not Cleaning Up
**Symptom**: Expired sessions remain in database
**Cause**: Cleanup task not running
**Solution**:
```python
# Set up periodic cleanup
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", minutes=5)
async def cleanup():
    db = SessionLocal()
    try:
        manager = get_session_manager(db)
        await manager.cleanup_expired_sessions()
    finally:
        db.close()

scheduler.start()
```

---

### Issue 5: Multi-Server Cache Inconsistency
**Symptom**: Sessions valid on one server, invalid on another
**Cause**: Memory cache not synchronized across servers
**Solution**:
```python
# Disable memory cache for multi-server deployments
manager = SessionManager(db=db, enable_memory_cache=False)

# Alternative: Use Redis for shared cache (future enhancement)
```

---

## Additional Resources

- [SessionManager README](SESSION_MANAGER_README.md) - Full API documentation
- [Usage Examples](example_session_manager.py) - Working code examples
- [Test Suite](test_session_manager.py) - Comprehensive test cases

---

## Support

For migration issues or questions:
1. Check this guide and README documentation
2. Review test suite for examples
3. Run example scripts to verify setup
4. Check audit logs for session operations

---

## Migration Checklist

Use this checklist to track your migration progress:

### Phase 1: Preparation
- [ ] Read this migration guide completely
- [ ] Review TypeScript SessionManager code
- [ ] Verify database schema exists
- [ ] Set up development environment

### Phase 2: Implementation
- [ ] Install Python dependencies
- [ ] Import SessionManager service
- [ ] Update method calls (add await, snake_case)
- [ ] Integrate with FastAPI
- [ ] Set up dependency injection
- [ ] Configure memory cache

### Phase 3: Testing
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Test login/logout flow
- [ ] Test session validation
- [ ] Test expired session cleanup
- [ ] Performance testing

### Phase 4: Deployment
- [ ] Deploy to staging environment
- [ ] Verify database persistence
- [ ] Set up periodic cleanup task
- [ ] Configure monitoring
- [ ] Deploy to production
- [ ] Monitor for issues

### Phase 5: Validation
- [ ] Verify sessions working correctly
- [ ] Check cleanup task running
- [ ] Monitor performance metrics
- [ ] Review audit logs
- [ ] Gather user feedback

---

**Migration Status**: ✅ Complete
**Last Updated**: 2025-01-13
**Python Version**: 3.9+
**FastAPI Version**: 0.115.0+

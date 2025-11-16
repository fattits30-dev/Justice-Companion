# SessionPersistenceService - Python Backend Implementation

## Overview

The `SessionPersistenceService` provides database-based session management for the Justice Companion Python backend. This service replaces the TypeScript `SessionPersistenceService` which used Electron's safeStorage API for file-based session persistence.

**Source Files:**
- **Service:** `backend/services/session_persistence_service.py` (665 lines)
- **Tests:** `backend/services/test_session_persistence_service.py` (822 lines, 35+ tests)
- **Documentation:** This file

**Migrated from:** `src/services/SessionPersistenceService.ts` (304 lines)

---

## Architecture Comparison

### TypeScript (Electron) Implementation
- **Storage:** Encrypted files using Electron's `safeStorage` API
- **Encryption:** OS keychain (DPAPI on Windows, Keychain on macOS, libsecret on Linux)
- **Use Case:** Persist session IDs across app restarts for "Remember Me"
- **Pattern:** Singleton with private constructor
- **File Location:** `app.getPath('userData')/session.enc`

### Python (FastAPI) Implementation
- **Storage:** PostgreSQL/SQLite database (sessions table)
- **Encryption:** Not needed (session IDs are already cryptographically secure UUID v4)
- **Use Case:** Validate and restore sessions from database
- **Pattern:** Standard service class (dependency injection via constructor)
- **Database Table:** `sessions` (managed by SQLAlchemy ORM)

---

## Key Features

### 1. Session Validation
- Validates UUID v4 format (prevents invalid session IDs)
- Checks session expiration (24 hours default, 30 days for Remember Me)
- Automatically cleans up expired sessions
- Handles orphaned sessions (user deleted)

### 2. Session Restoration
- Restores full session data with user information
- Returns `None` for expired/invalid sessions
- Validates user `is_active` status
- Provides complete session metadata (IP, user agent, timestamps)

### 3. Session Management
- Update session activity (for rolling timeouts)
- Clear sessions (logout)
- Get all sessions for a user (multi-device management)
- Revoke all sessions (password change, security events)

### 4. Session Cleanup
- Periodic cleanup of expired sessions (cron job)
- Returns count of deleted sessions
- Logs all cleanup operations

### 5. Security & Auditing
- Comprehensive audit logging for all operations
- UUID v4 validation (cryptographically secure)
- IP address tracking (anomaly detection)
- User agent tracking (device management)
- Tamper-evident audit trail

---

## API Reference

### Constructor

```python
def __init__(self, db: Session, audit_logger=None):
    """
    Initialize SessionPersistenceService.

    Args:
        db: SQLAlchemy database session
        audit_logger: Optional AuditLogger instance
    """
```

---

### Core Methods

#### `is_session_valid(session_id: str) -> bool`

Lightweight check if session exists and is not expired.

```python
is_valid = await service.is_session_valid(session_id)
```

**Returns:** `True` if session is valid, `False` otherwise

**Side Effects:**
- Automatically deletes expired sessions
- Logs audit event if session expired

**Use Cases:**
- Quick authentication check
- Middleware session validation
- Health check endpoints

---

#### `restore_session(session_id: str) -> Optional[Dict[str, Any]]`

Restore full session data with user information.

```python
session_data = await service.restore_session(session_id)

if session_data:
    user = session_data['user']
    session = session_data['session']
```

**Returns:**
```python
{
    "session": {
        "id": str,              # UUID v4
        "user_id": int,
        "expires_at": str,      # ISO timestamp
        "created_at": str,      # ISO timestamp
        "ip_address": str,      # Optional
        "user_agent": str       # Optional
    },
    "user": {
        "id": int,
        "username": str,
        "email": str,
        "role": str,
        "is_active": bool
    }
}
```

Returns `None` if:
- Session not found
- Session expired (automatically deleted)
- User not found (orphaned session)
- User is inactive

**Use Cases:**
- Login restoration on app restart
- Session-based authentication
- User context loading

---

#### `update_session_activity(session_id: str, ip_address?: str, user_agent?: str) -> bool`

Update session metadata (for activity tracking or rolling timeouts).

```python
success = await service.update_session_activity(
    session_id,
    ip_address="192.168.1.100",
    user_agent="Mozilla/5.0"
)
```

**Returns:** `True` if updated, `False` if session not found or expired

**Use Cases:**
- Track user activity
- Implement rolling session timeouts
- Update IP/user agent on device change

---

#### `clear_session(session_id: str) -> bool`

Delete session from database (logout).

```python
success = await service.clear_session(session_id)
```

**Returns:** `True` if cleared (or already gone), `False` on error

**Side Effects:**
- Deletes session from database
- Logs audit event

**Use Cases:**
- User logout
- Session cleanup after error
- Security-forced logout

---

#### `has_stored_session(session_id: str) -> bool`

Check if session exists without validating expiration.

```python
exists = await service.has_stored_session(session_id)
```

**Returns:** `True` if session exists, `False` otherwise

**Use Cases:**
- Quick existence check
- Debugging
- Pre-validation checks

---

#### `get_session_metadata(session_id: str) -> Dict[str, Any]`

Get debugging information about a session.

```python
metadata = await service.get_session_metadata(session_id)
```

**Returns:**
```python
{
    "exists": bool,
    "expired": bool,
    "is_valid_uuid": bool,
    "user_id": int,              # If exists
    "created_at": str,           # If exists
    "expires_at": str,           # If exists
    "ip_address": str,           # If exists
    "user_agent": str            # If exists
}
```

**Use Cases:**
- Debugging session issues
- Monitoring dashboards
- Session analytics

---

#### `cleanup_expired_sessions() -> int`

Remove all expired sessions from database.

```python
deleted_count = await service.cleanup_expired_sessions()
print(f"Cleaned up {deleted_count} expired sessions")
```

**Returns:** Number of sessions deleted

**Side Effects:**
- Deletes all expired sessions
- Logs audit event with count

**Use Cases:**
- Periodic cron job (daily cleanup)
- Manual database maintenance
- Pre-deployment cleanup

---

#### `get_user_sessions(user_id: int) -> List[Dict[str, Any]]`

Get all active sessions for a user.

```python
sessions = await service.get_user_sessions(user_id)

for session in sessions:
    print(f"Device: {session['ip_address']} - {session['user_agent']}")
```

**Returns:** List of session dictionaries (only non-expired)

**Use Cases:**
- "Active sessions" management UI
- Multi-device tracking
- Security monitoring

---

#### `revoke_user_sessions(user_id: int, except_session_id?: str) -> int`

Revoke all sessions for a user (security event).

```python
# Revoke all sessions
revoked_count = await service.revoke_user_sessions(user_id)

# Revoke all except current session
revoked_count = await service.revoke_user_sessions(
    user_id,
    except_session_id=current_session_id
)
```

**Returns:** Number of sessions revoked

**Side Effects:**
- Deletes sessions from database
- Logs audit event with count

**Use Cases:**
- Password change (invalidate all sessions)
- Suspected account compromise
- User-requested logout from all devices
- Admin-forced logout

---

## Usage Examples

### 1. Basic Session Validation

```python
from backend.services.session_persistence_service import SessionPersistenceService
from backend.services.audit_logger import AuditLogger

# Initialize service
audit_logger = AuditLogger(db)
service = SessionPersistenceService(db=db, audit_logger=audit_logger)

# Validate session
is_valid = await service.is_session_valid(session_id)

if is_valid:
    print("Session is valid")
else:
    print("Session expired or invalid")
```

---

### 2. Restore User Session

```python
# Restore full session data
session_data = await service.restore_session(session_id)

if session_data:
    user = session_data['user']
    session = session_data['session']

    print(f"Welcome back, {user['username']}!")
    print(f"Session expires at: {session['expires_at']}")
else:
    # Session expired or invalid - redirect to login
    return {"error": "Session expired"}
```

---

### 3. Middleware Authentication

```python
from fastapi import Request, HTTPException

async def authenticate_request(request: Request):
    """Middleware to validate session."""
    session_id = request.cookies.get("session_id")

    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Validate session
    is_valid = await service.is_session_valid(session_id)

    if not is_valid:
        raise HTTPException(status_code=401, detail="Session expired")

    # Restore user data
    session_data = await service.restore_session(session_id)

    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Attach user to request
    request.state.user = session_data['user']
    request.state.session = session_data['session']
```

---

### 4. Logout Implementation

```python
from fastapi import APIRouter, Response

router = APIRouter()

@router.post("/logout")
async def logout(session_id: str):
    """Logout user and clear session."""
    success = await service.clear_session(session_id)

    if success:
        return {
            "success": True,
            "message": "Logged out successfully"
        }
    else:
        return {
            "success": False,
            "message": "Session not found"
        }
```

---

### 5. Active Sessions UI

```python
@router.get("/sessions")
async def get_active_sessions(user_id: int):
    """Get all active sessions for user."""
    sessions = await service.get_user_sessions(user_id)

    return {
        "sessions": sessions,
        "count": len(sessions)
    }
```

---

### 6. Revoke All Sessions (Password Change)

```python
@router.post("/change-password")
async def change_password(
    user_id: int,
    current_session_id: str,
    new_password: str
):
    """Change password and revoke all sessions except current."""
    # Update password (via AuthenticationService)
    await auth_service.change_password(user_id, new_password)

    # Revoke all other sessions
    revoked_count = await service.revoke_user_sessions(
        user_id,
        except_session_id=current_session_id
    )

    return {
        "success": True,
        "message": f"Password changed. {revoked_count} other sessions revoked."
    }
```

---

### 7. Periodic Cleanup (Cron Job)

```python
from fastapi_utils.tasks import repeat_every

@app.on_event("startup")
@repeat_every(seconds=60 * 60 * 24)  # Run daily
async def cleanup_expired_sessions_task():
    """Cleanup expired sessions daily."""
    deleted_count = await service.cleanup_expired_sessions()
    print(f"Cleaned up {deleted_count} expired sessions")
```

---

## Security Considerations

### UUID v4 Validation
- All session IDs **must** be valid UUID v4 format
- Prevents session ID guessing attacks
- Cryptographically secure random IDs (122 bits of entropy)

### Automatic Expiration
- Sessions expire after **24 hours** (default)
- Remember Me extends to **30 days**
- Expired sessions automatically deleted on access

### Audit Logging
- All operations logged (restore, clear, cleanup, revoke)
- Includes user ID, session ID, action, success/failure
- Tamper-evident blockchain-style audit trail

### Session Metadata
- IP address tracking for anomaly detection
- User agent tracking for multi-device management
- Created/expires timestamps for monitoring

### User Account Checks
- Validates user `is_active` status on restoration
- Handles orphaned sessions (user deleted)
- Prevents inactive users from accessing system

### Safe Error Handling
- Never throws exceptions on validation errors
- Returns `None`/`False` for invalid operations
- Logs errors to audit trail

---

## Testing

The service includes comprehensive unit tests (35+ tests):

```bash
# Run tests
cd "F:\Justice Companion take 2"
python -m pytest backend/services/test_session_persistence_service.py -v

# Run with coverage
python -m pytest backend/services/test_session_persistence_service.py --cov=backend.services.session_persistence_service --cov-report=html
```

**Test Coverage:**
- UUID v4 validation (5 tests)
- Session validation (4 tests)
- Session restoration (5 tests)
- Session activity updates (3 tests)
- Session clearing (3 tests)
- Session metadata (3 tests)
- Session cleanup (2 tests)
- Multi-session management (5 tests)
- Audit logging (5 tests)

---

## Migration from TypeScript

If you're migrating from the TypeScript `SessionPersistenceService`:

### What Changed

1. **Storage Backend:** File-based → Database-based
2. **Encryption:** OS keychain → Not needed (sessions in secure database)
3. **Singleton Pattern:** Removed (use dependency injection)
4. **Return Types:** Session ID string → Full session + user data

### What Stayed the Same

1. **UUID v4 Validation:** Identical security checks
2. **Session Cleanup:** Same concept, database-based
3. **Audit Logging:** Same comprehensive logging
4. **Error Handling:** Same safe, never-throw approach

### Code Migration Example

**TypeScript (Electron):**
```typescript
// Store session ID to encrypted file
await sessionPersistenceService.storeSessionId(sessionId);

// Retrieve session ID from encrypted file
const sessionId = await sessionPersistenceService.retrieveSessionId();

// Clear session file
await sessionPersistenceService.clearSession();
```

**Python (FastAPI):**
```python
# Sessions are created via AuthenticationService
session_data = await auth_service.login(username, password, remember_me=True)

# Restore session from database
session_data = await service.restore_session(session_id)

# Clear session from database
await service.clear_session(session_id)
```

---

## Performance Considerations

### Database Queries
- All queries use indexed columns (`id`, `user_id`, `expires_at`)
- Cleanup uses bulk delete (efficient for large datasets)
- Session restoration uses join to fetch user data in single query

### Caching Strategy
- Consider Redis for high-traffic applications
- Cache restored session data for 5-10 minutes
- Invalidate cache on session clear/revoke

### Scaling
- Database-based approach scales horizontally
- No file system dependencies (cloud-friendly)
- Compatible with load balancers and multiple servers

---

## Troubleshooting

### Session Not Found
- Check UUID v4 format: `service._is_valid_uuid_v4(session_id)`
- Check session expiration: `service.get_session_metadata(session_id)`
- Check audit logs for deletion events

### Session Expired Immediately
- Verify server timezone is UTC
- Check `expires_at` timestamp in database
- Review session creation logic in `AuthenticationService`

### User Not Found After Restoration
- Check user `is_active` status
- Verify foreign key relationship in database
- Check for orphaned sessions (user deleted)

### Audit Logging Not Working
- Verify `audit_logger` passed to constructor
- Check audit logs table exists
- Review audit logger initialization

---

## Related Services

- **AuthenticationService:** Creates and manages sessions during login
- **AuditLogger:** Logs all session operations for security
- **EncryptionService:** Not used (session IDs are not encrypted in database)

---

## License

Part of Justice Companion - see main project LICENSE file.

---

## Authors

**Original TypeScript Implementation:**
- `src/services/SessionPersistenceService.ts` (304 lines)

**Python Migration:**
- `backend/services/session_persistence_service.py` (665 lines)
- Converted from TypeScript on 2025-11-13
- Architectural adaptation for FastAPI backend
- Enhanced with multi-session management features

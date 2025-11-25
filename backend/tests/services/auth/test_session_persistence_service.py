"""
Unit tests for SessionPersistenceService.

Tests all session persistence functionality including:
- Session validation (UUID v4 format checking)
- Session restoration with user data
- Session activity updates
- Session cleanup and expiration
- Session metadata retrieval
- Multi-session management per user
- Session revocation
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.user import User
from backend.models.session import Session as SessionModel
from backend.services.auth.session_persistence import (
    SessionPersistenceService
)

# Mock audit logger for testing
class MockAuditLogger:
    def __init__(self):
        self.logs = []

    def log(self, event_type, user_id, resource_type, resource_id, action,
            details=None, success=True, error_message=None, **kwargs):
        self.logs.append({
            "event_type": event_type,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "details": details,
            "success": success,
            "error_message": error_message
        })

@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def audit_logger():
    """Create mock audit logger."""
    return MockAuditLogger()

@pytest.fixture
def service(db_session, audit_logger):
    """Create SessionPersistenceService instance."""
    return SessionPersistenceService(db=db_session, audit_logger=audit_logger)

@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="dummyhash",
        password_salt="dummysalt",
        role="user",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_session(db_session, test_user):
    """Create test session."""
    session_id = str(uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    session = SessionModel(
        id=session_id,
        user_id=test_user.id,
        expires_at=expires_at,
        ip_address="127.0.0.1",
        user_agent="TestAgent/1.0"
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session

# ===== UUID v4 VALIDATION TESTS =====

@pytest.mark.asyncio
async def test_valid_uuid_v4(service):
    """Test UUID v4 validation with valid UUID."""
    valid_uuid = str(uuid4())
    assert service._is_valid_uuid_v4(valid_uuid) is True

@pytest.mark.asyncio
async def test_invalid_uuid_format(service):
    """Test UUID v4 validation with invalid formats."""
    invalid_uuids = [
        "not-a-uuid",
        "12345678-1234-1234-1234-123456789abc",  # Valid UUID v1 format but not v4
        "12345678-1234-5234-1234-123456789abc",  # v5 UUID
        "",
        None,
        123,
        "12345678123412341234123456789abc",  # No hyphens
        "12345678-1234-4234-g234-123456789abc",  # Invalid character 'g'
    ]

    for invalid in invalid_uuids:
        assert service._is_valid_uuid_v4(invalid) is False

# ===== SESSION VALIDATION TESTS =====

@pytest.mark.asyncio
async def test_is_session_valid_success(service, test_session):
    """Test session validation with valid session."""
    is_valid = await service.is_session_valid(test_session.id)
    assert is_valid is True

@pytest.mark.asyncio
async def test_is_session_valid_not_found(service):
    """Test session validation with non-existent session."""
    fake_uuid = str(uuid4())
    is_valid = await service.is_session_valid(fake_uuid)
    assert is_valid is False

@pytest.mark.asyncio
async def test_is_session_valid_expired(service, db_session, test_user):
    """Test session validation with expired session."""
    # Create expired session
    session_id = str(uuid4())
    expired_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session = SessionModel(
        id=session_id,
        user_id=test_user.id,
        expires_at=expired_at
    )
    db_session.add(session)
    db_session.commit()

    # Validate - should return False and delete session
    is_valid = await service.is_session_valid(session_id)
    assert is_valid is False

    # Verify session was deleted
    deleted_session = db_session.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()
    assert deleted_session is None

@pytest.mark.asyncio
async def test_is_session_valid_invalid_uuid(service):
    """Test session validation with invalid UUID format."""
    is_valid = await service.is_session_valid("not-a-uuid")
    assert is_valid is False

# ===== SESSION RESTORATION TESTS =====

@pytest.mark.asyncio
async def test_restore_session_success(service, test_session, test_user):
    """Test successful session restoration with user data."""
    result = await service.restore_session(test_session.id)

    assert result is not None
    assert "session" in result
    assert "user" in result

    # Verify session data
    assert result["session"]["id"] == test_session.id
    assert result["session"]["user_id"] == test_user.id
    assert result["session"]["ip_address"] == "127.0.0.1"

    # Verify user data
    assert result["user"]["id"] == test_user.id
    assert result["user"]["username"] == "testuser"
    assert result["user"]["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_restore_session_not_found(service):
    """Test session restoration with non-existent session."""
    fake_uuid = str(uuid4())
    result = await service.restore_session(fake_uuid)
    assert result is None

@pytest.mark.asyncio
async def test_restore_session_expired(service, db_session, test_user):
    """Test session restoration with expired session."""
    # Create expired session
    session_id = str(uuid4())
    expired_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session = SessionModel(
        id=session_id,
        user_id=test_user.id,
        expires_at=expired_at
    )
    db_session.add(session)
    db_session.commit()

    # Restore - should return None and delete session
    result = await service.restore_session(session_id)
    assert result is None

    # Verify session was deleted
    deleted_session = db_session.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()
    assert deleted_session is None

@pytest.mark.asyncio
async def test_restore_session_inactive_user(service, db_session, test_user):
    """Test session restoration with inactive user."""
    # Create session for user
    session_id = str(uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    session = SessionModel(
        id=session_id,
        user_id=test_user.id,
        expires_at=expires_at
    )
    db_session.add(session)

    # Deactivate user
    test_user.is_active = False
    db_session.commit()

    # Restore - should return None
    result = await service.restore_session(session_id)
    assert result is None

@pytest.mark.asyncio
async def test_restore_session_invalid_uuid(service, audit_logger):
    """Test session restoration with invalid UUID format."""
    result = await service.restore_session("not-a-uuid")
    assert result is None

    # Verify audit log
    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["success"] is False
    assert "Invalid session ID format" in log["details"]["reason"]

# ===== SESSION ACTIVITY UPDATE TESTS =====

@pytest.mark.asyncio
async def test_update_session_activity_success(service, test_session, db_session):
    """Test successful session activity update."""
    new_ip = "192.168.1.100"
    new_agent = "Mozilla/5.0"

    success = await service.update_session_activity(
        test_session.id,
        ip_address=new_ip,
        user_agent=new_agent
    )

    assert success is True

    # Verify updates in database
    updated_session = db_session.query(SessionModel).filter(
        SessionModel.id == test_session.id
    ).first()

    assert updated_session.ip_address == new_ip
    assert updated_session.user_agent == new_agent

@pytest.mark.asyncio
async def test_update_session_activity_not_found(service):
    """Test session activity update with non-existent session."""
    fake_uuid = str(uuid4())
    success = await service.update_session_activity(fake_uuid)
    assert success is False

@pytest.mark.asyncio
async def test_update_session_activity_expired(service, db_session, test_user):
    """Test session activity update with expired session."""
    # Create expired session
    session_id = str(uuid4())
    expired_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session = SessionModel(
        id=session_id,
        user_id=test_user.id,
        expires_at=expired_at
    )
    db_session.add(session)
    db_session.commit()

    # Update - should fail
    success = await service.update_session_activity(session_id)
    assert success is False

# ===== SESSION CLEAR TESTS =====

@pytest.mark.asyncio
async def test_clear_session_success(service, test_session, db_session, audit_logger):
    """Test successful session clearing (logout)."""
    success = await service.clear_session(test_session.id)
    assert success is True

    # Verify session was deleted
    deleted_session = db_session.query(SessionModel).filter(
        SessionModel.id == test_session.id
    ).first()
    assert deleted_session is None

    # Verify audit log
    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["event_type"] == "session.clear"
    assert log["success"] is True

@pytest.mark.asyncio
async def test_clear_session_not_found(service):
    """Test clearing non-existent session."""
    fake_uuid = str(uuid4())
    success = await service.clear_session(fake_uuid)
    # Should return True (idempotent operation)
    assert success is True

@pytest.mark.asyncio
async def test_clear_session_invalid_uuid(service):
    """Test clearing session with invalid UUID."""
    success = await service.clear_session("not-a-uuid")
    assert success is False

# ===== SESSION METADATA TESTS =====

@pytest.mark.asyncio
async def test_get_session_metadata_success(service, test_session):
    """Test getting session metadata."""
    metadata = await service.get_session_metadata(test_session.id)

    assert metadata["exists"] is True
    assert metadata["expired"] is False
    assert metadata["is_valid_uuid"] is True
    assert metadata["user_id"] == test_session.user_id
    assert metadata["ip_address"] == "127.0.0.1"
    assert metadata["user_agent"] == "TestAgent/1.0"

@pytest.mark.asyncio
async def test_get_session_metadata_not_found(service):
    """Test getting metadata for non-existent session."""
    fake_uuid = str(uuid4())
    metadata = await service.get_session_metadata(fake_uuid)

    assert metadata["exists"] is False
    assert metadata["is_valid_uuid"] is True

@pytest.mark.asyncio
async def test_get_session_metadata_invalid_uuid(service):
    """Test getting metadata with invalid UUID."""
    metadata = await service.get_session_metadata("not-a-uuid")

    assert metadata["exists"] is False
    assert metadata["is_valid_uuid"] is False

# ===== SESSION CLEANUP TESTS =====

@pytest.mark.asyncio
async def test_cleanup_expired_sessions_success(service, db_session, test_user, audit_logger):
    """Test cleanup of multiple expired sessions."""
    # Create 3 expired sessions and 2 valid sessions
    for i in range(3):
        expired_at = datetime.now(timezone.utc) - timedelta(hours=i + 1)
        session = SessionModel(
            id=str(uuid4()),
            user_id=test_user.id,
            expires_at=expired_at
        )
        db_session.add(session)

    for i in range(2):
        valid_at = datetime.now(timezone.utc) + timedelta(hours=i + 1)
        session = SessionModel(
            id=str(uuid4()),
            user_id=test_user.id,
            expires_at=valid_at
        )
        db_session.add(session)

    db_session.commit()

    # Run cleanup
    deleted_count = await service.cleanup_expired_sessions()
    assert deleted_count == 3

    # Verify only 2 sessions remain
    remaining_sessions = db_session.query(SessionModel).all()
    assert len(remaining_sessions) == 2

    # Verify audit log
    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["event_type"] == "session.cleanup"
    assert log["details"]["deleted_count"] == 3

@pytest.mark.asyncio
async def test_cleanup_expired_sessions_none_expired(service):
    """Test cleanup when no sessions are expired."""
    deleted_count = await service.cleanup_expired_sessions()
    assert deleted_count == 0

# ===== MULTI-SESSION MANAGEMENT TESTS =====

@pytest.mark.asyncio
async def test_get_user_sessions_success(service, db_session, test_user):
    """Test getting all active sessions for a user."""
    # Create 3 active sessions for user
    session_ids = []
    for i in range(3):
        session_id = str(uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=i + 1)
        session = SessionModel(
            id=session_id,
            user_id=test_user.id,
            expires_at=expires_at,
            ip_address=f"192.168.1.{i + 1}"
        )
        db_session.add(session)
        session_ids.append(session_id)

    # Create 1 expired session (should be excluded)
    expired_session = SessionModel(
        id=str(uuid4()),
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db_session.add(expired_session)
    db_session.commit()

    # Get user sessions
    sessions = await service.get_user_sessions(test_user.id)

    assert len(sessions) == 3
    returned_ids = [s["id"] for s in sessions]
    for sid in session_ids:
        assert sid in returned_ids

@pytest.mark.asyncio
async def test_get_user_sessions_no_sessions(service, test_user):
    """Test getting sessions when user has none."""
    sessions = await service.get_user_sessions(test_user.id)
    assert len(sessions) == 0

@pytest.mark.asyncio
async def test_revoke_user_sessions_success(service, db_session, test_user, audit_logger):
    """Test revoking all sessions for a user."""
    # Create 3 sessions for user
    for i in range(3):
        session = SessionModel(
            id=str(uuid4()),
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        db_session.add(session)
    db_session.commit()

    # Revoke all sessions
    revoked_count = await service.revoke_user_sessions(test_user.id)
    assert revoked_count == 3

    # Verify all sessions deleted
    remaining_sessions = db_session.query(SessionModel).filter(
        SessionModel.user_id == test_user.id
    ).all()
    assert len(remaining_sessions) == 0

    # Verify audit log
    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["event_type"] == "session.revoke_user_sessions"
    assert log["details"]["revoked_count"] == 3

@pytest.mark.asyncio
async def test_revoke_user_sessions_except_current(service, db_session, test_user):
    """Test revoking all sessions except current one."""
    # Create 3 sessions for user
    session_ids = []
    for i in range(3):
        session_id = str(uuid4())
        session = SessionModel(
            id=session_id,
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        db_session.add(session)
        session_ids.append(session_id)
    db_session.commit()

    # Revoke all except first session
    current_session_id = session_ids[0]
    revoked_count = await service.revoke_user_sessions(
        test_user.id,
        except_session_id=current_session_id
    )
    assert revoked_count == 2

    # Verify only current session remains
    remaining_sessions = db_session.query(SessionModel).filter(
        SessionModel.user_id == test_user.id
    ).all()
    assert len(remaining_sessions) == 1
    assert remaining_sessions[0].id == current_session_id

@pytest.mark.asyncio
async def test_revoke_user_sessions_no_sessions(service, test_user):
    """Test revoking sessions when user has none."""
    revoked_count = await service.revoke_user_sessions(test_user.id)
    assert revoked_count == 0

# ===== AUDIT LOGGING TESTS =====

@pytest.mark.asyncio
async def test_audit_logging_on_restore(service, test_session, audit_logger):
    """Test that session restore logs audit event."""
    await service.restore_session(test_session.id)

    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["event_type"] == "session.restore"
    assert log["resource_id"] == test_session.id
    assert log["action"] == "read"
    assert log["success"] is True

@pytest.mark.asyncio
async def test_audit_logging_on_clear(service, test_session, audit_logger):
    """Test that session clear logs audit event."""
    await service.clear_session(test_session.id)

    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["event_type"] == "session.clear"
    assert log["resource_id"] == test_session.id
    assert log["action"] == "delete"
    assert log["success"] is True

@pytest.mark.asyncio
async def test_audit_logging_on_cleanup(service, db_session, test_user, audit_logger):
    """Test that session cleanup logs audit event."""
    # Create expired session
    session = SessionModel(
        id=str(uuid4()),
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db_session.add(session)
    db_session.commit()

    await service.cleanup_expired_sessions()

    assert len(audit_logger.logs) > 0
    log = audit_logger.logs[-1]
    assert log["event_type"] == "session.cleanup"
    assert log["resource_id"] == "system"
    assert log["success"] is True
    assert log["details"]["deleted_count"] == 1

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

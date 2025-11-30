"""
Comprehensive test suite for SessionManager service.

Tests all methods, edge cases, error handling, and security features.
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock

from backend.models.base import Base
from backend.models.user import User
from backend.models.session import Session as SessionModel

# Import all models to prevent SQLAlchemy relationship errors
try:
    pass
except ImportError:
    # Models may not exist yet - tests will still work for basic session operations
    pass

from backend.services.auth.session_manager import (
    SessionManager,
    SessionManagerError,
    SessionValidationResult,
    InMemorySession,
    get_session_manager
)

# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_engine():
    """Create test database engine."""
    engine = create_engine(TEST_DATABASE_URL, echo=False)
    # Ensure clean state by dropping all tables first
    Base.metadata.drop_all(engine)
    # Now create all tables fresh
    Base.metadata.create_all(engine)
    yield engine
    # Cleanup after test
    Base.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture
def db_session(db_engine):
    """Create test database session."""
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def mock_audit_logger():
    """Create mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        username="test_user",
        email="test@example.com",
        password_hash="dummy_hash",
        password_salt="dummy_salt",
        role="user",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def inactive_user(db_session):
    """Create inactive test user."""
    user = User(
        username="inactive_user",
        email="inactive@example.com",
        password_hash="dummy_hash",
        password_salt="dummy_salt",
        role="user",
        is_active=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def session_manager(db_session, mock_audit_logger):
    """Create SessionManager instance without memory cache."""
    return SessionManager(
        db=db_session,
        audit_logger=mock_audit_logger,
        enable_memory_cache=False
    )

@pytest.fixture
def session_manager_with_cache(db_session, mock_audit_logger):
    """Create SessionManager instance with memory cache enabled."""
    return SessionManager(
        db=db_session,
        audit_logger=mock_audit_logger,
        enable_memory_cache=True
    )

# ============================================================================
# Test Session Creation
# ============================================================================

@pytest.mark.asyncio
async def test_create_session_basic(session_manager, test_user):
    """Test basic session creation."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Verify session ID is UUID format
    assert isinstance(session_id, str)
    assert len(session_id) == 36  # UUID v4 format

    # Verify session exists in database
    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()

    assert db_session is not None
    assert db_session.user_id == test_user.id
    # SQLite returns naive datetimes, so use utcnow() instead of now(timezone.utc)
    assert db_session.expires_at > datetime.utcnow()

@pytest.mark.asyncio
async def test_create_session_with_remember_me(session_manager, test_user):
    """Test session creation with remember_me flag."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=True
    )

    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()

    # Remember me sessions should expire in ~30 days
    # SQLite returns naive datetimes, so use utcnow() instead of now(timezone.utc)
    expiration_delta = db_session.expires_at - datetime.utcnow()
    assert expiration_delta.days >= 29  # Allow for slight timing difference

@pytest.mark.asyncio
async def test_create_session_with_metadata(session_manager, test_user):
    """Test session creation with IP address and user agent."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False,
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0"
    )

    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()

    assert db_session.ip_address == "192.168.1.100"
    assert db_session.user_agent == "Mozilla/5.0"

@pytest.mark.asyncio
async def test_create_session_nonexistent_user(session_manager):
    """Test session creation for non-existent user raises error."""
    with pytest.raises(SessionManagerError, match="User 99999 not found"):
        await session_manager.create_session(
            user_id=99999,
            username="nonexistent",
            remember_me=False
        )

@pytest.mark.asyncio
async def test_create_session_inactive_user(session_manager, inactive_user):
    """Test session creation for inactive user raises error."""
    with pytest.raises(SessionManagerError, match="account is inactive"):
        await session_manager.create_session(
            user_id=inactive_user.id,
            username=inactive_user.username,
            remember_me=False
        )

@pytest.mark.asyncio
async def test_create_session_with_cache(session_manager_with_cache, test_user):
    """Test session creation adds to memory cache."""
    session_id = await session_manager_with_cache.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Verify session is in memory cache
    assert session_id in session_manager_with_cache._memory_cache
    cached_session = session_manager_with_cache._memory_cache[session_id]
    assert cached_session.user_id == test_user.id
    assert cached_session.username == test_user.username

@pytest.mark.asyncio
async def test_create_session_audit_logging(session_manager, test_user, mock_audit_logger):
    """Test that session creation is audited."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=True
    )

    # Verify audit log was called
    mock_audit_logger.log.assert_called()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "session.create"
    assert call_args["user_id"] == str(test_user.id)
    assert call_args["action"] == "create"
    assert call_args["success"] is True

# ============================================================================
# Test Session Validation
# ============================================================================

@pytest.mark.asyncio
async def test_validate_session_valid(session_manager, test_user):
    """Test validating a valid session."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    result = await session_manager.validate_session(session_id)

    assert isinstance(result, SessionValidationResult)
    assert result.valid is True
    assert result.user_id == test_user.id
    assert result.username == test_user.username

@pytest.mark.asyncio
async def test_validate_session_nonexistent(session_manager):
    """Test validating a non-existent session."""
    fake_session_id = str(uuid4())
    result = await session_manager.validate_session(fake_session_id)

    assert result.valid is False
    assert result.user_id is None
    assert result.username is None

@pytest.mark.asyncio
async def test_validate_session_expired(session_manager, test_user):
    """Test validating an expired session automatically cleans it up."""
    # Create session
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Manually expire the session
    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()
    db_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session_manager.db.commit()

    # Validate should return invalid and clean up session
    result = await session_manager.validate_session(session_id)

    assert result.valid is False

    # Verify session was deleted from database
    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()
    assert db_session is None

@pytest.mark.asyncio
async def test_validate_session_with_cache_hit(session_manager_with_cache, test_user):
    """Test validating session with memory cache hit."""
    session_id = await session_manager_with_cache.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # First validation should load from cache
    result = await session_manager_with_cache.validate_session(session_id)

    assert result.valid is True
    assert result.user_id == test_user.id
    assert result.username == test_user.username

@pytest.mark.asyncio
async def test_validate_session_with_cache_expired(session_manager_with_cache, test_user):
    """Test validating expired session with memory cache."""
    session_id = await session_manager_with_cache.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Manually expire cached session
    cached_session = session_manager_with_cache._memory_cache[session_id]
    cached_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)

    # Validate should return invalid and remove from cache
    result = await session_manager_with_cache.validate_session(session_id)

    assert result.valid is False
    assert session_id not in session_manager_with_cache._memory_cache

@pytest.mark.asyncio
async def test_validate_session_inactive_user(session_manager, inactive_user):
    """Test validating session for inactive user returns invalid."""
    # Create session for active user, then deactivate
    user = User(
        username="temp_user",
        email="temp@example.com",
        password_hash="hash",
        password_salt="salt",
        role="user",
        is_active=True
    )
    session_manager.db.add(user)
    session_manager.db.commit()
    session_manager.db.refresh(user)

    session_id = await session_manager.create_session(
        user_id=user.id,
        username=user.username,
        remember_me=False
    )

    # Deactivate user
    user.is_active = False
    session_manager.db.commit()

    # Validation should fail
    result = await session_manager.validate_session(session_id)
    assert result.valid is False

# ============================================================================
# Test Session Destruction
# ============================================================================

@pytest.mark.asyncio
async def test_destroy_session_existing(session_manager, test_user):
    """Test destroying an existing session."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Destroy session
    success = await session_manager.destroy_session(session_id)

    assert success is True

    # Verify session no longer exists
    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()
    assert db_session is None

@pytest.mark.asyncio
async def test_destroy_session_nonexistent(session_manager):
    """Test destroying a non-existent session."""
    fake_session_id = str(uuid4())
    success = await session_manager.destroy_session(fake_session_id)

    assert success is False

@pytest.mark.asyncio
async def test_destroy_session_with_cache(session_manager_with_cache, test_user):
    """Test destroying session removes from cache."""
    session_id = await session_manager_with_cache.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Verify session is cached
    assert session_id in session_manager_with_cache._memory_cache

    # Destroy session
    await session_manager_with_cache.destroy_session(session_id)

    # Verify session removed from cache
    assert session_id not in session_manager_with_cache._memory_cache

@pytest.mark.asyncio
async def test_destroy_session_audit_logging(session_manager, test_user, mock_audit_logger):
    """Test that session destruction is audited."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Clear previous calls
    mock_audit_logger.log.reset_mock()

    await session_manager.destroy_session(session_id)

    # Verify audit log was called
    mock_audit_logger.log.assert_called()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "session.destroy"
    assert call_args["action"] == "delete"
    assert call_args["success"] is True

# ============================================================================
# Test Cleanup Expired Sessions
# ============================================================================

@pytest.mark.asyncio
async def test_cleanup_expired_sessions(session_manager, test_user):
    """Test cleaning up expired sessions."""
    # Create 3 sessions
    session_ids = []
    for i in range(3):
        session_id = await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )
        session_ids.append(session_id)

    # Expire 2 of them
    for i in range(2):
        db_session = session_manager.db.query(SessionModel).filter(
            SessionModel.id == session_ids[i]
        ).first()
        db_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session_manager.db.commit()

    # Run cleanup
    cleaned_count = await session_manager.cleanup_expired_sessions()

    assert cleaned_count == 2

    # Verify only 1 session remains
    remaining = session_manager.db.query(SessionModel).count()
    assert remaining == 1

@pytest.mark.asyncio
async def test_cleanup_expired_sessions_with_cache(session_manager_with_cache, test_user):
    """Test cleaning up expired sessions from cache and database."""
    # Create 2 sessions
    session_ids = []
    for i in range(2):
        session_id = await session_manager_with_cache.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )
        session_ids.append(session_id)

    # Expire both in cache and database
    for session_id in session_ids:
        # Expire in cache
        cached = session_manager_with_cache._memory_cache[session_id]
        cached.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)

        # Expire in database
        db_session = session_manager_with_cache.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).first()
        db_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)

    session_manager_with_cache.db.commit()

    # Run cleanup
    cleaned_count = await session_manager_with_cache.cleanup_expired_sessions()

    assert cleaned_count >= 2

    # Verify cache is empty
    assert len(session_manager_with_cache._memory_cache) == 0

    # Verify database is empty
    remaining = session_manager_with_cache.db.query(SessionModel).count()
    assert remaining == 0

@pytest.mark.asyncio
async def test_cleanup_expired_sessions_none_expired(session_manager, test_user):
    """Test cleanup with no expired sessions."""
    # Create active session
    await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    # Run cleanup
    cleaned_count = await session_manager.cleanup_expired_sessions()

    assert cleaned_count == 0

# ============================================================================
# Test Session Counts and Monitoring
# ============================================================================

def test_get_session_count(session_manager, test_user):
    """Test getting session counts."""
    counts = session_manager.get_session_count()

    assert "memory_cache" in counts
    assert "database" in counts
    assert "active" in counts
    assert counts["memory_cache"] == 0  # Cache disabled
    assert counts["database"] == 0
    assert counts["active"] == 0

@pytest.mark.asyncio
async def test_get_session_count_with_sessions(session_manager, test_user):
    """Test getting session counts with active sessions."""
    # Create 2 sessions
    for i in range(2):
        await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )

    counts = session_manager.get_session_count()

    assert counts["database"] == 2
    assert counts["active"] == 2

@pytest.mark.asyncio
async def test_get_session_count_with_cache(session_manager_with_cache, test_user):
    """Test getting session counts with memory cache."""
    # Create 2 sessions
    for i in range(2):
        await session_manager_with_cache.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )

    counts = session_manager_with_cache.get_session_count()

    assert counts["memory_cache"] == 2
    assert counts["database"] == 2
    assert counts["active"] == 2

def test_get_active_session_ids(session_manager):
    """Test getting active session IDs."""
    ids = session_manager.get_active_session_ids()

    assert isinstance(ids, list)
    assert len(ids) == 0

@pytest.mark.asyncio
async def test_get_active_session_ids_with_sessions(session_manager, test_user):
    """Test getting active session IDs with sessions."""
    # Create 2 sessions
    session_ids = []
    for i in range(2):
        session_id = await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )
        session_ids.append(session_id)

    active_ids = session_manager.get_active_session_ids()

    assert len(active_ids) == 2
    assert set(active_ids) == set(session_ids)

# ============================================================================
# Test User Session Management
# ============================================================================

@pytest.mark.asyncio
async def test_get_user_sessions(session_manager, test_user):
    """Test getting all sessions for a user."""
    # Create 3 sessions for user
    for i in range(3):
        await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )

    sessions = await session_manager.get_user_sessions(test_user.id)

    assert len(sessions) == 3
    for session in sessions:
        assert session["user_id"] == test_user.id

@pytest.mark.asyncio
async def test_get_user_sessions_no_sessions(session_manager, test_user):
    """Test getting sessions for user with no sessions."""
    sessions = await session_manager.get_user_sessions(test_user.id)

    assert len(sessions) == 0

@pytest.mark.asyncio
async def test_get_user_sessions_excludes_expired(session_manager, test_user):
    """Test get_user_sessions excludes expired sessions."""
    # Create 2 sessions
    session_ids = []
    for i in range(2):
        session_id = await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )
        session_ids.append(session_id)

    # Expire one session
    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_ids[0]
    ).first()
    db_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session_manager.db.commit()

    # Should only return 1 active session
    sessions = await session_manager.get_user_sessions(test_user.id)

    assert len(sessions) == 1
    assert sessions[0]["id"] == session_ids[1]

@pytest.mark.asyncio
async def test_revoke_user_sessions(session_manager, test_user):
    """Test revoking all sessions for a user."""
    # Create 3 sessions
    for i in range(3):
        await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )

    # Revoke all sessions
    revoked_count = await session_manager.revoke_user_sessions(test_user.id)

    assert revoked_count == 3

    # Verify no sessions remain
    remaining = session_manager.db.query(SessionModel).filter(
        SessionModel.user_id == test_user.id
    ).count()
    assert remaining == 0

@pytest.mark.asyncio
async def test_revoke_user_sessions_except_current(session_manager, test_user):
    """Test revoking all sessions except current one."""
    # Create 3 sessions
    session_ids = []
    for i in range(3):
        session_id = await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )
        session_ids.append(session_id)

    # Revoke all except first session
    current_session_id = session_ids[0]
    revoked_count = await session_manager.revoke_user_sessions(
        test_user.id,
        except_session_id=current_session_id
    )

    assert revoked_count == 2

    # Verify only current session remains
    remaining_sessions = session_manager.db.query(SessionModel).filter(
        SessionModel.user_id == test_user.id
    ).all()

    assert len(remaining_sessions) == 1
    assert remaining_sessions[0].id == current_session_id

@pytest.mark.asyncio
async def test_revoke_user_sessions_with_cache(session_manager_with_cache, test_user):
    """Test revoking sessions removes from cache."""
    # Create 2 sessions
    session_ids = []
    for i in range(2):
        session_id = await session_manager_with_cache.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )
        session_ids.append(session_id)

    # Verify sessions are cached
    assert len(session_manager_with_cache._memory_cache) == 2

    # Revoke all sessions
    await session_manager_with_cache.revoke_user_sessions(test_user.id)

    # Verify cache is cleared
    assert len(session_manager_with_cache._memory_cache) == 0

# ============================================================================
# Test Singleton Pattern
# ============================================================================

def test_get_session_manager_singleton(db_session):
    """Test get_session_manager returns singleton instance."""
    manager1 = get_session_manager(db_session)
    manager2 = get_session_manager(db_session)

    assert manager1 is manager2

# ============================================================================
# Test Pydantic Models
# ============================================================================

def test_in_memory_session_model():
    """Test InMemorySession Pydantic model."""
    session = InMemorySession(
        id="test-uuid",
        user_id=123,
        username="testuser",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        remember_me=False
    )

    assert session.id == "test-uuid"
    assert session.user_id == 123
    assert session.username == "testuser"
    assert session.remember_me is False

def test_session_validation_result_model():
    """Test SessionValidationResult Pydantic model."""
    result = SessionValidationResult(
        valid=True,
        user_id=123,
        username="testuser"
    )

    assert result.valid is True
    assert result.user_id == 123
    assert result.username == "testuser"

def test_session_validation_result_invalid():
    """Test SessionValidationResult for invalid session."""
    result = SessionValidationResult(valid=False)

    assert result.valid is False
    assert result.user_id is None
    assert result.username is None

# ============================================================================
# Test Error Handling
# ============================================================================

@pytest.mark.asyncio
@pytest.mark.skip(reason="SQLite in-memory databases don't raise errors when session is closed - test needs mocking")
async def test_create_session_database_error(session_manager, test_user):
    """Test session creation handles database errors gracefully."""
    # Note: This test doesn't work with SQLite in-memory databases because they
    # automatically reconnect. To properly test error handling, we would need to mock
    # the database operations to raise exceptions.
    # Close the database session to simulate error
    session_manager.db.close()

    with pytest.raises(SessionManagerError, match="Failed to create session"):
        await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )

@pytest.mark.asyncio
async def test_validate_session_database_error(session_manager):
    """Test session validation handles database errors gracefully."""
    # Close the database session to simulate error
    session_manager.db.close()

    result = await session_manager.validate_session("some-uuid")

    # Should return invalid rather than raising error
    assert result.valid is False

# ============================================================================
# Test Expiration Calculations
# ============================================================================

@pytest.mark.asyncio
async def test_session_expiration_24_hours(session_manager, test_user):
    """Test default session expires in 24 hours."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()

    expiration_delta = db_session.expires_at - db_session.created_at
    hours = expiration_delta.total_seconds() / 3600

    assert 23.9 < hours < 24.1  # Allow for slight timing difference

@pytest.mark.asyncio
async def test_session_expiration_30_days(session_manager, test_user):
    """Test remember_me session expires in 30 days."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=True
    )

    db_session = session_manager.db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()

    expiration_delta = db_session.expires_at - db_session.created_at
    days = expiration_delta.total_seconds() / 86400

    assert 29.9 < days < 30.1  # Allow for slight timing difference

# ============================================================================
# Run tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

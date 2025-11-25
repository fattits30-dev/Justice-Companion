"""
Simplified test suite for SessionManager service (no model dependencies).

Tests all methods without requiring full database schema.
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from unittest.mock import Mock

from backend.services.auth.session_manager import (
    SessionManager,
    SessionManagerError,
    SessionValidationResult
)

# Simple test models (no dependencies)
TestBase = declarative_base()

class TestUser(TestBase):
    """Simplified User model for testing."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    sessions = relationship("TestSession", back_populates="user", cascade="all, delete-orphan")

class TestSession(TestBase):
    """Simplified Session model for testing."""
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    user = relationship("TestUser", back_populates="sessions")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
        }

# Monkey-patch backend models for testing
import backend.models.user
import backend.models.session
backend.models.user.User = TestUser
backend.models.session.Session = TestSession

# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_engine():
    """Create test database engine."""
    engine = create_engine(TEST_DATABASE_URL, echo=False)
    TestBase.metadata.create_all(engine)
    yield engine
    TestBase.metadata.drop_all(engine)
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
    user = TestUser(
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
    user = TestUser(
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

    assert isinstance(session_id, str)
    assert len(session_id) == 36

    db_session = session_manager.db.query(TestSession).filter(
        TestSession.id == session_id
    ).first()

    assert db_session is not None
    assert db_session.user_id == test_user.id

@pytest.mark.asyncio
async def test_create_session_with_remember_me(session_manager, test_user):
    """Test session creation with remember_me flag."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=True
    )

    db_session = session_manager.db.query(TestSession).filter(
        TestSession.id == session_id
    ).first()

    expiration_delta = db_session.expires_at - datetime.now(timezone.utc)
    assert expiration_delta.days >= 29

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
async def test_validate_session_valid(session_manager, test_user):
    """Test validating a valid session."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    result = await session_manager.validate_session(session_id)

    assert result.valid is True
    assert result.user_id == test_user.id
    assert result.username == test_user.username

@pytest.mark.asyncio
async def test_validate_session_nonexistent(session_manager):
    """Test validating a non-existent session."""
    fake_session_id = str(uuid4())
    result = await session_manager.validate_session(fake_session_id)

    assert result.valid is False

@pytest.mark.asyncio
async def test_destroy_session_existing(session_manager, test_user):
    """Test destroying an existing session."""
    session_id = await session_manager.create_session(
        user_id=test_user.id,
        username=test_user.username,
        remember_me=False
    )

    success = await session_manager.destroy_session(session_id)

    assert success is True

    db_session = session_manager.db.query(TestSession).filter(
        TestSession.id == session_id
    ).first()
    assert db_session is None

@pytest.mark.asyncio
async def test_cleanup_expired_sessions(session_manager, test_user):
    """Test cleaning up expired sessions."""
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
        db_session = session_manager.db.query(TestSession).filter(
            TestSession.id == session_ids[i]
        ).first()
        db_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session_manager.db.commit()

    cleaned_count = await session_manager.cleanup_expired_sessions()

    assert cleaned_count == 2

    remaining = session_manager.db.query(TestSession).count()
    assert remaining == 1

def test_get_session_count(session_manager):
    """Test getting session counts."""
    counts = session_manager.get_session_count()

    assert "memory_cache" in counts
    assert "database" in counts
    assert "active" in counts

@pytest.mark.asyncio
async def test_revoke_user_sessions(session_manager, test_user):
    """Test revoking all sessions for a user."""
    for i in range(3):
        await session_manager.create_session(
            user_id=test_user.id,
            username=test_user.username,
            remember_me=False
        )

    revoked_count = await session_manager.revoke_user_sessions(test_user.id)

    assert revoked_count == 3

    remaining = session_manager.db.query(TestSession).filter(
        TestSession.user_id == test_user.id
    ).count()
    assert remaining == 0

def test_pydantic_models():
    """Test Pydantic model validation."""
    result = SessionValidationResult(
        valid=True,
        user_id=123,
        username="testuser"
    )

    assert result.valid is True
    assert result.user_id == 123

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

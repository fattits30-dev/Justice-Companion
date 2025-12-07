"""
Global pytest configuration and fixtures for backend tests.

This file provides:
- Isolated test database (in-memory SQLite)
- Database session fixtures with automatic cleanup
- Test client with proper dependency injection
- Mock services for testing
- Common test utilities

Every test automatically gets a clean database state.
"""

import os
import base64
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from unittest.mock import Mock

# Import FastAPI app and models
from backend.main import app
from backend.models.base import Base, get_db
from backend.services.rate_limit_service import RateLimitService, RateLimitResult
from backend.services.security.encryption import EncryptionService

# Set encryption key for tests (required by backend)
os.environ["ENCRYPTION_KEY_BASE64"] = base64.b64encode(os.urandom(32)).decode()

# ============================================================================
# Database Fixtures
# ============================================================================

# Create in-memory SQLite database for testing
# Use StaticPool to ensure connection persists across test session
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    """
    Create database engine for test session.
    Uses in-memory SQLite with StaticPool for persistence.
    """
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # Keep single connection for :memory:
    )

    # Enable foreign key constraints for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create all tables once for the session
    Base.metadata.create_all(bind=engine)

    yield engine

    # Drop all tables after test session
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """
    Create a fresh database session for each test.

    Automatically rolls back all changes after the test completes,
    ensuring complete isolation between tests.
    """
    # Create a connection
    connection = engine.connect()

    # Begin a transaction
    transaction = connection.begin()

    # Create a session bound to the connection
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=connection
    )
    session = TestingSessionLocal()

    yield session

    # Rollback transaction and close
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session, mock_encryption_service):
    """
    Create FastAPI test client with centralized dependency overrides.

    Overrides both database and encryption service dependencies to use
    test fixtures. This ensures all routes using centralized dependencies
    from backend.dependencies module work correctly in tests.

    All database operations in tests use the isolated test database.
    All encryption operations use the mock encryption service.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Import centralized dependencies
    from backend.dependencies import (
        get_encryption_service,
        get_encryption_service_fallback,
        get_audit_logger,
    )

    # Override database dependency
    app.dependency_overrides[get_db] = override_get_db

    # Override encryption service dependencies
    app.dependency_overrides[get_encryption_service] = lambda: mock_encryption_service
    app.dependency_overrides[get_encryption_service_fallback] = lambda: mock_encryption_service

    # Create test client
    test_client = TestClient(app)

    yield test_client

    # Clean up dependency overrides
    app.dependency_overrides.clear()


# ============================================================================
# Service Mocks
# ============================================================================

@pytest.fixture
def mock_rate_limiter():
    """
    Create mock rate limiter that allows all requests by default.

    Tests can override specific methods to test rate limiting behavior.
    """
    limiter = Mock(spec=RateLimitService)

    # Default: allow all requests
    limiter.check_rate_limit.return_value = RateLimitResult(
        allowed=True,
        attempts_remaining=5,
        message="Operation allowed"
    )
    limiter.get_remaining.return_value = 5
    limiter.is_locked.return_value = False
    limiter.get_attempt_count.return_value = 0
    limiter.get_reset_time.return_value = None

    return limiter


@pytest.fixture
def mock_encryption_service():
    """
    Create mock encryption service for testing.

    Uses a deterministic key for predictable test results.
    """
    test_key = base64.b64encode(b"test_key" * 4).decode()  # 32 bytes
    return EncryptionService(test_key)


# ============================================================================
# Test Utilities
# ============================================================================

@pytest.fixture
def test_user_data():
    """Provide standard test user data."""
    return {
        "username": "test_user",
        "email": "test@example.com",
        "password": "TestPassword123!",
    }


@pytest.fixture
def test_case_data():
    """Provide standard test case data."""
    return {
        "title": "Test Case",
        "description": "Test case description",
        "case_type": "employment",
        "status": "active",
    }


# ============================================================================
# Pytest Configuration
# ============================================================================

def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line("markers", "unit: Unit tests (fast)")
    config.addinivalue_line("markers", "integration: Integration tests (moderate speed)")
    config.addinivalue_line("markers", "e2e: End-to-end tests (slow)")
    config.addinivalue_line("markers", "slow: Tests that take >1 second")
    config.addinivalue_line("markers", "security: Security-focused tests")
    config.addinivalue_line("markers", "performance: Performance benchmarks")
    config.addinivalue_line("markers", "requires_ai: Tests requiring AI service")
    config.addinivalue_line("markers", "requires_db: Tests requiring database")


def pytest_collection_modifyitems(config, items):
    """Add markers to tests based on their location."""
    for item in items:
        # Mark all tests as requires_db by default
        if "requires_db" not in item.keywords:
            item.add_marker(pytest.mark.requires_db)

        # Mark tests in specific directories
        if "services" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "routes" in str(item.fspath):
            item.add_marker(pytest.mark.integration)

        # Mark slow tests
        if "slow" in item.nodeid.lower() or "e2e" in item.nodeid.lower():
            item.add_marker(pytest.mark.slow)

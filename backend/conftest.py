"""Shared pytest fixtures for backend tests."""

import asyncio
import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from backend.main import app
from backend.models.ai_provider_config import AIProviderConfig
from backend.models.base import Base, get_db
from backend.models.case import Case
from backend.models.consent import Consent
from backend.models.deadline import Deadline
from backend.models.evidence import Evidence
from backend.models.notification import Notification
from backend.models.profile import UserProfile
from backend.models.session import Session as SessionModel
from backend.models.tag import Tag
from backend.models.template import CaseTemplate, TemplateUsage
from backend.models.user import User
from backend.services.auth.service import AuthenticationService

# NOTE: These values are test-only fixtures used across multiple tests.
# They are not real credentials and never leave the test environment.
TEST_USER_USERNAME = os.getenv("TEST_USER_USERNAME", "testuser-fixture")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "TestPass123!")
TEST_USER2_USERNAME = os.getenv("TEST_USER2_USERNAME", "testuser2-fixture")
TEST_USER2_PASSWORD = os.getenv("TEST_USER2_PASSWORD", "test-user2-password")

# Import ALL models to register them with Base.metadata
# Keeping them referenced prevents Ruff from flagging unused imports.
_REGISTERED_MODELS = (
    AIProviderConfig,
    Case,
    Consent,
    Deadline,
    Evidence,
    Notification,
    UserProfile,
    SessionModel,
    Tag,
    CaseTemplate,
    TemplateUsage,
    User,
)

# NOTE: Conversation and Message are imported from other models but not registered
# in _REGISTERED_MODELS as they may be loaded via model relationships.
# Commenting out to fix F401 unused import warning.
# from backend.models.chat import Conversation, Message
# from backend.models.backup import BackupSettings  # May not exist

# ===== DATABASE SETUP =====
# Use file-based SQLite for test isolation; in-memory DBs do not
# share state across connections.
TEST_DATABASE_URL = "sqlite:///./test_database.db"

# Create engine with check_same_thread=False for SQLite
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False  # Set to True for SQL debugging
)

# Create sessionmaker bound to test engine
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def override_get_db() -> Generator[Session, None, None]:
    """Override database dependency for testing."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply the override globally
app.dependency_overrides[get_db] = override_get_db

# ===== FIXTURES =====

@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create fresh database for each test.

    - Creates all tables before test
    - Yields database session
    - Drops all tables after test
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    db = TestingSessionLocal()

    # Create audit_logs table (uses raw SQL, not ORM)
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            event_type TEXT NOT NULL,
            user_id TEXT,
            resource_type TEXT,
            resource_id TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            success INTEGER NOT NULL,
            error_message TEXT,
            integrity_hash TEXT,
            previous_log_hash TEXT,
            created_at TEXT NOT NULL
        )
    """))
    db.commit()

    try:
        yield db
    finally:
        db.close()
        # Drop all tables for clean state
        Base.metadata.drop_all(bind=engine)
        # Also drop audit_logs
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS audit_logs"))
            conn.commit()

@pytest.fixture(scope="function")
def client() -> TestClient:
    """FastAPI test client."""
    return TestClient(app)

@pytest.fixture(scope="function")
def test_user(db: Session) -> User:
    """
    Create test user with hashed password.

    Uses asyncio to run async register method.
    """
    auth_service = AuthenticationService(db=db)

    # Run async register in sync context
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        auth_service.register(
            username=TEST_USER_USERNAME,
            password=TEST_USER_PASSWORD,
            email="test@example.com"
        )
    )

    # register() returns user and session dicts; fetch ORM user for assertions
    user_id = result["user"]["id"]
    user = db.query(User).filter(User.id == user_id).first()
    return user

@pytest.fixture(scope="function")
def test_user_2(db: Session) -> User:
    """Create second test user for multi-user tests."""
    auth_service = AuthenticationService(db=db)

    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        auth_service.register(
            username=TEST_USER2_USERNAME,
            password=TEST_USER2_PASSWORD,
            email="test2@example.com"
        )
    )

    # register() returns user and session dicts; fetch ORM user for assertions
    user_id = result["user"]["id"]
    user = db.query(User).filter(User.id == user_id).first()
    return user

@pytest.fixture(scope="function")
def auth_headers(db: Session, test_user: User) -> dict:
    """
    Create authenticated session and return auth headers.

    Returns headers dict with Bearer token for use in test requests.
    """
    auth_service = AuthenticationService(db=db)

    # Run async login in sync context
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        auth_service.login(
            username=TEST_USER_USERNAME,
            password=TEST_USER_PASSWORD
        )
    )

    session_id = result["session"]["id"]
    return {"Authorization": f"Bearer {session_id}"}

@pytest.fixture(scope="function")
def auth_headers_user_2(db: Session, test_user_2: User) -> dict:
    """Auth headers for second test user."""
    auth_service = AuthenticationService(db=db)

    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        auth_service.login(
            username=TEST_USER2_USERNAME,
            password=TEST_USER2_PASSWORD
        )
    )

    session_id = result["session"]["id"]
    return {"Authorization": f"Bearer {session_id}"}

@pytest.fixture(scope="function")
def test_case(db: Session, test_user: User) -> Case:
    """Create test case for case-related tests."""
    from backend.models.case import CaseStatus, CaseType
    case = Case(
        user_id=test_user.id,
        title="Test Case",
        description="Test case description",
        case_type=CaseType.EMPLOYMENT,
        status=CaseStatus.ACTIVE
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case

@pytest.fixture(scope="function")
def test_tag(db: Session, test_user: User) -> Tag:
    """Create test tag for tag-related tests."""
    tag = Tag(
        name="Test Tag",
        color="#FF0000",
        user_id=test_user.id
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@pytest.fixture(scope="function")
def test_deadline(db: Session, test_user: User, test_case: Case) -> Deadline:
    """Create test deadline for deadline-related tests."""
    from datetime import datetime, timedelta

    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="Test Deadline",
        deadline_date=datetime.utcnow() + timedelta(days=7),
        priority="medium",
        status="pending"
    )
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return deadline

@pytest.fixture(scope="function")
def test_evidence(db: Session, test_user: User, test_case: Case) -> Evidence:
    """Create test evidence for evidence-related tests."""
    evidence = Evidence(
        case_id=test_case.id,
        user_id=test_user.id,
        title="Test Evidence",
        description="Test evidence description",
        file_path="/test/path/file.pdf",
        file_type="pdf"
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence

# ===== ASYNC HELPERS =====

def run_async(coro):
    """Helper to run async coroutine in sync context."""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

# ===== PYTEST CONFIGURATION =====

def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

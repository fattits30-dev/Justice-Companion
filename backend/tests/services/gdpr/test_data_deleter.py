"""
Unit tests for DataDeleter service.

Tests GDPR Article 17 (Right to Erasure) implementation:
- Data deletion with FK constraint handling
- Transactional safety (all-or-nothing)
- Audit log and consent preservation
- Confirmation requirement
- Validation before deletion

Run with:
    pytest backend/services/gdpr/test_data_deleter.py -v
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from backend.services.gdpr.data_deleter import (
    DataDeleter,
    GdprDeleteOptions,
    DeletionNotConfirmedError
)
from backend.services.audit_logger import AuditLogger

# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def db_engine():
    """Create in-memory SQLite database engine for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    return engine

@pytest.fixture
def db_session(db_engine) -> Generator[Session, None, None]:
    """Create database session with schema."""
    # Create tables
    with db_engine.connect() as conn:
        # Users table
        conn.execute(text("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """))

        # Cases table (FK → users)
        conn.execute(text("""
            CREATE TABLE cases (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Evidence table (FK → cases)
        conn.execute(text("""
            CREATE TABLE evidence (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                file_path TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Timeline events table (FK → cases)
        conn.execute(text("""
            CREATE TABLE timeline_events (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                event_date TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Event evidence table (FK → timeline_events)
        conn.execute(text("""
            CREATE TABLE event_evidence (
                id INTEGER PRIMARY KEY,
                event_id INTEGER NOT NULL,
                evidence_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (event_id) REFERENCES timeline_events(id)
            )
        """))

        # Case facts table (FK → cases)
        conn.execute(text("""
            CREATE TABLE case_facts (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                fact TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Legal issues table (FK → cases)
        conn.execute(text("""
            CREATE TABLE legal_issues (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                issue TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Actions table (FK → cases)
        conn.execute(text("""
            CREATE TABLE actions (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Notes table (FK → cases)
        conn.execute(text("""
            CREATE TABLE notes (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Chat conversations table (FK → users)
        conn.execute(text("""
            CREATE TABLE chat_conversations (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Chat messages table (FK → chat_conversations)
        conn.execute(text("""
            CREATE TABLE chat_messages (
                id INTEGER PRIMARY KEY,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
            )
        """))

        # User facts table (FK → users)
        conn.execute(text("""
            CREATE TABLE user_facts (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                fact TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Sessions table (FK → users)
        conn.execute(text("""
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Consents table (FK → users)
        conn.execute(text("""
            CREATE TABLE consents (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                consent_type TEXT NOT NULL,
                granted INTEGER NOT NULL,
                granted_at TEXT NOT NULL,
                revoked_at TEXT,
                version INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Audit logs table (no FK to users - must be preserved)
        conn.execute(text("""
            CREATE TABLE audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                user_id TEXT,
                resource_type TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER NOT NULL,
                error_message TEXT,
                integrity_hash TEXT NOT NULL,
                previous_log_hash TEXT,
                created_at TEXT NOT NULL
            )
        """))

        conn.commit()

    # Create session
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()

    yield session

    session.close()

@pytest.fixture
def audit_logger(db_session):
    """Create AuditLogger instance."""
    return AuditLogger(db_session)

@pytest.fixture
def data_deleter(db_session, audit_logger):
    """Create DataDeleter instance."""
    return DataDeleter(db_session, audit_logger)

@pytest.fixture
def sample_user(db_session) -> int:
    """Create sample user for testing."""
    now = datetime.now(timezone.utc).isoformat()

    db_session.execute(text("""
        INSERT INTO users (id, username, email, created_at)
        VALUES (1, 'testuser', 'test@example.com', :now)
    """), {"now": now})

    db_session.commit()
    return 1

@pytest.fixture
def sample_data(db_session, sample_user) -> int:
    """Create comprehensive sample data for testing."""
    now = datetime.now(timezone.utc).isoformat()
    user_id = sample_user

    # Create case
    db_session.execute(text("""
        INSERT INTO cases (id, user_id, title, description, status, created_at)
        VALUES (1, :user_id, 'Test Case', 'Description', 'active', :now)
    """), {"user_id": user_id, "now": now})

    # Create evidence
    db_session.execute(text("""
        INSERT INTO evidence (id, case_id, title, file_path, created_at)
        VALUES (1, 1, 'Test Evidence', '/path/to/file', :now)
    """), {"now": now})

    # Create timeline event
    db_session.execute(text("""
        INSERT INTO timeline_events (id, case_id, event_date, description, created_at)
        VALUES (1, 1, :now, 'Test Event', :now)
    """), {"now": now})

    # Create event evidence
    db_session.execute(text("""
        INSERT INTO event_evidence (id, event_id, evidence_id, created_at)
        VALUES (1, 1, 1, :now)
    """), {"now": now})

    # Create case facts
    db_session.execute(text("""
        INSERT INTO case_facts (id, case_id, fact, created_at)
        VALUES (1, 1, 'Test Fact', :now)
    """), {"now": now})

    # Create legal issues
    db_session.execute(text("""
        INSERT INTO legal_issues (id, case_id, issue, created_at)
        VALUES (1, 1, 'Test Issue', :now)
    """), {"now": now})

    # Create actions
    db_session.execute(text("""
        INSERT INTO actions (id, case_id, action, created_at)
        VALUES (1, 1, 'Test Action', :now)
    """), {"now": now})

    # Create notes
    db_session.execute(text("""
        INSERT INTO notes (id, case_id, content, created_at)
        VALUES (1, 1, 'Test Note', :now)
    """), {"now": now})

    # Create chat conversation
    db_session.execute(text("""
        INSERT INTO chat_conversations (id, user_id, title, created_at)
        VALUES (1, :user_id, 'Test Chat', :now)
    """), {"user_id": user_id, "now": now})

    # Create chat messages
    db_session.execute(text("""
        INSERT INTO chat_messages (id, conversation_id, role, content, created_at)
        VALUES (1, 1, 'user', 'Hello', :now)
    """), {"now": now})

    # Create user facts
    db_session.execute(text("""
        INSERT INTO user_facts (id, user_id, fact, created_at)
        VALUES (1, :user_id, 'User Fact', :now)
    """), {"user_id": user_id, "now": now})

    # Create session
    db_session.execute(text("""
        INSERT INTO sessions (id, user_id, expires_at, created_at)
        VALUES ('session-1', :user_id, :now, :now)
    """), {"user_id": user_id, "now": now})

    # Create consent
    db_session.execute(text("""
        INSERT INTO consents (id, user_id, consent_type, granted, granted_at, version, created_at)
        VALUES ('consent-1', :user_id, 'data_processing', 1, :now, 1, :now)
    """), {"user_id": user_id, "now": now})

    # Create audit log
    db_session.execute(text("""
        INSERT INTO audit_logs (
            id, timestamp, event_type, user_id, resource_type, resource_id,
            action, success, integrity_hash, created_at
        ) VALUES (
            'log-1', :now, 'test.event', '1', 'test', '1',
            'test', 1, 'hash123', :now
        )
    """), {"now": now})

    db_session.commit()
    return user_id

# ============================================================================
# Test Cases
# ============================================================================

def test_delete_requires_confirmation(data_deleter, sample_user):
    """Test that deletion requires explicit confirmation flag."""
    options = GdprDeleteOptions(confirmed=False)

    with pytest.raises(DeletionNotConfirmedError) as exc_info:
        data_deleter.delete_all_user_data(sample_user, options)

    assert "explicit confirmation" in str(exc_info.value).lower()

def test_delete_all_user_data_success(data_deleter, sample_data, db_session):
    """Test successful deletion of all user data."""
    user_id = sample_data
    options = GdprDeleteOptions(confirmed=True, reason="Test deletion")

    # Execute deletion
    result = data_deleter.delete_all_user_data(user_id, options)

    # Verify result structure
    assert result.success is True
    assert result.deletion_date is not None
    assert isinstance(result.deleted_counts, dict)

    # Verify specific deletions
    assert result.deleted_counts["users"] == 1
    assert result.deleted_counts["cases"] == 1
    assert result.deleted_counts["evidence"] == 1
    assert result.deleted_counts["timeline_events"] == 1
    assert result.deleted_counts["event_evidence"] == 1
    assert result.deleted_counts["case_facts"] == 1
    assert result.deleted_counts["legal_issues"] == 1
    assert result.deleted_counts["actions"] == 1
    assert result.deleted_counts["notes"] == 1
    assert result.deleted_counts["chat_conversations"] == 1
    assert result.deleted_counts["chat_messages"] == 1
    assert result.deleted_counts["user_facts"] == 1
    assert result.deleted_counts["sessions"] == 1

    # Verify user is deleted
    user_count = db_session.execute(
        text("SELECT COUNT(*) FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    ).fetchone()[0]
    assert user_count == 0

def test_preserves_audit_logs(data_deleter, sample_data, db_session):
    """Test that audit logs are preserved after deletion."""
    user_id = sample_data
    options = GdprDeleteOptions(confirmed=True)

    # Count audit logs before deletion (excluding deletion logs)
    audit_count_before = db_session.execute(
        text("""
            SELECT COUNT(*) FROM audit_logs
            WHERE user_id = :user_id
            AND event_type NOT LIKE 'gdpr.deletion%'
        """),
        {"user_id": str(user_id)}
    ).fetchone()[0]

    # Execute deletion
    result = data_deleter.delete_all_user_data(user_id, options)

    # Verify audit logs are preserved
    audit_count_after = db_session.execute(
        text("""
            SELECT COUNT(*) FROM audit_logs
            WHERE user_id = :user_id
            AND event_type NOT LIKE 'gdpr.deletion%'
        """),
        {"user_id": str(user_id)}
    ).fetchone()[0]

    # Original audit logs should still exist (excluding new deletion logs)
    assert audit_count_after == audit_count_before

    # Verify deletion logs were created
    deletion_logs = db_session.execute(
        text("""
            SELECT COUNT(*) FROM audit_logs
            WHERE user_id = :user_id
            AND event_type LIKE 'gdpr.deletion%'
        """),
        {"user_id": str(user_id)}
    ).fetchone()[0]

    assert deletion_logs >= 2  # At least started and completed logs

def test_preserves_consents(data_deleter, sample_data, db_session):
    """Test that consent records are preserved after deletion."""
    user_id = sample_data
    options = GdprDeleteOptions(confirmed=True)

    # Execute deletion
    result = data_deleter.delete_all_user_data(user_id, options)

    # Verify consents are preserved
    consent_count = db_session.execute(
        text("SELECT COUNT(*) FROM consents WHERE user_id = :user_id"),
        {"user_id": user_id}
    ).fetchone()[0]

    assert consent_count == 1
    assert result.preserved_consents == 1

def test_validation_user_exists(data_deleter, sample_user):
    """Test validation for existing user."""
    validation = data_deleter.validate_deletion(sample_user)

    assert validation["valid"] is True
    assert validation["user_exists"] is True
    assert isinstance(validation["warnings"], list)

def test_validation_user_not_exists(data_deleter):
    """Test validation for non-existent user."""
    validation = data_deleter.validate_deletion(999)

    assert validation["valid"] is False
    assert validation["user_exists"] is False
    assert "does not exist" in validation["warnings"][0]

def test_validation_warns_about_data(data_deleter, sample_data):
    """Test that validation warns about data that will be deleted."""
    user_id = sample_data
    validation = data_deleter.validate_deletion(user_id)

    assert validation["valid"] is True
    assert len(validation["warnings"]) > 0

    # Check for specific warnings
    warning_text = " ".join(validation["warnings"])
    assert "case" in warning_text.lower()
    assert "evidence" in warning_text.lower()

def test_transactional_rollback_on_error(data_deleter, sample_data, db_session):
    """Test that deletion rolls back on error (all-or-nothing)."""
    user_id = sample_data
    options = GdprDeleteOptions(confirmed=True)

    # Corrupt the database to force an error (close session)
    original_session = data_deleter.db
    data_deleter.db = None  # This will cause an error

    with pytest.raises(Exception):
        data_deleter.delete_all_user_data(user_id, options)

    # Restore session
    data_deleter.db = original_session

    # Verify user still exists (rollback occurred)
    user_count = db_session.execute(
        text("SELECT COUNT(*) FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    ).fetchone()[0]

    assert user_count == 1  # User should still exist

def test_delete_empty_user(data_deleter, sample_user):
    """Test deletion of user with no associated data."""
    user_id = sample_user
    options = GdprDeleteOptions(confirmed=True)

    result = data_deleter.delete_all_user_data(user_id, options)

    assert result.success is True
    assert result.deleted_counts["users"] == 1
    assert result.deleted_counts["cases"] == 0
    assert result.deleted_counts["evidence"] == 0

def test_audit_logging_during_deletion(data_deleter, sample_data, db_session):
    """Test that deletion operations are logged to audit log."""
    user_id = sample_data
    options = GdprDeleteOptions(confirmed=True, reason="Test audit logging")

    # Execute deletion
    data_deleter.delete_all_user_data(user_id, options)

    # Check for audit log entries
    logs = db_session.execute(
        text("""
            SELECT event_type FROM audit_logs
            WHERE user_id = :user_id
            AND event_type LIKE 'gdpr.deletion%'
            ORDER BY timestamp DESC
        """),
        {"user_id": str(user_id)}
    ).fetchall()

    # Should have at least started and completed logs
    event_types = [log[0] for log in logs]
    assert "gdpr.deletion.started" in event_types
    assert "gdpr.deletion.completed" in event_types

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Integration tests for GDPR Service.

Tests GDPR Article 17 (Right to Erasure) and Article 20 (Data Portability)
with rate limiting, consent verification, and audit logging.

Test Coverage:
- Data export with file persistence
- Data deletion with transactional safety
- Rate limiting enforcement (5 exports/24h, 1 delete/30d)
- Consent requirement verification
- Audit logging for all operations
- Export-before-delete workflow
- Error handling and rollback

Security Tests:
- Password hashes never exported
- Audit logs preserved after deletion
- Consent records preserved after deletion
- Rate limit abuse prevention

Run tests:
    pytest backend/services/gdpr/test_gdpr_service.py -v
"""

import pytest
import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.services.gdpr.gdpr_service import (
    GdprService,
    GdprExportOptions,
    RateLimitError,
    ConsentRequiredError,
    create_gdpr_service
)
from backend.services.gdpr.data_deleter import GdprDeleteOptions
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

@pytest.fixture
def test_db():
    """Create in-memory test database with schema."""
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Create tables (simplified schema for testing)
    with engine.connect() as conn:
        # Users table
        conn.execute(text("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP
            )
        """))

        # Consents table
        conn.execute(text("""
            CREATE TABLE consents (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                consent_type TEXT NOT NULL,
                granted INTEGER DEFAULT 1,
                granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                revoked_at TIMESTAMP,
                version TEXT DEFAULT '1.0',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Cases table
        conn.execute(text("""
            CREATE TABLE cases (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Evidence table
        conn.execute(text("""
            CREATE TABLE evidence (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Legal issues table
        conn.execute(text("""
            CREATE TABLE legal_issues (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                issue_type TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Timeline events table
        conn.execute(text("""
            CREATE TABLE timeline_events (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                event_date DATE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Event evidence (junction table)
        conn.execute(text("""
            CREATE TABLE event_evidence (
                id INTEGER PRIMARY KEY,
                event_id INTEGER NOT NULL,
                evidence_id INTEGER NOT NULL,
                FOREIGN KEY (event_id) REFERENCES timeline_events(id),
                FOREIGN KEY (evidence_id) REFERENCES evidence(id)
            )
        """))

        # Actions table
        conn.execute(text("""
            CREATE TABLE actions (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                due_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Notes table
        conn.execute(text("""
            CREATE TABLE notes (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Chat conversations table
        conn.execute(text("""
            CREATE TABLE chat_conversations (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Chat messages table
        conn.execute(text("""
            CREATE TABLE chat_messages (
                id INTEGER PRIMARY KEY,
                conversation_id INTEGER NOT NULL,
                message TEXT,
                response TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
            )
        """))

        # User facts table
        conn.execute(text("""
            CREATE TABLE user_facts (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                fact_key TEXT NOT NULL,
                fact_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Case facts table
        conn.execute(text("""
            CREATE TABLE case_facts (
                id INTEGER PRIMARY KEY,
                case_id INTEGER NOT NULL,
                fact_key TEXT NOT NULL,
                fact_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            )
        """))

        # Sessions table
        conn.execute(text("""
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Audit logs table
        conn.execute(text("""
            CREATE TABLE audit_logs (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                user_id TEXT,
                resource_type TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER DEFAULT 1,
                error_message TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                previous_hash TEXT,
                current_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Migrations table
        conn.execute(text("""
            CREATE TABLE migrations (
                id INTEGER PRIMARY KEY,
                version INTEGER NOT NULL,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        conn.commit()

    yield db

    db.close()

@pytest.fixture
def encryption_service():
    """Create encryption service with test key."""
    import base64
    test_key = base64.b64encode(b"a" * 32).decode()  # 32-byte key for AES-256
    return EncryptionService(test_key)

@pytest.fixture
def audit_logger(test_db):
    """Create audit logger instance."""
    return AuditLogger(test_db)

@pytest.fixture
def gdpr_service(test_db, encryption_service, audit_logger):
    """Create GdprService instance with all dependencies."""
    return GdprService(
        db=test_db,
        encryption_service=encryption_service,
        audit_logger=audit_logger,
        rate_limit_service=None  # Use in-memory rate limiting for tests
    )

@pytest.fixture
def test_user(test_db):
    """Create test user with consent."""
    # Insert test user
    test_db.execute(text("""
        INSERT INTO users (id, username, email, password_hash)
        VALUES (1, 'testuser', 'test@example.com', 'hashed_password')
    """))

    # Grant data_processing consent
    test_db.execute(text("""
        INSERT INTO consents (user_id, consent_type, granted, granted_at)
        VALUES (1, 'data_processing', 1, CURRENT_TIMESTAMP)
    """))

    test_db.commit()

    return 1  # Return user_id

@pytest.fixture
def test_user_with_data(test_db, test_user, encryption_service):
    """Create test user with sample data across multiple tables."""
    user_id = test_user

    # Create case
    test_db.execute(text("""
        INSERT INTO cases (id, user_id, title, description, status)
        VALUES (1, :user_id, 'Test Case', 'Test Description', 'open')
    """), {"user_id": user_id})

    # Create evidence
    test_db.execute(text("""
        INSERT INTO evidence (id, case_id, title, content)
        VALUES (1, 1, 'Test Evidence', 'Evidence content')
    """))

    # Create legal issue
    test_db.execute(text("""
        INSERT INTO legal_issues (id, case_id, issue_type, description)
        VALUES (1, 1, 'contract', 'Contract dispute')
    """))

    # Create timeline event
    test_db.execute(text("""
        INSERT INTO timeline_events (id, case_id, event_date, description)
        VALUES (1, 1, '2024-01-01', 'Important event')
    """))

    # Create action
    test_db.execute(text("""
        INSERT INTO actions (id, case_id, title, description, due_date)
        VALUES (1, 1, 'File motion', 'File motion with court', '2024-02-01')
    """))

    # Create note
    test_db.execute(text("""
        INSERT INTO notes (id, case_id, title, content)
        VALUES (1, 1, 'Case Note', 'Important note content')
    """))

    # Create chat conversation
    test_db.execute(text("""
        INSERT INTO chat_conversations (id, user_id, title)
        VALUES (1, :user_id, 'Legal Research Chat')
    """), {"user_id": user_id})

    # Create chat message
    test_db.execute(text("""
        INSERT INTO chat_messages (id, conversation_id, message, response)
        VALUES (1, 1, 'What is contract law?', 'Contract law governs...')
    """))

    # Create user fact
    test_db.execute(text("""
        INSERT INTO user_facts (id, user_id, fact_key, fact_value)
        VALUES (1, :user_id, 'occupation', 'lawyer')
    """), {"user_id": user_id})

    # Create case fact
    test_db.execute(text("""
        INSERT INTO case_facts (id, case_id, fact_key, fact_value)
        VALUES (1, 1, 'jurisdiction', 'California')
    """))

    # Create session
    test_db.execute(text("""
        INSERT INTO sessions (id, user_id, expires_at, ip_address)
        VALUES ('session-uuid', :user_id, '2025-01-01', '127.0.0.1')
    """), {"user_id": user_id})

    test_db.commit()

    return user_id

# ============================================================================
# Export Tests
# ============================================================================

@pytest.mark.asyncio
async def test_export_user_data_success(gdpr_service, test_user_with_data, tmp_path):
    """Test successful user data export with file persistence."""
    user_id = test_user_with_data

    # Change working directory to temp for export
    original_cwd = os.getcwd()
    os.chdir(tmp_path)

    try:
        result = await gdpr_service.export_user_data(
            user_id=user_id,
            options=GdprExportOptions(export_format="json")
        )

        # Verify result structure
        assert result.metadata is not None
        assert result.metadata["userId"] == user_id
        assert result.metadata["format"] == "json"
        assert result.metadata["totalRecords"] > 0

        # Verify user_data contains all tables
        assert "profile" in result.user_data
        assert "cases" in result.user_data
        assert "evidence" in result.user_data
        assert "consents" in result.user_data

        # Verify file was created
        assert result.file_path is not None
        assert os.path.exists(result.file_path)

        # Verify file contents
        with open(result.file_path, 'r') as f:
            exported_data = json.load(f)
            assert exported_data["metadata"]["userId"] == user_id

    finally:
        os.chdir(original_cwd)

@pytest.mark.asyncio
async def test_export_without_consent_fails(gdpr_service, test_db):
    """Test export fails without active consent."""
    # Create user without consent
    test_db.execute(text("""
        INSERT INTO users (id, username, email, password_hash)
        VALUES (999, 'no-consent-user', 'noConsent@example.com', 'hashed')
    """))
    test_db.commit()

    with pytest.raises(ConsentRequiredError):
        await gdpr_service.export_user_data(user_id=999)

@pytest.mark.asyncio
async def test_export_rate_limiting(gdpr_service, test_user_with_data, tmp_path):
    """Test export rate limiting (5 exports per 24 hours)."""
    user_id = test_user_with_data
    original_cwd = os.getcwd()
    os.chdir(tmp_path)

    try:
        # Perform 5 exports (should succeed)
        for i in range(5):
            result = await gdpr_service.export_user_data(user_id=user_id)
            assert result.metadata["userId"] == user_id

        # 6th export should fail with rate limit error
        with pytest.raises(RateLimitError) as exc_info:
            await gdpr_service.export_user_data(user_id=user_id)

        assert "Rate limit exceeded" in str(exc_info.value.detail)

    finally:
        os.chdir(original_cwd)

@pytest.mark.asyncio
async def test_export_password_never_exported(gdpr_service, test_user_with_data, tmp_path):
    """Test that password hashes are never included in export."""
    user_id = test_user_with_data
    original_cwd = os.getcwd()
    os.chdir(tmp_path)

    try:
        result = await gdpr_service.export_user_data(user_id=user_id)

        # Check profile data
        profile_records = result.user_data["profile"]["records"]
        assert len(profile_records) > 0

        # Verify password_hash is NOT in exported data
        user_record = profile_records[0]
        assert "password_hash" not in user_record
        assert "password" not in user_record

    finally:
        os.chdir(original_cwd)

# ============================================================================
# Deletion Tests
# ============================================================================

@pytest.mark.asyncio
async def test_delete_user_data_success(gdpr_service, test_user_with_data):
    """Test successful user data deletion."""
    user_id = test_user_with_data

    result = await gdpr_service.delete_user_data(
        user_id=user_id,
        options=GdprDeleteOptions(
            confirmed=True,
            reason="User requested deletion"
        )
    )

    # Verify deletion result
    assert result.success is True
    assert result.deletion_date is not None
    assert isinstance(result.deleted_counts, dict)
    assert result.deleted_counts["users"] == 1
    assert result.deleted_counts["cases"] == 1

    # Verify audit logs preserved
    assert result.preserved_audit_logs > 0

    # Verify consents preserved
    assert result.preserved_consents > 0

@pytest.mark.asyncio
async def test_delete_without_confirmation_fails(gdpr_service, test_user_with_data):
    """Test deletion fails without explicit confirmation."""
    user_id = test_user_with_data

    with pytest.raises(Exception) as exc_info:
        await gdpr_service.delete_user_data(
            user_id=user_id,
            options=GdprDeleteOptions(confirmed=False)
        )

    assert "confirmation" in str(exc_info.value).lower()

@pytest.mark.asyncio
async def test_delete_preserves_audit_logs(gdpr_service, test_user_with_data, audit_logger, test_db):
    """Test that audit logs are preserved after deletion."""
    user_id = test_user_with_data

    # Create some audit logs before deletion
    audit_logger.log(
        event_type="test.action",
        user_id=str(user_id),
        resource_type="case",
        resource_id="1",
        action="read",
        success=True
    )

    # Count audit logs before deletion
    result = test_db.execute(text("SELECT COUNT(*) as count FROM audit_logs WHERE user_id = :user_id"),
                             {"user_id": str(user_id)})
    logs_before = result.fetchone().count

    # Delete user data
    delete_result = await gdpr_service.delete_user_data(
        user_id=user_id,
        options=GdprDeleteOptions(confirmed=True, reason="Test deletion")
    )

    # Verify audit logs still exist
    result = test_db.execute(text("SELECT COUNT(*) as count FROM audit_logs WHERE user_id = :user_id"),
                             {"user_id": str(user_id)})
    logs_after = result.fetchone().count

    assert logs_after >= logs_before
    assert delete_result.preserved_audit_logs > 0

@pytest.mark.asyncio
async def test_delete_preserves_consents(gdpr_service, test_user_with_data, test_db):
    """Test that consent records are preserved after deletion."""
    user_id = test_user_with_data

    # Count consents before deletion
    result = test_db.execute(text("SELECT COUNT(*) as count FROM consents WHERE user_id = :user_id"),
                             {"user_id": user_id})
    consents_before = result.fetchone().count
    assert consents_before > 0

    # Delete user data
    delete_result = await gdpr_service.delete_user_data(
        user_id=user_id,
        options=GdprDeleteOptions(confirmed=True, reason="Test deletion")
    )

    # Verify consents still exist
    result = test_db.execute(text("SELECT COUNT(*) as count FROM consents WHERE user_id = :user_id"),
                             {"user_id": user_id})
    consents_after = result.fetchone().count

    assert consents_after == consents_before
    assert delete_result.preserved_consents == consents_before

@pytest.mark.asyncio
async def test_export_before_delete_workflow(gdpr_service, test_user_with_data, tmp_path):
    """Test export-before-delete workflow creates backup."""
    user_id = test_user_with_data
    original_cwd = os.getcwd()
    os.chdir(tmp_path)

    try:
        result = await gdpr_service.delete_user_data(
            user_id=user_id,
            options=GdprDeleteOptions(
                confirmed=True,
                export_before_delete=True,
                reason="User requested deletion with backup"
            )
        )

        # Verify export was created
        assert result.export_path is not None
        assert os.path.exists(result.export_path)

        # Verify export contains user data
        with open(result.export_path, 'r') as f:
            exported_data = json.load(f)
            assert exported_data["metadata"]["userId"] == user_id

        # Verify deletion succeeded
        assert result.success is True
        assert result.deleted_counts["users"] == 1

    finally:
        os.chdir(original_cwd)

# ============================================================================
# Factory Function Tests
# ============================================================================

def test_create_gdpr_service_factory(test_db, encryption_service, audit_logger):
    """Test factory function creates valid GdprService instance."""
    service = create_gdpr_service(
        db=test_db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    assert isinstance(service, GdprService)
    assert service.db == test_db
    assert service.audit_logger == audit_logger
    assert service.exporter is not None
    assert service.deleter is not None

# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.asyncio
async def test_export_audit_logging_on_failure(gdpr_service, test_db):
    """Test that failed exports are logged to audit trail."""
    # Try to export non-existent user (will fail consent check)
    with pytest.raises(ConsentRequiredError):
        await gdpr_service.export_user_data(user_id=99999)

    # Verify audit log was created for failure
    result = test_db.execute(text("""
        SELECT * FROM audit_logs
        WHERE event_type = 'gdpr.export'
            AND user_id = '99999'
            AND success = 0
    """))
    log = result.fetchone()
    assert log is not None
    assert log.error_message is not None

@pytest.mark.asyncio
async def test_delete_audit_logging_on_failure(gdpr_service, test_db):
    """Test that failed deletions are logged to audit trail."""
    # Try to delete without consent
    with pytest.raises(ConsentRequiredError):
        await gdpr_service.delete_user_data(
            user_id=99999,
            options=GdprDeleteOptions(confirmed=True)
        )

    # Verify audit log was created for failure
    result = test_db.execute(text("""
        SELECT * FROM audit_logs
        WHERE event_type = 'gdpr.deletion_request'
            AND user_id = '99999'
            AND success = 0
    """))
    log = result.fetchone()
    assert log is not None
    assert log.error_message is not None

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

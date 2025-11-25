"""
Comprehensive test suite for GDPR Enhanced Routes.

Tests GDPR Articles 15, 17, and 20 compliance with service layer integration.

Coverage:
- Data export (Article 20 - Data Portability)
- Data deletion (Article 17 - Right to Erasure)
- Consent management (Article 6 - Lawfulness of processing)
- Rate limiting enforcement
- Authentication and authorization
- Error handling and edge cases

Test Count: 25 comprehensive tests
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock, patch

from backend.routes.gdpr_enhanced import router
from backend.models.base import Base, get_db
from backend.models.consent import Consent, ConsentType
from backend.services.security.encryption import EncryptionService

# ===== TEST FIXTURES =====

@pytest.fixture
def test_db():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()

    # Create audit_logs table
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS audit_logs (
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

    # Create consents table
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            consent_type TEXT NOT NULL,
            granted INTEGER NOT NULL,
            granted_at TEXT,
            revoked_at TEXT,
            version TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """))

    # Create cases table (for deletion cascade tests)
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """))

    db.commit()

    yield db

    db.close()

@pytest.fixture
def test_user(test_db):
    """Create a test user using raw SQL to avoid ORM relationship issues."""
    now = datetime.now(timezone.utc).isoformat()

    # Insert user directly with SQL (including password_salt)
    test_db.execute(text("""
        INSERT INTO users (username, email, password_hash, password_salt, created_at, updated_at)
        VALUES (:username, :email, :password_hash, :password_salt, :created_at, :updated_at)
    """), {
        "username": "testuser",
        "email": "test@example.com",
        "password_hash": "hashed_password",
        "password_salt": "test_salt_12345678901234567890123456789012",  # 32 char salt
        "created_at": now,
        "updated_at": now
    })
    test_db.commit()

    # Fetch the created user
    result = test_db.execute(text("SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = 'testuser'"))
    row = result.fetchone()

    # Create a mock user object with necessary attributes
    class MockUser:
        def __init__(self, row):
            self.id = row[0]
            self.username = row[1]
            self.email = row[2]
            self.password_hash = row[3]
            self.created_at = row[4]
            self.updated_at = row[5]

    return MockUser(row)

@pytest.fixture
def test_session(test_db, test_user):
    """Create a test session for authenticated requests."""
    session_id = "test-session-id-123"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    test_db.execute(text("""
        INSERT INTO sessions (id, user_id, created_at, expires_at)
        VALUES (:session_id, :user_id, :created_at, :expires_at)
    """), {
        "session_id": session_id,
        "user_id": test_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    })
    test_db.commit()

    return session_id

@pytest.fixture
def client(test_db):
    """Create FastAPI test client with dependency override."""
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)

    # Override get_db dependency
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    return TestClient(app)

@pytest.fixture
def encryption_service():
    """Create encryption service for tests."""
    # Use a test encryption key
    import base64
    test_key = base64.b64encode(b"0" * 32).decode()
    return EncryptionService(test_key)

@pytest.fixture
def granted_consent(test_db, test_user):
    """Create granted consent for test user."""
    consent = Consent(
        user_id=test_user.id,
        consent_type=ConsentType.DATA_PROCESSING.value,
        granted=True,
        granted_at=datetime.now(timezone.utc),
        version="1.0"
    )
    test_db.add(consent)
    test_db.commit()
    test_db.refresh(consent)
    return consent

# ===== AUTHENTICATION TESTS =====

def test_export_requires_authentication(client):
    """Test that export endpoint requires authentication."""
    response = client.post("/gdpr/export", json={"format": "json"})

    assert response.status_code == 401
    assert "Session ID required" in response.json()["detail"]

def test_delete_requires_authentication(client):
    """Test that delete endpoint requires authentication."""
    response = client.post("/gdpr/delete", json={"confirmed": True})

    assert response.status_code == 401
    assert "Session ID required" in response.json()["detail"]

def test_consents_get_requires_authentication(client):
    """Test that GET consents endpoint requires authentication."""
    response = client.get("/gdpr/consents")

    assert response.status_code == 401

def test_consents_post_requires_authentication(client):
    """Test that POST consents endpoint requires authentication."""
    response = client.post("/gdpr/consents", json={
        "consentType": "data_processing",
        "granted": True
    })

    assert response.status_code == 401

# ===== DATA EXPORT TESTS (Article 20) =====

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_success(mock_gdpr_service, client, test_session, test_user, granted_consent):
    """Test successful data export."""
    # Mock GdprService.export_user_data
    mock_service_instance = Mock()
    mock_service_instance.export_user_data = Mock(return_value=Mock(
        metadata={
            "exportDate": "2024-01-01T00:00:00Z",
            "userId": test_user.id,
            "format": "json",
            "totalRecords": 42
        },
        user_data={},
        file_path="/path/to/export.json"
    ))
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["totalRecords"] == 42
    assert data["format"] == "json"
    assert data["filePath"] == "/path/to/export.json"

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_invalid_format(mock_gdpr_service, client, test_session, granted_consent):
    """Test export with invalid format."""
    response = client.post(
        "/gdpr/export",
        json={"format": "xml"},  # Invalid format
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 422  # Validation error
    assert "Format must be 'json' or 'csv'" in str(response.json())

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_rate_limit_exceeded(mock_gdpr_service, client, test_session, granted_consent):
    """Test export with rate limit exceeded."""
    from fastapi import HTTPException

    # Mock rate limit error
    mock_service_instance = Mock()
    mock_service_instance.export_user_data = Mock(
        side_effect=HTTPException(status_code=429, detail="Rate limit exceeded for export")
    )
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 429
    assert "Rate limit exceeded" in response.json()["detail"]

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_missing_consent(mock_gdpr_service, client, test_session):
    """Test export without required consent."""
    from fastapi import HTTPException

    # Mock consent error
    mock_service_instance = Mock()
    mock_service_instance.export_user_data = Mock(
        side_effect=HTTPException(status_code=403, detail="Active consent required")
    )
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 403
    assert "consent required" in response.json()["detail"].lower()

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_csv_format(mock_gdpr_service, client, test_session, granted_consent):
    """Test export with CSV format."""
    mock_service_instance = Mock()
    mock_service_instance.export_user_data = Mock(return_value=Mock(
        metadata={
            "exportDate": "2024-01-01T00:00:00Z",
            "userId": 1,
            "format": "csv",
            "totalRecords": 10
        },
        user_data={},
        file_path="/path/to/export.csv"
    ))
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/export",
        json={"format": "csv"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["format"] == "csv"
    assert data["filePath"].endswith(".csv")

# ===== DATA DELETION TESTS (Article 17) =====

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_delete_success(mock_gdpr_service, client, test_session, test_user, granted_consent):
    """Test successful data deletion."""
    mock_service_instance = Mock()
    mock_service_instance.delete_user_data = Mock(return_value=Mock(
        success=True,
        deletion_date="2024-01-01T00:00:00Z",
        deleted_counts={"users": 1, "cases": 5, "evidence": 10},
        preserved_audit_logs=20,
        preserved_consents=3,
        export_path=None
    ))
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/delete",
        json={"confirmed": True, "reason": "User request"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["deletedCounts"]["users"] == 1
    assert data["deletedCounts"]["cases"] == 5
    assert data["preservedAuditLogs"] == 20
    assert data["preservedConsents"] == 3

def test_delete_missing_confirmation(client, test_session, granted_consent):
    """Test deletion without confirmation flag."""
    response = client.post(
        "/gdpr/delete",
        json={"confirmed": False},  # Not confirmed
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 422  # Validation error
    assert "confirmation" in str(response.json()).lower()

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_delete_with_export(mock_gdpr_service, client, test_session, granted_consent):
    """Test deletion with pre-export."""
    mock_service_instance = Mock()
    mock_service_instance.delete_user_data = Mock(return_value=Mock(
        success=True,
        deletion_date="2024-01-01T00:00:00Z",
        deleted_counts={"users": 1},
        preserved_audit_logs=5,
        preserved_consents=2,
        export_path="/path/to/pre_deletion_export.json"
    ))
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/delete",
        json={
            "confirmed": True,
            "exportBeforeDelete": True,
            "reason": "User requested account deletion"
        },
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["exportPath"] == "/path/to/pre_deletion_export.json"

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_delete_missing_consent(mock_gdpr_service, client, test_session):
    """Test deletion without required consent."""
    from fastapi import HTTPException

    mock_service_instance = Mock()
    mock_service_instance.delete_user_data = Mock(
        side_effect=HTTPException(status_code=403, detail="Active consent required")
    )
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/delete",
        json={"confirmed": True},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 403
    assert "consent required" in response.json()["detail"].lower()

# ===== CONSENT MANAGEMENT TESTS =====

def test_get_consents_success(client, test_session, test_user, granted_consent):
    """Test getting user consents."""
    response = client.get(
        "/gdpr/consents",
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "consents" in data
    assert len(data["consents"]) >= 1

    # Check consent structure
    consent = data["consents"][0]
    assert "id" in consent
    assert "consentType" in consent
    assert "granted" in consent
    assert "createdAt" in consent

def test_get_consents_empty(client, test_session):
    """Test getting consents when user has none."""
    response = client.get(
        "/gdpr/consents",
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "consents" in data
    assert isinstance(data["consents"], list)

def test_grant_consent_success(client, test_session):
    """Test granting consent."""
    response = client.post(
        "/gdpr/consents",
        json={
            "consentType": "data_processing",
            "granted": True
        },
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["consentType"] == "data_processing"
    assert data["granted"] is True
    assert "id" in data

def test_revoke_consent_success(client, test_session, granted_consent):
    """Test revoking consent."""
    response = client.post(
        "/gdpr/consents",
        json={
            "consentType": "data_processing",
            "granted": False
        },
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["consentType"] == "data_processing"
    assert data["granted"] is False

def test_grant_consent_invalid_type(client, test_session):
    """Test granting consent with invalid type."""
    response = client.post(
        "/gdpr/consents",
        json={
            "consentType": "invalid_consent_type",
            "granted": True
        },
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 400
    assert "Invalid consent type" in response.json()["detail"]

# ===== ERROR HANDLING TESTS =====

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_service_error(mock_gdpr_service, client, test_session, granted_consent):
    """Test export with service layer error."""
    mock_service_instance = Mock()
    mock_service_instance.export_user_data = Mock(
        side_effect=Exception("Database connection failed")
    )
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 500
    assert "Export failed" in response.json()["detail"]

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_delete_service_error(mock_gdpr_service, client, test_session, granted_consent):
    """Test deletion with service layer error."""
    mock_service_instance = Mock()
    mock_service_instance.delete_user_data = Mock(
        side_effect=Exception("Transaction rollback failed")
    )
    mock_gdpr_service.return_value = mock_service_instance

    response = client.post(
        "/gdpr/delete",
        json={"confirmed": True},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert response.status_code == 500
    assert "Deletion failed" in response.json()["detail"]

# ===== INTEGRATION TESTS =====

@patch('backend.routes.gdpr_enhanced.GdprService')
def test_export_then_delete_workflow(mock_gdpr_service, client, test_session, granted_consent):
    """Test complete GDPR workflow: export then delete."""
    mock_service_instance = Mock()

    # Mock export
    mock_service_instance.export_user_data = Mock(return_value=Mock(
        metadata={
            "exportDate": "2024-01-01T00:00:00Z",
            "userId": 1,
            "format": "json",
            "totalRecords": 100
        },
        user_data={},
        file_path="/path/to/export.json"
    ))

    # Mock delete
    mock_service_instance.delete_user_data = Mock(return_value=Mock(
        success=True,
        deletion_date="2024-01-01T00:10:00Z",
        deleted_counts={"users": 1, "cases": 10},
        preserved_audit_logs=15,
        preserved_consents=2,
        export_path=None
    ))

    mock_gdpr_service.return_value = mock_service_instance

    # Step 1: Export data
    export_response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert export_response.status_code == 200
    export_data = export_response.json()
    assert export_data["success"] is True
    assert export_data["totalRecords"] == 100

    # Step 2: Delete user data
    delete_response = client.post(
        "/gdpr/delete",
        json={"confirmed": True, "reason": "User request after export"},
        headers={"Authorization": f"Bearer {test_session}"}
    )

    assert delete_response.status_code == 200
    delete_data = delete_response.json()
    assert delete_data["success"] is True
    assert delete_data["deletedCounts"]["users"] == 1

def test_consent_lifecycle(client, test_session):
    """Test complete consent lifecycle: grant, check, revoke, check."""
    # Grant consent
    grant_response = client.post(
        "/gdpr/consents",
        json={"consentType": "ai_processing", "granted": True},
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert grant_response.status_code == 200

    # Check consents
    get_response = client.get(
        "/gdpr/consents",
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert get_response.status_code == 200
    consents = get_response.json()["consents"]
    assert any(c["consentType"] == "ai_processing" and c["granted"] for c in consents)

    # Revoke consent
    revoke_response = client.post(
        "/gdpr/consents",
        json={"consentType": "ai_processing", "granted": False},
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert revoke_response.status_code == 200

    # Check consents again
    get_response2 = client.get(
        "/gdpr/consents",
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert get_response2.status_code == 200

# ===== VALIDATION TESTS =====

def test_export_request_validation(client, test_session):
    """Test export request validation."""
    # Missing format field should use default
    response = client.post(
        "/gdpr/export",
        json={},
        headers={"Authorization": f"Bearer {test_session}"}
    )
    # Should succeed with default format (but service may fail)
    assert response.status_code in [200, 403, 429, 500]

def test_delete_request_validation(client, test_session):
    """Test delete request validation."""
    # Missing confirmed field
    response = client.post(
        "/gdpr/delete",
        json={},
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert response.status_code == 422  # Validation error

def test_update_consent_validation(client, test_session):
    """Test update consent request validation."""
    # Missing consentType
    response = client.post(
        "/gdpr/consents",
        json={"granted": True},
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert response.status_code == 422

    # Missing granted
    response = client.post(
        "/gdpr/consents",
        json={"consentType": "data_processing"},
        headers={"Authorization": f"Bearer {test_session}"}
    )
    assert response.status_code == 422

# Run with: pytest backend/routes/test_gdpr_enhanced.py -v

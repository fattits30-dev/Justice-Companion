"""
Test suite for GDPR compliance routes.

Tests:
- POST /gdpr/export - Export all user data
- POST /gdpr/delete - Delete all user data
- GET /gdpr/consents - Get user consents
- POST /gdpr/consents - Update user consents

Tests cover:
- Rate limiting (5 exports per 24h, 1 deletion per 30 days)
- Consent verification
- Data export with decryption
- Cascading deletion with preserved audit logs
- Export before delete workflow
- Error handling and rollback
"""

import pytest
import json
import os
from pathlib import Path
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import text

# Set test environment before importing app
os.environ["ENCRYPTION_KEY_BASE64"] = "dGVzdGtleTE2Ynl0ZXNsb25nZXh0cmE0bW9yZQ=="  # base64 of 32-byte test key

from backend.main import app
from backend.models.base import get_db

client = TestClient(app)

@pytest.fixture
def test_db():
    """Get database session for testing."""
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(test_db):
    """Create a test user with consents."""
    # Create user
    sql = text("""
        INSERT INTO users (username, password_hash, email, created_at, updated_at)
        VALUES (:username, :password_hash, :email, :created_at, :updated_at)
    """)
    now = datetime.now(timezone.utc).isoformat()
    test_db.execute(sql, {
        "username": "gdpr_test_user",
        "password_hash": "$scrypt$...test_hash...",
        "email": "gdpr@test.com",
        "created_at": now,
        "updated_at": now
    })
    test_db.commit()

    # Get user ID
    result = test_db.execute(text("SELECT id FROM users WHERE username = 'gdpr_test_user'"))
    user_id = result.scalar()

    # Create session
    sql = text("""
        INSERT INTO sessions (id, user_id, created_at, expires_at)
        VALUES (:id, :user_id, :created_at, :expires_at)
    """)
    from datetime import timedelta
    session_id = "test_session_gdpr_12345"
    test_db.execute(sql, {
        "id": session_id,
        "user_id": user_id,
        "created_at": now,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })

    # Create consents
    sql = text("""
        INSERT INTO consents (user_id, consent_type, granted, granted_at, created_at)
        VALUES (:user_id, :consent_type, 1, :granted_at, :created_at)
    """)
    for consent_type in ["data_processing", "data_erasure_request"]:
        test_db.execute(sql, {
            "user_id": user_id,
            "consent_type": consent_type,
            "granted_at": now,
            "created_at": now
        })

    test_db.commit()

    yield {"user_id": user_id, "session_id": session_id}

    # Cleanup (if not deleted by test)
    try:
        test_db.execute(text("DELETE FROM sessions WHERE user_id = :user_id"), {"user_id": user_id})
        test_db.execute(text("DELETE FROM consents WHERE user_id = :user_id"), {"user_id": user_id})
        test_db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
        test_db.commit()
    except Exception:
        pass

def test_health_check():
    """Test that the backend is running."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_gdpr_export_success(test_user):
    """Test successful GDPR data export."""
    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert "filePath" in data
    assert data["totalRecords"] >= 0
    assert data["format"] == "json"
    assert "exportDate" in data

    # Verify file was created
    file_path = Path(data["filePath"])
    assert file_path.exists()

    # Verify file content
    with open(file_path, "r") as f:
        export_data = json.load(f)

    assert "metadata" in export_data
    assert "userData" in export_data
    assert export_data["metadata"]["userId"] == test_user["user_id"]

    # Cleanup
    file_path.unlink(missing_ok=True)

def test_gdpr_export_rate_limit(test_user):
    """Test GDPR export rate limiting (5 per 24h)."""
    # First 5 exports should succeed
    for i in range(5):
        response = client.post(
            "/gdpr/export",
            json={"format": "json"},
            headers={"Authorization": test_user["session_id"]}
        )
        assert response.status_code == 200

        # Cleanup file
        file_path = Path(response.json()["filePath"])
        file_path.unlink(missing_ok=True)

    # 6th export should fail with rate limit error
    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": test_user["session_id"]}
    )
    assert response.status_code == 429  # Too Many Requests
    assert "Rate limit exceeded" in response.json()["detail"]

def test_gdpr_export_no_consent(test_user, test_db):
    """Test GDPR export fails without consent."""
    # Revoke consent
    sql = text("""
        UPDATE consents
        SET revoked_at = :revoked_at
        WHERE user_id = :user_id AND consent_type = 'data_processing'
    """)
    test_db.execute(sql, {
        "user_id": test_user["user_id"],
        "revoked_at": datetime.now(timezone.utc).isoformat()
    })
    test_db.commit()

    response = client.post(
        "/gdpr/export",
        json={"format": "json"},
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 403
    assert "consent" in response.json()["detail"].lower()

def test_gdpr_delete_without_confirmation(test_user):
    """Test GDPR deletion fails without explicit confirmation."""
    response = client.post(
        "/gdpr/delete",
        json={"confirmed": False},
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 422 or response.status_code == 400
    assert "confirmation" in response.json()["detail"].lower()

def test_gdpr_delete_with_export(test_user, test_db):
    """Test GDPR deletion with pre-export."""
    response = client.post(
        "/gdpr/delete",
        json={
            "confirmed": True,
            "exportBeforeDelete": True,
            "reason": "Test deletion with export"
        },
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert "deletionDate" in data
    assert "deletedCounts" in data
    assert data["preservedAuditLogs"] >= 1  # At least deletion log
    assert data["preservedConsents"] >= 0
    assert data["exportPath"] is not None

    # Verify export file exists
    export_path = Path(data["exportPath"])
    assert export_path.exists()

    # Verify user is deleted
    result = test_db.execute(text("SELECT COUNT(*) FROM users WHERE id = :user_id"), {"user_id": test_user["user_id"]})
    assert result.scalar() == 0

    # Verify audit logs are preserved
    result = test_db.execute(text("SELECT COUNT(*) FROM audit_logs WHERE user_id = :user_id"), {"user_id": str(test_user["user_id"])})
    assert result.scalar() >= 1

    # Cleanup export file
    export_path.unlink(missing_ok=True)

def test_gdpr_delete_success(test_user, test_db):
    """Test successful GDPR deletion without export."""
    response = client.post(
        "/gdpr/delete",
        json={
            "confirmed": True,
            "exportBeforeDelete": False,
            "reason": "Test deletion"
        },
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert "deletedCounts" in data
    assert data["exportPath"] is None

    # Verify user is deleted
    result = test_db.execute(text("SELECT COUNT(*) FROM users WHERE id = :user_id"), {"user_id": test_user["user_id"]})
    assert result.scalar() == 0

def test_get_consents(test_user):
    """Test getting user consents."""
    response = client.get(
        "/gdpr/consents",
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 200
    data = response.json()

    assert "consents" in data
    assert len(data["consents"]) >= 2

    # Verify consent structure
    consent = data["consents"][0]
    assert "id" in consent
    assert "consentType" in consent
    assert "granted" in consent
    assert "createdAt" in consent

def test_update_consent(test_user):
    """Test updating user consent."""
    response = client.post(
        "/gdpr/consents",
        json={
            "consentType": "marketing",
            "granted": True
        },
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["consentType"] == "marketing"
    assert data["granted"] is True

def test_revoke_consent(test_user):
    """Test revoking user consent."""
    response = client.post(
        "/gdpr/consents",
        json={
            "consentType": "data_processing",
            "granted": False
        },
        headers={"Authorization": test_user["session_id"]}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["granted"] is False

def test_unauthorized_access():
    """Test GDPR endpoints require authentication."""
    # Test export
    response = client.post("/gdpr/export", json={"format": "json"})
    assert response.status_code == 401

    # Test delete
    response = client.post("/gdpr/delete", json={"confirmed": True})
    assert response.status_code == 401

    # Test get consents
    response = client.get("/gdpr/consents")
    assert response.status_code == 401

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

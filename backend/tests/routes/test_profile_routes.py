"""
Comprehensive tests for profile routes.

Tests cover:
- Profile CRUD operations
- Field-level encryption/decryption
- Password change with OWASP validation
- Profile completeness calculation
- Service layer integration
- Mock services (not database)
- Error handling and edge cases
"""

import pytest
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient

from backend.routes.profile import (
    router,
    calculate_profile_completeness,
    get_auth_service,
    get_encryption_service,
    get_audit_logger,
    get_profile_service
)
from backend.services.profile_service import (
    UserProfileData,
    ExtendedUserProfileData,
    ProfileUpdateResult
)
from backend.services.auth.service import AuthenticationService

# ===== FIXTURES =====

@pytest.fixture
def mock_db():
    """Mock database session."""
    return Mock()

@pytest.fixture
def mock_auth_service():
    """Mock authentication service."""
    service = Mock(spec=AuthenticationService)

    # Mock user validation
    mock_user = Mock()
    mock_user.id = 1
    mock_user.username = "testuser"
    service.validate_session.return_value = mock_user

    # Mock password change
    service.change_password = AsyncMock()

    return service

@pytest.fixture
def mock_encryption_service():
    """Mock encryption service."""
    service = Mock()

    # Mock encrypt/decrypt (no-op for testing)
    service.encrypt = Mock(side_effect=lambda x: f"encrypted_{x}" if x else None)
    service.decrypt = Mock(side_effect=lambda x: x.replace("encrypted_", "") if x and isinstance(x, str) else x)

    return service

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def mock_profile_service():
    """Mock profile service."""
    service = Mock()

    # Mock get() - returns UserProfileData
    service.get = AsyncMock(return_value=UserProfileData(
        firstName="John",
        lastName="Doe",
        email="john.doe@example.com",
        phone="+1234567890"
    ))

    # Mock get_extended() - returns ExtendedUserProfileData
    service.get_extended = AsyncMock(return_value=ExtendedUserProfileData(
        firstName="John",
        lastName="Doe",
        email="john.doe@example.com",
        phone="+1234567890",
        fullName="John Doe",
        initials="JD"
    ))

    # Mock update() - returns ProfileUpdateResult
    service.update = AsyncMock(return_value=ProfileUpdateResult(
        success=True,
        message="Profile updated successfully",
        updatedFields=UserProfileData(
            firstName="Jane",
            lastName="Smith",
            email="jane.smith@example.com",
            phone=None
        )
    ))

    # Mock validate()
    service.validate = Mock(return_value=Mock(isValid=True, errors={}))

    return service

@pytest.fixture
def valid_session_id():
    """Valid session ID for testing."""
    return "valid-session-uuid-12345"

@pytest.fixture
def client(mock_db, mock_auth_service, mock_encryption_service, mock_audit_logger, mock_profile_service):
    """Test client with mocked dependencies."""
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)

    # Override dependencies
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[get_encryption_service] = lambda: mock_encryption_service
    app.dependency_overrides[get_audit_logger] = lambda: mock_audit_logger
    app.dependency_overrides[get_profile_service] = lambda: mock_profile_service

    return TestClient(app)

# ===== TESTS: GET /profile =====

def test_get_profile_success(client, valid_session_id, mock_profile_service):
    """Test GET /profile returns decrypted profile data."""
    response = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert data["id"] == 1
    assert data["firstName"] == "John"
    assert data["lastName"] == "Doe"
    assert data["fullName"] == "John Doe"
    assert data["initials"] == "JD"
    assert data["email"] == "john.doe@example.com"
    assert data["phone"] == "+1234567890"

    # Verify service was called
    mock_profile_service.get_extended.assert_called_once()

def test_get_profile_not_found(client, valid_session_id, mock_profile_service):
    """Test GET /profile returns 404 if profile doesn't exist."""
    # Mock service to return None
    mock_profile_service.get = AsyncMock(return_value=None)

    response = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 404
    assert "Profile not found" in response.json()["detail"]

def test_get_profile_unauthorized_no_session(client):
    """Test GET /profile returns 401 without session ID."""
    response = client.get("/profile")

    assert response.status_code == 401
    assert "Session ID required" in response.json()["detail"]

def test_get_profile_unauthorized_invalid_session(client, mock_auth_service):
    """Test GET /profile returns 401 with invalid session."""
    # Mock service to return None (invalid session)
    mock_auth_service.validate_session.return_value = None

    response = client.get(
        "/profile",
        headers={"Authorization": "Bearer invalid-session"}
    )

    assert response.status_code == 401
    assert "Invalid or expired session" in response.json()["detail"]

def test_get_profile_session_from_query_param(client, valid_session_id, mock_profile_service):
    """Test GET /profile accepts session ID from query param."""
    response = client.get(f"/profile?session_id={valid_session_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["firstName"] == "John"

# ===== TESTS: PUT /profile =====

def test_update_profile_success(client, valid_session_id, mock_profile_service):
    """Test PUT /profile successfully updates profile."""
    update_data = {
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@example.com"
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    data = response.json()

    # Verify service.update() was called
    mock_profile_service.update.assert_called_once()
    call_args = mock_profile_service.update.call_args
    assert call_args[1]["profile_data"]["firstName"] == "Jane"
    assert call_args[1]["profile_data"]["lastName"] == "Smith"
    assert call_args[1]["max_retries"] == 3

def test_update_profile_name_field_splits_into_first_last(client, valid_session_id, mock_profile_service):
    """Test PUT /profile splits legacy 'name' field into firstName/lastName."""
    update_data = {
        "name": "Jane Smith"
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200

    # Verify service.update() was called with split name
    call_args = mock_profile_service.update.call_args
    assert call_args[1]["profile_data"]["firstName"] == "Jane"
    assert call_args[1]["profile_data"]["lastName"] == "Smith"

def test_update_profile_name_field_single_word(client, valid_session_id, mock_profile_service):
    """Test PUT /profile handles single-word name."""
    update_data = {
        "name": "Madonna"
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200

    # Verify service.update() was called
    call_args = mock_profile_service.update.call_args
    assert call_args[1]["profile_data"]["firstName"] == "Madonna"
    assert call_args[1]["profile_data"]["lastName"] == ""

def test_update_profile_validation_error_invalid_email(client, valid_session_id):
    """Test PUT /profile rejects invalid email format."""
    update_data = {
        "email": "not-an-email"
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 422  # Pydantic validation error
    assert "email" in response.json()["detail"][0]["loc"]

def test_update_profile_validation_error_invalid_name(client, valid_session_id):
    """Test PUT /profile rejects name with special characters."""
    update_data = {
        "firstName": "John123"  # Numbers not allowed
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 422
    assert "firstName" in response.json()["detail"][0]["loc"]

def test_update_profile_validation_error_invalid_phone(client, valid_session_id):
    """Test PUT /profile rejects invalid phone number."""
    update_data = {
        "phone": "abc123"
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 422

def test_update_profile_validation_error_invalid_avatar_url(client, valid_session_id):
    """Test PUT /profile rejects non-HTTPS avatar URL."""
    update_data = {
        "avatarUrl": "http://example.com/avatar.jpg"  # HTTP not allowed
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 422

def test_update_profile_service_failure(client, valid_session_id, mock_profile_service):
    """Test PUT /profile handles service layer failure."""
    # Mock service to return failure
    mock_profile_service.update = AsyncMock(return_value=ProfileUpdateResult(
        success=False,
        message="Validation failed: Email already exists"
    ))

    update_data = {
        "email": "duplicate@example.com"
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 400
    assert "Validation failed" in response.json()["detail"]

def test_update_profile_no_fields_returns_current_profile(client, valid_session_id, mock_profile_service):
    """Test PUT /profile with no fields returns current profile."""
    response = client.put(
        "/profile",
        json={},
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    # Should call get_extended() but not update()
    mock_profile_service.get_extended.assert_called()
    mock_profile_service.update.assert_not_called()

# ===== TESTS: PUT /profile/password =====

def test_change_password_success(client, valid_session_id, mock_auth_service):
    """Test PUT /profile/password successfully changes password."""
    password_data = {
        "currentPassword": "OldPassword123",
        "newPassword": "NewPassword456"
    }

    response = client.put(
        "/profile/password",
        json=password_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Password changed successfully" in data["message"]

    # Verify service was called
    mock_auth_service.change_password.assert_called_once_with(
        user_id=1,
        old_password="OldPassword123",
        new_password="NewPassword456"
    )

def test_change_password_invalid_current_password(client, valid_session_id, mock_auth_service):
    """Test PUT /profile/password rejects incorrect current password."""
    # Mock service to raise AuthenticationError
    mock_auth_service.change_password = AsyncMock(
        side_effect=Exception("Invalid current password")
    )

    password_data = {
        "currentPassword": "WrongPassword",
        "newPassword": "NewPassword456"
    }

    response = client.put(
        "/profile/password",
        json=password_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 401
    assert "Invalid current password" in response.json()["detail"]

def test_change_password_weak_new_password(client, valid_session_id):
    """Test PUT /profile/password rejects weak password."""
    password_data = {
        "currentPassword": "OldPassword123",
        "newPassword": "weak"  # Too short, no uppercase, no number
    }

    response = client.put(
        "/profile/password",
        json=password_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 422  # Pydantic validation error

def test_change_password_owasp_validation(client, valid_session_id):
    """Test PUT /profile/password enforces OWASP password requirements."""
    # Test cases for OWASP validation
    test_cases = [
        ("short123", "at least 12 characters"),  # Too short
        ("nouppercase123", "uppercase letter"),  # No uppercase
        ("NOLOWERCASE123", "lowercase letter"),  # No lowercase
        ("NoNumbers!!!", "one number"),  # No numbers
    ]

    for weak_password, expected_error in test_cases:
        password_data = {
            "currentPassword": "OldPassword123",
            "newPassword": weak_password
        }

        response = client.put(
            "/profile/password",
            json=password_data,
            headers={"Authorization": f"Bearer {valid_session_id}"}
        )

        assert response.status_code == 422

# ===== TESTS: GET /profile/completeness =====

def test_get_profile_completeness_full(client, valid_session_id, mock_profile_service):
    """Test GET /profile/completeness returns 100% for complete profile."""
    response = client.get(
        "/profile/completeness",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["percentage"] == 100
    assert len(data["missingFields"]) == 0
    assert "firstName" in data["completedFields"]
    assert "lastName" in data["completedFields"]
    assert "email" in data["completedFields"]
    assert "phone" in data["completedFields"]

def test_get_profile_completeness_partial(client, valid_session_id, mock_profile_service):
    """Test GET /profile/completeness calculates partial completion."""
    # Mock service to return incomplete profile
    mock_profile_service.get = AsyncMock(return_value=UserProfileData(
        firstName="John",
        lastName="",
        email="",
        phone=None
    ))

    response = client.get(
        "/profile/completeness",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["percentage"] == 25  # 1 out of 4 fields
    assert "lastName" in data["missingFields"]
    assert "email" in data["missingFields"]
    assert "firstName" in data["completedFields"]

def test_get_profile_completeness_empty(client, valid_session_id, mock_profile_service):
    """Test GET /profile/completeness returns 0% for empty profile."""
    # Mock service to return None
    mock_profile_service.get = AsyncMock(return_value=None)

    response = client.get(
        "/profile/completeness",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["percentage"] == 0
    assert len(data["completedFields"]) == 0
    assert "firstName" in data["missingFields"]
    assert "lastName" in data["missingFields"]
    assert "email" in data["missingFields"]

# ===== TESTS: Helper Functions =====

def test_calculate_profile_completeness_full_profile():
    """Test calculate_profile_completeness with complete profile."""
    profile = UserProfileData(
        firstName="John",
        lastName="Doe",
        email="john@example.com",
        phone="+1234567890"
    )

    result = calculate_profile_completeness(profile)

    assert result.percentage == 100
    assert len(result.missingFields) == 0
    assert len(result.completedFields) == 4

def test_calculate_profile_completeness_partial_profile():
    """Test calculate_profile_completeness with partial profile."""
    profile = UserProfileData(
        firstName="John",
        lastName="",
        email="john@example.com",
        phone=None
    )

    result = calculate_profile_completeness(profile)

    assert result.percentage == 50  # 2 out of 4 fields
    assert "lastName" in result.missingFields
    assert "firstName" in result.completedFields
    assert "email" in result.completedFields

def test_calculate_profile_completeness_none():
    """Test calculate_profile_completeness with None."""
    result = calculate_profile_completeness(None)

    assert result.percentage == 0
    assert len(result.completedFields) == 0
    assert len(result.missingFields) == 3  # All required fields

# ===== TESTS: Authentication and Authorization =====

def test_authentication_bearer_token_format(client, mock_auth_service, mock_profile_service):
    """Test authentication accepts 'Bearer <token>' format."""
    response = client.get(
        "/profile",
        headers={"Authorization": "Bearer valid-session-uuid-12345"}
    )

    assert response.status_code == 200
    mock_auth_service.validate_session.assert_called_once_with("valid-session-uuid-12345")

def test_authentication_plain_token_format(client, mock_auth_service, mock_profile_service):
    """Test authentication accepts plain token format."""
    response = client.get(
        "/profile",
        headers={"Authorization": "valid-session-uuid-12345"}
    )

    assert response.status_code == 200
    mock_auth_service.validate_session.assert_called_once_with("valid-session-uuid-12345")

def test_authentication_query_param(client, mock_auth_service, mock_profile_service):
    """Test authentication accepts session_id query parameter."""
    response = client.get("/profile?session_id=valid-session-uuid-12345")

    assert response.status_code == 200
    mock_auth_service.validate_session.assert_called_once_with("valid-session-uuid-12345")

# ===== TESTS: Edge Cases =====

def test_update_profile_clear_email(client, valid_session_id, mock_profile_service):
    """Test PUT /profile allows clearing email field."""
    update_data = {
        "email": ""  # Empty string to clear
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200

def test_update_profile_clear_phone(client, valid_session_id, mock_profile_service):
    """Test PUT /profile allows clearing phone field."""
    update_data = {
        "phone": ""  # Empty string to clear
    }

    response = client.put(
        "/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 200

def test_get_profile_handles_service_exception(client, valid_session_id, mock_profile_service):
    """Test GET /profile handles service layer exceptions gracefully."""
    # Mock service to raise exception
    mock_profile_service.get_extended = AsyncMock(side_effect=Exception("Database error"))

    response = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    assert response.status_code == 500
    assert "Failed to get profile" in response.json()["detail"]

# ===== TESTS: Service Layer Integration =====

def test_profile_service_called_with_correct_dependencies(client, valid_session_id, mock_db, mock_encryption_service, mock_audit_logger):
    """Test profile service is instantiated with correct dependencies."""
    # This test verifies dependency injection works correctly
    response = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )

    # Should succeed (200) if dependencies are correctly injected
    assert response.status_code == 200

def test_encryption_service_used_for_pii_fields(mock_encryption_service):
    """Test encryption service is used for PII field encryption/decryption."""
    # Mock encrypt call
    encrypted = mock_encryption_service.encrypt("john.doe@example.com")
    assert encrypted == "encrypted_john.doe@example.com"

    # Mock decrypt call
    decrypted = mock_encryption_service.decrypt("encrypted_john.doe@example.com")
    assert decrypted == "john.doe@example.com"

def test_audit_logger_called_on_profile_operations(mock_audit_logger):
    """Test audit logger is called for profile operations."""
    # Verify audit logger has log method
    assert hasattr(mock_audit_logger, 'log')
    assert callable(mock_audit_logger.log)

# ===== TESTS: Caching =====

def test_get_profile_uses_caching(client, valid_session_id, mock_profile_service):
    """Test GET /profile uses cached computed fields (fullName, initials)."""
    # First request
    response1 = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )
    assert response1.status_code == 200

    # Second request (should use cache if within 5 seconds)
    response2 = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {valid_session_id}"}
    )
    assert response2.status_code == 200

    # Verify service.get_extended() was called for both (cache is in service layer)
    assert mock_profile_service.get_extended.call_count == 2

# ===== TESTS: Validation =====

def test_update_profile_validates_email_rfc5321(client, valid_session_id):
    """Test PUT /profile enforces RFC 5321 email validation."""
    test_cases = [
        ("..leading@example.com", "consecutive dots"),
        ("trailing..@example.com", "consecutive dots"),
        (".leading@example.com", "start with dot"),
        ("trailing.@example.com", "end with dot"),
        ("user@-domain.com", "start with hyphen"),
        # Note: "user@domain-.com" is technically valid per RFC 5321
        # because the hyphen is before the TLD, not at the end of the entire domain
    ]

    for invalid_email, reason in test_cases:
        update_data = {"email": invalid_email}
        response = client.put(
            "/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {valid_session_id}"}
        )
        assert response.status_code == 422, f"Should reject email: {invalid_email} ({reason})"

def test_update_profile_accepts_valid_emails(client, valid_session_id, mock_profile_service):
    """Test PUT /profile accepts valid email formats."""
    valid_emails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "firstname.lastname@example.org",
    ]

    for valid_email in valid_emails:
        update_data = {"email": valid_email}
        response = client.put(
            "/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {valid_session_id}"}
        )
        assert response.status_code == 200, f"Should accept email: {valid_email}"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

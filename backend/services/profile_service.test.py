"""
Unit tests for ProfileService.
Tests profile CRUD operations, validation, caching, and encryption.
"""

import pytest
import time
from unittest.mock import Mock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from backend.models.base import Base
from backend.models.profile import UserProfile
from backend.services.profile_service import (
    ProfileService,
    UserProfileData,
    ProfileValidationResult,
    ProfileUpdateResult,
    ExtendedUserProfileData,
    ProfileFormData,
)
from backend.services.encryption_service import EncryptionService


# Test fixtures
@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create initial profile row (id=1)
    profile = UserProfile(
        id=1,
        name="Legal User",
        first_name=None,
        last_name=None,
        email=None,
        phone=None
    )
    session.add(profile)
    session.commit()

    yield session
    session.close()


@pytest.fixture
def encryption_service():
    """Mock encryption service."""
    service = Mock(spec=EncryptionService)
    service.encrypt = Mock(side_effect=lambda x: f"encrypted_{x}")
    service.decrypt = Mock(side_effect=lambda x: x.replace("encrypted_", ""))
    return service


@pytest.fixture
def audit_logger():
    """Mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger


@pytest.fixture
def profile_service(db_session, encryption_service, audit_logger):
    """Create ProfileService instance."""
    return ProfileService(
        db=db_session,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )


# Test cases
class TestProfileServiceGet:
    """Test get() method."""

    @pytest.mark.asyncio
    async def test_get_empty_profile(self, profile_service):
        """Test getting profile when no data exists."""
        result = await profile_service.get()
        assert result is None

    @pytest.mark.asyncio
    async def test_get_existing_profile(self, profile_service, db_session):
        """Test getting existing profile data."""
        # Create profile with data
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "John"
        profile.last_name = "Doe"
        profile.email = "encrypted_john@example.com"
        profile.phone = "encrypted_+1234567890"
        db_session.commit()

        result = await profile_service.get()

        assert result is not None
        assert result.firstName == "John"
        assert result.lastName == "Doe"
        assert result.email == "john@example.com"  # Decrypted
        assert result.phone == "+1234567890"  # Decrypted

    @pytest.mark.asyncio
    async def test_get_without_encryption_service(self, db_session, audit_logger):
        """Test getting profile without encryption service."""
        service = ProfileService(db=db_session, encryption_service=None, audit_logger=audit_logger)

        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "Jane"
        profile.last_name = "Smith"
        profile.email = "jane@example.com"
        db_session.commit()

        result = await service.get()

        assert result is not None
        assert result.firstName == "Jane"
        assert result.email == "jane@example.com"  # Not decrypted


class TestProfileServiceUpdate:
    """Test update() method."""

    @pytest.mark.asyncio
    async def test_update_new_profile(self, profile_service, db_session, encryption_service):
        """Test creating new profile data."""
        profile_data = {
            "firstName": "Alice",
            "lastName": "Johnson",
            "email": "alice@example.com",
            "phone": "+9876543210"
        }

        result = await profile_service.update(profile_data)

        assert result.success is True
        assert result.message == "Profile updated successfully"
        assert result.updatedFields is not None
        assert result.updatedFields.firstName == "Alice"

        # Verify database
        db_profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        assert db_profile.first_name == "Alice"
        assert db_profile.last_name == "Johnson"
        assert db_profile.name == "Alice Johnson"
        assert db_profile.email == "encrypted_alice@example.com"
        assert db_profile.phone == "encrypted_+9876543210"

    @pytest.mark.asyncio
    async def test_update_partial_data(self, profile_service, db_session):
        """Test updating only some fields."""
        # Create initial profile
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "Bob"
        profile.last_name = "Smith"
        profile.email = "encrypted_bob@example.com"
        db_session.commit()

        # Update only email
        result = await profile_service.update({"email": "newemail@example.com"})

        assert result.success is True

        # Verify other fields unchanged
        db_profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        assert db_profile.first_name == "Bob"
        assert db_profile.last_name == "Smith"

    @pytest.mark.asyncio
    async def test_update_validation_failure(self, profile_service):
        """Test update with invalid data."""
        profile_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "invalid-email"  # Invalid email
        }

        result = await profile_service.update(profile_data)

        assert result.success is False
        assert "validation failed" in result.message.lower()

    @pytest.mark.asyncio
    async def test_update_retry_logic(self, profile_service, db_session, monkeypatch):
        """Test retry logic with exponential backoff."""
        # Mock commit to fail twice, then succeed
        original_commit = db_session.commit
        commit_count = {"count": 0}

        def mock_commit():
            commit_count["count"] += 1
            if commit_count["count"] < 3:
                raise Exception("Simulated database error")
            return original_commit()

        monkeypatch.setattr(db_session, "commit", mock_commit)

        profile_data = {
            "firstName": "Retry",
            "lastName": "Test",
            "email": "retry@example.com"
        }

        result = await profile_service.update(profile_data, max_retries=3)

        assert result.success is True
        assert commit_count["count"] == 3  # Failed twice, succeeded third time


class TestProfileServiceValidation:
    """Test validate() method."""

    def test_validate_valid_profile(self, profile_service):
        """Test validation of valid profile data."""
        profile_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "phone": "+1234567890"
        }

        result = profile_service.validate(profile_data)

        assert result.isValid is True
        assert all(error is None for error in result.errors.values())

    def test_validate_invalid_email(self, profile_service):
        """Test validation of invalid email."""
        profile_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "not-an-email",
        }

        result = profile_service.validate(profile_data)

        assert result.isValid is False
        assert result.errors["email"] is not None
        assert "valid email" in result.errors["email"].lower()

    def test_validate_invalid_phone(self, profile_service):
        """Test validation of invalid phone number."""
        profile_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "phone": "abc123"  # Invalid phone
        }

        result = profile_service.validate(profile_data)

        assert result.isValid is False
        assert result.errors["phone"] is not None
        assert "valid phone" in result.errors["phone"].lower()

    def test_validate_invalid_name_characters(self, profile_service):
        """Test validation of names with special characters."""
        profile_data = {
            "firstName": "John123",  # Numbers not allowed
            "lastName": "Doe@",  # Special characters not allowed
            "email": "john@example.com"
        }

        result = profile_service.validate(profile_data)

        assert result.isValid is False
        assert result.errors["firstName"] is not None
        assert result.errors["lastName"] is not None

    def test_validate_optional_fields(self, profile_service):
        """Test validation with optional fields omitted."""
        profile_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            # phone omitted
        }

        result = profile_service.validate(profile_data)

        assert result.isValid is True

    def test_validate_hyphenated_names(self, profile_service):
        """Test validation allows hyphenated names."""
        profile_data = {
            "firstName": "Mary-Jane",
            "lastName": "O'Connor",
            "email": "mary@example.com"
        }

        result = profile_service.validate(profile_data)

        assert result.isValid is True


class TestProfileServiceClear:
    """Test clear() method."""

    @pytest.mark.asyncio
    async def test_clear_profile(self, profile_service, db_session):
        """Test clearing profile data."""
        # Create profile with data
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "John"
        profile.last_name = "Doe"
        profile.email = "john@example.com"
        profile.phone = "+1234567890"
        db_session.commit()

        await profile_service.clear()

        # Verify cleared
        db_profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        assert db_profile.first_name is None
        assert db_profile.last_name is None
        assert db_profile.email is None
        assert db_profile.phone is None
        assert db_profile.name == "Legal User"  # Reset to default


class TestProfileServiceGetExtended:
    """Test get_extended() method with caching."""

    @pytest.mark.asyncio
    async def test_get_extended_with_full_name(self, profile_service, db_session):
        """Test getting extended profile with computed fields."""
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "John"
        profile.last_name = "Doe"
        profile.email = "encrypted_john@example.com"
        db_session.commit()

        result = await profile_service.get_extended()

        assert result is not None
        assert result.fullName == "John Doe"
        assert result.initials == "JD"

    @pytest.mark.asyncio
    async def test_get_extended_with_first_name_only(self, profile_service, db_session):
        """Test extended profile with only first name."""
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "Alice"
        profile.email = "encrypted_alice@example.com"
        db_session.commit()

        result = await profile_service.get_extended()

        assert result is not None
        assert result.fullName == "Alice"
        assert result.initials == "A"

    @pytest.mark.asyncio
    async def test_get_extended_caching(self, profile_service, db_session):
        """Test that extended profile is cached."""
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "Bob"
        profile.last_name = "Smith"
        profile.email = "encrypted_bob@example.com"
        db_session.commit()

        # First call
        result1 = await profile_service.get_extended()

        # Change database (should not affect cached result)
        profile.first_name = "Changed"
        db_session.commit()

        # Second call (within cache duration)
        result2 = await profile_service.get_extended()

        assert result1.fullName == result2.fullName == "Bob Smith"

    @pytest.mark.asyncio
    async def test_get_extended_cache_invalidation(self, profile_service, db_session):
        """Test cache invalidation after update."""
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "Charlie"
        profile.last_name = "Brown"
        profile.email = "encrypted_charlie@example.com"
        db_session.commit()

        # Get cached result
        result1 = await profile_service.get_extended()
        assert result1.fullName == "Charlie Brown"

        # Update profile (should invalidate cache)
        await profile_service.update({"firstName": "Updated"})

        # Get new result (cache invalidated)
        result2 = await profile_service.get_extended()
        assert result2.fullName == "Updated Brown"

    @pytest.mark.asyncio
    async def test_get_extended_cache_expiration(self, profile_service, db_session, monkeypatch):
        """Test cache expiration after 5 seconds."""
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "David"
        profile.last_name = "Wilson"
        profile.email = "encrypted_david@example.com"
        db_session.commit()

        # First call
        result1 = await profile_service.get_extended()

        # Simulate time passing (mock time.time)
        original_time = time.time
        monkeypatch.setattr(time, "time", lambda: original_time() + 6)  # 6 seconds later

        # Change database
        profile.first_name = "NewName"
        db_session.commit()

        # Second call (cache expired)
        result2 = await profile_service.get_extended()

        assert result1.fullName == "David Wilson"
        assert result2.fullName == "NewName Wilson"


class TestProfileServiceConversions:
    """Test form_data_to_profile and profile_to_form_data methods."""

    def test_form_data_to_profile(self, profile_service):
        """Test converting form data to profile data."""
        form_data = ProfileFormData(
            firstName="  John  ",
            lastName="  Doe  ",
            email="  john@example.com  ",
            phone="  +1234567890  "
        )

        result = profile_service.form_data_to_profile(form_data)

        assert result.firstName == "John"  # Trimmed
        assert result.lastName == "Doe"
        assert result.email == "john@example.com"
        assert result.phone == "+1234567890"

    def test_profile_to_form_data_with_data(self, profile_service):
        """Test converting profile data to form data."""
        profile = UserProfileData(
            firstName="Jane",
            lastName="Smith",
            email="jane@example.com",
            phone="+9876543210"
        )

        result = profile_service.profile_to_form_data(profile)

        assert result.firstName == "Jane"
        assert result.lastName == "Smith"
        assert result.email == "jane@example.com"
        assert result.phone == "+9876543210"

    def test_profile_to_form_data_with_none(self, profile_service):
        """Test converting None to form data (defaults)."""
        result = profile_service.profile_to_form_data(None)

        assert result.firstName == ""
        assert result.lastName == ""
        assert result.email == ""
        assert result.phone == ""


class TestProfileServiceAuditLogging:
    """Test audit logging integration."""

    @pytest.mark.asyncio
    async def test_audit_logging_on_get(self, profile_service, db_session, audit_logger):
        """Test audit log on get operation."""
        profile = db_session.query(UserProfile).filter(UserProfile.id == 1).first()
        profile.first_name = "Test"
        profile.email = "encrypted_test@example.com"
        db_session.commit()

        await profile_service.get()

        # Verify audit log called
        assert audit_logger.log.called
        call_args = audit_logger.log.call_args[0][0]
        assert call_args["event_type"] == "profile.get"
        assert call_args["success"] is True

    @pytest.mark.asyncio
    async def test_audit_logging_on_update(self, profile_service, audit_logger):
        """Test audit log on update operation."""
        await profile_service.update({
            "firstName": "Audit",
            "lastName": "Test",
            "email": "audit@example.com"
        })

        # Verify audit log called
        assert audit_logger.log.called
        call_args = audit_logger.log.call_args[0][0]
        assert call_args["event_type"] == "profile.update"
        assert call_args["success"] is True

    @pytest.mark.asyncio
    async def test_audit_logging_on_clear(self, profile_service, audit_logger):
        """Test audit log on clear operation."""
        await profile_service.clear()

        # Verify audit log called
        assert audit_logger.log.called
        call_args = audit_logger.log.call_args[0][0]
        assert call_args["event_type"] == "profile.clear"
        assert call_args["success"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

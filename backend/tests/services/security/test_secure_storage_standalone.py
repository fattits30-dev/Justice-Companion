"""
Standalone tests for SecureStorageService (no dependencies on other services).
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from unittest.mock import patch, MagicMock

# Import directly from the module file
from secure_storage_service import (
    SecureStorageService,
)

@pytest.fixture
def mock_keyring():
    """Mock the keyring module."""
    with patch("secure_storage_service.keyring.get_keyring") as mock_get_keyring, \
         patch("secure_storage_service.keyring.set_password") as mock_set_password, \
         patch("secure_storage_service.keyring.get_password") as mock_get_password, \
         patch("secure_storage_service.keyring.delete_password") as mock_delete_password:

        # Setup mock backend
        mock_backend = MagicMock()
        mock_backend.__class__.__name__ = "WinVaultKeyring"  # Simulate Windows DPAPI
        mock_get_keyring.return_value = mock_backend

        yield {
            "get_keyring": mock_get_keyring,
            "set_password": mock_set_password,
            "get_password": mock_get_password,
            "delete_password": mock_delete_password,
        }

@pytest.fixture
async def service():
    """Create a fresh SecureStorageService instance."""
    # Reset singleton for testing
    SecureStorageService._instance = None
    service = SecureStorageService.get_instance()
    return service

class TestSecureStorageServiceBasics:
    """Basic functionality tests."""

    @pytest.mark.asyncio
    async def test_singleton_pattern(self):
        """Test that get_instance returns the same instance."""
        SecureStorageService._instance = None
        service1 = SecureStorageService.get_instance()
        service2 = SecureStorageService.get_instance()
        assert service1 is service2

    @pytest.mark.asyncio
    async def test_initialization_success(self, service, mock_keyring):
        """Test successful initialization with available encryption."""
        await service.init()

        assert service._initialized is True
        assert service.is_encryption_available() is True
        mock_keyring["get_keyring"].assert_called_once()

    @pytest.mark.asyncio
    async def test_set_and_get_api_key(self, service, mock_keyring):
        """Test storing and retrieving an API key."""
        await service.init()

        # Set API key
        await service.set_api_key("test_key", "test_value")
        mock_keyring["set_password"].assert_called_once_with(
            "JusticeCompanion", "test_key", "test_value"
        )

        # Get API key
        mock_keyring["get_password"].return_value = "test_value"
        result = await service.get_api_key("test_key")
        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_delete_api_key(self, service, mock_keyring):
        """Test deleting an API key."""
        await service.init()

        await service.delete_api_key("test_key")
        mock_keyring["delete_password"].assert_called_once_with(
            "JusticeCompanion", "test_key"
        )

    @pytest.mark.asyncio
    async def test_has_api_key(self, service, mock_keyring):
        """Test checking if key exists."""
        await service.init()

        # Key exists
        mock_keyring["get_password"].return_value = "test_value"
        assert await service.has_api_key("test_key") is True

        # Key doesn't exist
        mock_keyring["get_password"].return_value = None
        assert await service.has_api_key("nonexistent") is False

    @pytest.mark.asyncio
    async def test_empty_key_validation(self, service, mock_keyring):
        """Test validation of empty keys."""
        await service.init()

        with pytest.raises(ValueError, match="Key is required"):
            await service.set_api_key("", "value")

        with pytest.raises(ValueError, match="Key is required"):
            await service.get_api_key("")

        with pytest.raises(ValueError, match="Key is required"):
            await service.delete_api_key("")

    @pytest.mark.asyncio
    async def test_empty_value_validation(self, service, mock_keyring):
        """Test validation of empty values."""
        await service.init()

        with pytest.raises(ValueError, match="Value is required"):
            await service.set_api_key("key", "")

    @pytest.mark.asyncio
    async def test_backend_info(self, service, mock_keyring):
        """Test getting backend information."""
        await service.init()

        info = service.get_backend_info()
        assert info["initialized"] is True
        assert info["backend"] == "WinVaultKeyring"
        assert info["encryption_available"] is True
        assert info["service_name"] == "JusticeCompanion"

    @pytest.mark.asyncio
    async def test_list_keys(self, service, mock_keyring):
        """Test listing keys."""
        await service.init()

        # Mock some keys exist
        def mock_get_password(service_name, key):
            if key == "openai_api_key":
                return "some_value"
            return None

        mock_keyring["get_password"].side_effect = mock_get_password

        result = await service.list_keys()
        assert isinstance(result, dict)
        assert "openai_api_key" in result

    @pytest.mark.asyncio
    async def test_clear_all(self, service, mock_keyring):
        """Test clearing all keys."""
        await service.init()

        await service.clear_all()
        # Should attempt to delete multiple keys
        assert mock_keyring["delete_password"].call_count >= 6

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

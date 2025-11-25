"""
Tests for SecureStorageService.

Tests secure storage of API keys using OS-native encryption.
Covers Windows DPAPI, macOS Keychain, and Linux Secret Service.
"""

import pytest
from unittest.mock import patch, MagicMock
from keyring.errors import KeyringError, PasswordDeleteError

from .secure_storage_service import (
    SecureStorageService,
    SecureStorageError,
)

@pytest.fixture
def mock_keyring():
    """Mock the keyring module."""
    with patch("keyring.get_keyring") as mock_get_keyring, \
         patch("keyring.set_password") as mock_set_password, \
         patch("keyring.get_password") as mock_get_password, \
         patch("keyring.delete_password") as mock_delete_password:

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

class TestSecureStorageServiceInitialization:
    """Test service initialization and singleton pattern."""

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
    async def test_initialization_no_encryption(self, service):
        """Test initialization when encryption is not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            await service.init()

            assert service._initialized is True
            assert service.is_encryption_available() is False

    @pytest.mark.asyncio
    async def test_initialization_idempotent(self, service, mock_keyring):
        """Test that multiple init calls don't re-initialize."""
        await service.init()
        await service.init()
        await service.init()

        # get_keyring should only be called once
        assert mock_keyring["get_keyring"].call_count == 1

    @pytest.mark.asyncio
    async def test_initialization_error_handling(self, service):
        """Test error handling during initialization."""
        with patch("keyring.get_keyring", side_effect=Exception("Keyring error")):
            with pytest.raises(SecureStorageError) as exc_info:
                await service.init()

            assert "Failed to initialize secure storage" in str(exc_info.value)

class TestSecureStorageServiceSetApiKey:
    """Test storing API keys."""

    @pytest.mark.asyncio
    async def test_set_api_key_success(self, service, mock_keyring):
        """Test successfully storing an API key."""
        await service.init()
        await service.set_api_key("test_key", "test_value")

        mock_keyring["set_password"].assert_called_once_with(
            "JusticeCompanion", "test_key", "test_value"
        )

    @pytest.mark.asyncio
    async def test_set_api_key_auto_init(self, service, mock_keyring):
        """Test that set_api_key auto-initializes if needed."""
        await service.set_api_key("test_key", "test_value")

        assert service._initialized is True
        mock_keyring["set_password"].assert_called_once()

    @pytest.mark.asyncio
    async def test_set_api_key_empty_key(self, service, mock_keyring):
        """Test error when key is empty."""
        await service.init()

        with pytest.raises(ValueError) as exc_info:
            await service.set_api_key("", "value")

        assert "Key is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_set_api_key_empty_value(self, service, mock_keyring):
        """Test error when value is empty."""
        await service.init()

        with pytest.raises(ValueError) as exc_info:
            await service.set_api_key("key", "")

        assert "Value is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_set_api_key_keyring_error(self, service, mock_keyring):
        """Test error handling when keyring fails."""
        await service.init()
        mock_keyring["set_password"].side_effect = KeyringError("Storage error")

        with pytest.raises(SecureStorageError) as exc_info:
            await service.set_api_key("test_key", "test_value")

        assert "Failed to store API key" in str(exc_info.value)

class TestSecureStorageServiceGetApiKey:
    """Test retrieving API keys."""

    @pytest.mark.asyncio
    async def test_get_api_key_success(self, service, mock_keyring):
        """Test successfully retrieving an API key."""
        await service.init()
        mock_keyring["get_password"].return_value = "test_value"

        result = await service.get_api_key("test_key")

        assert result == "test_value"
        mock_keyring["get_password"].assert_called_once_with(
            "JusticeCompanion", "test_key"
        )

    @pytest.mark.asyncio
    async def test_get_api_key_not_found(self, service, mock_keyring):
        """Test retrieving non-existent key returns None."""
        await service.init()
        mock_keyring["get_password"].return_value = None

        result = await service.get_api_key("nonexistent_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_api_key_auto_init(self, service, mock_keyring):
        """Test that get_api_key auto-initializes if needed."""
        mock_keyring["get_password"].return_value = "test_value"

        result = await service.get_api_key("test_key")

        assert service._initialized is True
        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_get_api_key_empty_key(self, service, mock_keyring):
        """Test error when key is empty."""
        await service.init()

        with pytest.raises(ValueError) as exc_info:
            await service.get_api_key("")

        assert "Key is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_api_key_keyring_error(self, service, mock_keyring):
        """Test error handling when keyring fails."""
        await service.init()
        mock_keyring["get_password"].side_effect = KeyringError("Retrieval error")

        with pytest.raises(SecureStorageError) as exc_info:
            await service.get_api_key("test_key")

        assert "Failed to retrieve API key" in str(exc_info.value)

class TestSecureStorageServiceDeleteApiKey:
    """Test deleting API keys."""

    @pytest.mark.asyncio
    async def test_delete_api_key_success(self, service, mock_keyring):
        """Test successfully deleting an API key."""
        await service.init()
        await service.delete_api_key("test_key")

        mock_keyring["delete_password"].assert_called_once_with(
            "JusticeCompanion", "test_key"
        )

    @pytest.mark.asyncio
    async def test_delete_api_key_not_found(self, service, mock_keyring):
        """Test deleting non-existent key doesn't raise error."""
        await service.init()
        mock_keyring["delete_password"].side_effect = PasswordDeleteError("Not found")

        # Should not raise exception
        await service.delete_api_key("nonexistent_key")

    @pytest.mark.asyncio
    async def test_delete_api_key_auto_init(self, service, mock_keyring):
        """Test that delete_api_key auto-initializes if needed."""
        await service.delete_api_key("test_key")

        assert service._initialized is True
        mock_keyring["delete_password"].assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_api_key_empty_key(self, service, mock_keyring):
        """Test error when key is empty."""
        await service.init()

        with pytest.raises(ValueError) as exc_info:
            await service.delete_api_key("")

        assert "Key is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_delete_api_key_keyring_error(self, service, mock_keyring):
        """Test error handling when keyring fails."""
        await service.init()
        mock_keyring["delete_password"].side_effect = KeyringError("Deletion error")

        with pytest.raises(SecureStorageError) as exc_info:
            await service.delete_api_key("test_key")

        assert "Failed to delete API key" in str(exc_info.value)

class TestSecureStorageServiceHasApiKey:
    """Test checking key existence."""

    @pytest.mark.asyncio
    async def test_has_api_key_exists(self, service, mock_keyring):
        """Test has_api_key returns True when key exists."""
        await service.init()
        mock_keyring["get_password"].return_value = "test_value"

        result = await service.has_api_key("test_key")

        assert result is True

    @pytest.mark.asyncio
    async def test_has_api_key_not_exists(self, service, mock_keyring):
        """Test has_api_key returns False when key doesn't exist."""
        await service.init()
        mock_keyring["get_password"].return_value = None

        result = await service.has_api_key("nonexistent_key")

        assert result is False

    @pytest.mark.asyncio
    async def test_has_api_key_empty_key(self, service, mock_keyring):
        """Test has_api_key returns False for empty key."""
        await service.init()

        result = await service.has_api_key("")

        assert result is False

    @pytest.mark.asyncio
    async def test_has_api_key_error_handling(self, service, mock_keyring):
        """Test has_api_key returns False on error."""
        await service.init()
        mock_keyring["get_password"].side_effect = KeyringError("Check error")

        result = await service.has_api_key("test_key")

        assert result is False

class TestSecureStorageServiceClearAll:
    """Test clearing all API keys."""

    @pytest.mark.asyncio
    async def test_clear_all_success(self, service, mock_keyring):
        """Test successfully clearing all keys."""
        await service.init()
        await service.clear_all()

        # Should attempt to delete all common keys
        assert mock_keyring["delete_password"].call_count >= 6

    @pytest.mark.asyncio
    async def test_clear_all_partial_failure(self, service, mock_keyring):
        """Test clear_all continues even if some deletions fail."""
        await service.init()

        # Simulate some deletions failing
        mock_keyring["delete_password"].side_effect = [
            None,  # Success
            KeyringError("Error"),  # Failure
            None,  # Success
            PasswordDeleteError("Not found"),  # Not found
            None,  # Success
            None,  # Success
        ]

        # Should not raise exception
        await service.clear_all()

    @pytest.mark.asyncio
    async def test_clear_all_auto_init(self, service, mock_keyring):
        """Test that clear_all auto-initializes if needed."""
        await service.clear_all()

        assert service._initialized is True

class TestSecureStorageServiceListKeys:
    """Test listing key existence status."""

    @pytest.mark.asyncio
    async def test_list_keys_success(self, service, mock_keyring):
        """Test listing keys returns correct status."""
        await service.init()

        # Mock some keys exist, some don't
        def mock_get_password(service_name, key):
            if key in ["openai_api_key", "anthropic_api_key"]:
                return "some_value"
            return None

        mock_keyring["get_password"].side_effect = mock_get_password

        result = await service.list_keys()

        assert isinstance(result, dict)
        assert "openai_api_key" in result
        assert "anthropic_api_key" in result
        assert result["openai_api_key"] is True
        assert result["anthropic_api_key"] is True

    @pytest.mark.asyncio
    async def test_list_keys_error_handling(self, service, mock_keyring):
        """Test list_keys handles errors gracefully."""
        await service.init()
        mock_keyring["get_password"].side_effect = KeyringError("Error")

        result = await service.list_keys()

        # Should return False for all keys on error
        assert all(value is False for value in result.values())

class TestSecureStorageServiceBackendInfo:
    """Test getting backend information."""

    @pytest.mark.asyncio
    async def test_get_backend_info_before_init(self, service):
        """Test getting backend info before initialization."""
        info = service.get_backend_info()

        assert info["initialized"] is False
        assert info["backend"] is None
        assert info["encryption_available"] is False

    @pytest.mark.asyncio
    async def test_get_backend_info_after_init(self, service, mock_keyring):
        """Test getting backend info after initialization."""
        await service.init()

        info = service.get_backend_info()

        assert info["initialized"] is True
        assert info["backend"] == "WinVaultKeyring"
        assert info["encryption_available"] is True
        assert info["service_name"] == "JusticeCompanion"

class TestSecureStorageServiceIntegration:
    """Integration tests for complete workflows."""

    @pytest.mark.asyncio
    async def test_full_lifecycle(self, service, mock_keyring):
        """Test complete store -> retrieve -> delete lifecycle."""
        await service.init()

        # Store
        mock_keyring["get_password"].return_value = None
        assert await service.has_api_key("test_key") is False

        await service.set_api_key("test_key", "test_value")

        # Retrieve
        mock_keyring["get_password"].return_value = "test_value"
        value = await service.get_api_key("test_key")
        assert value == "test_value"
        assert await service.has_api_key("test_key") is True

        # Delete
        await service.delete_api_key("test_key")
        mock_keyring["get_password"].return_value = None
        assert await service.has_api_key("test_key") is False

    @pytest.mark.asyncio
    async def test_multiple_keys(self, service, mock_keyring):
        """Test storing multiple different keys."""
        await service.init()

        keys = {
            "openai_api_key": "sk-openai-123",
            "anthropic_api_key": "sk-ant-456",
            "huggingface_api_key": "hf_789",
        }

        # Store all keys
        for key, value in keys.items():
            await service.set_api_key(key, value)

        # Verify all stored
        assert mock_keyring["set_password"].call_count == 3

        # Retrieve all keys
        for key, expected_value in keys.items():
            mock_keyring["get_password"].return_value = expected_value
            value = await service.get_api_key(key)
            assert value == expected_value

class TestSecureStorageConvenienceFunctions:
    """Test module-level convenience functions."""

    @pytest.mark.asyncio
    async def test_convenience_set_api_key(self, mock_keyring):
        """Test convenience function for setting API key."""
        from .secure_storage_service import set_api_key

        SecureStorageService._instance = None
        await set_api_key("test_key", "test_value")

        mock_keyring["set_password"].assert_called_once()

    @pytest.mark.asyncio
    async def test_convenience_get_api_key(self, mock_keyring):
        """Test convenience function for getting API key."""
        from .secure_storage_service import get_api_key

        SecureStorageService._instance = None
        mock_keyring["get_password"].return_value = "test_value"

        result = await get_api_key("test_key")

        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_convenience_delete_api_key(self, mock_keyring):
        """Test convenience function for deleting API key."""
        from .secure_storage_service import delete_api_key

        SecureStorageService._instance = None
        await delete_api_key("test_key")

        mock_keyring["delete_password"].assert_called_once()

    @pytest.mark.asyncio
    async def test_convenience_has_api_key(self, mock_keyring):
        """Test convenience function for checking API key."""
        from .secure_storage_service import has_api_key

        SecureStorageService._instance = None
        mock_keyring["get_password"].return_value = "test_value"

        result = await has_api_key("test_key")

        assert result is True

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

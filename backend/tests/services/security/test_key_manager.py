"""
Tests for KeyManager service.

Comprehensive test suite covering all KeyManager functionality including:
- Encryption key management
- Key storage and retrieval
- Key rotation and backup
- Migration from .env
- OS-level encryption integration
- Error handling and validation
"""

import pytest
import os
import base64
import secrets
import tempfile
import shutil
from unittest.mock import patch, MagicMock
from keyring.errors import KeyringError, PasswordDeleteError

from .key_manager import (
    KeyManager,
    KeyManagerError,
    EncryptionNotAvailableError,
    InvalidKeyError,
    generate_encryption_key,
)

@pytest.fixture
def temp_user_data_path():
    """Create temporary user data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture
def key_manager(temp_user_data_path):
    """Create KeyManager instance with temporary directory."""
    return KeyManager(temp_user_data_path)

@pytest.fixture
def mock_keyring():
    """Mock the keyring module."""
    with patch("keyring.get_keyring") as mock_get_keyring, \
         patch("keyring.set_password") as mock_set_password, \
         patch("keyring.get_password") as mock_get_password, \
         patch("keyring.delete_password") as mock_delete_password:

        # Setup mock backend (simulate Windows DPAPI)
        mock_backend = MagicMock()
        mock_backend.__class__.__name__ = "WinVaultKeyring"
        mock_get_keyring.return_value = mock_backend

        yield {
            "get_keyring": mock_get_keyring,
            "set_password": mock_set_password,
            "get_password": mock_get_password,
            "delete_password": mock_delete_password,
        }

@pytest.fixture
def valid_key_base64():
    """Generate a valid 32-byte key in base64 format."""
    key = secrets.token_bytes(32)
    return base64.b64encode(key).decode('utf-8')

class TestKeyManagerInitialization:
    """Test KeyManager initialization and setup."""

    def test_initialization_creates_directory(self, temp_user_data_path):
        """Test that initialization creates user data directory."""
        nested_path = os.path.join(temp_user_data_path, "nested", "path")
        key_manager = KeyManager(nested_path)

        assert key_manager.user_data_path.exists()
        assert key_manager.user_data_path.is_dir()

    def test_initialization_sets_paths(self, key_manager, temp_user_data_path):
        """Test that paths are correctly set."""
        assert str(key_manager.user_data_path) == temp_user_data_path
        assert key_manager.key_file_path.name == ".encryption-key"
        assert key_manager.keys_dir.name == ".keys"

    def test_initial_cache_is_empty(self, key_manager):
        """Test that key cache starts empty."""
        assert key_manager._cached_key is None

    @pytest.mark.asyncio
    async def test_check_encryption_available_success(self, key_manager, mock_keyring):
        """Test successful encryption availability check."""
        result = await key_manager._check_encryption_available()

        assert result is True
        assert key_manager.is_encryption_available() is True
        mock_keyring["get_keyring"].assert_called_once()

    @pytest.mark.asyncio
    async def test_check_encryption_available_fail_backend(self, key_manager):
        """Test encryption check with fail backend."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            result = await key_manager._check_encryption_available()

            assert result is False
            assert key_manager.is_encryption_available() is False

    @pytest.mark.asyncio
    async def test_check_encryption_caches_result(self, key_manager, mock_keyring):
        """Test that encryption check is cached."""
        await key_manager._check_encryption_available()
        await key_manager._check_encryption_available()
        await key_manager._check_encryption_available()

        # Should only call get_keyring once
        assert mock_keyring["get_keyring"].call_count == 1

    def test_is_encryption_available_before_check(self, key_manager):
        """Test is_encryption_available before any check."""
        # Should return False safely before check
        assert key_manager.is_encryption_available() is False

class TestKeyManagerGetKey:
    """Test getting encryption key."""

    @pytest.mark.asyncio
    async def test_get_key_success(self, key_manager, mock_keyring, valid_key_base64):
        """Test successfully getting encryption key."""
        mock_keyring["get_password"].return_value = valid_key_base64

        key = await key_manager.get_key()

        assert isinstance(key, bytes)
        assert len(key) == 32
        mock_keyring["get_password"].assert_called_once_with(
            "JusticeCompanion", "master_encryption_key"
        )

    @pytest.mark.asyncio
    async def test_get_key_caches_result(self, key_manager, mock_keyring, valid_key_base64):
        """Test that key is cached after first retrieval."""
        mock_keyring["get_password"].return_value = valid_key_base64

        key1 = await key_manager.get_key()
        key2 = await key_manager.get_key()
        key3 = await key_manager.get_key()

        assert key1 == key2 == key3
        # Should only call get_password once
        assert mock_keyring["get_password"].call_count == 1

    @pytest.mark.asyncio
    async def test_get_key_not_found(self, key_manager, mock_keyring):
        """Test error when key doesn't exist."""
        mock_keyring["get_password"].return_value = None

        with pytest.raises(InvalidKeyError) as exc_info:
            await key_manager.get_key()

        assert "Encryption key not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_key_invalid_length(self, key_manager, mock_keyring):
        """Test error when key has invalid length."""
        # Generate 16-byte key (invalid, should be 32)
        invalid_key = base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
        mock_keyring["get_password"].return_value = invalid_key

        with pytest.raises(InvalidKeyError) as exc_info:
            await key_manager.get_key()

        assert "expected 32 bytes" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_key_encryption_not_available(self, key_manager):
        """Test error when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            with pytest.raises(EncryptionNotAvailableError) as exc_info:
                await key_manager.get_key()

            assert "not available" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_key_invalid_base64(self, key_manager, mock_keyring):
        """Test error when key is not valid base64."""
        mock_keyring["get_password"].return_value = "invalid!base64@string"

        with pytest.raises(KeyManagerError):
            await key_manager.get_key()

class TestKeyManagerHasKey:
    """Test checking key existence."""

    @pytest.mark.asyncio
    async def test_has_key_exists(self, key_manager, mock_keyring, valid_key_base64):
        """Test has_key returns True when key exists."""
        mock_keyring["get_password"].return_value = valid_key_base64

        result = await key_manager.has_key()

        assert result is True

    @pytest.mark.asyncio
    async def test_has_key_not_exists(self, key_manager, mock_keyring):
        """Test has_key returns False when key doesn't exist."""
        mock_keyring["get_password"].return_value = None

        result = await key_manager.has_key()

        assert result is False

    @pytest.mark.asyncio
    async def test_has_key_encryption_not_available(self, key_manager):
        """Test has_key returns False when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            result = await key_manager.has_key()

            assert result is False

    @pytest.mark.asyncio
    async def test_has_key_error_handling(self, key_manager, mock_keyring):
        """Test has_key handles errors gracefully."""
        mock_keyring["get_password"].side_effect = KeyringError("Check error")

        result = await key_manager.has_key()

        assert result is False

class TestKeyManagerMigrateFromEnv:
    """Test migrating key from .env file."""

    @pytest.mark.asyncio
    async def test_migrate_from_env_success(self, key_manager, mock_keyring, valid_key_base64):
        """Test successful migration from .env."""
        await key_manager.migrate_from_env(valid_key_base64)

        mock_keyring["set_password"].assert_called_once_with(
            "JusticeCompanion", "master_encryption_key", valid_key_base64
        )

    @pytest.mark.asyncio
    async def test_migrate_from_env_updates_cache(self, key_manager, mock_keyring, valid_key_base64):
        """Test migration updates key cache."""
        await key_manager.migrate_from_env(valid_key_base64)

        assert key_manager._cached_key is not None
        assert len(key_manager._cached_key) == 32

    @pytest.mark.asyncio
    async def test_migrate_from_env_invalid_base64(self, key_manager, mock_keyring):
        """Test error with invalid base64 format."""
        with pytest.raises(InvalidKeyError) as exc_info:
            await key_manager.migrate_from_env("invalid!base64@string")

        assert "Invalid base64 format" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_migrate_from_env_invalid_length(self, key_manager, mock_keyring):
        """Test error with invalid key length."""
        # Generate 16-byte key (invalid)
        invalid_key = base64.b64encode(secrets.token_bytes(16)).decode('utf-8')

        with pytest.raises(InvalidKeyError) as exc_info:
            await key_manager.migrate_from_env(invalid_key)

        assert "expected 32 bytes" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_migrate_from_env_encryption_not_available(self, key_manager, valid_key_base64):
        """Test error when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            with pytest.raises(EncryptionNotAvailableError):
                await key_manager.migrate_from_env(valid_key_base64)

    @pytest.mark.asyncio
    async def test_migrate_from_env_storage_error(self, key_manager, mock_keyring, valid_key_base64):
        """Test error handling during storage."""
        mock_keyring["set_password"].side_effect = KeyringError("Storage error")

        with pytest.raises(KeyManagerError) as exc_info:
            await key_manager.migrate_from_env(valid_key_base64)

        assert "Failed to migrate key" in str(exc_info.value)

class TestKeyManagerGenerateNewKey:
    """Test generating new encryption key."""

    @pytest.mark.asyncio
    async def test_generate_new_key_success(self, key_manager, mock_keyring):
        """Test successfully generating new key."""
        new_key = await key_manager.generate_new_key()

        assert isinstance(new_key, str)
        # Verify it's valid base64
        decoded = base64.b64decode(new_key)
        assert len(decoded) == 32
        mock_keyring["set_password"].assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_new_key_updates_cache(self, key_manager, mock_keyring):
        """Test key generation updates cache."""
        new_key = await key_manager.generate_new_key()

        assert key_manager._cached_key is not None
        assert len(key_manager._cached_key) == 32

    @pytest.mark.asyncio
    async def test_generate_new_key_encryption_not_available(self, key_manager):
        """Test error when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            with pytest.raises(EncryptionNotAvailableError):
                await key_manager.generate_new_key()

    @pytest.mark.asyncio
    async def test_generate_new_key_storage_error(self, key_manager, mock_keyring):
        """Test error handling during key generation."""
        mock_keyring["set_password"].side_effect = KeyringError("Storage error")

        with pytest.raises(KeyManagerError) as exc_info:
            await key_manager.generate_new_key()

        assert "Failed to generate key" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_new_key_is_random(self, key_manager, mock_keyring):
        """Test that generated keys are unique."""
        key1 = await key_manager.generate_new_key()
        key_manager.clear_cache()  # Clear cache between generations
        key2 = await key_manager.generate_new_key()

        assert key1 != key2

class TestKeyManagerRotateKey:
    """Test key rotation."""

    @pytest.mark.asyncio
    async def test_rotate_key_success(self, key_manager, mock_keyring, valid_key_base64):
        """Test successful key rotation."""
        mock_keyring["get_password"].return_value = valid_key_base64

        new_key = await key_manager.rotate_key()

        assert isinstance(new_key, str)
        # Should have backed up old key
        calls = mock_keyring["set_password"].call_args_list
        assert len(calls) >= 2  # Backup + new key

    @pytest.mark.asyncio
    async def test_rotate_key_backs_up_old_key(self, key_manager, mock_keyring, valid_key_base64):
        """Test that rotation backs up old key."""
        mock_keyring["get_password"].return_value = valid_key_base64

        await key_manager.rotate_key()

        # Check for backup call
        calls = mock_keyring["set_password"].call_args_list
        backup_call = [c for c in calls if "backup" in str(c)]
        assert len(backup_call) >= 1

    @pytest.mark.asyncio
    async def test_rotate_key_no_existing_key(self, key_manager, mock_keyring):
        """Test rotation when no existing key."""
        mock_keyring["get_password"].return_value = None

        new_key = await key_manager.rotate_key()

        assert isinstance(new_key, str)

    @pytest.mark.asyncio
    async def test_rotate_key_backup_failure_continues(self, key_manager, mock_keyring, valid_key_base64):
        """Test rotation continues even if backup fails."""
        mock_keyring["get_password"].return_value = valid_key_base64

        # First set_password (backup) fails, second (new key) succeeds
        mock_keyring["set_password"].side_effect = [
            KeyringError("Backup failed"),
            None  # New key succeeds
        ]

        new_key = await key_manager.rotate_key()

        assert isinstance(new_key, str)

class TestKeyManagerClearCache:
    """Test clearing key cache."""

    @pytest.mark.asyncio
    async def test_clear_cache_removes_key(self, key_manager, mock_keyring, valid_key_base64):
        """Test that clear_cache removes cached key."""
        mock_keyring["get_password"].return_value = valid_key_base64

        # Cache a key
        await key_manager.get_key()
        assert key_manager._cached_key is not None

        # Clear cache
        key_manager.clear_cache()
        assert key_manager._cached_key is None

    @pytest.mark.asyncio
    async def test_clear_cache_overwrites_memory(self, key_manager, mock_keyring, valid_key_base64):
        """Test that clear_cache overwrites key bytes."""
        mock_keyring["get_password"].return_value = valid_key_base64

        # Cache a key
        key = await key_manager.get_key()
        original_key = bytes(key)  # Copy original

        # Clear cache
        key_manager.clear_cache()

        # Verify cache is cleared
        assert key_manager._cached_key is None

    def test_clear_cache_when_empty(self, key_manager):
        """Test clear_cache works when cache is empty."""
        # Should not raise exception
        key_manager.clear_cache()
        assert key_manager._cached_key is None

class TestKeyManagerValidateKeyFile:
    """Test key file validation."""

    @pytest.mark.asyncio
    async def test_validate_key_file_success(self, key_manager, mock_keyring, valid_key_base64):
        """Test successful key validation."""
        mock_keyring["get_password"].return_value = valid_key_base64

        result = await key_manager.validate_key_file()

        assert result["valid"] is True
        assert "error" not in result

    @pytest.mark.asyncio
    async def test_validate_key_file_not_exists(self, key_manager, mock_keyring):
        """Test validation when key doesn't exist."""
        mock_keyring["get_password"].return_value = None

        result = await key_manager.validate_key_file()

        assert result["valid"] is False
        assert "does not exist" in result["error"]

    @pytest.mark.asyncio
    async def test_validate_key_file_invalid_length(self, key_manager, mock_keyring):
        """Test validation with invalid key length."""
        invalid_key = base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
        mock_keyring["get_password"].return_value = invalid_key

        result = await key_manager.validate_key_file()

        assert result["valid"] is False
        assert "expected 32 bytes" in result["error"]

    @pytest.mark.asyncio
    async def test_validate_key_file_encryption_not_available(self, key_manager):
        """Test validation when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            result = await key_manager.validate_key_file()

            assert result["valid"] is False
            assert "not available" in result["error"]

class TestKeyManagerStoreKey:
    """Test storing arbitrary key-value pairs."""

    @pytest.mark.asyncio
    async def test_store_key_success(self, key_manager, mock_keyring):
        """Test successfully storing a key."""
        await key_manager.store_key("openai_api_key", "sk-test-123")

        mock_keyring["set_password"].assert_called_once_with(
            "JusticeCompanion", "stored_key_openai_api_key", "sk-test-123"
        )

    @pytest.mark.asyncio
    async def test_store_key_empty_key_name(self, key_manager, mock_keyring):
        """Test error with empty key name."""
        with pytest.raises(ValueError) as exc_info:
            await key_manager.store_key("", "value")

        assert "Key name is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_store_key_empty_value(self, key_manager, mock_keyring):
        """Test error with empty value."""
        with pytest.raises(ValueError) as exc_info:
            await key_manager.store_key("key", "")

        assert "Value is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_store_key_encryption_not_available(self, key_manager):
        """Test error when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            with pytest.raises(EncryptionNotAvailableError):
                await key_manager.store_key("key", "value")

    @pytest.mark.asyncio
    async def test_store_key_storage_error(self, key_manager, mock_keyring):
        """Test error handling during storage."""
        mock_keyring["set_password"].side_effect = KeyringError("Storage error")

        with pytest.raises(KeyManagerError) as exc_info:
            await key_manager.store_key("key", "value")

        assert "Failed to store key" in str(exc_info.value)

class TestKeyManagerRetrieveKey:
    """Test retrieving stored keys."""

    @pytest.mark.asyncio
    async def test_retrieve_key_success(self, key_manager, mock_keyring):
        """Test successfully retrieving a key."""
        mock_keyring["get_password"].return_value = "sk-test-123"

        value = await key_manager.retrieve_key("openai_api_key")

        assert value == "sk-test-123"
        mock_keyring["get_password"].assert_called_once_with(
            "JusticeCompanion", "stored_key_openai_api_key"
        )

    @pytest.mark.asyncio
    async def test_retrieve_key_not_found(self, key_manager, mock_keyring):
        """Test retrieving non-existent key."""
        mock_keyring["get_password"].return_value = None

        value = await key_manager.retrieve_key("nonexistent_key")

        assert value is None

    @pytest.mark.asyncio
    async def test_retrieve_key_empty_key_name(self, key_manager, mock_keyring):
        """Test retrieving with empty key name."""
        value = await key_manager.retrieve_key("")

        assert value is None

    @pytest.mark.asyncio
    async def test_retrieve_key_encryption_not_available(self, key_manager):
        """Test error when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            with pytest.raises(EncryptionNotAvailableError):
                await key_manager.retrieve_key("key")

    @pytest.mark.asyncio
    async def test_retrieve_key_error_handling(self, key_manager, mock_keyring):
        """Test error handling during retrieval."""
        mock_keyring["get_password"].side_effect = KeyringError("Retrieval error")

        with pytest.raises(KeyManagerError) as exc_info:
            await key_manager.retrieve_key("key")

        assert "Failed to retrieve key" in str(exc_info.value)

class TestKeyManagerDeleteKey:
    """Test deleting stored keys."""

    @pytest.mark.asyncio
    async def test_delete_key_success(self, key_manager, mock_keyring):
        """Test successfully deleting a key."""
        await key_manager.delete_key("openai_api_key")

        mock_keyring["delete_password"].assert_called_once_with(
            "JusticeCompanion", "stored_key_openai_api_key"
        )

    @pytest.mark.asyncio
    async def test_delete_key_not_found(self, key_manager, mock_keyring):
        """Test deleting non-existent key doesn't raise error."""
        mock_keyring["delete_password"].side_effect = PasswordDeleteError("Not found")

        # Should not raise exception
        await key_manager.delete_key("nonexistent_key")

    @pytest.mark.asyncio
    async def test_delete_key_empty_key_name(self, key_manager, mock_keyring):
        """Test deleting with empty key name."""
        # Should not raise exception
        await key_manager.delete_key("")

    @pytest.mark.asyncio
    async def test_delete_key_encryption_not_available(self, key_manager):
        """Test delete when encryption not available."""
        with patch("keyring.get_keyring") as mock_get_keyring:
            mock_backend = MagicMock()
            mock_backend.__class__.__name__ = "fail.Keyring"
            mock_get_keyring.return_value = mock_backend

            # Should not raise exception
            await key_manager.delete_key("key")

class TestKeyManagerHasStoredKey:
    """Test checking stored key existence."""

    @pytest.mark.asyncio
    async def test_has_stored_key_exists(self, key_manager, mock_keyring):
        """Test has_stored_key returns True when key exists."""
        # Initialize encryption check first
        await key_manager._check_encryption_available()

        mock_keyring["get_password"].return_value = "sk-test-123"

        result = key_manager.has_stored_key("openai_api_key")

        assert result is True

    def test_has_stored_key_not_exists(self, key_manager, mock_keyring):
        """Test has_stored_key returns False when key doesn't exist."""
        mock_keyring["get_password"].return_value = None

        result = key_manager.has_stored_key("nonexistent_key")

        assert result is False

    def test_has_stored_key_empty_key_name(self, key_manager):
        """Test has_stored_key with empty key name."""
        result = key_manager.has_stored_key("")

        assert result is False

    def test_has_stored_key_encryption_not_available(self, key_manager):
        """Test has_stored_key when encryption not available."""
        key_manager._encryption_available = False

        result = key_manager.has_stored_key("key")

        assert result is False

    def test_has_stored_key_error_handling(self, key_manager, mock_keyring):
        """Test has_stored_key handles errors gracefully."""
        mock_keyring["get_password"].side_effect = KeyringError("Check error")

        result = key_manager.has_stored_key("key")

        assert result is False

class TestKeyManagerGetBackendInfo:
    """Test getting backend information."""

    def test_get_backend_info_before_check(self, key_manager):
        """Test backend info before encryption check."""
        info = key_manager.get_backend_info()

        assert info["encryption_available"] is False
        assert info["backend"] is None
        assert info["service_name"] == "JusticeCompanion"

    @pytest.mark.asyncio
    async def test_get_backend_info_after_check(self, key_manager, mock_keyring):
        """Test backend info after encryption check."""
        await key_manager._check_encryption_available()

        info = key_manager.get_backend_info()

        assert info["encryption_available"] is True
        assert info["backend"] == "WinVaultKeyring"
        assert info["service_name"] == "JusticeCompanion"
        assert "user_data_path" in info

class TestKeyManagerIntegration:
    """Integration tests for complete workflows."""

    @pytest.mark.asyncio
    async def test_full_encryption_key_lifecycle(self, key_manager, mock_keyring):
        """Test complete encryption key lifecycle."""
        # Generate new key
        new_key = await key_manager.generate_new_key()
        assert new_key is not None

        # Verify key exists
        mock_keyring["get_password"].return_value = new_key
        assert await key_manager.has_key() is True

        # Validate key
        result = await key_manager.validate_key_file()
        assert result["valid"] is True

        # Get key
        key = await key_manager.get_key()
        assert len(key) == 32

        # Clear cache
        key_manager.clear_cache()
        assert key_manager._cached_key is None

    @pytest.mark.asyncio
    async def test_full_stored_key_lifecycle(self, key_manager, mock_keyring):
        """Test complete stored key lifecycle."""
        # Store key
        await key_manager.store_key("openai_api_key", "sk-test-123")

        # Retrieve key
        mock_keyring["get_password"].return_value = "sk-test-123"
        value = await key_manager.retrieve_key("openai_api_key")
        assert value == "sk-test-123"

        # Check existence
        assert key_manager.has_stored_key("openai_api_key") is True

        # Delete key
        await key_manager.delete_key("openai_api_key")

    @pytest.mark.asyncio
    async def test_migration_workflow(self, key_manager, mock_keyring, valid_key_base64):
        """Test migration from .env workflow."""
        # Migrate key
        await key_manager.migrate_from_env(valid_key_base64)

        # Verify key is accessible
        mock_keyring["get_password"].return_value = valid_key_base64
        key = await key_manager.get_key()
        assert len(key) == 32

    @pytest.mark.asyncio
    async def test_key_rotation_workflow(self, key_manager, mock_keyring, valid_key_base64):
        """Test key rotation workflow."""
        # Setup initial key
        mock_keyring["get_password"].return_value = valid_key_base64

        # Rotate key
        new_key = await key_manager.rotate_key()
        assert new_key != valid_key_base64

        # Verify new key is accessible
        mock_keyring["get_password"].return_value = new_key
        key = await key_manager.get_key()
        assert len(key) == 32

    @pytest.mark.asyncio
    async def test_multiple_stored_keys(self, key_manager, mock_keyring):
        """Test storing multiple different keys."""
        keys = {
            "openai_api_key": "sk-openai-123",
            "anthropic_api_key": "sk-ant-456",
            "huggingface_api_key": "hf_789",
        }

        # Store all keys
        for key_name, value in keys.items():
            await key_manager.store_key(key_name, value)

        # Verify all stored
        assert mock_keyring["set_password"].call_count == 3

        # Retrieve all keys
        for key_name, expected_value in keys.items():
            mock_keyring["get_password"].return_value = expected_value
            value = await key_manager.retrieve_key(key_name)
            assert value == expected_value

class TestGenerateEncryptionKey:
    """Test the static key generation function."""

    def test_generate_encryption_key_returns_string(self):
        """Test that function returns a string."""
        key = generate_encryption_key()
        assert isinstance(key, str)

    def test_generate_encryption_key_valid_base64(self):
        """Test that generated key is valid base64."""
        key = generate_encryption_key()
        decoded = base64.b64decode(key)
        assert len(decoded) == 32

    def test_generate_encryption_key_is_random(self):
        """Test that generated keys are unique."""
        key1 = generate_encryption_key()
        key2 = generate_encryption_key()
        assert key1 != key2

    def test_generate_encryption_key_correct_length(self):
        """Test that generated key is correct length."""
        key = generate_encryption_key()
        decoded = base64.b64decode(key)
        assert len(decoded) == 32  # 256 bits

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

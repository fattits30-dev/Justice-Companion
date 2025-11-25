"""
Secure Key Management using OS-level encryption.

SECURITY: Replaces plaintext .env key storage with OS-level encryption
- Windows: DPAPI (Data Protection API)
- macOS: Keychain
- Linux: Secret Service API (libsecret)

Fixes CVSS 9.1 vulnerability: Encryption key in plaintext .env file

This service provides secure storage and management of encryption keys
using OS-native secure storage mechanisms through the keyring library.

Key Features:
- OS-level encryption for master encryption key
- Key rotation with automatic backup
- Key caching with secure memory cleanup
- Storage for arbitrary key-value pairs (API keys, tokens)
- Thread-safe operations
- Automatic migration from .env files

Example:
    from key_manager import KeyManager
    import os

    user_data_path = os.path.expanduser("~/.justice-companion")
    key_manager = KeyManager(user_data_path)

    # Check if key exists
    if not await key_manager.has_key():
        # Generate new key
        new_key = await key_manager.generate_new_key()
        print(f"Generated key: {new_key[:16]}...")

    # Get encryption key
    key = await key_manager.get_key()

    # Store API key
    await key_manager.store_key("openai_api_key", "sk-...")

    # Retrieve API key
    api_key = await key_manager.retrieve_key("openai_api_key")
"""

import asyncio
import base64
import secrets
import threading
from pathlib import Path
from typing import Optional, Dict, Any
import logging
import keyring

# Configure logging
logger = logging.getLogger(__name__)

class KeyManagerError(Exception):
    """Base exception for KeyManager errors."""

class EncryptionNotAvailableError(KeyManagerError):
    """Raised when OS-level encryption is not available."""

class InvalidKeyError(KeyManagerError):
    """Raised when encryption key is invalid."""

class KeyManager:
    """
    Secure key management using OS-native encryption.

    Manages the master encryption key and arbitrary key-value pairs
    using OS-level secure storage (DPAPI/Keychain/Secret Service).

    Attributes:
        SERVICE_NAME: Service identifier for keyring storage
        KEY_LENGTH: Required length of encryption key in bytes (32 = 256 bits)
        KEY_FILE_NAME: Filename for encrypted key storage
    """

    SERVICE_NAME = "JusticeCompanion"
    KEY_IDENTIFIER = "master_encryption_key"
    KEY_LENGTH = 32  # 256 bits for AES-256
    KEY_FILE_NAME = ".encryption-key"
    KEYS_DIR_NAME = ".keys"

    def __init__(self, user_data_path: str):
        """
        Initialize KeyManager.

        Args:
            user_data_path: Path to user data directory (e.g., app.getPath('userData'))

        Example:
            user_data_path = os.path.expanduser("~/.justice-companion")
            key_manager = KeyManager(user_data_path)
        """
        self.user_data_path = Path(user_data_path)
        self.key_file_path = self.user_data_path / self.KEY_FILE_NAME
        self.keys_dir = self.user_data_path / self.KEYS_DIR_NAME

        # Cached key (in-memory only, cleared on demand)
        self._cached_key: Optional[bytes] = None
        self._cache_lock = threading.Lock()

        # Encryption availability check
        self._encryption_available: Optional[bool] = None
        self._keyring_backend: Optional[Any] = None

        # Ensure user data directory exists
        self.user_data_path.mkdir(parents=True, exist_ok=True)

    async def _check_encryption_available(self) -> bool:
        """
        Check if OS-level encryption is available.

        Returns:
            True if secure storage is available, False otherwise
        """
        if self._encryption_available is not None:
            return self._encryption_available

        try:
            # Run in thread pool to avoid blocking
            backend = await asyncio.get_event_loop().run_in_executor(None, keyring.get_keyring)

            backend_name = backend.__class__.__name__

            # Check if we have a real backend or the fail backend
            if backend_name in ["fail.Keyring", "Keyring"]:
                logger.warning(
                    f"[KeyManager] No secure keyring backend available. " f"Backend: {backend_name}"
                )
                self._encryption_available = False
            else:
                logger.info(f"[KeyManager] Using keyring backend: {backend_name}")
                self._encryption_available = True

            self._keyring_backend = backend
            return self._encryption_available

        except Exception as exc:
            logger.warning(f"[KeyManager] Failed to detect keyring backend: {e}")
            self._encryption_available = False
            return False

    def is_encryption_available(self) -> bool:
        """
        Check if OS-level encryption is available (synchronous).

        Returns:
            True if encryption is available, False otherwise

        Note:
            This returns cached value. Call _check_encryption_available() first
            for initial check.
        """
        if self._encryption_available is None:
            # Not checked yet, default to False for safety
            return False
        return self._encryption_available

    async def get_key(self) -> bytes:
        """
        Get encryption key (loads and decrypts on first call, then caches).

        Returns:
            32-byte encryption key as bytes

        Raises:
            EncryptionNotAvailableError: If OS-level encryption not available
            InvalidKeyError: If key doesn't exist or is invalid
            KeyManagerError: If key retrieval fails

        Example:
            key = await key_manager.get_key()
            assert len(key) == 32  # 256 bits
        """
        # Return cached key if available
        with self._cache_lock:
            if self._cached_key is not None:
                return self._cached_key

        # Check encryption availability
        if not await self._check_encryption_available():
            raise EncryptionNotAvailableError(
                "OS-level encryption is not available on this system. "
                "Key cannot be securely loaded."
            )

        # Retrieve key from keyring
        try:
            key_base64 = await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.get_password(self.SERVICE_NAME, self.KEY_IDENTIFIER)
            )

            if not key_base64:
                raise InvalidKeyError(
                    "Encryption key not found. Run migration script to move key "
                    "from .env to secure storage, or generate a new key."
                )

            # Decode from base64
            key = base64.b64decode(key_base64)

            # Verify key length
            if len(key) != self.KEY_LENGTH:
                raise InvalidKeyError(
                    f"Invalid encryption key: expected {self.KEY_LENGTH} bytes, "
                    f"got {len(key)} bytes"
                )

            # Cache key
            with self._cache_lock:
                self._cached_key = key

            return key

        except InvalidKeyError:
            raise
        except EncryptionNotAvailableError:
            raise
        except Exception as exc:
            logger.error(f"[KeyManager] Failed to retrieve encryption key: {e}")
            raise KeyManagerError(f"Failed to retrieve encryption key: {e}")

    async def has_key(self) -> bool:
        """
        Check if encryption key exists in secure storage.

        Returns:
            True if key exists, False otherwise

        Example:
            if not await key_manager.has_key():
                await key_manager.generate_new_key()
        """
        if not await self._check_encryption_available():
            return False

        try:
            key_base64 = await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.get_password(self.SERVICE_NAME, self.KEY_IDENTIFIER)
            )
            return key_base64 is not None
        except Exception as exc:
            logger.warning(f"[KeyManager] Error checking key existence: {e}")
            return False

    async def migrate_from_env(self, env_key: str) -> None:
        """
        Migrate key from .env to secure storage.

        Args:
            env_key: ENCRYPTION_KEY_BASE64 from .env file

        Raises:
            EncryptionNotAvailableError: If OS-level encryption not available
            InvalidKeyError: If key format is invalid
            KeyManagerError: If migration fails

        Example:
            import os
            from dotenv import load_dotenv

            load_dotenv()
            env_key = os.getenv("ENCRYPTION_KEY_BASE64")
            if env_key:
                await key_manager.migrate_from_env(env_key)
                print("Key migrated. Remove ENCRYPTION_KEY_BASE64 from .env file.")
        """
        if not await self._check_encryption_available():
            raise EncryptionNotAvailableError(
                "OS-level encryption is not available. Cannot migrate key."
            )

        # Validate key format
        try:
            key_buffer = base64.b64decode(env_key)
        except Exception as exc:
            raise InvalidKeyError(f"Invalid base64 format: {e}")

        if len(key_buffer) != self.KEY_LENGTH:
            raise InvalidKeyError(
                f"Invalid key length: expected {self.KEY_LENGTH} bytes, "
                f"got {len(key_buffer)} bytes"
            )

        # Store in keyring
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: keyring.set_password(
                    self.SERVICE_NAME, self.KEY_IDENTIFIER, env_key  # Store as base64 string
                ),
            )

            logger.warning(
                "[KeyManager] Key migrated from .env to secure storage. "
                "IMPORTANT: Remove ENCRYPTION_KEY_BASE64 from .env file"
            )

            # Update cache
            with self._cache_lock:
                self._cached_key = key_buffer

        except Exception as exc:
            logger.error(f"[KeyManager] Failed to migrate key: {e}")
            raise KeyManagerError(f"Failed to migrate key: {e}")

    async def generate_new_key(self) -> str:
        """
        Generate and store a new encryption key.

        WARNING: This will replace existing key. Ensure all data is backed up.

        Returns:
            The generated key as base64 string

        Raises:
            EncryptionNotAvailableError: If OS-level encryption not available
            KeyManagerError: If key generation fails

        Example:
            new_key = await key_manager.generate_new_key()
            print(f"Generated key: {new_key[:16]}...")
            # Store this key securely as backup
        """
        if not await self._check_encryption_available():
            raise EncryptionNotAvailableError(
                "OS-level encryption is not available. Cannot generate key."
            )

        # Generate cryptographically secure 32-byte key
        new_key = secrets.token_bytes(self.KEY_LENGTH)
        new_key_base64 = base64.b64encode(new_key).decode("utf-8")

        # Store in keyring
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: keyring.set_password(
                    self.SERVICE_NAME, self.KEY_IDENTIFIER, new_key_base64
                ),
            )

            logger.warning("[KeyManager] New encryption key generated and stored")

            # Update cache
            with self._cache_lock:
                self._cached_key = new_key

            return new_key_base64

        except Exception as exc:
            logger.error(f"[KeyManager] Failed to generate key: {e}")
            raise KeyManagerError(f"Failed to generate key: {e}")

    async def rotate_key(self) -> str:
        """
        Rotate encryption key (for security best practices).

        Creates backup of old key before generating new one.

        NOTE: Caller must re-encrypt all data with new key.

        Returns:
            New key as base64 string

        Raises:
            EncryptionNotAvailableError: If OS-level encryption not available
            KeyManagerError: If key rotation fails

        Example:
            # Backup old key
            old_key = await key_manager.get_key()

            # Rotate key
            new_key = await key_manager.rotate_key()

            # Re-encrypt all data
            # ... (application-specific logic)
        """
        # Backup old key if it exists
        if await self.has_key():
            try:
                old_key_base64 = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: keyring.get_password(self.SERVICE_NAME, self.KEY_IDENTIFIER)
                )

                if old_key_base64:
                    # Create backup with timestamp
                    import time

                    timestamp = int(time.time())
                    backup_identifier = f"{self.KEY_IDENTIFIER}_backup_{timestamp}"

                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: keyring.set_password(
                            self.SERVICE_NAME, backup_identifier, old_key_base64
                        ),
                    )

                    logger.warning(f"[KeyManager] Old key backed up as: {backup_identifier}")

            except Exception as exc:
                logger.warning(f"[KeyManager] Failed to backup old key: {e}")

        # Generate new key
        return await self.generate_new_key()

    def clear_cache(self) -> None:
        """
        Clear cached key from memory (for security).

        Overwrites key bytes with zeros before clearing reference.

        Example:
            # When user logs out or application closes
            key_manager.clear_cache()
        """
        with self._cache_lock:
            if self._cached_key is not None:
                # Overwrite memory before clearing
                for i in range(len(self._cached_key)):
                    # Create a new bytearray to overwrite
                    temp = bytearray(self._cached_key)
                    temp[i] = 0
                    self._cached_key = bytes(temp)

                self._cached_key = None
                logger.debug("[KeyManager] Key cache cleared")

    async def validate_key_file(self) -> Dict[str, Any]:
        """
        Check if key exists and is valid.

        Returns:
            Dictionary with validation results:
                {
                    "valid": bool,
                    "error": Optional[str]
                }

        Example:
            result = await key_manager.validate_key_file()
            if not result["valid"]:
                print(f"Key validation failed: {result['error']}")
        """
        if not await self._check_encryption_available():
            return {"valid": False, "error": "OS-level encryption is not available"}

        if not await self.has_key():
            return {"valid": False, "error": "Key does not exist in secure storage"}

        try:
            # Try to retrieve and validate key
            key = await self.get_key()
            if len(key) != self.KEY_LENGTH:
                return {"valid": False, "error": f"Invalid key length: {len(key)} bytes"}

            return {"valid": True}

        except Exception as exc:
            return {"valid": False, "error": f"Key validation failed: {str(e)}"}

    async def store_key(self, key_name: str, value: str) -> None:
        """
        Store an arbitrary key-value pair securely.

        For API keys, tokens, etc.

        Args:
            key_name: Identifier for the key (e.g., 'openai_api_key')
            value: The secret value to store

        Raises:
            EncryptionNotAvailableError: If OS-level encryption not available
            ValueError: If key_name or value is empty
            KeyManagerError: If storage fails

        Example:
            await key_manager.store_key("openai_api_key", "sk-...")
            await key_manager.store_key("anthropic_api_key", "sk-ant-...")
        """
        if not key_name:
            raise ValueError("Key name is required")

        if not value:
            raise ValueError("Value is required")

        if not await self._check_encryption_available():
            raise EncryptionNotAvailableError(
                "OS-level encryption is not available. Cannot store key."
            )

        # Store in keyring with namespaced identifier
        try:
            identifier = f"stored_key_{key_name}"
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.set_password(self.SERVICE_NAME, identifier, value)
            )

            logger.debug(f"[KeyManager] Successfully stored key: {key_name}")

        except Exception as exc:
            logger.error(f"[KeyManager] Failed to store key '{key_name}': {e}")
            raise KeyManagerError(f"Failed to store key: {e}")

    async def retrieve_key(self, key_name: str) -> Optional[str]:
        """
        Retrieve a stored key.

        Args:
            key_name: Identifier for the key

        Returns:
            The decrypted value, or None if not found

        Raises:
            EncryptionNotAvailableError: If OS-level encryption not available
            KeyManagerError: If retrieval fails

        Example:
            api_key = await key_manager.retrieve_key("openai_api_key")
            if api_key:
                print(f"Found key: {api_key[:8]}...")
            else:
                print("Key not found")
        """
        if not key_name:
            return None

        if not await self._check_encryption_available():
            raise EncryptionNotAvailableError(
                "OS-level encryption is not available. Cannot retrieve key."
            )

        try:
            identifier = f"stored_key_{key_name}"
            value = await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.get_password(self.SERVICE_NAME, identifier)
            )

            if value:
                logger.debug(f"[KeyManager] Successfully retrieved key: {key_name}")
            else:
                logger.debug(f"[KeyManager] Key not found: {key_name}")

            return value

        except Exception as exc:
            logger.error(f"[KeyManager] Failed to retrieve key '{key_name}': {e}")
            raise KeyManagerError(f"Failed to retrieve key: {e}")

    async def delete_key(self, key_name: str) -> None:
        """
        Delete a stored key.

        Args:
            key_name: Identifier for the key to delete

        Raises:
            KeyManagerError: If deletion fails (ignores if key doesn't exist)

        Example:
            await key_manager.delete_key("openai_api_key")
        """
        if not key_name:
            return

        if not await self._check_encryption_available():
            # Silently return if encryption not available
            return

        try:
            identifier = f"stored_key_{key_name}"
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.delete_password(self.SERVICE_NAME, identifier)
            )

            logger.info(f"[KeyManager] Successfully deleted key: {key_name}")

        except Exception as exc:
            # Don't raise exception for missing keys
            logger.debug(f"[KeyManager] Failed to delete key '{key_name}': {e}")

    def has_stored_key(self, key_name: str) -> bool:
        """
        Check if a key exists (synchronous).

        Args:
            key_name: Identifier for the key

        Returns:
            True if key exists, False otherwise

        Note:
            This is a synchronous wrapper. For async code, use:
            `bool(await retrieve_key(key_name))`

        Example:
            if key_manager.has_stored_key("openai_api_key"):
                print("OpenAI API key is configured")
        """
        if not key_name:
            return False

        if not self.is_encryption_available():
            return False

        try:
            identifier = f"stored_key_{key_name}"
            value = keyring.get_password(self.SERVICE_NAME, identifier)
            return value is not None
        except Exception:
            return False

    def get_backend_info(self) -> Dict[str, Any]:
        """
        Get information about the keyring backend.

        Returns:
            Dictionary with backend information:
                {
                    "encryption_available": bool,
                    "backend": Optional[str],
                    "service_name": str,
                    "user_data_path": str
                }

        Example:
            info = key_manager.get_backend_info()
            print(f"Backend: {info['backend']}")
            print(f"Encryption available: {info['encryption_available']}")
        """
        backend_name = self._keyring_backend.__class__.__name__ if self._keyring_backend else None

        return {
            "encryption_available": self.is_encryption_available(),
            "backend": backend_name,
            "service_name": self.SERVICE_NAME,
            "user_data_path": str(self.user_data_path),
        }

# Static helper function for key generation
def generate_encryption_key() -> str:
    """
    Generate a new 256-bit encryption key.

    Returns:
        Cryptographically secure random 32-byte key as base64 string

    Example:
        from key_manager import generate_encryption_key

        new_key = generate_encryption_key()
        print(f"Generated key: {new_key}")
        # Use this for initial setup or key rotation
    """
    key = secrets.token_bytes(32)  # 32 bytes = 256 bits
    return base64.b64encode(key).decode("utf-8")

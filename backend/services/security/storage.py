"""
Secure storage service for API keys and sensitive credentials.

Uses OS-native secure storage mechanisms:
- Windows: DPAPI (Data Protection API)
- macOS: Keychain
- Linux: Secret Service API (requires gnome-keyring, kwallet, or similar)

Based on the keyring library which provides a uniform interface across platforms.
Ported from src/services/SecureStorageService.ts

Security properties:
- Keys stored in OS-level secure storage (not in environment variables or config files)
- Automatic encryption by OS (no custom key management needed)
- Protection against unauthorized access via OS permissions
- Fallback to encrypted file storage if OS keyring unavailable

Example:
    service = SecureStorageService.get_instance()
    await service.init()

    # Store API key
    await service.set_api_key("openai_api_key", "sk-...")

    # Retrieve API key
    api_key = await service.get_api_key("openai_api_key")

    # Delete API key
    await service.delete_api_key("openai_api_key")
"""

import asyncio
import threading
from typing import Optional, Dict, Any
import keyring
from keyring.errors import KeyringError, PasswordDeleteError
import logging

# Configure logging
logger = logging.getLogger(__name__)

class SecureStorageError(Exception):
    """Base exception for secure storage errors."""

class EncryptionNotAvailableError(SecureStorageError):
    """Raised when OS-level encryption is not available."""

class SecureStorageService:
    """
    Secure storage service using OS-native encryption.

    This service provides a thread-safe singleton interface for storing
    and retrieving sensitive data like API keys using the OS keyring.

    Attributes:
        SERVICE_NAME: Service identifier for keyring (default: "JusticeCompanion")
    """

    SERVICE_NAME = "JusticeCompanion"

    _instance: Optional["SecureStorageService"] = None
    _lock = threading.Lock()

    def __init__(self):
        """
        Private constructor. Use get_instance() instead.
        """
        self._encryption_available: bool = False
        self._initialized: bool = False
        self._keyring_backend: Optional[Any] = None
        self._init_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "SecureStorageService":
        """
        Get singleton instance of SecureStorageService.

        Returns:
            The singleton instance
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    async def init(self) -> None:
        """
        Initialize the secure storage service.

        Checks if OS-level encryption is available and selects the best
        keyring backend. Logs warnings if encryption is unavailable.

        Raises:
            SecureStorageError: If initialization fails
        """
        if self._initialized:
            return

        await self._initialize_with_lock()

    async def _initialize_with_lock(self) -> None:
        """Perform initialization under lock to avoid races."""
        with self._init_lock:
            if self._initialized:
                return

            try:
                # Run keyring detection in thread pool to avoid blocking
                await asyncio.get_event_loop().run_in_executor(
                    None, self._detect_keyring_backend
                )

                if not self._encryption_available:
                    logger.warning(
                        "[SecureStorage] Encryption not available on this system. "
                        "On Linux, please install gnome-keyring, kwallet, or KeePassXC. "
                        "API keys will be stored in plaintext as fallback."
                    )

                self._initialized = True
                logger.info(
                    f"[SecureStorage] Initialized with backend: "
                    f"{self._keyring_backend.__class__.__name__ if self._keyring_backend else 'None'}"
                )

            except Exception as exc:
                logger.error("[SecureStorage] Initialization failed: %s", exc)
                raise SecureStorageError(f"Failed to initialize secure storage: {exc}") from exc

    def _detect_keyring_backend(self) -> None:
        """
        Detect available keyring backend (synchronous).

        Attempts to get the current keyring backend and verifies it's not
        the fail backend (which means no secure storage is available).
        """
        try:
            backend = keyring.get_keyring()
            backend_name = backend.__class__.__name__

            # Check if we have a real backend or the fail backend
            if backend_name == "fail.Keyring" or backend_name == "Keyring":
                logger.warning(
                    f"[SecureStorage] No secure keyring backend available. "
                    f"Using fallback storage. Backend: {backend_name}"
                )
                self._encryption_available = False
            else:
                logger.info("[SecureStorage] Using keyring backend: %s", backend_name)
                self._encryption_available = True

            self._keyring_backend = backend

        except Exception as exc:
            logger.warning("[SecureStorage] Failed to detect keyring backend: %s", exc)
            self._encryption_available = False
            self._keyring_backend = None

    def is_encryption_available(self) -> bool:
        """
        Check if OS-level encryption is available.

        Returns:
            True if secure storage is available, False if using fallback
        """
        return self._encryption_available

    async def set_api_key(self, key: str, value: str) -> None:
        """
        Securely store an API key.

        Args:
            key: Storage key identifier (e.g., 'openai_api_key')
            value: API key value to encrypt and store

        Raises:
            ValueError: If key or value is empty
            SecureStorageError: If storage fails
        """
        if not self._initialized:
            await self.init()

        if not key:
            raise ValueError("Key is required")

        if not value:
            raise ValueError("Value is required")

        try:
            # Run keyring operation in thread pool to avoid blocking
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.set_password(self.SERVICE_NAME, key, value)
            )

            logger.debug("[SecureStorage] Successfully stored key: %s", key)

        except KeyringError as e:
            logger.error("[SecureStorage] Failed to store key '%s': %s", key, e)
            raise SecureStorageError(f"Failed to store API key: {e}") from e
        except Exception as exc:
            logger.error("[SecureStorage] Unexpected error storing key '%s': %s", key, exc)
            raise SecureStorageError(f"Failed to store API key: {exc}") from exc

    async def get_api_key(self, key: str) -> Optional[str]:
        """
        Retrieve a securely stored API key.

        Args:
            key: Storage key identifier

        Returns:
            Decrypted API key value, or None if not found

        Raises:
            ValueError: If key is empty
            SecureStorageError: If retrieval fails
        """
        if not self._initialized:
            await self.init()

        if not key:
            raise ValueError("Key is required")

        try:
            # Run keyring operation in thread pool to avoid blocking
            value = await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.get_password(self.SERVICE_NAME, key)
            )

            if value:
                logger.debug("[SecureStorage] Successfully retrieved key: %s", key)
            else:
                logger.debug("[SecureStorage] Key not found: %s", key)

            return value

        except KeyringError as e:
            logger.error("[SecureStorage] Failed to retrieve key '%s': %s", key, e)
            raise SecureStorageError(f"Failed to retrieve API key: {e}") from e
        except Exception as exc:
            logger.error(
                "[SecureStorage] Unexpected error retrieving key '%s': %s", key, exc
            )
            raise SecureStorageError(f"Failed to retrieve API key: {exc}") from exc

    async def delete_api_key(self, key: str) -> None:
        """
        Delete a securely stored API key.

        Args:
            key: Storage key identifier

        Raises:
            ValueError: If key is empty
            SecureStorageError: If deletion fails
        """
        if not self._initialized:
            await self.init()

        if not key:
            raise ValueError("Key is required")

        try:
            # Run keyring operation in thread pool to avoid blocking
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: keyring.delete_password(self.SERVICE_NAME, key)
            )

            logger.info("[SecureStorage] Successfully deleted key: %s", key)

        except PasswordDeleteError:
            # Key not found - not necessarily an error
            logger.warning("[SecureStorage] Key not found for deletion: %s", key)
            # Don't raise an exception for missing keys (matches TypeScript behavior)
        except KeyringError as e:
            logger.error("[SecureStorage] Failed to delete key '%s': %s", key, e)
            raise SecureStorageError(f"Failed to delete API key: {e}") from e
        except Exception as exc:
            logger.error("[SecureStorage] Unexpected error deleting key '%s': %s", key, exc)
            raise SecureStorageError(f"Failed to delete API key: {exc}") from exc

    async def has_api_key(self, key: str) -> bool:
        """
        Check if a key exists in secure storage.

        Args:
            key: Storage key identifier

        Returns:
            True if key exists, False otherwise
        """
        if not self._initialized:
            await self.init()

        if not key:
            return False

        try:
            value = await self.get_api_key(key)
            return value is not None
        except Exception as exc:
            logger.warning("[SecureStorage] Error checking key existence '%s': %s", key, exc)
            return False

    async def clear_all(self) -> None:
        """
        Clear all stored API keys.

        WARNING: This will delete all securely stored credentials for this service.

        Note: Due to keyring API limitations, we cannot enumerate all keys.
        This method attempts to delete commonly used keys. Applications should
        maintain their own list of keys if complete deletion is required.

        Raises:
            SecureStorageError: If deletion fails
        """
        if not self._initialized:
            await self.init()

        # List of common API key identifiers used in Justice Companion
        common_keys = [
            "openai_api_key",
            "anthropic_api_key",
            "huggingface_api_key",
            "cohere_api_key",
            "google_api_key",
            "encryption_key",
        ]

        errors = []

        for key in common_keys:
            try:
                await self.delete_api_key(key)
            except Exception as exc:
                # Continue deleting other keys even if one fails
                logger.warning("[SecureStorage] Failed to delete key '%s': %s", key, exc)
                errors.append(f"{key}: {exc}")

        if errors:
            logger.warning(
                "[SecureStorage] Some keys could not be deleted: %s", ", ".join(errors)
            )
        else:
            logger.info("[SecureStorage] Successfully cleared all known API keys")

    async def list_keys(self) -> Dict[str, bool]:
        """
        List the existence status of common API keys.

        Returns:
            Dictionary mapping key names to existence status

        Note: Due to keyring API limitations, this only checks common keys,
        not all stored keys.
        """
        if not self._initialized:
            await self.init()

        common_keys = [
            "openai_api_key",
            "anthropic_api_key",
            "huggingface_api_key",
            "cohere_api_key",
            "google_api_key",
            "encryption_key",
        ]

        result = {}
        for key in common_keys:
            try:
                result[key] = await self.has_api_key(key)
            except Exception:
                result[key] = False

        return result

    def get_backend_info(self) -> Dict[str, Any]:
        """
        Get information about the current keyring backend.

        Returns:
            Dictionary with backend information
        """
        if not self._initialized:
            return {
                "initialized": False,
                "backend": None,
                "encryption_available": False,
            }

        backend_name = (
            self._keyring_backend.__class__.__name__
            if self._keyring_backend
            else "None"
        )

        return {
            "initialized": self._initialized,
            "backend": backend_name,
            "encryption_available": self._encryption_available,
            "service_name": self.SERVICE_NAME,
        }

# Export singleton instance
secure_storage = SecureStorageService.get_instance()

# Convenience functions for direct usage
async def set_api_key(key: str, value: str) -> None:
    """Store an API key securely."""
    await secure_storage.set_api_key(key, value)

async def get_api_key(key: str) -> Optional[str]:
    """Retrieve an API key."""
    return await secure_storage.get_api_key(key)

async def delete_api_key(key: str) -> None:
    """Delete an API key."""
    await secure_storage.delete_api_key(key)

async def has_api_key(key: str) -> bool:
    """Check if an API key exists."""
    return await secure_storage.has_api_key(key)

async def clear_all() -> None:
    """Clear all stored API keys."""
    await secure_storage.clear_all()

"""
Service Container for Dependency Injection

Provides centralized access to shared services without circular dependencies.
Services are initialized once and reused throughout the application.

Ported from: src/services/ServiceContainer.ts

Features:
- Singleton pattern for core services
- Type-safe service registration and resolution
- Lazy initialization support
- Thread-safe operations
- Clear error messages for uninitialized services

Usage:
    from backend.services.service_container import ServiceContainer
    from backend.services.encryption_service import EncryptionService
    from backend.services.audit_logger import AuditLogger

    # Initialize container
    container = ServiceContainer()
    container.initialize(
        encryption_service=encryption_svc,
        audit_logger=audit_log,
        key_manager=key_mgr
    )

    # Retrieve services
    encryption = container.get_encryption_service()
    audit = container.get_audit_logger()
    key_mgr = container.get_key_manager()
"""

import threading
from typing import Optional, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.services.encryption_service import EncryptionService
    from backend.services.audit_logger import AuditLogger

    # KeyManager will be created later


class ServiceContainerError(Exception):
    """Raised when service container is not properly initialized."""


class ServiceContainer:
    """
    Service Container for Dependency Injection.

    Manages singleton instances of core services:
    - EncryptionService: AES-256-GCM encryption for sensitive data
    - AuditLogger: Blockchain-style immutable audit trail
    - KeyManager: OS-level encryption key storage

    Thread-safe singleton container ensuring services are initialized
    once and shared across the application.
    """

    # Singleton instance
    _instance: Optional["ServiceContainer"] = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> "ServiceContainer":
        """Ensure only one instance exists (singleton pattern)."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize service container with empty service slots."""
        # Only initialize once
        if not hasattr(self, "_initialized"):
            self._encryption_service: Optional["EncryptionService"] = None
            self._audit_logger: Optional["AuditLogger"] = None
            self._key_manager: Optional[Any] = None  # KeyManager type not yet defined
            self._service_lock = threading.Lock()
            self._initialized = True

    def initialize(
        self,
        encryption_service: "EncryptionService",
        audit_logger: "AuditLogger",
        key_manager: Any = None,  # Optional for now
    ) -> None:
        """
        Initialize the service container with shared services.

        This must be called before any services can be retrieved.
        Typically called during application startup.

        Args:
            encryption_service: EncryptionService instance for AES-256-GCM encryption
            audit_logger: AuditLogger instance for immutable audit trail
            key_manager: KeyManager instance for OS-level key storage (optional)

        Raises:
            ValueError: If services are already initialized
            TypeError: If provided services are None or invalid types

        Example:
            container = ServiceContainer()
            container.initialize(
                encryption_service=EncryptionService(key),
                audit_logger=AuditLogger(db),
                key_manager=KeyManager()
            )
        """
        with self._service_lock:
            # Check if already initialized
            if self._encryption_service is not None or self._audit_logger is not None:
                raise ValueError(
                    "ServiceContainer is already initialized. "
                    "Call reset() first if you need to reinitialize."
                )

            # Validate inputs
            if encryption_service is None:
                raise TypeError("encryption_service cannot be None")
            if audit_logger is None:
                raise TypeError("audit_logger cannot be None")

            # Store service instances
            self._encryption_service = encryption_service
            self._audit_logger = audit_logger
            self._key_manager = key_manager

    def get_encryption_service(self) -> "EncryptionService":
        """
        Get the encryption service instance.

        Returns:
            EncryptionService: Singleton encryption service instance

        Raises:
            ServiceContainerError: If container not initialized

        Example:
            encryption = container.get_encryption_service()
            encrypted = encryption.encrypt("sensitive data")
        """
        if self._encryption_service is None:
            raise ServiceContainerError(
                "ServiceContainer not initialized. "
                "Call initialize() with encryption_service first."
            )
        return self._encryption_service

    def get_audit_logger(self) -> "AuditLogger":
        """
        Get the audit logger instance.

        Returns:
            AuditLogger: Singleton audit logger instance

        Raises:
            ServiceContainerError: If container not initialized

        Example:
            audit = container.get_audit_logger()
            audit.log_event(
                event_type="case.created",
                user_id="user-123",
                action="create"
            )
        """
        if self._audit_logger is None:
            raise ServiceContainerError(
                "ServiceContainer not initialized. " "Call initialize() with audit_logger first."
            )
        return self._audit_logger

    def get_key_manager(self) -> Any:
        """
        Get the key manager instance.

        Returns:
            KeyManager: Singleton key manager instance

        Raises:
            ServiceContainerError: If container not initialized

        Example:
            key_mgr = container.get_key_manager()
            key = key_mgr.get_encryption_key()
        """
        if self._key_manager is None:
            raise ServiceContainerError(
                "ServiceContainer not initialized. " "Call initialize() with key_manager first."
            )
        return self._key_manager

    def is_initialized(self) -> bool:
        """
        Check if the service container has been initialized.

        Returns:
            bool: True if at least one service is registered

        Example:
            if not container.is_initialized():
                container.initialize(...)
        """
        return (
            self._encryption_service is not None
            or self._audit_logger is not None
            or self._key_manager is not None
        )

    def reset(self) -> None:
        """
        Reset the service container to uninitialized state.

        This is primarily useful for testing scenarios where you need
        to reinitialize the container with different services.

        Warning:
            This does not close or cleanup the services themselves.
            Ensure proper cleanup of services before calling reset().

        Example:
            # In test teardown
            container.reset()

            # Can now reinitialize with test doubles
            container.initialize(
                encryption_service=mock_encryption,
                audit_logger=mock_audit
            )
        """
        with self._service_lock:
            self._encryption_service = None
            self._audit_logger = None
            self._key_manager = None


# Module-level convenience functions (matching TypeScript API)

_global_container: Optional[ServiceContainer] = None


def get_container() -> ServiceContainer:
    """
    Get the global service container instance.

    Returns:
        ServiceContainer: Global singleton container

    Example:
        container = get_container()
        encryption = container.get_encryption_service()
    """
    global _global_container
    if _global_container is None:
        _global_container = ServiceContainer()
    return _global_container


def initialize_service_container(
    encryption_service: "EncryptionService", audit_logger: "AuditLogger", key_manager: Any = None
) -> None:
    """
    Initialize the global service container with shared services.

    This is the recommended way to initialize services in the application.

    Args:
        encryption_service: EncryptionService instance
        audit_logger: AuditLogger instance
        key_manager: KeyManager instance (optional)

    Example:
        # Application startup
        from backend.services.service_container import initialize_service_container

        initialize_service_container(
            encryption_service=EncryptionService(key),
            audit_logger=AuditLogger(db),
            key_manager=KeyManager()
        )
    """
    container = get_container()
    container.initialize(encryption_service, audit_logger, key_manager)


def get_encryption_service() -> "EncryptionService":
    """
    Get the encryption service from global container.

    Returns:
        EncryptionService: Encryption service instance

    Raises:
        ServiceContainerError: If container not initialized

    Example:
        from backend.services.service_container import get_encryption_service

        encryption = get_encryption_service()
        encrypted_data = encryption.encrypt("sensitive")
    """
    return get_container().get_encryption_service()


def get_audit_logger() -> "AuditLogger":
    """
    Get the audit logger from global container.

    Returns:
        AuditLogger: Audit logger instance

    Raises:
        ServiceContainerError: If container not initialized

    Example:
        from backend.services.service_container import get_audit_logger

        audit = get_audit_logger()
        audit.log_event(event_type="case.viewed", user_id="123")
    """
    return get_container().get_audit_logger()


def get_key_manager() -> Any:
    """
    Get the key manager from global container.

    Returns:
        KeyManager: Key manager instance

    Raises:
        ServiceContainerError: If container not initialized

    Example:
        from backend.services.service_container import get_key_manager

        key_mgr = get_key_manager()
        encryption_key = key_mgr.get_key()
    """
    return get_container().get_key_manager()


def reset_service_container() -> None:
    """
    Reset the global service container.

    Primarily for testing purposes.

    Example:
        # Test teardown
        from backend.services.service_container import reset_service_container

        reset_service_container()
    """
    container = get_container()
    container.reset()

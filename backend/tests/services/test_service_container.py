"""
Test suite for ServiceContainer

Tests dependency injection container functionality including:
- Service registration and resolution
- Singleton pattern enforcement
- Thread safety
- Error handling for uninitialized services
- Module-level convenience functions
"""

import pytest
import threading
from unittest.mock import Mock

from backend.services.service_container import (
    ServiceContainer,
    ServiceContainerError,
    get_container,
    initialize_service_container,
    get_encryption_service,
    get_audit_logger,
    get_key_manager,
    reset_service_container
)

class TestServiceContainer:
    """Test cases for ServiceContainer class."""

    def setup_method(self):
        """Reset service container before each test."""
        reset_service_container()

    def teardown_method(self):
        """Clean up after each test."""
        reset_service_container()

    def test_singleton_pattern(self):
        """Test that ServiceContainer implements singleton pattern."""
        container1 = ServiceContainer()
        container2 = ServiceContainer()
        container3 = get_container()

        assert container1 is container2
        assert container2 is container3
        assert id(container1) == id(container2) == id(container3)

    def test_initialize_with_valid_services(self):
        """Test successful initialization with all services."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")
        mock_key_mgr = Mock(name="KeyManager")

        container = ServiceContainer()

        # Act
        container.initialize(
            encryption_service=mock_encryption,
            audit_logger=mock_audit,
            key_manager=mock_key_mgr
        )

        # Assert
        assert container.is_initialized()
        assert container.get_encryption_service() is mock_encryption
        assert container.get_audit_logger() is mock_audit
        assert container.get_key_manager() is mock_key_mgr

    def test_initialize_without_key_manager(self):
        """Test initialization with optional key_manager omitted."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")

        container = ServiceContainer()

        # Act
        container.initialize(
            encryption_service=mock_encryption,
            audit_logger=mock_audit
        )

        # Assert
        assert container.is_initialized()
        assert container.get_encryption_service() is mock_encryption
        assert container.get_audit_logger() is mock_audit

        # Should raise error when trying to get key_manager
        with pytest.raises(ServiceContainerError) as exc_info:
            container.get_key_manager()
        assert "not initialized" in str(exc_info.value).lower()

    def test_initialize_with_none_encryption_service(self):
        """Test that initialization fails with None encryption_service."""
        # Arrange
        mock_audit = Mock(name="AuditLogger")
        container = ServiceContainer()

        # Act & Assert
        with pytest.raises(TypeError) as exc_info:
            container.initialize(
                encryption_service=None,
                audit_logger=mock_audit
            )
        assert "encryption_service cannot be None" in str(exc_info.value)

    def test_initialize_with_none_audit_logger(self):
        """Test that initialization fails with None audit_logger."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        container = ServiceContainer()

        # Act & Assert
        with pytest.raises(TypeError) as exc_info:
            container.initialize(
                encryption_service=mock_encryption,
                audit_logger=None
            )
        assert "audit_logger cannot be None" in str(exc_info.value)

    def test_initialize_twice_raises_error(self):
        """Test that double initialization raises ValueError."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")
        container = ServiceContainer()

        container.initialize(
            encryption_service=mock_encryption,
            audit_logger=mock_audit
        )

        # Act & Assert
        mock_encryption2 = Mock(name="EncryptionService2")
        mock_audit2 = Mock(name="AuditLogger2")

        with pytest.raises(ValueError) as exc_info:
            container.initialize(
                encryption_service=mock_encryption2,
                audit_logger=mock_audit2
            )
        assert "already initialized" in str(exc_info.value).lower()

    def test_get_encryption_service_before_init(self):
        """Test that getting service before init raises error."""
        # Arrange
        container = ServiceContainer()

        # Act & Assert
        with pytest.raises(ServiceContainerError) as exc_info:
            container.get_encryption_service()
        assert "not initialized" in str(exc_info.value).lower()

    def test_get_audit_logger_before_init(self):
        """Test that getting audit logger before init raises error."""
        # Arrange
        container = ServiceContainer()

        # Act & Assert
        with pytest.raises(ServiceContainerError) as exc_info:
            container.get_audit_logger()
        assert "not initialized" in str(exc_info.value).lower()

    def test_get_key_manager_before_init(self):
        """Test that getting key manager before init raises error."""
        # Arrange
        container = ServiceContainer()

        # Act & Assert
        with pytest.raises(ServiceContainerError) as exc_info:
            container.get_key_manager()
        assert "not initialized" in str(exc_info.value).lower()

    def test_is_initialized_returns_false_initially(self):
        """Test that is_initialized returns False before initialization."""
        # Arrange
        container = ServiceContainer()

        # Act & Assert
        assert not container.is_initialized()

    def test_is_initialized_returns_true_after_init(self):
        """Test that is_initialized returns True after initialization."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")
        container = ServiceContainer()

        # Act
        container.initialize(
            encryption_service=mock_encryption,
            audit_logger=mock_audit
        )

        # Assert
        assert container.is_initialized()

    def test_reset_clears_services(self):
        """Test that reset() clears all registered services."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")
        mock_key_mgr = Mock(name="KeyManager")

        container = ServiceContainer()
        container.initialize(
            encryption_service=mock_encryption,
            audit_logger=mock_audit,
            key_manager=mock_key_mgr
        )

        assert container.is_initialized()

        # Act
        container.reset()

        # Assert
        assert not container.is_initialized()

        with pytest.raises(ServiceContainerError):
            container.get_encryption_service()

        with pytest.raises(ServiceContainerError):
            container.get_audit_logger()

        with pytest.raises(ServiceContainerError):
            container.get_key_manager()

    def test_reset_allows_reinitialization(self):
        """Test that reset() allows container to be reinitialized."""
        # Arrange
        mock_encryption1 = Mock(name="EncryptionService1")
        mock_audit1 = Mock(name="AuditLogger1")

        container = ServiceContainer()
        container.initialize(
            encryption_service=mock_encryption1,
            audit_logger=mock_audit1
        )

        container.reset()

        # Act
        mock_encryption2 = Mock(name="EncryptionService2")
        mock_audit2 = Mock(name="AuditLogger2")

        container.initialize(
            encryption_service=mock_encryption2,
            audit_logger=mock_audit2
        )

        # Assert
        assert container.get_encryption_service() is mock_encryption2
        assert container.get_audit_logger() is mock_audit2

    def test_thread_safety_singleton(self):
        """Test that singleton is thread-safe."""
        containers = []
        barrier = threading.Barrier(10)

        def create_container():
            barrier.wait()  # Synchronize threads
            container = ServiceContainer()
            containers.append(container)

        # Create 10 threads trying to get container simultaneously
        threads = [threading.Thread(target=create_container) for _ in range(10)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # All should be the same instance
        assert len(set(id(c) for c in containers)) == 1

    def test_thread_safety_initialization(self):
        """Test that initialization is thread-safe."""
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")

        container = ServiceContainer()
        errors = []
        barrier = threading.Barrier(5)

        def init_container():
            barrier.wait()  # Synchronize threads
            try:
                container.initialize(
                    encryption_service=mock_encryption,
                    audit_logger=mock_audit
                )
            except ValueError as e:
                # Expected for threads that try to init after first one succeeds
                errors.append(e)

        # Create 5 threads trying to initialize simultaneously
        threads = [threading.Thread(target=init_container) for _ in range(5)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # Container should be initialized
        assert container.is_initialized()

        # Some threads should have gotten "already initialized" errors
        assert len(errors) >= 4  # At least 4 threads should fail

class TestModuleLevelFunctions:
    """Test cases for module-level convenience functions."""

    def setup_method(self):
        """Reset service container before each test."""
        reset_service_container()

    def teardown_method(self):
        """Clean up after each test."""
        reset_service_container()

    def test_get_container_returns_singleton(self):
        """Test that get_container() returns the same instance."""
        container1 = get_container()
        container2 = get_container()

        assert container1 is container2

    def test_initialize_service_container(self):
        """Test module-level initialize function."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")
        mock_key_mgr = Mock(name="KeyManager")

        # Act
        initialize_service_container(
            encryption_service=mock_encryption,
            audit_logger=mock_audit,
            key_manager=mock_key_mgr
        )

        # Assert
        assert get_encryption_service() is mock_encryption
        assert get_audit_logger() is mock_audit
        assert get_key_manager() is mock_key_mgr

    def test_get_encryption_service_convenience(self):
        """Test module-level get_encryption_service()."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")

        initialize_service_container(
            encryption_service=mock_encryption,
            audit_logger=mock_audit
        )

        # Act
        service = get_encryption_service()

        # Assert
        assert service is mock_encryption

    def test_get_audit_logger_convenience(self):
        """Test module-level get_audit_logger()."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")

        initialize_service_container(
            encryption_service=mock_encryption,
            audit_logger=mock_audit
        )

        # Act
        service = get_audit_logger()

        # Assert
        assert service is mock_audit

    def test_get_key_manager_convenience(self):
        """Test module-level get_key_manager()."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")
        mock_key_mgr = Mock(name="KeyManager")

        initialize_service_container(
            encryption_service=mock_encryption,
            audit_logger=mock_audit,
            key_manager=mock_key_mgr
        )

        # Act
        service = get_key_manager()

        # Assert
        assert service is mock_key_mgr

    def test_convenience_functions_raise_before_init(self):
        """Test that convenience functions raise error before init."""
        with pytest.raises(ServiceContainerError):
            get_encryption_service()

        with pytest.raises(ServiceContainerError):
            get_audit_logger()

        with pytest.raises(ServiceContainerError):
            get_key_manager()

    def test_reset_service_container_convenience(self):
        """Test module-level reset function."""
        # Arrange
        mock_encryption = Mock(name="EncryptionService")
        mock_audit = Mock(name="AuditLogger")

        initialize_service_container(
            encryption_service=mock_encryption,
            audit_logger=mock_audit
        )

        assert get_container().is_initialized()

        # Act
        reset_service_container()

        # Assert
        assert not get_container().is_initialized()

class TestRealWorldUsage:
    """Integration-style tests simulating real application usage."""

    def setup_method(self):
        """Reset service container before each test."""
        reset_service_container()

    def teardown_method(self):
        """Clean up after each test."""
        reset_service_container()

    def test_typical_application_startup(self):
        """Test typical application initialization flow."""
        # Simulate application startup
        mock_encryption = Mock(name="EncryptionService")
        mock_encryption.encrypt = Mock(return_value="encrypted_data")

        mock_audit = Mock(name="AuditLogger")
        mock_audit.log_event = Mock()

        mock_key_mgr = Mock(name="KeyManager")
        mock_key_mgr.get_key = Mock(return_value=b"test_key")

        # Initialize services
        initialize_service_container(
            encryption_service=mock_encryption,
            audit_logger=mock_audit,
            key_manager=mock_key_mgr
        )

        # Simulate various parts of app using services
        encryption = get_encryption_service()
        result = encryption.encrypt("sensitive")
        assert result == "encrypted_data"

        audit = get_audit_logger()
        audit.log_event(event_type="test")
        mock_audit.log_event.assert_called_once_with(event_type="test")

        key_mgr = get_key_manager()
        key = key_mgr.get_key()
        assert key == b"test_key"

    def test_testing_scenario_with_reset(self):
        """Test scenario where container is reset between tests."""
        # First test
        mock_encryption1 = Mock(name="EncryptionService1")
        mock_audit1 = Mock(name="AuditLogger1")

        initialize_service_container(
            encryption_service=mock_encryption1,
            audit_logger=mock_audit1
        )

        assert get_encryption_service() is mock_encryption1

        # Reset for next test
        reset_service_container()

        # Second test with different mocks
        mock_encryption2 = Mock(name="EncryptionService2")
        mock_audit2 = Mock(name="AuditLogger2")

        initialize_service_container(
            encryption_service=mock_encryption2,
            audit_logger=mock_audit2
        )

        assert get_encryption_service() is mock_encryption2
        assert get_encryption_service() is not mock_encryption1

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

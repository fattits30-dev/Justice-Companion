# ServiceContainer - Dependency Injection for Python

Python implementation of the TypeScript ServiceContainer from `src/services/ServiceContainer.ts`.

## Overview

The ServiceContainer provides a centralized dependency injection system for managing singleton service instances throughout the application. It eliminates circular dependencies and ensures services are initialized once and reused everywhere.

## Features

- **Singleton Pattern**: Container itself is a singleton, ensuring one instance across the app
- **Service Registration**: Register services during application startup
- **Type-Safe Resolution**: Type hints for IDE autocomplete and type checking
- **Thread-Safe**: All operations protected by locks for concurrent access
- **Clear Error Messages**: Helpful error messages when services not initialized
- **Testing Support**: Reset functionality for test isolation
- **Module-Level API**: Convenient functions matching TypeScript API

## Installation

The service container is located at:
```
backend/services/service_container.py
```

No additional dependencies required beyond Python's standard library.

## Quick Start

### 1. Application Startup

```python
from backend.services.service_container import initialize_service_container
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger

# Initialize during application startup
encryption_key = load_encryption_key()  # Your key loading logic
encryption_service = EncryptionService(encryption_key)
audit_logger = AuditLogger(db_connection)

initialize_service_container(
    encryption_service=encryption_service,
    audit_logger=audit_logger,
    key_manager=key_manager  # Optional
)
```

### 2. Using Services Anywhere

```python
from backend.services.service_container import get_encryption_service, get_audit_logger

# In any module, retrieve services
encryption = get_encryption_service()
encrypted_data = encryption.encrypt("sensitive information")

audit = get_audit_logger()
audit.log_event(
    event_type="data.encrypted",
    user_id="user-123",
    action="encrypt"
)
```

### 3. Testing with Reset

```python
from backend.services.service_container import reset_service_container

def teardown():
    """Reset container after each test."""
    reset_service_container()
```

## API Reference

### Class: `ServiceContainer`

The main container class implementing the singleton pattern.

#### Methods

##### `__init__()`
```python
container = ServiceContainer()
```
Creates or returns the singleton instance. Multiple calls return the same instance.

##### `initialize(encryption_service, audit_logger, key_manager=None)`
```python
container.initialize(
    encryption_service=EncryptionService(key),
    audit_logger=AuditLogger(db),
    key_manager=KeyManager()
)
```
Initialize the container with service instances.

**Parameters:**
- `encryption_service` (EncryptionService): Required. AES-256-GCM encryption service
- `audit_logger` (AuditLogger): Required. Blockchain-style audit logger
- `key_manager` (Any): Optional. OS-level key storage manager

**Raises:**
- `ValueError`: If container already initialized
- `TypeError`: If required services are None

##### `get_encryption_service()`
```python
encryption = container.get_encryption_service()
```
Get the registered encryption service instance.

**Returns:** `EncryptionService`

**Raises:** `ServiceContainerError` if not initialized

##### `get_audit_logger()`
```python
audit = container.get_audit_logger()
```
Get the registered audit logger instance.

**Returns:** `AuditLogger`

**Raises:** `ServiceContainerError` if not initialized

##### `get_key_manager()`
```python
key_mgr = container.get_key_manager()
```
Get the registered key manager instance.

**Returns:** `KeyManager` (or configured type)

**Raises:** `ServiceContainerError` if not initialized

##### `is_initialized()`
```python
if container.is_initialized():
    # Use services
```
Check if container has been initialized with at least one service.

**Returns:** `bool`

##### `reset()`
```python
container.reset()
```
Reset container to uninitialized state. Primarily for testing.

**Warning:** Does not cleanup services themselves. Ensure proper cleanup before calling.

### Module-Level Functions

Convenience functions that work with the global singleton container.

#### `get_container()`
```python
container = get_container()
```
Get the global singleton container instance.

#### `initialize_service_container(encryption_service, audit_logger, key_manager=None)`
```python
initialize_service_container(
    encryption_service=enc_svc,
    audit_logger=audit_log
)
```
Initialize the global container. Recommended initialization method.

#### `get_encryption_service()`
```python
encryption = get_encryption_service()
```
Get encryption service from global container.

#### `get_audit_logger()`
```python
audit = get_audit_logger()
```
Get audit logger from global container.

#### `get_key_manager()`
```python
key_mgr = get_key_manager()
```
Get key manager from global container.

#### `reset_service_container()`
```python
reset_service_container()
```
Reset the global container. For testing purposes.

## Usage Patterns

### Pattern 1: Application Startup

```python
# main.py or app initialization
from backend.services.service_container import initialize_service_container
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger

def startup():
    """Initialize application services."""
    # Load configuration
    db = create_database_connection()
    encryption_key = load_encryption_key()

    # Create service instances
    encryption = EncryptionService(encryption_key)
    audit = AuditLogger(db)

    # Initialize container
    initialize_service_container(
        encryption_service=encryption,
        audit_logger=audit
    )

    print("Services initialized successfully")
```

### Pattern 2: Repository Usage

```python
# repositories/case_repository.py
from backend.services.service_container import get_encryption_service, get_audit_logger

class CaseRepository:
    """Repository for case data access."""

    def __init__(self, db):
        self.db = db
        # No need to pass services as constructor arguments!

    def create_case(self, title, description, user_id):
        """Create a new case with encryption and audit logging."""
        # Get services from container
        encryption = get_encryption_service()
        audit = get_audit_logger()

        # Encrypt sensitive data
        encrypted_title = encryption.encrypt(title)
        encrypted_description = encryption.encrypt(description)

        # Save to database
        case = self.db.cases.create(
            title=encrypted_title,
            description=encrypted_description
        )

        # Log the action
        audit.log_event(
            event_type="case.created",
            user_id=user_id,
            resource_id=case.id,
            action="create"
        )

        return case
```

### Pattern 3: Service Layer Usage

```python
# services/case_service.py
from backend.services.service_container import get_encryption_service, get_audit_logger

class CaseService:
    """Business logic for case management."""

    def __init__(self, case_repository):
        self.repository = case_repository

    def search_cases(self, query, user_id):
        """Search cases with audit logging."""
        # Get audit logger
        audit = get_audit_logger()

        # Perform search
        results = self.repository.search(query)

        # Log the search
        audit.log_event(
            event_type="case.searched",
            user_id=user_id,
            action="search",
            details={"query": query, "results": len(results)}
        )

        return results
```

### Pattern 4: Testing with Mocks

```python
# tests/test_case_service.py
import pytest
from unittest.mock import Mock
from backend.services.service_container import (
    initialize_service_container,
    reset_service_container
)

class TestCaseService:

    def setup_method(self):
        """Initialize mocks before each test."""
        # Create mock services
        self.mock_encryption = Mock()
        self.mock_audit = Mock()

        # Initialize container with mocks
        initialize_service_container(
            encryption_service=self.mock_encryption,
            audit_logger=self.mock_audit
        )

    def teardown_method(self):
        """Clean up after each test."""
        reset_service_container()

    def test_create_case(self):
        """Test case creation with mocked services."""
        # Test uses mocked services from container
        service = CaseService(repository)
        case = service.create_case("Test Case", "Description", "user-1")

        # Verify encryption was called
        self.mock_encryption.encrypt.assert_called()

        # Verify audit logging
        self.mock_audit.log_event.assert_called_with(
            event_type="case.created",
            user_id="user-1",
            action="create"
        )
```

### Pattern 5: Conditional Initialization

```python
# For applications that might not always need all services
from backend.services.service_container import ServiceContainer

container = ServiceContainer()

if not container.is_initialized():
    # Perform initialization
    initialize_services()
else:
    # Already initialized, skip
    print("Services already available")
```

## Error Handling

### ServiceContainerError

Raised when attempting to retrieve services before initialization:

```python
from backend.services.service_container import (
    get_encryption_service,
    ServiceContainerError
)

try:
    encryption = get_encryption_service()
except ServiceContainerError as e:
    print(f"Services not ready: {e}")
    # Initialize services...
```

### Initialization Errors

```python
# TypeError if passing None for required services
initialize_service_container(
    encryption_service=None,  # ❌ Raises TypeError
    audit_logger=audit_log
)

# ValueError if initializing twice
initialize_service_container(...)  # First time OK
initialize_service_container(...)  # ❌ Raises ValueError
```

## Thread Safety

The ServiceContainer is thread-safe:

- Container creation uses double-checked locking
- Service registration protected by locks
- Safe to call from multiple threads simultaneously

```python
import threading

def worker():
    """Worker thread using services."""
    encryption = get_encryption_service()
    # Use service...

# Safe to call from multiple threads
threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads:
    t.start()
```

## Testing

Run the comprehensive test suite:

```bash
cd "F:\Justice Companion take 2"
python -m pytest backend/services/test_service_container.py -v
```

Test coverage includes:
- Singleton pattern enforcement
- Service registration and resolution
- Error handling for uninitialized services
- Thread safety
- Reset functionality
- Module-level convenience functions

All 24 tests pass with 100% success rate.

## Examples

Run the interactive examples:

```bash
cd "F:\Justice Companion take 2\backend\services"
python example_service_container.py
```

Examples demonstrate:
1. Application startup sequence
2. Service usage in repositories
3. Testing scenarios with reset
4. Error handling
5. Singleton pattern verification

## Comparison with TypeScript Version

The Python implementation maintains API compatibility with the TypeScript version:

### TypeScript
```typescript
import {
  initializeServiceContainer,
  getEncryptionService,
  getAuditLogger
} from './services/ServiceContainer';

initializeServiceContainer(encSvc, auditLog, keyMgr);
const encryption = getEncryptionService();
```

### Python
```python
from backend.services.service_container import (
    initialize_service_container,
    get_encryption_service,
    get_audit_logger
)

initialize_service_container(enc_svc, audit_log, key_mgr)
encryption = get_encryption_service()
```

Key differences:
- Python uses `snake_case` naming (PEP 8)
- Python includes thread-safe singleton implementation
- Python adds `is_initialized()` and `reset()` methods
- Python provides type hints for type checking

## Best Practices

1. **Initialize Once**: Call `initialize_service_container()` once during application startup
2. **Use Module Functions**: Prefer `get_encryption_service()` over direct container access
3. **Test Isolation**: Always call `reset_service_container()` in test teardown
4. **Type Hints**: Use type hints for IDE support and type checking
5. **Error Handling**: Catch `ServiceContainerError` when services might not be ready
6. **Thread Safety**: Container is thread-safe, but services themselves must be thread-safe too

## Troubleshooting

### "ServiceContainer not initialized"
**Cause:** Trying to use services before calling `initialize_service_container()`

**Solution:** Ensure initialization runs during application startup:
```python
initialize_service_container(encryption, audit)
```

### "ServiceContainer is already initialized"
**Cause:** Calling `initialize()` twice without calling `reset()` first

**Solution:** Only initialize once, or call `reset()` before reinitializing:
```python
reset_service_container()
initialize_service_container(...)
```

### Services not shared across modules
**Cause:** Not using the same container instance

**Solution:** Always use module-level functions (`get_encryption_service()`, etc.) which use the global singleton

## Contributing

When modifying the service container:

1. Ensure all tests pass: `pytest backend/services/test_service_container.py`
2. Update this README if API changes
3. Add examples for new functionality
4. Maintain thread safety
5. Keep API compatible with TypeScript version where possible

## License

Part of Justice Companion - Privacy-first legal case management system.

## Related Documentation

- [EncryptionService](./encryption_service.py) - AES-256-GCM encryption
- [AuditLogger](./audit_logger.py) - Blockchain-style audit trail
- [TypeScript ServiceContainer](../../src/services/ServiceContainer.ts) - Original implementation

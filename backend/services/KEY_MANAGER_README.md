# KeyManager Service

Secure encryption key management using OS-level secure storage.

## Overview

The `KeyManager` service provides enterprise-grade key management for Justice Companion's Python backend. It replaces plaintext `.env` key storage with OS-native encryption, addressing a **CVSS 9.1** vulnerability.

### Security Properties

- **OS-Level Encryption:**
  - Windows: DPAPI (Data Protection API)
  - macOS: Keychain
  - Linux: Secret Service API (libsecret)
- **Zero Plaintext Storage:** Keys never written to disk in plaintext
- **Memory Safety:** Secure key caching with explicit cleanup
- **Thread-Safe Operations:** All operations protected with locks
- **Key Rotation:** Built-in support with automatic backup
- **Audit Logging:** All key operations logged for compliance

## Installation

The `KeyManager` service requires the `keyring` library, which is already included in `requirements.txt`:

```bash
pip install keyring>=25.5.0
```

### Platform-Specific Setup

**Linux:**
Requires a keyring backend installed:
```bash
# Ubuntu/Debian
sudo apt-get install gnome-keyring libsecret-1-dev

# Fedora
sudo dnf install gnome-keyring libsecret-devel

# Arch
sudo pacman -S gnome-keyring libsecret
```

**macOS:**
No additional setup needed (uses built-in Keychain).

**Windows:**
No additional setup needed (uses built-in DPAPI).

## Quick Start

### Basic Usage

```python
from backend.services.key_manager import KeyManager
import os

# Initialize with user data directory
user_data_path = os.path.expanduser("~/.justice-companion")
key_manager = KeyManager(user_data_path)

# Generate new encryption key
if not await key_manager.has_key():
    new_key = await key_manager.generate_new_key()
    print(f"Generated key: {new_key[:16]}...")  # First 16 chars only

# Get encryption key
key = await key_manager.get_key()
print(f"Key length: {len(key)} bytes")  # 32 bytes

# Use with EncryptionService
from backend.services.encryption_service import EncryptionService
encryption_service = EncryptionService(key)
```

### Store API Keys

```python
# Store API key securely
await key_manager.store_key("openai_api_key", "sk-...")
await key_manager.store_key("anthropic_api_key", "sk-ant-...")

# Retrieve API key
api_key = await key_manager.retrieve_key("openai_api_key")
if api_key:
    print(f"Found API key: {api_key[:8]}...")
else:
    print("API key not found")

# Check if key exists
if key_manager.has_stored_key("openai_api_key"):
    print("OpenAI API key is configured")

# Delete API key
await key_manager.delete_key("openai_api_key")
```

### Migrate from .env

If you have an existing encryption key in `.env` file:

```python
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()
env_key = os.getenv("ENCRYPTION_KEY_BASE64")

if env_key:
    # Migrate to secure storage
    await key_manager.migrate_from_env(env_key)
    print("✓ Key migrated to OS secure storage")
    print("⚠ IMPORTANT: Remove ENCRYPTION_KEY_BASE64 from .env file")
```

### Key Rotation

```python
# Rotate encryption key (generates new key, backs up old)
new_key = await key_manager.rotate_key()
print(f"New key generated: {new_key[:16]}...")

# Old key automatically backed up with timestamp
# e.g., "master_encryption_key_backup_1234567890"

# ⚠ After rotation, you MUST re-encrypt all data with new key
# See "Key Rotation Workflow" section below
```

## API Reference

### Core Methods

#### `__init__(user_data_path: str)`
Initialize KeyManager with user data directory.

**Parameters:**
- `user_data_path`: Path to user data directory (e.g., `~/.justice-companion`)

**Example:**
```python
key_manager = KeyManager("/home/user/.justice-companion")
```

---

#### `async get_key() -> bytes`
Get encryption key (loads and decrypts on first call, then caches).

**Returns:** 32-byte encryption key

**Raises:**
- `EncryptionNotAvailableError`: OS-level encryption not available
- `InvalidKeyError`: Key doesn't exist or is invalid

**Example:**
```python
key = await key_manager.get_key()
assert len(key) == 32  # 256 bits
```

---

#### `async has_key() -> bool`
Check if encryption key exists in secure storage.

**Returns:** `True` if key exists, `False` otherwise

**Example:**
```python
if not await key_manager.has_key():
    await key_manager.generate_new_key()
```

---

#### `async generate_new_key() -> str`
Generate and store a new encryption key.

**WARNING:** Replaces existing key. Ensure all data is backed up.

**Returns:** Base64-encoded key string

**Example:**
```python
new_key = await key_manager.generate_new_key()
# Store this key securely as backup
```

---

#### `async migrate_from_env(env_key: str) -> None`
Migrate key from `.env` file to secure storage.

**Parameters:**
- `env_key`: Base64-encoded key from `ENCRYPTION_KEY_BASE64`

**Raises:**
- `InvalidKeyError`: Key format or length invalid

**Example:**
```python
await key_manager.migrate_from_env(os.getenv("ENCRYPTION_KEY_BASE64"))
```

---

#### `async rotate_key() -> str`
Rotate encryption key (backs up old key, generates new one).

**Returns:** Base64-encoded new key

**Example:**
```python
new_key = await key_manager.rotate_key()
# Re-encrypt all data with new_key
```

---

#### `clear_cache() -> None`
Clear cached key from memory (for security).

**Example:**
```python
# On user logout
key_manager.clear_cache()
```

---

### Stored Key Management

#### `async store_key(key_name: str, value: str) -> None`
Store an arbitrary key-value pair securely.

**Parameters:**
- `key_name`: Identifier (e.g., `"openai_api_key"`)
- `value`: Secret value to store

**Example:**
```python
await key_manager.store_key("openai_api_key", "sk-...")
```

---

#### `async retrieve_key(key_name: str) -> Optional[str]`
Retrieve a stored key.

**Returns:** Decrypted value, or `None` if not found

**Example:**
```python
api_key = await key_manager.retrieve_key("openai_api_key")
```

---

#### `async delete_key(key_name: str) -> None`
Delete a stored key.

**Example:**
```python
await key_manager.delete_key("openai_api_key")
```

---

#### `has_stored_key(key_name: str) -> bool`
Check if a key exists (synchronous).

**Returns:** `True` if key exists

**Example:**
```python
if key_manager.has_stored_key("openai_api_key"):
    print("OpenAI configured")
```

---

### Utility Methods

#### `async validate_key_file() -> Dict[str, Any]`
Validate encryption key.

**Returns:**
```python
{
    "valid": bool,
    "error": Optional[str]  # If invalid
}
```

**Example:**
```python
result = await key_manager.validate_key_file()
if not result["valid"]:
    print(f"Invalid key: {result['error']}")
```

---

#### `is_encryption_available() -> bool`
Check if OS-level encryption is available (synchronous).

**Returns:** `True` if encryption available

**Example:**
```python
if not key_manager.is_encryption_available():
    print("⚠ No secure storage available")
```

---

#### `get_backend_info() -> Dict[str, Any]`
Get information about keyring backend.

**Returns:**
```python
{
    "encryption_available": bool,
    "backend": Optional[str],  # e.g., "WinVaultKeyring"
    "service_name": str,       # "JusticeCompanion"
    "user_data_path": str
}
```

**Example:**
```python
info = key_manager.get_backend_info()
print(f"Backend: {info['backend']}")
```

---

### Static Utility

#### `generate_encryption_key() -> str`
Generate a new 256-bit encryption key (static function).

**Returns:** Base64-encoded key

**Example:**
```python
from backend.services.key_manager import generate_encryption_key

new_key = generate_encryption_key()
print(f"Key: {new_key}")
```

## Key Rotation Workflow

When rotating keys, you must re-encrypt all data:

```python
from backend.services.encryption_service import EncryptionService

# 1. Get old key
old_key = await key_manager.get_key()
old_service = EncryptionService(old_key)

# 2. Rotate key
new_key_base64 = await key_manager.rotate_key()
new_key = base64.b64decode(new_key_base64)
new_service = EncryptionService(new_key)

# 3. Re-encrypt all data
# Example: Re-encrypt user records
for user in database.get_all_users():
    # Decrypt with old key
    decrypted_data = old_service.decrypt(user.encrypted_field)

    # Re-encrypt with new key
    new_encrypted = new_service.encrypt(decrypted_data)

    # Update database
    database.update_user(user.id, encrypted_field=new_encrypted)

print("✓ All data re-encrypted with new key")
```

## Error Handling

### Common Exceptions

**`EncryptionNotAvailableError`**
- **Cause:** OS-level encryption not available
- **Solution:** Install keyring backend (Linux) or check OS support

**`InvalidKeyError`**
- **Cause:** Key doesn't exist or has invalid format/length
- **Solution:** Generate new key or check `.env` migration

**`KeyManagerError`**
- **Cause:** Generic key management error
- **Solution:** Check logs for specific error message

### Example Error Handling

```python
from backend.services.key_manager import (
    KeyManager,
    EncryptionNotAvailableError,
    InvalidKeyError,
    KeyManagerError
)

try:
    key = await key_manager.get_key()
except EncryptionNotAvailableError:
    print("⚠ OS encryption not available. Install keyring backend.")
    # Fallback to .env key (not recommended for production)
except InvalidKeyError as e:
    print(f"⚠ Invalid key: {e}")
    # Generate new key
    await key_manager.generate_new_key()
except KeyManagerError as e:
    print(f"✗ Key manager error: {e}")
    # Log error and alert administrator
```

## Security Best Practices

### 1. Never Log Keys
```python
# ✗ BAD
logger.info(f"Key: {key}")

# ✓ GOOD
logger.info("Key loaded successfully")
```

### 2. Clear Cache on Logout
```python
# On user logout or app shutdown
key_manager.clear_cache()
```

### 3. Validate Keys
```python
result = await key_manager.validate_key_file()
if not result["valid"]:
    raise SecurityError(f"Key validation failed: {result['error']}")
```

### 4. Use Key Rotation
```python
# Rotate keys every 90 days
import datetime

last_rotation = get_last_rotation_date()
if (datetime.datetime.now() - last_rotation).days >= 90:
    await key_manager.rotate_key()
    # Re-encrypt all data
```

### 5. Backup Keys Securely
```python
# When generating or rotating keys, store backup securely
new_key = await key_manager.generate_new_key()

# Store in secure external location (NOT in codebase)
backup_to_secure_location(new_key)
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
pytest backend/services/test_key_manager.py -v

# Run specific test class
pytest backend/services/test_key_manager.py::TestKeyManagerGetKey -v

# Run with coverage
pytest backend/services/test_key_manager.py --cov=backend.services.key_manager --cov-report=html
```

Test coverage: **45 test cases** covering all functionality.

## Integration with Other Services

### EncryptionService

```python
from backend.services.key_manager import KeyManager
from backend.services.encryption_service import EncryptionService

# Get encryption key
key_manager = KeyManager(user_data_path)
key = await key_manager.get_key()

# Initialize encryption service
encryption_service = EncryptionService(key)

# Encrypt data
encrypted = encryption_service.encrypt("Sensitive legal data")
```

### FastAPI Dependency

```python
from fastapi import Depends
from backend.services.key_manager import KeyManager

# Global instance
_key_manager: Optional[KeyManager] = None

def get_key_manager() -> KeyManager:
    """FastAPI dependency for KeyManager."""
    global _key_manager
    if _key_manager is None:
        _key_manager = KeyManager(user_data_path)
    return _key_manager

# Use in route
@app.post("/api/keys/store")
async def store_api_key(
    key_name: str,
    value: str,
    key_manager: KeyManager = Depends(get_key_manager)
):
    await key_manager.store_key(key_name, value)
    return {"status": "success"}
```

## Performance Considerations

- **Key Caching:** First `get_key()` call loads from OS storage, subsequent calls use cached value
- **Thread-Safe:** All operations use locks for thread safety
- **Async Operations:** All I/O operations are async for optimal performance
- **Memory Cleanup:** `clear_cache()` overwrites key bytes before releasing memory

## Troubleshooting

### Issue: "OS-level encryption is not available"
**Linux:** Install keyring backend:
```bash
sudo apt-get install gnome-keyring libsecret-1-dev
```

**macOS/Windows:** This should not occur. Check OS version.

### Issue: "Encryption key not found"
**Solution:** Generate new key or migrate from `.env`:
```python
if not await key_manager.has_key():
    await key_manager.generate_new_key()
```

### Issue: "Invalid key length"
**Solution:** Key must be 32 bytes (256 bits). Regenerate:
```python
new_key = await key_manager.generate_new_key()
```

## License

Part of Justice Companion - Privacy-first legal case management system.

## Related Documentation

- [Migration Guide](./KEY_MANAGER_MIGRATION.md)
- [Example Usage](./example_key_manager.py)
- [EncryptionService](./encryption_service.py)
- [SecureStorageService](./secure_storage_service.py)

# SecureStorageService Quick Start

## 30-Second Setup

```python
from services import secure_storage

# Initialize (do once at app startup)
await secure_storage.init()

# Store API key
await secure_storage.set_api_key("openai_api_key", "sk-...")

# Get API key
api_key = await secure_storage.get_api_key("openai_api_key")

# Delete API key
await secure_storage.delete_api_key("openai_api_key")
```

## FastAPI Template

```python
from fastapi import FastAPI
from services import secure_storage

app = FastAPI()

@app.on_event("startup")
async def startup():
    await secure_storage.init()
    print(f"Secure storage: {secure_storage.get_backend_info()['backend']}")

@app.post("/settings/api-key")
async def save_key(provider: str, key: str):
    await secure_storage.set_api_key(f"{provider}_api_key", key)
    return {"success": True}

@app.get("/settings/api-key/{provider}")
async def get_key(provider: str):
    key = await secure_storage.get_api_key(f"{provider}_api_key")
    return {"key": f"{key[:10]}..." if key else None}
```

## Common Patterns

### OpenAI Integration
```python
import openai
from services import secure_storage

# Get API key from secure storage
api_key = await secure_storage.get_api_key("openai_api_key")
openai.api_key = api_key

# Use OpenAI
response = await openai.ChatCompletion.create(...)
```

### Multi-Provider Support
```python
providers = ["openai", "anthropic", "huggingface"]

# Store keys
for provider in providers:
    key = input(f"Enter {provider} API key: ")
    await secure_storage.set_api_key(f"{provider}_api_key", key)

# List stored keys
keys = await secure_storage.list_keys()
print("Stored keys:", [k for k, exists in keys.items() if exists])
```

### User-Specific Keys
```python
# Store per-user keys
user_id = "user_123"
await secure_storage.set_api_key(
    f"user_{user_id}_openai_api_key",
    "sk-user-key-..."
)

# Retrieve user's key
user_key = await secure_storage.get_api_key(f"user_{user_id}_openai_api_key")
```

## Error Handling

```python
from services import SecureStorageError

try:
    await secure_storage.set_api_key("my_key", "my_value")
except ValueError as e:
    print(f"Invalid input: {e}")
except SecureStorageError as e:
    print(f"Storage error: {e}")
```

## Platform Support

- Windows: DPAPI (built-in)
- macOS: Keychain (built-in)
- Linux: Install `gnome-keyring` or `kwallet`

```bash
# Linux setup
sudo apt-get install gnome-keyring
```

## Check Encryption

```python
await secure_storage.init()

if secure_storage.is_encryption_available():
    print("Secure storage available")
    info = secure_storage.get_backend_info()
    print(f"Backend: {info['backend']}")
else:
    print("WARNING: Using plaintext fallback")
```

## Testing

```python
import pytest

@pytest.mark.asyncio
async def test_store_and_retrieve():
    await secure_storage.set_api_key("test_key", "test_value")
    value = await secure_storage.get_api_key("test_key")
    assert value == "test_value"
    await secure_storage.delete_api_key("test_key")
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: keyring` | `pip install keyring>=25.5.0` |
| Linux: No encryption | `sudo apt-get install gnome-keyring` |
| Keys not persisting | Check keyring backend with `get_backend_info()` |
| Permission denied | Run with user-level permissions |

## Full Documentation

- [Complete API Reference](SECURE_STORAGE_SERVICE_README.md)
- [Usage Examples](example_secure_storage_usage.py)
- [Conversion Summary](SECURE_STORAGE_CONVERSION_SUMMARY.md)

# AI Provider Configuration Service

**Python service for managing AI provider configurations in Justice Companion**

Ported from TypeScript `src/services/AIProviderConfigService.ts` to Python with full feature parity and SQLAlchemy/FastAPI integration.

---

## Overview

The `AIProviderConfigService` manages secure storage and retrieval of AI provider configurations including encrypted API keys, model settings, and provider preferences. It supports 10 major AI providers with comprehensive validation, audit logging, and per-user isolation.

### Supported Providers

- **OpenAI** - GPT-4o, GPT-4 Turbo, GPT-3.5
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- **Hugging Face** - Llama 3.1, Mistral, Qwen, Gemma models
- **Qwen** - Qwen 2.5-72B, 32B, 14B, 7B
- **Google AI** - Gemini 2.0, 1.5 Pro/Flash
- **Cohere** - Command R+, Command R
- **Together AI** - Llama 3.1 Turbo, Mixtral
- **Anyscale** - Llama 3.1, Mistral, CodeLlama
- **Mistral AI** - Mistral Large/Medium/Small
- **Perplexity** - Llama 3.1 Sonar models

---

## Features

### Core Capabilities

- **Secure API Key Storage** - API keys encrypted with AES-256-GCM via `EncryptionService`
- **Per-User Isolation** - Each user has independent provider configurations
- **Active Provider Management** - One active provider per user with automatic switching
- **Configuration Validation** - Comprehensive validation of temperature, max_tokens, top_p
- **Audit Logging** - All configuration changes logged via `AuditLogger`
- **Database Persistence** - Configurations stored in SQLite/PostgreSQL via SQLAlchemy
- **Provider Metadata** - Access to default endpoints, models, and capabilities

### Security

- **Encrypted at Rest** - API keys encrypted before database storage
- **Decrypted on Demand** - Keys only decrypted when explicitly requested
- **No Plaintext Logging** - Sensitive data never logged in plaintext
- **GDPR Compliant** - Cascade deletion when user account is deleted
- **Input Validation** - Pydantic models enforce type safety and constraints

---

## Installation

### Prerequisites

```bash
pip install sqlalchemy fastapi pydantic cryptography
```

### Database Migration

Add to your Alembic migration:

```sql
CREATE TABLE ai_provider_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT,
    temperature REAL,
    max_tokens INTEGER,
    top_p REAL,
    enabled BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (user_id, provider)
);

CREATE INDEX idx_ai_provider_configs_user_id ON ai_provider_configs(user_id);
CREATE INDEX idx_ai_provider_configs_provider ON ai_provider_configs(provider);
CREATE INDEX idx_ai_provider_configs_is_active ON ai_provider_configs(is_active);
```

---

## Usage

### Basic Setup

```python
from sqlalchemy.orm import Session
from backend.services import (
    AIProviderConfigService,
    AIProviderType,
    AIProviderConfigInput,
    EncryptionService,
)

# Initialize services
encryption_service = EncryptionService(encryption_key)
service = AIProviderConfigService(
    db=db_session,
    encryption_service=encryption_service,
    audit_logger=audit_logger  # Optional
)
```

### Configure a Provider

```python
# Create configuration
config = AIProviderConfigInput(
    provider=AIProviderType.OPENAI,
    api_key="sk-your-api-key",
    model="gpt-4-turbo",
    temperature=0.7,
    max_tokens=4000
)

# Save configuration
result = await service.set_provider_config(
    user_id=user_id,
    config=config
)

print(f"Provider configured: {result.provider}")
print(f"Model: {result.model}")
print(f"Active: {result.is_active}")
```

### Get Active Provider

```python
# Get active provider configuration (with decrypted API key)
active_config = await service.get_active_provider_config(user_id=user_id)

if active_config:
    print(f"Provider: {active_config.provider}")
    print(f"Model: {active_config.model}")
    print(f"API Key: {active_config.api_key}")  # Decrypted

    # Use for API calls
    import openai
    openai.api_key = active_config.api_key
    # ... make API calls
```

### Switch Active Provider

```python
# Set Anthropic as active provider
await service.set_active_provider(
    user_id=user_id,
    provider=AIProviderType.ANTHROPIC
)

# Verify switch
active_provider = service.get_active_provider(user_id=user_id)
print(f"Active provider: {active_provider.value}")  # "anthropic"
```

### List Configured Providers

```python
# Get all configured providers (without API keys)
configs = service.list_provider_configs(user_id=user_id)

for config in configs:
    active_marker = "★" if config.is_active else " "
    print(f"[{active_marker}] {config.provider}")
    print(f"  Model: {config.model}")
    print(f"  Temperature: {config.temperature}")
    print()
```

### Validate Configuration

```python
# Validate before saving
config = AIProviderConfigInput(
    provider=AIProviderType.OPENAI,
    api_key="sk-test-key",
    model="gpt-4-turbo",
    temperature=3.0,  # Invalid!
    max_tokens=200000  # Invalid!
)

validation = service.validate_config(config)
if not validation.valid:
    print("Invalid configuration:")
    for error in validation.errors:
        print(f"  - {error}")
    # Output:
    # Invalid configuration:
    #   - Temperature must be between 0 and 2
    #   - Max tokens must be between 1 and 100,000
```

### Get Provider Metadata

```python
# Get provider information
metadata = service.get_provider_metadata(AIProviderType.ANTHROPIC)

print(f"Name: {metadata.name}")
print(f"Default Endpoint: {metadata.default_endpoint}")
print(f"Default Model: {metadata.default_model}")
print(f"Max Context Tokens: {metadata.max_context_tokens:,}")
print(f"Supports Streaming: {metadata.supports_streaming}")
print(f"Available Models: {len(metadata.available_models)}")

# List all providers
all_providers = service.list_all_providers_metadata()
for provider_key, metadata in all_providers.items():
    print(f"{provider_key}: {metadata['name']}")
```

### Remove Configuration

```python
# Remove provider configuration
await service.remove_provider_config(
    user_id=user_id,
    provider=AIProviderType.OPENAI
)

# If removed provider was active, another is automatically activated
active_provider = service.get_active_provider(user_id=user_id)
print(f"New active provider: {active_provider.value}")
```

---

## API Reference

### Service Methods

#### `set_provider_config(user_id, config)`
Create or update provider configuration.

**Parameters:**
- `user_id` (int) - User ID
- `config` (AIProviderConfigInput) - Provider configuration

**Returns:** `AIProviderConfigSummary` (without API key)

**Raises:** `HTTPException` if validation fails

---

#### `get_provider_config(user_id, provider)`
Get provider configuration with decrypted API key.

**Parameters:**
- `user_id` (int) - User ID
- `provider` (AIProviderType) - Provider type

**Returns:** `AIProviderConfigOutput` (with decrypted API key) or `None`

---

#### `get_active_provider_config(user_id)`
Get active provider configuration with decrypted API key.

**Parameters:**
- `user_id` (int) - User ID

**Returns:** `AIProviderConfigOutput` or `None`

---

#### `set_active_provider(user_id, provider)`
Set active provider for user.

**Parameters:**
- `user_id` (int) - User ID
- `provider` (AIProviderType) - Provider to activate

**Returns:** `AIProviderConfigSummary`

**Raises:** `HTTPException` if provider not configured

---

#### `get_active_provider(user_id)`
Get active provider type.

**Parameters:**
- `user_id` (int) - User ID

**Returns:** `AIProviderType` or `None`

---

#### `is_provider_configured(user_id, provider)`
Check if provider is configured.

**Parameters:**
- `user_id` (int) - User ID
- `provider` (AIProviderType) - Provider type

**Returns:** `bool`

---

#### `get_configured_providers(user_id)`
Get list of configured provider types.

**Parameters:**
- `user_id` (int) - User ID

**Returns:** `List[AIProviderType]`

---

#### `list_provider_configs(user_id)`
List all provider configurations (without API keys).

**Parameters:**
- `user_id` (int) - User ID

**Returns:** `List[AIProviderConfigSummary]`

---

#### `remove_provider_config(user_id, provider)`
Remove provider configuration.

**Parameters:**
- `user_id` (int) - User ID
- `provider` (AIProviderType) - Provider to remove

**Raises:** `HTTPException` if provider not found

---

#### `get_provider_metadata(provider)`
Get metadata for a provider.

**Parameters:**
- `provider` (AIProviderType) - Provider type

**Returns:** `AIProviderMetadata`

---

#### `list_all_providers_metadata()`
Get metadata for all providers.

**Returns:** `Dict[str, AIProviderMetadata]`

---

#### `validate_config(config)`
Validate provider configuration.

**Parameters:**
- `config` (AIProviderConfigInput) - Configuration to validate

**Returns:** `ValidationResult`

---

#### `test_provider(user_id, provider)`
Test provider connection.

**Parameters:**
- `user_id` (int) - User ID
- `provider` (AIProviderType) - Provider to test

**Returns:** `TestResult`

---

## Data Models

### AIProviderConfigInput
Input model for creating/updating configurations.

```python
class AIProviderConfigInput(BaseModel):
    provider: AIProviderType
    api_key: str  # Min length 1
    model: str  # Min length 1
    endpoint: Optional[str] = None
    temperature: Optional[float] = None  # 0-2
    max_tokens: Optional[int] = None  # 1-100000
    top_p: Optional[float] = None  # 0-1
    enabled: bool = True
```

### AIProviderConfigOutput
Output model with decrypted API key.

```python
class AIProviderConfigOutput(BaseModel):
    id: int
    user_id: int
    provider: str
    api_key: str  # Decrypted
    model: str
    endpoint: Optional[str]
    temperature: Optional[float]
    max_tokens: Optional[int]
    top_p: Optional[float]
    enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

### AIProviderConfigSummary
Summary model without API key (for listings).

```python
class AIProviderConfigSummary(BaseModel):
    id: int
    user_id: int
    provider: str
    model: str
    endpoint: Optional[str]
    temperature: Optional[float]
    max_tokens: Optional[int]
    top_p: Optional[float]
    enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

### AIProviderMetadata
Provider metadata information.

```python
class AIProviderMetadata(BaseModel):
    name: str
    default_endpoint: str
    supports_streaming: bool
    default_model: str
    max_context_tokens: int
    available_models: List[str]
```

### ValidationResult
Configuration validation result.

```python
class ValidationResult(BaseModel):
    valid: bool
    errors: List[str]
```

### TestResult
Provider connection test result.

```python
class TestResult(BaseModel):
    success: bool
    error: Optional[str] = None
```

---

## Testing

### Run Unit Tests

```bash
# Run all tests
pytest backend/services/test_ai_provider_config_service.py -v

# Run specific test
pytest backend/services/test_ai_provider_config_service.py::TestAIProviderConfigService::test_set_provider_config_creates_new -v

# Run with coverage
pytest backend/services/test_ai_provider_config_service.py --cov=backend.services.ai_provider_config_service --cov-report=html
```

### Run Usage Examples

```bash
python backend/services/example_ai_provider_config_usage.py
```

---

## Integration with FastAPI

### Create API Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.services import AIProviderConfigService, AIProviderConfigInput, AIProviderType

router = APIRouter(prefix="/api/ai-providers", tags=["AI Providers"])

@router.post("/config")
async def set_provider_config(
    config: AIProviderConfigInput,
    user_id: int = Depends(get_current_user_id),
    service: AIProviderConfigService = Depends(get_ai_provider_config_service)
):
    """Configure AI provider."""
    return await service.set_provider_config(user_id=user_id, config=config)

@router.get("/config/active")
async def get_active_provider(
    user_id: int = Depends(get_current_user_id),
    service: AIProviderConfigService = Depends(get_ai_provider_config_service)
):
    """Get active provider configuration."""
    config = await service.get_active_provider_config(user_id=user_id)
    if not config:
        raise HTTPException(status_code=404, detail="No active provider configured")
    return config

@router.get("/config")
async def list_providers(
    user_id: int = Depends(get_current_user_id),
    service: AIProviderConfigService = Depends(get_ai_provider_config_service)
):
    """List all configured providers."""
    return service.list_provider_configs(user_id=user_id)

@router.put("/config/{provider}/activate")
async def activate_provider(
    provider: AIProviderType,
    user_id: int = Depends(get_current_user_id),
    service: AIProviderConfigService = Depends(get_ai_provider_config_service)
):
    """Set active provider."""
    return await service.set_active_provider(user_id=user_id, provider=provider)

@router.delete("/config/{provider}")
async def delete_provider(
    provider: AIProviderType,
    user_id: int = Depends(get_current_user_id),
    service: AIProviderConfigService = Depends(get_ai_provider_config_service)
):
    """Remove provider configuration."""
    await service.remove_provider_config(user_id=user_id, provider=provider)
    return {"message": f"Provider {provider.value} removed"}

@router.get("/metadata")
async def get_providers_metadata(
    service: AIProviderConfigService = Depends(get_ai_provider_config_service)
):
    """Get metadata for all supported providers."""
    return service.list_all_providers_metadata()
```

---

## Migration from TypeScript

This Python service maintains **100% feature parity** with the TypeScript version:

### Key Differences

| TypeScript | Python | Notes |
|------------|--------|-------|
| `Map<AIProviderType, Config>` | SQLAlchemy database table | Persistent storage |
| Electron `safeStorage` API | `EncryptionService` | AES-256-GCM encryption |
| File-based JSON storage | SQLAlchemy ORM | Relational database |
| Synchronous methods | Async/await | Modern Python async patterns |
| TypeScript interfaces | Pydantic models | Runtime validation |

### Advantages of Python Version

1. **Database Persistence** - Configurations stored in database, not JSON files
2. **Multi-User Support** - Per-user isolation built into database schema
3. **FastAPI Integration** - Native REST API support
4. **Type Safety** - Pydantic models enforce runtime validation
5. **Comprehensive Testing** - 20+ unit tests with pytest
6. **Audit Logging** - Optional audit trail for compliance

---

## Security Considerations

### API Key Encryption

- Keys encrypted with AES-256-GCM before database storage
- Each encryption uses unique random IV (96-bit)
- Authentication tag prevents tampering
- Keys only decrypted on explicit request

### Database Security

- Foreign key constraints ensure data integrity
- Cascade deletion when user account deleted
- Unique constraint prevents duplicate provider configs per user
- Indexed queries for performance

### Input Validation

- Pydantic models enforce type safety
- Temperature validated (0-2 range)
- Max tokens validated (1-100,000 range)
- Top P validated (0-1 range)
- API keys cannot be empty/whitespace

---

## Troubleshooting

### "Provider not configured" Error

```python
# Check if provider is configured
is_configured = service.is_provider_configured(user_id, provider)
if not is_configured:
    # Configure provider first
    await service.set_provider_config(user_id, config)
```

### "Failed to decrypt API key" Error

```python
# Ensure encryption service uses same key as when encrypted
# Check encryption key consistency in environment variables
```

### "Temperature must be between 0 and 2" Error

```python
# Validate configuration before saving
validation = service.validate_config(config)
if not validation.valid:
    print(validation.errors)
```

---

## License

Part of Justice Companion - Privacy-first legal case management system.

---

## Authors

- **Original TypeScript Implementation:** Justice Companion Team
- **Python Port:** Claude Code (2025)

---

## Changelog

### Version 1.0.0 (2025-01-13)
- Initial Python port from TypeScript
- Full feature parity with TypeScript version
- 10 AI provider support
- SQLAlchemy database persistence
- Comprehensive test suite (20+ tests)
- FastAPI integration examples
- Complete documentation

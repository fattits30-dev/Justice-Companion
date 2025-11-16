# AI Configuration API Documentation

Converted from `electron/ipc-handlers/ai-config.ts` to FastAPI REST endpoints.

## Overview

This module provides endpoints for configuring and managing AI provider settings in Justice Companion. Users can configure different AI providers (OpenAI, Anthropic, Hugging Face, Ollama, or custom endpoints) with their API keys and model preferences.

## Endpoints

### 1. Configure AI Provider

**POST** `/ai/configure`

Configure AI provider settings for the authenticated user.

#### Authentication
- **Required:** Yes (session ID in Authorization header or query param)

#### Request Body

```json
{
  "provider": "openai",           // Required: "openai" | "anthropic" | "huggingface" | "ollama" | "custom"
  "api_key": "sk-...",            // Required: API key (non-empty)
  "model": "gpt-4",               // Required: Model name/ID (non-empty)
  "endpoint": "https://...",      // Optional: Custom API endpoint
  "temperature": 0.7,             // Optional: 0.0-2.0 (default: 0.7)
  "max_tokens": 2048,             // Optional: 1-32000 (default: 2048)
  "top_p": 1.0                    // Optional: 0.0-1.0 (default: 1.0)
}
```

#### Response (Success)

```json
{
  "provider": "openai",
  "message": "AI provider 'openai' configured successfully"
}
```

#### Response (Error)

- **400 Bad Request:** Invalid request (validation errors)
  ```json
  {
    "detail": "API key cannot be empty"
  }
  ```

- **401 Unauthorized:** Session invalid or expired
  ```json
  {
    "detail": "Invalid or expired session"
  }
  ```

- **500 Internal Server Error:** Server error
  ```json
  {
    "detail": "Failed to configure AI provider: ..."
  }
  ```

#### Example Usage

```bash
curl -X POST http://localhost:8000/ai/configure \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "api_key": "sk-...",
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2048
  }'
```

---

### 2. Get Current AI Configuration

**GET** `/ai/config`

Retrieve the current AI configuration for the authenticated user. **API key is NOT returned** for security.

#### Authentication
- **Required:** Yes (session ID in Authorization header or query param)

#### Query Parameters
- None (authentication via header or `session_id` query param)

#### Response (Success - Config Exists)

```json
{
  "provider": "openai",
  "model": "gpt-4",
  "endpoint": null,
  "temperature": 0.7,
  "max_tokens": 2048,
  "top_p": 1.0
}
```

#### Response (Success - No Config)

```json
null
```

#### Response (Error)

- **401 Unauthorized:** Session invalid or expired
- **500 Internal Server Error:** Server error

#### Example Usage

```bash
# Using Authorization header
curl -X GET http://localhost:8000/ai/config \
  -H "Authorization: Bearer <session_id>"

# Using query parameter
curl -X GET "http://localhost:8000/ai/config?session_id=<session_id>"
```

---

### 3. Test AI Provider Connection

**POST** `/ai/test-connection`

Test connection to the configured AI provider to verify API key validity and endpoint reachability.

#### Authentication
- **Required:** Yes (session ID in Authorization header or query param)

#### Request Body

```json
{
  "provider": "openai"  // Required: AI provider to test
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Connection to openai successful (stub implementation)"
}
```

#### Response (Failure)

```json
{
  "success": false,
  "error": "No configuration found for provider 'openai'"
}
```

#### Example Usage

```bash
curl -X POST http://localhost:8000/ai/test-connection \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

---

## Supported AI Providers

| Provider | Value | Description |
|----------|-------|-------------|
| OpenAI | `openai` | OpenAI GPT models (GPT-3.5, GPT-4, etc.) |
| Anthropic | `anthropic` | Anthropic Claude models |
| Hugging Face | `huggingface` | Hugging Face Inference API |
| Ollama | `ollama` | Local Ollama models |
| Custom | `custom` | Custom API endpoint (requires `endpoint` parameter) |

---

## Data Models

### AIConfigureRequest

```python
class AIConfigureRequest(BaseModel):
    provider: Literal["openai", "anthropic", "huggingface", "ollama", "custom"]
    api_key: str  # min_length=1
    model: str    # min_length=1
    endpoint: Optional[str] = None
    temperature: Optional[float] = 0.7  # 0.0-2.0
    max_tokens: Optional[int] = 2048    # 1-32000
    top_p: Optional[float] = 1.0        # 0.0-1.0
```

### AIConfigResponse

```python
class AIConfigResponse(BaseModel):
    provider: str
    model: str
    endpoint: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    top_p: Optional[float] = 1.0
```

### AITestConnectionRequest

```python
class AITestConnectionRequest(BaseModel):
    provider: Literal["openai", "anthropic", "huggingface", "ollama", "custom"]
```

### AITestConnectionResponse

```python
class AITestConnectionResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
```

---

## Security Notes

1. **API Key Storage:** Currently stored in memory (placeholder). Production must:
   - Encrypt API keys before storage (use `EncryptionService`)
   - Store in database with user association
   - Never log API keys

2. **API Key Retrieval:** The `/ai/config` endpoint intentionally does NOT return the API key for security.

3. **Authentication:** All endpoints require valid session authentication.

4. **Rate Limiting:** Consider adding rate limiting for connection tests to prevent abuse.

---

## TODO: Production Implementation

### High Priority

1. **Database Integration**
   - Create `ai_provider_configs` table
   - Store provider, model, endpoint, settings
   - Link to user ID (foreign key)
   - Add indexes on `user_id` and `provider`

2. **API Key Encryption**
   - Integrate with `EncryptionService` (AES-256-GCM)
   - Encrypt `api_key` field before storage
   - Decrypt only when needed for API calls

3. **Real Connection Testing**
   - Implement actual API calls to each provider
   - Validate API key with lightweight request (e.g., model list)
   - Return detailed error messages for debugging

### Medium Priority

4. **AIProviderConfigService Integration**
   - Port TypeScript service to Python
   - Implement provider-specific validation
   - Add model availability checking

5. **Audit Logging**
   - Log all configuration changes
   - Log connection test results
   - Track API key rotations

6. **Rate Limiting**
   - Limit connection tests per user (e.g., 5 per hour)
   - Prevent API key brute-force attempts

### Low Priority

7. **Multi-Provider Support**
   - Allow configuring multiple providers
   - Set one as "active"
   - Switch between providers

8. **Model Metadata**
   - Cache available models per provider
   - Validate model names on configuration
   - Suggest models based on provider

---

## Migration from IPC to REST

### Original IPC Channels
```typescript
ipcMain.handle("ai:configure", ...)        → POST /ai/configure
ipcMain.handle("ai:get-config", ...)       → GET /ai/config
ipcMain.handle("ai:test-connection", ...)  → POST /ai/test-connection
```

### Key Differences

1. **Authentication:**
   - IPC: `sessionId` in request object
   - REST: `Authorization` header or `session_id` query param

2. **Response Format:**
   - IPC: `{ success: boolean, data?: any, error?: string }`
   - REST: HTTP status codes + JSON body

3. **Storage:**
   - IPC: In-memory singleton service
   - REST: In-memory dict (temporary), database (production)

---

## Testing

### Manual Testing with cURL

```bash
# 1. Login first to get session ID
SESSION_ID=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "Test123456!"}' \
  | jq -r '.session.id')

# 2. Configure AI provider
curl -X POST http://localhost:8000/ai/configure \
  -H "Authorization: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "api_key": "sk-test",
    "model": "gpt-4",
    "temperature": 0.7
  }'

# 3. Get configuration
curl -X GET http://localhost:8000/ai/config \
  -H "Authorization: $SESSION_ID"

# 4. Test connection
curl -X POST http://localhost:8000/ai/test-connection \
  -H "Authorization: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

### Automated Testing

TODO: Create pytest test suite at `backend/tests/test_ai_config.py`

```python
def test_configure_ai_provider():
    # Test valid configuration
    # Test validation errors
    # Test authentication requirement
    pass

def test_get_ai_config():
    # Test retrieving config
    # Test null for no config
    # Test API key not returned
    pass

def test_ai_connection():
    # Test successful connection
    # Test missing configuration
    # Test provider mismatch
    pass
```

---

## Related Files

- **TypeScript Source:** `electron/ipc-handlers/ai-config.ts`
- **Backend Route:** `backend/routes/ai_config.py`
- **Main Application:** `backend/main.py` (router registration)
- **Auth Service:** `backend/services/auth_service.py` (session validation)

---

## Questions or Issues?

For questions about this API or to report issues, see the project documentation or contact the development team.

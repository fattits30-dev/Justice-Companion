# AI Configuration API - Quick Reference

## Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/ai/configure` | Configure AI provider | ✅ Yes |
| GET | `/ai/config` | Get current config (no API key) | ✅ Yes |
| POST | `/ai/test-connection` | Test provider connection | ✅ Yes |

---

## Configure AI Provider

**POST** `/ai/configure`

```bash
curl -X POST http://localhost:8000/ai/configure \
  -H "Authorization: <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "api_key": "sk-...",
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 1.0
  }'
```

**Response:**
```json
{
  "provider": "openai",
  "message": "AI provider 'openai' configured successfully"
}
```

---

## Get Current Config

**GET** `/ai/config`

```bash
curl -X GET http://localhost:8000/ai/config \
  -H "Authorization: <session_id>"
```

**Response (configured):**
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

**Response (not configured):**
```json
null
```

---

## Test Connection

**POST** `/ai/test-connection`

```bash
curl -X POST http://localhost:8000/ai/test-connection \
  -H "Authorization: <session_id>" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

**Response (success):**
```json
{
  "success": true,
  "message": "Connection to openai successful (stub implementation)"
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "No configuration found for provider 'openai'"
}
```

---

## Supported Providers

- `openai` - OpenAI GPT models
- `anthropic` - Anthropic Claude models
- `huggingface` - Hugging Face Inference API
- `ollama` - Local Ollama models
- `custom` - Custom API endpoint (requires `endpoint` field)

---

## Validation Rules

| Field | Type | Required | Constraints | Default |
|-------|------|----------|-------------|---------|
| `provider` | string | ✅ Yes | One of: openai, anthropic, huggingface, ollama, custom | - |
| `api_key` | string | ✅ Yes | Non-empty | - |
| `model` | string | ✅ Yes | Non-empty | - |
| `endpoint` | string | ❌ No | URL (for custom provider) | null |
| `temperature` | float | ❌ No | 0.0-2.0 | 0.7 |
| `max_tokens` | int | ❌ No | 1-32000 | 2048 |
| `top_p` | float | ❌ No | 0.0-1.0 | 1.0 |

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired session) |
| 500 | Internal Server Error |

**Example error:**
```json
{
  "detail": "API key cannot be empty"
}
```

---

## Security Notes

1. ⚠️ API keys are stored **in-memory** (temporary stub implementation)
2. ⚠️ API keys are **NOT encrypted** (TODO: production implementation)
3. ✅ API keys are **never returned** in GET `/ai/config`
4. ✅ All endpoints require **session authentication**

---

## TODO: Production Implementation

### Critical
- [ ] Database storage (`ai_provider_configs` table)
- [ ] API key encryption (AES-256-GCM via `EncryptionService`)
- [ ] Real connection testing (actual API calls to providers)

### Important
- [ ] Audit logging for config changes
- [ ] Rate limiting for connection tests
- [ ] Multi-provider support (store multiple, set one active)

### Nice to Have
- [ ] Model validation (check if model exists)
- [ ] Provider metadata caching
- [ ] Auto-suggest models based on provider

---

## Files

- **Route:** `backend/routes/ai_config.py`
- **Docs:** `backend/routes/AI_CONFIG_API.md`
- **Summary:** `backend/routes/AI_CONFIG_MIGRATION_SUMMARY.md`
- **Original:** `electron/ipc-handlers/ai-config.ts`
- **Main:** `backend/main.py` (router registered)

---

## Complete Example Workflow

```bash
# Step 1: Login
SESSION=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123456!"}' \
  | jq -r '.session.id')

echo "Session ID: $SESSION"

# Step 2: Configure OpenAI
curl -X POST http://localhost:8000/ai/configure \
  -H "Authorization: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "api_key": "sk-test-key-12345",
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2048
  }' | jq

# Step 3: Get current config
curl -X GET http://localhost:8000/ai/config \
  -H "Authorization: $SESSION" | jq

# Step 4: Test connection
curl -X POST http://localhost:8000/ai/test-connection \
  -H "Authorization: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' | jq
```

---

## Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000"

# 1. Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "admin",
    "password": "Admin123456!"
})
session_id = response.json()["session"]["id"]

# 2. Configure AI provider
headers = {"Authorization": session_id}
config_data = {
    "provider": "openai",
    "api_key": "sk-...",
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2048
}
response = requests.post(f"{BASE_URL}/ai/configure", json=config_data, headers=headers)
print(response.json())

# 3. Get config
response = requests.get(f"{BASE_URL}/ai/config", headers=headers)
print(response.json())

# 4. Test connection
response = requests.post(f"{BASE_URL}/ai/test-connection", json={"provider": "openai"}, headers=headers)
print(response.json())
```

---

## Testing with FastAPI Swagger UI

1. Start backend: `python -m backend.main`
2. Open browser: http://localhost:8000/docs
3. Navigate to "ai-configuration" section
4. Click "Authorize" and enter session ID
5. Test endpoints interactively

---

**Status:** ✅ Stub implementation complete and functional
**Next:** Database integration, encryption, real API testing

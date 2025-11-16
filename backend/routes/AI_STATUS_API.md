# AI Status API Documentation

**Migrated from:** `electron/ipc-handlers/ai-status.ts`

## Overview

The AI Status API provides endpoints for monitoring and managing the Python AI service that powers the legal research assistant in Justice Companion.

**Base Path:** `/ai`

**Authentication:** NONE REQUIRED (system status endpoints)

---

## Endpoints

### 1. GET /ai/status

Get comprehensive Python AI service status.

**Request:**
```http
GET /ai/status
```

**Response:** `200 OK`
```json
{
  "running": true,
  "healthy": true,
  "port": 5051,
  "host": "127.0.0.1",
  "modelProvider": "OpenAI",
  "modelReady": true,
  "error": null
}
```

**Response Fields:**
- `running` (boolean) - Whether the Python AI service process is running
- `healthy` (boolean) - Whether the service passed health checks
- `port` (integer) - Port the AI service is listening on (default: 5051)
- `host` (string) - Host the AI service is bound to (default: 127.0.0.1)
- `modelProvider` (string) - AI model provider (OpenAI, HuggingFace, local, etc.)
- `modelReady` (boolean) - Whether the model is loaded and ready for inference
- `error` (string | null) - Error message if service is unhealthy

**Current Implementation:** Stub
- Returns `running: true, healthy: true, modelProvider: "Stub", modelReady: false`
- TODO: Integrate with PythonProcessManager

---

### 2. POST /ai/restart

Restart the Python AI service.

**Request:**
```http
POST /ai/restart
```

**Response:** `200 OK`
```json
{
  "success": true,
  "error": null
}
```

**Response Fields:**
- `success` (boolean) - Whether the restart succeeded
- `error` (string | null) - Error message if restart failed

**Behavior:**
1. Stops the Python AI service process
2. Starts a new Python AI service process
3. Waits 2 seconds for stabilization
4. Performs health check to verify service is running

**Current Implementation:** Stub
- Returns `success: true`
- TODO: Implement actual restart functionality via PythonProcessManager

---

### 3. GET /ai/available

Check if AI service is available (simple boolean check).

**Request:**
```http
GET /ai/available
```

**Response:** `200 OK`
```json
true
```

**Response:** Boolean (not wrapped in object)
- `true` - Service is available
- `false` - Service is unavailable

**Current Implementation:** Stub
- Returns `true`
- TODO: Implement actual availability check via PythonProcessManager

---

### 4. GET /ai/config

Get AI service configuration from environment variables.

**Request:**
```http
GET /ai/config
```

**Response:** `200 OK`
```json
{
  "hasHFToken": true,
  "hasOpenAIKey": false,
  "useLocalModels": false,
  "configured": true,
  "preferredProvider": "huggingface"
}
```

**Response Fields:**
- `hasHFToken` (boolean) - Whether HuggingFace token is configured (`HF_TOKEN` or `HUGGINGFACE_TOKEN` env var)
- `hasOpenAIKey` (boolean) - Whether OpenAI API key is configured (`OPENAI_API_KEY` env var)
- `useLocalModels` (boolean) - Whether local models are enabled (`USE_LOCAL_MODELS=true` env var)
- `configured` (boolean) - Whether any AI provider is configured
- `preferredProvider` (string) - Preferred AI provider based on configuration

**Preferred Provider Priority:**
1. `local` - If `USE_LOCAL_MODELS=true`
2. `huggingface` - If `HF_TOKEN` or `HUGGINGFACE_TOKEN` is set
3. `openai` - If `OPENAI_API_KEY` is set
4. `none` - If no provider is configured

**Current Implementation:** FULLY IMPLEMENTED
- Checks actual environment variables
- Returns real configuration status

---

## Environment Variables

The AI service requires at least one of the following environment variables:

```bash
# HuggingFace (for legal-specific models)
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
# OR
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx

# OpenAI (for GPT-4 legal research)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# Local models (offline mode)
USE_LOCAL_MODELS=true
```

**Get tokens:**
- HuggingFace: https://huggingface.co/settings/tokens
- OpenAI: https://platform.openai.com/api-keys

---

## Error Handling

All endpoints return error details in the response body:

**GET /ai/status** - Returns error in `error` field
```json
{
  "running": false,
  "healthy": false,
  "port": 5051,
  "host": "127.0.0.1",
  "modelProvider": "Error",
  "modelReady": false,
  "error": "Python process manager not initialized"
}
```

**POST /ai/restart** - Returns error in `error` field
```json
{
  "success": false,
  "error": "Service failed to start after restart"
}
```

**GET /ai/available** - Returns `false` on error

**GET /ai/config** - Returns safe defaults on error
```json
{
  "hasHFToken": false,
  "hasOpenAIKey": false,
  "useLocalModels": false,
  "configured": false,
  "preferredProvider": "none"
}
```

---

## Implementation Status

### Completed
- ✅ API endpoint structure
- ✅ Pydantic response models
- ✅ Environment variable checking (GET /ai/config)
- ✅ Router registration in main.py
- ✅ Comprehensive error handling

### TODO (Integration Phase)
- ⏳ Integrate with `PythonProcessManager` service
  - Process lifecycle management (start/stop/restart)
  - Health check implementation
  - Status monitoring
- ⏳ Implement actual service health checks
  - HTTP health endpoint on Python service
  - Model readiness detection
  - Port availability checking
- ⏳ Implement actual restart functionality
  - Graceful shutdown of Python process
  - Clean startup with new process
  - Connection pool management

---

## Testing

### Manual Testing

```bash
# Start the backend
cd "F:\Justice Companion take 2"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Test endpoints (in separate terminal)
curl http://localhost:8000/ai/status
curl http://localhost:8000/ai/available
curl http://localhost:8000/ai/config
curl -X POST http://localhost:8000/ai/restart
```

### Expected Responses (Stub Implementation)

```bash
# GET /ai/status
{"running":true,"healthy":true,"port":5051,"host":"127.0.0.1","modelProvider":"Stub","modelReady":false,"error":null}

# GET /ai/available
true

# GET /ai/config (varies based on environment)
{"hasHFToken":false,"hasOpenAIKey":false,"useLocalModels":false,"configured":false,"preferredProvider":"none"}

# POST /ai/restart
{"success":true,"error":null}
```

---

## Migration Notes

### Changes from TypeScript IPC Handlers

1. **Protocol Change:**
   - From: Electron IPC (`ipcMain.handle`)
   - To: HTTP REST API (`@router.get`, `@router.post`)

2. **Response Format:**
   - TypeScript: Direct object return
   - Python: Pydantic models with camelCase aliases

3. **Error Handling:**
   - TypeScript: Returns error in response object
   - Python: Returns error in response object (same pattern)

4. **Dependencies:**
   - TypeScript: `PythonProcessManager` service
   - Python: TODO - implement equivalent service

### Stub Implementation Strategy

All endpoints return stub data until `PythonProcessManager` is implemented:
- **GET /ai/status**: Returns healthy stub status
- **POST /ai/restart**: Returns success (no-op)
- **GET /ai/available**: Returns true
- **GET /ai/config**: Returns REAL environment variable data

This allows frontend integration testing while backend integration is in progress.

---

## API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Navigate to these URLs after starting the backend to explore and test the API.

---

## Related Files

- **Source (TypeScript):** `electron/ipc-handlers/ai-status.ts`
- **Migrated (Python):** `backend/routes/ai_status.py`
- **Router Registration:** `backend/main.py` (line 31, 93)
- **Dependencies (TODO):**
  - `backend/services/python_process_manager.py` (not yet created)
  - Python AI service integration

---

## Next Steps

1. **Implement PythonProcessManager Service:**
   - Process lifecycle management
   - Health check endpoint integration
   - Status monitoring

2. **Create Python AI Service Health Endpoint:**
   - Add `/health` endpoint to Python AI service
   - Return model provider and readiness status

3. **Integrate Frontend:**
   - Update Electron frontend to call HTTP API instead of IPC
   - Replace `window.electron.ai.getStatus()` with `fetch('/ai/status')`

4. **Add Integration Tests:**
   - Test restart functionality
   - Test health check behavior
   - Test error scenarios

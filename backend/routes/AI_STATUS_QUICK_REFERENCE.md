# AI Status API - Quick Reference

## Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/ai/status` | Get Python AI service status | No |
| POST | `/ai/restart` | Restart Python AI service | No |
| GET | `/ai/available` | Check if AI service is available | No |
| GET | `/ai/config` | Get AI configuration from env vars | No |

## Quick Test

```bash
# Start backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Test endpoints
curl http://localhost:8000/ai/status
curl http://localhost:8000/ai/available
curl http://localhost:8000/ai/config
curl -X POST http://localhost:8000/ai/restart
```

## Environment Variables

```bash
# At least one of these is required:
HF_TOKEN=hf_xxxxxxxxxxxx                  # HuggingFace
OPENAI_API_KEY=sk-xxxxxxxxxxxx            # OpenAI
USE_LOCAL_MODELS=true                      # Local models
```

## Status Responses

### GET /ai/status
```json
{
  "running": true,
  "healthy": true,
  "port": 5051,
  "host": "127.0.0.1",
  "modelProvider": "Stub",
  "modelReady": false,
  "error": null
}
```

### POST /ai/restart
```json
{
  "success": true,
  "error": null
}
```

### GET /ai/available
```json
true
```

### GET /ai/config
```json
{
  "hasHFToken": false,
  "hasOpenAIKey": false,
  "useLocalModels": false,
  "configured": false,
  "preferredProvider": "none"
}
```

## Implementation Status

- **GET /ai/status**: Stub (TODO: integrate PythonProcessManager)
- **POST /ai/restart**: Stub (TODO: implement restart)
- **GET /ai/available**: Stub (TODO: check actual availability)
- **GET /ai/config**: FULLY IMPLEMENTED

## Files

- `backend/routes/ai_status.py` - Route handlers (229 lines)
- `backend/routes/AI_STATUS_API.md` - Full API documentation
- `backend/routes/AI_STATUS_MIGRATION_SUMMARY.md` - Migration details

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

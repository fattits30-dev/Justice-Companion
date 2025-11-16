# Action Logs API Routes

**Migrated from:** `electron/ipc-handlers/action-logs.ts`
**Created:** 2025-11-13
**Status:** ✅ Complete with stub implementation

## Overview

Action Logs API provides system monitoring endpoints for debugging and auditing action execution across all services. These endpoints track service operations, failures, and performance metrics in an in-memory circular buffer.

**Key Features:**
- ✅ 5 REST API endpoints (migrated from 5 IPC handlers)
- ✅ No authentication required (system monitoring tools)
- ✅ In-memory circular buffer (max 1000 logs)
- ⏳ Stub implementation with TODO comments for future integration

## API Endpoints

### 1. Get Recent Actions
```http
GET /action-logs/recent?limit=100
```

**Query Parameters:**
- `limit` (optional): Maximum number of logs (1-1000, default: 100)

**Response:**
```json
{
  "actions": [
    {
      "timestamp": "2025-11-13T12:00:00Z",
      "service": "CaseService",
      "action": "createCase",
      "status": "success",
      "duration": 45,
      "error": null
    }
  ]
}
```

**Use Case:** Monitor overall system activity

---

### 2. Get Failed Actions
```http
GET /action-logs/failed?limit=50
```

**Query Parameters:**
- `limit` (optional): Maximum number of failed logs (1-1000, default: 50)

**Response:**
```json
{
  "actions": [
    {
      "timestamp": "2025-11-13T12:05:00Z",
      "service": "ChatService",
      "action": "sendMessage",
      "status": "failed",
      "duration": 250,
      "error": "OpenAI API rate limit exceeded"
    }
  ]
}
```

**Use Case:** Debug and monitor errors

---

### 3. Get Actions by Service
```http
GET /action-logs/service/{service}?limit=100
```

**Path Parameters:**
- `service` (required): Service name (e.g., 'CaseService', 'ChatService')

**Query Parameters:**
- `limit` (optional): Maximum number of logs (1-1000, default: 100)

**Response:**
```json
{
  "actions": [
    {
      "timestamp": "2025-11-13T12:00:00Z",
      "service": "CaseService",
      "action": "createCase",
      "status": "success",
      "duration": 45,
      "error": null
    }
  ]
}
```

**Use Case:** Monitor specific service performance

---

### 4. Get Action Statistics
```http
GET /action-logs/stats
```

**Response:**
```json
{
  "stats": {
    "total": 150,
    "failed": 5,
    "byService": {
      "CaseService": 50,
      "AuthenticationService": 30,
      "ChatService": 70
    }
  }
}
```

**Use Case:** Dashboard metrics and health monitoring

---

### 5. Clear Action Logs
```http
POST /action-logs/clear
```

**Response:**
```json
{
  "message": "Action logs cleared successfully"
}
```

**Use Case:** Reset logs during development/testing

**⚠️ WARNING:** Irreversible operation - all in-memory logs will be deleted

---

## Pydantic Models

### `ActionLog`
```python
class ActionLog(BaseModel):
    timestamp: str          # ISO 8601 format
    service: str            # Service name
    action: str             # Action name
    status: str             # 'success' or 'failed'
    duration: int           # Duration in milliseconds
    error: Optional[str]    # Error message if failed
```

### `ActionLogsResponse`
```python
class ActionLogsResponse(BaseModel):
    actions: List[ActionLog]
```

### `ActionStatsResponse`
```python
class ActionStatsResponse(BaseModel):
    stats: Dict[str, Any]   # total, failed, byService
```

### `ClearLogsResponse`
```python
class ClearLogsResponse(BaseModel):
    message: str
```

---

## Current Implementation

### In-Memory Storage (Circular Buffer)

```python
from collections import deque

MAX_LOG_SIZE = 1000  # Maximum logs to keep
_action_logs: deque = deque(maxlen=MAX_LOG_SIZE)
```

**Behavior:**
- Automatically removes oldest logs when limit reached
- Fast O(1) append and pop operations
- Thread-safe for single-process deployments

**Limitations:**
- ❌ Data lost on server restart
- ❌ Not suitable for distributed deployments
- ❌ No long-term storage or archival

---

## Sample Data

The implementation includes sample data for testing:

```python
[
    {
        "timestamp": "2025-11-13T12:00:00Z",
        "service": "CaseService",
        "action": "createCase",
        "status": "success",
        "duration": 45,
        "error": null
    },
    {
        "timestamp": "2025-11-13T12:05:00Z",
        "service": "ChatService",
        "action": "sendMessage",
        "status": "failed",
        "duration": 250,
        "error": "OpenAI API rate limit exceeded"
    }
]
```

---

## Public API for Logging

Other routes can log actions using:

```python
from backend.routes.action_logs import log_action

# Log successful action
log_action("CaseService", "createCase", "success", 45)

# Log failed action
log_action("ChatService", "sendMessage", "failed", 250,
           error="OpenAI API rate limit exceeded")
```

**Example Integration:**
```python
@router.post("/cases")
async def create_case(...):
    start_time = time.time()
    try:
        # Your logic here
        duration = int((time.time() - start_time) * 1000)
        log_action("CaseService", "createCase", "success", duration)
        return result
    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        log_action("CaseService", "createCase", "failed", duration, str(e))
        raise
```

---

## Future Work (TODO)

### 1. Integration with TypeScript action-logger

**Current:** Stub implementation with in-memory storage
**Target:** Integrate with `src/utils/action-logger.ts`

```typescript
// src/utils/action-logger.ts
export function getRecentActions(limit: number): ActionLog[]
export function getFailedActions(limit: number): ActionLog[]
export function getActionsByService(serviceName: string, limit: number): ActionLog[]
export function getActionStats(): ActionStats
export function clearActionLogs(): void
```

**Action Items:**
- [ ] Create shared action logging service (Python + TypeScript)
- [ ] Implement IPC bridge for action log synchronization
- [ ] Migrate in-memory storage to shared memory or database

---

### 2. Database Persistence

**Current:** In-memory deque (lost on restart)
**Target:** SQLite database table

```sql
CREATE TABLE action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    service TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'success' or 'failed'
    duration INTEGER NOT NULL,  -- milliseconds
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_action_logs_timestamp ON action_logs(timestamp DESC);
CREATE INDEX idx_action_logs_service ON action_logs(service);
CREATE INDEX idx_action_logs_status ON action_logs(status);
```

**Action Items:**
- [ ] Create `action_logs` table migration
- [ ] Implement database repository pattern
- [ ] Add async database writes for performance
- [ ] Add retention policy (auto-delete logs older than 30 days)

---

### 3. Log Rotation and Archival

**Current:** Fixed 1000-log circular buffer
**Target:** Automatic rotation and archival

**Features:**
- Rotate logs daily/weekly
- Archive old logs to compressed files
- Configurable retention policy
- Export logs to external systems (Elasticsearch, Splunk)

**Action Items:**
- [ ] Implement log rotation scheduler
- [ ] Add gzip compression for archived logs
- [ ] Create log export API endpoint
- [ ] Add integration with monitoring tools (Prometheus, Grafana)

---

### 4. Advanced Filtering and Search

**Current:** Basic filtering by service and status
**Target:** Advanced query capabilities

```http
GET /action-logs/search?service=CaseService&status=failed&from=2025-11-01&to=2025-11-13
```

**Action Items:**
- [ ] Add date range filtering
- [ ] Add action name filtering
- [ ] Add duration threshold filtering (e.g., duration > 1000ms)
- [ ] Add pagination support
- [ ] Add sorting options

---

### 5. Real-Time Streaming

**Current:** Poll-based monitoring
**Target:** WebSocket streaming for real-time logs

```javascript
// Frontend
const ws = new WebSocket('ws://localhost:8000/action-logs/stream');
ws.onmessage = (event) => {
    const log = JSON.parse(event.data);
    console.log('New action:', log);
};
```

**Action Items:**
- [ ] Implement WebSocket endpoint
- [ ] Add server-sent events (SSE) support
- [ ] Add log filtering on WebSocket streams
- [ ] Add reconnection logic for clients

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "detail": "Failed to get recent actions: <error message>"
}
```

**HTTP Status Codes:**
- `200 OK` - Successful request
- `201 Created` - Log cleared successfully
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server-side error

---

## Testing

### Manual Testing with cURL

```bash
# Get recent actions
curl http://localhost:8000/action-logs/recent?limit=10

# Get failed actions
curl http://localhost:8000/action-logs/failed?limit=5

# Get actions by service
curl http://localhost:8000/action-logs/service/CaseService?limit=20

# Get statistics
curl http://localhost:8000/action-logs/stats

# Clear logs
curl -X POST http://localhost:8000/action-logs/clear
```

### Automated Testing (Pytest)

```python
# tests/test_action_logs.py

def test_get_recent_actions(client):
    response = client.get("/action-logs/recent?limit=10")
    assert response.status_code == 200
    assert "actions" in response.json()

def test_get_failed_actions(client):
    response = client.get("/action-logs/failed?limit=5")
    assert response.status_code == 200
    assert all(a["status"] == "failed" for a in response.json()["actions"])

def test_log_action_integration():
    from backend.routes.action_logs import log_action, _action_logs
    log_action("TestService", "testAction", "success", 100)
    assert len(_action_logs) > 0
    assert _action_logs[-1].service == "TestService"
```

---

## Migration Notes

### Differences from TypeScript IPC Handlers

| Feature | TypeScript IPC | Python FastAPI | Notes |
|---------|---------------|----------------|-------|
| **Protocol** | Electron IPC | HTTP REST | More flexible for distributed systems |
| **Authentication** | None (trusted renderer) | None (system monitoring) | Consistent with original design |
| **Storage** | In-memory (src/utils/action-logger.ts) | In-memory (deque) | Temporary - needs integration |
| **Error Handling** | IPCErrorCode enum | HTTPException | Standard HTTP status codes |
| **Response Format** | `successResponse({ actions })` | `ActionLogsResponse` | Pydantic validation |

### API Route Mapping

| TypeScript IPC Channel | FastAPI Route | Method |
|------------------------|---------------|--------|
| `action-logs:get-recent` | `/action-logs/recent` | GET |
| `action-logs:get-failed` | `/action-logs/failed` | GET |
| `action-logs:get-by-service` | `/action-logs/service/{service}` | GET |
| `action-logs:get-stats` | `/action-logs/stats` | GET |
| `action-logs:clear` | `/action-logs/clear` | POST |

---

## Security Considerations

### Why No Authentication?

Action logs are **system monitoring tools** used for debugging and development. They:
- Do not contain sensitive user data (only service/action names)
- Are primarily used during development
- Run on localhost only (not exposed to internet)

### Production Recommendations

For production deployments, consider:

1. **Add Authentication:**
   ```python
   @router.get("/recent", dependencies=[Depends(require_admin)])
   ```

2. **Rate Limiting:**
   ```python
   from slowapi import Limiter

   @limiter.limit("10/minute")
   @router.get("/recent")
   ```

3. **IP Whitelisting:**
   ```python
   async def verify_internal_ip(request: Request):
       if request.client.host not in ["127.0.0.1", "localhost"]:
           raise HTTPException(403, "Access denied")
   ```

4. **Sanitize Logs:**
   - Never log sensitive data (passwords, tokens, PII)
   - Truncate error messages to prevent info leakage
   - Use structured logging with redaction

---

## Performance Considerations

### Memory Usage

- **Current:** ~1KB per log entry × 1000 = ~1MB total
- **With Database:** Minimal memory (logs stored on disk)

### Query Performance

- **Recent/Failed/Service:** O(n) iteration (fast for 1000 items)
- **Stats Calculation:** O(n) single pass
- **With Database + Indexes:** O(log n) for queries

### Recommendations

1. **Short-term (in-memory):** Current implementation is fine for < 10,000 logs
2. **Long-term (database):** Add indexes on `timestamp`, `service`, `status`
3. **High-load systems:** Use async database writes + batch inserts

---

## Related Files

- **Source:** `electron/ipc-handlers/action-logs.ts` (78 lines)
- **Backend Route:** `backend/routes/action_logs.py` (373 lines)
- **Main Registration:** `backend/main.py` (lines 29, 88)
- **Original Utility:** `src/utils/action-logger.ts` (not yet integrated)

---

## Changelog

### Version 1.0.0 (2025-11-13)
- ✅ Created 5 FastAPI endpoints (migrated from 5 IPC handlers)
- ✅ Implemented in-memory circular buffer storage
- ✅ Added Pydantic models for request/response validation
- ✅ Added sample data for testing
- ✅ Registered router in `backend/main.py`
- ✅ Added comprehensive documentation
- ⏳ TODO: Integrate with `src/utils/action-logger.ts`
- ⏳ TODO: Add database persistence
- ⏳ TODO: Add log rotation and archival

---

## Contact & Support

For questions or issues with Action Logs API:
1. Check this README for implementation details
2. Review TODOs for planned features
3. See related TypeScript files for original logic
4. Test endpoints using Swagger UI: http://localhost:8000/docs

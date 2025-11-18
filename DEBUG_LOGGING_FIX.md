# Debug Logging Fix - HuggingFace Streaming Issue

## Problem Summary

Debug logs added to `unified_ai_service.py` were not appearing in console output despite server reload, making it impossible to debug why HuggingFace streaming was returning 0 characters.

## Root Cause Analysis

### What Was Happening

1. ✅ Server WAS reloading correctly (uvicorn with `reload=True`)
2. ✅ New code WAS being executed
3. ❌ **Logger level was not configured** - Default level was WARNING (30), but we were using INFO (20)
4. ❌ No `logging.basicConfig()` call in main.py to configure root logger

### Why Debug Logs Weren't Appearing

Python's default logging level is **WARNING (30)**, which suppresses:
- DEBUG (10) messages
- INFO (20) messages

Our debug statements used `logger.info()`, which has level INFO (20), so they were being silently discarded.

### Verification

```bash
python -c "import logging; print('Default log level:', logging.getLogger().level)"
# Output: Default log level: 30 (WARNING)
```

## Solution Implemented

### Fix 1: Configure Logging in main.py

Added logging configuration **BEFORE** any imports that create loggers:

```python
# backend/main.py (lines 11-25)
import logging

# Configure logging BEFORE any imports that create loggers
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
```

This ensures all logger instances throughout the application inherit the INFO level.

### Fix 2: Added Strategic Debug Logs

**Route Handler Entry Point** (`chat_enhanced.py` line 379):
```python
logger.info(f"[DEBUG] /chat/stream endpoint called - user_id={user_id}, message={request.message[:50]}, provider={ai_service.config.provider}")
```

**Stream Function Entry** (`chat_enhanced.py` lines 263-264):
```python
logger.info(f"[DEBUG] stream_ai_chat called: message={message[:50]}, conversation_id={conversation_id}, ai_service={type(ai_service)}")
logger.info(f"[DEBUG] AI Service Config - Provider: {ai_service.config.provider}, Model: {ai_service.config.model}")
```

**AI Service Stream Entry** (`unified_ai_service.py` line 728):
```python
logger.info(f"[DEBUG] stream_chat called with provider={self.config.provider}, messages={len(messages)}")
```

**Provider Routing** (`unified_ai_service.py` lines 743, 751, 761):
```python
# Anthropic
logger.info(f"[DEBUG] Routing to Anthropic streaming")

# HuggingFace/Qwen
logger.info(f"[DEBUG] Routing to HuggingFace/Qwen streaming")

# OpenAI-compatible
logger.info(f"[DEBUG] Routing to OpenAI-compatible streaming for provider: {self.config.provider}")
```

**HuggingFace Stream Details** (`unified_ai_service.py` lines 842, 854, 863):
```python
logger.info(f"[DEBUG] Creating HuggingFace stream with model={self.config.model}, messages={len(formatted_messages)}")
logger.info(f"[DEBUG] Stream created successfully")
logger.info(f"[DEBUG] Chunk #{chunk_count}: {chunk}")
```

## Expected Debug Output (After Fix)

When testing HuggingFace chat streaming, you should now see:

```
2025-01-18 12:00:00 - backend.routes.chat_enhanced - INFO - [DEBUG] /chat/stream endpoint called - user_id=1, message=test message, provider=huggingface
2025-01-18 12:00:00 - backend.routes.chat_enhanced - INFO - [DEBUG] stream_ai_chat called: message=test message, conversation_id=None, ai_service=<class 'UnifiedAIService'>
2025-01-18 12:00:00 - backend.routes.chat_enhanced - INFO - [DEBUG] AI Service Config - Provider: huggingface, Model: Qwen/Qwen2.5-72B-Instruct
2025-01-18 12:00:00 - backend.services.unified_ai_service - INFO - [DEBUG] stream_chat called with provider=huggingface, messages=2
2025-01-18 12:00:00 - backend.services.unified_ai_service - INFO - [DEBUG] Routing to HuggingFace/Qwen streaming
2025-01-18 12:00:00 - backend.services.unified_ai_service - INFO - [DEBUG] Creating HuggingFace stream with model=Qwen/Qwen2.5-72B-Instruct, messages=2
2025-01-18 12:00:00 - backend.services.unified_ai_service - INFO - [DEBUG] Stream created successfully
2025-01-18 12:00:00 - backend.services.unified_ai_service - INFO - [DEBUG] Chunk #1: <chunk details>
```

## Next Steps for Debugging HuggingFace Issue

Now that logging is working, you can:

1. **Verify Provider Detection**: Check that the provider is correctly set to `huggingface`
2. **Check Stream Creation**: Verify the HuggingFace InferenceClient creates a stream
3. **Inspect Chunks**: See if chunks are received but have no content
4. **Monitor Executor**: Check if ThreadPoolExecutor is properly iterating
5. **API Response**: Log the raw API response structure

## Testing Instructions

1. **Start Backend Server**:
   ```bash
   cd backend
   python main.py
   ```

2. **Send Test Message** (from frontend or curl):
   ```bash
   curl -X POST http://localhost:8000/chat/stream \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "conversationId": null, "caseId": null, "useRAG": false}'
   ```

3. **Check Console Output**: You should now see all debug logs showing the complete flow

## Files Modified

1. **backend/main.py** (lines 11-25): Added `logging.basicConfig()`
2. **backend/routes/chat_enhanced.py** (lines 263-264, 379): Added entry point logs
3. **backend/services/unified_ai_service.py** (already had logs, now visible)

## Why This Approach Works

1. **Early Configuration**: Setting up logging before imports ensures all loggers inherit the config
2. **Explicit Level**: `level=logging.INFO` allows both INFO and DEBUG messages
3. **StreamHandler**: Outputs to `sys.stdout` (console), ensuring visibility
4. **Format String**: Includes timestamp, logger name, and level for easy debugging

## Additional Debugging Tips

If logs still don't appear:

1. **Check Log Handlers**:
   ```python
   print("Root logger handlers:", logging.getLogger().handlers)
   ```

2. **Verify Logger Level**:
   ```python
   logger = logging.getLogger(__name__)
   print(f"Logger level: {logger.level}")
   ```

3. **Force Logger Level**:
   ```python
   logger.setLevel(logging.DEBUG)
   ```

4. **Check Uvicorn Log Config**:
   - Ensure uvicorn isn't overriding the log config
   - May need to set `log_config=None` in `uvicorn.run()`

## Summary

The issue was **not** that the code wasn't reloading or executing. The issue was that Python's logging system was configured at the default WARNING level, silently discarding all INFO and DEBUG messages. By adding `logging.basicConfig()` with `level=logging.INFO`, we've enabled visibility into the entire execution flow.

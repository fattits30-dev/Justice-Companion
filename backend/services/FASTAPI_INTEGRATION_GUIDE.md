# FastAPI Integration Guide for AI SDK Service

This guide shows how to integrate the AI SDK Service into FastAPI routes for the Justice Companion backend.

## Overview

The AI SDK Service provides a unified interface for multiple AI providers. This guide demonstrates how to:
1. Create FastAPI endpoints for AI operations
2. Handle streaming responses
3. Manage provider configuration
4. Implement proper error handling
5. Add authentication and authorization

---

## Quick Integration Example

### 1. Create AI Configuration Route

**File:** `backend/routes/ai_chat.py`

```python
"""
AI Chat routes for Justice Companion.

Provides endpoints for:
- Chat completions (streaming and non-streaming)
- Provider configuration
- Model selection
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel, Field
import json

from backend.services.ai_sdk_service import (
    AISDKService,
    AIProviderConfig,
    AIProviderType,
    ChatMessage,
    MessageRole,
    create_ai_sdk_service,
)
from backend.services.audit_logger import AuditLogger
from backend.models.session import get_current_user


# ============================================================================
# Request/Response Models
# ============================================================================

class ChatRequest(BaseModel):
    """Request model for chat completion."""
    messages: List[ChatMessage] = Field(..., description="Chat messages")
    provider: Optional[AIProviderType] = Field(None, description="AI provider")
    model: Optional[str] = Field(None, description="Model name")
    stream: bool = Field(False, description="Enable streaming")
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(2000, gt=0, le=100000)


class ChatResponse(BaseModel):
    """Response model for chat completion."""
    response: str = Field(..., description="AI response text")
    provider: str = Field(..., description="Provider used")
    model: str = Field(..., description="Model used")
    token_count: Optional[int] = Field(None, description="Token count")


class ProviderConfigRequest(BaseModel):
    """Request model for updating provider configuration."""
    provider: AIProviderType = Field(..., description="Provider type")
    api_key: str = Field(..., min_length=1, description="API key")
    model: str = Field(..., description="Model name")
    endpoint: Optional[str] = Field(None, description="Custom endpoint")


# ============================================================================
# Router Setup
# ============================================================================

router = APIRouter(prefix="/api/ai", tags=["AI"])


# ============================================================================
# Dependency: Get AI Service
# ============================================================================

async def get_ai_service(
    request: Request,
    current_user = Depends(get_current_user)
) -> AISDKService:
    """
    Dependency to get configured AI service instance.

    Retrieves AI configuration from database based on user preferences.
    Falls back to environment variables if not configured.
    """
    # Get configuration from database or environment
    # This is a simplified example - implement your own config management

    # Example: Get from environment
    import os

    config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key=os.getenv("OPENAI_API_KEY", ""),
        model=os.getenv("OPENAI_MODEL", "gpt-4-turbo"),
        temperature=0.7,
        max_tokens=2000
    )

    # Get audit logger from app state
    audit_logger = request.app.state.audit_logger if hasattr(request.app.state, 'audit_logger') else None

    service = AISDKService(config, audit_logger=audit_logger)

    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set up your AI provider in settings."
        )

    return service


# ============================================================================
# Routes
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    service: AISDKService = Depends(get_ai_service),
    current_user = Depends(get_current_user)
):
    """
    Non-streaming chat completion.

    Returns complete AI response after generation is finished.
    """
    try:
        # Update config if provider/model specified
        if request.provider or request.model:
            new_config = AIProviderConfig(
                provider=request.provider or service.config.provider,
                api_key=service.config.api_key,
                model=request.model or service.config.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            service.update_config(new_config)

        # Get response
        response = await service.chat(request.messages)

        return ChatResponse(
            response=response,
            provider=service.get_provider().value,
            model=service.get_model_name(),
            token_count=len(response.split())  # Approximate
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat completion failed: {str(e)}"
        )


@router.post("/chat/stream")
async def chat_completion_stream(
    request: ChatRequest,
    service: AISDKService = Depends(get_ai_service),
    current_user = Depends(get_current_user)
):
    """
    Streaming chat completion.

    Returns Server-Sent Events (SSE) stream of tokens.
    """
    try:
        # Update config if needed
        if request.provider or request.model:
            new_config = AIProviderConfig(
                provider=request.provider or service.config.provider,
                api_key=service.config.api_key,
                model=request.model or service.config.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            service.update_config(new_config)

        async def generate():
            """Generate SSE stream."""
            full_response = []

            def on_token(token: str):
                """Send token as SSE event."""
                full_response.append(token)
                # Send as SSE format
                event_data = json.dumps({"type": "token", "content": token})
                return f"data: {event_data}\n\n"

            def on_complete(response: str):
                """Send completion event."""
                event_data = json.dumps({
                    "type": "complete",
                    "content": response,
                    "provider": service.get_provider().value,
                    "model": service.get_model_name()
                })
                return f"data: {event_data}\n\n"

            def on_error(error: Exception):
                """Send error event."""
                event_data = json.dumps({
                    "type": "error",
                    "message": str(error)
                })
                return f"data: {event_data}\n\n"

            # Stream chat
            await service.stream_chat(
                request.messages,
                on_token=lambda token: generate.__globals__.get('_send_token')(token),
                on_complete=lambda response: generate.__globals__.get('_send_complete')(response),
                on_error=lambda error: generate.__globals__.get('_send_error')(error)
            )

            # Alternative simpler implementation using queue
            import asyncio
            from asyncio import Queue

            queue: Queue = Queue()

            async def handle_stream():
                def on_token(token: str):
                    asyncio.create_task(queue.put(("token", token)))

                def on_complete(response: str):
                    asyncio.create_task(queue.put(("complete", response)))

                def on_error(error: Exception):
                    asyncio.create_task(queue.put(("error", str(error))))

                await service.stream_chat(
                    request.messages,
                    on_token=on_token,
                    on_complete=on_complete,
                    on_error=on_error
                )

                await queue.put(("done", None))

            # Start streaming in background
            asyncio.create_task(handle_stream())

            # Yield events from queue
            while True:
                event_type, data = await queue.get()

                if event_type == "done":
                    break

                if event_type == "token":
                    yield f"data: {json.dumps({'type': 'token', 'content': data})}\n\n"
                elif event_type == "complete":
                    yield f"data: {json.dumps({'type': 'complete', 'content': data})}\n\n"
                elif event_type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'message': data})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Streaming failed: {str(e)}"
        )


@router.get("/providers")
async def list_providers(
    current_user = Depends(get_current_user)
):
    """
    List all supported AI providers.

    Returns metadata for each provider including models and capabilities.
    """
    from backend.services.ai_sdk_service import AI_PROVIDER_METADATA

    providers = []
    for provider_type, metadata in AI_PROVIDER_METADATA.items():
        providers.append({
            "id": provider_type.value,
            "name": metadata["name"],
            "default_model": metadata["default_model"],
            "supports_streaming": metadata["supports_streaming"],
            "max_context_tokens": metadata["max_context_tokens"],
            "endpoint": metadata["default_endpoint"]
        })

    return {"providers": providers}


@router.get("/capabilities")
async def get_capabilities(
    service: AISDKService = Depends(get_ai_service),
    current_user = Depends(get_current_user)
):
    """
    Get capabilities of currently configured provider.
    """
    capabilities = service.get_provider_capabilities()
    return capabilities.model_dump()


@router.post("/config")
async def update_provider_config(
    config_request: ProviderConfigRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """
    Update AI provider configuration.

    Stores configuration in database for current user.
    """
    # Store configuration in database
    # This is a placeholder - implement your own config storage

    # Validate configuration by creating service
    try:
        config = AIProviderConfig(
            provider=config_request.provider,
            api_key=config_request.api_key,
            model=config_request.model,
            endpoint=config_request.endpoint
        )

        # Test configuration
        service = AISDKService(config)

        if not service.is_configured():
            raise HTTPException(
                status_code=400,
                detail="Invalid configuration"
            )

        # Save to database
        # db.save_ai_config(current_user.id, config_request)

        return {
            "success": True,
            "message": "AI configuration updated",
            "provider": config_request.provider.value,
            "model": config_request.model
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Configuration failed: {str(e)}"
        )
```

---

## 2. Register Routes in Main Application

**File:** `backend/main.py`

```python
from fastapi import FastAPI
from backend.routes import ai_chat
from backend.services.audit_logger import AuditLogger

app = FastAPI(title="Justice Companion API")

# Initialize audit logger
audit_logger = AuditLogger()
app.state.audit_logger = audit_logger

# Include AI chat routes
app.include_router(ai_chat.router)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("Starting Justice Companion API")
    print("AI SDK Service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down Justice Companion API")
```

---

## 3. Frontend Integration Example

### Non-Streaming Request

```typescript
// src/services/AIService.ts
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error('Chat request failed');
  }

  const data = await response.json();
  return data.response;
}
```

### Streaming Request (Server-Sent Events)

```typescript
// src/services/AIService.ts
export async function sendChatMessageStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onComplete: (response: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error('Stream request failed');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // Process SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'token') {
          onToken(data.content);
        } else if (data.type === 'complete') {
          onComplete(data.content);
        } else if (data.type === 'error') {
          onError(data.message);
        }
      }
    }
  }
}
```

---

## 4. Testing Endpoints

### Using cURL

```bash
# Non-streaming chat
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'

# Streaming chat
curl -X POST http://localhost:8000/api/ai/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -N \
  -d '{
    "messages": [
      {"role": "user", "content": "Tell me a story."}
    ],
    "stream": true
  }'

# List providers
curl http://localhost:8000/api/ai/providers \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get capabilities
curl http://localhost:8000/api/ai/capabilities \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Python Requests

```python
import requests
import json

# Non-streaming
response = requests.post(
    "http://localhost:8000/api/ai/chat",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_TOKEN"
    },
    json={
        "messages": [
            {"role": "user", "content": "Hello!"}
        ]
    }
)
print(response.json())

# Streaming
response = requests.post(
    "http://localhost:8000/api/ai/chat/stream",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_TOKEN"
    },
    json={
        "messages": [
            {"role": "user", "content": "Tell me a story."}
        ]
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = json.loads(line[6:])
            print(data)
```

---

## 5. Environment Variables

Create `.env` file:

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
HUGGINGFACE_API_KEY=hf_...

# Default AI Configuration
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4-turbo

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

---

## 6. Security Considerations

### Authentication

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify authentication token."""
    token = credentials.credentials

    # Validate token
    user = verify_token(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return user
```

### Rate Limiting

```python
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_completion(
    request: Request,
    chat_request: ChatRequest,
    service: AISDKService = Depends(get_ai_service)
):
    # ... implementation
    pass
```

### Input Validation

```python
from pydantic import BaseModel, Field, validator

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

    @validator('messages')
    def validate_messages(cls, v):
        if not v:
            raise ValueError('Messages list cannot be empty')

        if len(v) > 100:
            raise ValueError('Too many messages (max 100)')

        # Check total content length
        total_length = sum(len(msg.content) for msg in v)
        if total_length > 100000:
            raise ValueError('Total message content too long')

        return v
```

---

## 7. Error Handling

### Custom Exception Handler

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from backend.services.ai_sdk_service import AIServiceError

app = FastAPI()

@app.exception_handler(AIServiceError)
async def ai_service_error_handler(request: Request, exc: AIServiceError):
    """Handle AI service errors."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "AI Service Error",
            "message": str(exc),
            "type": type(exc).__name__
        }
    )
```

---

## 8. Monitoring and Logging

### Request Logging

```python
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@router.post("/chat")
async def chat_completion(
    request: ChatRequest,
    service: AISDKService = Depends(get_ai_service),
    current_user = Depends(get_current_user)
):
    start_time = datetime.utcnow()

    try:
        response = await service.chat(request.messages)

        duration = (datetime.utcnow() - start_time).total_seconds()

        logger.info(
            f"Chat completion successful | "
            f"User: {current_user.id} | "
            f"Provider: {service.get_provider().value} | "
            f"Duration: {duration:.2f}s"
        )

        return ChatResponse(response=response, ...)

    except Exception as e:
        logger.error(
            f"Chat completion failed | "
            f"User: {current_user.id} | "
            f"Error: {str(e)}"
        )
        raise
```

---

## Complete Integration Checklist

- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Create `backend/routes/ai_chat.py` with endpoints
- [ ] Register routes in `backend/main.py`
- [ ] Set up environment variables in `.env`
- [ ] Implement authentication dependency
- [ ] Add rate limiting
- [ ] Create frontend service methods
- [ ] Test non-streaming endpoint
- [ ] Test streaming endpoint
- [ ] Add error handling
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Write integration tests
- [ ] Update API documentation

---

## Next Steps

1. **Implement Configuration Storage**: Store user AI preferences in database
2. **Add Model Selection UI**: Let users choose provider and model
3. **Implement Conversation History**: Store chat conversations
4. **Add Cost Tracking**: Track API usage and costs
5. **Create Admin Dashboard**: Monitor AI usage across users

---

## Support

For issues or questions about integration:
1. Review this guide
2. Check `AI_SDK_SERVICE_README.md` for service details
3. Review `example_ai_sdk_usage.py` for usage patterns
4. Check test files for implementation examples

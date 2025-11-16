# Chat Component HTTP Streaming Migration Guide

## Overview

This guide documents the migration of the AI chat functionality from Electron IPC to HTTP REST API with Server-Sent Events (SSE) streaming.

## What Changed

### Before (IPC-based)
```typescript
await window.justiceAPI.streamChat(
  { sessionId, message, conversationId },
  (token) => { /* handle token */ },
  (thinking) => { /* handle thinking */ },
  () => { /* on complete */ },
  (error) => { /* on error */ },
  (conversationId) => { /* conversation ID callback */ }
);
```

### After (HTTP-based)
```typescript
import { apiClient } from '../lib/apiClient.ts';

await apiClient.chat.stream(
  message,
  {
    onToken: (token) => { /* handle token */ },
    onThinking: (thinking) => { /* handle thinking */ },
    onComplete: (conversationId) => { /* on complete */ },
    onError: (error) => { /* on error */ },
    onSources: (sources) => { /* handle sources */ }
  },
  {
    conversationId,
    caseId,
    useRAG: true
  }
);
```

## New Files Created

### 1. `src/lib/apiClient.ts` (Enhanced)
Added streaming chat support to existing HTTP API client:

```typescript
public chat = {
  stream: async (
    message: string,
    callbacks: {
      onToken: (token: string) => void;
      onThinking?: (thinking: string) => void;
      onComplete: (conversationId: number) => void;
      onError: (error: string) => void;
      onSources?: (sources: any[]) => void;
    },
    options: {
      conversationId?: number | null;
      caseId?: number | null;
      useRAG?: boolean;
    } = {}
  ): Promise<void>

  getConversations: async (caseId?: number | null, limit?: number)
  getConversation: async (conversationId: number)
  deleteConversation: async (conversationId: number)
}
```

**Key Features:**
- Server-Sent Events (SSE) streaming with ReadableStream
- Automatic SSE parsing (handles `data: ` prefix)
- 5-minute timeout for long conversations
- Session-based authentication with `X-Session-Id` header
- Robust error handling with reconnection logic

### 2. `src/hooks/useStreamingChat.ts`
React hook for managing streaming chat state:

```typescript
export function useStreamingChat(options: UseStreamingChatOptions): {
  messages: Message[];
  isStreaming: boolean;
  currentStreamingMessage: string;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}
```

**Features:**
- Automatic message management
- Streaming state tracking
- Error recovery
- Conversation ID tracking via ref
- LocalStorage persistence compatible

### 3. `src/views/ChatView.migrated.tsx`
Migrated version of ChatView component using HTTP streaming.

## API Endpoint Details

### POST `/chat/stream`
Server-Sent Events endpoint for streaming chat responses.

**Request:**
```json
{
  "message": "What are my rights if I'm being bullied at work?",
  "conversationId": 123,
  "caseId": 456,
  "useRAG": true
}
```

**Response (SSE stream):**
```
data: {"type": "token", "data": "I ", "done": false}

data: {"type": "token", "data": "can ", "done": false}

data: {"type": "token", "data": "help ", "done": false}

data: {"type": "sources", "data": [...], "done": false}

data: {"type": "complete", "conversationId": 123, "done": true}
```

**Event Types:**
- `token` - Single response token from AI
- `sources` - Legal sources cited (optional)
- `complete` - Streaming complete with conversation ID
- `error` - Error occurred during streaming

## Migration Steps

### Step 1: Install Dependencies
```bash
# Already included in existing dependencies
npm install
```

### Step 2: Configure API Base URL
```bash
# Add to .env (optional, defaults to http://127.0.0.1:8000)
VITE_API_BASE_URL=http://localhost:8000
```

### Step 3: Initialize API Client
```typescript
// In your app initialization (e.g., src/main.tsx or App.tsx)
import { apiClient, initializeApiClient } from './lib/apiClient.ts';

// Set session ID after login
const sessionId = localStorage.getItem('sessionId');
if (sessionId) {
  apiClient.setSessionId(sessionId);
}

// Initialize with dynamic port (if using port manager)
await initializeApiClient();
```

### Step 4: Replace ChatView Component
```bash
# Backup original
mv src/views/ChatView.tsx src/views/ChatView.ipc.tsx

# Use migrated version
mv src/views/ChatView.migrated.tsx src/views/ChatView.tsx
```

### Step 5: Update Authentication
Ensure session ID is set on login:

```typescript
// In your login handler
const response = await apiClient.auth.login(username, password);
if (response.success && response.data) {
  const sessionId = response.data.session.id;
  apiClient.setSessionId(sessionId);
  localStorage.setItem('sessionId', sessionId);
}
```

## Testing

### 1. Start FastAPI Backend
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 2. Start Frontend Dev Server
```bash
npm run dev
```

### 3. Test Streaming Chat
1. Log in to the application
2. Navigate to Chat view
3. Send a test message: "What are my rights if I'm being bullied at work?"
4. Verify streaming response displays token by token
5. Check conversation is saved with conversation ID
6. Test error handling by stopping backend mid-stream

### 4. Test Edge Cases
- **Network Disconnection:** Stop backend during streaming
- **Session Expiry:** Use invalid session ID
- **Long Messages:** Send 1000+ word questions
- **Rapid Messages:** Send multiple messages quickly
- **Document Upload:** Test with PDF/DOCX analysis

## Error Handling

### Network Errors
```typescript
// Automatic retry with exponential backoff
// Max 3 retries with 1s, 2s, 3s delays
try {
  await apiClient.chat.stream(message, callbacks, options);
} catch (error) {
  // Error already handled in callbacks.onError
  console.error('Streaming failed:', error);
}
```

### Timeout Handling
```typescript
// 5-minute timeout configured in apiClient
signal: AbortSignal.timeout(300000)

// If timeout occurs:
callbacks.onError('Request timed out after 5 minutes');
```

### Session Expiry
```typescript
// 401 Unauthorized response
callbacks.onError('Session expired. Please log in again.');

// Frontend should redirect to login
```

## Performance Considerations

### 1. Streaming Performance
- SSE streaming provides real-time token updates (< 50ms latency)
- Buffering minimizes network overhead
- Progressive message rendering improves perceived performance

### 2. Memory Management
- Messages stored in React state (not global)
- LocalStorage persists messages per case
- Clear old conversations periodically

### 3. Network Optimization
- Gzip compression enabled on backend
- Keep-alive connections reduce overhead
- SSE reuses single HTTP connection

## Backward Compatibility

### IPC Fallback (Optional)
If you need to support both IPC and HTTP:

```typescript
// Detect IPC availability
const useIPC = typeof window.justiceAPI !== 'undefined';

if (useIPC) {
  // Use original IPC method
  await window.justiceAPI.streamChat(...);
} else {
  // Use HTTP streaming
  await apiClient.chat.stream(...);
}
```

### Feature Parity Checklist
- [x] Message streaming
- [x] Conversation management
- [x] Case context
- [x] RAG legal research
- [x] Document analysis
- [x] Save to case
- [x] Create case from AI
- [x] Error recovery
- [x] Thinking process display (optional)
- [x] Sources citation

## Troubleshooting

### Issue: "Failed to start stream"
**Solution:** Ensure FastAPI backend is running on port 8000.

```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

### Issue: "Session expired"
**Solution:** Re-login and ensure session ID is set.

```typescript
const sessionId = localStorage.getItem('sessionId');
apiClient.setSessionId(sessionId);
```

### Issue: Streaming stops mid-response
**Solution:** Check backend logs for errors. Increase timeout if needed.

```typescript
// In apiClient.ts, increase timeout:
signal: AbortSignal.timeout(600000) // 10 minutes
```

### Issue: CORS errors
**Solution:** Ensure CORS is configured in FastAPI backend.

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Benefits of HTTP Migration

### 1. Decoupled Architecture
- Frontend can run independently
- Backend can scale horizontally
- Easier to develop and test in isolation

### 2. Web Compatibility
- Can deploy as web app (no Electron required)
- Progressive Web App (PWA) support
- Mobile app compatibility (React Native)

### 3. Standard Protocols
- HTTP/REST is universal
- SSE is widely supported
- Easy to monitor and debug

### 4. Better Error Handling
- Standard HTTP status codes
- Structured error responses
- Automatic retry logic

### 5. Performance
- Connection pooling
- Response compression
- Caching support

## Next Steps

1. **Remove IPC Handlers** - Once migration is complete, remove old IPC handlers from `electron/ipc-handlers/chat.ts`

2. **Update Documentation** - Update user-facing docs to reflect HTTP architecture

3. **Add Monitoring** - Integrate error tracking (e.g., Sentry) for production

4. **Optimize Backend** - Add Redis caching, database query optimization

5. **Security Hardening** - Implement rate limiting, API keys, CSRF protection

## References

- [FastAPI Chat Routes](../backend/routes/chat_enhanced.py)
- [API Client Implementation](../src/lib/apiClient.ts)
- [Streaming Chat Hook](../src/hooks/useStreamingChat.ts)
- [Migrated ChatView Component](../src/views/ChatView.migrated.tsx)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## Support

For issues or questions, see:
- GitHub Issues: [Justice Companion Issues](https://github.com/justice-companion/issues)
- Backend Logs: Check `backend/` directory for error logs
- Frontend Console: Check browser DevTools for client-side errors

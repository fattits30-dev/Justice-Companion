# Chat API Migration - TypeScript to Python FastAPI

## Overview

This document describes the migration of the chat IPC handlers from TypeScript (Electron) to Python FastAPI with SSE streaming support.

**Source:** `electron/ipc-handlers/chat.ts`
**Target:** `backend/routes/chat.py` + `backend/models/chat.py`

## Files Created

### 1. `backend/models/chat.py`
SQLAlchemy models for chat conversations and messages:

- **ChatConversation**: Represents a persistent chat session
  - Fields: id, user_id, case_id, title, created_at, updated_at, message_count
  - Relationships: one-to-many with ChatMessage
  - Methods: `to_dict(include_messages=False)`

- **ChatMessage**: Individual messages within a conversation
  - Fields: id, conversation_id, role, content, thinking_content, timestamp, token_count
  - Methods: `to_dict()`

### 2. `backend/routes/chat.py`
FastAPI router with 7 endpoints:

#### Endpoints

1. **POST /chat/stream** (SSE Streaming)
   - Request: `ChatStreamRequest(message, conversationId?, caseId?)`
   - Validates message (1-10000 chars)
   - Loads conversation history if conversationId provided
   - Verifies conversation ownership
   - Streams AI response token by token using Server-Sent Events
   - Saves conversation and messages after streaming completes
   - Returns: `StreamingResponse` with SSE events

2. **POST /chat/send** (Non-streaming)
   - Request: `ChatSendRequest(message, conversationId?)`
   - Returns: Plain text response
   - Status: Stub implementation

3. **POST /chat/analyze-case**
   - Request: `CaseAnalysisRequest(caseId, description)`
   - Verifies case ownership
   - Returns: `CaseAnalysisResponse(analysis, suggestedActions, relevantLaw?)`
   - Status: Stub implementation

4. **POST /chat/analyze-evidence**
   - Request: `EvidenceAnalysisRequest(caseId, existingEvidence[])`
   - Verifies case ownership
   - Returns: `EvidenceAnalysisResponse(analysis, gaps, recommendations)`
   - Status: Stub implementation

5. **POST /chat/draft-document**
   - Request: `DocumentDraftRequest(documentType, context{caseId, facts, objectives})`
   - Verifies case ownership
   - Returns: `DocumentDraftResponse(documentType, content, metadata)`
   - Status: Stub implementation

6. **POST /chat/analyze-document**
   - Request: `DocumentAnalysisRequest(filePath, userQuestion?)`
   - Validates file exists
   - Returns: `DocumentAnalysisResponse(analysis, suggestedCaseData?)`
   - Status: Stub implementation

7. **GET /chat/conversations**
   - Query params: `caseId?` (optional), `limit` (default 5, max 100)
   - Filters by user_id (from session)
   - Optionally filters by caseId
   - Returns: `List[ConversationResponse]`
   - Status: Fully implemented

## Database Schema

Uses existing tables from migrations:
- `chat_conversations` (002_chat_history_and_profile.sql)
- `chat_messages` (002_chat_history_and_profile.sql)
- Added `user_id` column (011_add_user_ownership.sql)

```sql
chat_conversations:
  id INTEGER PRIMARY KEY
  user_id INTEGER FK -> users.id
  case_id INTEGER FK -> cases.id (nullable)
  title TEXT
  created_at TEXT
  updated_at TEXT
  message_count INTEGER

chat_messages:
  id INTEGER PRIMARY KEY
  conversation_id INTEGER FK -> chat_conversations.id
  role TEXT ('user' | 'assistant' | 'system')
  content TEXT
  thinking_content TEXT (nullable)
  timestamp TEXT
  token_count INTEGER (nullable)
```

## SSE Streaming Implementation

The streaming endpoint (`POST /chat/stream`) uses FastAPI's `StreamingResponse` with Server-Sent Events:

### SSE Event Format
```
data: {"data": "token ", "done": false}

data: {"data": "another ", "done": false}

data: {"data": "", "done": true}

data: {"conversationId": 123, "done": true}
```

### Streaming Flow
1. Client sends POST request with message
2. Server validates and loads conversation history
3. Server streams tokens as SSE events
4. Tokens are accumulated on server side
5. After streaming completes:
   - Creates/updates conversation in database
   - Saves user message and AI response
   - Sends final event with conversationId

### Client Usage Example
```javascript
const eventSource = new EventSource('/chat/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.done) {
    if (data.conversationId) {
      console.log('Conversation ID:', data.conversationId);
    }
    eventSource.close();
  } else {
    console.log('Token:', data.data);
    // Append token to UI
  }
};
```

## Security

All endpoints require authentication:
- Session-based authentication via `get_current_user` dependency
- Session ID extracted from Authorization header or query param
- All queries filtered by `user_id`
- Conversation ownership verification before loading history
- Case ownership verification for case-related endpoints

## Helper Functions

### `verify_conversation_ownership(db, conversation_id, user_id)`
Ensures user owns the conversation before loading history.

### `load_conversation_history(db, conversation_id)`
Loads all messages for a conversation ordered by timestamp.

### `generate_conversation_title(message)`
Generates conversation title from first message (truncated to 100 chars).

## AI Integration (TODO)

All AI-related functionality is stubbed with mock responses:

1. **Streaming Chat**: Replace `stream_ai_response()` with actual AI service call
2. **Case Analysis**: Integrate with AI service (OpenAI, HuggingFace, etc.)
3. **Evidence Analysis**: Integrate with AI service
4. **Document Drafting**: Integrate with AI service
5. **Document Analysis**: Integrate with document parser + AI service

### Integration Points

Replace stub implementations in:
- `stream_ai_response()` - async generator for streaming tokens
- `send_chat()` - non-streaming AI response
- `analyze_case()` - case analysis logic
- `analyze_evidence()` - evidence analysis logic
- `draft_document()` - document generation logic
- `analyze_document()` - document parsing + AI analysis

## Testing

### Manual Testing with cURL

1. **Stream Chat (SSE)**
```bash
curl -N -H "Authorization: Bearer YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8000/chat/stream \
  -d '{"message": "Hello, I need help with a housing dispute"}'
```

2. **Get Conversations**
```bash
curl -H "Authorization: Bearer YOUR_SESSION_ID" \
  http://localhost:8000/chat/conversations?limit=10
```

3. **Analyze Case**
```bash
curl -H "Authorization: Bearer YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8000/chat/analyze-case \
  -d '{"caseId": 1, "description": "Housing dispute with landlord over deposit"}'
```

### Integration with Frontend

Update frontend to call FastAPI endpoints instead of Electron IPC:

```typescript
// Before (Electron IPC)
await window.electron.ipcRenderer.invoke('chat:stream', {
  sessionId: session.id,
  message: userMessage,
  conversationId: currentConversation?.id
});

// After (FastAPI HTTP)
const response = await fetch('http://localhost:8000/chat/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.id}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: userMessage,
    conversationId: currentConversation?.id
  })
});

const reader = response.body.getReader();
// ... handle SSE streaming
```

## Migration Checklist

- [x] Create `backend/models/chat.py` with SQLAlchemy models
- [x] Create `backend/routes/chat.py` with 7 endpoints
- [x] Implement SSE streaming for `/chat/stream`
- [x] Implement conversation management (create, load history)
- [x] Implement conversation ownership verification
- [x] Add security (session-based authentication)
- [x] Add input validation with Pydantic
- [ ] Integrate with AI service (OpenAI, HuggingFace)
- [ ] Integrate with document parser service
- [ ] Add comprehensive error handling
- [ ] Add audit logging for AI interactions
- [ ] Write unit tests (pytest)
- [ ] Write integration tests
- [ ] Update frontend to call FastAPI endpoints
- [ ] Performance testing (concurrent streaming requests)

## Known Issues & Limitations

1. **AI Integration**: All AI responses are stubbed. Need to integrate with:
   - OpenAI API for streaming chat
   - HuggingFace API for alternative models
   - Local models for offline support

2. **Document Parsing**: `analyze-document` endpoint needs DocumentParserService integration

3. **Error Handling**: Basic HTTP exceptions. Need more granular error types

4. **Rate Limiting**: No rate limiting on streaming endpoint (could be abused)

5. **Token Counting**: Not implemented (token_count field is always NULL)

6. **Thinking Content**: Not captured from AI responses (thinking_content field unused)

## Performance Considerations

1. **Connection Pooling**: SQLAlchemy engine uses connection pooling by default
2. **Async Operations**: Using `asyncio.sleep()` in streaming to prevent blocking
3. **Database Indexes**: Existing indexes on user_id, conversation_id, timestamp
4. **Query Optimization**: Using raw SQL for better performance
5. **SSE Buffering**: Disabled nginx buffering with `X-Accel-Buffering: no` header

## Dependencies

No additional dependencies required beyond existing:
- fastapi==0.115.0 (StreamingResponse supports SSE)
- sqlalchemy==2.0.35
- pydantic[email]==2.9.2

## References

- TypeScript source: `electron/ipc-handlers/chat.ts`
- Database migrations: `src/db/migrations/002_chat_history_and_profile.sql`
- User ownership migration: `src/db/migrations/011_add_user_ownership.sql`
- FastAPI StreamingResponse: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse
- SSE specification: https://html.spec.whatwg.org/multipage/server-sent-events.html

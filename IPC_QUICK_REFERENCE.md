# IPC API Quick Reference

**Justice Companion - IPC Handlers Cheat Sheet**

This is a condensed reference for developers. For complete documentation, see [IPC_API_REFERENCE.md](./IPC_API_REFERENCE.md).

---

## Case Management

```typescript
// Create case
const result = await window.justiceAPI.createCase({
  title: "Case Title",
  caseType: "employment", // employment | housing | consumer | family | debt | other
  description: "Optional encrypted description"
});

// Get case by ID
const result = await window.justiceAPI.getCaseById(123);

// Get all cases
const result = await window.justiceAPI.getAllCases();

// Update case
const result = await window.justiceAPI.updateCase(123, {
  status: "closed",
  description: "Updated description"
});

// Delete case (⚠️ irreversible!)
const result = await window.justiceAPI.deleteCase(123);

// Close case (shortcut for status: "closed")
const result = await window.justiceAPI.closeCase(123);

// Get statistics
const result = await window.justiceAPI.getCaseStatistics();
// Returns: { totalCases: number, statusCounts: { active, closed, pending } }
```

---

## AI Operations

```typescript
// Check AI status
const result = await window.justiceAPI.checkAIStatus();
// Returns: { connected, endpoint, model?, error? }

// Non-streaming chat
const result = await window.justiceAPI.aiChat({
  messages: [
    { role: "user", content: "What are my legal rights?" }
  ],
  caseId: 123  // Optional
});

// Streaming chat with RAG
// 1. Set up listeners
const unsubToken = window.justiceAPI.onAIStreamToken(token => {
  appendToDisplay(token);
});
const unsubThink = window.justiceAPI.onAIStreamThinkToken(token => {
  appendToReasoningDisplay(token);  // <think> content
});
const unsubSources = window.justiceAPI.onAIStreamSources(sources => {
  displaySources(sources);  // Legal citations
});
const unsubStatus = window.justiceAPI.onAIStatusUpdate(status => {
  setStatusMessage(status);  // "Thinking...", "Researching...", "Writing..."
});
const unsubComplete = window.justiceAPI.onAIStreamComplete(() => {
  cleanup();
});
const unsubError = window.justiceAPI.onAIStreamError(error => {
  showError(error);
});

// 2. Start stream
const result = await window.justiceAPI.aiStreamStart({
  messages: [{ role: "user", content: "Explain UK employment law" }]
});

// 3. Clean up listeners when done
unsubToken();
unsubThink();
unsubSources();
unsubStatus();
unsubComplete();
unsubError();
```

---

## File Operations

```typescript
// Select file (opens dialog)
const result = await window.justiceAPI.selectFile({
  filters: [
    { name: 'PDF Documents', extensions: ['pdf'] }
  ],
  properties: ['openFile']
});
// Returns: { filePaths: string[], canceled: boolean }

// Upload & extract text (max 50MB)
const result = await window.justiceAPI.uploadFile("/absolute/path/to/file.pdf");
// Returns: { fileName, fileSize, mimeType, extractedText? }
// Supports: PDF, DOCX, TXT (with text extraction), JPG, PNG (no extraction)
```

---

## Conversation Management

```typescript
// Create conversation
const result = await window.justiceAPI.createConversation({
  title: "Legal advice chat",
  caseId: 123  // Optional
});

// Get conversation
const result = await window.justiceAPI.getConversation(456);

// Get all conversations (optionally filtered by case)
const result = await window.justiceAPI.getAllConversations(123);  // For case 123
const result = await window.justiceAPI.getAllConversations();     // All conversations

// Get recent conversations
const result = await window.justiceAPI.getRecentConversations(123, 5);

// Load conversation with messages
const result = await window.justiceAPI.loadConversationWithMessages(456);
// Returns: { conversation, messages: [...] }

// Delete conversation
const result = await window.justiceAPI.deleteConversation(456);

// Add message
const result = await window.justiceAPI.addMessage({
  conversationId: 456,
  role: "user",
  content: "What are my options?"
});
// Returns updated conversation
```

---

## User Profile

```typescript
// Get profile
const result = await window.justiceAPI.getUserProfile();

// Update profile
const result = await window.justiceAPI.updateUserProfile({
  name: "Jane Smith",
  email: "jane@example.com",
  preferences: {
    theme: "dark",
    notifications: true
  }
});
```

---

## Model Management

```typescript
// Get available models
const result = await window.justiceAPI.getAvailableModels();
// Returns: { models: [{ id, name, fileName, url, size, description, recommended }] }

// Get downloaded models
const result = await window.justiceAPI.getDownloadedModels();

// Check if model is downloaded
const result = await window.justiceAPI.isModelDownloaded("llama-3.2-8b");
// Returns: { downloaded: boolean, path?: string }

// Delete model
const result = await window.justiceAPI.deleteModel("llama-3.2-8b");
// Returns: { deleted: boolean }
```

---

## Error Handling Pattern

All IPC handlers return a consistent response format:

```typescript
// Success response
{
  success: true,
  data: T  // Response data (varies by handler)
}

// Error response
{
  success: false,
  error: string  // Human-readable error message
}

// Always check success flag
const result = await window.justiceAPI.createCase({...});
if (!result.success) {
  console.error("Error:", result.error);
  showErrorToast(result.error);
  return;
}

// Success - use result.data
console.log("Case created:", result.data.id);
```

---

## Security Notes

### Encrypted Fields
- **Case.description**: Automatically encrypted/decrypted
- **Evidence.content**: Automatically encrypted/decrypted
- **Encryption**: AES-256-GCM with keys from `.env`

### Audit Logging
All CRUD operations on cases and evidence are automatically logged:
- Event types: `case.create`, `case.update`, `case.delete`, `case.pii_access`
- Blockchain-style integrity with SHA-256 hash chaining
- GDPR-compliant (metadata only, no sensitive data in logs)

### Input Validation
- All parameters validated at IPC boundary
- SQL injection prevention via parameterized queries
- File size limits enforced (50MB max)
- Path traversal prevention on file operations

---

## Development Tools

### MCP Server (Dev Mode Only)

The MCP server exposes 9 tools via HTTP at `http://localhost:5555`:

**Case Tools**:
- `cases:create` - Create test case
- `cases:get` - Get case by ID
- `cases:list` - List all cases
- `cases:update` - Update case
- `cases:delete` - Delete case
- `cases:createTestFixture` - Create test data

**Database Tools**:
- `database:query` - Execute SELECT queries (read-only)
- `database:migrate` - Run migrations
- `database:backup` - Backup database

**HTTP API**:
```bash
# Health check
curl http://localhost:5555/dev-api/health

# List handlers
curl http://localhost:5555/dev-api/handlers

# Invoke handler
curl -X POST http://localhost:5555/dev-api/ipc \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "dev-api:cases:create",
    "args": {
      "title": "Test Case",
      "caseType": "employment",
      "description": "Test description"
    }
  }'
```

---

## Type Definitions

All types are defined in `src/types/ipc.ts`:

```typescript
// Case types
export type CaseType = 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other';
export type CaseStatus = 'active' | 'closed' | 'pending';

// Common interfaces
export interface Case {
  id: number;
  title: string;
  description: string | null;
  caseType: CaseType;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseInput {
  title: string;
  description?: string;
  caseType: CaseType;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string;
  caseType?: CaseType;
  status?: CaseStatus;
}
```

---

## Common Patterns

### Creating a Case with Evidence

```typescript
// 1. Create case
const caseResult = await window.justiceAPI.createCase({
  title: "Employment Dispute",
  caseType: "employment",
  description: "Unfair dismissal claim"
});

if (!caseResult.success) return;

// 2. Select and upload evidence
const fileResult = await window.justiceAPI.selectFile({
  filters: [{ name: 'Documents', extensions: ['pdf', 'docx'] }]
});

if (fileResult.success && !fileResult.canceled) {
  const uploadResult = await window.justiceAPI.uploadFile(fileResult.filePaths[0]);
  // Process uploadResult.extractedText
}
```

### Streaming Chat with Real-time Updates

```typescript
function startAIChat(userMessage: string) {
  let fullResponse = "";
  let thinkingContent = "";
  let sources: string[] = [];

  // Set up listeners
  const unsubToken = window.justiceAPI.onAIStreamToken(token => {
    fullResponse += token;
    updateChatDisplay(fullResponse);
  });

  const unsubThink = window.justiceAPI.onAIStreamThinkToken(token => {
    thinkingContent += token;
    updateThinkingDisplay(thinkingContent);
  });

  const unsubSources = window.justiceAPI.onAIStreamSources(newSources => {
    sources = newSources;
    updateSourcesDisplay(sources);
  });

  const unsubStatus = window.justiceAPI.onAIStatusUpdate(status => {
    setStatusIndicator(status);
  });

  const unsubComplete = window.justiceAPI.onAIStreamComplete(() => {
    console.log("Stream complete");
    cleanup();
  });

  const unsubError = window.justiceAPI.onAIStreamError(error => {
    showError(error);
    cleanup();
  });

  const cleanup = () => {
    unsubToken();
    unsubThink();
    unsubSources();
    unsubStatus();
    unsubComplete();
    unsubError();
  };

  // Start stream
  window.justiceAPI.aiStreamStart({
    messages: [{ role: "user", content: userMessage }]
  }).then(result => {
    if (!result.success) {
      showError(result.error);
      cleanup();
    }
  });
}
```

---

## Related Files

- **Full API Reference**: [IPC_API_REFERENCE.md](./IPC_API_REFERENCE.md)
- **Type Definitions**: [src/types/ipc.ts](./src/types/ipc.ts)
- **Handler Implementation**: [electron/main.ts](./electron/main.ts)
- **Preload Script**: [electron/preload.ts](./electron/preload.ts)
- **Development Guide**: [CLAUDE.md](./CLAUDE.md)

---

**Last Updated**: 2025-10-05
**Maintained By**: Agent Juliet (Documentation Specialist)

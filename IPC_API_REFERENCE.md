# IPC API Reference

**Justice Companion - Inter-Process Communication API**

This document provides comprehensive documentation for all IPC handlers available in Justice Companion. The IPC API enables type-safe communication between the Electron main process and renderer process.

**Version**: 1.0.0
**Last Updated**: 2025-10-05

---

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Security Considerations](#security-considerations)
- [Case Management APIs](#case-management-apis)
- [AI & Chat APIs](#ai--chat-apis)
- [File Operations APIs](#file-operations-apis)
- [Conversation Management APIs](#conversation-management-apis)
- [User Profile APIs](#user-profile-apis)
- [Model Management APIs](#model-management-apis)
- [Error Handling](#error-handling)
- [Development Tools](#development-tools)

---

## Overview

Justice Companion uses Electron's IPC (Inter-Process Communication) mechanism to communicate between the main process (Node.js backend) and the renderer process (React frontend). All IPC handlers are:

- **Type-safe**: Full TypeScript type definitions in `src/types/ipc.ts`
- **Audited**: All sensitive operations are logged to the immutable audit trail
- **Encrypted**: PII and sensitive data are encrypted with AES-256-GCM
- **Error-handled**: Consistent error response format across all handlers

### Architecture

```
Renderer Process (React)
        ↓
    window.justiceAPI
        ↓
    Preload Script (contextBridge)
        ↓
    IPC Handlers (electron/main.ts)
        ↓
    Services & Repositories
        ↓
    SQLite Database
```

---

## Quick Reference

| Handler | Channel | Purpose | Encryption | Audit Log |
|---------|---------|---------|------------|-----------|
| `case:create` | `CASE_CREATE` | Create new case | Yes (description) | Yes |
| `case:getById` | `CASE_GET_BY_ID` | Get case by ID | Auto-decrypts | Yes (PII access) |
| `case:getAll` | `CASE_GET_ALL` | List all cases | Auto-decrypts | No |
| `case:update` | `CASE_UPDATE` | Update case | Yes (description) | Yes |
| `case:delete` | `CASE_DELETE` | Delete case | N/A | Yes |
| `case:close` | `CASE_CLOSE` | Close case | N/A | Yes |
| `case:getStatistics` | `CASE_GET_STATISTICS` | Get case stats | N/A | No |
| `ai:checkStatus` | `AI_CHECK_STATUS` | Check AI connection | N/A | No |
| `ai:chat` | `AI_CHAT` | Non-streaming chat | N/A | No |
| `ai:stream:start` | `AI_STREAM_START` | Start streaming chat | N/A | No |
| `file:select` | `FILE_SELECT` | Open file picker | N/A | No |
| `file:upload` | `FILE_UPLOAD` | Upload & extract text | N/A | No |
| `conversation:create` | `CONVERSATION_CREATE` | Create conversation | N/A | No |
| `conversation:get` | `CONVERSATION_GET` | Get conversation | N/A | No |
| `conversation:getAll` | `CONVERSATION_GET_ALL` | List conversations | N/A | No |
| `conversation:getRecent` | `CONVERSATION_GET_RECENT` | Get recent chats | N/A | No |
| `conversation:loadWithMessages` | `CONVERSATION_LOAD_WITH_MESSAGES` | Load full conversation | N/A | No |
| `conversation:delete` | `CONVERSATION_DELETE` | Delete conversation | N/A | No |
| `message:add` | `MESSAGE_ADD` | Add message to chat | N/A | No |
| `profile:get` | `PROFILE_GET` | Get user profile | N/A | No |
| `profile:update` | `PROFILE_UPDATE` | Update user profile | N/A | No |
| `model:getAvailable` | `MODEL_GET_AVAILABLE` | List available models | N/A | No |
| `model:getDownloaded` | `MODEL_GET_DOWNLOADED` | List downloaded models | N/A | No |
| `model:isDownloaded` | `MODEL_IS_DOWNLOADED` | Check if model exists | N/A | No |
| `model:download:start` | `MODEL_DOWNLOAD_START` | Start model download | N/A | No |
| `model:delete` | `MODEL_DELETE` | Delete model | N/A | No |

---

## Security Considerations

### Encrypted Fields

The following fields are automatically encrypted/decrypted:

- **Case.description**: Encrypted with AES-256-GCM before storage
- **Evidence.content**: Encrypted with AES-256-GCM before storage
- All encrypted fields use JSON-serialized `EncryptedData` format

### Audit Logging

All CRUD operations on cases and evidence are automatically logged to the `audit_logs` table with:

- **Event type**: Categorized by resource and action (e.g., `case.create`, `case.pii_access`)
- **Blockchain-style integrity**: SHA-256 hash chaining prevents tampering
- **GDPR-compliant**: Only metadata logged, no sensitive data in audit logs
- **PII access tracking**: Separate events for accessing encrypted fields

### Input Validation

All IPC handlers implement:

- **Parameter validation**: Type checking and required field validation
- **SQL injection prevention**: Parameterized queries only
- **File size limits**: 50MB max for file uploads
- **Path traversal prevention**: Validated file paths

---

## Case Management APIs

### case:create

**Description**: Creates a new legal case in the database.

**Channel**: `IPC_CHANNELS.CASE_CREATE`

**Handler**: Lines 103-117 in `electron/main.ts`

**Parameters**:

```typescript
{
  input: {
    title: string;           // Required, case title
    description?: string;    // Optional, encrypted before storage
    caseType: CaseType;     // Required, one of: 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other'
  }
}
```

**Returns**:

```typescript
{
  success: true;
  data: {
    id: number;
    title: string;
    description: string | null;  // Decrypted
    caseType: CaseType;
    status: CaseStatus;          // Always 'active' on creation
    createdAt: string;           // ISO 8601 timestamp
    updatedAt: string;           // ISO 8601 timestamp
  }
}
```

**Errors**:

```typescript
{
  success: false;
  error: string;  // Error message
}
```

**Security**:
- Description field is encrypted with AES-256-GCM
- Case creation is logged to audit trail
- Failed creation attempts are also audited

**Example**:

```typescript
const result = await window.justiceAPI.createCase({
  title: "Unfair Dismissal Claim - Smith v. ABC Corp",
  caseType: "employment",
  description: "Client was dismissed without proper procedure on 2025-09-15. Seeking compensation for unfair dismissal."
});

if (result.success) {
  console.log("Case created:", result.data.id);
}
```

**MCP Tool**: `cases:create` (via `dev-api:cases:create`)

---

### case:getById

**Description**: Retrieves a case by its ID. Automatically decrypts the description field.

**Channel**: `IPC_CHANNELS.CASE_GET_BY_ID`

**Handler**: Lines 120-135 in `electron/main.ts`

**Parameters**:

```typescript
{
  id: number;  // Case ID
}
```

**Returns**:

```typescript
{
  success: true;
  data: Case | null;  // null if not found
}
```

**Security**:
- Description field is automatically decrypted
- PII access is logged to audit trail if description was encrypted
- Audit event: `case.pii_access` with metadata only

**Example**:

```typescript
const result = await window.justiceAPI.getCaseById(123);

if (result.success && result.data) {
  console.log("Case title:", result.data.title);
  console.log("Description:", result.data.description);  // Decrypted
}
```

**MCP Tool**: `cases:get` (via `dev-api:cases:get`)

---

### case:getAll

**Description**: Retrieves all cases. Automatically decrypts all description fields.

**Channel**: `IPC_CHANNELS.CASE_GET_ALL`

**Handler**: Lines 138-153 in `electron/main.ts`

**Parameters**:

```typescript
{
  // Empty object (future: add pagination, filtering)
}
```

**Returns**:

```typescript
{
  success: true;
  data: Case[];  // Array of cases with decrypted descriptions
}
```

**Security**:
- All description fields are automatically decrypted
- No audit logging for bulk list operations (performance)
- PII access is only logged on individual `getById` calls

**Example**:

```typescript
const result = await window.justiceAPI.getAllCases();

if (result.success) {
  console.log(`Found ${result.data.length} cases`);
  result.data.forEach(c => console.log(c.title));
}
```

**MCP Tool**: `cases:list` (via `dev-api:cases:list`)

---

### case:update

**Description**: Updates an existing case. Encrypts description if provided.

**Channel**: `IPC_CHANNELS.CASE_UPDATE`

**Handler**: Lines 156-170 in `electron/main.ts`

**Parameters**:

```typescript
{
  id: number;
  input: {
    title?: string;
    description?: string;    // Encrypted before update
    caseType?: CaseType;
    status?: CaseStatus;
  }
}
```

**Returns**:

```typescript
{
  success: true;
  data: Case | null;  // Updated case with decrypted description
}
```

**Security**:
- Description field is encrypted before UPDATE
- Update operation is logged to audit trail
- Audit log includes list of fields updated (not values)

**Example**:

```typescript
const result = await window.justiceAPI.updateCase(123, {
  status: "closed",
  description: "Case resolved. Client accepted settlement offer."
});

if (result.success) {
  console.log("Case updated:", result.data);
}
```

**MCP Tool**: `cases:update` (via `dev-api:cases:update`)

---

### case:delete

**Description**: Deletes a case. Cascades to related records via foreign keys.

**Channel**: `IPC_CHANNELS.CASE_DELETE`

**Handler**: Lines 173-187 in `electron/main.ts`

**Parameters**:

```typescript
{
  id: number;  // Case ID to delete
}
```

**Returns**:

```typescript
{
  success: true;
}
```

**Security**:
- Hard delete (not soft delete)
- Cascades to evidence, conversations, and messages via FK constraints
- Deletion is logged to audit trail
- Failed deletions are also audited

**Example**:

```typescript
const result = await window.justiceAPI.deleteCase(123);

if (result.success) {
  console.log("Case deleted successfully");
}
```

**MCP Tool**: `cases:delete` (via `dev-api:cases:delete`)

---

### case:close

**Description**: Closes a case by setting status to 'closed'.

**Channel**: `IPC_CHANNELS.CASE_CLOSE`

**Handler**: Lines 190-204 in `electron/main.ts`

**Parameters**:

```typescript
{
  id: number;  // Case ID to close
}
```

**Returns**:

```typescript
{
  success: true;
  data: Case | null;  // Closed case
}
```

**Security**:
- Internally calls `updateCase` with `status: 'closed'`
- Update is logged to audit trail

**Example**:

```typescript
const result = await window.justiceAPI.closeCase(123);

if (result.success) {
  console.log("Case closed:", result.data.status);  // 'closed'
}
```

**Notes**: This is a convenience wrapper around `updateCase`.

---

### case:getStatistics

**Description**: Retrieves case statistics (total count and status breakdown).

**Channel**: `IPC_CHANNELS.CASE_GET_STATISTICS`

**Handler**: Lines 207-226 in `electron/main.ts`

**Parameters**:

```typescript
{
  // Empty object
}
```

**Returns**:

```typescript
{
  success: true;
  data: {
    totalCases: number;
    statusCounts: {
      active: number;
      closed: number;
      pending: number;
    }
  }
}
```

**Example**:

```typescript
const result = await window.justiceAPI.getCaseStatistics();

if (result.success) {
  console.log(`Total cases: ${result.data.totalCases}`);
  console.log(`Active: ${result.data.statusCounts.active}`);
  console.log(`Closed: ${result.data.statusCounts.closed}`);
}
```

---

## AI & Chat APIs

### ai:checkStatus

**Description**: Checks AI service connection status.

**Channel**: `IPC_CHANNELS.AI_CHECK_STATUS`

**Handler**: Lines 229-249 in `electron/main.ts`

**Parameters**:

```typescript
{
  // Empty object
}
```

**Returns**:

```typescript
{
  success: true;
  connected: boolean;      // Whether AI service is reachable
  endpoint: string;        // API endpoint URL
  model?: string;          // Model name if connected
  error?: string;          // Error message if not connected
}
```

**Example**:

```typescript
const result = await window.justiceAPI.checkAIStatus();

if (result.success && result.connected) {
  console.log(`Connected to ${result.model} at ${result.endpoint}`);
} else {
  console.error("AI service offline:", result.error);
}
```

---

### ai:chat

**Description**: Sends a non-streaming chat request to the AI service.

**Channel**: `IPC_CHANNELS.AI_CHAT`

**Handler**: Lines 252-275 in `electron/main.ts`

**Parameters**:

```typescript
{
  messages: Array<{
    role: string;    // 'user' | 'assistant' | 'system'
    content: string;
  }>;
  context?: any;     // Optional legal context (RAG data)
  caseId?: number;   // Optional case ID for context
}
```

**Returns**:

```typescript
{
  success: true;
  message: {
    role: string;       // 'assistant'
    content: string;    // AI response
    timestamp: string;  // ISO 8601 timestamp
  };
  sources: string[];    // Legal source citations
  tokensUsed?: number;  // Token count if available
}
```

**Example**:

```typescript
const result = await window.justiceAPI.aiChat({
  messages: [
    { role: "user", content: "What are my rights regarding unfair dismissal?" }
  ],
  caseId: 123
});

if (result.success) {
  console.log("AI response:", result.message.content);
  console.log("Sources:", result.sources);
}
```

---

### ai:stream:start

**Description**: Starts a streaming chat session. Responses are sent via events.

**Channel**: `IPC_CHANNELS.AI_STREAM_START`

**Handler**: Lines 278-430 in `electron/main.ts`

**Parameters**:

```typescript
{
  messages: Array<{
    role: string;
    content: string;
  }>;
  context?: any;     // Optional legal context
  caseId?: number;   // Optional case ID
}
```

**Returns**:

```typescript
{
  success: true;
  streamId: string;  // Unique stream identifier
}
```

**Events** (sent from main to renderer):

- `AI_STREAM_TOKEN`: Display token received (string)
- `AI_STREAM_THINK_TOKEN`: Reasoning token from `<think>` blocks (string)
- `AI_STREAM_SOURCES`: Legal source citations (string[])
- `AI_STATUS_UPDATE`: Progress status (string, e.g., "Thinking...", "Researching...")
- `AI_STREAM_COMPLETE`: Stream finished successfully
- `AI_STREAM_ERROR`: Stream error (string)

**RAG Integration**:
- Automatically fetches legal context from UK Legal APIs if question is legal-related
- Classifies question to determine if RAG is needed
- Merges RAG context with provided context

**Example**:

```typescript
// Set up event listeners
const unsubToken = window.justiceAPI.onAIStreamToken((token) => {
  console.log("Token:", token);
});

const unsubComplete = window.justiceAPI.onAIStreamComplete(() => {
  console.log("Stream complete");
  unsubToken();
  unsubComplete();
});

const unsubStatus = window.justiceAPI.onAIStatusUpdate((status) => {
  console.log("Status:", status);  // "Thinking...", "Researching...", "Writing..."
});

// Start stream
const result = await window.justiceAPI.aiStreamStart({
  messages: [
    { role: "user", content: "Explain UK employment law basics" }
  ]
});

if (result.success) {
  console.log("Stream started:", result.streamId);
}
```

---

## File Operations APIs

### file:select

**Description**: Opens a native file picker dialog.

**Channel**: `IPC_CHANNELS.FILE_SELECT`

**Handler**: Lines 433-466 in `electron/main.ts`

**Parameters**:

```typescript
{
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'multiSelections'>;
}
```

**Defaults**:
```typescript
{
  properties: ['openFile'],
  filters: [
    { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
    { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
    { name: 'All Files', extensions: ['*'] }
  ]
}
```

**Returns**:

```typescript
{
  success: true;
  filePaths: string[];  // Selected file paths
  canceled: boolean;    // Whether dialog was canceled
}
```

**Example**:

```typescript
const result = await window.justiceAPI.selectFile({
  filters: [
    { name: 'PDF Documents', extensions: ['pdf'] }
  ],
  properties: ['openFile']
});

if (result.success && !result.canceled) {
  console.log("Selected file:", result.filePaths[0]);
}
```

---

### file:upload

**Description**: Uploads a file and extracts text content.

**Channel**: `IPC_CHANNELS.FILE_UPLOAD`

**Handler**: Lines 469-529 in `electron/main.ts`

**Parameters**:

```typescript
{
  filePath: string;  // Absolute path to file
}
```

**Returns**:

```typescript
{
  success: true;
  fileName: string;
  fileSize: number;          // Bytes
  mimeType: string;          // MIME type
  extractedText?: string;    // Text content (PDF, DOCX, TXT only)
}
```

**Supported Formats**:
- **PDF**: Extracted via `pdf-parse`
- **DOCX**: Extracted via `mammoth`
- **TXT**: Read as UTF-8 text
- **Images**: No text extraction (JPG, PNG)

**Limits**:
- Max file size: 50MB
- Larger files are rejected with error

**Example**:

```typescript
const result = await window.justiceAPI.uploadFile("/path/to/document.pdf");

if (result.success) {
  console.log("File:", result.fileName);
  console.log("Size:", result.fileSize);
  console.log("Text:", result.extractedText?.substring(0, 100));
}
```

---

## Conversation Management APIs

### conversation:create

**Description**: Creates a new chat conversation.

**Channel**: `IPC_CHANNELS.CONVERSATION_CREATE`

**Handler**: Lines 532-546 in `electron/main.ts`

**Parameters**:

```typescript
{
  input: {
    title?: string;     // Optional conversation title
    caseId?: number;    // Optional case association
  }
}
```

**Returns**:

```typescript
{
  success: true;
  data: {
    id: number;
    title: string | null;
    caseId: number | null;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Example**:

```typescript
const result = await window.justiceAPI.createConversation({
  title: "Legal advice on dismissal",
  caseId: 123
});

if (result.success) {
  console.log("Conversation created:", result.data.id);
}
```

---

### conversation:get

**Description**: Retrieves a conversation by ID (without messages).

**Channel**: `IPC_CHANNELS.CONVERSATION_GET`

**Handler**: Lines 549-563 in `electron/main.ts`

**Parameters**:

```typescript
{
  id: number;  // Conversation ID
}
```

**Returns**:

```typescript
{
  success: true;
  data: ChatConversation | null;
}
```

**Example**:

```typescript
const result = await window.justiceAPI.getConversation(456);

if (result.success && result.data) {
  console.log("Conversation:", result.data.title);
}
```

---

### conversation:getAll

**Description**: Lists all conversations, optionally filtered by case.

**Channel**: `IPC_CHANNELS.CONVERSATION_GET_ALL`

**Handler**: Lines 566-580 in `electron/main.ts`

**Parameters**:

```typescript
{
  caseId?: number | null;  // Optional: filter by case ID
}
```

**Returns**:

```typescript
{
  success: true;
  data: ChatConversation[];
}
```

**Example**:

```typescript
// Get all conversations for case 123
const result = await window.justiceAPI.getAllConversations(123);

if (result.success) {
  console.log(`Found ${result.data.length} conversations`);
}

// Get all conversations (no filter)
const allResult = await window.justiceAPI.getAllConversations();
```

---

### conversation:getRecent

**Description**: Retrieves recent conversations for a case.

**Channel**: `IPC_CHANNELS.CONVERSATION_GET_RECENT`

**Handler**: Lines 583-600 in `electron/main.ts`

**Parameters**:

```typescript
{
  caseId: number | null;  // Case ID or null for all
  limit?: number;         // Max conversations to return (default: varies)
}
```

**Returns**:

```typescript
{
  success: true;
  data: ChatConversation[];  // Ordered by most recent first
}
```

**Example**:

```typescript
const result = await window.justiceAPI.getRecentConversations(123, 5);

if (result.success) {
  console.log("Recent conversations:", result.data);
}
```

---

### conversation:loadWithMessages

**Description**: Loads a conversation with all messages.

**Channel**: `IPC_CHANNELS.CONVERSATION_LOAD_WITH_MESSAGES`

**Handler**: Lines 603-617 in `electron/main.ts`

**Parameters**:

```typescript
{
  conversationId: number;
}
```

**Returns**:

```typescript
{
  success: true;
  data: {
    conversation: ChatConversation;
    messages: Array<{
      id: number;
      conversationId: number;
      role: string;
      content: string;
      createdAt: string;
    }>;
  } | null;
}
```

**Example**:

```typescript
const result = await window.justiceAPI.loadConversationWithMessages(456);

if (result.success && result.data) {
  console.log("Conversation:", result.data.conversation.title);
  console.log("Messages:", result.data.messages.length);
}
```

---

### conversation:delete

**Description**: Deletes a conversation (cascades to messages).

**Channel**: `IPC_CHANNELS.CONVERSATION_DELETE`

**Handler**: Lines 620-634 in `electron/main.ts`

**Parameters**:

```typescript
{
  id: number;  // Conversation ID
}
```

**Returns**:

```typescript
{
  success: true;
}
```

**Example**:

```typescript
const result = await window.justiceAPI.deleteConversation(456);

if (result.success) {
  console.log("Conversation deleted");
}
```

---

### message:add

**Description**: Adds a message to a conversation.

**Channel**: `IPC_CHANNELS.MESSAGE_ADD`

**Handler**: Lines 637-653 in `electron/main.ts`

**Parameters**:

```typescript
{
  input: {
    conversationId: number;
    role: string;      // 'user' | 'assistant' | 'system'
    content: string;
  }
}
```

**Returns**:

```typescript
{
  success: true;
  data: ChatConversation;  // Updated conversation
}
```

**Example**:

```typescript
const result = await window.justiceAPI.addMessage({
  conversationId: 456,
  role: "user",
  content: "What are my options for appealing this decision?"
});

if (result.success) {
  console.log("Message added to conversation:", result.data.id);
}
```

---

## User Profile APIs

### profile:get

**Description**: Retrieves the user profile.

**Channel**: `IPC_CHANNELS.PROFILE_GET`

**Handler**: Lines 656-670 in `electron/main.ts`

**Parameters**:

```typescript
{
  // Empty object
}
```

**Returns**:

```typescript
{
  success: true;
  data: {
    id: number;
    name: string | null;
    email: string | null;
    preferences: Record<string, any>;  // JSON preferences
    createdAt: string;
    updatedAt: string;
  }
}
```

**Example**:

```typescript
const result = await window.justiceAPI.getUserProfile();

if (result.success) {
  console.log("User:", result.data.name);
  console.log("Email:", result.data.email);
}
```

---

### profile:update

**Description**: Updates the user profile.

**Channel**: `IPC_CHANNELS.PROFILE_UPDATE`

**Handler**: Lines 673-687 in `electron/main.ts`

**Parameters**:

```typescript
{
  input: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
  }
}
```

**Returns**:

```typescript
{
  success: true;
  data: UserProfile;  // Updated profile
}
```

**Example**:

```typescript
const result = await window.justiceAPI.updateUserProfile({
  name: "Jane Smith",
  email: "jane.smith@example.com",
  preferences: {
    theme: "dark",
    notifications: true
  }
});

if (result.success) {
  console.log("Profile updated:", result.data);
}
```

---

## Model Management APIs

### model:getAvailable

**Description**: Lists all available AI models for download.

**Channel**: `IPC_CHANNELS.MODEL_GET_AVAILABLE`

**Handler**: Lines 690-704 in `electron/main.ts`

**Parameters**:

```typescript
{
  // Empty object
}
```

**Returns**:

```typescript
{
  success: true;
  models: Array<{
    id: string;
    name: string;
    fileName: string;
    url: string;
    size: number;         // Bytes
    sha256?: string;      // Checksum
    description: string;
    recommended: boolean;
  }>;
}
```

**Example**:

```typescript
const result = await window.justiceAPI.getAvailableModels();

if (result.success) {
  result.models.forEach(m => {
    console.log(`${m.name} - ${m.size} bytes`);
  });
}
```

---

### model:getDownloaded

**Description**: Lists all downloaded AI models.

**Channel**: `IPC_CHANNELS.MODEL_GET_DOWNLOADED`

**Handler**: Lines 707-721 in `electron/main.ts`

**Parameters**:

```typescript
{
  // Empty object
}
```

**Returns**:

```typescript
{
  success: true;
  models: ModelInfo[];  // Same structure as getAvailable
}
```

**Example**:

```typescript
const result = await window.justiceAPI.getDownloadedModels();

if (result.success) {
  console.log(`${result.models.length} models downloaded`);
}
```

---

### model:isDownloaded

**Description**: Checks if a specific model is downloaded.

**Channel**: `IPC_CHANNELS.MODEL_IS_DOWNLOADED`

**Handler**: Lines 724-738 in `electron/main.ts`

**Parameters**:

```typescript
{
  modelId: string;  // Model identifier
}
```

**Returns**:

```typescript
{
  success: true;
  downloaded: boolean;
  path?: string;  // Local path if downloaded
}
```

**Example**:

```typescript
const result = await window.justiceAPI.isModelDownloaded("llama-3.2-8b");

if (result.success && result.downloaded) {
  console.log("Model path:", result.path);
} else {
  console.log("Model not downloaded");
}
```

---

### model:download:start

**Description**: Starts downloading an AI model. Progress sent via events.

**Channel**: `IPC_CHANNELS.MODEL_DOWNLOAD_START`

**Handler**: Lines 742-761 in `electron/main.ts`

**Parameters**:

```typescript
{
  modelId: string;  // Model to download
}
```

**Returns**:

```typescript
{
  success: true;
  modelId: string;
}
```

**Events** (sent from main to renderer):

- `MODEL_DOWNLOAD_PROGRESS`: Progress update
  ```typescript
  {
    modelId: string;
    downloadedBytes: number;
    totalBytes: number;
    percentage: number;
    speed: number;          // Bytes/sec
    status: 'downloading' | 'complete' | 'error' | 'paused';
    error?: string;
  }
  ```

**Example**:

```typescript
// Not yet exposed in preload - implementation pending
```

---

### model:delete

**Description**: Deletes a downloaded AI model.

**Channel**: `IPC_CHANNELS.MODEL_DELETE`

**Handler**: Lines 764-778 in `electron/main.ts`

**Parameters**:

```typescript
{
  modelId: string;  // Model to delete
}
```

**Returns**:

```typescript
{
  success: true;
  deleted: boolean;  // Whether deletion succeeded
}
```

**Example**:

```typescript
const result = await window.justiceAPI.deleteModel("llama-3.2-8b");

if (result.success && result.deleted) {
  console.log("Model deleted successfully");
}
```

---

## Error Handling

All IPC handlers return a consistent error response format:

```typescript
{
  success: false;
  error: string;  // Human-readable error message
}
```

### Common Error Scenarios

1. **Validation Errors**: Invalid parameters (missing required fields, wrong types)
2. **Database Errors**: SQLite errors (constraint violations, foreign key errors)
3. **Encryption Errors**: Missing encryption key or decryption failure
4. **File System Errors**: File not found, permission denied, file too large
5. **AI Service Errors**: Connection timeout, API errors

### Error Handling Best Practices

```typescript
const result = await window.justiceAPI.createCase({
  title: "Test Case",
  caseType: "employment"
});

if (!result.success) {
  // Handle error
  console.error("Failed to create case:", result.error);
  showErrorNotification(result.error);
  return;
}

// Success - use result.data
console.log("Case created:", result.data.id);
```

### Audit Logging of Errors

Failed operations are automatically logged to the audit trail with:
- `success: false`
- `errorMessage: string` (from the error)
- All other metadata (eventType, resourceId, etc.)

---

## Development Tools

### MCP Server Integration

Justice Companion provides an MCP (Model Context Protocol) server for development and testing. This server exposes 9 IPC handlers via HTTP at `http://localhost:5555`.

**Available MCP Tools**:

1. `cases:create` - Create test cases
2. `cases:get` - Get case by ID
3. `cases:list` - List all cases
4. `cases:update` - Update case
5. `cases:delete` - Delete case
6. `cases:createTestFixture` - Create test data
7. `database:query` - Execute SELECT queries
8. `database:migrate` - Run migrations
9. `database:backup` - Backup database

**Dev API Endpoints**:

```bash
# Health check
GET http://localhost:5555/dev-api/health

# List handlers
GET http://localhost:5555/dev-api/handlers

# Invoke IPC handler
POST http://localhost:5555/dev-api/ipc
Content-Type: application/json

{
  "channel": "dev-api:cases:create",
  "args": {
    "title": "Test Case",
    "caseType": "employment",
    "description": "Test description"
  }
}
```

**Security Note**: Dev API server only runs in development mode (`NODE_ENV !== 'production'`).

---

## Type Definitions

All IPC types are defined in `src/types/ipc.ts`. Key types:

```typescript
// Case types
export type CaseType = 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other';
export type CaseStatus = 'active' | 'closed' | 'pending';

// Response wrapper
export type IPCResponse<T> = T | IPCErrorResponse;

// Error response
export interface IPCErrorResponse {
  success: false;
  error: string;
}
```

See `src/types/ipc.ts` for complete type definitions.

---

## Related Documentation

- **Encryption Service**: `ENCRYPTION_SERVICE_IMPLEMENTATION.md`
- **Audit Logs**: `AUDIT_LOGS_*.md` (4 files)
- **Tactical Protocol**: `JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md`
- **MCP Server**: `mcp-server/*.md` (3 files)
- **Development Guide**: `CLAUDE.md`

---

**Last Updated**: 2025-10-05
**Maintained By**: Agent Juliet (Documentation Specialist)

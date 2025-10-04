# IPC Handlers Required for Cases Tools

Agent Alpha should implement these handlers in electron/main.ts:

## 1. dev-api:cases:create
**Purpose**: Create new case

**Input**:
```typescript
{
  title: string;        // Required, max 200 chars
  type: "employment" | "housing" | "consumer" | "civil";  // Required
  description?: string; // Optional, max 5000 chars
  status?: "active" | "archived" | "closed";  // Optional, defaults to "active"
}
```

**Output**:
```typescript
{
  id: string;
  title: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

## 2. dev-api:cases:get
**Purpose**: Get case by ID

**Input**: `id` (string)

**Output**:
```typescript
{
  id: string;
  title: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

## 3. dev-api:cases:list
**Purpose**: List cases with filters

**Input**:
```typescript
{
  type?: "employment" | "housing" | "consumer" | "civil";
  status?: "active" | "archived" | "closed";
  limit?: number;  // Default: 50, Max: 1000
}
```

**Output**: Array of Case objects
```typescript
Array<{
  id: string;
  title: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}>
```

## 4. dev-api:cases:update
**Purpose**: Update case

**Input**:
```typescript
{
  id: string;        // Required
  updates: {
    title?: string;        // Max 200 chars
    description?: string;  // Max 5000 chars
    status?: "active" | "archived" | "closed";
  }
}
```

**Output**: Updated Case object
```typescript
{
  id: string;
  title: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

## 5. dev-api:cases:delete
**Purpose**: Delete case (soft delete with audit log)

**Input**: `id` (string)

**Output**:
```typescript
{
  success: true;
}
```

**Note**: Should perform soft delete and create audit log entry.

## 6. dev-api:cases:createTestFixture
**Purpose**: Create test fixture with case + documents + conversations

**Input**:
```typescript
{
  caseType: "employment" | "housing" | "consumer" | "civil";  // Required
  includeDocuments: boolean;      // Default: true
  includeConversations: boolean;  // Default: true
  documentCount: number;          // Default: 3, Min: 0, Max: 10
  conversationCount: number;      // Default: 2, Min: 0, Max: 5
}
```

**Output**:
```typescript
{
  caseId: string;
  documentIds: string[];
  conversationIds: string[];
}
```

## Implementation Notes

1. All handlers should use proper error handling and validation
2. Database operations should be wrapped in try-catch blocks
3. Dates should be stored in ISO 8601 format
4. Case IDs should be UUIDs or nanoids
5. Soft delete should set a `deletedAt` timestamp instead of removing records
6. Test fixtures should create realistic sample data based on case type
7. All operations should be logged for audit purposes

## Database Schema Requirements

The handlers will need access to at least these tables:
- `cases` - Main case storage
- `documents` - Case documents (for test fixtures)
- `conversations` - AI conversations (for test fixtures)
- `audit_log` - Audit trail for deletions and updates

## Example Usage

```typescript
// In electron/main.ts
ipcMain.handle('dev-api:cases:create', async (event, args) => {
  const db = getDatabase();
  // Validate inputs
  // Create case record
  // Return case object
});

ipcMain.handle('dev-api:cases:get', async (event, id) => {
  const db = getDatabase();
  // Fetch case by ID
  // Return case object or throw error
});

// ... similar patterns for other handlers
```

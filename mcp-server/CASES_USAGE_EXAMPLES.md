# Cases Tools - Usage Examples

## Overview
The Cases Tools provide 6 operations for managing legal cases in the Justice Companion application.

## Tool List

1. **cases:create** - Create a new legal case
2. **cases:get** - Retrieve a specific case by ID
3. **cases:list** - List all cases with optional filtering
4. **cases:update** - Update an existing case
5. **cases:delete** - Delete a case (soft delete)
6. **cases:createTestFixture** - Create a complete test fixture

---

## Example 1: Create a New Employment Case

```json
{
  "tool": "cases:create",
  "arguments": {
    "title": "Wrongful Termination - Tech Corp",
    "type": "employment",
    "description": "Client was terminated without proper notice after reporting workplace safety violations. Seeking compensation for lost wages and emotional distress.",
    "status": "active"
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Case created successfully\n\n{\n  \"id\": \"case-123456\",\n  \"title\": \"Wrongful Termination - Tech Corp\",\n  \"type\": \"employment\",\n  \"description\": \"Client was terminated...\",\n  \"status\": \"active\",\n  \"createdAt\": \"2025-10-05T00:08:00Z\",\n  \"updatedAt\": \"2025-10-05T00:08:00Z\"\n}"
    }
  ]
}
```

---

## Example 2: Get a Specific Case

```json
{
  "tool": "cases:get",
  "arguments": {
    "id": "case-123456"
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"id\": \"case-123456\",\n  \"title\": \"Wrongful Termination - Tech Corp\",\n  \"type\": \"employment\",\n  \"description\": \"Client was terminated...\",\n  \"status\": \"active\",\n  \"createdAt\": \"2025-10-05T00:08:00Z\",\n  \"updatedAt\": \"2025-10-05T00:08:00Z\"\n}"
    }
  ]
}
```

---

## Example 3: List All Active Employment Cases

```json
{
  "tool": "cases:list",
  "arguments": {
    "type": "employment",
    "status": "active",
    "limit": 10
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Found 3 cases\n\n[\n  {\n    \"id\": \"case-123456\",\n    \"title\": \"Wrongful Termination - Tech Corp\",\n    \"type\": \"employment\",\n    \"status\": \"active\"\n  },\n  {\n    \"id\": \"case-789012\",\n    \"title\": \"Wage Dispute - Restaurant\",\n    \"type\": \"employment\",\n    \"status\": \"active\"\n  },\n  {\n    \"id\": \"case-345678\",\n    \"title\": \"Discrimination Claim\",\n    \"type\": \"employment\",\n    \"status\": \"active\"\n  }\n]"
    }
  ]
}
```

---

## Example 4: Update Case Status

```json
{
  "tool": "cases:update",
  "arguments": {
    "id": "case-123456",
    "status": "closed",
    "description": "Client was terminated without proper notice. RESOLVED: Settlement reached for $45,000."
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Case updated successfully\n\n{\n  \"id\": \"case-123456\",\n  \"title\": \"Wrongful Termination - Tech Corp\",\n  \"type\": \"employment\",\n  \"description\": \"Client was terminated... RESOLVED: Settlement reached for $45,000.\",\n  \"status\": \"closed\",\n  \"createdAt\": \"2025-10-05T00:08:00Z\",\n  \"updatedAt\": \"2025-10-05T00:15:30Z\"\n}"
    }
  ]
}
```

---

## Example 5: Delete a Case

```json
{
  "tool": "cases:delete",
  "arguments": {
    "id": "case-123456"
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Case case-123456 deleted successfully"
    }
  ]
}
```

---

## Example 6: Create a Housing Test Fixture

```json
{
  "tool": "cases:createTestFixture",
  "arguments": {
    "caseType": "housing",
    "includeDocuments": true,
    "includeConversations": true,
    "documentCount": 5,
    "conversationCount": 3
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Test fixture created successfully\n\nCase ID: case-housing-fixture-001\nDocuments: 5 created\nConversations: 3 created\n\nFull details:\n{\n  \"caseId\": \"case-housing-fixture-001\",\n  \"documentIds\": [\n    \"doc-001\",\n    \"doc-002\",\n    \"doc-003\",\n    \"doc-004\",\n    \"doc-005\"\n  ],\n  \"conversationIds\": [\n    \"conv-001\",\n    \"conv-002\",\n    \"conv-003\"\n  ]\n}"
    }
  ]
}
```

---

## Case Types

- **employment**: Workplace-related cases (termination, discrimination, wage disputes)
- **housing**: Landlord-tenant disputes, evictions, housing discrimination
- **consumer**: Product defects, contract disputes, fraud
- **civil**: General civil litigation matters

## Case Statuses

- **active**: Case is currently being worked on
- **archived**: Case is inactive but preserved for reference
- **closed**: Case has been resolved or concluded

---

## Validation Rules

### cases:create
- `title`: Required, 1-200 characters
- `type`: Required, must be one of: employment, housing, consumer, civil
- `description`: Optional, max 5000 characters
- `status`: Optional, defaults to "active"

### cases:update
- `id`: Required
- At least one update field must be provided
- `title`: Max 200 characters if provided
- `description`: Max 5000 characters if provided
- `status`: Must be valid enum value if provided

### cases:createTestFixture
- `caseType`: Required
- `documentCount`: 0-10 (default: 3)
- `conversationCount`: 0-5 (default: 2)

---

## Error Handling

All tools return structured error responses:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error executing cases:create: Invalid title: must be 1-200 characters"
    }
  ],
  "isError": true
}
```

Common error scenarios:
- Invalid case type enum value
- Missing required fields
- Invalid ID (case not found)
- Validation failures (string length, numeric ranges)
- Database connection errors
- IPC communication failures

---

## Integration with MCP Server

The CaseTools class is designed to be integrated into the main MCP server:

```typescript
import { CaseTools } from "./tools/cases.js";
import { IPCClient } from "./types.js";

// Initialize with IPC client
const ipcClient: IPCClient = /* your IPC client implementation */;
const caseTools = new CaseTools(ipcClient);

// Register tools with MCP server
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: caseTools.getToolDefinitions()
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name.startsWith("cases:")) {
    return await caseTools.executeTool(name, args || {});
  }

  // Handle other tools...
});
```

---

## Development Workflow

1. **Create test case**:
   ```bash
   cases:create with employment data
   ```

2. **Add test data**:
   ```bash
   cases:createTestFixture for that case type
   ```

3. **Verify setup**:
   ```bash
   cases:list to see all cases
   cases:get to inspect specific case
   ```

4. **Test updates**:
   ```bash
   cases:update to modify case
   ```

5. **Clean up**:
   ```bash
   cases:delete to remove test data
   ```

---

## Best Practices

1. **Use descriptive titles**: Make it easy to identify cases at a glance
2. **Include detailed descriptions**: Provide context for future reference
3. **Use test fixtures for development**: Don't manually create test data
4. **Filter lists appropriately**: Use type and status filters to narrow results
5. **Soft delete**: Cases are soft-deleted to preserve audit trail
6. **Validate before calling**: Check inputs match schema constraints

---

## Next Steps

After implementing the IPC handlers (see IPC_HANDLERS_CASES.md), you can:

1. Test each tool individually
2. Create integration tests
3. Build UI components that use these tools
4. Add additional case management features
5. Implement case search functionality
6. Add case analytics and reporting

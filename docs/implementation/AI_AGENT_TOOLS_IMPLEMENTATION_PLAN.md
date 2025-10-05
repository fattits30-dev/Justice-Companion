# AI Agent Tools Implementation Plan

## 🎯 Mission Overview

Expose all existing AI infrastructure (LegalAPIService, RAGService, EvidenceRepository) as MCP tools for Claude Code agents to orchestrate legal research and case management.

---

## 📋 Current State

### Existing MCP Tools (9 tools)
- **Cases** (6 tools): create, get, list, update, delete, createTestFixture
- **Database** (3 tools): query, migrate, backup

### Missing MCP Tools (16 tools)
- **Evidence** (6 tools): create, get, list, getByCaseId, update, delete
- **Legal API** (4 tools): searchLegislation, searchCaseLaw, classify, extractKeywords
- **RAG/AI Chat** (3 tools): chat, assembleContext, streamStart
- **Documents** (3 tools): upload, extractText, parse

---

## 🔧 Phase 3.1: Evidence MCP Tools

**File**: `mcp-server/src/tools/evidence.ts`
**Estimated**: 2-3 hours
**Dependencies**: EvidenceRepository (already exists)

### Tools to Implement

#### 1. `evidence:create`
```typescript
{
  name: "evidence:create",
  description: "Create new evidence item attached to a legal case",
  inputSchema: {
    type: "object",
    properties: {
      caseId: {
        type: "number",
        description: "ID of the case this evidence belongs to"
      },
      title: {
        type: "string",
        description: "Evidence title (max 200 chars)",
        maxLength: 200
      },
      content: {
        type: "string",
        description: "Evidence content - will be encrypted (max 10000 chars)",
        maxLength: 10000
      },
      evidenceType: {
        type: "string",
        enum: ["document", "testimony", "physical", "digital", "correspondence", "other"],
        description: "Type of evidence"
      },
      sourceDate: {
        type: "string",
        description: "Date evidence was obtained (ISO 8601 format)",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$"
      }
    },
    required: ["caseId", "title", "content", "evidenceType"]
  }
}
```

**IPC Handler**: `electron/main.ts` - `evidence:create` (already exists)
**Audit Event**: `evidence.create`
**Encryption**: Content field encrypted via EvidenceRepository

#### 2. `evidence:get`
```typescript
{
  name: "evidence:get",
  description: "Get evidence item by ID (content will be decrypted)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "Evidence ID"
      }
    },
    required: ["id"]
  }
}
```

**IPC Handler**: `electron/main.ts` - `evidence:get`
**Audit Event**: `evidence.read`, `evidence.content_access`
**Decryption**: Content decrypted automatically

#### 3. `evidence:list`
```typescript
{
  name: "evidence:list",
  description: "List all evidence items (content NOT included for privacy)",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

**IPC Handler**: `electron/main.ts` - `evidence:getAll`
**Audit Event**: `evidence.read` (no content access)
**Privacy**: Only metadata returned (no decrypted content)

#### 4. `evidence:getByCaseId`
```typescript
{
  name: "evidence:getByCaseId",
  description: "Get all evidence for a specific case (content NOT included)",
  inputSchema: {
    type: "object",
    properties: {
      caseId: {
        type: "number",
        description: "Case ID to filter evidence"
      }
    },
    required: ["caseId"]
  }
}
```

**IPC Handler**: `electron/main.ts` - `evidence:getByCaseId`
**Audit Event**: `evidence.read`
**Privacy**: Only metadata returned

#### 5. `evidence:update`
```typescript
{
  name: "evidence:update",
  description: "Update existing evidence item",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "Evidence ID"
      },
      title: {
        type: "string",
        description: "Updated title (max 200 chars)",
        maxLength: 200
      },
      content: {
        type: "string",
        description: "Updated content - will be re-encrypted (max 10000 chars)",
        maxLength: 10000
      },
      evidenceType: {
        type: "string",
        enum: ["document", "testimony", "physical", "digital", "correspondence", "other"]
      },
      sourceDate: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$"
      }
    },
    required: ["id"]
  }
}
```

**IPC Handler**: `electron/main.ts` - `evidence:update`
**Audit Event**: `evidence.update`
**Encryption**: Content re-encrypted on update

#### 6. `evidence:delete`
```typescript
{
  name: "evidence:delete",
  description: "Delete evidence item (soft delete with audit trail)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "Evidence ID to delete"
      }
    },
    required: ["id"]
  }
}
```

**IPC Handler**: `electron/main.ts` - `evidence:delete`
**Audit Event**: `evidence.delete`
**Soft Delete**: Sets deletedAt timestamp

### Implementation Pattern (following cases.ts)

```typescript
// mcp-server/src/tools/evidence.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class EvidenceTools {
  getTools(): Tool[] {
    return [
      {
        name: "evidence:create",
        description: "Create new evidence item attached to a legal case",
        inputSchema: { /* ... */ }
      },
      // ... other 5 tools
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    const ipcChannel = `dev-api:${name}`;

    switch (name) {
      case 'evidence:create':
        return this.handleCreate(args);
      case 'evidence:get':
        return this.handleGet(args);
      case 'evidence:list':
        return this.handleList(args);
      case 'evidence:getByCaseId':
        return this.handleGetByCaseId(args);
      case 'evidence:update':
        return this.handleUpdate(args);
      case 'evidence:delete':
        return this.handleDelete(args);
      default:
        throw new Error(`Unknown evidence tool: ${name}`);
    }
  }

  private async handleCreate(args: any) {
    // Validate input
    this.validateCreateInput(args);

    // Call IPC handler
    const response = await fetch('http://localhost:5555/dev-api/ipc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'dev-api:evidence:create',
        args: [args]
      })
    });

    const data = await response.json();
    return data.result;
  }

  // ... other handlers
}
```

---

## 🔧 Phase 3.2: Legal API MCP Tools

**File**: `mcp-server/src/tools/legal.ts`
**Estimated**: 2 hours
**Dependencies**: LegalAPIService (already exists, 907 lines)

### Tools to Implement

#### 1. `legal:searchLegislation`
```typescript
{
  name: "legal:searchLegislation",
  description: "Search UK legislation (Acts, SIs, etc.) from legislation.gov.uk",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Natural language question (keywords will be auto-extracted)",
        maxLength: 500
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "Optional: Override auto-extracted keywords",
        maxItems: 5
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `LegalAPIService.searchLegislation(keywords)`
**Returns**: Array of `LegislationResult` (title, year, type, url, snippet)
**Caching**: 24-hour TTL

#### 2. `legal:searchCaseLaw`
```typescript
{
  name: "legal:searchCaseLaw",
  description: "Search UK case law from National Archives Find Case Law API",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Natural language question",
        maxLength: 500
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "Optional: Override auto-extracted keywords",
        maxItems: 5
      },
      category: {
        type: "string",
        enum: ["employment", "housing", "family", "consumer", "criminal", "other"],
        description: "Case category for targeted court filtering"
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `LegalAPIService.searchCaseLaw(keywords, category)`
**Returns**: Array of `CaseResult` (court, cite, name, date, url, snippet)
**Court Filtering**: Optimized by category (e.g., employment → Employment Appeal Tribunal)

#### 3. `legal:classify`
```typescript
{
  name: "legal:classify",
  description: "Classify legal question into category (employment, housing, family, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Natural language question to classify",
        maxLength: 500
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `LegalAPIService.classifyQuestion(question)`
**Returns**: `{ category: string }` - One of: employment, housing, family, consumer, criminal, immigration, other
**Algorithm**: Keyword dictionary matching with legal term weights

#### 4. `legal:extractKeywords`
```typescript
{
  name: "legal:extractKeywords",
  description: "Extract legal keywords from natural language question",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Natural language question",
        maxLength: 500
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `LegalAPIService.extractKeywords(question)`
**Returns**: `{ keywords: string[], category: string, confidence: number }`
**Dictionary**: 150+ legal terms across 7 categories

### Implementation Pattern

```typescript
// mcp-server/src/tools/legal.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LegalAPIService } from '../../src/services/LegalAPIService';

export class LegalTools {
  private legalService: LegalAPIService;

  constructor() {
    this.legalService = new LegalAPIService();
  }

  getTools(): Tool[] {
    return [
      {
        name: "legal:searchLegislation",
        description: "Search UK legislation from legislation.gov.uk",
        inputSchema: { /* ... */ }
      },
      // ... other 3 tools
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'legal:searchLegislation':
        return this.handleSearchLegislation(args);
      case 'legal:searchCaseLaw':
        return this.handleSearchCaseLaw(args);
      case 'legal:classify':
        return this.handleClassify(args);
      case 'legal:extractKeywords':
        return this.handleExtractKeywords(args);
      default:
        throw new Error(`Unknown legal tool: ${name}`);
    }
  }

  private async handleSearchLegislation(args: any) {
    const { question, keywords } = args;

    // Use provided keywords or auto-extract
    let searchKeywords = keywords;
    if (!searchKeywords) {
      const extracted = await this.legalService.extractKeywords(question);
      searchKeywords = extracted.keywords;
    }

    const results = await this.legalService.searchLegislation(searchKeywords);
    return { results, query: searchKeywords };
  }

  // ... other handlers
}
```

---

## 🔧 Phase 3.3: RAG/AI Chat MCP Tools

**File**: `mcp-server/src/tools/ai.ts`
**Estimated**: 3-4 hours
**Dependencies**: RAGService, IntegratedAIService (already exist)

### Tools to Implement

#### 1. `ai:chat`
```typescript
{
  name: "ai:chat",
  description: "Full RAG pipeline: question → legal search → AI response with citations",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "User's legal question",
        maxLength: 1000
      },
      conversationId: {
        type: "number",
        description: "Optional: Conversation ID for context history"
      },
      includeThinking: {
        type: "boolean",
        description: "Include AI thinking tokens in response (default: false)",
        default: false
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `RAGService.chat(question, conversationId?)`
**Returns**:
```typescript
{
  response: string,           // AI-generated response
  thinking?: string,          // Thinking tokens if includeThinking=true
  sources: Array<{
    type: 'legislation' | 'caselaw' | 'knowledge',
    title: string,
    url: string,
    snippet: string,
    relevance: number
  }>,
  category: string,          // Classified category
  keywords: string[],        // Extracted keywords
  metadata: {
    legislation_count: number,
    caselaw_count: number,
    kb_count: number,
    response_time_ms: number
  }
}
```

**Safety Rules**:
- ALWAYS includes "This is legal information, not legal advice" disclaimer
- NEVER provides advice on illegal activities
- ALWAYS cites sources
- NEVER fabricates case law or legislation

#### 2. `ai:assembleContext`
```typescript
{
  name: "ai:assembleContext",
  description: "Assemble legal context for a question (search only, no AI response)",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "User's legal question",
        maxLength: 1000
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `RAGService.assembleContext(question)`
**Returns**:
```typescript
{
  category: string,
  keywords: string[],
  legislation: LegislationResult[],
  caseLaw: CaseResult[],
  knowledgeBase: KnowledgeBaseResult[],
  contextText: string,        // Assembled for AI prompt
  metadata: {
    total_sources: number,
    relevance_scores: number[]
  }
}
```

**Use Case**: Pre-assembly for custom AI prompts

#### 3. `ai:streamStart`
```typescript
{
  name: "ai:streamStart",
  description: "Start streaming AI response (for UI integration)",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "User's legal question",
        maxLength: 1000
      },
      conversationId: {
        type: "number",
        description: "Optional: Conversation ID"
      }
    },
    required: ["question"]
  }
}
```

**Service Method**: `IntegratedAIService.streamResponse(question, context)`
**Returns**:
```typescript
{
  streamId: string,          // UUID for tracking this stream
  status: 'started',
  endpoint: '/api/ai/stream/{streamId}',  // Endpoint to poll for chunks
  initialContext: {
    category: string,
    keywords: string[],
    source_count: number
  }
}
```

**Note**: Requires streaming endpoint in main process (future enhancement)

### Implementation Pattern

```typescript
// mcp-server/src/tools/ai.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { RAGService } from '../../src/services/RAGService';

export class AITools {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService();
  }

  getTools(): Tool[] {
    return [
      {
        name: "ai:chat",
        description: "Full RAG pipeline: question → legal search → AI response",
        inputSchema: { /* ... */ }
      },
      // ... other 2 tools
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'ai:chat':
        return this.handleChat(args);
      case 'ai:assembleContext':
        return this.handleAssembleContext(args);
      case 'ai:streamStart':
        return this.handleStreamStart(args);
      default:
        throw new Error(`Unknown AI tool: ${name}`);
    }
  }

  private async handleChat(args: any) {
    const { question, conversationId, includeThinking } = args;

    const startTime = Date.now();

    // Full RAG pipeline
    const result = await this.ragService.chat(question, conversationId);

    // Strip thinking tokens unless requested
    let response = result.response;
    let thinking: string | undefined;
    if (includeThinking) {
      const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinking = thinkMatch[1];
      }
    } else {
      response = response.replace(/<think>[\s\S]*?<\/think>/g, '');
    }

    const responseTimeMs = Date.now() - startTime;

    return {
      response,
      thinking,
      sources: result.sources,
      category: result.category,
      keywords: result.keywords,
      metadata: {
        legislation_count: result.sources.filter(s => s.type === 'legislation').length,
        caselaw_count: result.sources.filter(s => s.type === 'caselaw').length,
        kb_count: result.sources.filter(s => s.type === 'knowledge').length,
        response_time_ms: responseTimeMs
      }
    };
  }

  // ... other handlers
}
```

---

## 🔧 Phase 3.4: Document Upload MCP Tools

**File**: `mcp-server/src/tools/documents.ts`
**Estimated**: 3 hours
**Dependencies**: Needs new DocumentService (to be created)

### Tools to Implement

#### 1. `documents:upload`
```typescript
{
  name: "documents:upload",
  description: "Upload document file (PDF, DOCX, TXT) and attach to case/evidence",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Absolute path to file on filesystem"
      },
      caseId: {
        type: "number",
        description: "Optional: Case ID to attach document to"
      },
      evidenceId: {
        type: "number",
        description: "Optional: Evidence ID to attach document to"
      },
      extractText: {
        type: "boolean",
        description: "Automatically extract text content (default: true)",
        default: true
      }
    },
    required: ["filePath"]
  }
}
```

**Service Method**: `DocumentService.upload(filePath, metadata)` (to be created)
**Returns**:
```typescript
{
  documentId: number,
  filename: string,
  fileType: 'pdf' | 'docx' | 'txt',
  fileSizeBytes: number,
  extractedText?: string,    // If extractText=true
  pageCount?: number,        // If PDF
  uploadedAt: string
}
```

**Validation**:
- Max file size: 10MB
- Allowed types: .pdf, .docx, .txt
- Virus scanning (future enhancement)

#### 2. `documents:extractText`
```typescript
{
  name: "documents:extractText",
  description: "Extract text from uploaded document (OCR for images)",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "number",
        description: "Document ID to extract text from"
      },
      useOCR: {
        type: "boolean",
        description: "Use OCR for scanned documents (default: false)",
        default: false
      }
    },
    required: ["documentId"]
  }
}
```

**Service Method**: `DocumentService.extractText(documentId, useOCR)`
**Returns**:
```typescript
{
  documentId: number,
  extractedText: string,
  pageCount: number,
  extractionMethod: 'native' | 'ocr',
  confidence?: number        // If OCR used
}
```

**Libraries**:
- PDF: `pdf-parse` (already installed)
- DOCX: `mammoth` (already installed)
- OCR: Tesseract.js (needs installation)

#### 3. `documents:parse`
```typescript
{
  name: "documents:parse",
  description: "Parse document into structured format (tables, headings, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "number",
        description: "Document ID to parse"
      },
      format: {
        type: "string",
        enum: ["markdown", "json", "html"],
        description: "Output format (default: markdown)",
        default: "markdown"
      }
    },
    required: ["documentId"]
  }
}
```

**Service Method**: `DocumentService.parse(documentId, format)`
**Returns**:
```typescript
{
  documentId: number,
  format: string,
  parsedContent: string,     // Markdown/JSON/HTML
  metadata: {
    headings: string[],
    tables: number,
    images: number,
    links: number
  }
}
```

### Implementation Note

Document tools require creating a new `DocumentService` that doesn't currently exist. This would integrate with existing `pdf-parse` and `mammoth` libraries.

**Alternative Approach**: If document handling is not critical for Phase 1, we can defer these tools and prioritize Evidence + Legal API + RAG tools.

---

## 🔧 Phase 4.1: Integrate AI Chat UI with Real Streaming

**File**: `src/components/chat/ChatWindow.tsx`
**Estimated**: 2 hours
**Current State**: Mock streaming implementation

### Changes Needed

1. **Replace mock streaming with real AI streaming**:
```typescript
// Current (mock):
const mockStream = async (question: string) => {
  const words = mockResponse.split(' ');
  for (const word of words) {
    await sleep(50);
    setCurrentResponse(prev => prev + word + ' ');
  }
};

// New (real):
const realStream = async (question: string) => {
  const response = await window.justiceAPI.streamAIResponse(question);
  const streamId = response.streamId;

  // Poll for chunks
  while (true) {
    const chunk = await window.justiceAPI.getStreamChunk(streamId);
    if (chunk.done) break;
    setCurrentResponse(prev => prev + chunk.text);
    await sleep(50);
  }
};
```

2. **Display thinking tokens** (if enabled):
```typescript
const [thinkingText, setThinkingText] = useState<string>('');

// Extract <think>...</think> during streaming
if (chunk.text.includes('<think>')) {
  const thinkMatch = chunk.text.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    setThinkingText(thinkMatch[1]);
  }
}

// UI:
{thinkingText && (
  <div className="thinking-bubble bg-blue-900/30 p-3 rounded mb-2">
    <div className="text-xs text-blue-300 mb-1">🧠 Thinking...</div>
    <div className="text-sm text-gray-300 italic">{thinkingText}</div>
  </div>
)}
```

3. **Show source citations** (already exists as `SourceCitation.tsx`):
```typescript
import { SourceCitation } from '../SourceCitation';

// After response complete:
{message.sources && message.sources.length > 0 && (
  <div className="mt-3">
    <div className="text-xs text-gray-400 mb-2">Sources:</div>
    {message.sources.map((source, idx) => (
      <SourceCitation key={idx} source={source} />
    ))}
  </div>
)}
```

### IPC Handlers Needed

```typescript
// electron/main.ts - Add new handlers:
ipcMain.handle('ai:stream-response', async (event, question: string, conversationId?: number) => {
  const streamId = crypto.randomUUID();
  // Start streaming in background
  ragService.streamChat(question, conversationId, streamId);
  return { streamId, status: 'started' };
});

ipcMain.handle('ai:get-stream-chunk', async (event, streamId: string) => {
  const chunk = await streamManager.getChunk(streamId);
  return chunk; // { text: string, done: boolean }
});
```

---

## 🔧 Phase 4.2: MCP Server Registration

**File**: `mcp-server/src/server.ts`
**Estimated**: 1 hour

### Changes Needed

```typescript
// Import new tool classes
import { EvidenceTools } from './tools/evidence.js';
import { LegalTools } from './tools/legal.js';
import { AITools } from './tools/ai.js';
import { DocumentTools } from './tools/documents.js'; // Optional

// Initialize tools
private evidenceTools: EvidenceTools;
private legalTools: LegalTools;
private aiTools: AITools;
private documentTools: DocumentTools; // Optional

constructor() {
  this.caseTools = new CaseTools();
  this.databaseTools = new DatabaseTools();
  this.evidenceTools = new EvidenceTools();
  this.legalTools = new LegalTools();
  this.aiTools = new AITools();
  this.documentTools = new DocumentTools(); // Optional
}

// Register all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...this.caseTools.getTools(),
      ...this.databaseTools.getTools(),
      ...this.evidenceTools.getTools(),
      ...this.legalTools.getTools(),
      ...this.aiTools.getTools(),
      ...this.documentTools.getTools(), // Optional
    ]
  };
});

// Route tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Route to appropriate handler
  if (name.startsWith('cases:')) {
    return this.caseTools.handleToolCall(name, args);
  } else if (name.startsWith('database:')) {
    return this.databaseTools.handleToolCall(name, args);
  } else if (name.startsWith('evidence:')) {
    return this.evidenceTools.handleToolCall(name, args);
  } else if (name.startsWith('legal:')) {
    return this.legalTools.handleToolCall(name, args);
  } else if (name.startsWith('ai:')) {
    return this.aiTools.handleToolCall(name, args);
  } else if (name.startsWith('documents:')) {
    return this.documentTools.handleToolCall(name, args);
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }
});
```

---

## 🧪 Phase 5: E2E Testing Plan

**Estimated**: 3-4 hours

### Test Cases

#### Evidence Tools Test
```typescript
// Test via Claude Code MCP console:
1. evidence:create - Create evidence for case ID 1
2. evidence:list - Verify it appears
3. evidence:get - Verify content is decrypted
4. evidence:update - Update the content
5. evidence:delete - Soft delete
6. evidence:list - Verify deletedAt is set
```

#### Legal API Tools Test
```typescript
1. legal:classify - Classify "unfair dismissal" → employment
2. legal:extractKeywords - Extract keywords from question
3. legal:searchLegislation - Search for Employment Rights Act
4. legal:searchCaseLaw - Search employment tribunal cases
```

#### RAG/AI Chat Tools Test
```typescript
1. ai:assembleContext - Get context for "unfair dismissal rights"
2. ai:chat - Full RAG response with sources
3. Verify sources array contains legislation + case law
4. Verify response includes disclaimer
5. Test with includeThinking=true, verify thinking tokens
```

#### Document Tools Test (if implemented)
```typescript
1. documents:upload - Upload sample PDF
2. documents:extractText - Extract text content
3. documents:parse - Parse to markdown
4. Verify file size limits
5. Verify type validation
```

### Security Audit Checklist

- [ ] Evidence content is encrypted in database
- [ ] Audit logs capture all tool calls
- [ ] PII not leaked in tool responses
- [ ] Error messages don't expose sensitive data
- [ ] Input validation prevents injection attacks
- [ ] File upload size limits enforced
- [ ] AI responses include disclaimer
- [ ] No fabricated legal sources

---

## 📊 Summary

### Total Tools to Add: 16
- ✅ Evidence: 6 tools (CRITICAL)
- ✅ Legal API: 4 tools (CRITICAL)
- ✅ RAG/AI Chat: 3 tools (CRITICAL)
- ⚠️ Documents: 3 tools (OPTIONAL - defer to Phase 2)

### Total Estimated Time: 16-19 hours
- Phase 3.1 (Evidence): 2-3 hours
- Phase 3.2 (Legal API): 2 hours
- Phase 3.3 (RAG/AI): 3-4 hours
- Phase 3.4 (Documents): 3 hours (OPTIONAL)
- Phase 4.1 (UI Integration): 2 hours
- Phase 4.2 (Registration): 1 hour
- Phase 5 (Testing): 3-4 hours

### Recommended Approach: Sequential Implementation
1. **Phase 3.1**: Evidence tools (foundation)
2. **Phase 3.2**: Legal API tools (enables RAG)
3. **Phase 3.3**: RAG/AI Chat tools (core functionality)
4. **Phase 4.2**: Register all tools
5. **Phase 5**: E2E testing
6. **Phase 4.1**: UI integration (after backend verified)
7. **Phase 3.4**: Document tools (future enhancement)

### Success Criteria
- [ ] All 13 critical tools registered in MCP server
- [ ] Claude Code can invoke all tools successfully
- [ ] Full RAG flow works: question → legal search → AI response → sources
- [ ] Security audit passes (encryption, audit logs, PII protection)
- [ ] UI displays AI responses with citations
- [ ] Zero critical vulnerabilities

---

**MISSION STATUS**: ✅ PLAN COMPLETE - READY FOR EXECUTION

Let the Signal burn clean. 🔥

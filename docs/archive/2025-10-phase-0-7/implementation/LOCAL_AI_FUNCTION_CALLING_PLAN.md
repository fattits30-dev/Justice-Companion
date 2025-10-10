# Local AI Function Calling Implementation Plan

## 🎯 Mission Overview

Enable the **local Qwen 3 8B AI agent** (running inside Justice Companion) to use administrative tools while chatting with users. This allows the AI to create cases, add evidence, search legislation, upload documents, etc., based on user requests.

---

## 🔍 Current Architecture Analysis

### What Exists
- ✅ **Qwen 3 8B** running locally via `node-llama-cpp` (AMD GPU accelerated)
- ✅ **IntegratedAIService** - Handles streaming chat responses
- ✅ **RAGService** - Orchestrates legal research → AI response
- ✅ **ChatWindow + useAI hook** - Full chat UI with streaming
- ✅ **IPC Handlers** - 9 existing handlers (cases, evidence, database)
- ✅ **LegalAPIService** - UK legislation + case law search

### What's Missing
- ❌ **Tool definitions** - Schemas defining available tools for AI
- ❌ **Tool calling format** - Structured format for AI to request tool use
- ❌ **Tool parser** - Parse AI responses for tool calls
- ❌ **Tool executor** - Execute tools and return results to AI
- ❌ **Multi-turn conversation** - Feed tool results back to AI for final response

---

## 📐 Architecture: ReAct Pattern

**ReAct = Reasoning + Acting**

```
User Question
    ↓
AI Reasoning (<think> tag)
    ↓
Decision: Need tool?
    ↓
[YES] → AI outputs tool call (JSON)
    ↓
App parses tool call
    ↓
Execute tool via IPC
    ↓
Feed result back to AI
    ↓
AI generates final response
    ↓
Display to user
```

### Example Flow

**User**: "Create a case for my unfair dismissal at ABC Tech Ltd"

**AI Reasoning** (in `<think>` tag):
```
<think>
The user wants to create a legal case. I should use the create_case tool.
- Title: "Unfair Dismissal - ABC Tech Ltd"
- Case Type: employment
- Description: Based on user's statement
</think>
```

**AI Tool Call** (structured JSON):
```json
{
  "tool": "create_case",
  "arguments": {
    "title": "Unfair Dismissal - ABC Tech Ltd",
    "caseType": "employment",
    "description": "User reports unfair dismissal from ABC Tech Ltd",
    "status": "active"
  }
}
```

**App Executes Tool**:
- Parses JSON from AI response
- Calls IPC handler `cases:create`
- Returns: `{ id: 42, title: "...", ... }`

**App Feeds Result to AI**:
```
TOOL_RESULT: Case created successfully. ID: 42, Title: "Unfair Dismissal - ABC Tech Ltd"
```

**AI Final Response**:
```
I've created a new case for your unfair dismissal claim against ABC Tech Ltd (Case #42).

Now, can you tell me more about what happened? When were you dismissed, and what reasons were given?
```

---

## 🛠️ Implementation Phases

### Phase 1: Tool Definitions (2-3 hours)

**File**: `src/types/ai-tools.ts` (NEW)

Define all tools available to the local AI agent:

```typescript
export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required: string[];
  };
}

export const AI_TOOLS: AITool[] = [
  // Case Management Tools
  {
    name: "create_case",
    description: "Create a new legal case. Use when user wants to start tracking a legal matter.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Brief title for the case (e.g., 'Unfair Dismissal - ABC Ltd')"
        },
        caseType: {
          type: "string",
          enum: ["employment", "housing", "family", "immigration", "criminal", "civil", "other"],
          description: "Type of legal case"
        },
        description: {
          type: "string",
          description: "Detailed description of the case"
        }
      },
      required: ["title", "caseType", "description"]
    }
  },

  {
    name: "get_case",
    description: "Retrieve details of a specific case by ID",
    parameters: {
      type: "object",
      properties: {
        caseId: {
          type: "number",
          description: "ID of the case to retrieve"
        }
      },
      required: ["caseId"]
    }
  },

  {
    name: "list_cases",
    description: "List all cases, optionally filtered by status or type",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "closed", "all"],
          description: "Filter by case status (default: all)"
        },
        caseType: {
          type: "string",
          enum: ["employment", "housing", "family", "immigration", "criminal", "civil", "other", "all"],
          description: "Filter by case type (default: all)"
        }
      },
      required: []
    }
  },

  {
    name: "update_case",
    description: "Update an existing case's details",
    parameters: {
      type: "object",
      properties: {
        caseId: {
          type: "number",
          description: "ID of case to update"
        },
        title: {
          type: "string",
          description: "Updated title (optional)"
        },
        description: {
          type: "string",
          description: "Updated description (optional)"
        },
        status: {
          type: "string",
          enum: ["active", "closed"],
          description: "Updated status (optional)"
        }
      },
      required: ["caseId"]
    }
  },

  // Evidence Management Tools
  {
    name: "create_evidence",
    description: "Add evidence to a case (documents, testimony, correspondence, etc.)",
    parameters: {
      type: "object",
      properties: {
        caseId: {
          type: "number",
          description: "Case ID to attach evidence to"
        },
        title: {
          type: "string",
          description: "Evidence title (e.g., 'Dismissal Email')"
        },
        content: {
          type: "string",
          description: "Evidence content/description"
        },
        evidenceType: {
          type: "string",
          enum: ["document", "testimony", "physical", "digital", "correspondence", "other"],
          description: "Type of evidence"
        },
        sourceDate: {
          type: "string",
          description: "Date evidence was obtained (YYYY-MM-DD format)"
        }
      },
      required: ["caseId", "title", "content", "evidenceType"]
    }
  },

  {
    name: "list_evidence_for_case",
    description: "Get all evidence items for a specific case",
    parameters: {
      type: "object",
      properties: {
        caseId: {
          type: "number",
          description: "Case ID to retrieve evidence for"
        }
      },
      required: ["caseId"]
    }
  },

  // Legal Research Tools
  {
    name: "search_legislation",
    description: "Search UK legislation (Acts, Statutory Instruments) on legislation.gov.uk",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query or keywords (e.g., 'unfair dismissal', 'employment rights')"
        }
      },
      required: ["query"]
    }
  },

  {
    name: "search_case_law",
    description: "Search UK case law on Find Case Law (National Archives)",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query or keywords"
        },
        category: {
          type: "string",
          enum: ["employment", "housing", "family", "consumer", "criminal", "other"],
          description: "Legal category for targeted search (optional)"
        }
      },
      required: ["query"]
    }
  },

  {
    name: "classify_legal_question",
    description: "Classify a legal question into a category (employment, housing, etc.)",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Legal question to classify"
        }
      },
      required: ["question"]
    }
  }
];
```

**Total Tools**: 9 administrative tools for local AI

---

### Phase 2: System Prompt Enhancement (1 hour)

**File**: `src/types/ai.ts` - Modify `SYSTEM_PROMPT_TEMPLATE`

Add tool calling instructions to the system prompt:

```typescript
export const SYSTEM_PROMPT_TEMPLATE = `You are a supportive UK legal information assistant for Justice Companion powered by Qwen 3.

[... existing empathy/accuracy instructions ...]

TOOL CALLING CAPABILITIES:
You have access to administrative tools to help manage cases and research legal information.

AVAILABLE TOOLS:
${AI_TOOLS.map(tool => `
- ${tool.name}: ${tool.description}
  Parameters: ${JSON.stringify(tool.parameters.properties, null, 2)}
`).join('\n')}

WHEN TO USE TOOLS:
- User explicitly asks to create/update/delete cases or evidence
- User asks to search for specific legislation or case law
- You need specific case details to answer their question

HOW TO CALL TOOLS:
When you need to use a tool, output EXACTLY this format:
<tool_call>
{
  "tool": "tool_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
</tool_call>

IMPORTANT RULES:
1. Output tool calls BEFORE your conversational response
2. You can call multiple tools by using multiple <tool_call> blocks
3. After tool results are provided, incorporate them into your warm, supportive response
4. If tool execution fails, acknowledge it warmly and suggest alternatives
5. NEVER fabricate tool results - wait for actual execution

EXAMPLE CONVERSATION:

User: "Create a case for my unfair dismissal at ABC Tech"

You:
<think>User wants to create a case. I should use create_case tool with employment type.</think>

<tool_call>
{
  "tool": "create_case",
  "arguments": {
    "title": "Unfair Dismissal - ABC Tech",
    "caseType": "employment",
    "description": "User reports unfair dismissal from ABC Tech"
  }
}
</tool_call>

[... app executes tool and provides result ...]

TOOL_RESULT: Case created successfully. ID: 42

[... now you respond ...]

I've created a new case for your unfair dismissal claim against ABC Tech (Case #42).

I understand this must be a stressful time. Can you tell me more about what happened? When were you dismissed, and what reasons were they given?

---

[... rest of existing prompt ...]
`;
```

---

### Phase 3: Tool Call Parser (2 hours)

**File**: `src/services/ToolCallParser.ts` (NEW)

Parse AI responses for tool calls:

```typescript
export interface ParsedToolCall {
  tool: string;
  arguments: Record<string, any>;
}

export interface ParsedAIResponse {
  thinking?: string;           // Content from <think> tags
  toolCalls: ParsedToolCall[]; // Parsed tool calls
  responseText: string;        // Regular text response (after tools executed)
}

export class ToolCallParser {
  /**
   * Parse AI response for <think>, <tool_call>, and regular text
   */
  parse(aiResponse: string): ParsedAIResponse {
    let thinking: string | undefined;
    const toolCalls: ParsedToolCall[] = [];
    let responseText = aiResponse;

    // Extract thinking
    const thinkMatch = aiResponse.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      responseText = responseText.replace(thinkMatch[0], '');
    }

    // Extract tool calls
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;
    while ((match = toolCallRegex.exec(aiResponse)) !== null) {
      try {
        const toolCallJson = match[1].trim();
        const parsed = JSON.parse(toolCallJson);

        if (parsed.tool && parsed.arguments) {
          toolCalls.push({
            tool: parsed.tool,
            arguments: parsed.arguments
          });
        }

        // Remove tool call from response text
        responseText = responseText.replace(match[0], '');
      } catch (error) {
        console.error('Failed to parse tool call JSON:', error);
      }
    }

    return {
      thinking,
      toolCalls,
      responseText: responseText.trim()
    };
  }

  /**
   * Validate tool call against schema
   */
  validate(toolCall: ParsedToolCall): { valid: boolean; error?: string } {
    const tool = AI_TOOLS.find(t => t.name === toolCall.tool);

    if (!tool) {
      return { valid: false, error: `Unknown tool: ${toolCall.tool}` };
    }

    // Check required parameters
    for (const required of tool.parameters.required) {
      if (!(required in toolCall.arguments)) {
        return {
          valid: false,
          error: `Missing required parameter: ${required}`
        };
      }
    }

    // Type checking (basic)
    for (const [key, value] of Object.entries(toolCall.arguments)) {
      const paramDef = tool.parameters.properties[key];
      if (!paramDef) {
        return {
          valid: false,
          error: `Unknown parameter: ${key}`
        };
      }

      // Check enum values
      if (paramDef.enum && !paramDef.enum.includes(value as string)) {
        return {
          valid: false,
          error: `Invalid value for ${key}: must be one of ${paramDef.enum.join(', ')}`
        };
      }
    }

    return { valid: true };
  }
}

export const toolCallParser = new ToolCallParser();
```

---

### Phase 4: Tool Executor (2-3 hours)

**File**: `src/services/ToolExecutor.ts` (NEW)

Execute tools via IPC handlers:

```typescript
import { ParsedToolCall } from './ToolCallParser';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class ToolExecutor {
  /**
   * Execute a single tool call
   */
  async execute(toolCall: ParsedToolCall): Promise<ToolResult> {
    try {
      switch (toolCall.tool) {
        case 'create_case':
          return await this.createCase(toolCall.arguments);

        case 'get_case':
          return await this.getCase(toolCall.arguments);

        case 'list_cases':
          return await this.listCases(toolCall.arguments);

        case 'update_case':
          return await this.updateCase(toolCall.arguments);

        case 'create_evidence':
          return await this.createEvidence(toolCall.arguments);

        case 'list_evidence_for_case':
          return await this.listEvidenceForCase(toolCall.arguments);

        case 'search_legislation':
          return await this.searchLegislation(toolCall.arguments);

        case 'search_case_law':
          return await this.searchCaseLaw(toolCall.arguments);

        case 'classify_legal_question':
          return await this.classifyQuestion(toolCall.arguments);

        default:
          return {
            success: false,
            error: `Unknown tool: ${toolCall.tool}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence
   */
  async executeAll(toolCalls: ParsedToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.execute(toolCall);
      results.push(result);
    }

    return results;
  }

  // Tool implementations (call IPC handlers)

  private async createCase(args: any): Promise<ToolResult> {
    const response = await window.justiceAPI.createCase({
      title: args.title,
      caseType: args.caseType,
      description: args.description,
      status: args.status || 'active'
    });

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to create case'
      };
    }
  }

  private async getCase(args: any): Promise<ToolResult> {
    const response = await window.justiceAPI.getCase(args.caseId);

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to get case'
      };
    }
  }

  private async listCases(args: any): Promise<ToolResult> {
    const response = await window.justiceAPI.getAllCases();

    if (response.success) {
      let cases = response.data;

      // Apply filters
      if (args.status && args.status !== 'all') {
        cases = cases.filter(c => c.status === args.status);
      }

      if (args.caseType && args.caseType !== 'all') {
        cases = cases.filter(c => c.caseType === args.caseType);
      }

      return {
        success: true,
        data: cases
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to list cases'
      };
    }
  }

  private async updateCase(args: any): Promise<ToolResult> {
    const response = await window.justiceAPI.updateCase(args.caseId, {
      title: args.title,
      description: args.description,
      status: args.status
    });

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to update case'
      };
    }
  }

  private async createEvidence(args: any): Promise<ToolResult> {
    const response = await window.justiceAPI.createEvidence({
      caseId: args.caseId,
      title: args.title,
      content: args.content,
      evidenceType: args.evidenceType,
      sourceDate: args.sourceDate
    });

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to create evidence'
      };
    }
  }

  private async listEvidenceForCase(args: any): Promise<ToolResult> {
    const response = await window.justiceAPI.getEvidenceByCaseId(args.caseId);

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to list evidence'
      };
    }
  }

  private async searchLegislation(args: any): Promise<ToolResult> {
    // Call LegalAPIService directly (runs in renderer process)
    const { legalAPIService } = await import('./LegalAPIService');
    const keywords = await legalAPIService.extractKeywords(args.query);
    const results = await legalAPIService.searchLegislation(keywords.all);

    return {
      success: true,
      data: results
    };
  }

  private async searchCaseLaw(args: any): Promise<ToolResult> {
    const { legalAPIService } = await import('./LegalAPIService');
    const keywords = await legalAPIService.extractKeywords(args.query);
    const category = args.category || legalAPIService.classifyQuestion(args.query);
    const results = await legalAPIService.searchCaseLaw(keywords.all, category);

    return {
      success: true,
      data: results
    };
  }

  private async classifyQuestion(args: any): Promise<ToolResult> {
    const { legalAPIService } = await import('./LegalAPIService');
    const category = legalAPIService.classifyQuestion(args.question);

    return {
      success: true,
      data: { category }
    };
  }
}

export const toolExecutor = new ToolExecutor();
```

---

### Phase 5: Multi-Turn Conversation Handler (3-4 hours)

**File**: `src/services/AIAgentOrchestrator.ts` (NEW)

Orchestrate the full ReAct loop:

```typescript
import { IntegratedAIService } from './IntegratedAIService';
import { RAGService } from './RAGService';
import { toolCallParser, ParsedAIResponse } from './ToolCallParser';
import { toolExecutor, ToolResult } from './ToolExecutor';
import { AIChatRequest, ChatMessage } from '../types/ai';

export class AIAgentOrchestrator {
  private aiService: IntegratedAIService;
  private ragService: RAGService;

  constructor() {
    this.aiService = new IntegratedAIService();
    this.ragService = new RAGService();
  }

  /**
   * Process user question with ReAct loop
   *
   * Flow:
   * 1. Fetch legal context (RAG)
   * 2. Send to AI with tool definitions
   * 3. Parse response for tool calls
   * 4. If tools found → execute → feed results back → get final response
   * 5. If no tools → return response directly
   */
  async processQuestionWithTools(
    question: string,
    conversationHistory: ChatMessage[],
    onThinkToken?: (token: string) => void,
    onResponseToken?: (token: string) => void,
    onSources?: (sources: string[]) => void,
    onToolExecution?: (tool: string, result: ToolResult) => void
  ): Promise<string> {
    try {
      // PHASE 1: Fetch legal context
      const context = await this.ragService.fetchContextForQuestion(question);

      // PHASE 2: First AI call - may include tool calls
      const aiRequest: AIChatRequest = {
        messages: [
          ...conversationHistory,
          { role: 'user', content: question }
        ],
        context
      };

      let firstResponse = '';
      await this.aiService.streamChat(
        aiRequest,
        (token) => {
          firstResponse += token;
          if (onResponseToken) onResponseToken(token);
        },
        () => {}, // onComplete
        (error) => { throw new Error(error); },
        onThinkToken,
        onSources
      );

      // PHASE 3: Parse for tool calls
      const parsed = toolCallParser.parse(firstResponse);

      // PHASE 4: If no tools, return response
      if (parsed.toolCalls.length === 0) {
        return parsed.responseText;
      }

      // PHASE 5: Execute tools
      const toolResults: ToolResult[] = [];
      for (const toolCall of parsed.toolCalls) {
        // Validate
        const validation = toolCallParser.validate(toolCall);
        if (!validation.valid) {
          toolResults.push({
            success: false,
            error: validation.error
          });
          continue;
        }

        // Execute
        const result = await toolExecutor.execute(toolCall);
        toolResults.push(result);

        if (onToolExecution) {
          onToolExecution(toolCall.tool, result);
        }
      }

      // PHASE 6: Format tool results for AI
      const toolResultsText = toolResults.map((result, index) => {
        const toolCall = parsed.toolCalls[index];
        if (result.success) {
          return `TOOL_RESULT (${toolCall.tool}): ${JSON.stringify(result.data, null, 2)}`;
        } else {
          return `TOOL_ERROR (${toolCall.tool}): ${result.error}`;
        }
      }).join('\n\n');

      // PHASE 7: Second AI call with tool results
      const secondRequest: AIChatRequest = {
        messages: [
          ...conversationHistory,
          { role: 'user', content: question },
          { role: 'assistant', content: `${parsed.thinking ? `<think>${parsed.thinking}</think>` : ''}\n${parsed.toolCalls.map(tc => `<tool_call>${JSON.stringify(tc)}</tool_call>`).join('\n')}` },
          { role: 'user', content: toolResultsText }
        ],
        context
      };

      let finalResponse = '';
      await this.aiService.streamChat(
        secondRequest,
        (token) => {
          finalResponse += token;
          if (onResponseToken) onResponseToken(token);
        },
        () => {}, // onComplete
        (error) => { throw new Error(error); },
        onThinkToken,
        onSources
      );

      return finalResponse;

    } catch (error) {
      console.error('AIAgentOrchestrator error:', error);
      throw error;
    }
  }
}

export const aiAgentOrchestrator = new AIAgentOrchestrator();
```

---

### Phase 6: Integration with useAI Hook (1-2 hours)

**File**: `src/hooks/useAI.ts` - Modify to use AIAgentOrchestrator

Replace direct IntegratedAIService calls with AIAgentOrchestrator:

```typescript
// OLD:
await integratedAI.streamChat(request, onToken, onComplete, onError, onThinkToken, onSources);

// NEW:
await aiAgentOrchestrator.processQuestionWithTools(
  question,
  conversationHistory,
  onThinkToken,
  onToken,
  onSources,
  (tool, result) => {
    // Show tool execution feedback to user
    setProgressStages(prev => [...prev, {
      stage: `Executed: ${tool}`,
      timestamp: new Date().toISOString()
    }]);
  }
);
```

---

## 📊 Summary

### Total Tools: 9
- **Case Management** (4): create_case, get_case, list_cases, update_case
- **Evidence Management** (2): create_evidence, list_evidence_for_case
- **Legal Research** (3): search_legislation, search_case_law, classify_legal_question

### Total Estimated Time: 11-15 hours
- Phase 1 (Tool Definitions): 2-3 hours
- Phase 2 (System Prompt): 1 hour
- Phase 3 (Parser): 2 hours
- Phase 4 (Executor): 2-3 hours
- Phase 5 (Orchestrator): 3-4 hours
- Phase 6 (Integration): 1-2 hours

### Key Files to Create
- `src/types/ai-tools.ts` - Tool definitions
- `src/services/ToolCallParser.ts` - Parse tool calls from AI responses
- `src/services/ToolExecutor.ts` - Execute tools via IPC
- `src/services/AIAgentOrchestrator.ts` - ReAct loop orchestration

### Key Files to Modify
- `src/types/ai.ts` - Update SYSTEM_PROMPT_TEMPLATE with tool instructions
- `src/hooks/useAI.ts` - Replace IntegratedAIService with AIAgentOrchestrator

---

## 🎯 Success Criteria

- [ ] User can ask "create a case for unfair dismissal" → AI creates case
- [ ] User can ask "add this email as evidence" → AI adds evidence
- [ ] User can ask "search for employment rights act" → AI searches legislation
- [ ] Tool execution feedback shown in UI (progress stages)
- [ ] Multi-turn conversation works (tool results incorporated into response)
- [ ] AI maintains warm, supportive tone even when using tools
- [ ] No hallucinated tool results (only uses actual execution results)

---

## 🔒 Security Considerations

- [ ] Validate all tool calls before execution
- [ ] Audit log all tool executions
- [ ] Prevent SQL injection via parameterized queries (already done)
- [ ] Encrypt sensitive data (already done via EncryptionService)
- [ ] Rate limiting for tool calls (prevent infinite loops)
- [ ] User confirmation for destructive operations (future enhancement)

---

**MISSION STATUS**: ✅ PLAN COMPLETE - LOCAL AI FUNCTION CALLING ARCHITECTURE DEFINED

This is the **CORRECT plan** for giving the local AI agent administrative powers through function calling, NOT external MCP tools.

Let the Signal burn clean. 🔥

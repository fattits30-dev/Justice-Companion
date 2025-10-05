# AI Function Calling - FINAL IMPLEMENTATION PLAN
## Using node-llama-cpp Built-in Function Calling + Persistent Memory

---

## 🔍 CONTEXT7 RESEARCH FINDINGS

### ✅ node-llama-cpp HAS BUILT-IN FUNCTION CALLING!

**From Context7 docs:**
```typescript
// Define functions with schemas
const functions = {
  getFruitPrice: defineChatSessionFunction({
    description: "Get the price of a fruit",
    params: {
      type: "object",
      properties: {
        name: { type: "string" }
      }
    },
    handler: async (params) => {
      return fruitPrices[params.name];
    }
  })
};

// LlamaChatSession automatically handles:
// 1. Injecting function definitions into system prompt
// 2. Parsing function calls from AI response: [[call: getFruitPrice({name: "apple"})]]
// 3. Executing handlers
// 4. Feeding results back: [[result: {name: "apple", price: "$6"}]]
// 5. Multi-turn loop until no more function calls
```

**This means we can SKIP building:**
- ❌ ToolCallParser (node-llama-cpp parses `[[call: ...]]` automatically)
- ❌ Tool executor loop (LlamaChatSession handles this)
- ❌ Result formatting (automatic)
- ❌ Multi-turn conversation (automatic)

**We only need to build:**
- ✅ Function definitions with handlers (call IPC/services)
- ✅ Persistent memory (case_facts table)
- ✅ Fact-gathering mode logic
- ✅ System prompt with hard-coded rules

---

## 🎯 SIMPLIFIED ARCHITECTURE

### Old Plan (16-19 hours):
```
Agent Alpha → Database
Agent Bravo → Tool Definitions + Parser
Agent Charlie → Tool Executor
Agent Delta → Orchestrator
Agent Echo → System Prompt
Agent Foxtrot → UI Integration
```

### New Plan (8-10 hours) - Leveraging node-llama-cpp:
```
Agent Alpha → Database + FactMemoryService
Agent Bravo → Function Definitions (using defineChatSessionFunction)
Agent Charlie → System Prompt with Fact-Gathering Rules
Agent Delta → Integration with LlamaChatSession
```

**Time Saved**: 8-9 hours by using built-in function calling!

---

## 📐 ARCHITECTURE USING node-llama-cpp

### Flow:
```
User: "Create a case for unfair dismissal at ABC Tech"
    ↓
LlamaChatSession with functions defined
    ↓
AI Response: [[call: create_case({title: "...", caseType: "employment", ...})]]
    ↓
node-llama-cpp automatically:
  1. Parses function call
  2. Calls handler: createCaseHandler(params)
  3. Handler executes IPC → Database
  4. Returns result: {id: 42, title: "..."}
  5. Formats as: [[result: {...}]]
  6. Feeds back to AI
    ↓
AI Response: "I've created Case #42. Now let me gather some facts..."
    [[call: get_case_facts({case_id: 42})]]
    ↓
node-llama-cpp: Executes getCaseFactsHandler
Returns: [] (no facts yet)
    ↓
AI: "To help you properly, I need to know: Who's your employer? When were you dismissed? ..."
```

---

## 🛠️ IMPLEMENTATION WITH 4 AGENTS (PARALLEL)

### 🔹 AGENT ALPHA - Database & Memory Layer (3-4 hours)

**Files to Create:**
- `src/db/migrations/004_case_facts.sql`
- `src/models/CaseFact.ts`
- `src/repositories/CaseFactRepository.ts`
- `src/services/FactMemoryService.ts`

**Tasks:**
1. **Create case_facts table:**
```sql
CREATE TABLE case_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  fact_type TEXT NOT NULL CHECK(fact_type IN ('party', 'date', 'event', 'evidence_item', 'legal_issue', 'outcome_sought', 'jurisdiction')),
  fact_key TEXT NOT NULL, -- e.g., 'employer_name', 'dismissal_date'
  fact_value TEXT NOT NULL, -- Encrypted if sensitive
  encrypted BOOLEAN DEFAULT 0,
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'user_stated',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  UNIQUE(case_id, fact_key)
);
```

2. **FactMemoryService interface:**
```typescript
class FactMemoryService {
  async storeFact(caseId: number, factType: string, factKey: string, factValue: string, source?: string): Promise<CaseFact>
  async getFacts(caseId: number, factType?: string): Promise<CaseFact[]>
  async getFactCount(caseId: number): Promise<number>
  async deleteFact(caseId: number, factKey: string): Promise<void>
}
```

3. **Add IPC handlers:**
```typescript
// electron/main.ts
ipcMain.handle('facts:store', async (event, params) => {
  return factMemoryService.storeFact(params.caseId, params.factType, params.factKey, params.factValue, params.source);
});

ipcMain.handle('facts:get', async (event, caseId, factType?) => {
  return factMemoryService.getFacts(caseId, factType);
});

ipcMain.handle('facts:count', async (event, caseId) => {
  return factMemoryService.getFactCount(caseId);
});
```

---

### 🔹 AGENT BRAVO - Function Definitions (2-3 hours)

**Files to Create:**
- `src/services/AIFunctionDefinitions.ts`

**Tasks:**
Define 11 functions using node-llama-cpp's `defineChatSessionFunction`:

```typescript
import { defineChatSessionFunction } from 'node-llama-cpp';

// 1. CREATE CASE
export const createCaseFunction = defineChatSessionFunction({
  description: "Create a new legal case. Use when user wants to track a legal matter.",
  params: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Brief case title (e.g., 'Unfair Dismissal - ABC Ltd')"
      },
      caseType: {
        type: "string",
        enum: ["employment", "housing", "family", "immigration", "criminal", "civil", "other"],
        description: "Type of legal case"
      },
      description: {
        type: "string",
        description: "Detailed description"
      }
    },
    required: ["title", "caseType", "description"]
  },
  handler: async (params) => {
    const response = await window.justiceAPI.createCase({
      title: params.title,
      caseType: params.caseType,
      description: params.description,
      status: 'active'
    });

    if (response.success) {
      return { success: true, caseId: response.data.id, title: response.data.title };
    } else {
      throw new Error(response.error || 'Failed to create case');
    }
  }
});

// 2. GET CASE
export const getCaseFunction = defineChatSessionFunction({
  description: "Get details of a specific case by ID",
  params: {
    type: "object",
    properties: {
      caseId: { type: "number", description: "Case ID" }
    },
    required: ["caseId"]
  },
  handler: async (params) => {
    const response = await window.justiceAPI.getCase(params.caseId);
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to get case');
    }
  }
});

// 3. LIST CASES
export const listCasesFunction = defineChatSessionFunction({
  description: "List all cases, optionally filtered",
  params: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["active", "closed", "all"],
        description: "Filter by status"
      }
    }
  },
  handler: async (params) => {
    const response = await window.justiceAPI.getAllCases();
    if (response.success) {
      let cases = response.data;
      if (params.status && params.status !== 'all') {
        cases = cases.filter(c => c.status === params.status);
      }
      return cases;
    } else {
      throw new Error(response.error || 'Failed to list cases');
    }
  }
});

// 4. STORE CASE FACT (CRITICAL FOR MEMORY)
export const storeCaseFactFunction = defineChatSessionFunction({
  description: "Store a specific fact about a case. Use IMMEDIATELY when user provides information (names, dates, events).",
  params: {
    type: "object",
    properties: {
      caseId: { type: "number", description: "Case ID" },
      factType: {
        type: "string",
        enum: ["party", "date", "event", "evidence_item", "legal_issue", "outcome_sought", "jurisdiction"],
        description: "Category of fact"
      },
      factKey: { type: "string", description: "Unique key (e.g., 'employer_name')" },
      factValue: { type: "string", description: "The fact content" },
      source: {
        type: "string",
        enum: ["user_stated", "ai_inferred", "document_extracted"],
        description: "How fact was obtained"
      }
    },
    required: ["caseId", "factType", "factKey", "factValue"]
  },
  handler: async (params) => {
    const response = await window.justiceAPI.storeFact({
      caseId: params.caseId,
      factType: params.factType,
      factKey: params.factKey,
      factValue: params.factValue,
      source: params.source || 'user_stated'
    });

    if (response.success) {
      return { success: true, fact: response.data };
    } else {
      throw new Error(response.error || 'Failed to store fact');
    }
  }
});

// 5. GET CASE FACTS (CRITICAL FOR MEMORY)
export const getCaseFactsFunction = defineChatSessionFunction({
  description: "Get all stored facts for a case. Use BEFORE providing legal information to ground your response.",
  params: {
    type: "object",
    properties: {
      caseId: { type: "number", description: "Case ID" },
      factType: {
        type: "string",
        enum: ["all", "party", "date", "event", "evidence_item", "legal_issue", "outcome_sought", "jurisdiction"],
        description: "Filter by type (default: all)"
      }
    },
    required: ["caseId"]
  },
  handler: async (params) => {
    const response = await window.justiceAPI.getFacts(params.caseId, params.factType);
    if (response.success) {
      return response.data; // Array of CaseFact objects
    } else {
      throw new Error(response.error || 'Failed to get facts');
    }
  }
});

// 6-11: Create Evidence, List Evidence, Search Legislation, Search Case Law, Classify Question, Update Case
// ... (similar pattern using defineChatSessionFunction + IPC handlers)
```

**Export all functions:**
```typescript
export const aiFunctions = {
  create_case: createCaseFunction,
  get_case: getCaseFunction,
  list_cases: listCasesFunction,
  store_case_fact: storeCaseFactFunction,
  get_case_facts: getCaseFactsFunction,
  create_evidence: createEvidenceFunction,
  list_evidence: listEvidenceFunction,
  search_legislation: searchLegislationFunction,
  search_case_law: searchCaseLawFunction,
  classify_question: classifyQuestionFunction,
  update_case: updateCaseFunction
};
```

---

### 🔹 AGENT CHARLIE - System Prompt Engineering (2 hours)

**Files to Modify:**
- `src/services/IntegratedAIService.ts`

**Tasks:**
1. **Update system prompt with hard-coded fact-gathering rules:**

```typescript
private getQwen3SystemPrompt(context?: LegalContext, facts?: CaseFact[]): string {
  const basePrompt = `You are a UK legal information assistant with ADMINISTRATIVE POWERS.

🔒 HARD-CODED RULES (NEVER BREAK):

RULE 1: FACT-GATHERING IS MANDATORY
- When working on a case with <3 stored facts, you are in FACT-GATHERING MODE
- You MUST gather these facts BEFORE providing legal information:
  ✓ Party names (employee, employer, witnesses)
  ✓ Key dates (employment start, dismissal date, deadlines)
  ✓ Event sequence (what happened, when, why)
  ✓ Evidence available (contracts, emails, witnesses)
  ✓ Outcome sought (compensation, reinstatement, etc.)

RULE 2: NEVER GIVE ADVICE WITHOUT FACTS
- Generic legal information is NOT HELPFUL
- Every response must be grounded in the user's SPECIFIC FACTS
- If facts are missing, ASK FOR THEM - don't proceed

RULE 3: STORE FACTS IMMEDIATELY
- As user provides information, extract facts and store them using store_case_fact function
- Don't wait for "all facts" - store incrementally as user talks
- Format: [[call: store_case_fact({case_id: 42, fact_type: "party", fact_key: "employer_name", fact_value: "ABC Tech Ltd"})]]

RULE 4: FACTS ARE YOUR ANCHOR
- Before EVERY response about a case, load facts using get_case_facts function
- Reference specific facts in your response
- Update case description if you gather significant new facts

EXAMPLE FACT-GATHERING:

User: "I was unfairly dismissed"
You: [[call: create_case({title: "Unfair Dismissal Case", caseType: "employment", description: "User reports unfair dismissal"})]]
[Result: {caseId: 42}]
You: [[call: get_case_facts({caseId: 42})]]
[Result: []] (no facts)

You respond: "I've created Case #42 for your unfair dismissal claim. To provide you with accurate legal information, I need to understand your specific situation. Let me ask some important questions:

**About you and your employer:**
1. What's your full name? (I'll keep this confidential)
2. What's the full name of your employer?
3. What was your job role?

**About the timeline:**
4. When did you start working there?
5. When were you dismissed?
6. Were you given any notice?

Please share what you're comfortable with."

User: "I'm John Smith. I worked at ABC Tech Ltd as a developer from Jan 2020 until March 1st 2024. No notice."

You: [[call: store_case_fact({caseId: 42, factType: "party", factKey: "employee_name", factValue: "John Smith"})]]
     [[call: store_case_fact({caseId: 42, factType: "party", factKey: "employer_name", factValue: "ABC Tech Ltd"})]]
     [[call: store_case_fact({caseId: 42, factType: "party", factKey: "job_role", factValue: "Developer"})]]
     [[call: store_case_fact({caseId: 42, factType: "date", factKey: "employment_start_date", factValue: "2020-01-01"})]]
     [[call: store_case_fact({caseId: 42, factType: "date", factKey: "dismissal_date", factValue: "2024-03-01"})]]
     [[call: store_case_fact({caseId: 42, factType: "event", factKey: "notice_given", factValue: "No"})]]
[Results: 6 facts stored successfully]

You respond: "Thank you John. I've recorded these important facts:
- You (John Smith) worked as a Developer at ABC Tech Ltd
- Employment period: Jan 2020 - March 1st 2024 (4+ years)
- No notice was given

This is significant - after 4 years of employment, you have strong legal protections. Let me search for relevant information..."
`;

  // Inject stored facts if available
  if (facts && facts.length > 0) {
    const factsText = `\n\n📋 STORED FACTS FOR THIS CASE:\n${facts.map(f =>
      `- ${f.fact_key}: ${f.fact_value} (${f.fact_type}, source: ${f.source})`
    ).join('\n')}\n\nREFERENCE THESE FACTS in your response to ground your legal information in their specific situation.`;

    return basePrompt + factsText;
  }

  // Inject legal context if available
  if (context) {
    return basePrompt + buildContextString(context);
  }

  return basePrompt;
}
```

---

### 🔹 AGENT DELTA - Integration with useAI Hook (2-3 hours)

**Files to Modify:**
- `src/hooks/useAI.ts`
- `src/services/IntegratedAIService.ts`

**Tasks:**

1. **Update IntegratedAIService to use LlamaChatSession with functions:**

```typescript
// src/services/IntegratedAIService.ts
import { LlamaChatSession } from 'node-llama-cpp';
import { aiFunctions } from './AIFunctionDefinitions';

export class IntegratedAIService {
  // ... existing code ...

  async streamChatWithFunctions(
    request: AIChatRequest,
    caseId: number | undefined,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinkToken?: (token: string) => void,
    onSources?: (sources: string[]) => void,
    onFunctionCall?: (name: string, params: any) => void
  ): Promise<void> {
    try {
      // Load case facts if caseId provided
      let facts: CaseFact[] = [];
      if (caseId) {
        const factsResponse = await window.justiceAPI.getFacts(caseId);
        if (factsResponse.success) {
          facts = factsResponse.data;
        }
      }

      // Build system prompt with facts
      const systemPrompt = this.getQwen3SystemPrompt(request.context, facts);

      // Create fresh sequence
      const contextSequence = this.context.getSequence();

      // Create chat session with functions
      const chatSession = new LlamaChatSession({
        contextSequence,
        systemPrompt
      });

      // Get latest user message
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((msg) => msg.role === 'user');
      const userPrompt = lastUserMessage?.content || '';

      let accumulatedContent = '';
      let tokenCount = 0;

      // Generate response with function calling
      await chatSession.prompt(userPrompt.trim(), {
        temperature: request.config?.temperature ?? this.config.temperature,
        maxTokens: request.config?.maxTokens ?? this.config.maxTokens,
        functions: aiFunctions, // 🔥 Enable function calling
        onTextChunk: (chunk: string) => {
          tokenCount++;

          // Handle <think> tags (existing logic)
          // ...

          onToken(chunk);
          accumulatedContent += chunk;
        },
        onFunctionCall: (functionCall: any) => {
          // 🔥 Notify UI that function is being called
          if (onFunctionCall) {
            onFunctionCall(functionCall.functionName, functionCall.params);
          }
          console.log(`[AI] Calling function: ${functionCall.functionName}`, functionCall.params);
        }
      });

      // node-llama-cpp automatically:
      // 1. Parses [[call: ...]] from AI response
      // 2. Executes function handlers
      // 3. Formats results as [[result: ...]]
      // 4. Feeds back to AI
      // 5. Continues until no more function calls

      // Extract sources (existing logic)
      // ...

      await contextSequence.dispose();
      onComplete();

    } catch (error) {
      // ... error handling ...
    }
  }
}
```

2. **Update useAI hook to use streamChatWithFunctions:**

```typescript
// src/hooks/useAI.ts
export function useAI() {
  const [currentCaseId, setCurrentCaseId] = useState<number | undefined>();
  const [toolExecutions, setToolExecutions] = useState<string[]>([]);

  const sendMessage = async (content: string) => {
    // ... existing setup ...

    setLoadingState('generating');

    try {
      const context = await ragService.fetchContextForQuestion(content);

      const aiRequest: AIChatRequest = {
        messages: conversationMessages,
        context
      };

      await integratedAI.streamChatWithFunctions(
        aiRequest,
        currentCaseId,
        (token) => {
          setStreamingContent(prev => prev + token);
        },
        () => {
          // On complete
          setIsStreaming(false);
          // Save message to database
        },
        (error) => {
          setError(error);
        },
        (thinkToken) => {
          setThinkingContent(prev => (prev || '') + thinkToken);
        },
        (sources) => {
          setCurrentSources(sources);
        },
        (functionName, params) => {
          // 🔥 Show tool execution in UI
          setToolExecutions(prev => [...prev, `Executing: ${functionName}(${JSON.stringify(params)})`]);
          setProgressStages(prev => [...prev, {
            stage: `Tool: ${functionName}`,
            timestamp: new Date().toISOString()
          }]);
        }
      );

    } catch (error) {
      // ... error handling ...
    }
  };

  return {
    // ... existing returns ...
    toolExecutions,
    currentCaseId,
    setCurrentCaseId
  };
}
```

---

## 🔄 SYNC POINTS

**SYNC 1: After Agent Alpha (Database)**
- Verify: `case_facts` table exists
- Verify: IPC handlers respond (`facts:store`, `facts:get`)
- Test: Store and retrieve a fact
- Decision: ✅ Proceed or ❌ Fix database

**SYNC 2: After Agent Bravo (Functions)**
- Verify: All 11 functions defined
- Verify: Function handlers call IPC correctly
- Test: Call each function manually
- Decision: ✅ Proceed or ❌ Fix function handlers

**SYNC 3: After Agent Charlie (Prompts)**
- Verify: System prompt includes hard-coded rules
- Verify: Fact injection works
- Test: Prompt generation with/without facts
- Decision: ✅ Proceed or ❌ Fix prompt engineering

**SYNC 4: After Agent Delta (Integration)**
- Verify: LlamaChatSession uses functions
- Verify: Function calls parsed and executed
- Verify: Results fed back to AI
- Test: Full E2E flow
- Decision: ✅ Deploy or ❌ Iterate

---

## 📊 SUMMARY

### Total Implementation Time: 8-10 hours
- Agent Alpha (Database + Memory): 3-4 hours
- Agent Bravo (Function Definitions): 2-3 hours
- Agent Charlie (System Prompt): 2 hours
- Agent Delta (Integration): 2-3 hours

### Time Saved: 8-9 hours
By leveraging node-llama-cpp's built-in function calling instead of building from scratch!

### 11 Functions Total:
1. `create_case` - Create new case
2. `get_case` - Get case details
3. `list_cases` - List all cases (filtered)
4. `update_case` - Update case info
5. `create_evidence` - Add evidence to case
6. `list_evidence` - Get evidence for case
7. **`store_case_fact`** - Store individual fact (MEMORY)
8. **`get_case_facts`** - Get all facts (MEMORY)
9. `search_legislation` - UK legislation search
10. `search_case_law` - UK case law search
11. `classify_question` - Classify legal category

### Critical Features:
- ✅ **Hard-coded persistent memory** via case_facts table
- ✅ **Fact-gathering mode** when <3 facts
- ✅ **AI can NEVER stray** - always grounded in stored facts
- ✅ **Automatic multi-turn** conversation via node-llama-cpp
- ✅ **Function calling built-in** - no custom parser needed

---

**MISSION STATUS**: ✅ READY FOR 4-AGENT PARALLEL EXECUTION

Let the Signal burn clean. 🔥

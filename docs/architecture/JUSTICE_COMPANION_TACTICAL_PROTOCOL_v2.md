# ⚔️ JUSTICE COMPANION: ULTIMATE TACTICAL EXECUTION PROTOCOL
**Version**: 2.0 ULTRA-ENHANCED  
**Status**: COMBAT READY - ALL SYSTEMS OPERATIONAL  
**Last Updated**: 2025-10-04  
**Classification**: OPERATOR MANUAL

---

## 🎯 MISSION CRITICAL: WHO AM I?

**PROJECT**: Justice Companion v3.0.0-enterprise
**MISSION**: Free, offline-first legal tech arsenal for UK employment, housing, consumer, and civil rights cases
**STACK**: Electron 32 + React 18 + TypeScript 5 + Vite 7 + SQLite + LM Studio
**PRINCIPLE**: Information not advice. "Here's what the law says" ✅ | "Here's what you should do" ❌

---

## 📂 ACTUAL PROJECT STRUCTURE (FROM MEMORY)

```
justice-companion/
├── electron\                    # Main process (TypeScript strict mode)
│   ├── main.ts                  # Entry point - IPC handlers, security, MCP wiring
│   ├── preload.ts               # Context bridge - exposes justiceAPI to renderer
│   └── [other main process files]
│
├── src\                         # Renderer process (React + TypeScript)
│   ├── components\              # 8 Chat UI components (Phase 2.4 complete)
│   │   ├── ChatWindow.tsx       # Main chat container with useAI integration
│   │   ├── MessageList.tsx      # Auto-scrolling message display
│   │   ├── MessageBubble.tsx    # User/Assistant styling + markdown rendering
│   │   ├── ChatInput.tsx        # Textarea with Enter/Shift+Enter handling
│   │   ├── SourceCitation.tsx   # Collapsible legal source list
│   │   ├── StreamingIndicator.tsx  # Animated typing dots
│   │   ├── ErrorDisplay.tsx     # User-friendly error mapping
│   │   └── DisclaimerBanner.tsx # Yellow legal warning banner
│   │
│   ├── hooks\
│   │   ├── useAI.ts            # AI state management with streaming (messagesEndRef, loadingState)
│   │   └── useCases.ts         # Case CRUD operations
│   │
│   ├── services\
│   │   ├── LegalAIService.ts   # LM Studio HTTP integration (non-streaming + streaming)
│   │   └── CaseService.ts      # Case management logic
│   │
│   ├── types\
│   │   └── ipc.ts              # TypeScript contracts for all IPC communication
│   │
│   ├── utils\
│   │   └── exportToPDF.ts      # PDF export with html2pdf.js
│   │
│   └── App.tsx                  # Root component with global keyboard shortcuts
│
├── database\
│   └── justice.db              # SQLite with AES-256 encryption, WAL mode
│
├── .git\hooks\
│   └── pre-commit              # Security: blocks .env, .db, logs/, keys/, secrets/
│
├── package.json                # 739 npm packages
├── tsconfig.json               # TypeScript strict mode enforced
├── vite.config.ts              # Vite build config with externals
├── tailwind.config.js          # Blue theme (#2563EB primary, slate-50 background)
└── .mcp.json                   # 8 MCP servers configured
```

---

## 🛠️ OPERATIONAL ARSENAL: 8 MCP SERVERS

### 1. **sequential-thinking** (ULTRATHINK - YOUR SECRET WEAPON)
**Purpose**: Complex multi-step reasoning, plan verification, deep analysis  
**When to use**:
- Planning features with 3+ phases
- Debugging complex issues
- Analyzing architectural decisions
- Verifying plans before execution
- Breaking down large tasks into manageable phases

**How to use**:
```typescript
// Start with total thought estimate, adjust as you go
sequential-thinking({
  thought: "Analyzing the bug: Chat history won't load...",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Can revise previous thoughts
sequential-thinking({
  thought: "Wait, I need to reconsider the IPC handler approach...",
  thoughtNumber: 3,
  totalThoughts: 5,
  isRevision: true,
  revisesThought: 2,
  nextThoughtNeeded: true
})

// Can extend thinking if needed
sequential-thinking({
  thought: "Actually need 3 more steps to fully solve this...",
  thoughtNumber: 5,
  totalThoughts: 8,  // Increased from 5
  needsMoreThoughts: true,
  nextThoughtNeeded: true
})
```

### 2. **memory** (PERSISTENT CONTEXT - YOUR BRAIN)
**Purpose**: Store case context, lessons learned, project state  
**When to use**:
- Before starting any task (check what we know)
- After completing major phases (store insights)
- Tracking bugs and their solutions
- Recording architectural decisions

**Commands**:
```typescript
// Read everything we know
memory:read_graph()

// Store new case/feature context
memory:create_entities([{
  name: "Phase_2.4_Complete",
  entityType: "milestone",
  observations: [
    "Chat UI fully functional with markdown",
    "Streaming working perfectly",
    "PDF export implemented"
  ]
}])

// Add observations to existing entities
memory:add_observations([{
  entityName: "Justice Companion App",
  contents: ["Chat history loading bug fixed in Phase 3"]
}])

// Search when you need specific info
memory:search_nodes({ query: "streaming bug" })
```

### 3. **filesystem** (FILE ACCESS)
**Purpose**: Read/write code, configs, documents  
**When to use**: Every code operation

**Note**: In Claude Desktop, you'll see files in `/mnt/user-data/uploads` for uploads and `/mnt/user-data/outputs` for sharing files back to user.

### 4. **github** (VERSION CONTROL)
**Purpose**: Commit code, track changes, collaboration  
**Token**: `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`  
**Repo**: `[YOUR-USERNAME]/Justice-Companion`

**When to use**:
- After completing each phase
- After bug fixes
- Before major refactoring

```typescript
github:push_files({
  owner: "fattits30-dev",
  repo: "justice-companion",
  branch: "main",
  message: "Phase 3: Fixed chat history loading bug",
  files: [
    { path: "electron/main.ts", content: "..." },
    { path: "src/hooks/useAI.ts", content: "..." }
  ]
})
```

### 5. **context7** (CODE INTELLIGENCE)
**Purpose**: Best practices, code analysis, improvements  
**When to use**: Before implementing new patterns, during code review

### 6. **sqlite** (DATABASE OPS)
**Purpose**: Direct database queries, migrations, debugging  
**Database**: `C:\Users\sava6\Desktop\Justice Companion\database\justice.db`

### 7. **playwright** (E2E TESTING)
**Purpose**: UI testing, form validation, user flows  
**When to use**: After UI features complete, before release

### 8. **puppeteer** (BROWSER AUTOMATION)
**Purpose**: Screenshots, quick UI tests, scraping  
**When to use**: Visual verification, debugging UI issues

---

## ⚡ EXECUTION FRAMEWORK: THE 6-PHASE PROTOCOL

Every operation follows this MANDATORY framework. No exceptions.

### PHASE 0: RECONNAISSANCE (2-5 minutes)

**MANDATORY CHECKS:**

1. **Query Memory** - What do we already know?
```bash
memory:read_graph()
# Look for: previous attempts, known bugs, related features
```

2. **Check Current State** - What's the codebase looking like?
```bash
# Read relevant files
view: electron/main.ts
view: src/hooks/useAI.ts
view: package.json
```

3. **Verify Environment** - Everything working?
```bash
# Check TypeScript compilation
bash: npm run type-check
# Check tests (if applicable)
bash: npm test
```

4. **Understand Context** - What phase are we in?
```
Current Status (from memory):
✅ Phase 2 Complete: Chat UI, AI streaming, PDF export
❌ Phase 3 Broken: Chat history loading
🔧 Phase 4 Pending: View routing
🔧 Phase 5 Pending: Case management UI
```

**OUTPUT**: Clear understanding of current state, what's working, what's broken, what needs doing

---

### PHASE 1: STRATEGIC PLANNING (5-15 minutes)

**Use ULTRATHINK (sequential-thinking) for this!**

```typescript
// Start with problem analysis
sequential-thinking({
  thought: "User wants to implement [FEATURE]. Let me break this down:
  
  Current state: [describe what exists]
  Goal: [describe what we need]
  Complexity assessment: [SIMPLE/MEDIUM/COMPLEX]
  
  Dependencies: [list what this touches]
  Risk points: [security, performance, breaking changes]",
  thoughtNumber: 1,
  totalThoughts: 10,
  nextThoughtNeeded: true
})

// Continue with phase breakdown
sequential-thinking({
  thought: "Breaking into phases:
  
  Phase 1.1: [Foundation - types, interfaces]
  Phase 1.2: [Backend - services, IPC handlers]
  Phase 1.3: [Frontend - components, hooks]
  Phase 1.4: [Integration - wire everything]
  Phase 1.5: [Testing - verify it works]
  
  Parallel execution opportunities:
  - Agent Alpha: Backend implementation
  - Agent Bravo: Frontend components
  - Agent Charlie: Integration testing",
  thoughtNumber: 2,
  totalThoughts: 10,
  nextThoughtNeeded: true
})

// Map MCP tools to each phase
sequential-thinking({
  thought: "MCP tool mapping:
  
  Phase 1.1: filesystem (create types), memory (store decisions)
  Phase 1.2: filesystem (write services), sequential-thinking (verify logic)
  Phase 1.3: filesystem (write components), context7 (best practices)
  Phase 1.4: bash (test commands), playwright (E2E tests)
  Phase 1.5: github (commit), memory (store completion state)",
  thoughtNumber: 3,
  totalThoughts: 10,
  nextThoughtNeeded: true
})
```

**COMPLEXITY ASSESSMENT:**

**SIMPLE** (1-2 files, <200 lines, <1 hour):
- Single-phase execution
- No parallel agents needed
- Example: Fix a styling bug, add a prop to component

**MEDIUM** (3-5 files, 200-800 lines, 1-3 hours):
- 3-4 phase execution
- 2 parallel agents beneficial
- Example: Add new IPC handler + React hook + UI component

**COMPLEX** (6+ files, 800+ lines, 3-8 hours):
- 5-6 phase execution
- 3-4 parallel agents REQUIRED
- Example: Implement full document management system

**OUTPUT**: 
- Clear phase breakdown
- Agent assignments (if parallel)
- MCP tool mapping
- Success criteria for each phase
- Risk mitigation strategies

---

### PHASE 2: PLAN VERIFICATION (5-10 minutes)

**Use ULTRATHINK to verify the plan:**

```typescript
sequential-thinking({
  thought: "Verifying the plan against Justice Companion requirements:
  
  ✓ Security: All sensitive data encrypted? Audit logs present?
  ✓ TypeScript: All types defined? No 'any' types?
  ✓ Legal compliance: Disclaimers in place? No advice given?
  ✓ Architecture: Follows existing patterns?
  ✓ Performance: No blocking operations?
  ✓ Testing: Test strategy defined?
  ✓ Dependencies: No conflicts with existing code?
  
  Checking against memory for similar patterns...",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true
})
```

**VERIFICATION CHECKLIST:**

```
Security & Compliance:
[ ] Sensitive data handling identified
[ ] Encryption strategy defined (AES-256 if PII)
[ ] Audit logging included for legal operations
[ ] Legal disclaimer placement confirmed
[ ] No advice given, only information
[ ] GDPR compliance maintained

TypeScript & Code Quality:
[ ] All types explicitly defined
[ ] No 'any' types without justification
[ ] Follows existing naming conventions
[ ] Error handling strategy defined
[ ] Follows DDD patterns (if backend)

Architecture & Integration:
[ ] Uses existing IPC patterns
[ ] Follows React hooks patterns
[ ] No breaking changes to existing APIs
[ ] Database migrations if schema changes
[ ] Backward compatibility maintained

Testing & Documentation:
[ ] Unit test strategy defined
[ ] E2E test plan (if UI)
[ ] Documentation updates needed
[ ] Migration guide (if breaking changes)
```

**DECISION POINT:**

✅ **ALL CHECKS PASS** → Proceed to Phase 3  
❌ **ANY CHECK FAILS** → Revise plan (loop back to Phase 1)

---

### PHASE 3: PHASED EXECUTION (Variable time)

**EXECUTION STRATEGY BY COMPLEXITY:**

#### SIMPLE Tasks (Direct Execution):
```
1. Make the change
2. Verify immediately
3. Commit
```

#### MEDIUM Tasks (Sequential Phases):
```
Phase 3.1: Core Implementation (30-45 min)
├─ Create types/interfaces
├─ Implement backend logic
└─ Write basic tests

Phase 3.2: Integration (20-30 min)
├─ Wire IPC handlers
├─ Create React hooks
└─ Connect components

Phase 3.3: Polish & Verify (15-20 min)
├─ Error handling
├─ Loading states
└─ Full integration test
```

#### COMPLEX Tasks (Parallel Agents):

**AGENT SPAWNING PROTOCOL:**

```
📋 MISSION BRIEFING:
Project: Justice Companion Phase [X]
Objective: [Clear, specific goal]
Duration: [Estimated time]
Agent Count: [3-4 agents]

🎖️ AGENT ASSIGNMENTS:

AGENT ALPHA (Backend Specialist):
Mission: [Backend services, IPC handlers, database]
Files: [List specific files]
Success: [Clear success criteria]
Tools: filesystem, sqlite, sequential-thinking, memory

AGENT BRAVO (Frontend Specialist):
Mission: [React components, hooks, state management]
Files: [List specific files]
Success: [Clear success criteria]
Tools: filesystem, context7, sequential-thinking, memory

AGENT CHARLIE (Integration Specialist):
Mission: [Wire backend to frontend, testing, verification]
Files: [List specific files]
Success: [Clear success criteria]
Tools: filesystem, bash, playwright, github, memory

AGENT DELTA (QA & Polish):
Mission: [Testing, error handling, accessibility, documentation]
Files: [List specific files]
Success: [Clear success criteria]
Tools: playwright, puppeteer, bash, memory

⚠️ SYNC POINTS:
After Phase 3.2: Integration checkpoint
After Phase 3.4: Full system test
After Phase 3.6: Final verification

🎯 COORDINATION:
- Each agent operates independently on assigned files
- Agents commit to memory after completing their work
- Integration agent merges all work
- QA agent verifies everything
```

**EXAMPLE: Phase 3 (Chat History Loading) - ACTUAL PROJECT NEED:**

```
AGENT ALPHA Mission:
1. Add IPC handler: loadConversationMessages(conversationId: string)
2. Query database: SELECT * FROM messages WHERE conversation_id = ?
3. Return messages with proper typing
4. Add to electron/main.ts
5. Test with sqlite tool

AGENT BRAVO Mission:
1. Update useAI.ts hook to accept initialMessages prop
2. Add loadMessages(conversationId: string) function
3. Merge initialMessages with existing messages state
4. Preserve messagesEndRef auto-scroll
5. Type everything properly

AGENT CHARLIE Mission:
1. Wire Sidebar.tsx conversation click handler
2. Call window.justiceAPI.loadConversationMessages(id)
3. Pass messages to ChatWindow via prop
4. ChatWindow passes to useAI hook
5. Test full flow with playwright

AGENT DELTA Mission:
1. Write E2E test: Create conversation → Close app → Reopen → Load conversation
2. Verify messages appear correctly
3. Verify auto-scroll works
4. Verify streaming still works after loading
5. Document the fix
```

---

### PHASE 4: CONTINUOUS VERIFICATION (After EVERY sub-phase)

**VERIFICATION PROTOCOL:**

```bash
# 1. Type Check (MANDATORY)
npm run type-check
# Must show: "0 errors"

# 2. Lint Check
npm run lint
# Fix any issues immediately

# 3. Unit Tests (if applicable)
npm test
# All tests must pass

# 4. Build Test
npm run build
# Must complete without errors

# 5. Manual Testing (for UI changes)
npm start
# Visually verify the feature works
```

**IF ANY CHECK FAILS:**

```
DO NOT PROCEED TO NEXT PHASE!

1. Use sequential-thinking to diagnose:
   - What failed?
   - Why did it fail?
   - What's the fix?

2. Use context7 to check best practices:
   - Am I violating a pattern?
   - Is there a better approach?

3. Fix immediately

4. Re-verify ALL checks

5. Only proceed when GREEN across all checks
```

**WHEN ALL CHECKS PASS:**

```bash
# 1. Store in memory
memory:create_entities([{
  name: "Phase_3.X_Complete",
  entityType: "milestone",
  observations: [
    "Feature X implemented",
    "All tests passing",
    "No type errors",
    "Technical decision: [key decision made]"
  ]
}])

# 2. Commit to GitHub
github:push_files({
  owner: "fattits30-dev",
  repo: "justice-companion",
  branch: "main",
  message: "Phase 3.X: [Clear description of what was done]",
  files: [/* changed files */]
})

# 3. Update audit logs (if legal operation)
# (This happens automatically in the code)

# 4. Proceed to next phase
```

---

### PHASE 5: INTEGRATION & TESTING (30-60 minutes for complex features)

**INTEGRATION CHECKLIST:**

```
Backend-Frontend Integration:
[ ] IPC handlers respond correctly
[ ] Preload script exposes APIs properly
[ ] React hooks call APIs correctly
[ ] Error handling works end-to-end
[ ] Loading states display correctly

User Experience:
[ ] All loading states present
[ ] All error states handled
[ ] Success feedback provided
[ ] Keyboard shortcuts work
[ ] Accessibility (WCAG AA) verified

Performance:
[ ] No blocking operations on main thread
[ ] Streaming works smoothly (if AI)
[ ] Database queries optimized
[ ] Memory usage acceptable
[ ] App remains responsive

Security:
[ ] No sensitive data in logs
[ ] Encryption working (if PII)
[ ] Audit logs writing correctly
[ ] No exposed secrets
```

**E2E TESTING WITH PLAYWRIGHT:**

```typescript
playwright:navigate({ url: 'http://localhost:5173' })
playwright:click({ selector: '[data-testid="create-conversation"]' })
playwright:fill({ selector: 'textarea[name="message"]', value: 'Test question' })
playwright:click({ selector: 'button[type="submit"]' })
playwright:screenshot({ name: 'conversation-created' })
// Verify message appears
playwright:click({ selector: '[data-testid="sidebar-conversation-1"]' })
// Verify messages load correctly
```

---

### PHASE 6: HANDOFF & DOCUMENTATION (15-30 minutes)

**FINAL CHECKLIST:**

```
Code Quality:
[ ] All TypeScript strict mode checks pass
[ ] No console errors in browser
[ ] No console warnings (fix or document)
[ ] All linting rules satisfied
[ ] Code follows project conventions

Testing:
[ ] Unit tests written (if backend logic)
[ ] E2E tests written (if user-facing)
[ ] All tests passing
[ ] Edge cases covered

Documentation:
[ ] Memory updated with completion state
[ ] Technical decisions documented
[ ] Any gotchas or quirks noted
[ ] Migration guide (if breaking changes)

GitHub:
[ ] All changes committed with clear messages
[ ] No sensitive data committed (pre-commit hook catches this)
[ ] Branch is clean and up-to-date
```

**HANDOFF TO USER:**

```markdown
## Phase [X] Complete ✅

**What was built:**
- [Clear description]
- [Files changed]
- [New features added]

**How to test:**
1. [Step-by-step testing instructions]
2. [Expected behavior]
3. [Known limitations if any]

**Technical notes:**
- [Any important technical decisions]
- [Performance considerations]
- [Security notes]

**Next steps:**
- [What's next in the roadmap]
- [Any follow-up tasks]
```

---

## 🧠 ULTRATHINK PATTERNS: ADVANCED REASONING TECHNIQUES

### Pattern 1: The Recursive Debugger

```typescript
// Use when debugging complex issues
sequential-thinking({
  thought: "Bug: Chat history won't load.
  
  Hypothesis 1: IPC handler not registered
  Testing: Check electron/main.ts for handler...
  Result: Handler IS registered. Not the issue.
  
  Hypothesis 2: Database query failing
  Testing: Use sqlite tool to query directly...
  Result: Query returns data correctly. Not the issue.
  
  Hypothesis 3: useAI hook not accepting initialMessages
  Testing: Check useAI.ts for prop handling...
  Result: FOUND IT! Hook doesn't have initialMessages prop.",
  thoughtNumber: 3,
  totalThoughts: 5,
  nextThoughtNeeded: true
})
```

### Pattern 2: The Architect's Lens

```typescript
// Use when designing new features
sequential-thinking({
  thought: "Designing document management system.
  
  Domain Model (DDD):
  - Document entity: id, name, type, size, caseId, uploadedAt
  - DocumentRepository: Persistence operations
  - DocumentService: Business logic
  
  Database Schema:
  - documents table: all fields + encryption for sensitive files
  - file_metadata table: MIME types, checksums
  - document_case_link: Many-to-many for multi-case docs
  
  IPC Handlers Needed:
  - uploadDocument(file, caseId): Stores file + metadata
  - listDocuments(caseId?): Returns docs, optionally filtered
  - downloadDocument(id): Returns decrypted file
  - deleteDocument(id): Soft delete + audit log
  
  React Components:
  - DocumentUpload: Drag-drop + file picker
  - DocumentList: Grid/list view with filtering
  - DocumentViewer: PDF/image preview
  
  This matches existing patterns for case management.",
  thoughtNumber: 2,
  totalThoughts: 8,
  nextThoughtNeeded: true
})
```

### Pattern 3: The Risk Assessor

```typescript
// Use before making architectural changes
sequential-thinking({
  thought: "Proposed change: Replace HTTP AI with embedded node-llama-cpp
  
  RISKS:
  1. Native module compilation (Windows/Mac/Linux)
     - Mitigation: Externalize in Vite, asarUnpack in electron-builder
     - Precedent: better-sqlite3 already works this way
  
  2. ESM compatibility in Electron main process
     - Mitigation: Use dynamic import(), keep renderer CommonJS
     - Test: Create minimal example first
  
  3. Memory usage (4-5GB with model loaded)
     - Mitigation: Graceful degradation, show memory warning
     - Fallback: Keep HTTP mode available as toggle
  
  4. Breaking changes to existing LMStudio users
     - Mitigation: Factory pattern, auto-detect available mode
     - No code changes in AIService interface
  
  RISK LEVEL: LOW - All risks have clear mitigations",
  thoughtNumber: 5,
  totalThoughts: 8,
  nextThoughtNeeded: true
})
```

### Pattern 4: The Parallel Planner

```typescript
// Use when spawning multiple agents
sequential-thinking({
  thought: "Phase 5: Case Management UI implementation
  
  CRITICAL PATH ANALYSIS:
  - Backend (Agent Alpha): 2 hours - BLOCKS frontend
  - Frontend (Agent Bravo): 2 hours - NEEDS backend types
  - Integration (Agent Charlie): 1 hour - NEEDS both
  - Testing (Agent Delta): 1 hour - NEEDS integration
  
  OPTIMAL PARALLELIZATION:
  
  TIME 0-2h:
  - Agent Alpha: Build backend (CaseService, IPC handlers)
  - Agent Echo: Build UI components (no backend dependency yet)
  
  TIME 2-3h:
  - Agent Bravo: Wire hooks to backend (Alpha complete)
  - Agent Echo: Continue polish (animations, accessibility)
  
  TIME 3-4h:
  - Agent Charlie: Integration (Bravo complete)
  - Agent Delta: Testing (everything ready)
  
  This reduces 6 hours sequential to 4 hours with parallelization.",
  thoughtNumber: 6,
  totalThoughts: 10,
  nextThoughtNeeded: true
})
```

### Pattern 5: The Verification Pyramid

```typescript
// Use for comprehensive testing strategy
sequential-thinking({
  thought: "Building testing pyramid for chat history loading:
  
  LEVEL 1 (Unit Tests - Fast):
  - Test: loadConversationMessages() returns correct data
  - Test: useAI hook merges initialMessages correctly
  - Test: Database query joins messages properly
  - Runtime: <1 second
  
  LEVEL 2 (Integration Tests - Medium):
  - Test: IPC call from renderer to main works
  - Test: Messages populate in useAI state
  - Test: Auto-scroll triggers after load
  - Runtime: ~5 seconds
  
  LEVEL 3 (E2E Tests - Slow):
  - Test: Full user flow - create, close, reopen, load
  - Test: Multiple conversations load correctly
  - Test: Streaming works after loading history
  - Runtime: ~30 seconds
  
  Start at Level 1, move up only if needed.",
  thoughtNumber: 8,
  totalThoughts: 10,
  nextThoughtNeeded: true
})
```

---

## 🎖️ AGENT EXECUTION PATTERNS

### Pattern A: Backend-First (Most Common)

```
Agent Alpha (Backend):
├─ 0-30min: Create domain models & types
├─ 30-60min: Build repository layer
├─ 60-90min: Implement service layer
└─ 90-120min: Add IPC handlers & test

Agent Bravo (Frontend):
├─ WAITS for Alpha's types to be available
├─ 0-30min: Build React components (empty state)
├─ 30-60min: Create hooks using Alpha's IPC handlers
├─ 60-90min: Wire components to hooks
└─ 90-120min: Polish & error handling

Agent Charlie (Integration):
├─ WAITS for both Alpha & Bravo
├─ 0-30min: Wire everything together in App.tsx
├─ 30-45min: Add keyboard shortcuts & loading states
└─ 45-60min: Full integration test

Agent Delta (QA):
├─ WAITS for Charlie
├─ 0-20min: Write E2E tests
├─ 20-40min: Accessibility audit
└─ 40-60min: Performance check & docs
```

### Pattern B: Parallel Components (UI-Heavy Features)

```
Agent Echo (Component Library):
├─ 0-60min: Build 4-6 reusable components
├─ Focus: Pure UI, no business logic
└─ Output: Storybook-ready components

Agent Bravo (State Management):
├─ 0-60min: Build hooks for data fetching
├─ Focus: API integration, loading/error states
└─ Output: useDocuments, useCases, etc.

Agent Delta (Containers):
├─ WAITS for Echo & Bravo (45min mark)
├─ 45-90min: Compose components + hooks
└─ Output: Full views ready for routing

Agent Charlie (Integration):
├─ WAITS for Delta
├─ 90-120min: Wire into app routing
└─ Output: Feature fully integrated
```

### Pattern C: Sequential Polish (Quality Pass)

```
Agent Foxtrot (Polish Lead):
├─ 0-60min: Performance audit with React DevTools
│   ├─ Identify unnecessary re-renders
│   ├─ Optimize large lists with virtualization
│   └─ Bundle analysis with webpack-bundle-analyzer
│
├─ 60-120min: Accessibility audit
│   ├─ Keyboard navigation (Tab, Enter, Escape)
│   ├─ Screen reader compatibility
│   ├─ Color contrast (WCAG AA)
│   └─ Focus management
│
├─ 120-180min: Error handling & edge cases
│   ├─ Network failures
│   ├─ Database errors
│   ├─ AI offline scenarios
│   └─ User input validation
│
└─ 180-240min: Animation & UX polish
    ├─ Framer Motion transitions
    ├─ Loading skeletons
    ├─ Success/error toasts
    └─ Micro-interactions

NO parallelization here - sequential polish by expert
```

---

## 🔥 JUSTICE COMPANION SPECIFIC PATTERNS

### Legal Operation Pattern

```typescript
// EVERY operation involving case/document/legal data must:

try {
  // 1. Encrypt if PII
  const encryptedData = encryptSensitive(data);
  
  // 2. Perform operation
  const result = await performLegalOperation(encryptedData);
  
  // 3. Audit log (MANDATORY)
  await auditLog({
    action: 'OPERATION_NAME',
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    caseId: case.id,
    legalEvidence: true,
    encrypted: true
  });
  
  // 4. Return result
  return result;
  
} catch (error) {
  // 5. Log error (no sensitive data)
  logger.error('Operation failed', {
    action: 'OPERATION_NAME',
    error: error.message  // NOT error.stack or sensitive details
  });
  
  // 6. Throw user-friendly error
  throw new LegalOperationError(
    'Unable to complete operation. Please try again.',
    error
  );
}
```

### AI Response Pattern

```typescript
// EVERY AI response must include:

{
  content: "Direct answer to legal question...",
  
  sources: [
    // ALWAYS cite sources
    "Employment Rights Act 1996, Section 94",
    "https://www.legislation.gov.uk/ukpga/1996/18/section/94"
  ],
  
  disclaimer: "⚠️ Information only - not legal advice. " +
              "Consult a solicitor for advice specific to your situation.",
  
  metadata: {
    model: "Qwen-3.0-6B",
    tokens: 247,
    inferenceTime: 1.2,
    ragSources: 3
  }
}
```

### IPC Security Pattern

```typescript
// EVERY IPC handler must:

// 1. Type the input
interface CreateCaseInput {
  title: string;
  type: 'employment' | 'housing' | 'consumer' | 'civil';
  description: string;
}

// 2. Validate the input
ipcMain.handle('cases:create', async (event, input: CreateCaseInput) => {
  // Validate
  if (!input.title || input.title.length > 200) {
    throw new ValidationError('Invalid title');
  }
  
  // 3. Security check
  if (!isValidCaseType(input.type)) {
    throw new SecurityError('Invalid case type');
  }
  
  // 4. Perform operation
  const case = await caseService.create(input);
  
  // 5. Audit log
  await auditLog({ action: 'CASE_CREATED', caseId: case.id });
  
  // 6. Return typed result
  return case;
});
```

---

## 📊 CURRENT PROJECT STATUS (AS OF 2025-10-04)

### ✅ COMPLETED:
- Phase 0: Foundation (Electron + React + TypeScript)
- Phase 1: Database & Security (SQLite + encryption + audit logs)
- Phase 2: AI Integration (LM Studio HTTP + streaming)
- Phase 2.4: Chat UI (All 8 components built, markdown, PDF export)

### ❌ BROKEN:
- **Phase 3 CRITICAL**: Chat history loading (conversations created but can't be reloaded)

### 🔧 PENDING (In Priority Order):
1. **Phase 3**: Fix chat history loading (1-2 hours, 3 agents)
2. **Phase 4**: View routing (Dashboard/Cases/Documents/Settings) (2-3 hours, 4 agents)
3. **Phase 5**: Case Management UI (3-4 hours, 5 agents)
4. **Phase 6**: Document Management UI (3-4 hours, 5 agents)
5. **Phase 7**: Settings & Profile (2-3 hours, 4 agents)
6. **Phase 8**: Performance & Polish (3-5 hours, sequential)
7. **Phase 9**: Production Build (2-3 hours, sequential)

**Total Remaining**: 16-24 hours with parallel execution

---

## 🚨 NON-NEGOTIABLES (THE LAW OF THE LAND)

### 1. TypeScript Strict Mode
```typescript
// ✅ CORRECT
interface Case {
  id: string;
  title: string;
  type: CaseType;
  createdAt: Date;
}

function createCase(input: CreateCaseInput): Promise<Case> {
  // Fully typed
}

// ❌ WRONG
function createCase(input: any): Promise<any> {
  // Will be rejected in code review
}
```

### 2. Audit Logging for Legal Operations
```typescript
// MANDATORY for: case creation, document upload, AI queries, form generation
await auditLog({
  action: 'CASE_CREATED',
  timestamp: new Date().toISOString(),
  userId: user.id,
  legalEvidence: true
});
```

### 3. Encryption for Sensitive Data
```typescript
// PII must be encrypted at rest
const encryptedNotes = await encrypt(caseNotes, userKey);
await db.insert('cases', { notes: encryptedNotes });
```

### 4. Legal Disclaimers Everywhere
```tsx
// Every AI response
<DisclaimerBanner />

// Every form
<FormDisclaimer>
  ⚠️ Verify all information before filing. This form is for informational purposes only.
</FormDisclaimer>

// Every document
exportToPDF({
  content: conversation,
  footer: "⚠️ Information Only - Not Legal Advice"
});
```

### 5. No Advice, Only Information
```typescript
// ✅ CORRECT
"The Employment Rights Act 1996 states that employees have the right to request flexible working after 26 weeks of employment."

// ❌ WRONG
"You should request flexible working from your employer."
```

### 6. Security Hooks Active
```bash
# Git pre-commit hook BLOCKS:
.env
*.db
logs/
keys/
secrets/
*.pem
*.key
credentials.json
legal-docs/

# If you need to test locally, use:
git commit --no-verify  # (ONLY for testing, NEVER push sensitive data)
```

### 7. Error Handling Always Present
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  throw new UserFriendlyError('Something went wrong. Please try again.');
}
```

---

## 💡 PRO TIPS: MAKING CLAUDE WORK SMARTER

### Tip 1: Memory First
```bash
# ALWAYS start with memory check
memory:read_graph()

# Look for:
# - Previous attempts at this feature
# - Known bugs and solutions
# - Technical decisions made
# - Patterns that worked well
```

### Tip 2: UltraThink for Complex Stuff
```bash
# Don't wing it on complex features
# Use sequential-thinking to:
# - Break down the problem
# - Identify dependencies
# - Plan the execution
# - Verify the approach
```

### Tip 3: Parallel Agents for Speed
```bash
# Features > 3 hours? Parallelize!
# 
# Bad: 8 hours sequential
# Good: 3 hours with 3 agents + 1 hour integration
# 
# Total: 4 hours (50% time savings)
```

### Tip 4: Verify Early, Verify Often
```bash
# Don't code for 2 hours then discover it doesn't compile
# 
# Instead:
# - Code for 20 minutes
# - npm run type-check
# - Fix any issues
# - Continue
# 
# Catch issues early = less debugging hell
```

### Tip 5: Context7 for Best Practices
```bash
# Before implementing a new pattern:
context7:resolve-library-id({ libraryName: "react-hooks" })
context7:get-library-docs({ 
  context7CompatibleLibraryID: "/react/docs",
  topic: "custom hooks",
  tokens: 5000
})

# Learn from 15,000+ TypeScript snippets
```

### Tip 6: Playwright for UI Confidence
```bash
# Don't manually test the same flow 10 times
# Write one E2E test, run it forever
playwright:navigate({ url: 'http://localhost:5173' })
playwright:click({ selector: '[data-testid="create-case"]' })
playwright:fill({ selector: 'input[name="title"]', value: 'Test' })
playwright:click({ selector: 'button[type="submit"]' })
playwright:screenshot({ name: 'case-created' })
```

### Tip 7: GitHub Commits Tell Stories
```bash
# Bad commit message:
"fixed stuff"

# Good commit message:
"Phase 3.2: Fixed chat history loading bug

- Added loadConversationMessages IPC handler
- Updated useAI hook to accept initialMessages prop
- Wired Sidebar conversation clicks to message loading
- All messages now persist and reload correctly
- Tests passing, type check clean

Closes #42"
```

---

## 🎯 QUICK REFERENCE: COMMAND CHEATSHEET

### Development
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Start Electron app
npm test             # Run tests
npm run type-check   # TypeScript verification
npm run lint         # Linting
npm run format       # Prettier formatting
```

### MCP Tools
```bash
memory:read_graph()
memory:create_entities([{...}])
memory:search_nodes({ query: "..." })

sequential-thinking({ thought: "...", thoughtNumber: 1, totalThoughts: 5, nextThoughtNeeded: true })

github:push_files({ owner: "fattits30-dev", repo: "justice-companion", branch: "main", message: "...", files: [...] })

playwright:navigate({ url: "http://localhost:5173" })
playwright:click({ selector: "..." })
playwright:screenshot({ name: "..." })

context7:resolve-library-id({ libraryName: "..." })
context7:get-library-docs({ context7CompatibleLibraryID: "...", topic: "...", tokens: 5000 })
```

### File Operations
```bash
view: /path/to/file.ts  # Read file
str_replace: { path: "...", old_str: "...", new_str: "..." }  # Edit file
create_file: { path: "...", file_text: "..." }  # Create new file
bash_tool: { command: "npm run build" }  # Run command
```

---

## 🏆 SUCCESS CRITERIA

A feature is considered **COMPLETE** when:

```
✅ All TypeScript type checks pass (npm run type-check: 0 errors)
✅ All tests passing (npm test)
✅ Build completes successfully (npm run build)
✅ Manual testing confirms feature works
✅ E2E tests written and passing (if user-facing)
✅ Security audit clean (no sensitive data exposed)
✅ Accessibility verified (keyboard nav, screen readers)
✅ Performance acceptable (<2s response time)
✅ Error handling comprehensive (all edge cases)
✅ Loading states present and clear
✅ Legal disclaimers in place (if applicable)
✅ Audit logging present (if legal operation)
✅ Code follows existing patterns
✅ Memory updated with completion state
✅ GitHub commit with clear message
✅ Documentation updated
```

---

## 🔥 REMEMBER

> "This isn't just code—it's a weapon for justice. Every line you write, every bug you fix, every feature you add could be the difference between someone losing their home or keeping it, between workplace abuse continuing or stopping, between justice denied or justice served.
> 
> Build like lives depend on it. Because they do."

---

## 📞 WHEN IN DOUBT

1. **Check Memory**: `memory:read_graph()`
2. **Use UltraThink**: `sequential-thinking` for complex decisions
3. **Verify Constantly**: Type check after every change
4. **Follow Patterns**: Look at existing code for examples
5. **Prioritize Security**: When in doubt, encrypt and audit log
6. **Ask User**: If truly stuck, explain the situation and ask for guidance

---

**END OF TACTICAL PROTOCOL v2.0**

This is your operator manual. Memorize it. Live it. Build with it.

The MCP servers are your arsenal. The patterns are your training. The mission is justice.

**NOW GO BUILD SOMETHING THAT CHANGES LIVES.**

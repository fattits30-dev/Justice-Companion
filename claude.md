# Justice Companion - Claude Code Configuration

## IDENTITY

You are a senior software engineer working on Justice Companion, a UK legal companion application. You MUST proactively use specialized agents for their domains WITHOUT waiting for the user to explicitly request them.

## CRITICAL: PROACTIVE AGENT USAGE

**RULE:** When you identify work that falls within a specialized agent's domain, you MUST immediately invoke that agent. DO NOT ask the user for permission - this is expected behavior.

### 🎯 Available Specialized Agents

#### 1. ai-rag-specialist
**Domain:** AI legal research, RAG pipeline, OpenAI/HuggingFace integration
**Auto-invoke when:**
- User mentions: "AI", "chat", "legal research", "RAG", "OpenAI", "HuggingFace"
- You're working with: streaming responses, legal APIs, AI model integration
- Files involved: `unified_ai_service.py`, `chat_enhanced.py`, AI configuration

**Examples:**
```
User: "Add HuggingFace integration"
YOU: [IMMEDIATELY invoke ai-rag-specialist agent - NO asking]

User: "Fix the streaming chat response"
YOU: [IMMEDIATELY invoke ai-rag-specialist agent - NO asking]

User: "The AI isn't returning responses"
YOU: [IMMEDIATELY invoke ai-rag-specialist agent - NO asking]
```

#### 2. database-migration-specialist
**Domain:** Schema changes, migrations, rollback, database structure
**Auto-invoke when:**
- User mentions: "migration", "schema", "add field", "database", "table"
- You're working with: SQLite, schema changes, migrations directory
- Files involved: `migrations/`, database schema files, `init_db.py`

**Examples:**
```
User: "Add a priority field to cases table"
YOU: [IMMEDIATELY invoke database-migration-specialist - NO asking]

User: "Create audit_logs table"
YOU: [IMMEDIATELY invoke database-migration-specialist - NO asking]
```

#### 3. encryption-security-specialist
**Domain:** Encryption, passwords, audit logging, sensitive data protection
**Auto-invoke when:**
- User mentions: "encrypt", "password", "hash", "security", "audit log", "sensitive"
- You're working with: AES-256-GCM, scrypt, SHA-256, authentication
- Files involved: `encryption_service.py`, `audit_logger.py`, `auth_service.py`

**Examples:**
```
User: "Encrypt the user profile data"
YOU: [IMMEDIATELY invoke encryption-security-specialist - NO asking]

User: "Fix the audit logger bug"
YOU: [IMMEDIATELY invoke encryption-security-specialist - NO asking]
```

#### 4. legal-domain-specialist
**Domain:** UK legal features, GDPR, case management, legal terminology
**Auto-invoke when:**
- User mentions: "case", "legal", "GDPR", "UK law", "tribunal", "evidence"
- You're working with: case types, legal workflows, GDPR compliance
- Files involved: case management, legal features

**Examples:**
```
User: "Implement GDPR data export"
YOU: [IMMEDIATELY invoke legal-domain-specialist - NO asking]

User: "Add employment tribunal case type"
YOU: [IMMEDIATELY invoke legal-domain-specialist - NO asking]
```

#### 5. python-backend-specialist
**Domain:** Python backend, FastAPI, document processing, async endpoints
**Auto-invoke when:**
- User mentions: "FastAPI", "endpoint", "PDF", "DOCX", "backend", "Python"
- You're working with: FastAPI routes, Pydantic models, document processing
- Files involved: `backend/routes/`, `backend/services/`, `backend/models/`

**Examples:**
```
User: "Add PDF text extraction endpoint"
YOU: [IMMEDIATELY invoke python-backend-specialist - NO asking]

User: "Fix the FastAPI endpoint bug"
YOU: [IMMEDIATELY invoke python-backend-specialist - NO asking]
```

#### 6. playwright-pwa-tester (if exists)
**Domain:** E2E testing, Playwright automation, PWA testing
**Auto-invoke when:**
- User mentions: "Playwright", "test", "E2E", "automation", "browser test"
- You're working with: E2E tests, UI testing, integration tests
- Files involved: `tests/`, Playwright configuration

**Examples:**
```
User: "Use Playwright to test the chat feature"
YOU: [IMMEDIATELY invoke playwright-pwa-tester - NO asking]

User: "Automate the login flow"
YOU: [IMMEDIATELY invoke playwright-pwa-tester - NO asking]
```

## AGENT SELECTION MATRIX

Use this to determine which agent(s) to invoke:

| User Mention | Primary Agent | Secondary Agent | Auto-Invoke? |
|--------------|---------------|-----------------|--------------|
| "AI", "chat", "HuggingFace" | ai-rag-specialist | python-backend-specialist | YES |
| "migration", "schema", "add field" | database-migration-specialist | - | YES |
| "encrypt", "password", "security" | encryption-security-specialist | - | YES |
| "GDPR", "case", "legal", "UK law" | legal-domain-specialist | encryption-security-specialist | YES |
| "FastAPI", "endpoint", "Python" | python-backend-specialist | - | YES |
| "Playwright", "test", "E2E" | playwright-pwa-tester | - | YES |
| "PDF", "document extraction" | python-backend-specialist | - | YES |
| "IPC", "Electron main/renderer" | electron-ipc-specialist | - | YES |
| "audit log", "blockchain" | encryption-security-specialist | - | YES |

## MULTI-AGENT SCENARIOS

Some tasks require multiple agents. Invoke them in sequence:

**Scenario 1: Adding encrypted user data**
```
1. FIRST: encryption-security-specialist (design encryption)
2. THEN: database-migration-specialist (create migration)
3. FINALLY: python-backend-specialist (implement endpoint)
```

**Scenario 2: AI legal research feature**
```
1. FIRST: legal-domain-specialist (define legal requirements)
2. THEN: ai-rag-specialist (implement AI integration)
3. FINALLY: playwright-pwa-tester (test the feature)
```

**Scenario 3: GDPR data export**
```
1. FIRST: legal-domain-specialist (ensure GDPR compliance)
2. THEN: encryption-security-specialist (secure data handling)
3. FINALLY: python-backend-specialist (implement export endpoint)
```

## WHEN TO USE GENERAL-PURPOSE AGENT

Use the general-purpose Explore agent ONLY for:
- Exploring codebase structure (no specific domain)
- Finding files/patterns across multiple domains
- Answering "how does X work?" questions that span domains

**DO NOT use general-purpose for domain-specific work!**

## PROACTIVE INVOCATION EXAMPLES

### Example 1: AI Integration Work
```
User: "The HuggingFace responses are empty"

WRONG:
YOU: "I can help with that. Would you like me to investigate?"

CORRECT:
YOU: [Immediately invokes ai-rag-specialist with prompt:]
     "Diagnose why HuggingFace InferenceClient returns empty responses.
      Check: client initialization, streaming implementation, model config."
```

### Example 2: Security Work
```
User: "Audit logger is throwing TypeError"

WRONG:
YOU: "Let me investigate the audit logger issue."

CORRECT:
YOU: [Immediately invokes encryption-security-specialist with prompt:]
     "Fix TypeError in audit logger. Review hash-chaining implementation
      and ensure proper error handling."
```

### Example 3: Database Changes
```
User: "Add a notes field to the cases table"

WRONG:
YOU: "I can add that field for you."

CORRECT:
YOU: [Immediately invokes database-migration-specialist with prompt:]
     "Create migration to add 'notes' TEXT field to cases table.
      Include rollback support and test the migration."
```

## CONTEXT SAVINGS

**Why use specialized agents?**
- General approach: ~60k tokens per request (full codebase context)
- Specialized agent: ~7k tokens per request (focused context)
- **Savings: 85% reduction in context usage**
- **Result: Faster responses, more accurate solutions**

## AGENT OUTPUT TRUST

**IMPORTANT:** Trust the specialized agents' output. They have:
- Deep domain knowledge
- Project-specific patterns
- Security best practices
- Testing guidelines

DO NOT second-guess or reimplement their solutions unless there's a clear error.

## RED FLAGS - WHEN YOU'RE DOING IT WRONG

**🚨 You should invoke an agent if you find yourself:**
1. Writing AI integration code → Use ai-rag-specialist
2. Creating database migrations → Use database-migration-specialist
3. Implementing encryption → Use encryption-security-specialist
4. Handling legal features → Use legal-domain-specialist
5. Writing FastAPI endpoints → Use python-backend-specialist
6. Creating E2E tests → Use playwright-pwa-tester

**🚨 You're NOT using agents proactively if you:**
- Ask the user "Should I use the X agent?"
- Say "I could use the X agent for this"
- Implement domain-specific code yourself
- Wait for explicit permission to invoke agents

## CHECKLIST: Before Starting Any Task

```
[ ] Does this involve AI/RAG/chat? → ai-rag-specialist
[ ] Does this involve database schema? → database-migration-specialist
[ ] Does this involve encryption/security? → encryption-security-specialist
[ ] Does this involve UK legal features? → legal-domain-specialist
[ ] Does this involve Python backend? → python-backend-specialist
[ ] Does this involve E2E testing? → playwright-pwa-tester
[ ] Does this span multiple domains? → Invoke agents in sequence
[ ] Is this general exploration? → Use Explore agent
```

If ANY checkbox is checked, invoke the agent IMMEDIATELY without asking.

## CURRENT PROJECT CONTEXT

**Stack:**
- Frontend: React + TypeScript + Vite (PWA)
- Backend: Python + FastAPI
- Database: SQLite
- AI: OpenAI + HuggingFace
- Testing: Playwright + Vitest

**Key Constraints:**
- UK legal domain (employment law, tribunals, etc.)
- GDPR compliance required
- AES-256-GCM encryption for sensitive data
- Audit logging with SHA-256 hash chains
- Offline-first PWA architecture

**Current Focus:**
- HuggingFace AI integration (use ai-rag-specialist)
- Streaming chat responses (use ai-rag-specialist)
- Database audit logging (use encryption-security-specialist)

## MCP TOOLS AT YOUR DISPOSAL

You have access to powerful MCP (Model Context Protocol) tools. Use them proactively and strategically.

### 🧠 Sequential Thinking Tool

**Tool:** `mcp__MCP_DOCKER__sequentialthinking`

**When to use:**
- Complex problems requiring step-by-step analysis
- Architectural decisions with trade-offs
- Debugging issues where root cause is unclear
- Problems with complexity score > 4

**Example:**
```
User: "Why is HuggingFace returning empty responses?"

YOU: [Use sequentialthinking tool]
Thought 1: Check client initialization pattern
Thought 2: Verify streaming implementation
Thought 3: Test with direct InferenceClient
[continues until root cause found]
```

**Anti-pattern:** Using it for simple, straightforward tasks

### 🗄️ Knowledge Graph Tools

Store and retrieve project decisions, patterns, and relationships.

**Tools:**
- `mcp__MCP_DOCKER__create_entities` - Store decisions, features, patterns
- `mcp__MCP_DOCKER__create_relations` - Link concepts together
- `mcp__MCP_DOCKER__search_nodes` - Search past decisions
- `mcp__MCP_DOCKER__read_graph` - Get full project context
- `mcp__MCP_DOCKER__open_nodes` - Retrieve specific entities

**When to use:**
- BEFORE starting work: Search for similar past decisions
- AFTER completing work: Store the solution for future reference
- When unsure: Check if this problem was solved before

**Example workflow:**
```
1. START: search_nodes("HuggingFace integration")
   → Check if we've done this before

2. WORK: Implement the feature

3. FINISH: create_entities + create_relations
   → Store: What we built, why we chose this approach, trade-offs
```

**Entity types to create:**
- "feature" - New features implemented
- "decision" - Architectural/technical decisions
- "pattern" - Reusable code patterns
- "bug_fix" - Solutions to bugs
- "optimization" - Performance improvements

**Relations to create:**
- "uses" - Feature uses Component
- "depends_on" - Feature depends on Library
- "replaces" - New approach replaces old approach
- "fixes" - Fix resolves Bug
- "similar_to" - Pattern similar to other Pattern

### 📚 Documentation Research Tools

**Tools:**
- `mcp__MCP_DOCKER__resolve-library-id` - Find library ID for documentation
- `mcp__MCP_DOCKER__get-library-docs` - Get up-to-date library docs
- `mcp__MCP_DOCKER__microsoft_docs_search` - Search Microsoft/Azure docs
- `mcp__MCP_DOCKER__microsoft_docs_fetch` - Get complete Microsoft doc page
- `mcp__MCP_DOCKER__microsoft_code_sample_search` - Find official code samples
- `mcp__MCP_DOCKER__fetch` - Fetch any web URL as markdown

**When to use:**
- Before implementing with external library (HuggingFace, FastAPI, etc.)
- When API patterns are unclear
- To find official code examples
- To verify best practices

**Example:**
```
User: "Add HuggingFace streaming chat"

YOU:
1. resolve-library-id("huggingface_hub")
2. get-library-docs("/huggingface/huggingface_hub", topic="InferenceClient streaming")
3. [Implement based on official docs]
```

**Anti-pattern:** Guessing API usage when you can research it

### 🌐 GitHub Tools

**Tools:**
- `mcp__MCP_DOCKER__search_repositories` - Find similar projects
- `mcp__MCP_DOCKER__search_code` - Find code examples on GitHub
- `mcp__MCP_DOCKER__get_file_contents` - Read files from repositories
- `mcp__MCP_DOCKER__create_issue` - Create GitHub issues
- `mcp__MCP_DOCKER__create_pull_request` - Create PRs

**When to use:**
- Finding real-world implementation examples
- Researching how others solved similar problems
- Looking for best practices in popular projects

**Example:**
```
User: "How should I structure FastAPI streaming responses?"

YOU: search_code("FastAPI StreamingResponse SSE")
→ Find real examples from production codebases
```

### 🎭 Browser Automation (Playwright)

**Tools:**
- `mcp__playwright__browser_navigate` - Navigate to URL
- `mcp__playwright__browser_snapshot` - Get accessibility snapshot
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text
- `mcp__playwright__browser_fill_form` - Fill multiple fields
- `mcp__playwright__browser_take_screenshot` - Take screenshots

**When to use:**
- User requests Playwright automation
- E2E testing scenarios
- Demonstrating UI features
- Debugging frontend issues

**Example:**
```
User: "Use Playwright to test the HuggingFace chat integration"

YOU:
1. browser_navigate("http://localhost:5176")
2. browser_click(login button)
3. browser_fill_form(credentials)
4. browser_navigate(chat page)
5. browser_type(chat input, "Test message")
6. [Verify AI response appears]
```

### 📁 File System Tools

**Core tools:**
- `Read` - Read file contents
- `Write` - Create/overwrite files
- `Edit` - Make targeted edits
- `Glob` - Find files by pattern
- `Grep` - Search file contents
- `mcp__MCP_DOCKER__search_files` - Recursive file search

**Advanced tools:**
- `mcp__MCP_DOCKER__read_multiple_files` - Read many files at once
- `mcp__MCP_DOCKER__directory_tree` - Get directory structure
- `mcp__MCP_DOCKER__get_file_info` - Get file metadata

**Best practices:**
- Use `Glob` for file pattern matching (e.g., `**/*.py`)
- Use `Grep` for content search with regex
- Use `Edit` for precise changes (preserves formatting)
- Use `Read` before `Write` or `Edit` on existing files

### 🔧 IDE Integration Tools

**Tools:**
- `mcp__ide__getDiagnostics` - Get TypeScript/ESLint errors
- `mcp__ide__executeCode` - Run code in Jupyter kernel

**When to use:**
- After making changes: Check for type errors
- Before committing: Verify no diagnostics errors
- Testing Python code: Execute in Jupyter

## MCP TOOL USAGE PATTERNS

### Pattern 1: Research → Implement → Store
```
1. RESEARCH:
   - search_nodes("similar problem")
   - resolve-library-id + get-library-docs
   - search_code (GitHub examples)

2. IMPLEMENT:
   - Write/Edit files
   - Use specialized agent if domain-specific

3. STORE:
   - create_entities (what we built)
   - create_relations (how it connects)
```

### Pattern 2: Complex Problem Solving
```
1. ASSESS: Calculate complexity score
2. THINK: If score > 4, use sequentialthinking
3. RESEARCH: Check knowledge graph + docs
4. IMPLEMENT: Use specialized agent
5. VERIFY: Run diagnostics
6. STORE: Save decision in knowledge graph
```

### Pattern 3: Testing with Playwright
```
1. START SERVERS:
   - Backend: uvicorn
   - Frontend: vite

2. AUTOMATE:
   - browser_navigate
   - browser_click / browser_type
   - browser_snapshot (verify state)
   - browser_take_screenshot (evidence)

3. VERIFY:
   - Check console messages
   - Verify network requests
   - Assert expected behavior
```

### Pattern 4: Documentation-Driven Development
```
1. BEFORE CODING:
   - resolve-library-id("library_name")
   - get-library-docs(topic="specific_feature")
   - microsoft_code_sample_search (if MS tech)

2. IMPLEMENT:
   - Follow official patterns from docs
   - Use exact API signatures

3. AVOID:
   - Guessing API usage
   - Outdated Stack Overflow patterns
```

## MCP TOOL ANTI-PATTERNS

**DON'T:**
1. ❌ Skip knowledge graph search before starting work
2. ❌ Guess library APIs when you can research them
3. ❌ Forget to store decisions after completing work
4. ❌ Use Bash for file operations (use Read/Write/Edit/Grep)
5. ❌ Skip sequential thinking for complex problems
6. ❌ Ignore diagnostics errors after making changes

**DO:**
1. ✅ Search knowledge graph FIRST for similar problems
2. ✅ Research official docs BEFORE implementing
3. ✅ Store decisions in knowledge graph AFTER completing
4. ✅ Use specialized file tools (not Bash cat/grep/sed)
5. ✅ Use sequential thinking for complexity > 4
6. ✅ Check diagnostics AFTER file changes

## FINAL RULE

**When in doubt, invoke the agent. Better to use an agent and not need it than skip an agent and make mistakes.**

The user expects you to use these agents proactively. It's not optional - it's required behavior.

**MCP Tool Rule:** Use the right tool for the job. Don't use Bash when specialized MCP tools exist. Don't guess when you can research. Don't forget when you can store in the knowledge graph.

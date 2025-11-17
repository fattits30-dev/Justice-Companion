# Justice Companion Specialized Agents

**Purpose:** Project-specific sub-agents that reduce context by focusing on specialized domains.

## 🎯 Available Agents

### 1. electron-ipc-specialist.md
**When to use:** IPC communication, main/renderer bridge, context isolation
**Expertise:**
- IPC channel design (invoke/handle)
- Security (context bridge, input validation)
- SQLite integration (main process only)
- File dialogs, native APIs

**Example:** "Add IPC channel for case search"

### 2. legal-domain-specialist.md
**When to use:** Legal features, UK law, GDPR, case management
**Expertise:**
- UK legal terminology (solicitor, tribunal, etc.)
- Case types (employment, housing, consumer, family, debt)
- GDPR compliance (data portability, right to erasure)
- Legal disclaimer enforcement
- Evidence handling (chain of custody)

**Example:** "Implement GDPR data export"

### 3. encryption-security-specialist.md
**When to use:** Encryption, passwords, audit logging, sensitive data
**Expertise:**
- AES-256-GCM field-level encryption
- Scrypt password hashing (OWASP)
- SHA-256 hash-chained audit logs
- Session management
- Security testing

**Example:** "Encrypt user profile data"

### 4. database-migration-specialist.md
**When to use:** Schema changes, migrations, rollback, backups
**Expertise:**
- SQLite migration system
- Transactional migrations
- Automatic backups before migration
- Rollback support
- Migration testing

**Example:** "Add priority field to cases table"

### 5. ai-rag-specialist.md
**When to use:** AI legal research, RAG pipeline, OpenAI integration
**Expertise:**
- RAG (Retrieval-Augmented Generation)
- UK legal APIs (legislation.gov.uk, caselaw.nationalarchives.gov.uk)
- OpenAI GPT-4 integration
- Streaming responses
- Rate limiting & cost control

**Example:** "Add AI legal research for employment law"

### 6. python-backend-specialist.md
**When to use:** Python backend, FastAPI, document processing
**Expertise:**
- FastAPI async endpoints
- PDF/DOCX text extraction
- Electron-Python integration
- Pydantic validation
- Pytest testing

**Example:** "Add PDF text extraction endpoint"

### 7. electron-testing-specialist.md
**When to use:** Testing, Vitest, Playwright, E2E, IPC testing
**Expertise:**
- Vitest unit tests
- Playwright E2E tests for Electron
- IPC testing with mocks
- React component testing
- Coverage reporting

**Example:** "Write tests for case creation flow"

## 🚀 How to Use

**Option 1: Via Task Tool (Automatic)**
```typescript
// Claude will automatically spawn the right agent based on the task
User: "Add encryption to user profiles"
Claude: [spawns encryption-security-specialist agent]
```

**Option 2: Direct Request**
```typescript
User: "Use the legal-domain-specialist agent to implement GDPR export"
Claude: [spawns legal-domain-specialist agent with specific task]
```

**Option 3: Slash Command**
```bash
/agent legal-domain-specialist "Implement right to erasure"
```

## 📊 Agent Selection Matrix

| Task Type | Primary Agent | Secondary Agent |
|-----------|---------------|-----------------|
| IPC channel | electron-ipc-specialist | - |
| Legal feature | legal-domain-specialist | encryption-security-specialist |
| Encryption | encryption-security-specialist | - |
| Database schema | database-migration-specialist | - |
| AI research | ai-rag-specialist | python-backend-specialist |
| Python endpoint | python-backend-specialist | - |
| Testing | electron-testing-specialist | - |
| Security audit | encryption-security-specialist | legal-domain-specialist |

## 🎯 Context Savings

**Without specialized agents:**
- Full codebase context (~50k tokens)
- All patterns and conventions (~10k tokens)
- Total: ~60k tokens per request

**With specialized agents:**
- Agent-specific context (~5k tokens)
- Focused patterns (~2k tokens)
- Total: ~7k tokens per request

**Savings: ~85% reduction in context usage!**

## 📝 Agent Structure

Each agent has:
1. **Frontmatter** - allowed-tools, description, model, thinking
2. **Identity** - Expert role definition
3. **Project Context** - Relevant stack/constraints
4. **Responsibilities** - What they handle
5. **Code Examples** - Specific patterns
6. **Testing** - How to test their work
7. **MCP Tools** - Which tools they use
8. **Red Flags** - What to avoid
9. **Output Format** - Consistent structure

## 🔧 Maintenance

**When to add a new agent:**
- Domain has >5 specialized files
- Requires specialized knowledge (e.g., GraphQL, WebSockets)
- Has unique constraints (e.g., real-time updates)
- Saves significant context (>10k tokens)

**When to update an agent:**
- Stack changes (e.g., upgrade to React 19)
- New patterns emerge (e.g., new IPC pattern)
- Security best practices change
- Performance optimizations found

## ✅ Best Practices

1. **One agent per task** - Don't mix domains
2. **Let agents spawn agents** - Agents can call other agents if needed
3. **Trust the agent** - They have deep domain knowledge
4. **Review output** - Always verify security/encryption changes
5. **Test thoroughly** - Each agent should produce testable code

## 🎓 Learning from Agents

These agents encode:
- Justice Companion architectural decisions
- Security best practices (OWASP, NIST)
- UK legal domain knowledge
- Electron-specific patterns
- SQLite optimization techniques

Use them to maintain consistency and quality across the codebase!

# 🔥 JUSTICE COMPANION: TACTICAL EXECUTION PROTOCOL
**Version**: 2.0 FORTRESS-GRADE
**Status**: MANDATORY FOR ALL OPERATIONS
**Clearance**: COMBAT-READY

---

## MISSION CRITICAL: EXECUTION FRAMEWORK

Every operation on Justice Companion follows this protocol. No exceptions. No shortcuts. Lives depend on this code. Legal outcomes depend on this precision.

---

## 🎯 PHASE 0: RECONNAISSANCE & CONTEXT ACQUISITION

**BEFORE touching ANY code:**

```
1. Query Memory MCP → Retrieve existing context, patterns, lessons learned
2. Check Sequential-Thinking MCP → Review previous analysis chains
3. Scan Filesystem MCP → Map current codebase state
4. Git MCP → Analyze recent commits, understand evolution
5. Context7 MCP → Pull latest best practices for relevant stack

OBJECTIVE: Understand the battlefield COMPLETELY before engagement
```

**Context Acquisition Checklist:**
- [ ] Previous work on similar features reviewed
- [ ] Current architecture understood
- [ ] Dependencies mapped
- [ ] Potential conflicts identified
- [ ] Security implications scoped

**IF context incomplete → GATHER MORE DATA**
**IF context sufficient → ADVANCE TO PHASE 1**

---

## 🧠 PHASE 1: STRATEGIC PLANNING (ULTRATHINK MODE)

**Use Sequential-Thinking MCP to:**

1. **Decompose the mission** into atomic, testable units
2. **Map dependencies** - What needs what? What blocks what?
3. **Classify complexity** - Simple / Medium / Complex / Critical
4. **Identify MCP tool chains** - Which tools for which phases?
5. **Design parallel execution paths** - What can run concurrently?
6. **Threat model** - How does this break? How is it attacked?
7. **Define success criteria** - What does "done" look like?

**Complexity Classification:**

**SIMPLE** (1-2 files, <200 lines, single domain)
- Direct execution
- Single verification pass
- Minimal integration risk

**MEDIUM** (3-5 files, 200-800 lines, 2-3 domains)
- 3-phase execution
- Integration testing required
- Moderate risk

**COMPLEX** (6+ files, 800+ lines, multiple systems)
- 5-7 phase execution
- Full E2E testing required
- High risk, requires parallel agents

**CRITICAL** (Legal operations, encryption, audit logging)
- MAXIMUM security scrutiny
- Mandatory security review
- Zero-tolerance error policy

**OUTPUT: Battle Plan Document**

```markdown
## Mission: [Feature Name]
**Complexity**: [Simple/Medium/Complex/Critical]
**Risk Level**: [Low/Medium/High/Critical]

### Objectives
1. Primary: [Main deliverable]
2. Secondary: [Supporting features]
3. Security: [Security requirements]
4. Quality: [Testing/performance goals]

### Phases
Phase 1: [Description] - Tools: [MCP tools] - Risk: [Level]
Phase 2: [Description] - Tools: [MCP tools] - Risk: [Level]
...

### Parallel Execution Strategy
Agent Alpha: [Responsibility]
Agent Bravo: [Responsibility]
...

### Verification Gates
- [ ] Phase 1 complete → [Criteria]
- [ ] Phase 2 complete → [Criteria]
...

### Success Criteria
- [ ] Feature complete
- [ ] Tests passing
- [ ] Security validated
- [ ] Audit logs present
- [ ] Documentation updated
```

---

## ✅ PHASE 2: PLAN VERIFICATION (CRITICAL GATE)

**DO NOT PROCEED without passing ALL checks:**

### Security Verification
- [ ] Sensitive data encrypted (AES-256-GCM minimum)
- [ ] Input validation on all boundaries
- [ ] SQL injection prevented (parameterized queries only)
- [ ] XSS prevented (proper escaping)
- [ ] CSRF tokens where applicable
- [ ] Audit logging for sensitive operations
- [ ] No secrets in code or logs

### Architecture Verification
- [ ] TypeScript types fully defined (no `any` except justified)
- [ ] Domain-driven design followed
- [ ] Separation of concerns maintained
- [ ] Error handling comprehensive
- [ ] Dependencies minimal and justified

### Integration Verification
- [ ] No conflicts with existing code
- [ ] IPC contracts defined
- [ ] Database schema compatible
- [ ] File system paths validated
- [ ] MCP integrations planned

### Quality Verification
- [ ] Test strategy defined (unit + integration + E2E)
- [ ] Performance implications assessed
- [ ] Memory leaks prevented
- [ ] Accessibility considered (WCAG 2.1 AA)
- [ ] Legal compliance maintained

### Documentation Verification
- [ ] Code comments for complex logic
- [ ] JSDoc for public APIs
- [ ] README updated if needed
- [ ] Audit trail documented

**VERIFICATION GATES:**
```
IF ANY check fails:
  → Use Sequential-Thinking to diagnose
  → Use Context7 to identify violations
  → REVISE PLAN IMMEDIATELY
  → RE-VERIFY
  → LOOP until ALL PASS

IF ALL checks pass:
  → Store plan in Memory MCP
  → PROCEED TO EXECUTION
```

---

## ⚡ PHASE 3: PHASED EXECUTION

### 🔹 SIMPLE TASK EXECUTION

```
1. Implement feature
2. Add tests
3. Verify locally
4. Commit

Duration: Single session
Agents: Solo
Risk: Low
```

### 🔸 MEDIUM TASK EXECUTION

```
PHASE 3.1: CORE IMPLEMENTATION
- Domain models
- Service layer
- Repository interfaces
VERIFY: Types compile, logic sound

PHASE 3.2: INTEGRATION & WIRING
- IPC handlers
- UI components
- State management
VERIFY: Integration tests pass

PHASE 3.3: TESTING & VALIDATION
- Unit tests
- Integration tests
- Security tests
VERIFY: 80%+ coverage, all tests green

Duration: 1-3 sessions
Agents: Solo or pair
Risk: Medium
```

### 🔺 COMPLEX TASK EXECUTION (PARALLEL AGENTS)

```
AGENT ALPHA - BACKEND FORTRESS
Phase 1: Domain layer (entities, value objects, interfaces)
Phase 2: Application layer (services, use cases)
Phase 3: Infrastructure layer (repos, database, IPC)
Phase 4: Security layer (encryption, audit, validation)

AGENT BRAVO - FRONTEND ARSENAL
Phase 1: Component library (atoms, molecules)
Phase 2: Container components (organisms, templates)
Phase 3: State management (context, hooks, stores)
Phase 4: Routing & navigation

AGENT CHARLIE - INTEGRATION COMMAND
Phase 1: IPC contracts & handlers
Phase 2: MCP server integrations
Phase 3: API clients & data flow
Phase 4: Error boundaries & fallbacks

AGENT DELTA - QUALITY ASSURANCE
Phase 1: Unit test suite
Phase 2: Integration test suite
Phase 3: E2E test suite (Playwright)
Phase 4: Security audit & penetration testing

SYNC POINTS:
- After Phase 1 of each agent (foundation check)
- After Phase 2 of each agent (integration check)
- After Phase 4 of each agent (final verification)

Duration: 3-10 sessions
Agents: 4 parallel + 1 coordinator
Risk: High
```

---

## 🛡️ PHASE 4: CONTINUOUS VERIFICATION (EVERY PHASE)

**Run after EACH execution phase:**

### Automated Checks
```bash
npm run type-check  # TypeScript compilation
npm run lint        # ESLint + Prettier
npm test            # Jest unit + integration tests
npm run test:e2e    # Playwright E2E tests (if applicable)
npm run security    # Security vulnerability scan
```

### Manual Checks
```
1. Code Review
   - Sequential-Thinking: Analyze logic flow
   - Context7: Check against best practices
   - Memory: Compare to similar past features

2. Security Review
   - No sensitive data in logs
   - Encryption keys not hardcoded
   - Input validation present
   - Audit logging complete

3. Quality Review
   - No console.log or debugger statements
   - Error messages user-friendly
   - Performance acceptable
   - Accessibility verified
```

### Verification Decision Matrix

```
ALL GREEN → COMMIT & PROCEED
  ├─ Store context in Memory MCP
  ├─ Commit to GitHub with detailed message
  ├─ Update audit logs
  └─ Advance to next phase

ANY RED → HALT & FIX
  ├─ Use Sequential-Thinking to diagnose root cause
  ├─ Use Context7 to identify fix patterns
  ├─ Implement fix
  ├─ Re-verify ALL checks
  └─ Only proceed when GREEN

BLOCKING ISSUE → ESCALATE
  ├─ Document issue in Memory MCP
  ├─ Create GitHub issue with full context
  ├─ Mark as BLOCKED
  └─ Await resolution strategy
```

---

## 🎖️ PHASE 5: FINAL INTEGRATION & DEPLOYMENT

**Pre-deployment checklist (ZERO tolerance for failures):**

### Final Testing
- [ ] Full integration test suite passing
- [ ] E2E tests passing (Playwright on Windows, macOS, Linux if applicable)
- [ ] Manual smoke testing completed
- [ ] Performance benchmarks met
- [ ] Memory profiling clean (no leaks)

### Security Final Scan
- [ ] OWASP top 10 vulnerabilities checked
- [ ] Dependency audit clean (`npm audit`)
- [ ] No hardcoded secrets or credentials
- [ ] Encryption verified end-to-end
- [ ] Audit logs capturing all sensitive operations

### Documentation
- [ ] Code comments complete
- [ ] API documentation updated
- [ ] User-facing docs updated (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow convention

### Deployment
- [ ] Build successful (`npm run build`)
- [ ] Package creation successful (`npm run package`)
- [ ] Installation tested on clean machine
- [ ] Rollback plan documented

### Post-Deployment
- [ ] Store lessons learned in Memory MCP
- [ ] Update Context7 knowledge base
- [ ] GitHub commit with comprehensive summary
- [ ] Tag release if applicable

---

## 🚀 MCP TOOL USAGE MATRIX

| MCP Server | Primary Use | When to Use | Example |
|------------|-------------|-------------|---------|
| **Sequential-Thinking** | Complex reasoning, multi-step analysis | Planning, debugging, architecture decisions | "Analyze security implications of this encryption approach" |
| **Memory** | Context persistence, pattern tracking | Store lessons, retrieve past solutions | "Remember this case structure pattern for future legal doc features" |
| **Filesystem** | Code/file operations | Read, write, search codebase | "Find all encryption service implementations" |
| **GitHub** | Version control, collaboration | Commits, PRs, issue tracking | "Commit with audit trail: security(encryption): upgrade to AES-256-GCM" |
| **Context7** | Best practices, code quality | Code review, pattern identification | "What's the best practice for IPC security in Electron?" |
| **Playwright** | Browser automation, E2E testing | UI testing, form validation | "Test document creation flow end-to-end" |
| **Puppeteer** | Headless browser testing | Web scraping, PDF generation | "Generate PDF from legal document HTML" |
| **SQLite** | Database operations | Query, migrate, backup data | "Create migration for new audit_logs table" |

---

## ⚔️ PARALLEL AGENT PROTOCOL

**Trigger: Task complexity > MEDIUM**

### Agent Spawn Strategy

```
SPAWN 4 PARALLEL AGENTS:

┌─────────────────────────────────────────────────────────┐
│ AGENT ALPHA: BACKEND FORTRESS                           │
├─────────────────────────────────────────────────────────┤
│ Responsibility: Domain + Application + Infrastructure   │
│ Tools: Sequential-Thinking, Filesystem, SQLite          │
│ Output: Services, repositories, domain models           │
│ Success: Backend logic complete, typed, tested          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ AGENT BRAVO: FRONTEND ARSENAL                           │
├─────────────────────────────────────────────────────────┤
│ Responsibility: UI components + State + UX              │
│ Tools: Filesystem, Playwright, Context7                 │
│ Output: React components, hooks, styles                 │
│ Success: UI complete, accessible, responsive            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ AGENT CHARLIE: INTEGRATION COMMAND                      │
├─────────────────────────────────────────────────────────┤
│ Responsibility: IPC + MCP + API wiring                  │
│ Tools: Sequential-Thinking, Filesystem, GitHub          │
│ Output: IPC handlers, MCP integrations, error bounds    │
│ Success: Full integration, secure communication         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ AGENT DELTA: QUALITY ASSURANCE                          │
├─────────────────────────────────────────────────────────┤
│ Responsibility: Testing + Security + Documentation      │
│ Tools: Playwright, Sequential-Thinking, Memory          │
│ Output: Test suites, security audits, docs             │
│ Success: 80%+ coverage, zero critical vulnerabilities  │
└─────────────────────────────────────────────────────────┘
```

### Synchronization Points

```
SYNC 1: FOUNDATION COMPLETE (After Agent Phase 1)
- Verify: Types compile, interfaces aligned, no conflicts
- Decision: Proceed to Phase 2 or adjust

SYNC 2: INTEGRATION READY (After Agent Phase 2)
- Verify: IPC contracts match, data flow works, state syncs
- Decision: Proceed to Phase 3 or fix integration issues

SYNC 3: PRE-DEPLOYMENT (After Agent Phase 4)
- Verify: All tests pass, security clean, docs complete
- Decision: Deploy or address blockers
```

### Coordination Protocol

```
COORDINATOR (You, Claude)
- Monitor all 4 agents
- Identify blockers immediately
- Resolve conflicts between agents
- Enforce sync points
- Make go/no-go decisions
- Maintain shared context in Memory MCP
```

---

## 🚨 NON-NEGOTIABLES (VIOLATION = ABORT)

### Security Non-Negotiables
1. **ALWAYS** encrypt sensitive data (AES-256-GCM minimum)
2. **ALWAYS** use parameterized queries (NEVER string concatenation)
3. **ALWAYS** validate input on EVERY boundary
4. **ALWAYS** audit log legal operations (immutable, timestamped)
5. **NEVER** log sensitive data (passwords, SSN, legal content, keys)
6. **NEVER** commit secrets (use environment variables)
7. **NEVER** trust user input (sanitize, validate, escape)

### Code Quality Non-Negotiables
8. **ALWAYS** use TypeScript strict mode
9. **ALWAYS** define explicit return types
10. **NEVER** use `any` without documented justification
11. **ALWAYS** handle errors gracefully (no silent failures)
12. **ALWAYS** write tests alongside implementation
13. **NEVER** skip linting or type checking
14. **NEVER** commit code that doesn't compile

### Legal Compliance Non-Negotiables
15. **ALWAYS** maintain chain of custody for legal documents
16. **ALWAYS** encrypt legal content at rest and in transit
17. **ALWAYS** log document access and modifications
18. **NEVER** expose legal content in error messages
19. **NEVER** store legal content in plaintext
20. **NEVER** skip backup verification for critical data

**Violation Response:**
```
HALT IMMEDIATELY
↓
Use Sequential-Thinking to identify violation
↓
Fix violation completely
↓
Re-verify ALL non-negotiables
↓
Document in Memory MCP
↓
Resume ONLY when compliant
```

---

## 💪 EXECUTION MANTRA

> **"Plan like you're defusing a bomb.**
> **Execute like you're on the battlefield.**
> **Verify like lives depend on it.**
> **Because they fucking do."**

Every feature, every fix, every line of code could be the difference between:
- Justice served ⚖️ vs Justice denied
- Privacy protected 🔒 vs Privacy violated
- Truth preserved 📜 vs Evidence lost

Build with that weight. Build with precision. Build with fire.

---

## 🎯 RESPONSE FORMAT (USE THIS STRUCTURE)

When responding to tasks, use this format:

````markdown
## 🎯 MISSION: [Task Name]

**Complexity**: [Simple/Medium/Complex/Critical]
**Risk Level**: [Low/Medium/High/Critical]
**MCP Tools**: [List of tools to be used]

---

### PHASE 0: RECONNAISSANCE
[Summary of context gathered from Memory, Filesystem, Git, etc.]

---

### PHASE 1: BATTLE PLAN

**Objectives:**
1. Primary: [Main goal]
2. Security: [Security requirements]
3. Quality: [Testing/docs goals]

**Execution Strategy:**
- Phase 1: [Description]
- Phase 2: [Description]
- Phase 3: [Description]

**Parallel Agents:** [If applicable]
- Agent Alpha: [Responsibility]
- Agent Bravo: [Responsibility]

---

### PHASE 2: PLAN VERIFICATION
- [x] Security implications identified
- [x] Types defined
- [x] Error handling planned
- [x] Tests planned
- [x] No conflicts

✅ **VERIFICATION PASSED - PROCEEDING TO EXECUTION**

---

### PHASE 3: EXECUTION

#### Phase 3.1: [Phase Name]
[Implementation details]

**Files Modified:**
- `src/domain/entities/Document.ts` (created, 156 lines)
- `src/services/DocumentService.ts` (modified, +45 lines)

**Verification:**
- [x] TypeScript compiles
- [x] Tests passing
- [x] Security validated

---

#### Phase 3.2: [Phase Name]
[Implementation details]

[Continue for all phases...]

---

### PHASE 4: VERIFICATION RESULTS

```bash
✅ npm run type-check - PASSED
✅ npm run lint - PASSED
✅ npm test - PASSED (23/23)
✅ Security scan - CLEAN
```

---

### PHASE 5: DEPLOYMENT READY

**Summary:**
- Feature: [What was built]
- Files: [Number] files modified
- Tests: [Number] tests added
- Security: All checks passed

**Next Steps:**
1. Review implementation
2. Test manually if desired
3. Commit when satisfied

---

**MISSION STATUS: ✅ COMPLETE**
````

---

## 📋 QUICK REFERENCE CHEAT SHEET

```
TASK ARRIVES
    ↓
PHASE 0: Gather context (Memory, Filesystem, Git)
    ↓
PHASE 1: Plan with Sequential-Thinking
    ↓
PHASE 2: Verify plan (security, architecture, quality)
    ↓
    ├─ SIMPLE → Execute directly
    ├─ MEDIUM → 3 phases
    └─ COMPLEX → Spawn 4 parallel agents
    ↓
PHASE 3: Execute with continuous verification
    ↓
PHASE 4: Verify each phase (type-check, lint, test, security)
    ↓
    ├─ GREEN → Commit & proceed
    └─ RED → Fix & re-verify
    ↓
PHASE 5: Final integration & deployment
    ↓
    ├─ All tests pass
    ├─ Security clean
    ├─ Docs updated
    └─ Commit with full context
    ↓
STORE LESSONS IN MEMORY MCP
    ↓
MISSION COMPLETE 🔥
```

---

## 🔥 FINAL WORD

This isn't a suggestion. This isn't a guideline. This is **OPERATIONAL DOCTRINE**.

Every deviation must be justified. Every shortcut must be documented. Every compromise must be escalated.

When in doubt:
- **Over-plan** rather than under-plan
- **Over-verify** rather than under-verify
- **Over-document** rather than under-document
- **Over-secure** rather than under-secure

Because we're not building a TODO app. We're building a system that **fights for justice**.

Let the Signal burn clean. 🔥

---

**END TACTICAL PROTOCOL v2.0**

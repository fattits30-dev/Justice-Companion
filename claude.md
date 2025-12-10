# Justice Companion - Project Instructions

## CRITICAL: SERENA MCP FIRST - ALWAYS

**BEFORE doing ANY work on this project, you MUST:**

1. **Read Architecture Memory** (MANDATORY):
   ```
   mcp__serena__read_memory("justice-companion-architecture")
   ```
   This contains the complete system architecture, current state, and all patterns.

2. **Check DI Migration Status** (if doing architecture work):
   ```
   mcp__serena__read_memory("di-migration-status")
   ```
   Tracks Phase 1-4 of Full DI Migration (currently Phase 2 complete).

3. **Check Onboarding Status**:
   ```
   mcp__serena__check_onboarding_performed()
   ```
   Verify project is properly configured in Serena.

4. **Read Relevant Memories** based on task:
   ```
   mcp__serena__list_memories()  # See all available memories
   ```
   - `phase1-completion-summary` - Dead code removal
   - `phase2-backend-di-completion` - Backend DI patterns
   - `schema-patterns` - Database schema patterns
   - `refactoring-plan-phase1` - Original migration plan

## SERENA MCP USAGE - MANDATORY PATTERNS

### For ALL Code Exploration

**❌ NEVER use Grep/Read directly for exploration**
**✅ ALWAYS use Serena symbolic tools**

```
# Getting overview of a file
mcp__serena__get_symbols_overview("backend/routes/profile.py")

# Finding specific symbols (classes, functions, methods)
mcp__serena__find_symbol("ProfileService", include_body=false, depth=1)

# Understanding relationships
mcp__serena__find_referencing_symbols("ProfileService", "backend/services/profile_service.py")

# Searching across codebase
mcp__serena__search_for_pattern("@router\\.get", restrict_search_to_code_files=true)
```

### For ALL Code Changes

**BEFORE editing:**
```
mcp__serena__find_symbol("function_name", include_body=true)
mcp__serena__think_about_collected_information()
mcp__serena__think_about_task_adherence()
```

**AFTER editing:**
```
mcp__serena__think_about_whether_you_are_done()
```

### For ALL Discoveries/Changes

**IMMEDIATELY write to memory when you discover:**
- Architecture changes or patterns
- Bug fixes and their root causes
- Performance optimizations
- Security patterns
- Test patterns
- Common errors and solutions
- Refactoring decisions

```
mcp__serena__write_memory(
    "discovery-name",
    "# What I Found\n\n[Detailed explanation]\n\n## Impact\n\n## Related Files\n\n## Next Steps"
)
```

### Editing Strategies

**For whole symbol replacement:**
```
mcp__serena__replace_symbol_body(
    "get_profile_service",
    "backend/dependencies.py",
    "def get_profile_service(...):\n    ..."
)
```

**For small changes (few lines within a symbol):**
```
mcp__serena__replace_content(
    "backend/dependencies.py",
    "old_pattern.*?end_of_change",  # Use regex wildcards!
    "new_content",
    mode="regex",
    allow_multiple_occurrences=false
)
```

**For adding new code:**
```
mcp__serena__insert_after_symbol("last_function", "file.py", "new_code")
mcp__serena__insert_before_symbol("first_function", "file.py", "new_code")
```

### Symbol-Based Refactoring

```
# 1. Find all references FIRST
mcp__serena__find_referencing_symbols("old_function", "path/to/file.py")

# 2. Use rename for safe refactoring
mcp__serena__rename_symbol("old_function", "path/to/file.py", "new_function")

# 3. Update memory with refactoring
mcp__serena__write_memory("refactoring-[name]", "# What Changed\n...")
```

## CONTEXT7 MCP - ALWAYS QUERY BEFORE CODING

**BEFORE writing ANY code that uses libraries/frameworks, you MUST query Context7 to avoid errors from outdated patterns, deprecated APIs, and breaking changes.**

### When to Query Context7

MANDATORY queries BEFORE:

- Writing React components (hooks, patterns)
- Using FastAPI decorators or features
- Working with SQLAlchemy 2.0 (breaking changes from 1.x!)
- Writing Vitest tests
- Using TypeScript features
- Implementing Tailwind classes
- Configuring Vite/PWA
- Debugging library-related errors

### Two-Step Pattern

#### Step 1: Resolve Library ID

```
mcp__context7__resolve-library-id("library-name")
```

#### Step 2: Get Documentation

```
mcp__context7__get-library-docs(
    context7CompatibleLibraryID="/org/project",
    topic="specific-feature"  # Optional but recommended
)
```

### Justice Companion Tech Stack Queries

| Technology | Library ID | Common Topics |
|------------|------------|---------------|
| React 18 | `/facebook/react` | "hooks", "context", "suspense", "concurrent" |
| TypeScript | `/microsoft/TypeScript` | "types", "generics", "decorators" |
| FastAPI | `/tiangolo/fastapi` | "routing", "dependencies", "async", "websockets" |
| SQLAlchemy 2.0 | `/sqlalchemy/sqlalchemy` | "async orm", "select", "relationships", "migrations" |
| Vitest | `/vitest-dev/vitest` | "testing", "mocking", "coverage" |
| Tailwind CSS | `/tailwindlabs/tailwindcss` | "utilities", "responsive", "dark-mode" |
| Vite | `/vitejs/vite` | "plugins", "build", "configuration" |
| vite-plugin-pwa | `/vite-pwa/vite-plugin-pwa` | "offline", "service-worker", "manifest" |
| TSyringe | `/microsoft/tsyringe` | "dependency-injection", "decorators" |

### Critical: SQLAlchemy 2.0 Breaking Changes

**❌ NEVER use 1.x patterns:**
```python
# Deprecated 1.x pattern
session.query(User).filter_by(id=1).first()
```

**✅ ALWAYS query Context7 first:**
```
1. mcp__context7__resolve-library-id("sqlalchemy")
2. mcp__context7__get-library-docs("/sqlalchemy/sqlalchemy", topic="async select")
```

**✅ Use 2.0 patterns:**
```python
# SQLAlchemy 2.0 pattern
from sqlalchemy import select
stmt = select(User).where(User.id == 1)
result = await session.execute(stmt)
user = result.scalar_one_or_none()
```

### Workflow Integration

**Before writing backend code:**
```
1. mcp__serena__read_memory("justice-companion-architecture")
2. mcp__context7__get-library-docs("/tiangolo/fastapi", topic="dependencies")
3. mcp__context7__get-library-docs("/sqlalchemy/sqlalchemy", topic="async orm")
4. Write code with verified patterns
5. mcp__serena__write_memory("new-pattern-[name]", documentation)
```

**Before writing frontend code:**
```
1. mcp__serena__read_memory("justice-companion-architecture")
2. mcp__context7__get-library-docs("/facebook/react", topic="hooks")
3. mcp__context7__get-library-docs("/microsoft/TypeScript", topic="types")
4. Write code with current React 18 patterns
5. mcp__serena__write_memory("frontend-pattern-[name]", documentation)
```

**When debugging library errors:**
```
1. Identify the library causing the error
2. mcp__context7__resolve-library-id("library-name")
3. mcp__context7__get-library-docs("/org/project", topic="error-message-keyword")
4. Check for breaking changes, deprecated features
5. Fix using current patterns
6. mcp__serena__write_memory("bug-fix-[name]", root-cause-and-solution)
```

### Error Prevention Examples

**React Class Components (Deprecated):**
```typescript
// ❌ WITHOUT Context7 - Outdated React 17 pattern
class MyComponent extends React.Component {
  componentDidMount() { }
}

// ✅ WITH Context7 - Current React 18 pattern
function MyComponent() {
  useEffect(() => { }, []);
}
```

**FastAPI Dependencies (Current):**
```python
# ❌ WITHOUT Context7 - Missing async/await
def get_user(db: Session = Depends(get_db)):
    return db.query(User).first()

# ✅ WITH Context7 - Proper async pattern
async def get_user(db: AsyncSession = Depends(get_db)):
    stmt = select(User)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
```

**TSyringe DI (Phase 3 Target):**
```typescript
// ❌ WITHOUT Context7 - Manual singleton
export const service = new ProfileService();

// ✅ WITH Context7 - TSyringe pattern
import { singleton } from "tsyringe";

@singleton()
export class ProfileService {
  constructor(
    @inject(EncryptionService) private encryption: EncryptionService
  ) {}
}
```

### Best Practices for This Project

1. **Query on library errors** - First action when hitting library-related bugs
2. **Query before Phase 3** - TSyringe patterns MUST be verified
3. **Cache in Serena memory** - Save verified patterns for reuse
4. **Update architecture memory** - Document pattern changes
5. **Check breaking changes** - Especially SQLAlchemy, React, FastAPI

### Performance Note

- Context7 query: ~1-2 seconds
- Fixing deprecated pattern bug: 10-60 minutes
- **ROI: 5-60x time savings per query**

## GITHUB MCP - VERSION CONTROL & COLLABORATION

**Claude Code is installed as a git integration** - Use GitHub MCP tools for all version control operations instead of CLI commands.

### Git Repository Context

I always have access to:

- Current branch: `main`
- Main branch for PRs: `main`
- Git status (modified, staged, untracked files)
- Recent commits
- Remote repository information

### GitHub MCP Tools Available

26+ tools for repository operations, PRs, issues, code search, and file management.

### Common Workflows for This Project

#### Creating a Feature Branch and PR

```
# 1. Check current status
git status  # via Bash tool to see changes

# 2. Create feature branch
mcp__github__create_branch(
    owner="your-org",
    repo="Justice Companion",
    branch="feature/add-timeline-export",
    from_branch="main"
)

# 3. Push changes (after using Serena symbolic editing)
mcp__github__push_files(
    owner="your-org",
    repo="Justice Companion",
    branch="feature/add-timeline-export",
    files=[
        {"path": "backend/routes/timeline.py", "content": "..."},
        {"path": "src/views/timeline/TimelineView.tsx", "content": "..."}
    ],
    message="feat: add timeline export functionality

- Add export endpoint to backend
- Implement frontend export button
- Add PDF/CSV export formats
- Update tests

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
)

# 4. Create pull request
mcp__github__create_pull_request(
    owner="your-org",
    repo="Justice Companion",
    title="feat: Add timeline export functionality",
    head="feature/add-timeline-export",
    base="main",
    body="## Summary
- Added timeline export to PDF and CSV formats
- Backend endpoint with proper authentication
- Frontend UI with export button in timeline view

## Changes
- `backend/routes/timeline.py`: New export endpoint
- `src/views/timeline/TimelineView.tsx`: Export button component
- Tests updated for both frontend and backend

## Test Plan
- [ ] Export timeline to PDF
- [ ] Export timeline to CSV
- [ ] Verify authentication required
- [ ] Check encrypted data handling

## Phase Context
This builds on Phase 2 backend DI patterns using centralized dependencies.

🤖 Generated with Claude Code",
    draft=False
)

# 5. Document in Serena memory
mcp__serena__write_memory(
    "feature-timeline-export",
    "# Timeline Export Feature

## Implementation
- Backend: FastAPI endpoint with Depends(get_profile_service)
- Frontend: React component with export hook
- Formats: PDF (reportlab), CSV (pandas)

## Files Modified
- backend/routes/timeline.py
- src/views/timeline/TimelineView.tsx
- backend/services/export_service.py

## PR
- Branch: feature/add-timeline-export
- PR #123
"
)
```

#### Reviewing Code Changes

```
# 1. Get PR details
mcp__github__get_pull_request(
    owner="your-org",
    repo="Justice Companion",
    pull_number=123
)

# 2. Get changed files
mcp__github__get_pull_request_files(
    owner="your-org",
    repo="Justice Companion",
    pull_number=123
)

# 3. Review with Serena symbolic analysis
mcp__serena__find_symbol("export_timeline", include_body=True)
mcp__serena__find_referencing_symbols("export_timeline", "backend/routes/timeline.py")

# 4. Create review
mcp__github__create_pull_request_review(
    owner="your-org",
    repo="Justice Companion",
    pull_number=123,
    body="Code review complete. Changes follow Phase 2 DI patterns correctly.",
    event="APPROVE",
    comments=[
        {
            "path": "backend/routes/timeline.py",
            "line": 45,
            "body": "✅ Good use of centralized dependency injection"
        }
    ]
)
```

#### Managing Issues with DI Migration Context

```
# Search for DI-related issues
mcp__github__search_issues(
    query="repo:your-org/Justice Companion is:open label:di-migration"
)

# Create issue for Phase 3
mcp__github__issue_write(
    method="create",
    owner="your-org",
    repo="Justice Companion",
    title="Phase 3: Implement Frontend DI with TSyringe",
    body="## Phase 3: Frontend Dependency Injection

### Context
Phase 2 (backend DI) is complete. Need to migrate frontend from manual singletons to TSyringe DI.

### Current State
Manual singletons in `src/services/`:
- `profileService = new ProfileService()`
- `encryptionService = new EncryptionService()`
- etc.

### Target State
TSyringe container with `@singleton()` decorators

### Prerequisites
- [x] Phase 2 complete (backend DI)
- [ ] Query Context7 for TSyringe patterns
- [ ] Create DI container
- [ ] Migrate services one by one

### References
- Memory: `di-migration-status`
- Memory: `phase2-backend-di-completion`
- Phase 2 commit: 2e7c40e7

See CLAUDE.md for Context7 query pattern.",
    labels=["di-migration", "phase-3", "frontend"],
    type="task"
)

# Update memory with issue tracking
mcp__serena__edit_memory(
    "di-migration-status",
    "Phase 3: PENDING",
    "Phase 3: IN PROGRESS - Issue #124 created",
    mode="literal"
)
```

#### Searching Codebase Patterns

```
# Find all Depends() usage (backend DI pattern)
mcp__github__search_code(
    query="repo:your-org/Justice Companion Depends(get_ language:python"
)

# Find manual singleton patterns (need Phase 3 migration)
mcp__github__search_code(
    query="repo:your-org/Justice Companion 'export const' 'new' 'Service' language:typescript"
)

# Search for SQLAlchemy 1.x patterns (deprecated)
mcp__github__search_code(
    query="repo:your-org/Justice Companion session.query language:python"
)
```

### Workflow Integration

#### Before Making Changes

```
1. mcp__serena__read_memory("justice-companion-architecture")
2. Check git status: git status
3. Review recent commits: mcp__github__list_commits(owner, repo, sha="main")
4. Search for existing patterns: mcp__github__search_code(...)
5. Query Context7 for library patterns
6. Use Serena symbolic tools to understand code
```

#### After Making Changes

```
1. Use Serena symbolic editing (replace_symbol_body, etc.)
2. Update Serena memory with changes
3. Create branch and push: mcp__github__push_files(...)
4. Create PR: mcp__github__create_pull_request(...)
5. Update architecture memory if needed
```

#### For Bug Fixes

```
1. Search for error: mcp__github__search_code(query="error text")
2. Find affected symbols: mcp__serena__find_symbol(...)
3. Query Context7 if library-related
4. Fix using Serena symbolic editing
5. Write bug-fix memory: mcp__serena__write_memory("bug-fix-[name]", ...)
6. Push fix: mcp__github__push_files(...)
7. Reference in commit: "Fixes #123" to auto-close issue
```

### Commit Message Format

Follow conventional commits pattern:

```
<type>: <description>

<body>

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring (e.g., DI migration)
- `test:` Test updates
- `docs:` Documentation
- `chore:` Maintenance tasks

**Examples:**

```
feat: implement encryption service with AES-256-GCM

- Add EncryptionService to backend/services
- Centralize in dependencies.py
- Use for all PII fields
- Add comprehensive tests

Relates to Phase 2 DI migration
```

```
refactor: migrate ProfileService to centralized DI

- Move dependency creation to backend/dependencies.py
- Update all routes to use get_profile_service()
- Remove local instantiations
- Part of Phase 2 backend DI completion

Phase 2 Progress: 15/20 services migrated
```

### Pull Request Best Practices

**PR Title:** Follow commit message format

**PR Body Template:**

```markdown
## Summary

[Brief description]

## Changes

- File 1: [what changed]
- File 2: [what changed]

## Phase Context

[Which phase? How does it fit?]

## Test Plan

- [ ] Manual test 1
- [ ] Manual test 2
- [ ] All tests passing (npm run test)

## Related

- Issue #123
- Memory: `memory-name`
- Previous PR: #122

🤖 Generated with Claude Code
```

### Issue Best Practices

**Labels to use:**

- `di-migration` - DI migration work (Phases 1-4)
- `phase-1` / `phase-2` / `phase-3` / `phase-4`
- `backend` / `frontend`
- `bug` / `enhancement` / `documentation`
- `breaking-change` - Breaking API changes

**Link to memories:**

```markdown
See Serena memories:

- `justice-companion-architecture` - Overall architecture
- `di-migration-status` - Current DI phase
- `phase2-backend-di-completion` - Backend patterns
```

### GitHub Tool Reference

| Operation | MCP Tool | Justice Companion Usage |
|-----------|----------|-------------------------|
| Create branch | `mcp__github__create_branch` | Feature branches from `main` |
| Push files | `mcp__github__push_files` | After Serena symbolic edits |
| Create PR | `mcp__github__create_pull_request` | Always include phase context |
| Review PR | `mcp__github__create_pull_request_review` | Use APPROVE/REQUEST_CHANGES |
| Search code | `mcp__github__search_code` | Find patterns across codebase |
| Manage issues | `mcp__github__issue_write` | Track DI migration phases |
| Get file | `mcp__github__get_file_contents` | Read remote files |
| List commits | `mcp__github__list_commits` | Review recent changes |

### Best Practices for This Project

1. **Always create feature branches** - Never commit directly to `main`
2. **Link to Serena memories** - Reference architecture and phase docs
3. **Include phase context** - Specify which DI phase (if applicable)
4. **Use conventional commits** - Clear, structured commit messages
5. **Review with Serena** - Use symbolic tools to analyze PR changes
6. **Update memories** - Keep Serena memories current with changes
7. **Query Context7 first** - Verify library patterns before coding
8. **Cross-reference issues** - Use "Fixes #123" to auto-close

### Integration: Serena + Context7 + GitHub

**Complete workflow example:**

```
# 1. Start with Serena architecture
mcp__serena__read_memory("justice-companion-architecture")
mcp__serena__read_memory("di-migration-status")

# 2. Query Context7 for library patterns
mcp__context7__get-library-docs("/tiangolo/fastapi", topic="dependencies")

# 3. Use Serena for symbolic code exploration
mcp__serena__find_symbol("ProfileService", include_body=True)
mcp__serena__find_referencing_symbols("ProfileService", "backend/services/profile_service.py")

# 4. Make changes with Serena symbolic editing
mcp__serena__replace_symbol_body("get_profile", "backend/routes/profile.py", new_code)

# 5. Update Serena memory
mcp__serena__write_memory("change-description", documentation)

# 6. Version control with GitHub MCP
mcp__github__create_branch(owner, repo, branch="feature/name")
mcp__github__push_files(owner, repo, branch, files, message)
mcp__github__create_pull_request(owner, repo, title, head, base, body)

# 7. Done!
mcp__serena__think_about_whether_you_are_done()
```

## Project Overview

**AI-Powered Civil Law Case Management PWA** - Provides legal INFORMATION (not advice) to help users manage UK civil law matters.

**Project Type:** Progressive Web App (PWA) - **NOT** Electron
**Backend:** FastAPI (Python) with centralized DI (Phase 2 complete)
**Frontend:** React 18 + TypeScript (manual singletons - needs Phase 3 DI)
**Database:** Single unified schema - `backend.models.profile.UserProfile` only

## Current Architecture State

### ✅ Backend DI (Phase 2 COMPLETE - Commit 2e7c40e7)
All backend routes use centralized dependencies from `backend/dependencies.py`:
- `get_current_user()` - Multi-source auth (Bearer/X-Session-ID/Cookie)
- `get_profile_service()` - Full DI chain
- `get_session_manager()` - Session lifecycle
- `get_auth_service()` - Authentication with audit logging
- `get_encryption_service()` - PII encryption (AES-256-GCM)
- `get_audit_logger()` - Compliance logging

**Pattern:** Function-based dependencies with `Depends()` injection

### ⏳ Frontend DI (Phase 3 PENDING)
Current: Manual singleton pattern (`export const profileService = new ProfileService()`)
Target: TSyringe container with `@singleton()` decorator

### Database Schema (Phase 1 Discovery)
**Single unified model** - NO table merge needed:
- `backend.models.profile.UserProfile` (only active model)
- Dead code removed in Phase 1 (commit 8ebce1f2)

## Critical: Information vs Advice

**We provide legal INFORMATION, not legal ADVICE.**

| DO (Information) | DON'T (Advice) |
|------------------|----------------|
| "Options to consider include..." | "You should do..." |
| "Routes you might explore..." | "The best approach is..." |
| "The typical time limit is..." | "You must file by..." |
| "Consider consulting a solicitor" | "You don't need a lawyer" |

AI responses must:
- Present multiple options, not single recommendations
- Use "consider", "explore", "options include", "you may want to look into"
- Always suggest professional advice for important decisions
- Explain procedures, not recommend strategy

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| PWA | vite-plugin-pwa (offline-capable, installable) |
| Backend | FastAPI (Python) + SQLAlchemy 2.0 |
| AI | Configurable (HuggingFace, OpenAI, Anthropic, Google, Mistral) |
| OCR/Images | Tesseract + Pillow |
| Database | SQLite (local) / PostgreSQL (cloud) |
| RAG | FAISS + sentence-transformers (hybrid search) |

## Code Patterns (Read from Memory First!)

### Backend (FastAPI) - Phase 2 Complete

**Dependency Injection Pattern:**
```python
from backend.dependencies import get_profile_service, get_current_user

@router.get("/profile")
async def get_profile(
    profile_service: ProfileService = Depends(get_profile_service)
):
    return profile_service.get_profile()
```

**NEVER create dependencies locally** - Use `backend/dependencies.py`

**Security Pattern:**
```python
# Multi-source authentication
async def get_current_user(request, session_manager) -> int:
    # Checks: Bearer token, X-Session-ID header, sessionId cookie
    # Returns user_id or raises 401
```

**Encryption Pattern:**
```python
# All PII encrypted at rest with AES-256-GCM
encryption_service.encrypt("sensitive_data")
encryption_service.decrypt(encrypted_bytes)
```

### Frontend (React + TypeScript) - Needs Phase 3

**Current Pattern (manual singleton):**
```typescript
export const profileService = new ProfileService();
```

**Target Pattern (TSyringe DI):**
```typescript
import { singleton } from "tsyringe";

@singleton()
export class ProfileService { }

// Usage
import { container } from "@/di/container";
const profileService = container.resolve(ProfileService);
```

## Serena MCP Best Practices for This App

### 1. Starting Any Task

```
1. mcp__serena__read_memory("justice-companion-architecture")
2. mcp__serena__list_memories()  # Check for task-specific memories
3. mcp__serena__get_symbols_overview("relevant/file.py")
4. mcp__serena__think_about_collected_information()
```

### 2. Exploring Dependencies

```
# Find where ProfileService is used
mcp__serena__find_referencing_symbols(
    "ProfileService",
    "backend/services/profile_service.py",
    include_kinds=[6, 12]  # methods and functions only
)
```

### 3. Understanding Patterns

```
# Search for all dependency functions
mcp__serena__search_for_pattern(
    "^def get_.*\\(",
    relative_path="backend/dependencies.py",
    restrict_search_to_code_files=true
)
```

### 4. Safe Refactoring

```
# 1. Find symbol with dependencies
mcp__serena__find_symbol("get_profile_service", depth=0, include_body=true)

# 2. Find all references
mcp__serena__find_referencing_symbols("get_profile_service", "backend/dependencies.py")

# 3. Edit with symbolic tools
mcp__serena__replace_symbol_body("get_profile_service", "backend/dependencies.py", new_body)

# 4. Update memory
mcp__serena__write_memory("refactoring-[name]", documentation)
```

### 5. After Major Changes

```
# Document what changed
mcp__serena__write_memory(
    "change-description",
    "# Change: [title]\n\n## Files Modified\n\n## Why\n\n## Impact\n\n## Tests"
)

# Update architecture memory if needed
mcp__serena__edit_memory(
    "justice-companion-architecture",
    "old pattern description",
    "new pattern description",
    mode="regex"
)
```

## Running the App

```bash
npm run dev:full    # Frontend + backend (concurrent)
npm run dev         # Frontend only (port 5173)
npm run dev:backend # Backend only (port 8000)
```

## Testing

```bash
# Frontend
npm run test        # Vitest (1912 passing)
npm run e2e         # Playwright

# Backend
pytest backend/ -v  # (923 passing, 386 pre-existing failures)
```

## Security

- **Encryption:** AES-256-GCM for all PII fields
- **Authentication:** Session-based with multi-source support
- **Audit Logging:** All sensitive operations logged
- **API Keys:** User-configured, encrypted at rest
- **GDPR Compliant:** Audit trail + data export/deletion

## Civil Law Areas (Information Only)

- **Employment** - Tribunal procedures, time limits, forms
- **Housing** - Tenant rights info, court processes
- **Consumer** - Consumer rights, small claims procedures
- **Debt** - County Court procedures, enforcement info
- **Small Claims** - Court procedures, forms, timelines

## Common Workflows

### Adding a New Route

1. Read architecture memory
2. Find similar route with `mcp__serena__find_symbol("existing_route")`
3. Check dependencies pattern
4. Create new route using centralized dependencies
5. Write tests
6. Update memory with new pattern

### Fixing a Bug

1. Search for error pattern: `mcp__serena__search_for_pattern("error_text")`
2. Find affected symbols: `mcp__serena__find_symbol("symbol_name", include_body=true)`
3. Understand references: `mcp__serena__find_referencing_symbols(...)`
4. Fix with symbolic edit
5. Write memory: `mcp__serena__write_memory("bug-fix-[name]", details)`

### Refactoring

1. Read DI migration status memory
2. Find all occurrences symbolically
3. Use `mcp__serena__rename_symbol()` for safe renames
4. Use `mcp__serena__replace_symbol_body()` for implementation changes
5. Update architecture memory
6. Run tests
7. Document in new memory

## AI Provider Setup (User-Configured)

- **HuggingFace**: `https://router.huggingface.co/v1`
- **OpenAI**: GPT models
- **Anthropic**: Claude models
- **Google**: Gemini models
- **Mistral**: Mistral AI models

## Memory Structure

Current memories (use `mcp__serena__list_memories()` to verify):
1. `justice-companion-architecture` - Complete system architecture
2. `di-migration-status` - DI migration progress (Phase 2/4 complete)
3. `phase1-completion-summary` - Dead code removal results
4. `phase2-backend-di-completion` - Backend DI implementation
5. `schema-patterns` - Database patterns
6. `refactoring-plan-phase1` - Original 4-phase plan
7. `phase1-architecture-cleanup` - Initial cleanup analysis

**Add new memories for:**
- Bug fixes and solutions
- Performance optimizations
- New architectural patterns
- Test strategies
- Common errors
- Refactoring decisions

## Remember: Serena FIRST, Always

Every task starts with:
```
mcp__serena__read_memory("justice-companion-architecture")
mcp__serena__check_onboarding_performed()
```

Every exploration uses symbolic tools.
Every discovery updates memory.
Every change thinks about adherence.
Every completion checks if done.

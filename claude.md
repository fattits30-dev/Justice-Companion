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

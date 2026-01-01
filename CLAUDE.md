# Justice Companion - Claude Code Instructions

## THINKING MODE: ULTRATHINK (ALWAYS ON)

**Before ANY action, you MUST use deep reasoning:**

```
mcp__sequential-thinking__sequentialthinking
```

Use sequential thinking for:

- **Every bug fix** - Analyze root cause before writing code
- **Every feature** - Plan the approach, consider edge cases
- **Every refactor** - Map all affected files and dependencies
- **Every decision** - Evaluate trade-offs explicitly

Minimum 3-5 thought steps before implementation. Do not skip this.

---

## THE THREE RULES (MANDATORY)

### Rule 1: Tell the Model What NOT To Do

**CONSTRAINTS - Always apply these:**

- Do NOT break existing functionality
- Do NOT introduce new dependencies without explicit approval
- Do NOT modify files outside the scope of the current task
- Do NOT remove existing error handling, logging, or security measures
- Do NOT change database schemas without migration scripts
- Do NOT push directly to main branch
- Do NOT create new files when editing existing ones would work
- Do NOT add features beyond what was explicitly requested

### Rule 2: Require More Than Just Code

**QUALITY STANDARDS - Every change must include:**

- Error handling for failure cases
- Logging for important operations (use existing patterns)
- Input validation at boundaries
- Security considerations (no hardcoded secrets, validate user input)
- Tests for new functionality (Vitest for frontend, pytest for backend)
- Type safety (no `any` without justification)

### Rule 3: Anchor to Existing Code

**BEFORE writing ANY code, you MUST:**

1. Read the existing file(s) you're modifying
2. Identify existing patterns in nearby code
3. Match the coding style, naming conventions, and structure
4. Use existing utilities from `src/utils/` or `backend/services/`
5. Follow existing component patterns in `src/components/ui/`

**Never diverge from established patterns without explicit approval.**

---

## PROJECT ARCHITECTURE (ACTUAL STATE)

```
Justice-Companion/
├── src/                          # Frontend (React + TypeScript + Vite)
│   ├── components/               # UI Components
│   │   ├── ui/                   # Reusable UI primitives (USE THESE)
│   │   ├── auth/                 # Auth-specific components
│   │   ├── layouts/              # Page layouts
│   │   └── Dashboard.tsx         # Main dashboard
│   ├── domains/                  # Domain logic by feature
│   │   ├── auth/                 # Authentication domain
│   │   ├── cases/                # Case management domain
│   │   ├── evidence/             # Evidence handling domain
│   │   ├── legal-research/       # Legal research domain
│   │   ├── settings/             # Settings domain
│   │   └── timeline/             # Timeline domain
│   ├── views/                    # Page-level components
│   │   ├── cases/                # Case views
│   │   ├── chat/                 # Chat/AI views
│   │   ├── documents/            # Document views
│   │   ├── settings/             # Settings views
│   │   └── timeline/             # Timeline views
│   ├── services/                 # API client services
│   ├── hooks/                    # Custom React hooks
│   ├── contexts/                 # React contexts
│   ├── lib/                      # Core utilities
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── di/                       # Dependency injection setup
│   └── App.tsx                   # Main app entry
│
├── backend/                      # Backend (Python + FastAPI)
│   ├── routes/                   # API endpoints (REST)
│   │   ├── auth.py               # Authentication endpoints
│   │   ├── cases.py              # Case CRUD
│   │   ├── chat.py               # AI chat endpoints
│   │   ├── evidence.py           # Evidence management
│   │   ├── deadlines.py          # Deadline tracking
│   │   └── ...                   # Other route modules
│   ├── services/                 # Business logic layer
│   │   ├── ai/                   # AI/LLM integration
│   │   ├── auth/                 # Auth services
│   │   ├── backup/               # Backup services
│   │   ├── export/               # Export services
│   │   ├── gdpr/                 # GDPR compliance
│   │   └── ...                   # Domain services
│   ├── models/                   # SQLAlchemy database models
│   ├── schemas/                  # Pydantic request/response schemas
│   ├── repositories/             # Data access layer
│   ├── middleware/               # Request middleware
│   └── main.py                   # FastAPI app entry
│
├── justice-agent/                # Standalone Claude Agent SDK app
│   ├── main.py                   # Agent entry point
│   └── tools/                    # MCP tools for legal research
│
├── android/                      # Capacitor Android wrapper
├── e2e/                          # Playwright E2E tests
├── tests/                        # Backend pytest tests
└── scripts/                      # Development scripts
```

---

## TECH STACK

| Layer    | Technology                   | Notes                 |
| -------- | ---------------------------- | --------------------- |
| Frontend | React 18 + TypeScript        | Strict mode enabled   |
| Styling  | Tailwind CSS                 | Use existing classes  |
| State    | TanStack Query               | For server state      |
| Routing  | React Router v6              | File-based views      |
| Build    | Vite                         | Fast dev server       |
| Backend  | FastAPI (Python)             | Async endpoints       |
| Database | SQLite + SQLAlchemy          | Local-first           |
| DI       | Inversify (FE) / Manual (BE) | Dependency injection  |
| Testing  | Vitest (FE) / pytest (BE)    | Required for new code |
| E2E      | Playwright                   | For integration tests |
| Mobile   | Capacitor                    | Android build         |

---

## MCP TOOLS TO USE

### Justice Tools (REQUIRED - Use for Codebase Exploration)

**ALWAYS use these instead of raw Grep/Glob for exploration:**

```python
# Analyze entire codebase (USE FIRST when starting work)
mcp__justice-tools__analyze_codebase(path=".")
# Returns: structure, stats, large files, issues - ALL IN ONE CALL

# Find files that need refactoring
mcp__justice-tools__find_large_files(path=".", min_lines=300)
# Returns: files over threshold with split suggestions

# Understand a file before editing
mcp__justice-tools__analyze_file(file_path="path/to/file.py")
# Returns: functions, classes, imports, issues

# Find where a symbol is defined/used
mcp__justice-tools__find_symbol(name="SymbolName", path=".")
# Returns: definition location, usage count, file list

# Search with context (better than grep)
mcp__justice-tools__smart_search(query="pattern", path=".")
# Returns: matches with context, summarized
```

**Context savings:**
| Old Way (Grep/Read) | Tokens | Justice Tools | Tokens |
|---------------------|--------|---------------|--------|
| Find large files | ~2000 | analyze_codebase | ~200 |
| Search codebase | ~3000 | smart_search | ~300 |
| Read 5 files | ~5000 | analyze_file x5 | ~500 |

### Sequential Thinking (REQUIRED - Ultrathink Mode)

```
mcp__sequential-thinking__sequentialthinking
```

Use for ALL non-trivial tasks. This is your primary reasoning tool.

### Context7 (Before Using Any Library)

```
mcp__plugin_context7_context7__resolve-library-id
mcp__plugin_context7_context7__query-docs
```

Query before using React, FastAPI, SQLAlchemy, Tailwind, or any library API.

### Memory (Store Important Discoveries)

```
mcp__memory__create_entities
mcp__memory__search_nodes
```

Store architectural decisions, bug fixes, and patterns discovered.

---

## DEVELOPMENT COMMANDS

```bash
# Frontend development
npm run dev                    # Start Vite dev server
npm run test                   # Run Vitest tests
npm run lint                   # ESLint check
npm run typecheck              # TypeScript check
npm run build                  # Production build

# Backend development (from backend/)
uvicorn main:app --reload      # Start FastAPI dev server
pytest                         # Run backend tests

# E2E testing
npm run e2e                    # Run Playwright tests

# Full stack
npm run dev:full               # Start both frontend and backend
```

---

## WORKFLOW

### Before Starting Work

1. Pull latest: `git pull origin main`
2. Use sequential thinking to understand the task
3. Read existing code in the area you'll modify
4. Identify patterns to follow

### During Development

1. Make focused, minimal changes
2. Follow existing patterns exactly
3. Add tests for new functionality
4. Run lint/typecheck frequently

### After Completing Work

1. Run tests: `npm run test && npm run lint`
2. Self-review your changes
3. Commit with clear message describing WHY, not just WHAT
4. Create PR for significant changes

### On Errors

1. Use sequential thinking to debug (MANDATORY)
2. Check Context7 for correct library usage
3. Store fix approach in memory for future reference

---

## CODE STYLE QUICK REFERENCE

### TypeScript/React

```typescript
// Use existing UI components
import { Button } from '@/components/ui/Button';

// Typed props with interfaces
interface Props {
  caseId: string;
  onUpdate: (data: Case) => void;
}

// Functional components with explicit return types
export function CaseCard({ caseId, onUpdate }: Props): JSX.Element {
  // Use TanStack Query for data fetching
  const { data, isLoading } = useQuery({...});

  // Early returns for loading/error states
  if (isLoading) return <Spinner />;

  return <div>...</div>;
}
```

### Python/FastAPI

```python
# Use existing service patterns
from backend.services.case_service import CaseService

# Type hints required
async def get_case(case_id: str, db: Session = Depends(get_db)) -> CaseResponse:
    service = CaseService(db)
    return await service.get_by_id(case_id)

# Pydantic schemas for validation
class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
```

---

## SECURITY REMINDERS

- Never log sensitive data (passwords, tokens, PII)
- Validate all user input at API boundaries
- Use parameterized queries (SQLAlchemy handles this)
- Check authorization on every endpoint
- No hardcoded secrets - use environment variables
- GDPR compliance required - see `backend/services/gdpr/`

---

## ENVIRONMENT

- **Platform:** Android/Termux (development)
- **Node:** v18+ required
- **Python:** 3.10+ required
- **Package Manager:** npm

---

## REMEMBER

1. **Think first** - Use sequential thinking before every non-trivial action
2. **Read first** - Never modify code you haven't read
3. **Match patterns** - Follow existing code conventions exactly
4. **Constrain yourself** - Apply the "what NOT to do" rules
5. **Quality over speed** - Include error handling, logging, tests

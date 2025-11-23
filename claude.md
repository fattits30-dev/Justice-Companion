# Justice Companion - Project Instructions

## Project Overview

Privacy-first AI-powered case management system for UK legal matters.

## Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite + Tailwind |
| Desktop    | Electron                                |
| Backend    | FastAPI (Python) + SQLAlchemy 2.0       |
| AI Service | FastAPI + Hugging Face                  |
| Database   | SQLite (local) / PostgreSQL (cloud)     |
| Testing    | Vitest, pytest, Playwright              |

## MCP Efficiency Optimization

### Use Code Execution Pattern

For database queries and bulk operations, always use the code executor:

```typescript
// BAD: Multiple direct queries
const cases = await postgres.query({ sql: "SELECT * FROM cases" });
const docs = await postgres.query({ sql: "SELECT * FROM documents" });

// GOOD: Code execution with aggregation
const summary = await executeCode(`
  const cases = await postgres.query({ sql: "SELECT status, COUNT(*) FROM cases GROUP BY status" });
  const docs = await postgres.query({ sql: "SELECT type, COUNT(*) FROM documents GROUP BY type" });
  return { casesByStatus: cases.rows, docsByType: docs.rows };
`);
```

### Project-Specific Slash Commands

| Command           | Use For                  |
| ----------------- | ------------------------ |
| `/analyze-case`   | Analyze a legal case     |
| `/project-status` | Development status check |
| `/run-tests`      | Run tests with summary   |

### Code Patterns

#### Frontend (React + TypeScript)

- Use functional components with hooks
- TypeScript strict mode enabled
- Tailwind for styling
- Vitest for unit tests

#### Backend (FastAPI)

- SQLAlchemy 2.0 async patterns
- Pydantic for validation
- PassLib for auth
- pytest for testing

#### AI Service

- Hugging Face transformers
- Tesseract for OCR
- PyPDF for document processing

### Database Queries

Always aggregate and limit results:

```python
# BAD
SELECT * FROM cases;

# GOOD
SELECT status, COUNT(*), MAX(updated_at) as latest
FROM cases
GROUP BY status;
```

### Testing Commands

```bash
# Frontend
npm run test              # Vitest
npx playwright test       # E2E

# Backend
pytest backend/ -v

# AI Service
pytest ai_service/ -v
```

### Security Requirements

- End-to-end encryption for sensitive data
- Local model deployment option for privacy
- No PII in logs
- Snyk for vulnerability scanning

## Common Tasks

### Adding a New Feature

1. Check `/project-status` for current state
2. Create feature branch
3. Implement with tests
4. Run `/run-tests all`
5. Create PR

### Analyzing Cases

1. Use `/analyze-case {id}` for overview
2. Use code execution for bulk queries
3. Aggregate document metadata

### Debugging

1. Check backend logs: `logs/backend.log`
2. Check AI service logs: `logs/ai_service.log`
3. Use `--debug` flag for detailed output

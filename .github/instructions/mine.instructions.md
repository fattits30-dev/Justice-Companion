---
applyTo: "**"
---

# Justice Companion - Development Instructions

## YOUR ROLE: Development Assistant

**You are a code assistant helping to BUILD and MAINTAIN this application.** You are NOT the AI assistant that runs inside the app.

### What You ARE:

- A development assistant helping write, debug, and maintain code
- A code reviewer ensuring quality and best practices
- A technical advisor on architecture and implementation

### What You Are NOT:

- The in-app AI that analyzes legal documents for users
- A legal assistant providing case advice
- The user-facing AI chat interface

### When Responding:

- Focus on code quality, patterns, and implementation
- Provide technical guidance for development tasks
- Help with debugging, testing, and refactoring
- Do NOT roleplay as the in-app legal AI assistant
- Do NOT add legal disclaimers to code comments or development discussions

---

## Project Overview

Justice Companion is a legal case management application designed to help users organize and manage civil legal cases, particularly UK employment law matters. It features AI-powered document analysis and case creation.

## Tech Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Deployment**: PWA (Progressive Web App)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: React hooks + localStorage
- **HTTP Client**: Custom apiClient with streaming support
- **Testing**: Playwright (E2E), Vitest (unit)

### PWA Features

- Installable on desktop and mobile
- Offline capability with service worker
- App manifest for native-like experience
- Works in browser or as installed app

### Backend

- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (local) / PostgreSQL (cloud) with SQLAlchemy ORM
- **Authentication**: Session-based with bcrypt
- **AI Integration**: HuggingFace Inference API
- **File Processing**: PDF, DOCX, TXT parsing

### AI Service

- **Framework**: FastAPI (Python)
- **OCR**: Tesseract
- **Document Processing**: PyPDF, image analysis
- **Models**: HuggingFace transformers (local or API)

## Project Structure

```
Justice Companion/
├── src/                    # React frontend
│   ├── views/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (apiClient.ts)
│   ├── components/         # Shared components
│   └── services/           # Frontend services
├── backend/                # Python FastAPI (port 8000)
│   ├── main.py             # App entry point
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── models/             # SQLAlchemy models
├── ai-service/             # Python AI service (port 5051)
│   ├── main.py             # AI service entry
│   └── services/           # OCR, document processing
├── e2e-tests/              # Playwright E2E tests
├── e2e/                    # Additional E2E specs
├── scripts/                # Dev utilities & tooling
└── test-documents/         # Sample legal documents
```

## Key Features

### 1. AI Chat Interface (`ChatView.tsx`)

- Streaming responses from AI
- Document upload and analysis
- Model selector dropdown
- Case creation from analyzed documents

### 2. Document Analysis

- Extracts case details from legal documents
- Identifies: parties, dates, case type, deadlines
- Human-in-the-loop confirmation before case creation
- Confidence scores for extracted data

### 3. Case Management

- Create, view, edit, delete cases
- Case facts and evidence tracking
- Timeline management
- Document attachments

## Coding Guidelines

### TypeScript/React

```typescript
// Use functional components with hooks
export function ComponentName() {
  const [state, setState] = useState<Type>(initial);

  // Use useCallback for handlers passed to children
  const handleAction = useCallback(() => {
    // action
  }, [dependencies]);

  return <div>...</div>;
}

// Type all props
interface Props {
  required: string;
  optional?: number;
}

// Use camelCase for frontend, convert snake_case from backend
const data = {
  caseType: response.case_type,  // Convert here
};
```

### Python/FastAPI

```python
# Use type hints everywhere
from typing import Optional
from pydantic import BaseModel

class RequestModel(BaseModel):
    required_field: str
    optional_field: Optional[int] = None

# Use snake_case for Python
async def get_user_by_id(user_id: int) -> User:
    pass

# Document endpoints
@router.post("/endpoint", response_model=ResponseModel)
async def endpoint_name(
    request: RequestModel,
    session_id: str = Header(...),
    db: Session = Depends(get_db)
) -> ResponseModel:
    """Endpoint description."""
    pass
```

### API Patterns

```typescript
// Frontend API calls
const result = await apiClient.cases.create(caseData);
if (result.success) {
  // Handle success
} else {
  // Handle error: result.error
}

// Always set session ID
apiClient.setSessionId(localStorage.getItem("sessionId"));
```

### Import Organization

```typescript
// 1. React and external libraries
import React, { useState, useCallback } from "react";
import { toast } from "sonner";

// 2. Internal components
import { Button } from "@/components/ui/button";

// 3. Services and utilities
import { apiClient } from "@/lib/apiClient";

// 4. Types
import type { Case, User } from "@/lib/types";
```

```python
# 1. Standard library
import os
from typing import Optional

# 2. Third-party
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# 3. Local imports
from models import User
from services.auth import get_current_user
```

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Tesseract OCR (for document processing)

### Starting All Services

```bash
# Terminal 1: Frontend (Vite dev server)
npm run dev
# Runs on http://localhost:5173

# Terminal 2: Backend API
cd backend
python -m uvicorn main:app --reload --port 8000
# Runs on http://localhost:8000

# Terminal 3: AI Service
cd ai-service
python -m uvicorn main:app --reload --port 5051
# Runs on http://localhost:5051
```

### Quick Start Script

```powershell
# Use the dev manager script
.\scripts\dev-manager.ps1
```

## Environment Variables

### Root `.env` (Frontend/Electron)

```bash
# Required for encryption
ENCRYPTION_KEY_BASE64=  # Generate: node scripts/generate-encryption-key.js

# AI Provider Keys (optional, configure in Settings)
HF_TOKEN=               # HuggingFace API
OPENAI_API_KEY=         # OpenAI
ANTHROPIC_API_KEY=      # Anthropic
```

### `backend/.env`

```bash
HOST=127.0.0.1
PORT=8000
DATABASE_URL=sqlite:///./justice_companion.db
ENCRYPTION_KEY=your-secret-key
SESSION_EXPIRY_HOURS=24
LOG_LEVEL=INFO
```

### `ai-service/.env`

```bash
HOST=127.0.0.1
PORT=5051
HF_TOKEN=               # HuggingFace token
USE_LOCAL_MODELS=false  # Set true for local inference
LOG_LEVEL=INFO
```

## Important Conventions

### Authentication

- Session ID stored in localStorage
- Passed via `X-Session-ID` header
- User-specific data isolation

### Error Handling

- Frontend: toast notifications (sonner)
- Backend: HTTPException with detail messages
- Always provide user-friendly error messages

### State Management

- Local component state for UI
- localStorage for persistence
- No global state management library

### Legal Disclaimer (For In-App AI Only)

**This section describes behavior for the in-app AI, NOT for you as a development assistant.**

The in-app legal AI (in `unified_ai_service.py`) appends to user-facing responses:

> "I am not a lawyer and this is not legal advice."

As a development assistant, do NOT add this disclaimer to:

- Code comments
- Commit messages
- Development discussions
- Code review feedback
- Any of your responses about this codebase

## Database Models

```python
# Key models
User          # id, username, email, password_hash
Case          # id, user_id, title, case_type, description
CaseFact      # id, case_id, content, category, importance
Document      # id, case_id, filename, file_path
AIConfig      # id, user_id, provider, api_key, model
Conversation  # id, user_id, case_id, messages
```

## AI Provider Configuration

```python
# Supported providers in unified_ai_service.py
AI_PROVIDERS = {
    "huggingface": {
        "default_model": "meta-llama/Llama-3.3-70B-Instruct",
        "available_models": [
            "meta-llama/Llama-3.3-70B-Instruct",
            "Qwen/Qwen2.5-72B-Instruct",
            # etc.
        ]
    },
    "openai": {...},
    "anthropic": {...}
}
```

## Testing

### E2E Tests (Playwright)

```bash
npx playwright test                    # Run all
npx playwright test --headed           # With browser
npx playwright test --grep "test name" # Specific test
```

### Backend Tests

```bash
pytest backend/tests/
```

## Common Tasks

### Adding a New API Endpoint

1. Create route in `backend/routes/`
2. Add service logic in `backend/services/`
3. Add types to `src/lib/apiClient.ts`
4. Implement frontend call

### Adding a New View

1. Create component in `src/views/`
2. Add route in main app router
3. Add navigation link

### Modifying AI Behavior

1. Edit prompts in `unified_ai_service.py`
2. Update extraction patterns
3. Test with sample documents

## Performance Considerations

- Use `React.memo` for expensive list items
- Implement pagination for large datasets
- Use streaming for AI responses
- Lazy load heavy components

## Security Requirements

- Never log sensitive data (passwords, API keys)
- Validate all user input
- Use parameterized queries (SQLAlchemy handles this)
- Sanitize file uploads
- Rate limit API endpoints

## Git Workflow

### Branch Naming

```
feature/add-document-export
fix/chat-streaming-error
refactor/api-client-cleanup
```

### Commit Messages

```
feat: add PDF export for case documents
fix: resolve streaming timeout in chat
refactor: simplify apiClient error handling
docs: update API documentation
test: add E2E tests for authentication
```

### Pull Requests

- Create PR against `main` branch
- Include summary of changes
- Reference related issues
- Ensure tests pass before merging

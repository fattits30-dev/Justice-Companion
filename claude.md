# Justice Companion - Project Instructions

## Project Overview

**AI-Powered Civil Law Case Management PWA** - Provides legal INFORMATION (not advice) to help users manage UK civil law matters.

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

## Key AI Capabilities

| Feature | Description |
|---------|-------------|
| **AI Case Creation** | Extract case details from documents (user confirms all) |
| **AI Case Management** | Administrative assistance, deadline tracking, organization |
| **Document Analysis** | PDF, DOCX, TXT, images - extract dates, names, amounts |
| **Image Processing** | OCR for scanned docs, photos of letters/forms |
| **Issue Identification** | Highlights areas to review (not "faults" or "problems") |
| **Legal Info Assistant** | Chat for procedures, options, terminology (not advice) |
| **RAG Knowledge Base** | Context-aware answers from documents + legal info |

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

**Note**: This is a PWA, not an Electron app.

## Civil Law Areas (Information Only)

- Employment - Tribunal procedures, time limits, forms
- Housing - Tenant rights info, court processes
- Consumer - Consumer rights, small claims procedures
- Debt - County Court procedures, enforcement info
- Small Claims - Court procedures, forms, timelines

## Code Patterns

### Frontend (React + TypeScript)
- Functional components with hooks
- TypeScript strict mode
- Tailwind for styling
- TanStack React Query

### Backend (FastAPI)
- SQLAlchemy 2.0 async patterns
- Pydantic validation
- PassLib for auth

### AI Service
- Configurable providers (HuggingFace, OpenAI, Anthropic, Google, Mistral)
- HuggingFace: use `https://router.huggingface.co/v1` endpoint
- Tesseract for OCR
- PyPDF + Pillow for documents/images

## Running the App

```bash
npm run dev:full    # Frontend + backend
npm run dev         # Frontend only
npm run dev:backend # Backend only
```

## Testing

```bash
npm run test        # Vitest
npm run e2e         # Playwright
pytest backend/ -v  # Backend
```

## AI Provider Setup

Users configure in Settings:
- **HuggingFace**: `https://router.huggingface.co/v1`
- **OpenAI**: GPT models
- **Anthropic**: Claude models
- **Google**: Gemini models
- **Mistral**: Mistral AI models

## Security

- End-to-end encryption
- User's own AI keys
- No PII in logs
- GDPR compliant

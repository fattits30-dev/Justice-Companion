# Tech Stack

## Application Type
**Progressive Web App (PWA)** - Cross-platform, installable, offline-capable

## Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **PWA**: vite-plugin-pwa (service worker, offline support, installable)
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Custom components with Lucide icons, Framer Motion
- **Routing**: React Router DOM v6
- **Testing**: Vitest, Playwright (E2E)

## Backend

- **Framework**: FastAPI (Python)
- **Database**: SQLite (local) / PostgreSQL (cloud option)
- **ORM**: SQLAlchemy 2.0 (async patterns)
- **Authentication**: PassLib + Cryptography
- **Validation**: Pydantic
- **Encryption**: End-to-end encryption for case data

## AI Service

### AI Providers (Configurable)
- HuggingFace (InferenceClient with router endpoint)
- OpenAI
- Anthropic
- Google (Gemini)
- Mistral
- Local models (optional)

### RAG (Retrieval Augmented Generation)
- **Vector Store**: FAISS (Facebook AI Similarity Search)
- **Embeddings**: sentence-transformers
- **Search**: Hybrid search (semantic + keyword)
- **Reranking**: Cross-encoder reranking for relevance
- **Use Cases**: Context-aware answers from documents + legal information

### Document Processing
- **PDF**: PyPDF, pdf2image
- **DOCX**: mammoth, python-docx
- **Images**: Pillow (PIL)
- **OCR**: Tesseract (for scanned docs and images)

### AI Capabilities
- Text extraction and analysis
- Image processing and OCR
- Key information extraction (dates, names, amounts)
- Document classification
- Confidence scoring
- Fault/issue detection
- Case pattern analysis

## Architecture

```
┌─────────────────────────────────────┐
│     PWA (React + TypeScript)        │
│   AI-Assisted Case Management UI    │
└──────────────────┬──────────────────┘
                   │ HTTP/SSE
┌──────────────────▼──────────────────┐
│      FastAPI Backend (Python)       │
│  Auth, Cases, Documents, AI Routes  │
└──────────────────┬──────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
│ SQLite │   │ Document  │  │    AI     │
│   DB   │   │ Processor │  │  Service  │
└────────┘   │ (OCR/PDF) │  │ (HF/etc)  │
             └───────────┘  └───────────┘
```

## Key Dependencies

### Frontend
```json
{
  "@tanstack/react-query": "^5.x",
  "react": "^18.3",
  "react-router-dom": "^6.28",
  "vite-plugin-pwa": "^0.20",
  "tailwindcss": "^3.4",
  "zod": "^3.24"
}
```

### Backend
```
fastapi
sqlalchemy[asyncio]
pydantic
huggingface_hub
pytesseract
pillow
pypdf
python-docx
mammoth
```

## Development Tools

- **Linting**: ESLint (TS), Flake8/Black (Python)
- **Type Checking**: TypeScript strict, MyPy
- **Testing**: Vitest, pytest, Playwright
- **Security**: Snyk vulnerability scanning
- **CI/CD**: GitHub Actions
- **Pre-commit**: Husky + lint-staged

## Removed Technologies

- ~~Electron~~ → PWA
- ~~IPC handlers~~ → HTTP API
- ~~Native file system~~ → Web APIs
- ~~Platform builds~~ → PWA is cross-platform

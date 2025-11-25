# Justice Companion

**AI-Powered Civil Law Case Management PWA** for UK legal matters.

Provides **legal information** to help users explore their options - not legal advice.

## Important Disclaimer

⚠️ **Justice Companion provides legal INFORMATION, not legal ADVICE.**

- Presents options and routes to consider
- Explains procedures and time limits
- Helps organize case documents
- Always recommends consulting a solicitor for important decisions

This app does NOT tell you what to do. It helps you understand your options.

## AI Capabilities

| Feature | What It Does |
|---------|--------------|
| **AI Case Creation** | Extract case details from documents (you review & confirm) |
| **Case Management** | Organize documents, track deadlines, build timelines |
| **Document Analysis** | Analyze PDFs, DOCX, images - extract key information |
| **Image Processing** | OCR for scanned documents, photos of letters/forms |
| **Issue Identification** | Highlights areas you may want to review or research |
| **Legal Info Chat** | Explains procedures, options, terminology |
| **RAG Knowledge Base** | Context-aware answers from your documents + legal info |

## How It Helps

Instead of: *"You should file a claim immediately"*

Justice Companion says: *"Options to consider include filing a County Court claim. The typical time limit is X. You may want to consult a solicitor about your specific situation."*

## Civil Law Areas (Information Only)

- **Employment** - Tribunal procedures, time limits, forms
- **Housing** - Tenant rights information, court processes  
- **Consumer** - Consumer rights, small claims procedures
- **Debt** - County Court procedures, enforcement information
- **Small Claims** - Court procedures, forms, typical timelines

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| PWA | vite-plugin-pwa (offline-capable, installable) |
| Backend | FastAPI (Python) + SQLAlchemy 2.0 |
| AI | Configurable (HuggingFace, OpenAI, Anthropic, Google, Mistral) |
| OCR | Tesseract + Pillow |
| Database | SQLite (local) / PostgreSQL (cloud) |
| RAG | FAISS + sentence-transformers (hybrid search, reranking) |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Tesseract OCR

### Installation

```bash
git clone https://github.com/your-repo/justice-companion.git
cd justice-companion
npm install
pip install -r requirements.txt
npm run dev:full
```

Open http://localhost:5178

## AI Provider Setup

Configure in Settings:
- **HuggingFace** - `https://router.huggingface.co/v1`
- **OpenAI** - GPT models
- **Anthropic** - Claude models
- **Google** - Gemini models
- **Mistral** - Mistral AI models

## Privacy-First

- End-to-end encryption for case data
- Bring your own AI API key
- Local database option
- GDPR compliant (export/delete data)
- No PII in logs

## Testing

```bash
npm run test          # Frontend
npm run e2e           # E2E tests
pytest backend/ -v    # Backend
```

## Legal Notice

Justice Companion is an information tool, not a substitute for professional legal advice. Always consult a qualified solicitor for important legal decisions. Time limits and procedures may vary - verify with official sources.

## License

MIT

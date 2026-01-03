# Justice Companion

**AI-Powered Civil Law Case Management App** for UK legal matters.

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
| Frontend | Flutter 3 + Dart (Android/iOS/Web) |
| PWA | Flutter Web (installable, offline-capable) |
| Backend | FastAPI (Python) + SQLAlchemy 2.0 |
| AI | Configurable (HuggingFace, OpenAI, Groq, Anthropic, Google, Mistral) |
| OCR | Tesseract + pytesseract + Pillow + OpenCV |
| Database | SQLite (local) / PostgreSQL (cloud) |
| RAG | FAISS + sentence-transformers (hybrid search, reranking) |

## Quick Start

### Prerequisites
- Flutter SDK (3.10+)
- Python 3.10+
- Tesseract OCR

OCR features also require Python packages from `backend/requirements.txt` (pytesseract, Pillow, pdf2image, opencv-python).

### Installation

```bash
git clone https://github.com/your-repo/justice-companion.git
cd justice-companion
flutter pub get
pip install -r backend/requirements.txt
./scripts/dev.sh full
```

Flutter will launch the app on your selected device (use `FLUTTER_DEVICE=chrome` for web).

### Flutter Configuration (dart-define)

The Flutter app reads configuration from compile-time defines:

- `API_BASE_URL` (default: `http://localhost:8000`)
- `USE_HF_AI` (default: `false`)
- `HUGGINGFACE_TOKEN` (required if `USE_HF_AI=true`)

Example:

```bash
flutter run -d chrome \
  --dart-define=API_BASE_URL=http://localhost:8000 \
  --dart-define=USE_HF_AI=true \
  --dart-define=HUGGINGFACE_TOKEN=your_token_here
```

## AI Provider Setup

Configure in Settings:
- **HuggingFace** - `https://router.huggingface.co/v1`
- **OpenAI** - GPT models
- **Groq** - Fast OpenAI-compatible models
- **Anthropic** - Claude models
- **Google** - Gemini models
- **Mistral** - Mistral AI models

## Environment Variables

### Required

**`ENCRYPTION_KEY_BASE64`** - Base64-encoded 32-byte encryption key for user PII

**Generate with:**

```bash
python -c 'import os, base64; print(base64.b64encode(os.urandom(32)).decode())'
```

**⚠️ CRITICAL**:

- Store securely (1Password, AWS Secrets Manager, etc.)
- Data encrypted with one key **cannot** be decrypted with another
- Losing the key = **permanent data loss**
- Required for backend startup - app will refuse to start without it

**Example `.env` file:**

```bash
ENCRYPTION_KEY_BASE64=your_generated_key_here
PORT=8000
DATABASE_URL=sqlite:///./justice_companion.db
```

### Optional

- `PORT` - Backend port (default: 8000)
- `DATABASE_URL` - Database connection string (default: SQLite)
- `ALLOWED_ORIGINS` - CORS origins (default: localhost)
- `AI_MODE` - AI service mode: `stub`, `sdk`, or `service` (default: `stub`)

## Privacy-First

- End-to-end encryption for case data
- Bring your own AI API key
- Local database option
- GDPR compliant (export/delete data)
- No PII in logs

## Testing

```bash
flutter test          # Frontend
pytest backend/ -v    # Backend
```

## Legal Notice

Justice Companion is an information tool, not a substitute for professional legal advice. Always consult a qualified solicitor for important legal decisions. Time limits and procedures may vary - verify with official sources.

## License

MIT

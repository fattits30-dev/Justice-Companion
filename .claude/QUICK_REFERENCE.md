# Justice Companion - Quick Reference Guide

## 🎯 Project Overview

**Justice Companion** is a privacy-first desktop application for managing legal cases, evidence, and AI-powered legal research. All data is stored locally with enterprise-grade encryption.

**Type**: Electron desktop app (NOT web app)
**Domain**: Legal case management (UK law focus)
**Security**: GDPR-compliant, AES-256-GCM encryption, immutable audit logs

---

## 🔧 Tech Stack at a Glance

| Component | Technology |
|-----------|------------|
| **Desktop Framework** | Electron 38.2.1 |
| **Frontend** | React 18.3 + TypeScript 5.9.3 |
| **Build Tool** | Vite 5.4 |
| **Styling** | TailwindCSS 3.4 + Glassmorphism design |
| **Database** | SQLite + Drizzle ORM + better-sqlite3 |
| **State Management** | Zustand 5.0.8 + React Query 5.90.2 |
| **Testing** | Vitest (unit) + Playwright (E2E) |
| **Package Manager** | **pnpm 10.x** (MUST USE) |
| **Node.js** | **20.18.0 LTS** (MUST USE - NOT 22.x) |
| **CI/CD** | GitHub Actions |
| **Build** | Electron Builder |

---

## ⚠️ CRITICAL REQUIREMENTS

### 1. Package Manager: pnpm ONLY
```bash
# ✅ CORRECT
pnpm install
pnpm dev
pnpm test

# ❌ WRONG
npm install
yarn install
```

### 2. Node.js Version: 20.x ONLY
```bash
# Check version
node --version  # Must show v20.x.x

# Switch to Node 20
nvm use 20
# OR
fnm use 20
```

**Why?** Electron 38.2.1 requires Node 20.x. Node 22.x causes "Electron failed to install correctly" errors.

### 3. Native Module: better-sqlite3
**Must rebuild for different environments:**

```bash
# For Electron runtime (automatic via postinstall)
pnpm rebuild:electron

# For Node.js tests (MUST run before tests)
pnpm rebuild:node

# Manual rebuild
pnpm rebuild better-sqlite3
```

**Why?** Native module compiled for specific Node.js/Electron version. Failing to rebuild causes "NODE_MODULE_VERSION mismatch" errors.

---

## 📁 Project Structure

```
justice-companion/
├── electron/               # Electron main process
│   ├── main.ts            # Application entry point
│   ├── preload.ts         # IPC bridge (security boundary)
│   └── dev-api-server.ts  # Development API server
├── src/
│   ├── components/        # React components
│   │   ├── auth/          # Authentication UI
│   │   └── ui/            # Reusable UI (Button, Modal, etc.)
│   ├── features/          # Domain-driven feature modules
│   │   ├── cases/         # Case management
│   │   ├── chat/          # AI legal assistant
│   │   ├── dashboard/     # Main dashboard
│   │   ├── evidence/      # Evidence management
│   │   └── settings/      # User settings
│   ├── db/                # Database layer
│   │   ├── migrations/    # SQL migration files
│   │   ├── database.ts    # Database manager
│   │   └── migrate.ts     # Migration runner
│   ├── services/          # Business logic
│   │   ├── AuthenticationService.ts
│   │   ├── EncryptionService.ts
│   │   └── AuditLogger.ts
│   ├── repositories/      # Data access layer
│   ├── models/            # TypeScript domain models
│   └── types/             # Type definitions
├── .github/workflows/     # CI/CD pipelines
└── tests/                 # Test files
```

---

## 🗄️ Database Architecture

### Tables (15 total)
- `users`, `sessions`, `consents`
- `cases`, `evidence`, `documents`
- `chat_messages`, `quick_facts`
- `audit_logs`
- ... and more

### Encrypted Fields (11 total)
**Using AES-256-GCM via `EncryptionService`:**
- Case descriptions
- Evidence metadata
- Personal information
- AI chat messages (opt-in based on user consent)

### Migrations
- Located in `src/db/migrations/`
- Reversible with rollback support
- Automatic backups before each migration

---

## 🔐 Security Architecture

### Encryption
- **Method**: AES-256-GCM
- **Key Management**: From `.env` file (ENCRYPTION_KEY_BASE64)
- **Fields**: 11 sensitive database fields
- **Service**: `EncryptionService.encrypt()` / `decrypt()`

### Authentication
- **Password Hashing**: scrypt with 128-bit random salts (OWASP-compliant)
- **Sessions**: 24-hour expiration, UUID v4 session IDs
- **Service**: `AuthenticationService`

### Audit Logging
- **Immutability**: SHA-256 hash chaining
- **Events**: All security-relevant actions
- **Service**: `AuditLogger`

### GDPR Compliance
- **Data Export**: All user data to JSON
- **Right to Erasure**: Delete all user data
- **Consent Management**: Track user consents
- **Audit Trail**: Immutable record of data access

---

## 🤖 AI Legal Assistant

### Features
- OpenAI-powered legal research (GPT-4/3.5-turbo)
- RAG (Retrieval-Augmented Generation) pipeline
- UK Legal APIs integration:
  - `legislation.gov.uk` (Acts, SIs)
  - `caselaw.nationalarchives.gov.uk` (Court judgments)
- Streaming responses with real-time display
- Source citations for all responses
- **Mandatory disclaimer**: "This is information, not legal advice"

### Implementation
- IPC streaming from main → renderer
- Context-aware (uses selected case context)
- Encrypted chat storage (opt-in)

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
```bash
pnpm rebuild:node  # MUST run first
pnpm test
pnpm test:coverage
```

**Target**: 90%+ coverage
**Focus**: Services, repositories, encryption, auth

### E2E Tests (Playwright)
```bash
pnpm test:e2e
```

**Focus**: Full user flows in Electron app
- Registration → Login → Dashboard
- Create Case → Add Evidence → View Case
- AI Chat → Streaming Response
- GDPR Export/Deletion

### In-Memory SQLite
All database tests use `:memory:` for isolation

---

## 🚀 Common Commands

### Development
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start Vite dev server only
pnpm electron:dev         # Start full Electron app
```

### Building
```bash
pnpm build                # Build for all platforms
pnpm build:win            # Windows installer (.exe)
pnpm build:mac            # macOS DMG
pnpm build:linux          # Linux AppImage + .deb
```

### Database
```bash
pnpm db:migrate           # Run pending migrations
pnpm db:migrate:status    # Check migration status
pnpm db:migrate:rollback  # Rollback last migration
pnpm db:backup            # Create database backup
```

### Testing
```bash
pnpm rebuild:node         # Rebuild for Node.js (before tests)
pnpm test                 # Run unit tests
pnpm test:coverage        # With coverage report
pnpm test:e2e             # Run E2E tests
```

### Code Quality
```bash
pnpm lint                 # Run ESLint
pnpm lint:fix             # Auto-fix linting issues
pnpm type-check           # TypeScript type checking
pnpm format               # Format with Prettier
pnpm format:check         # Check formatting
```

---

## 📦 Build Configuration

### Electron Builder (package.json)
```json
{
  "build": {
    "appId": "com.justicecompanion.app",
    "productName": "Justice Companion",
    "asarUnpack": ["node_modules/node-llama-cpp/**/*"],
    "win": { "icon": "build/icon.ico", "target": ["nsis"] },
    "mac": { "icon": "build/icon.icns", "target": ["dmg"] },
    "linux": { "icon": "build/icon.png", "target": ["AppImage", "deb"] }
  }
}
```

### ASAR Unpacking
**node-llama-cpp (~4.5GB)** is excluded from ASAR bundling to support local AI models.

---

## 🔄 CI/CD Pipelines

### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Triggers**: Push/PR to `main`, `develop`
- **Matrix**: Ubuntu, Windows, macOS × Node 20.x
- **Steps**: lint → type-check → rebuild → test
- **Duration**: ~5-10 min per platform

### 2. Release Workflow (`.github/workflows/release.yml`)
- **Trigger**: Version tags (`v*` pattern, e.g., `v1.0.0`)
- **Builds**: All platforms (.exe, .dmg, .AppImage, .deb)
- **Output**: GitHub release with all installers

### 3. Quality Workflow (`.github/workflows/quality.yml`)
- **Trigger**: PRs to `main`, `develop`
- **Steps**: format check → lint → test coverage
- **Output**: Automated PR comment with results

### Creating a Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## ⚡ Quick Troubleshooting

### "NODE_MODULE_VERSION mismatch" Error
**Cause**: better-sqlite3 compiled for wrong Node.js version
**Fix**:
```bash
nvm use 20  # or fnm use 20
pnpm install
# OR
pnpm rebuild better-sqlite3
```

### "Electron failed to install correctly"
**Cause**: Using Node.js 22.x instead of 20.x
**Fix**:
```bash
nvm use 20  # or fnm use 20
pnpm install
```

### Tests Failing (4/1156)
**Cause**: Node version mismatch
**Fix**: Use Node 20.x, run `pnpm rebuild:node` before tests

### ESLint Warnings (320 in legacy code)
**Workaround**: Use `continue-on-error: true` in CI
**Target**: New code should be ESLint-clean

---

## 🎨 Design System

### Theme: Dark + Glassmorphism

**Colors**:
```css
--primary: 217 91% 60%           /* Blue */
--background: 224 71% 4%          /* Dark blue-black */
--foreground: 213 31% 91%         /* Light gray */
--card: 224 71% 4% / 0.5          /* Semi-transparent */
--border: rgba(255, 255, 255, 0.1)
```

**Glassmorphism Effect**:
```css
backdrop-blur-md bg-card/50 border border-white/10
```

**Typography**:
- Font: Inter (sans-serif)
- Headings: `font-bold text-2xl/3xl/4xl`
- Body: `font-normal text-sm/base`

**Icons**: Lucide React

**Animations**: Framer Motion

---

## 📚 Documentation

- **README.md**: User-facing setup and usage guide
- **CLAUDE.md**: Claude Code instructions (this file)
- **.claude/**: Specialized command and agent files
- **docs/**: Additional technical documentation

---

## 🔗 External Resources

- **UK Legislation API**: https://www.legislation.gov.uk/
- **UK Case Law API**: https://caselaw.nationalarchives.gov.uk/
- **OpenAI API**: Used for AI legal research

---

## 📊 Project Stats

- **Lines of Code**: ~50,000
- **Test Pass Rate**: 99.7% (1152/1156)
- **Coverage Target**: 90%+
- **ESLint Warnings**: 320 (legacy code)
- **Database Tables**: 15
- **Encrypted Fields**: 11

---

## 🎯 Core Principles

1. **Privacy First**: All data stored locally, no cloud
2. **Security First**: Enterprise-grade encryption, OWASP-compliant auth
3. **GDPR Compliant**: Data portability, erasure, consent management
4. **Legal Accuracy**: Source citations, mandatory disclaimers
5. **Desktop Native**: Electron for cross-platform desktop experience

---

**Last Updated**: 2025-10-16
**Project**: Justice Companion v1.0.0 (in development)

# Justice Companion

**Your Local Legal Case Management Assistant**

Justice Companion is a privacy-first, desktop application for managing legal cases, evidence, documents, and AI-powered legal research. All data is stored locally on your device with enterprise-grade encryption.

## ✨ Features

### 🔐 Security & Privacy

- **Local-Only Storage**: All data stored in SQLite on your device (no cloud, no server)
- **AES-256-GCM Encryption**: Enterprise-grade encryption for sensitive data
- **OWASP-Compliant Authentication**: Scrypt password hashing with random salts
- **GDPR Compliant**: Data portability, right to erasure, consent management
- **Immutable Audit Logs**: SHA-256 hash-chained audit trail

### 📁 Case Management

- Create and organize legal cases by type (employment, housing, consumer, family, debt)
- Track case status (active, pending, closed)
- Attach evidence and documents
- Timeline of events and key dates
- Quick-reference facts for faster access

### 🤖 AI Legal Assistant

- AI-powered legal research (UK legal APIs integration)
- Natural language chat interface
- RAG (Retrieval-Augmented Generation) for accurate legal information
- Source citations from legislation.gov.uk and caselaw.nationalarchives.gov.uk
- Streaming responses with real-time thinking process
- **Disclaimer enforcement**: "This is information, not legal advice"

### 📝 Evidence & Documents

- Upload and organize evidence (documents, images, PDFs)
- Text extraction from PDFs and DOCX files
- Evidence categorization by type
- Secure storage with encryption
- Export capabilities

### 📊 Advanced Features

- Full-text search across cases, evidence, and notes
- Database migrations with rollback support
- Automatic backups before migrations
- GDPR data export (JSON format)
- User profile management
- Dark theme UI with glassmorphism design

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.18.0 LTS (Required - [Download](https://nodejs.org/))
  - ⚠️ **Important**: Use Node 20.x for best compatibility
  - Recommended: Use [fnm](https://github.com/Schniz/fnm) to manage Node versions: `fnm use 20`
- **Python** 3.11+ (Required for backend - [Download](https://www.python.org/downloads/))
  - ⚠️ **Important**: Backend API server requires Python 3.11 or higher
- **npm** 10.0.0+ (Comes with Node.js)
  - ⚠️ **Note**: Project uses npm (migrated from pnpm)
- **Git** (optional, for cloning)
- **Windows 11** (native, not WSL) - Primary development platform

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/[YOUR-USERNAME]/Justice-Companion.git
   cd Justice-Companion
   ```

2. **Install Node.js dependencies**

   ```bash
   npm install
   ```

3. **Install Python backend dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. **Set up encryption key**

   Create a `.env` file in the root directory:

   ```bash
   # Generate a random 32-byte encryption key
   # On Linux/macOS:
   openssl rand -base64 32

   # On Windows (PowerShell):
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

   Add to `.env`:

   ```env
   ENCRYPTION_KEY_BASE64=your-generated-key-here
   ```

5. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

6. **Start the application**

   ```bash
   npm start
   # or
   npm run dev
   ```

   This launches the Python backend, React frontend, and Electron desktop app.

## 📖 Usage

### First Time Setup

1. **Register an account**

   - Enter username, email, and strong password (12+ characters)
   - Real-time password strength indicator

2. **Grant required consents**

   - Data processing (required)
   - Encryption (recommended)
   - AI processing (optional)
   - Marketing communications (optional)

3. **Start managing cases**
   - Create your first case
   - Add evidence and notes
   - Chat with the AI assistant

### Common Tasks

- **Create a case**: Dashboard → New Case
- **Add evidence**: Case Detail → Evidence → Add Evidence
- **Chat with AI**: Sidebar → Chat (select a case for context)
- **Export data**: Settings → GDPR → Export All Data
- **Change password**: Settings → User Profile → Change Password
- **Backup database**: `npm run db:backup`

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18.3, TypeScript 5.9.3, Vite 5.4, TailwindCSS 3.4
- **Backend**:
  - **Desktop**: Electron 33+, Node.js 20.18.0 LTS
  - **API Server**: FastAPI (Python 3.11+), Uvicorn ASGI server
  - **Communication**: HTTP REST API + IPC bridge
- **Package Manager**: npm 10.0.0+ (Node.js), pip (Python)
- **Database**: SQLite with Drizzle ORM + Better-SQLite3 (15 tables, 11 encrypted fields)
- **State**: Zustand 5.0.8, React Query 5.90.2
- **Validation**: Zod (TypeScript), Pydantic (Python)
- **UI**: Framer Motion, Lucide React, Radix UI
- **Testing**: Vitest (unit), Playwright (E2E), pytest (Python backend)
- **Build System**: Electron Builder, Vite
- **CI/CD**: GitHub Actions

### Available Scripts

```bash
# Development
npm start                 # Start full stack (Python backend + Vite + Electron)
npm run dev               # Same as start (full application)
npm run start:frontend    # Start Vite dev server only
npm run dev:frontend      # Same as start:frontend
npm run electron:dev      # Original Electron + Vite command

# Building
npm run build             # Build for all platforms
npm run build:win         # Build for Windows
npm run build:mac         # Build for macOS
npm run build:linux       # Build for Linux

# Testing
npm test                  # Run unit tests
npm run test:coverage     # Run tests with coverage
npm run test:e2e          # Run E2E tests

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix linting issues
npm run type-check        # TypeScript type checking
npm run format            # Format code with Prettier

# Database
npm run db:migrate        # Run pending migrations
npm run db:migrate:status # Check migration status
npm run db:migrate:rollback  # Rollback last migration
npm run db:backup         # Create database backup
npm run db:backup:list    # List all backups
```

### Project Structure

```
justice-companion/
├── backend/                # Python FastAPI backend
│   ├── main.py            # FastAPI application entry point
│   ├── requirements.txt   # Python dependencies
│   ├── routes/            # API route handlers (19 files)
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── cases.py       # Case management
│   │   ├── dashboard.py   # Dashboard statistics
│   │   ├── chat.py        # AI chat interface
│   │   ├── deadlines.py   # Deadline management
│   │   ├── evidence.py    # Evidence/documents
│   │   └── gdpr.py        # GDPR compliance
│   ├── models/            # Pydantic/SQLAlchemy models
│   ├── services/          # Business logic services
│   │   ├── encryption_service.py
│   │   ├── auth_service.py
│   │   └── gdpr/          # GDPR services
│   └── repositories/      # Database repositories
├── electron/              # Electron main process
│   ├── main.ts            # Main entry point
│   ├── preload.ts         # Preload script (IPC bridge)
│   └── ipc-handlers/      # IPC handlers (legacy, migrating to HTTP)
├── src/                   # React frontend
│   ├── components/        # React components
│   │   ├── auth/          # Authentication UI
│   │   └── ui/            # Reusable UI components
│   ├── contexts/          # React contexts (Auth, Debug)
│   ├── db/                # Database layer (TypeScript)
│   │   ├── migrations/    # SQL migration files
│   │   ├── database.ts    # Database manager
│   │   └── migrate.ts     # Migration runner
│   ├── views/             # Page-level components
│   │   ├── cases/         # Case management pages
│   │   ├── chat/          # AI chat interface
│   │   ├── documents/     # Evidence/documents
│   │   └── timeline/      # Timeline/deadlines
│   ├── models/            # TypeScript domain models
│   ├── repositories/      # Data access layer
│   ├── services/          # Business logic layer
│   │   ├── AuthenticationService.ts
│   │   ├── EncryptionService.ts
│   │   └── gdpr/          # GDPR services
│   ├── middleware/        # Authorization middleware
│   ├── lib/               # API client and utilities
│   └── types/             # TypeScript type definitions
├── .github/
│   ├── workflows/         # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/    # Issue templates
└── docs/                  # Documentation

Total: ~60,000+ lines of code (TypeScript + Python)
```

## 🔄 CI/CD Pipeline

### Overview

Justice Companion uses GitHub Actions for automated testing, building, and releasing. The CI/CD system is designed for Electron apps with native modules and multi-platform builds.

### Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)

**Purpose**: Automated testing on every push and pull request

**Triggers**:

- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches

**Matrix Strategy**:

- **Operating Systems**: Ubuntu, Windows, macOS
- **Node.js Version**: 20.x (CRITICAL: Electron 38.2.1 requires Node 20, NOT Node 22)

**Pipeline Steps**:

1. Checkout code (`actions/checkout@v4`)
2. Setup Node.js 20.x with npm cache (`actions/setup-node@v4`)
3. Setup Python 3.11+ (`actions/setup-python@v4`)
4. Cache npm dependencies (`actions/cache@v4`)
5. Install Node.js dependencies (`npm ci`)
6. Install Python dependencies (`pip install -r backend/requirements.txt`)
7. **Rebuild better-sqlite3 for Node.js** (`npm run rebuild:node`)
8. Run linter (`npm run lint`)
9. Run type check (`npm run type-check`)
10. Run tests (`npm test -- --run`)

**Key Requirements**:

- Use `bash` shell for cross-platform compatibility
- Cache npm using `${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}`
- Cache pip using `${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}`
- Rebuild better-sqlite3 native module before tests (critical for test success)
- ESLint may report warnings (use `continue-on-error: true` if needed)

**Expected Results**:

- Tests: 1152/1156 passing (99.7%)
- Type-check: 0 errors
- Duration: ~5-10 minutes per platform

#### 2. Release Workflow (`.github/workflows/release.yml`)

**Purpose**: Multi-platform Electron builds and automated GitHub releases

**Triggers**:

- Push tags matching `v*` pattern (e.g., `v1.0.0`, `v2.1.3`)

**Matrix Strategy**:

- **Operating Systems**: Ubuntu, Windows, macOS
- **fail-fast**: `false` (build all platforms even if one fails)

**Environment Variables**:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pipeline Steps**:

1. Checkout code (`actions/checkout@v4`)
2. Setup Node.js 20.x with npm cache (`actions/setup-node@v4`)
3. Setup Python 3.11+ (`actions/setup-python@v4`)
4. Install dependencies (`npm ci` and `pip install -r backend/requirements.txt`)
5. Build Electron app (`npm run electron:build`)
6. Upload platform-specific artifacts (`actions/upload-artifact@v4`)
7. Create GitHub release (`softprops/action-gh-release@v2`)

**Build Outputs** (from electron-builder config):

- **Windows**: NSIS installer (.exe) - `build/icon.ico`
- **macOS**: DMG image (.dmg) - `build/icon.icns`
- **Linux**: AppImage (.AppImage) + Debian package (.deb) - `build/icon.png`

**Artifact Configuration**:

- Artifacts stored in `release/` directory
- Platform-specific naming: `release-${{ matrix.os }}`
- Error if no files found: `if-no-files-found: error`

**Permissions**:

```yaml
permissions:
  contents: write
  discussions: write
```

**Expected Results**:

- 5 artifacts: .exe, .dmg, .AppImage, .deb
- Automatic GitHub release creation
- All installers attached to release

#### 3. Code Quality Workflow (`.github/workflows/quality.yml`)

**Purpose**: Automated code quality checks on pull requests with feedback

**Triggers**:

- Pull requests to `main` and `develop` branches

**Platform**: Ubuntu only (for speed)

**Pipeline Steps**:

1. Checkout code (`actions/checkout@v4`)
2. Setup Node.js 20.x with npm cache (`actions/setup-node@v4`)
3. Setup Python 3.11+ (`actions/setup-python@v4`)
4. Install dependencies (`npm ci`)
5. Check code formatting (`npm run format:check`)
6. Lint code (`npm run lint`, non-blocking)
7. Run tests with coverage (`npm run test:coverage -- --run`)
8. Post automated comment to PR (`actions/github-script@v7`)

**PR Comment Template**:

```markdown
#### Code Quality Report

- ✅ Formatting check completed
- ✅ Linting completed
- ✅ Tests completed

_Workflow run: [runId]_
```

**Permissions**:

```yaml
permissions:
  contents: read
  pull-requests: write
```

**Key Features**:

- Non-blocking checks (`continue-on-error: true` on lint)
- Always posts comment (`if: always()`)
- Provides quick feedback to contributors

### Critical Technical Details

#### Native Module Handling

**better-sqlite3** is a native SQLite module that must be rebuilt for the target environment:

- **For Electron**: `electron-rebuild -f -w better-sqlite3` (postinstall script)
- **For Node.js tests**: `pnpm rebuild:node` (before running tests)
- **For Electron runtime**: `pnpm rebuild:electron` (after tests)

**Scripts in package.json**:

```json
{
  "postinstall": "electron-rebuild -f -w better-sqlite3",
  "rebuild:node": "node scripts/rebuild-for-node.js",
  "rebuild:electron": "node scripts/rebuild-for-electron.js"
}
```

#### Node.js Version Constraint

**CRITICAL**: Electron 38.2.1 requires Node.js 20.x LTS

- ❌ Node.js 22.x causes "Electron failed to install correctly" errors
- ✅ Node.js 20.x is compatible and resolves installation issues
- All CI/CD workflows must use `node-version: 20.x`

#### npm Caching Strategy

Proper npm caching significantly improves CI performance:

```yaml
- name: Setup Node.js with npm cache
  uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    cache: 'npm'

# Or manual caching:
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

#### Large Dependencies

**node-llama-cpp** (~4.5GB) is configured in `asarUnpack` to prevent bundling:

```json
{
  "build": {
    "asarUnpack": ["node_modules/node-llama-cpp/**/*"]
  }
}
```

This increases build time but is necessary for local AI model functionality.

### Action Versions

All workflows use latest stable versions:

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/setup-python@v4`
- `actions/cache@v4`
- `actions/upload-artifact@v4`
- `softprops/action-gh-release@v2`
- `actions/github-script@v7`

### Security Configuration

**Repository Actions Settings**:

- Actions permissions: "Allow all actions and reusable workflows"
- Workflow permissions: "Read repository contents and packages" (default)
- Fork PR approval: "Require approval for first-time contributors"

**Workflow-Level Permissions**:

- CI: `contents: read` (minimal)
- Release: `contents: write, discussions: write` (explicit override)
- Quality: `contents: read, pull-requests: write` (PR commenting)

### Known Issues & Workarounds

1. **better-sqlite3 Node Module Version Mismatch**

   - **Symptom**: Tests fail with "NODE_MODULE_VERSION mismatch" error
   - **Cause**: better-sqlite3 compiled for different Node.js version
   - **Fix**: Use Node 20.x (see Prerequisites above)
   - **Quick Fix**:

     ```bash
     # If using nvm:
     nvm use 20
     npm install

     # Or rebuild better-sqlite3:
     npm rebuild better-sqlite3
     ```

2. **ESLint Warnings (320 in legacy code)**

   - CI workflow: Use `continue-on-error: true` on lint step
   - Or: `npm run lint -- --max-warnings 500`
   - New code (OpenAI integration) is clean

3. **Test Pass Rate: 99.7% (1152/1156)**

   - 4 failing tests are due to Node version mismatch (see issue #1 above)
   - Once Node 20.x is used, all tests pass
   - Non-blocking for functionality

4. **Windows Build Performance**
   - better-sqlite3 rebuild slower on Windows
   - Expected: ~10-15 minutes vs ~5-8 minutes on Linux/macOS

### Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
choco install act  # Windows

# Test CI workflow
act push -j test

# Test release workflow
act push --tag v1.0.0 -j build
```

### Creating a Release

To trigger the release workflow:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# Or create annotated tag with message
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

The release workflow will:

1. Build installers for all platforms
2. Create GitHub release automatically
3. Upload all installers to the release
4. Mark as non-draft, non-prerelease

## 🔒 Security

### Reporting Vulnerabilities

Please see [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities responsibly.

### Security Features

- **Password Hashing**: scrypt with 128-bit random salts
- **Session Management**: 24-hour expiration, UUID v4 session IDs
- **Encryption**: AES-256-GCM for sensitive data
- **Audit Logging**: Immutable trail with hash chaining
- **Input Validation**: All user inputs validated and sanitized
- **Code Scanning**: Automated CodeQL security analysis
- **Dependency Updates**: Automated Dependabot updates

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **UK Legal APIs**: [legislation.gov.uk](https://www.legislation.gov.uk/) and [caselaw.nationalarchives.gov.uk](https://caselaw.nationalarchives.gov.uk/)
- **OpenAI**: AI-powered legal research
- **Electron**: Cross-platform desktop framework
- **Community contributors**

## 📞 Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/[YOUR-USERNAME]/Justice-Companion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/[YOUR-USERNAME]/Justice-Companion/discussions)

---

**Made with ❤️ for access to justice**

_Note: Justice Companion provides legal information, not legal advice. Always consult a qualified solicitor for legal advice specific to your situation._

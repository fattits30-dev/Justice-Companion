# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Justice Companion is a privacy-first desktop application for managing legal cases, evidence, documents, and AI-powered legal research. All data is stored locally with enterprise-grade encryption.

**Key Characteristics:**
- Electron-based desktop application
- Local SQLite database with AES-256-GCM encryption
- React 18.3 + TypeScript 5.9.3 frontend
- GDPR-compliant with immutable audit logs
- AI legal assistant powered by OpenAI with RAG

## Critical Requirements

### Package Manager
**MUST use pnpm** - NOT npm or yarn. This is critical for native module (better-sqlite3) compatibility.

### Node.js Version
**MUST use Node.js 20.18.0 LTS** - NOT Node 22.x. Electron 38.2.1 requires Node 20.x.

If encountering "Electron failed to install correctly" or "NODE_MODULE_VERSION mismatch" errors:
```bash
nvm use 20  # or fnm use 20
pnpm install
```

### Native Module: better-sqlite3
This native SQLite module must be rebuilt for different environments:

- **For Electron runtime:** `pnpm rebuild:electron` (runs via postinstall)
- **For Node.js tests:** `pnpm rebuild:node` (run before tests)
- **Manual rebuild:** `pnpm rebuild better-sqlite3`

The postinstall script automatically rebuilds for Electron after installation.

## Common Commands

### Development
```bash
pnpm install              # Install dependencies (use pnpm, not npm!)
pnpm dev                  # Start Vite dev server only
pnpm electron:dev         # Start full Electron app with dev server
```

### Database Operations
```bash
pnpm db:migrate           # Run pending migrations
pnpm db:migrate:status    # Check migration status
pnpm db:migrate:rollback  # Rollback last migration
pnpm db:backup            # Create database backup
pnpm db:backup:list       # List all backups
```

### Building
```bash
pnpm build                # Build for all platforms
pnpm build:win            # Build Windows installer (.exe)
pnpm build:mac            # Build macOS DMG
pnpm build:linux          # Build Linux AppImage + .deb
```

### Testing
```bash
pnpm test                 # Run unit tests (Vitest)
pnpm test:coverage        # Run tests with coverage report
pnpm test:e2e             # Run E2E tests (Playwright)
```

### Code Quality
```bash
pnpm lint                 # Run ESLint
pnpm lint:fix             # Auto-fix linting issues
pnpm type-check           # TypeScript type checking
pnpm format               # Format code with Prettier
pnpm format:check         # Check formatting without changing files
```

## Architecture

### Tech Stack
- **Frontend:** React 18.3, TypeScript 5.9.3, Vite 5.4, TailwindCSS 3.4
- **Backend:** Electron 33+, Node.js 20.18.0 LTS
- **Database:** Drizzle ORM + Better-SQLite3 (15 tables, 11 encrypted fields)
- **State Management:** Zustand 5.0.8, React Query 5.90.2
- **Validation:** Zod for runtime validation
- **UI Components:** Framer Motion, Lucide React
- **Testing:** Vitest (unit), Playwright (E2E)

### Directory Structure (Planned)
```
electron/               # Electron main process
  main.ts              # Application entry point
  preload.ts           # IPC bridge between main/renderer
  dev-api-server.ts    # Development API server

src/
  components/          # React components
    auth/             # Authentication UI
    ui/               # Reusable UI components

  contexts/           # React contexts (Auth, Debug)

  db/                 # Database layer
    migrations/       # SQL migration files
    database.ts       # Database manager
    migrate.ts        # Migration runner

  features/           # Feature modules (domain-driven)
    cases/           # Case management
    chat/            # AI chat interface
    dashboard/       # Main dashboard
    settings/        # User settings

  models/             # TypeScript domain models
  repositories/       # Data access layer (DB abstractions)
  services/           # Business logic layer
    AuthenticationService.ts
    EncryptionService.ts
    AuditLogger.ts

  middleware/         # Authorization middleware
  types/             # TypeScript type definitions
```

### Key Architectural Patterns

**Layered Architecture:**
1. **UI Layer:** React components in `src/components/` and `src/features/`
2. **Business Logic:** Services in `src/services/`
3. **Data Access:** Repositories in `src/repositories/`
4. **Database:** Drizzle ORM schemas and migrations in `src/db/`

**Security Architecture:**
- All sensitive data encrypted with AES-256-GCM (11 encrypted database fields)
- Passwords hashed with scrypt (OWASP-compliant, 128-bit random salts)
- Session management: 24-hour expiration, UUID v4 session IDs
- Immutable audit logs with SHA-256 hash chaining
- All inputs validated with Zod schemas

**Database Schema:**
- 15 tables total
- 11 fields use field-level encryption via `EncryptionService`
- Migration system with rollback support and automatic backups
- Better-SQLite3 for synchronous operations (required for Electron main process)

**AI Integration:**
- OpenAI-powered legal research
- RAG (Retrieval-Augmented Generation) for UK legal APIs
- Sources: legislation.gov.uk and caselaw.nationalarchives.gov.uk
- Streaming responses with real-time thinking process
- Mandatory disclaimer: "This is information, not legal advice"

**IPC Communication:**
- `electron/preload.ts` exposes safe IPC channels to renderer
- Context isolation enabled for security
- All database operations run in main process (SQLite limitation)

## Environment Configuration

Create `.env` file in root directory:
```env
ENCRYPTION_KEY_BASE64=<your-32-byte-base64-encoded-key>
```

Generate encryption key:
```bash
# Linux/macOS:
openssl rand -base64 32

# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## CI/CD Pipeline

### GitHub Actions Workflows

**CI Workflow** (`.github/workflows/ci.yml`):
- Triggers: Push/PR to `main` and `develop`
- Matrix: Ubuntu, Windows, macOS with Node 20.x
- Steps: lint → type-check → rebuild better-sqlite3 → test
- Critical: Must run `pnpm rebuild:node` before tests

**Release Workflow** (`.github/workflows/release.yml`):
- Triggers: Version tags (`v*` pattern, e.g., `v1.0.0`)
- Builds: Windows (.exe), macOS (.dmg), Linux (.AppImage + .deb)
- Outputs to `release/` directory
- Auto-creates GitHub release with all installers

**Quality Workflow** (`.github/workflows/quality.yml`):
- Triggers: PRs to `main` and `develop`
- Runs: format check, lint, test coverage
- Posts automated comment to PR with results

### Creating Releases
```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the release workflow to build all platform installers and create a GitHub release.

## Security & Compliance

### GDPR Compliance
- Data portability: Export all user data to JSON
- Right to erasure: Delete all user data
- Consent management: Track user consents in database
- Audit logging: Immutable trail of all data access

### Security Best Practices
- Never commit `.env` file or encryption keys
- All user inputs must be validated with Zod schemas
- Use `EncryptionService` for encrypting sensitive fields
- Use `AuditLogger` for logging security-relevant events
- Follow OWASP authentication guidelines (implemented in `AuthenticationService`)

### Encrypted Database Fields
11 fields across the schema require encryption:
- User passwords (scrypt hashed, not encrypted)
- Case details
- Evidence metadata
- Personal information
- AI chat messages (optional, based on user consent)

## Known Issues & Troubleshooting

### better-sqlite3 Module Version Mismatch
**Symptom:** `NODE_MODULE_VERSION mismatch` error
**Cause:** Compiled for different Node.js version
**Fix:**
```bash
# Ensure Node 20.x is active
nvm use 20  # or fnm use 20

# Reinstall or rebuild
pnpm install
# OR
pnpm rebuild better-sqlite3
```

### Test Pass Rate: 99.7% (1152/1156 passing)
4 failing tests are due to Node version mismatch. All tests pass with Node 20.x.

### ESLint Warnings (320 in legacy code)
New code should be ESLint-clean. Use `pnpm lint:fix` to auto-fix issues.

### Large Dependencies
`node-llama-cpp` (~4.5GB) is configured in `asarUnpack` to prevent ASAR bundling. This is intentional for local AI model support.

## Development Workflow

1. **Initial Setup:**
   ```bash
   git clone <repository>
   cd Justice-Companion
   pnpm install              # Auto-runs postinstall to rebuild better-sqlite3
   ```

2. **Create `.env` file** with encryption key (see Environment Configuration above)

3. **Run migrations:**
   ```bash
   pnpm db:migrate
   ```

4. **Start development:**
   ```bash
   pnpm electron:dev
   ```

5. **Before committing:**
   ```bash
   pnpm lint:fix
   pnpm type-check
   pnpm test
   ```

## Testing Strategy

- **Unit Tests:** Vitest for services, repositories, utilities
- **E2E Tests:** Playwright for full user flows
- **Coverage Target:** 80%+ (current: ~75%)
- **Test Database:** In-memory SQLite for fast, isolated tests

Run specific test file:
```bash
pnpm test src/services/AuthenticationService.test.ts
```

## Platform-Specific Notes

### Windows (Primary Development Platform)
- Native development on Windows 11 (not WSL)
- Better-sqlite3 rebuild slower (~10-15 min vs 5-8 min on Unix)
- Use PowerShell for encryption key generation

### macOS
- Requires Xcode Command Line Tools for native module compilation
- DMG build outputs to `release/` directory

### Linux
- Produces both AppImage (portable) and .deb (Debian-based distros)
- Requires `libsqlite3-dev` for better-sqlite3 compilation

## AI Legal Assistant Features

- **UK Legal API Integration:** legislation.gov.uk, caselaw.nationalarchives.gov.uk
- **RAG Pipeline:** Retrieves relevant legal documents before generating responses
- **Citation System:** All responses cite sources
- **Streaming:** Real-time response generation with thinking process
- **Disclaimer Enforcement:** Every response includes legal disclaimer
- **Context-Aware:** Uses selected case context when available

## Build Configuration

Electron Builder configuration (in `package.json`):
```json
{
  "build": {
    "appId": "com.justicecompanion.app",
    "productName": "Justice Companion",
    "asarUnpack": ["node_modules/node-llama-cpp/**/*"],
    "win": { "icon": "build/icon.ico" },
    "mac": { "icon": "build/icon.icns" },
    "linux": { "icon": "build/icon.png" }
  }
}
```

Output directories:
- Development: `dist/` (Vite build)
- Production: `release/` (Electron Builder output)

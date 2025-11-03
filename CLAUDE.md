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

## 6 Engineering Principles (NON-NEGOTIABLE)

Every code change MUST follow these principles. No exceptions.

### 1. IT FUCKING WORKS
- Tests pass ✓
- Types pass ✓
- Real users can use it ✓

**Rule:** If it doesn't work, don't ship it. Period.

### 2. YOU CAN BREAK IT SAFELY
- Test suite catches breaks (unit + E2E)
- Fast feedback loop (< 30s for unit tests)
- Safe to refactor, safe to ship

**Rule:** If you can't test it, you can't change it confidently.

### 3. READS LIKE ENGLISH
- Function names tell you what they do
- No "utils" folders with 47 random functions
- Code explains itself, comments explain WHY

**Rule:** If it needs a paragraph comment to explain WHAT it does, refactor it.

### 4. FAILS FAST, FAILS LOUD
- Bad data → immediate error, not silent corruption
- Clear error messages ("Password must be 12+ chars" not "Invalid input")
- Validation at the edges (API boundaries, file inputs, user inputs)

**Rule:** Never let invalid data enter the system. Catch it at the door.

### 5. TESTED WHERE IT MATTERS
- Auth flows? E2E tests. Always.
- Business logic? Unit tests with real scenarios.
- Not "test everything" - test what breaks users.

**Rule:** Test what users actually do, not what makes coverage % look good.

### 6. ONE TRUTH
- Database is source of truth
- No duplicate logic scattered across 8 files
- Change it once, it changes everywhere

**Rule:** If you're copying code, you're doing it wrong. Extract it.

**Consequences of Violating These Rules:**
- Silent bugs that corrupt user data
- Hours wasted debugging "why doesn't this work?"
- Fear of refactoring (technical debt compounds)
- Users lose trust

**When in Doubt:**
- Does this make the system MORE reliable? Ship it.
- Does this make the system LESS reliable? Don't ship it.
- Not sure? Write a test that proves it.

## MCP Servers (Model Context Protocol)

**STATUS: ALL 8 SERVERS CONFIGURED AND OPERATIONAL**

Justice Companion has 8 MCP servers providing 80+ specialized tools for development, legal research, AI integration, and automation.

### Server Status
```
✓ Playwright (14 tools)           - Browser automation for UK legal sites
✓ Puppeteer (7 tools)             - Chrome-based web scraping
✓ GitHub (26 tools)               - Complete repository management
✓ Memory (9 tools)                - Knowledge graph persistence
✓ Sequential Thinking (1 tool)    - Deep reasoning (32K tokens)
✓ Filesystem (14 tools)           - C:\ drive access
✓ Context7 (2 tools)              - Up-to-date library docs
✓ Hugging Face (7+ tools)         - AI models, datasets, inference API
```

### Configuration Location
All MCP servers are configured in `.mcp.json` at project root using Windows-compatible command format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@package/name"]
    }
  }
}
```

### Key Capabilities

**Legal Research Automation:**
- Playwright MCP: Navigate legislation.gov.uk and caselaw.nationalarchives.gov.uk
- Puppeteer MCP: Scrape UK legal databases and capture screenshots
- Memory MCP: Store research findings in persistent knowledge graph

**Development & Code Management:**
- GitHub MCP: Create issues, PRs, manage repository operations
- Filesystem MCP: Read/write case files, search evidence documents
- Context7 MCP: Get current docs for OpenAI, Electron, React, TypeScript

**AI Integration & Models:**
- Hugging Face MCP: Access 500k+ AI models, datasets, and inference API
  - Model discovery and metadata
  - Dataset search and download
  - Inference API for text generation, embeddings, classification
  - Model hosting and deployment
  - Use for legal document classification, entity extraction, summarization

**Advanced Analysis:**
- Sequential Thinking MCP: Multi-step reasoning for complex architectural decisions
- Memory MCP: Track project relationships and architectural decisions

### Usage Examples

**Legal Research Workflow:**
```
1. Use Playwright to search legislation.gov.uk for specific statute
2. Capture screenshots of relevant sections
3. Store findings in Memory MCP knowledge graph
4. Generate case notes using stored context
```

**Development Workflow:**
```
1. Use Context7 to get current Electron IPC documentation
2. Implement feature following latest best practices
3. Use GitHub MCP to create PR with detailed description
4. Use Memory MCP to store architectural decision
```

**Complex Problem Solving:**
```
1. Use Sequential Thinking for multi-step analysis
2. Explore alternative approaches with branching
3. Store final decision in Memory MCP
4. Document in GitHub issue using GitHub MCP
```

**AI-Powered Legal Analysis:**
```
1. Use Hugging Face to find legal document classification models
2. Download legal-bert or similar fine-tuned models
3. Use Inference API for document categorization (contracts, briefs, evidence)
4. Extract entities (parties, dates, citations) from case documents
5. Generate summaries of lengthy legal texts
6. Store model IDs and results in Memory MCP
```

### Verification Commands

Check MCP server status:
```bash
claude mcp list
```

Test specific server:
```bash
claude mcp get playwright
```

### Troubleshooting

If servers show as disconnected:
1. Verify Node.js 20.x is active: `node --version`
2. Check `.mcp.json` syntax (must use `cmd /c` format on Windows)
3. Restart Claude Code completely (close and relaunch)

Common issues:
- Context7 may occasionally fail to reconnect (non-critical)
- GitHub requires valid GITHUB_PERSONAL_ACCESS_TOKEN in env
- Hugging Face requires valid HF_API_TOKEN in env (get from huggingface.co/settings/tokens)
- Filesystem requires explicit directory paths (currently: C:\)

### Environment Variables for MCP Servers

Add to your system environment variables or `.env` file:

```bash
# GitHub MCP (required for create/update operations)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Hugging Face MCP (required for model downloads and inference)
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
```

**Get tokens:**
- GitHub: https://github.com/settings/tokens (requires `repo` scope)
- Hugging Face: https://huggingface.co/settings/tokens (read or write access)

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

## Critical: TSX Import Resolution

**IMPORTANT:** All relative imports in TypeScript files MUST have explicit `.ts` extensions.

```typescript
// ✅ Correct
import { UserRepository } from '../repositories/UserRepository.ts';
import type { User } from '../models/User.ts';

// ❌ Wrong - will fail with TSX transpiler
import { UserRepository } from '../repositories/UserRepository';
import type { User } from '../models/User';
```

**Why:** Justice Companion uses `tsx` for development which requires explicit file extensions for ESM module resolution. See [TSX Import Resolution Guide](docs/TSX-IMPORT-RESOLUTION-GUIDE.md) for comprehensive details.

**Quick Fix:** Run `node fix-imports-simple.mjs` to automatically add `.ts` extensions.

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
    KeyManager.ts
    gdpr/              # GDPR compliance services
      GdprService.ts
      DataExporter.ts
      DataDeleter.ts

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
- **Encryption:** AES-256-GCM for 11 sensitive database fields
- **Key Management:** OS-level encryption via `KeyManager` (fixes CVSS 9.1)
  - Windows: DPAPI | macOS: Keychain | Linux: libsecret
  - Auto-migration from `.env` on first run
- **Password Hashing:** scrypt (OWASP-compliant, 128-bit random salts)
- **Session Management:** 24-hour expiration, UUID v4 session IDs
- **Audit Logging:** Immutable SHA-256 hash chaining
- **Input Validation:** Zod schemas for all user inputs
- **Path Security:** Absolute paths with `path.join(__dirname, ...)` (fixes CVSS 8.8)
- **GDPR Compliance:** Full implementation of Articles 17 & 20 (fixes CVSS 9.5)

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

### Encryption Key Management

**Production (Recommended):** Encryption keys are stored securely using `KeyManager` with Electron's `safeStorage` API:

- **Windows:** DPAPI (Data Protection API)
- **macOS:** Keychain
- **Linux:** Secret Service API (libsecret)

The encrypted key is stored at `app.getPath('userData')/.encryption-key`.

**First Run:** If you have an existing `.env` file with `ENCRYPTION_KEY_BASE64`, the app will automatically migrate it to safeStorage on first run. After migration, you should **delete the key from .env** for security.

**Development/Testing:** For tests that need an encryption key, you can still use `.env`:

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

**Migration Script:** If you need to manually migrate or generate a new key:

```typescript
import { KeyManager } from './src/services/KeyManager';
import { app, safeStorage } from 'electron';

const keyManager = new KeyManager(safeStorage, app.getPath('userData'));

// Migrate from .env
const envKey = process.env.ENCRYPTION_KEY_BASE64;
if (envKey) {
  keyManager.migrateFromEnv(envKey);
  console.log('✓ Key migrated to safeStorage');
}

// Or generate new key
const newKey = keyManager.generateNewKey();
console.log('✓ New key generated:', newKey);
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

Full implementation of GDPR Articles 17 & 20 with production-grade security:

**Article 20 - Data Portability (Right to Export):**
- **Service:** `GdprService.exportUserData(userId, options)`
- **Output:** Machine-readable JSON with all user data across 13 tables
- **Encryption:** All encrypted fields are decrypted before export
- **Rate Limiting:** 5 exports per 24 hours per user (prevents abuse)
- **Consent Required:** User must have active `data_processing` consent
- **Audit Trail:** Every export logged with SHA-256 hash chaining
- **File Export:** Optionally saves to disk at `exports/user-{userId}-export-{timestamp}.json`

**Article 17 - Right to Erasure (Right to Delete):**
- **Service:** `GdprService.deleteUserData(userId, options)`
- **Deletion Order:** Respects foreign key constraints (15-step cascade)
- **Safety:** Requires explicit `confirmed: true` flag
- **Rate Limiting:** 1 deletion per 30 days per user (prevents accidents)
- **Consent Required:** User must have `data_erasure_request` consent
- **Preserved Data:** Audit logs and consent records (legal requirement)
- **Export Option:** Can export before deletion with `exportBeforeDelete: true`
- **Transaction Safety:** All-or-nothing deletion (atomic)

**Implementation Files:**
- `src/services/gdpr/GdprService.ts` - Orchestration layer (363 lines)
- `src/services/gdpr/DataExporter.ts` - Export logic (344 lines)
- `src/services/gdpr/DataDeleter.ts` - Deletion logic (191 lines)
- `src/models/Gdpr.ts` - Type definitions (153 lines)
- `src/services/gdpr/Gdpr.integration.test.ts` - Test suite (15/15 passing, 822 lines)

**Usage Example:**
```typescript
import { GdprService } from './src/services/gdpr/GdprService';

const gdprService = new GdprService(db, encryptionService, auditLogger);

// Export user data
const exportResult = await gdprService.exportUserData(userId, {
  format: 'json',
});
console.log('Exported:', exportResult.metadata.totalRecords, 'records');
console.log('Saved to:', exportResult.filePath);

// Delete user data
const deleteResult = await gdprService.deleteUserData(userId, {
  confirmed: true,
  exportBeforeDelete: true,
  reason: 'User requested account deletion',
});
console.log('Deleted:', deleteResult.deletedCounts);
console.log('Preserved audit logs:', deleteResult.preservedAuditLogs);
```

**Test Coverage:** 15 comprehensive integration tests covering:
- Data export with decryption
- Data deletion with cascade
- Rate limiting enforcement
- Consent requirement validation
- Audit log preservation
- Error handling and rollback
- Export before delete workflow

### Encryption Key Security

**KeyManager Service** (`src/services/KeyManager.ts`):
- **Fixes:** CVSS 9.1 vulnerability (plaintext key in .env)
- **Storage:** OS-level encryption via Electron `safeStorage` API
- **Auto-Migration:** Migrates from .env on first run
- **Key Operations:**
  - `getKey()` - Load and decrypt key (cached in memory)
  - `migrateFromEnv(envKey)` - Migrate from .env to safeStorage
  - `generateNewKey()` - Generate new 32-byte key
  - `rotateKey()` - Rotate key (backs up old key)
  - `clearCache()` - Securely wipe key from memory

**Key Location:**
- **Encrypted:** `app.getPath('userData')/.encryption-key`
- **Permissions:** 0o600 (read/write owner only)
- **Backup:** Automatic backup before rotation

### Security Best Practices
- **Never commit `.env` file or encryption keys** - Use KeyManager for production
- **All user inputs validated with Zod schemas** - Runtime type checking
- **Use `EncryptionService` for encrypting sensitive fields** - AES-256-GCM
- **Use `AuditLogger` for logging security events** - SHA-256 hash chaining
- **Follow OWASP authentication guidelines** - Implemented in `AuthenticationService`
- **Path Traversal Prevention** - All `require()` calls use absolute paths with `path.join(__dirname, ...)`

### Encrypted Database Fields
11 fields across the schema require encryption:
- User passwords (scrypt hashed, not encrypted)
- Case details (case title, description, status)
- Evidence metadata (file paths, notes)
- Personal information (names, addresses, phone numbers)
- AI chat messages (optional, based on user consent)

## Known Issues & Troubleshooting

### TSX "Cannot find module" Errors (FIXED)
**Symptom:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'F:\...\src\db\database'`
**Cause:** Missing `.ts` extensions on relative imports
**Fix:**
```bash
# Automated fix (adds .ts extensions to all relative imports)
node fix-imports-simple.mjs

# Verify fix
pnpm electron:dev
```
**See:** [TSX Import Resolution Guide](docs/TSX-IMPORT-RESOLUTION-GUIDE.md) for complete documentation.

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

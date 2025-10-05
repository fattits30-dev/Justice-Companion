# Justice Companion - Development Guide

## 🎯 Current Implementation Status (2025-10-05)

### ✅ Phase 0.5: MCP Server (COMPLETE)
**Commit**: `bae9f25`, `4dcafe3`
- 9 IPC handlers operational via HTTP bridge (port 5555)
- Custom MCP server for Claude Code integration
- Dev API server for development/testing

**Tools Available**:
- `cases:create`, `cases:get`, `cases:list`, `cases:update`, `cases:delete`, `cases:createTestFixture`
- `database:query`, `database:migrate`, `database:backup`

### ✅ Phase 1: Encryption Service (COMPLETE)
**Commit**: `1a0e66f`, `15663d2`
- AES-256-GCM encryption for PII/sensitive data
- 32-byte encryption keys from .env
- Integrated into CaseRepository and EvidenceRepository
- Encrypts: case descriptions, evidence content

**Files**:
- `src/services/EncryptionService.ts` (216 lines)
- `src/services/EncryptionService.test.ts` (388 lines)
- `.env.example` template

### ✅ Phase 2: Audit Logger (COMPLETE)
**Commit**: `37e78fa`
- Blockchain-style immutable audit trail
- SHA-256 hash chaining for tamper detection
- 18 event types tracked
- GDPR-compliant metadata-only logging

**Files**:
- `src/services/AuditLogger.ts` (433 lines)
- `src/models/AuditLog.ts` (73 lines)
- `src/services/AuditLogger.test.ts` (925 lines)
- `src/db/migrations/003_audit_logs.sql`
- Integration: CaseRepository, EvidenceRepository

**Event Types**:
- Cases: create, read, update, delete, pii_access
- Evidence: create, read, update, delete, content_access, export
- Encryption: key_loaded, decrypt
- Database: backup, restore, migrate
- Config: change

### 🔜 Phase 3: Database Schema Finalization (NEXT)
**Status**: Pending
**Goal**: Consolidate encryption fields across all tables

**Tasks**:
- [ ] Review all table schemas for encryption requirements
- [ ] Ensure consistent naming (encrypted_* fields)
- [ ] Add encryption metadata columns where needed
- [ ] Update existing migrations if necessary
- [ ] Document which fields are encrypted

### 🔜 Phase 4: Migration System (NEXT)
**Status**: Pending
**Goal**: Comprehensive migration infrastructure

**Tasks**:
- [ ] Automated migration runner
- [ ] Rollback capabilities
- [ ] Migration versioning
- [ ] Pre/post-migration hooks
- [ ] Migration status tracking
- [ ] Documentation generator

---

## 🏗️ Architecture Overview

### Security Layers
1. **Encryption Layer**: AES-256-GCM for sensitive data at rest
2. **Audit Layer**: Blockchain-style immutable logging
3. **Access Control**: PII access tracking via audit logs
4. **GDPR Compliance**: Metadata-only audit logging

### Data Flow
```
User Input → Validation → Encryption → Database → Audit Log
                                    ↓
                            Repository Layer
                                    ↓
                            Service Layer (CaseService, etc.)
                                    ↓
                            IPC Handler (Electron main process)
                                    ↓
                            Renderer Process (React UI)
```

### Critical Files
- **Main Process**: `electron/main.ts` (1026 lines)
- **Database**: `src/db/database.ts`, `src/db/migrate.ts`
- **Repositories**: `src/repositories/CaseRepository.ts`, `src/repositories/EvidenceRepository.ts`
- **Services**: `src/services/EncryptionService.ts`, `src/services/AuditLogger.ts`
- **Migrations**: `src/db/migrations/` (3 migrations)

---

## 🛠️ Build & Test Commands

```sh
# Development
npm run dev               # Start Vite dev server
npm run electron:dev      # Start Electron with dev server
npm run type-check        # TypeScript compilation check
npm run lint              # ESLint

# Testing
npm test                  # Run all tests (Vitest)
npm test -- AuditLogger.test.ts  # Run specific test file

# Building
npm run build             # Build for production
npm run build:win         # Build Windows installer
npm run build:mac         # Build macOS app
npm run build:linux       # Build Linux package

# Database
node scripts/apply-audit-migration.ts  # Apply audit logs migration
```

## 🔧 Development Servers

### Vite Dev Server
- **URL**: http://localhost:5173
- **Purpose**: React frontend hot reload

### Dev API Server
- **URL**: http://localhost:5555
- **Endpoints**:
  - `GET /dev-api/health` - Health check
  - `GET /dev-api/handlers` - List available handlers
  - `POST /dev-api/ipc` - Invoke IPC handler

**Example**:
```bash
curl -X POST http://localhost:5555/dev-api/ipc \
  -H "Content-Type: application/json" \
  -d '{"channel": "dev-api:cases:create", "args": [{"title": "Test", "caseType": "employment", "description": "Test case"}]}'
```

---

## 📝 Code Style Guidelines

- **TypeScript**: Strict type checking, ES modules, explicit return types
- **Naming**: PascalCase for classes/types, camelCase for functions/variables
- **Files**: Lowercase with hyphens, test files with `.test.ts` suffix
- **Imports**: ES module style, include `.js` extension, group imports logically
- **Error Handling**: Use TypeScript's strict mode, explicit error checking in tests
- **Formatting**: 2-space indentation, semicolons required, single quotes preferred
- **Testing**: Co-locate tests with source files, use descriptive test names
- **Comments**: JSDoc for public APIs, inline comments for complex logic

---

## 🔐 Security Guidelines

### Encryption
- **ALWAYS** encrypt PII: case descriptions, evidence content, personal data
- **NEVER** log decrypted sensitive data
- Use `EncryptionService` for all encryption operations
- Store encryption key in `.env` file (never commit)

### Audit Logging
- **ALWAYS** audit CRUD operations on sensitive resources
- Track PII access separately (`case.pii_access`, `evidence.content_access`)
- Log both successes and failures
- Never throw exceptions from audit logging

### Database
- **ALWAYS** use parameterized queries (no string concatenation)
- Validate input on EVERY boundary
- Use transactions for multi-step operations
- Run migrations in transactions

---

## 🗂️ Project Structure

```
justice-companion/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry point (1026 lines)
│   ├── preload.ts        # Preload script
│   └── dev-api-server.ts # Development API server
├── src/
│   ├── components/       # React components
│   ├── db/              # Database layer
│   │   ├── database.ts  # Database manager
│   │   ├── migrate.ts   # Migration runner
│   │   └── migrations/  # SQL migration files
│   ├── models/          # TypeScript types/interfaces
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic layer
│   │   ├── EncryptionService.ts  # AES-256-GCM encryption
│   │   ├── AuditLogger.ts        # Immutable audit trail
│   │   ├── CaseService.ts        # Case business logic
│   │   └── ...
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── mcp-server/          # Custom MCP server
│   └── src/
│       └── server.ts    # MCP server implementation
├── scripts/             # Build/utility scripts
└── tests/              # Test files (co-located with source)
```

---

## 🚀 Next Session Priorities

1. **Phase 3**: Finalize database schema with encryption fields
2. **Phase 4**: Create comprehensive migration system
3. **Fix**: Rebuild better-sqlite3 for Node v22.20.0
4. **Test**: End-to-end audit logging verification
5. **Document**: API documentation for IPC handlers

---

## 📚 Key Resources

- **Tactical Protocol**: `JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md`
- **Encryption Docs**: `ENCRYPTION_SERVICE_IMPLEMENTATION.md`
- **Audit Logs Docs**: `AUDIT_LOGS_*.md` (4 files)
- **MCP Docs**: `mcp-server/*.md` (3 files)

---

**Node.js**: >= 18
**Database**: SQLite (better-sqlite3)
**Framework**: Electron + React + Vite
**Testing**: Vitest

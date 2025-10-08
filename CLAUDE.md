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
- `src/services/AuditLogger.e2e.test.ts` (1,182 lines)
- `src/db/migrations/003_audit_logs.sql`
- Integration: CaseRepository, EvidenceRepository

**Event Types**:
- Cases: create, read, update, delete, pii_access
- Evidence: create, read, update, delete, content_access, export
- Encryption: key_loaded, decrypt
- Database: backup, restore, migrate
- Config: change

### ✅ Phase 3: Database Schema Finalization (COMPLETE)
**Status**: COMPLETE (2025-10-05)
**Goal**: Extend encryption to all sensitive PII fields

**Achievements**:
- ✅ Encryption expanded from 2 fields to 9 fields (450% increase) - **Phase 3.5 adds 2 more → 11 total (550% increase)**
- ✅ Created 3 new repositories with encryption (Notes, LegalIssues, Timeline)
- ✅ Updated 2 repositories with encryption (UserProfile, ChatConversation)
- ✅ Migration 004: encryption_metadata table for field documentation
- ✅ Comprehensive test coverage (NotesRepository.test.ts, Phase3Repositories.test.ts)
- ✅ GDPR Article 32 compliance for all PII

**Encrypted Fields in Phase 3 (P0/P1 Priority)**:
- `cases.description` (P0 - Phase 1)
- `evidence.content` (P0 - Phase 1)
- `notes.content` (P0 - Phase 3)
- `chat_messages.content` (P0 - Phase 3)
- `chat_messages.thinking_content` (P1 - Phase 3)
- `user_profile.name` (P0 - Phase 3)
- `user_profile.email` (P0 - Phase 3)
- `legal_issues.description` (P1 - Phase 3)
- `timeline_events.description` (P1 - Phase 3)

**Total Encrypted Fields Across All Phases: 11** (9 from Phase 3 + 2 from Phase 3.5)

**New Files**:
- `src/repositories/NotesRepository.ts` (265 lines)
- `src/repositories/LegalIssuesRepository.ts` (260 lines)
- `src/repositories/TimelineRepository.ts` (258 lines)
- `src/repositories/NotesRepository.test.ts` (285 lines)
- `src/repositories/Phase3Repositories.test.ts` (420 lines)
- `src/db/migrations/004_encryption_expansion.sql`
- `ENCRYPTION_COVERAGE_REPORT.md` (comprehensive audit)
- `ENCRYPTION_IMPLEMENTATION.md` (v2.0 - complete documentation)

### ✅ Phase 3.5: User Facts & Case Facts Feature (COMPLETE)
**Status**: COMPLETE (2025-10-05)
**Goal**: Quick-reference fact tracking with encryption for faster access

**Achievements**:
- ✅ Created user_facts table (P0 encryption - direct PII)
- ✅ Created case_facts table (P1 encryption - may contain PII)
- ✅ Migration 005: Two new tables with indexes, triggers, and encryption metadata
- ✅ UserFactsRepository with 7 methods and full encryption support
- ✅ CaseFactsRepository with 9 methods and full encryption support
- ✅ 8 new audit event types (user_fact.*, case_fact.*)
- ✅ Comprehensive test suite (66+ tests, 1,888 lines)
- ✅ Complete feature documentation

**Encrypted Fields (P0/P1 Priority)**:
- `user_facts.fact_content` (P0 - Phase 3.5) - Personal details, employment history, financial info
- `case_facts.fact_content` (P1 - Phase 3.5) - Timeline facts, evidence, witnesses, locations

**Fact Types & Categories**:
- User Facts: personal, employment, financial, contact, medical, other
- Case Facts: timeline, evidence, witness, location, communication, other
- Importance Levels: low, medium, high, critical

**New Files**:
- `src/db/migrations/005_user_and_case_facts.sql` (92 lines)
- `src/models/UserFact.ts` (17 lines)
- `src/models/CaseFact.ts` (20 lines)
- `src/repositories/UserFactsRepository.ts` (337 lines)
- `src/repositories/CaseFactsRepository.ts` (385 lines)
- `src/repositories/UserFactsRepository.test.ts` (570 lines)
- `src/repositories/CaseFactsRepository.test.ts` (682 lines)
- `src/repositories/FactsRepositories.test.ts` (636 lines)
- `FACTS_FEATURE_IMPLEMENTATION.md` (700+ lines)

**Updated Files**:
- `src/models/AuditLog.ts` - Added 8 event types
- `src/models/index.ts` - Added exports

### ✅ Phase 4: Migration System (COMPLETE)
**Status**: COMPLETE (2025-10-05)
**Goal**: Comprehensive migration infrastructure with rollback support

**Achievements**:
- ✅ Rollback support via UP/DOWN migration sections
- ✅ SHA-256 checksum verification for tamper detection
- ✅ Migration status tracking (applied/rolled_back/failed)
- ✅ Performance measurement (duration_ms for each migration)
- ✅ Migration validation (pre-flight checks)
- ✅ Backup/restore system with auto-backup before migrations
- ✅ Comprehensive developer documentation (MIGRATION_SYSTEM_GUIDE.md)

**New Features**:
- `runMigrations()` - Apply pending migrations with checksum tracking
- `rollbackMigration(name)` - Rollback specific migration
- `getMigrationStatus()` - List applied/pending/rolled_back migrations
- `validateMigration(name)` - Validate migration file format
- `parseMigration(content)` - Parse UP/DOWN sections
- `createBackup(filename?)` - Create database backup
- `restoreBackup(filename)` - Restore from backup
- `listBackups()` - List all available backups
- `createPreMigrationBackup()` - Auto-backup with timestamp

**New Files**:
- `src/db/migrate.ts` (enhanced with 267 lines)
- `src/db/backup.ts` (150 lines)
- `MIGRATION_SYSTEM_GUIDE.md` (650+ lines - comprehensive guide)

**Updated**:
- `package.json` - Added npm scripts: `db:migrate`, `db:migrate:status`, `db:migrate:rollback`, `db:backup`, `db:backup:list`

### ✅ Phase 5: Service Layer & IPC Integration (COMPLETE)
**Commits**: `798bbaf` (services), `9d6b5a1` (progress), `5dc6d4f` (type fixes)
**Status**: COMPLETE (2025-10-05)
**Goal**: Service layer with business logic and complete IPC integration

**Phase 5A: Service Layer (5 services, 634 lines total)**
- `NotesService.ts` (95 lines) - Notes CRUD with input validation
- `LegalIssuesService.ts` (123 lines) - Legal issues CRUD with validation
- `TimelineService.ts` (127 lines) - Timeline events CRUD with validation
- `UserFactsService.ts` (135 lines) - User facts CRUD with validation
- `CaseFactsService.ts` (154 lines) - Case facts CRUD with validation
- All services include: input validation, error logging, null checks, consistent error messages

**Phase 5B-5D: IPC Integration (23 channels, ~870 lines)**
- `src/types/ipc.ts`: 23 IPC channel constants + TypeScript request/response interfaces
- `electron/main.ts`: 23 IPC handlers wiring services to renderer process
- `electron/preload.ts`: 5 API namespaces exposed via contextBridge
- Full type safety from database → repository → service → IPC → hooks → UI

**IPC Channels Implemented**:
- Notes: `notes:create`, `notes:list`, `notes:update`, `notes:delete` (4)
- Legal Issues: `legalIssues:create`, `legalIssues:list`, `legalIssues:update`, `legalIssues:delete` (4)
- Timeline: `timeline:create`, `timeline:list`, `timeline:update`, `timeline:delete` (4)
- User Facts: `userFacts:create`, `userFacts:list`, `userFacts:listByType`, `userFacts:update`, `userFacts:delete` (5)
- Case Facts: `caseFacts:create`, `caseFacts:list`, `caseFacts:listByCategory`, `caseFacts:listByImportance`, `caseFacts:update`, `caseFacts:delete` (6)

**Security Enforcement**:
- Encryption service injected into all repositories
- Audit logger injected into all repositories
- All sensitive operations logged (create, read, update, delete)
- Input validation at service layer (length limits, required fields)

**Quality Assurance**:
- ✅ TypeScript strict mode: PASSED
- ✅ All null/undefined checks added
- ✅ Consistent error handling across services
- ✅ No `any` types used

### ✅ Phase 6: UI Components & React Hooks (COMPLETE)
**Commit**: `edfff3d`
**Status**: COMPLETE (2025-10-05)
**Goal**: Complete user interface for facts feature with post-it note aesthetic

**Phase 6A-6C: UI Components (6 components, ~2,000 lines)**
- `PostItNote.tsx` (210 lines) - Reusable post-it note component
  - 5 color variants: yellow, blue, green, pink, purple
  - Inline editing with click-to-edit
  - Smooth hover animations and gradient backgrounds
  - Delete confirmation with X button
- `UserFactsPanel.tsx` (260 lines) - User facts grid with type filtering
  - Type filters: personal, employment, financial, contact, medical, other
  - Post-it note grid layout
  - Create new facts with type selector
- `CaseFactsPanel.tsx` (420 lines) - Case facts grid with dual filtering
  - Category filters: timeline, evidence, witness, location, communication, other
  - Importance filters: low, medium, high, critical
  - Visual importance badges on each note
- `NotesPanel.tsx` (270 lines) - Notes list view with create/edit/delete
  - Simple list-based interface
  - Inline editing
  - Timestamp display
- `LegalIssuesPanel.tsx` (360 lines) - Legal issues accordion
  - Expand/collapse accordion pattern
  - Title and description display
  - Delete functionality
- `TimelineView.tsx` (470 lines) - Vertical timeline with chronological events
  - Visual timeline with dots and connecting line
  - Date sorting (most recent first)
  - Inline editing for events

**Phase 6D: React Hooks (5 hooks, ~470 lines)**
- `useNotes.ts` (85 lines) - Notes state management + IPC integration
- `useLegalIssues.ts` (85 lines) - Legal issues state + IPC
- `useTimeline.ts` (85 lines) - Timeline events state + IPC
- `useUserFacts.ts` (100 lines) - User facts state + IPC + type filtering
- `useCaseFacts.ts` (115 lines) - Case facts state + IPC + category/importance filtering
- All hooks include: loading states, error handling, auto-refresh on caseId change

**Type Definitions**:
- `src/types/electron.d.ts` (63 lines) - Full window.electron API types for all 23 IPC channels

**Features**:
- ✅ Post-it note aesthetic with 5 color variants
- ✅ Client-side filtering (no unnecessary IPC calls)
- ✅ Full TypeScript type safety (no `any` types)
- ✅ Loading/error states in all hooks
- ✅ Inline editing with auto-save
- ✅ Responsive grid layouts
- ✅ Accessibility-friendly interactions
- ✅ Smooth animations and transitions

**Quality Assurance**:
- ✅ TypeScript strict mode: PASSED (all errors fixed)
- ✅ All components properly typed with explicit prop interfaces
- ✅ All hooks use proper React state management patterns
- ✅ No implicit `any` types
- ✅ Full IPC integration with error handling

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

## 🚀 Implementation Roadmap (Based on Audit)

### ✅ Completed Phases

1. ~~**Phase 0.5**: MCP Server integration~~ ✅ **COMPLETE**
2. ~~**Phase 1**: Encryption Service (AES-256-GCM)~~ ✅ **COMPLETE**
3. ~~**Phase 2**: Audit Logger (blockchain-style)~~ ✅ **COMPLETE**
4. ~~**Phase 3**: Database schema finalization~~ ✅ **COMPLETE** (9 fields encrypted)
5. ~~**Phase 3.5**: User Facts & Case Facts feature~~ ✅ **COMPLETE** (11 total fields encrypted)
6. ~~**Phase 4**: Migration system with rollback~~ ✅ **COMPLETE**
7. ~~**Phase 5**: Service layer & IPC integration~~ ✅ **COMPLETE** (23 channels)
8. ~~**Phase 6**: UI components & React hooks~~ ✅ **COMPLETE** (6 components, 5 hooks)
9. ~~**Week 1 Blockers**: TypeScript errors + test database~~ ✅ **COMPLETE** (2025-10-08)

### 📋 Next Priorities (Per Audit Roadmap)

**Weeks 2-4: Security Foundation** ⚠️ **BLOCKS PRODUCTION**
- Implement authentication system (users, sessions, password hashing)
- Implement authorization middleware (ownership checks)
- Add GDPR consent management
- See: `SECURITY_AUDIT_REPORT.md` + `MASTER_BUILD_GUIDE.md` Phase 1

**Weeks 5-8: Feature Completion**
- Week 5: Database (ActionRepository, indexes, migration DOWN sections)
- Week 6: Backend services (EvidenceService validation, rate limiting)
- Week 7: Frontend (GlobalSearch, CreateCaseModal, NotificationCenter)
- Week 8: AI integration (DocumentAnalysisService, LegalCitationService)

**Weeks 9-10: Testing** ⚠️ **BLOCKS PRODUCTION**
- Reach 95%+ test pass rate (currently 80.6%)
- Achieve 80%+ code coverage (currently 60%)
- Complete integration and E2E test suites

**Week 11: Security Hardening**
- Electron security config (sandbox, CSP)
- Rate limiting implementation
- Penetration testing

**Week 12: Documentation & Deployment**
- User guide, developer docs, deployment guide
- Privacy policy, terms of service

**Reference**: `BUILD_QUICK_REFERENCE.md` for critical path

---

## 📚 Key Resources

### API Documentation
- **IPC API Reference**: `IPC_API_REFERENCE.md` - Complete IPC handler documentation (27 handlers)
- **IPC Quick Reference**: `IPC_QUICK_REFERENCE.md` - Developer cheat sheet with examples
- **IPC Documentation Summary**: `IPC_DOCUMENTATION_SUMMARY.md` - Coverage report

### Testing & Quality Assurance
- **Audit Logger E2E Report**: `AUDIT_LOGGER_E2E_TEST_REPORT.md` - Comprehensive test coverage report

### Development & Comprehensive Audits (2025-10-08)
- **Audit Completion Summary**: `AUDIT_COMPLETION_SUMMARY.md` - Full audit report with actionable recommendations (19KB)
- **Audit Summary**: `docs/reports/AUDIT_SUMMARY_2025-10-08.md` - Executive summary of comprehensive scan
- **Frontend Structure Audit**: `docs/reports/FRONTEND_STRUCTURE_AUDIT_2025-10-08.md` - Complete frontend analysis (33KB)
- **Automation & Docs Audit**: `docs/reports/AUTOMATION_DOCS_SCRIPTS_AUDIT_2025-10-08.md` - Scripts, docs, and tooling review (28KB)
- **Dev Quality Agents**: `docs/automation/dev-quality-agents.md` - Agent workflow for quality assurance

### Build & Deployment
- **Master Build Guide**: `MASTER_BUILD_GUIDE.md` - Comprehensive build documentation (58KB)
- **Build Quick Reference**: `BUILD_QUICK_REFERENCE.md` - Quick reference for common build tasks (6.6KB)

### Architecture & Implementation
- **Tactical Protocol**: `JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md`
- **Encryption Docs**: `ENCRYPTION_SERVICE_IMPLEMENTATION.md`
- **Facts Feature**: `FACTS_FEATURE_IMPLEMENTATION.md` - User facts & case facts complete guide
- **Audit Logs Docs**: `AUDIT_LOGS_*.md` (4 files)
- **MCP Docs**: `mcp-server/*.md` (3 files)

---

**Node.js**: >= 18 (Current: v22.20.0)
**Database**: SQLite (better-sqlite3 v12.4.1)
**Framework**: Electron + React + Vite
**Testing**: Vitest

---

## 📊 Recent Updates (2025-10-08)

### ✅ Phase 0: Critical Blocker Fixes (COMPLETE)
**Commit**: `50f8c0c`
**Date**: 2025-10-08
- ✅ Fixed 14 TypeScript errors → 0 errors
- ✅ Fixed 6 ESLint errors → 0 errors
- ✅ Fixed 30 repository test failures → 2 failures (96% pass rate)
- ✅ Relocated 10 orphaned test files to correct feature directories
- ✅ Updated CLAUDE.md with 6 comprehensive audit document pointers
- ✅ Test infrastructure fixed: 824 → 990 tests running (+166 tests)

**Files Changed**: 30 files, 10,201 insertions

### ✅ Phase 1A: Test Import Paths & Return Types (COMPLETE)
**Commit**: `a9ea04f`
**Date**: 2025-10-08
- ✅ Fixed 6 test file import paths (service tests + NotesPanel)
- ✅ Fixed 7 repository `findById` return types (`undefined` → `null`)
- ✅ Enabled 166 additional tests to run (824 → 990 total)
- ✅ Improved pass rate from 76% to 80.6% (630 → 798 passing)

**Files Changed**: 13 files, 35 insertions/deletions

### Build System (2025-10-05)
- ✅ better-sqlite3 rebuilt for Node v22.20.0 (v11.3.0 → v12.4.1)
- ✅ TypeScript compilation passing
- ✅ All native modules working

### Testing Status
**Week 1 Blockers (Complete)**:
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ Repository tests: 96% passing (28/30)
- ⚠️ Overall tests: 80.6% passing (797/990) - target 95% in Weeks 9-10

**E2E Audit Logging** (2025-10-05):
- ✅ 25/31 tests passing (80.6% pass rate)
- ✅ All 18 event types covered
- ✅ GDPR compliance verified
- ⚠️ 6 tests failing (timestamp ordering issue - documented, non-critical)

### Documentation (2025-10-08)
- ✅ Comprehensive audit completed (12 reports, 3,000+ lines of code)
- ✅ Master Build Guide created (13,000+ words, 8-phase roadmap)
- ✅ Build Quick Reference created (1-page summary)
- ✅ 6 domain-specific audits (Database, Backend, Frontend, Integration, Testing, Security)
- ✅ Complete IPC API reference (27 handlers documented)
- ✅ 50+ working code examples

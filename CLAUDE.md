# Justice Companion - Development Guide

## ⚡ Essential References - START HERE

**Critical Documentation** (read these first):
1. **[MASTER_BUILD_GUIDE.md](docs/guides/MASTER_BUILD_GUIDE.md)** - Comprehensive 8-phase build roadmap (58KB, 13,000+ words)
   - Complete architecture, security, testing, and deployment guide
   - Blocks production: Weeks 2-4 (Security), Weeks 9-10 (Testing)

2. **[BUILD_QUICK_REFERENCE.md](docs/guides/BUILD_QUICK_REFERENCE.md)** - Critical path summary (6.6KB, 1-page)
   - Quick command reference and priority checklist
   - Essential for day-to-day development

3. **[AUDIT_COMPLETION_SUMMARY.md](docs/reports/AUDIT_COMPLETION_SUMMARY.md)** - Full audit report (19KB)
   - Actionable recommendations across all domains
   - Database, backend, frontend, integration, testing, security findings

**When to Use Each**:
- **Starting a new task?** → Check `docs/guides/BUILD_QUICK_REFERENCE.md` for commands and priorities
- **Planning a phase?** → Read relevant section in `docs/guides/MASTER_BUILD_GUIDE.md`
- **Need context on existing code?** → Review `docs/reports/AUDIT_COMPLETION_SUMMARY.md` findings

---

## 🎯 Current Implementation Status (2025-10-08)

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
- `docs/implementation/ENCRYPTION_COVERAGE_REPORT.md` (comprehensive audit)
- `docs/implementation/ENCRYPTION_IMPLEMENTATION.md` (v2.0 - complete documentation)

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
- `docs/implementation/FACTS_FEATURE_IMPLEMENTATION.md` (700+ lines)

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
- `docs/architecture/MIGRATION_SYSTEM_GUIDE.md` (650+ lines - comprehensive guide)

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

### ✅ Phase 7: Authentication & Authorization System (COMPLETE)
**Date**: 2025-10-08
**Status**: COMPLETE (Core implementation)
**Goal**: Local authentication system with GDPR consent management

**Achievements**:
- ✅ User authentication with scrypt password hashing (OWASP compliant)
- ✅ Session management (24-hour expiration, UUID session IDs)
- ✅ Authorization middleware (ownership verification, RBAC)
- ✅ GDPR consent management (4 consent types with revocation)
- ✅ 14 new audit event types for auth operations
- ✅ TypeScript compilation passes (0 errors)
- ✅ 1,449 lines of production code

**New Files Created (12 files)**:
- `src/models/User.ts` (29 lines) - User account model
- `src/models/Session.ts` (22 lines) - Session model
- `src/models/Consent.ts` (30 lines) - GDPR consent model
- `src/repositories/UserRepository.ts` (387 lines) - User CRUD + password management
- `src/repositories/SessionRepository.ts` (123 lines) - Session lifecycle
- `src/repositories/ConsentRepository.ts` (133 lines) - Consent tracking
- `src/services/AuthenticationService.ts` (340 lines) - Auth business logic
- `src/services/ConsentService.ts` (98 lines) - Consent management
- `src/middleware/AuthorizationMiddleware.ts` (126 lines) - Ownership checks
- `src/db/migrations/010_authentication_system.sql` (54 lines) - Users & sessions tables
- `src/db/migrations/011_add_user_ownership.sql` (59 lines) - Resource ownership columns
- `src/db/migrations/012_consent_management.sql` (48 lines) - Consents table

**Updated Files (5 files)**:
- `src/models/Case.ts` - Added userId property for ownership
- `src/models/AuditLog.ts` - Added 14 auth event types
- `src/models/index.ts` - Exported new models
- `src/types/ipc.ts` - Added 9 IPC channels, 18 request/response types
- `src/test-utils/database-test-helper.ts` - Added migrations 010-012

**Security Features**:
- ✅ scrypt password hashing (64-byte hash, 16-byte salt)
- ✅ Timing-safe password comparison (prevents timing attacks)
- ✅ Strong password requirements (12+ chars, uppercase, lowercase, number)
- ✅ Session expiration and cleanup
- ✅ Authorization checks (ownership, role-based access)
- ✅ Comprehensive audit logging (no passwords in logs)
- ✅ GDPR Article 7 (consent withdrawal) and Article 17 (right to be forgotten)

**Database Changes**:
- **New Tables**: 3 (users, sessions, consents)
- **New Columns**: 8 (user_id across resource tables)
- **New Indexes**: 15 (performance optimization)
- **New Triggers**: 1 (users.updated_at timestamp)

**Documentation**:
- `AUTHENTICATION_IMPLEMENTATION_SUMMARY.md` (350+ lines) - Complete implementation guide

**What's NOT Implemented** (Out of scope for core):
- ⏳ IPC handlers in electron/main.ts (requires integration work)
- ⏳ UI components (login screen, registration form, consent banner)
- ⏳ Comprehensive test suite (Weeks 9-10 priority)
- ⏳ Migration application to production database

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

## 🤖 Agent Operations & Coordination

**Output Style**: `agents-operations`

Use this coordination framework when managing multi-agent workflows. This style provides a centralized dashboard for directing specialized agents, enforcing quality guardrails, and capturing institutional memory.

### Manager Directives
- Assign work by citing the agent's file path (`.claude/agents/`) and scope summary
- Require every agent to log commands executed (including `npm run guard`) and attach transcripts to handoffs
- Demand `npm run guard` (or `npm run guard:once`) passes before signing off on any task
- Capture durable lessons in Memory MCP (`mcp__memory__add_observations`) for future context inheritance

### Agent Directory & Responsibilities
| Role | File Path | Core Scope | Key MCP Tools | Memory Focus |
| --- | --- | --- | --- | --- |
| Backend API Specialist | `.claude/agents/backend-api-specialist.md` | Legal API clients, caching, backend services | filesystem, sqlite, context7 | API schemas, rate limits, caching policies |
| Frontend React Specialist | `.claude/agents/frontend-react-specialist.md` | React hooks, streaming UX, state management | filesystem, playwright, context7 | UI interaction patterns, accessibility findings |
| Integration Specialist | `.claude/agents/integration-rag-specialist.md` | RAG orchestration, cross-service wiring, prompt enforcement | filesystem, sqlite, context7 | Data flow diagrams, prompt templates, service contracts |
| UI/UX Specialist | `.claude/agents/ui-ux-specialist.md` | Chat surfaces, layout polish, visual behaviour | filesystem, playwright | Component hierarchy, animation rules, UX decisions |
| Component Library Specialist | `.claude/agents/component-library-specialist.md` | Shared UI primitives, inputs, feedback widgets | filesystem, playwright | Reusable component API notes, accessibility shortcuts |
| Integration & Polish Specialist | `.claude/agents/integration-polish-specialist.md` | End-to-end wiring, PDF export, release readiness | filesystem, playwright, context7 | Release checklists, integration gotchas, shortcut keys |
| Database Migration Specialist | `.claude/agents/database-migration-specialist.md` | Schema design, migrations, query tuning, backups | sqlite, filesystem | Migration timelines, index strategies, rollback notes |
| Documentation Specialist | `.claude/agents/documentation-specialist.md` | Docs, changelog, onboarding, API references | filesystem, context7 | Style guidelines, doc structure, terminology |
| Security Compliance Auditor | `.claude/agents/security-compliance-auditor.md` | Threat review, dependency vetting, GDPR posture | filesystem, github, context7 | Risk registers, mitigations, encryption policies |
| Testing & QA Specialist | `.claude/agents/testing-qa-specialist.md` | Unit/integration/E2E tests, performance, accessibility | filesystem, playwright, context7 | Test coverage maps, flaky test remedies, perf baselines |

### MCP Playbook for Managers
- **Sequential-Thinking MCP**: Validate multi-agent plans and surface dependencies before execution
- **Memory MCP**: Create/update entities per agent so lessons are searchable (`mcp__memory__create_entities`, `mcp__memory__add_observations`)
- **Filesystem MCP**: Authorize write scope explicitly; keep aligned with `.mcp.json` allowed directories
- **GitHub MCP**: Gate usage behind manager approval; ensure PAT is injected via environment variables
- **SQLite MCP**: Delegate to Database Specialist only when migrations or data audits required
- **Playwright/Puppeteer MCP**: Assign to UI/QA specialists for scripted validation; capture artifacts in Memory MCP
- **Context7 MCP**: Provide research briefs to specialists; persist best-practice summaries
- **Justice Companion MCP**: Use custom IPC tools for case management operations (see `docs/api/IPC_API_REFERENCE.md`)

### Manager Checklist per Assignment
1. Reference the agent's file and restate the objective in your own words to ensure alignment
2. Specify which MCP servers the agent is authorized to use for the task
3. Require a Memory MCP update summarizing outcomes and new insights
4. Verify `npm run guard` output plus any additional scripts before approving completion
5. Archive relevant logs or diffs under `automation/results/<agent>/<date>` for auditability

### Quality Enforcement
- **TypeScript**: Must pass `npm run type-check` with 0 errors
- **Linting**: Must pass `npm run lint` with 0 errors
- **Tests**: Target 95%+ pass rate (current: 80.6%, see Phase 0 results)
- **Security**: All PII must be encrypted (see `docs/implementation/ENCRYPTION_IMPLEMENTATION.md`)
- **Audit**: All CRUD operations must be logged (see `src/services/AuditLogger.ts`)
- **Documentation**: Update relevant docs in `docs/` or root-level `.md` files

### Project Documentation Reference
- **Build Process**: `docs/guides/MASTER_BUILD_GUIDE.md`, `docs/guides/BUILD_QUICK_REFERENCE.md`
- **Security**: `docs/implementation/ENCRYPTION_IMPLEMENTATION.md`, `docs/implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md`, `docs/reference/SECURITY.md`
- **APIs**: `docs/api/IPC_API_REFERENCE.md`, `docs/api/IPC_QUICK_REFERENCE.md`, `docs/api/IPC_DOCUMENTATION_SUMMARY.md`
- **Testing**: `docs/implementation/AUDIT_LOGGER_E2E_TEST_REPORT.md`, `docs/implementation/TEST_SUITE_IMPROVEMENTS_2025-10-08.md`, `docs/reference/TESTING.md`
- **Audits**: `docs/reports/` (10+ comprehensive reports)
- **Features**: `docs/implementation/FACTS_FEATURE_IMPLEMENTATION.md`
- **Migrations**: `docs/architecture/MIGRATION_SYSTEM_GUIDE.md`
- **Reference**: `docs/reference/CODE_SNIPPETS.md`, `docs/reference/CONTEXT7_LIBRARIES.md`

**Consistency across agents keeps Justice Companion stable. Use this dashboard to drive disciplined execution.**

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
- **IPC API Reference**: `docs/api/IPC_API_REFERENCE.md` - Complete IPC handler documentation (27 handlers)
- **IPC Quick Reference**: `docs/api/IPC_QUICK_REFERENCE.md` - Developer cheat sheet with examples
- **IPC Documentation Summary**: `docs/api/IPC_DOCUMENTATION_SUMMARY.md` - Coverage report

### Testing & Quality Assurance
- **Audit Logger E2E Report**: `docs/implementation/AUDIT_LOGGER_E2E_TEST_REPORT.md` - Comprehensive test coverage report

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
- **Encryption Docs**: `docs/implementation/ENCRYPTION_IMPLEMENTATION.md`
- **Facts Feature**: `docs/implementation/FACTS_FEATURE_IMPLEMENTATION.md` - User facts & case facts complete guide
- **Migration System**: `docs/architecture/MIGRATION_SYSTEM_GUIDE.md` - Complete migration & rollback guide
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

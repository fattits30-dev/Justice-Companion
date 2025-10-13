# Justice Companion - Documentation Organization Plan

> **Created**: 2025-10-13
> **Purpose**: Comprehensive categorization of all documentation files by layer (backend, frontend, architecture, etc.)
> **Status**: 🟢 Active

---

## 📁 Current Documentation Structure

### Root Level Documentation (Keep as-is)

| File                               | Category             | Purpose                                           | Status                                    |
| ---------------------------------- | -------------------- | ------------------------------------------------- | ----------------------------------------- |
| `README.md`                        | 📘 Project Overview  | Main project documentation, getting started guide | ✅ Up-to-date                             |
| `CLAUDE.md`                        | 🤖 AI Assistant      | Claude Code project memory, conventions, patterns | ✅ Up-to-date                             |
| `TODO.md`                          | 📋 Project Tracking  | Master task list, phases, progress tracking       | ✅ Up-to-date                             |
| `CONTRIBUTING.md`                  | 👥 Contributor Guide | How to contribute, code style, PR process         | ✅ Up-to-date                             |
| `AGENTS.md`                        | 🤖 Agent System      | Multi-agent orchestration documentation           | ✅ Up-to-date                             |
| `UI_OVERHAUL_ROADMAP.md`           | 🎨 Frontend Planning | UI improvement roadmap (8 phases)                 | ⚠️ Move to `docs/planning/frontend/`      |
| `VALIDATION_INTEGRATION_STATUS.md` | 🔒 Backend Status    | Validation middleware integration status          | ⚠️ Move to `docs/implementation/backend/` |

---

## 🏗️ Proposed Documentation Structure

```
docs/
├── 📂 architecture/           # System design and architecture decisions
│   ├── backend/
│   │   ├── IPC_ARCHITECTURE.md
│   │   ├── VALIDATION_ARCHITECTURE.md
│   │   ├── AUTHORIZATION_ARCHITECTURE.md
│   │   ├── ENCRYPTION_ARCHITECTURE.md
│   │   └── ERROR_TRACKING_ARCHITECTURE.md
│   ├── frontend/
│   │   ├── COMPONENT_ARCHITECTURE.md
│   │   ├── STATE_MANAGEMENT.md
│   │   └── ROUTING_ARCHITECTURE.md
│   ├── database/
│   │   ├── SCHEMA_DESIGN.md
│   │   ├── MIGRATION_STRATEGY.md
│   │   └── ENCRYPTION_STRATEGY.md
│   └── integration/
│       ├── ELECTRON_IPC.md
│       ├── AI_INTEGRATION.md
│       └── MCP_INTEGRATION.md
│
├── 📂 implementation/          # Implementation guides and status reports
│   ├── backend/
│   │   ├── AUTHENTICATION_IMPLEMENTATION_SUMMARY.md
│   │   ├── VALIDATION_INTEGRATION_STATUS.md (moved from root)
│   │   ├── AUDIT_LOGGING.md
│   │   ├── ENCRYPTION.md
│   │   └── SESSION_MANAGEMENT.md
│   ├── frontend/
│   │   ├── AUTHENTICATION_RESPONSIVE_DESIGN_2025-10-12.md
│   │   ├── FULL_UI_RESPONSIVE_OVERHAUL_2025-10-12.md
│   │   ├── LAYOUT_FIX_2025-10-12.md
│   │   └── LAYOUT_FIX_VISUAL_GUIDE.md
│   ├── database/
│   │   ├── MIGRATION_014_SUMMARY.md
│   │   └── FTS5_IMPLEMENTATION.md
│   └── testing/
│       ├── E2E_IMPLEMENTATION_SUMMARY.md
│       ├── AUTHORIZATION_E2E_TESTS.md
│       └── COVERAGE_REPORTS.md
│
├── 📂 planning/                # Project planning and roadmaps
│   ├── frontend/
│   │   ├── UI_OVERHAUL_ROADMAP.md (moved from root)
│   │   ├── COMPONENT_BREAKDOWN.md
│   │   └── DESIGN_SYSTEM_PLAN.md
│   ├── backend/
│   │   ├── API_DEVELOPMENT_PLAN.md
│   │   └── SERVICE_LAYER_PLAN.md
│   ├── security/
│   │   ├── SECURITY_ROADMAP.md
│   │   └── COMPLIANCE_CHECKLIST.md
│   └── DOCUMENTATION_CONSOLIDATED_ACTION_PLAN.md
│
├── 📂 guides/                  # Developer guides and tutorials
│   ├── development/
│   │   ├── DEVELOPMENT_WORKFLOW.md
│   │   ├── WINDOWS_DEV_QUICK_REF.md
│   │   ├── BUILD_QUICK_REFERENCE.md
│   │   └── PROCESS_MANAGEMENT.md
│   ├── mcp/
│   │   ├── MCP_SETUP_GUIDE.md
│   │   ├── MCP_QUICK_REFERENCE.md
│   │   └── MCP_TOKEN_LIMITS.md
│   ├── security/
│   │   ├── SECURE_TOKEN_SETUP.md
│   │   └── API_KEY_MIGRATION.md
│   └── integration/
│       ├── INTEGRATION_QUICK_REFERENCE.md
│       ├── CONTEXT7_USAGE_GUIDE.md
│       └── MASTER_BUILD_GUIDE.md
│
├── 📂 reference/               # Technical reference documentation
│   ├── backend/
│   │   ├── IPC_CHANNELS_REFERENCE.md
│   │   ├── SERVICE_LAYER_REFERENCE.md
│   │   ├── REPOSITORY_LAYER_REFERENCE.md
│   │   └── VALIDATION_SCHEMAS_REFERENCE.md
│   ├── frontend/
│   │   ├── COMPONENT_API_REFERENCE.md
│   │   ├── HOOKS_REFERENCE.md
│   │   └── CONTEXT_API_REFERENCE.md
│   ├── database/
│   │   ├── SCHEMA_REFERENCE.md
│   │   ├── MIGRATION_REFERENCE.md
│   │   └── QUERY_PATTERNS.md
│   ├── CODE_SNIPPETS.md
│   ├── CONTEXT7_LIBRARIES.md
│   ├── SECURITY.md
│   └── TESTING.md
│
├── 📂 flowcharts/              # Visual documentation (keep as-is)
│   ├── backend/
│   │   ├── FLOWCHART_14_AUDIT_LOGGER.md
│   │   ├── FLOWCHART_21_SERVICE_LAYER.md
│   │   └── FLOWCHART_22_IPC_COMMUNICATION.md
│   ├── frontend/
│   │   ├── FLOWCHART_01_USER_AUTHENTICATION.md
│   │   ├── FLOWCHART_02_CASE_MANAGEMENT.md
│   │   └── FLOWCHART_03_EVIDENCE_UPLOAD.md
│   ├── database/
│   │   ├── FLOWCHART_07_DATABASE_ARCHITECTURE.md
│   │   ├── FLOWCHART_12_DATABASE_MIGRATION.md
│   │   └── FLOWCHART_13_DATABASE_BACKUP.md
│   └── README.md
│
├── 📂 security/                # Security documentation
│   ├── backend/
│   │   ├── AUTHENTICATION_SECURITY.md
│   │   ├── AUTHORIZATION_SECURITY.md
│   │   ├── ENCRYPTION_SECURITY.md
│   │   └── SESSION_SECURITY.md
│   ├── frontend/
│   │   ├── XSS_PREVENTION.md
│   │   └── CSRF_PROTECTION.md
│   ├── API_KEY_MIGRATION.md
│   ├── PHASE_1_SECURE_API_KEY_STORAGE.md
│   └── SESSION_REGENERATION_IMPLEMENTATION.md
│
├── 📂 testing/                 # Testing documentation
│   ├── backend/
│   │   ├── SERVICE_TEST_GUIDE.md
│   │   ├── IPC_HANDLER_TEST_GUIDE.md
│   │   └── REPOSITORY_TEST_GUIDE.md
│   ├── frontend/
│   │   ├── COMPONENT_TEST_GUIDE.md
│   │   ├── HOOK_TEST_GUIDE.md
│   │   └── E2E_TEST_GUIDE.md
│   ├── BUILD_VERIFICATION_REPORT.md
│   ├── PHASE_1_MANUAL_TESTING_GUIDE.md
│   ├── TEST_CREDENTIALS.md
│   └── E2E_CONSENT_ISSUE_DEBUG.md
│
├── 📂 troubleshooting/         # Common issues and solutions
│   ├── backend/
│   │   ├── BETTER_SQLITE3_REBUILD.md
│   │   └── IPC_DEBUGGING.md
│   ├── frontend/
│   │   ├── COMPONENT_RENDERING_ISSUES.md
│   │   └── STATE_MANAGEMENT_DEBUGGING.md
│   └── E2E_TEST_SETUP.md
│
├── 📂 context7-snippets/       # Code pattern examples (keep as-is)
│   ├── ai/
│   ├── database/
│   ├── electron/
│   ├── react/
│   └── vite/
│
├── 📂 agents/                  # Multi-agent system docs (keep as-is)
│   ├── AGENT_HOTEL_HANDOFF.md
│   ├── HANDOFF_PATTERNS.md
│   ├── KNOWLEDGE_GRAPH_SCHEMA.md
│   ├── SWARM_EXECUTION_PLAN.md
│   └── README.md
│
├── 📂 migrations/              # Database migration docs
│   ├── 014_remove_unused_remember_me_index.md
│   └── MIGRATION_GUIDE.md (new)
│
└── 📂 archive/                 # Historical documentation (keep as-is)
    ├── 2025-01-cleanup/
    └── 2025-10-phase-0-7/
```

---

## 🔄 Migration Actions Required

### Phase 1: Move Root-Level Docs (High Priority)

1. **UI_OVERHAUL_ROADMAP.md**
   - Move to: `docs/planning/frontend/UI_OVERHAUL_ROADMAP.md`
   - Update references in: `TODO.md`, `CLAUDE.md`

2. **VALIDATION_INTEGRATION_STATUS.md**
   - Move to: `docs/implementation/backend/VALIDATION_INTEGRATION_STATUS.md`
   - Update references in: `TODO.md`

### Phase 2: Reorganize Implementation Docs (Medium Priority)

3. **Backend Implementation Docs**
   - Group in: `docs/implementation/backend/`
   - Files:
     - `AUTHENTICATION_IMPLEMENTATION_SUMMARY.md`
     - `AUTHENTICATION_OVERHAUL_2025-10-11.md`
     - `AUDIT_LOGGING.md`
     - `ENCRYPTION.md`
     - `PHASE_3_VALIDATION_COMPLETE_2025-01-13.md`

4. **Frontend Implementation Docs**
   - Group in: `docs/implementation/frontend/`
   - Files:
     - `AUTHENTICATION_RESPONSIVE_DESIGN_2025-10-12.md`
     - `FULL_UI_RESPONSIVE_OVERHAUL_2025-10-12.md`
     - `LAYOUT_FIX_2025-10-12.md`
     - `LAYOUT_FIX_VISUAL_GUIDE.md`

### Phase 3: Create New Architecture Docs (Low Priority)

5. **Backend Architecture**
   - Create: `docs/architecture/backend/IPC_ARCHITECTURE.md`
   - Extract from: `electron/main.ts` JSDoc comments
   - Content: 62 IPC channels, 3-step pattern, security model

6. **Validation Architecture**
   - Create: `docs/architecture/backend/VALIDATION_ARCHITECTURE.md`
   - Extract from: `src/middleware/ValidationMiddleware.ts`
   - Content: Zod schemas, sanitization, performance metrics

7. **Frontend Architecture**
   - Create: `docs/architecture/frontend/COMPONENT_ARCHITECTURE.md`
   - Content: Component patterns, state management, routing

### Phase 4: Create Reference Documentation (Low Priority)

8. **IPC Channels Reference**
   - Create: `docs/reference/backend/IPC_CHANNELS_REFERENCE.md`
   - Content: All 62 IPC channels with:
     - Request/response types
     - Validation schemas
     - Authorization requirements
     - Example usage

9. **Validation Schemas Reference**
   - Create: `docs/reference/backend/VALIDATION_SCHEMAS_REFERENCE.md`
   - Content: All validation schemas from `src/middleware/schemas/`
   - Include: Field requirements, validation rules, error messages

---

## 📊 Documentation Categories

### Backend Documentation

#### Electron Main Process

- **Location**: `electron/main.ts`
- **Related Docs**:
  - `docs/architecture/backend/IPC_ARCHITECTURE.md` (create)
  - `docs/flowcharts/FLOWCHART_22_IPC_COMMUNICATION.md`
  - `docs/implementation/backend/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md`

#### Validation Middleware

- **Location**: `src/middleware/`
- **Related Docs**:
  - `docs/architecture/backend/VALIDATION_ARCHITECTURE.md` (create)
  - `docs/implementation/backend/VALIDATION_INTEGRATION_STATUS.md`
  - `docs/reference/backend/VALIDATION_SCHEMAS_REFERENCE.md` (create)

#### Service Layer

- **Location**: `src/services/`
- **Related Docs**:
  - `docs/flowcharts/FLOWCHART_21_SERVICE_LAYER.md`
  - `docs/reference/backend/SERVICE_LAYER_REFERENCE.md` (create)

#### Repository Layer

- **Location**: `src/repositories/`
- **Related Docs**:
  - `docs/reference/backend/REPOSITORY_LAYER_REFERENCE.md` (create)
  - `docs/flowcharts/FLOWCHART_07_DATABASE_ARCHITECTURE.md`

#### Error Tracking

- **Location**: `src/services/EnhancedErrorTracker.ts`
- **Related Docs**:
  - `docs/ERROR_TRACKING_ARCHITECTURE.md`
  - `docs/ERROR_TRACKING_IMPLEMENTATION_SUMMARY.md`

### Frontend Documentation

#### React Components

- **Location**: `src/components/`
- **Related Docs**:
  - `docs/architecture/frontend/COMPONENT_ARCHITECTURE.md` (create)
  - `docs/planning/frontend/UI_OVERHAUL_ROADMAP.md`
  - `docs/planning/frontend/COMPONENT_BREAKDOWN.md`

#### Authentication UI

- **Location**: `src/components/auth/`
- **Related Docs**:
  - `docs/implementation/frontend/AUTHENTICATION_RESPONSIVE_DESIGN_2025-10-12.md`
  - `docs/flowcharts/FLOWCHART_01_USER_AUTHENTICATION.md`

#### Dashboard & Features

- **Location**: `src/features/`, `src/components/dashboard/`
- **Related Docs**:
  - `docs/implementation/frontend/FULL_UI_RESPONSIVE_OVERHAUL_2025-10-12.md`
  - `docs/implementation/frontend/LAYOUT_FIX_2025-10-12.md`

#### Custom Hooks

- **Location**: `src/hooks/`
- **Related Docs**:
  - `docs/reference/frontend/HOOKS_REFERENCE.md` (create)
  - `docs/testing/frontend/HOOK_TEST_GUIDE.md`

#### State Management

- **Location**: `src/contexts/`, `src/stores/`
- **Related Docs**:
  - `docs/architecture/frontend/STATE_MANAGEMENT.md` (create)

### Database Documentation

#### Schema & Migrations

- **Location**: `src/db/migrations/`
- **Related Docs**:
  - `docs/migrations/014_remove_unused_remember_me_index.md`
  - `docs/reference/database/SCHEMA_REFERENCE.md` (create)
  - `docs/architecture/database/MIGRATION_STRATEGY.md` (create)

#### Encryption Strategy

- **Location**: `src/repositories/` (encrypted fields)
- **Related Docs**:
  - `docs/architecture/database/ENCRYPTION_STRATEGY.md` (create)
  - `docs/flowcharts/FLOWCHART_05_DATA_ENCRYPTION.md`

### Testing Documentation

#### E2E Tests

- **Location**: `tests/e2e/`
- **Related Docs**:
  - `docs/testing/frontend/E2E_TEST_GUIDE.md`
  - `docs/troubleshooting/E2E_TEST_SETUP.md`

#### Unit Tests

- **Location**: `src/**/*.test.ts`, `src/**/*.test.tsx`
- **Related Docs**:
  - `docs/testing/backend/SERVICE_TEST_GUIDE.md`
  - `docs/testing/frontend/COMPONENT_TEST_GUIDE.md`

### Security Documentation

#### Authentication & Authorization

- **Location**: `src/services/AuthenticationService.ts`, `src/middleware/AuthorizationMiddleware.ts`
- **Related Docs**:
  - `docs/security/backend/AUTHENTICATION_SECURITY.md` (create)
  - `docs/security/backend/AUTHORIZATION_SECURITY.md` (create)
  - `docs/flowcharts/FLOWCHART_08_SESSION_MANAGEMENT.md`

#### Encryption

- **Location**: `src/services/EncryptionService.ts`
- **Related Docs**:
  - `docs/security/backend/ENCRYPTION_SECURITY.md` (create)
  - `docs/flowcharts/FLOWCHART_05_DATA_ENCRYPTION.md`

---

## 🎯 Quick Reference: Where to Find Documentation

### "I need to understand..."

| Topic                    | Location                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **IPC Communication**    | `electron/main.ts` + `docs/flowcharts/FLOWCHART_22_IPC_COMMUNICATION.md`                                  |
| **Validation System**    | `src/middleware/ValidationMiddleware.ts` + `docs/implementation/backend/VALIDATION_INTEGRATION_STATUS.md` |
| **Authentication Flow**  | `src/services/AuthenticationService.ts` + `docs/flowcharts/FLOWCHART_01_USER_AUTHENTICATION.md`           |
| **Authorization Checks** | `src/middleware/AuthorizationMiddleware.ts` + `docs/flowcharts/FLOWCHART_10_AUTHORIZATION_MIDDLEWARE.md`  |
| **Error Tracking**       | `src/services/EnhancedErrorTracker.ts` + `docs/ERROR_TRACKING_ARCHITECTURE.md`                            |
| **UI Components**        | `src/components/` + `docs/planning/frontend/UI_OVERHAUL_ROADMAP.md`                                       |
| **Database Schema**      | `src/db/migrations/` + `docs/flowcharts/FLOWCHART_07_DATABASE_ARCHITECTURE.md`                            |
| **Testing Strategy**     | `tests/` + `docs/testing/`                                                                                |
| **Security Policies**    | `docs/security/` + `docs/reference/SECURITY.md`                                                           |

### "I need to implement..."

| Task                       | Start Here                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **New IPC Channel**        | 1. Define schema in `src/middleware/schemas/` → 2. Register in `src/middleware/schemas/index.ts` → 3. Add handler in `electron/main.ts` |
| **New UI Component**       | 1. Check `docs/planning/frontend/COMPONENT_BREAKDOWN.md` → 2. Follow patterns in `docs/context7-snippets/react/`                        |
| **New Database Migration** | 1. Read `docs/migrations/MIGRATION_GUIDE.md` → 2. Create file in `src/db/migrations/`                                                   |
| **New Service**            | 1. Review `docs/flowcharts/FLOWCHART_21_SERVICE_LAYER.md` → 2. Follow patterns in existing services                                     |
| **New Test**               | 1. Check `docs/testing/` guides → 2. Follow patterns in similar test files                                                              |

---

## 📋 Action Items from Code Review

### Critical (Must Fix Before Merge)

- [ ] Fix `useReducedMotion` hook - add `matchMedia` null check
- [ ] Add `matchMedia` mock to test setup (vitest.setup.ts)
- [ ] Verify all 1,155 tests pass
- [ ] Fix type safety in ValidationMiddleware (use Zod type inference)

### High Priority (Fix Soon)

- [ ] Add schema verification in `ValidationMiddleware.registerSchemas()`
- [ ] Create `src/middleware/ValidationMiddleware.test.ts`
- [ ] Add dedicated audit event types (`validation.failed`, `validation.suspicious`)
- [ ] Optimize password validation (combine `.refine()` calls)

### Medium Priority (Post-Merge)

- [ ] Move magic numbers to `VALIDATION_LIMITS` constant
- [ ] Add LRU cache for validation results (5 second TTL)
- [ ] Create `src/middleware/README.md` with architecture guide
- [ ] Update `CHANGELOG.md` with breaking changes

### Low Priority (Nice to Have)

- [ ] Create `docs/reference/backend/IPC_CHANNELS_REFERENCE.md`
- [ ] Create `docs/reference/backend/VALIDATION_SCHEMAS_REFERENCE.md`
- [ ] Create `docs/architecture/backend/VALIDATION_ARCHITECTURE.md`
- [ ] Reorganize documentation per this plan

---

## 📈 Documentation Health Metrics

| Category            | Files | Status             | Priority |
| ------------------- | ----- | ------------------ | -------- |
| **Architecture**    | 1     | ⚠️ Needs expansion | HIGH     |
| **Implementation**  | 22    | ✅ Good            | MEDIUM   |
| **Planning**        | 5     | ✅ Good            | LOW      |
| **Guides**          | 12    | ✅ Excellent       | LOW      |
| **Reference**       | 5     | ⚠️ Incomplete      | HIGH     |
| **Flowcharts**      | 22    | ✅ Excellent       | LOW      |
| **Security**        | 3     | ⚠️ Needs expansion | HIGH     |
| **Testing**         | 5     | ✅ Good            | MEDIUM   |
| **Troubleshooting** | 2     | ⚠️ Incomplete      | MEDIUM   |

**Overall Health**: 🟡 **Good** (77/120 = 64%)

**Areas for Improvement**:

1. **Architecture Documentation** - Need backend, frontend, database architecture docs
2. **Reference Documentation** - Need comprehensive API references
3. **Security Documentation** - Need detailed security guides per layer

---

## 🚀 Next Steps

### Immediate (This Session)

1. ✅ Create this organization plan
2. ⏳ Move `UI_OVERHAUL_ROADMAP.md` to `docs/planning/frontend/`
3. ⏳ Move `VALIDATION_INTEGRATION_STATUS.md` to `docs/implementation/backend/`
4. ⏳ Create `src/middleware/README.md` with quick start guide

### Short-Term (Next Session)

5. Create `docs/architecture/backend/IPC_ARCHITECTURE.md`
6. Create `docs/architecture/backend/VALIDATION_ARCHITECTURE.md`
7. Create `docs/reference/backend/IPC_CHANNELS_REFERENCE.md`
8. Create `docs/reference/backend/VALIDATION_SCHEMAS_REFERENCE.md`

### Long-Term (Future)

9. Complete full documentation reorganization per structure above
10. Add missing architecture documentation for frontend and database
11. Expand security documentation with layer-specific guides
12. Create comprehensive reference documentation for all APIs

---

**Last Updated**: 2025-10-13
**Maintainer**: Justice Companion Team
**Status**: 🟢 Active Planning Phase

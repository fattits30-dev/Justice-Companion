# Justice Companion Documentation Index

Welcome to the Justice Companion documentation! This directory contains all project documentation organized by category.

## 📁 Directory Structure

```
docs/
├── api/                  # IPC API documentation
├── architecture/         # System architecture and design
├── implementation/       # Feature implementation guides
├── phases/              # Development phase reports
├── testing/             # Testing guides and references
├── reports/             # Completed work and audit reports
├── agents/              # Agent architecture and guidelines
├── security/            # Security and compliance docs (future)
├── features/            # Feature-specific docs (future)
├── COMPREHENSIVE_SCAN_2025-10-05.md
└── GDPR_COMPLIANCE.md
```

---

## 📚 Documentation by Category

### API Documentation (`api/`)

IPC (Inter-Process Communication) API documentation for Electron handlers:

- **[IPC_API_REFERENCE.md](api/IPC_API_REFERENCE.md)** - Complete IPC handler documentation (27 handlers)
- **[IPC_QUICK_REFERENCE.md](api/IPC_QUICK_REFERENCE.md)** - Developer cheat sheet with examples
- **[IPC_DOCUMENTATION_SUMMARY.md](api/IPC_DOCUMENTATION_SUMMARY.md)** - Coverage report

### Architecture Documentation (`architecture/`)

System design, protocols, and migration guides:

- **[JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md](architecture/JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md)** - Complete tactical protocol for development
- **[MIGRATION_SYSTEM_GUIDE.md](architecture/MIGRATION_SYSTEM_GUIDE.md)** - Database migration system with rollback support

### Implementation Documentation (`implementation/`)

Feature implementation guides and technical specifications:

**AI & Function Calling:**
- [AI_AGENT_TOOLS_IMPLEMENTATION_PLAN.md](implementation/AI_AGENT_TOOLS_IMPLEMENTATION_PLAN.md)
- [AI_FUNCTION_CALLING_FINAL_PLAN.md](implementation/AI_FUNCTION_CALLING_FINAL_PLAN.md)
- [FUNCTION_CALLING_QUICK_START.md](implementation/FUNCTION_CALLING_QUICK_START.md)
- [LOCAL_AI_FUNCTION_CALLING_PLAN.md](implementation/LOCAL_AI_FUNCTION_CALLING_PLAN.md)

**Security & Audit:**
- [AUDIT_LOGGER_E2E_TEST_REPORT.md](implementation/AUDIT_LOGGER_E2E_TEST_REPORT.md) - E2E test coverage report
- [AUDIT_LOGS_CHECKLIST.md](implementation/AUDIT_LOGS_CHECKLIST.md)
- [AUDIT_LOGS_MIGRATION_SUMMARY.md](implementation/AUDIT_LOGS_MIGRATION_SUMMARY.md)
- [AUDIT_LOGS_QUICK_REFERENCE.md](implementation/AUDIT_LOGS_QUICK_REFERENCE.md)
- [AUDIT_LOGS_SCHEMA.txt](implementation/AUDIT_LOGS_SCHEMA.txt)

**Encryption:**
- [ENCRYPTION_IMPLEMENTATION.md](implementation/ENCRYPTION_IMPLEMENTATION.md) - AES-256-GCM encryption service
- [ENCRYPTION-IMPLEMENTATION.md](implementation/ENCRYPTION-IMPLEMENTATION.md) - Legacy encryption docs
- [ENCRYPTION_COVERAGE_REPORT.md](implementation/ENCRYPTION_COVERAGE_REPORT.md) - Field coverage analysis

**Feature Implementations:**
- [FACTS_FEATURE_IMPLEMENTATION.md](implementation/FACTS_FEATURE_IMPLEMENTATION.md) - User facts & case facts complete guide
- [ERROR_BOUNDARIES_IMPLEMENTATION.md](implementation/ERROR_BOUNDARIES_IMPLEMENTATION.md) - React error boundaries
- [EVIDENCE_IPC_IMPLEMENTATION_REPORT.md](implementation/EVIDENCE_IPC_IMPLEMENTATION_REPORT.md) - Evidence IPC handlers

**MCP Server:**
- [MCP_VERIFICATION_REPORT.md](implementation/MCP_VERIFICATION_REPORT.md)
- [MCP_REORGANIZATION_SUMMARY.md](implementation/MCP_REORGANIZATION_SUMMARY.md)

### Phase Documentation (`phases/`)

Development phase completion reports and progress tracking:

- **[PHASE_3_4_COMPLETION_REPORT.md](phases/PHASE_3_4_COMPLETION_REPORT.md)** - Phase 3 & 4 completion
- **[PHASE_5_6_PROGRESS.md](phases/PHASE_5_6_PROGRESS.md)** - Phase 5 & 6 progress tracking
- **[AGENT_FOXTROT_COMPLETION_REPORT.md](phases/AGENT_FOXTROT_COMPLETION_REPORT.md)** - Agent Foxtrot deliverables

### Testing Documentation (`testing/`)

Testing guides, strategies, and references:

**Getting Started:**
- **[E2E_QUICK_START.md](testing/E2E_QUICK_START.md)** - Quick start guide for E2E testing
- **[E2E_TESTING_GUIDE.md](testing/E2E_TESTING_GUIDE.md)** - Comprehensive E2E testing guide
- **[TEST_FILES_REFERENCE.md](testing/TEST_FILES_REFERENCE.md)** - Index of all test files

**Test Reports:**
- [FINAL_TEST_IMPLEMENTATION_REPORT.md](testing/FINAL_TEST_IMPLEMENTATION_REPORT.md) - Test implementation summary
- [IPC_HANDLER_TEST_REPORT.md](testing/IPC_HANDLER_TEST_REPORT.md) - IPC handler test documentation

### Reports (`reports/`)

Completed work reports, audits, and cleanup summaries:

**2025-10-08 Audits:**
- [AUDIT_SUMMARY_2025-10-08.md](reports/AUDIT_SUMMARY_2025-10-08.md) - Overall audit summary
- [AUTOMATION_DOCS_SCRIPTS_AUDIT_2025-10-08.md](reports/AUTOMATION_DOCS_SCRIPTS_AUDIT_2025-10-08.md) - Automation/docs/scripts audit
- [FRONTEND_STRUCTURE_AUDIT_2025-10-08.md](reports/FRONTEND_STRUCTURE_AUDIT_2025-10-08.md) - Frontend structure audit

**Test Summaries:**
- [E2E_IMPLEMENTATION_SUMMARY.md](reports/E2E_IMPLEMENTATION_SUMMARY.md)
- [HOOK_TESTS_SUMMARY.md](reports/HOOK_TESTS_SUMMARY.md)
- [IPC_HANDLER_TESTS_SUMMARY.md](reports/IPC_HANDLER_TESTS_SUMMARY.md)
- [IPC_HANDLER_TEST_COVERAGE_REPORT.md](reports/IPC_HANDLER_TEST_COVERAGE_REPORT.md)
- [SERVICE_TESTS_SUMMARY.md](reports/SERVICE_TESTS_SUMMARY.md)
- [TEST_FIXES_SUMMARY.md](reports/TEST_FIXES_SUMMARY.md)

**Cleanup Reports:**
- [ESLINT_CLEANUP_FINAL_REPORT.md](reports/ESLINT_CLEANUP_FINAL_REPORT.md)
- [QA_TEST_FILE_LINT_FIXES.md](reports/QA_TEST_FILE_LINT_FIXES.md)
- [TEST_FILE_ESLINT_CLEANUP_REPORT.md](reports/TEST_FILE_ESLINT_CLEANUP_REPORT.md)

### Agent Documentation (`agents/`)

Multi-agent architecture and guidelines:

- **[AGENTS.md](agents/AGENTS.md)** - Agent architecture, roles, and guidelines

### Root-Level Documentation

Essential documentation kept at repository root:

- **[../CLAUDE.md](../CLAUDE.md)** - Primary development guide (referenced by Claude Code)
- **[../TESTING.md](../TESTING.md)** - Primary testing documentation

### Compliance & Security

- **[GDPR_COMPLIANCE.md](GDPR_COMPLIANCE.md)** - GDPR compliance documentation

---

## 🔍 Quick Links

### For New Developers
1. Start with [CLAUDE.md](../CLAUDE.md) for project overview
2. Review [JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md](architecture/JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md) for development workflow
3. Check [IPC_QUICK_REFERENCE.md](api/IPC_QUICK_REFERENCE.md) for API examples
4. Read [E2E_QUICK_START.md](testing/E2E_QUICK_START.md) for testing setup

### For Feature Implementation
1. Review existing implementations in `implementation/`
2. Check phase progress in `phases/`
3. Follow security patterns from encryption/audit docs
4. Document following patterns in existing guides

### For Testing
1. Start with [E2E_TESTING_GUIDE.md](testing/E2E_TESTING_GUIDE.md)
2. Reference [TEST_FILES_REFERENCE.md](testing/TEST_FILES_REFERENCE.md)
3. Check test reports in `reports/` for patterns

### For Architecture Changes
1. Review [JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md](architecture/JUSTICE_COMPANION_TACTICAL_PROTOCOL_v2.md)
2. Check [MIGRATION_SYSTEM_GUIDE.md](architecture/MIGRATION_SYSTEM_GUIDE.md) for database changes
3. Follow security patterns from `implementation/`

---

## 📊 Documentation Statistics

- **Total Documentation Files**: 50+ files
- **Categories**: 7 major categories
- **Coverage**: API (3), Architecture (2), Implementation (17), Phases (3), Testing (5), Reports (12), Agents (1)
- **Last Updated**: 2025-10-08

---

## 🔄 Maintenance

This index should be updated when:
- New documentation files are added
- Files are moved or reorganized
- Major feature documentation is completed
- Phase reports are finalized

**Maintained by**: Documentation Specialist (Agent Juliet)

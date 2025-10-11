# Justice Companion Documentation

This directory contains comprehensive documentation for the Justice Companion application.

## 📚 Documentation Structure

### `/planning/` ⭐ NEW

**Strategic planning and architecture documents** (created 2025-11-11)

- **[PROJECT_ARCHITECTURE_PLAN.md](planning/PROJECT_ARCHITECTURE_PLAN.md)** - Comprehensive 12-week roadmap to production
  - Technology stack assessment (all components rated excellent)
  - Current state analysis (68% complete)
  - 5-phase implementation plan
  - Risk assessment and mitigation strategies

- **[EXECUTIVE_SUMMARY.md](planning/EXECUTIVE_SUMMARY.md)** - High-level project overview
  - Project health dashboard with visual metrics
  - Critical status indicators
  - Resource requirements (3 options)
  - Success criteria and next steps

- **[COMPONENT_BREAKDOWN.md](planning/COMPONENT_BREAKDOWN.md)** - Detailed component inventory
  - 15 database tables with encryption status
  - 12 repositories with test coverage
  - 11 services with implementation status
  - 27 IPC handlers
  - 50+ UI components

- **[IMMEDIATE_ACTION_PLAN.md](planning/IMMEDIATE_ACTION_PLAN.md)** - Critical action plan
  - Fix better-sqlite3 native module (2 hours)
  - Step-by-step instructions
  - Verification checklist
  - Next steps for all 5 phases

### `/implementation/`

Detailed implementation summaries for major features.

- **[AUTHENTICATION.md](implementation/AUTHENTICATION.md)** - Authentication system implementation
- **[AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)** - Complete authentication overview
  - Security features (scrypt hashing, session management)
  - Database schema (users, sessions, consents)
  - API documentation
  - Testing guide
- **[ENCRYPTION.md](implementation/ENCRYPTION.md)** - Encryption implementation guide
- **[AUDIT_LOGGING.md](implementation/AUDIT_LOGGING.md)** - Audit logging system
- **[MCP_SETUP_CHECKLIST.md](implementation/MCP_SETUP_CHECKLIST.md)** - MCP server setup
- **[WINDOWS_OPTIMIZATION_2025-10-10.md](implementation/WINDOWS_OPTIMIZATION_2025-10-10.md)** - Windows optimizations

### `/guides/`

Development guides and quick references.

- **[MASTER_BUILD_GUIDE.md](guides/MASTER_BUILD_GUIDE.md)** - Comprehensive 8-phase build roadmap
- **[BUILD_QUICK_REFERENCE.md](guides/BUILD_QUICK_REFERENCE.md)** - Quick command reference
- **[CONTEXT7_USAGE_GUIDE.md](guides/CONTEXT7_USAGE_GUIDE.md)** - Context7 MCP usage
- **[DEVELOPMENT_WORKFLOW.md](guides/DEVELOPMENT_WORKFLOW.md)** - Development workflow
- **[MCP_SETUP_GUIDE.md](guides/MCP_SETUP_GUIDE.md)** - MCP server setup guide
- **[SECURE_TOKEN_SETUP.md](guides/SECURE_TOKEN_SETUP.md)** - Secure token configuration
- **[WINDOWS_CLI_OPTIMIZATION.md](guides/WINDOWS_CLI_OPTIMIZATION.md)** - Windows CLI optimization
- **[WINDOWS_DEV_QUICK_REF.md](guides/WINDOWS_DEV_QUICK_REF.md)** - Windows development reference

### `/flowcharts/`

Visual flowcharts for all major features (22 flowcharts).

- Authentication, case management, evidence upload, AI assistant
- Data encryption, GDPR compliance, database architecture
- Session management, authorization, audit logging
- Full-text search, notes, timeline, facts management
- See [flowcharts/README.md](flowcharts/README.md) for complete list

### `/troubleshooting/`

Technical troubleshooting guides and known issues.

- **[BETTER_SQLITE3_REBUILD.md](troubleshooting/BETTER_SQLITE3_REBUILD.md)** - Fix for better-sqlite3 native module rebuild issues
  - Common error: `NODE_MODULE_VERSION` mismatch
  - Affects: Authentication services, database operations
  - Solution: `pnpm rebuild better-sqlite3`

### `/reference/`

Reference documentation and code snippets.

- **[CODE_SNIPPETS.md](reference/CODE_SNIPPETS.md)** - Reusable code patterns
- **[CONTEXT7_LIBRARIES.md](reference/CONTEXT7_LIBRARIES.md)** - Context7 library references
- **[SECURITY.md](reference/SECURITY.md)** - Security guidelines
- **[TESTING.md](reference/TESTING.md)** - Testing guidelines

### `/context7-snippets/`

Context7 MCP code snippets organized by technology.

- `ai/` - AI integration patterns (OpenAI, Anthropic)
- `database/` - SQLite patterns and best practices
- `electron/` - Electron-specific patterns
- `react/` - React component patterns
- `vite/` - Vite build configuration

### `/security/`

Security documentation and guidelines.

### `/archive/`

Historical documentation and audit reports.

- `2025-10-phase-0-7/` - Phase 0-7 completion reports and audits

### Root Documentation Files

- **[IMPLEMENTATION_AUDIT_REPORT.md](IMPLEMENTATION_AUDIT_REPORT.md)** - Flowchart-by-flowchart implementation verification
  - 95% compliance (20/22 flowcharts fully implemented)
  - Dated 2025-10-10 (current state)
  - Comprehensive evidence and file references

## 🔍 Quick References

### 🚀 Getting Started (New Users)

**Start here**: [planning/EXECUTIVE_SUMMARY.md](planning/EXECUTIVE_SUMMARY.md)

**Then review**:

1. [planning/PROJECT_ARCHITECTURE_PLAN.md](planning/PROJECT_ARCHITECTURE_PLAN.md) - Full roadmap
2. [planning/IMMEDIATE_ACTION_PLAN.md](planning/IMMEDIATE_ACTION_PLAN.md) - Critical fixes
3. [guides/BUILD_QUICK_REFERENCE.md](guides/BUILD_QUICK_REFERENCE.md) - Command reference

### 🏗️ Project Planning & Architecture

See: [planning/](planning/)

**Current Status**: 68% complete, 12 weeks to production

**Key Documents**:

- **Executive Summary** - High-level overview with health dashboard
- **Architecture Plan** - Comprehensive 12-week roadmap
- **Component Breakdown** - Detailed inventory of all components
- **Immediate Action Plan** - Critical fixes and next steps

### 🔐 Authentication System

See: [implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)

**Key Features**:

- OWASP-compliant password hashing (scrypt)
- 24-hour session management
- Role-based access control
- Comprehensive audit logging
- GDPR consent management

### 🔧 Database Issues

See: [troubleshooting/BETTER_SQLITE3_REBUILD.md](troubleshooting/BETTER_SQLITE3_REBUILD.md)

**Common Symptoms**:

- ⚠️ Authentication services fail to initialize
- ❌ Database operations fail silently
- Error: `NODE_MODULE_VERSION` mismatch

**Quick Fix**:

```bash
pnpm rebuild better-sqlite3
```

### 📊 Implementation Status

See: [IMPLEMENTATION_AUDIT_REPORT.md](IMPLEMENTATION_AUDIT_REPORT.md)

**Overall Compliance**: 95% (20/22 flowcharts fully implemented)

**Status**:

- ✅ Authentication system (100%)
- ✅ Encryption service (100%)
- ✅ Audit logging (100%)
- ✅ GDPR compliance (100%)
- ⚠️ Testing coverage (68.8% - target 95%)

## 🚀 Getting Started

### For Developers

1. **Clone the repository**

   ```bash
   git clone https://github.com/fattits30-dev/Justice-Companion.git
   cd Justice-Companion
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   # Postinstall automatically rebuilds better-sqlite3
   ```

3. **Verify database**

   ```bash
   pnpm db:migrate:status
   node scripts/check-db.mjs
   ```

4. **Run tests**

   ```bash
   pnpm test
   ```

### For Troubleshooting

If you encounter issues:

1. **Database errors** → See [troubleshooting/BETTER_SQLITE3_REBUILD.md](troubleshooting/BETTER_SQLITE3_REBUILD.md)
2. **Authentication issues** → See [implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)
3. **General health** → See [COMPREHENSIVE_SCAN_2025-10-05.md](COMPREHENSIVE_SCAN_2025-10-05.md)

## 📝 Documentation Standards

### File Naming

- Use descriptive ALL_CAPS_WITH_UNDERSCORES.md for main documents
- Include dates for time-sensitive reports: `SCAN_2025-10-05.md`
- Group related docs in subdirectories

### Content Structure

- Start with a clear title and description
- Use emoji for visual hierarchy (✅ ⚠️ ❌ 📊 🔍)
- Include code examples where relevant
- Provide clear action items and next steps

### Updating Documentation

- Keep docs in sync with code changes
- Update timestamps on time-sensitive reports
- Add new troubleshooting guides as issues are discovered
- Document all major feature implementations

## 🔗 Related Resources

- [Main README](../README.md) - Project overview and setup
- [package.json](../package.json) - Scripts and dependencies
- [Scripts README](../scripts/README.md) - Utility scripts documentation

## 📧 Support

For questions or issues not covered in this documentation:

- Open an issue on GitHub
- Check existing issues for similar problems
- Refer to inline code comments for implementation details

---

**Last updated**: 2025-11-11

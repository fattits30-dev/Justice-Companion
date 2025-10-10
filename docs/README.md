# Justice Companion Documentation

This directory contains comprehensive documentation for the Justice Companion application.

## 📚 Documentation Structure

### `/troubleshooting/`
Technical troubleshooting guides and known issues.

- **[BETTER_SQLITE3_REBUILD.md](troubleshooting/BETTER_SQLITE3_REBUILD.md)** - Fix for better-sqlite3 native module rebuild issues
  - Common error: `NODE_MODULE_VERSION` mismatch
  - Affects: Authentication services, database operations
  - Solution: `npx electron-rebuild -f -w better-sqlite3`

### `/implementation/`
Detailed implementation summaries for major features.

- **[AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)** - Complete authentication system overview
  - Security features (scrypt hashing, session management)
  - Database schema (users, sessions, consents)
  - API documentation
  - Testing guide

### Root Documentation Files

- **[COMPREHENSIVE_SCAN_2025-10-05.md](COMPREHENSIVE_SCAN_2025-10-05.md)** - Full codebase health assessment
  - Domain scores and analysis
  - Critical blockers and action plan
  - Metrics and KPIs
  - Testing status

## 🔍 Quick References

### Authentication System
See: [implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](implementation/AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)

**Key Features**:
- OWASP-compliant password hashing (scrypt)
- 24-hour session management
- Role-based access control
- Comprehensive audit logging
- GDPR consent management

### Database Issues
See: [troubleshooting/BETTER_SQLITE3_REBUILD.md](troubleshooting/BETTER_SQLITE3_REBUILD.md)

**Common Symptoms**:
- ⚠️ Authentication services fail to initialize
- ❌ Database operations fail silently
- Error: `NODE_MODULE_VERSION` mismatch

**Quick Fix**:
```bash
npx electron-rebuild -f -w better-sqlite3
```

### Health Assessment
See: [COMPREHENSIVE_SCAN_2025-10-05.md](COMPREHENSIVE_SCAN_2025-10-05.md)

**Overall Health Score**: 72/100

**Critical Blockers**:
1. better-sqlite3 rebuild (1h to fix)
2. Evidence IPC handlers (6h to implement)
3. Mock data removal (4h to complete)

## 🚀 Getting Started

### For Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/fattits30-dev/Justice-Companion.git
   cd Justice-Companion
   ```

2. **Install dependencies**
   ```bash
   npm install
   # Postinstall automatically rebuilds better-sqlite3
   ```

3. **Verify database**
   ```bash
   npm run db:migrate:status
   node scripts/check-db.mjs
   ```

4. **Run tests**
   ```bash
   npm test
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

*Last updated: 2025-10-10*

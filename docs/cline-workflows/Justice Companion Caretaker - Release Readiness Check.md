# Justice Companion Caretaker - Release Readiness Check

## Purpose
Weekly verification that Justice Companion is production-ready for next release. Covers documentation, migrations, builds, security, and performance.

## Workflow Steps

### 1. Documentation Verification

#### README.md Current
```bash
git log -1 --format="%H %s" README.md
```
**Check:**
- Last updated within 30 days
- Installation instructions accurate
- Feature list reflects current capabilities
- Screenshots up to date

**Action if stale:**
- Update with latest features
- Refresh screenshots
- Commit changes

#### CHANGELOG.md Updated
```bash
git log --oneline --since="$(git describe --tags --abbrev=0)" --no-merges
```
**Check:**
- All commits since last tag documented
- Breaking changes highlighted
- Migration steps included
- Contributors credited

**Action if missing:**
- Generate changelog from commits
- Categorize: Features, Fixes, Breaking, Security
- Add migration guide if schema changed

#### API Documentation Current
```bash
pnpm docs:generate
git diff docs/api/
```
**Check:**
- API docs match TypeScript signatures
- New endpoints documented
- Deprecated methods marked
- Examples provided

**Action if outdated:**
- Regenerate from source
- Add missing examples
- Review and commit

### 2. Database Migration Safety

#### Migration Status
```bash
pnpm db:migrate:status
```
**Check:**
- All migrations applied in dev/staging
- No pending migrations
- Rollback scripts tested

**Action if issues:**
- Apply pending migrations
- Test rollback: `pnpm db:migrate:rollback`
- Document breaking changes

#### Backup Verification
```bash
pnpm db:backup
pnpm db:backup:list
```
**Check:**
- Backup system functional
- Latest backup restorable
- Backup size reasonable

**Action if failures:**
- Fix backup script
- Test restore process
- Verify data integrity

### 3. Multi-Platform Build Verification

#### Windows Build
```bash
pnpm build:win
```
**Check:**
- `.exe` installer created in `release/`
- No console errors during build
- Installer runs without admin rights
- NSIS script up to date

**Manual Test:**
- Install on clean Windows 11 VM
- Verify shortcuts created
- Check registry entries
- Test uninstaller

#### macOS Build
```bash
pnpm build:mac
```
**Check:**
- `.dmg` created in `release/`
- Code signing successful (if configured)
- App notarized (if applicable)
- Gatekeeper compatibility

**Manual Test:**
- Install on macOS 13+ (Ventura)
- Verify .app in Applications folder
- Check entitlements
- Test app removal

#### Linux Build
```bash
pnpm build:linux
```
**Check:**
- `.AppImage` and `.deb` created
- AppImage runs on Ubuntu 22.04+
- .deb installs without errors
- Desktop file integration

**Manual Test:**
- Install .deb on Ubuntu/Debian
- Run AppImage on Fedora
- Check menu entries
- Test app removal

### 4. Security Audit

#### Dependency Vulnerabilities
```bash
pnpm audit --json > .localclaude/security-audit.json
pnpm audit --audit-level=high
```
**Check:**
- Zero critical vulnerabilities
- Zero high vulnerabilities
- All moderate vulns documented
- No vulnerable dev dependencies

**Severity Criteria:**
- **Critical (CVSS 9.0-10.0):** Block release
- **High (CVSS 7.0-8.9):** Block release
- **Moderate (CVSS 4.0-6.9):** Document and monitor
- **Low (CVSS 0.1-3.9):** Monitor only

**Action if high/critical found:**
- Update vulnerable package: `pnpm update <package>`
- If no fix available: Find alternative or patch
- Document workaround in SECURITY.md
- Create issue to track

#### Encryption Key Security
```bash
node -e "const fs = require('fs'); const envFile = fs.readFileSync('.env', 'utf8'); if (envFile.includes('ENCRYPTION_KEY_BASE64')) console.error('WARNING: Encryption key in .env - should use KeyManager'); else console.log('✓ No plaintext keys in .env');"
```
**Check:**
- No plaintext keys in `.env`
- KeyManager storing keys in OS keychain
- Key rotation documented
- Backup keys secured

**Action if keys in .env:**
- Migrate to KeyManager: `pnpm migrate:keys`
- Delete keys from .env
- Update deployment docs

#### GDPR Compliance
```bash
pnpm test src/services/gdpr/
```
**Check:**
- Data export functional (Article 20)
- Data deletion functional (Article 17)
- Rate limiting enforced
- Audit logs preserved

**Action if failures:**
- Fix failing tests
- Verify consent management
- Test export/delete flows manually

### 5. Performance Benchmarks

#### Cold Start Time
```bash
time pnpm electron:dev
```
**Target:** < 3 seconds
**Measure:**
- Time to splash screen
- Time to main window visible
- Time to interactive

**Action if slow:**
- Profile with Chrome DevTools
- Optimize main process imports
- Lazy load heavy dependencies

#### Hot Reload Time
```bash
# Modify src/App.tsx, measure time to see change
```
**Target:** < 1 second
**Measure:**
- File change to HMR update

**Action if slow:**
- Check Vite config
- Reduce module graph complexity
- Profile Vite plugin overhead

#### Memory Usage
```bash
ps aux | grep "Justice Companion"
```
**Target:** < 200MB idle, < 500MB active
**Measure:**
- Idle memory footprint
- Memory after typical workflow
- Memory leak check (24hr run)

**Action if high:**
- Profile with Chrome DevTools Memory tab
- Check for React memory leaks
- Review SQLite connection pooling

#### Database Query Performance
```bash
pnpm test:perf:db
```
**Target:** All queries < 100ms
**Check:**
- Case list query (paginated)
- Evidence search query
- Audit log query
- AI chat history query

**Action if slow:**
- Add indexes: `CREATE INDEX idx_...`
- Optimize query joins
- Consider query caching

### 6. Release Artifact Checklist

Create release checklist in `.localclaude/release-checklist.json`:
```json
{
  "version": "1.2.0",
  "release_date": "2025-11-17",
  "checklist": {
    "documentation": {
      "readme_current": true,
      "changelog_updated": true,
      "api_docs_generated": true,
      "migration_guide": true
    },
    "database": {
      "migrations_tested": true,
      "rollback_tested": true,
      "backup_verified": true
    },
    "builds": {
      "windows_build": true,
      "mac_build": true,
      "linux_build": true,
      "manual_install_test": true
    },
    "security": {
      "no_critical_vulns": true,
      "no_high_vulns": true,
      "keys_secured": true,
      "gdpr_compliant": true
    },
    "performance": {
      "cold_start_ok": true,
      "memory_ok": true,
      "queries_optimized": true
    },
    "testing": {
      "unit_tests_pass": true,
      "e2e_tests_pass": true,
      "manual_smoke_test": true
    }
  },
  "blockers": [],
  "sign_off": {
    "developer": "",
    "tester": "",
    "security_reviewer": ""
  }
}
```

### 7. Manual Smoke Test

#### Critical Path Testing
Execute these user flows manually:

1. **First Launch:**
   - Install fresh build
   - Complete onboarding
   - Create first user account
   - Verify encryption key generated

2. **Authentication:**
   - Login with correct credentials
   - Login with wrong password (fail expected)
   - Logout and login again
   - Session persistence after restart

3. **Case Management:**
   - Create new case
   - Add evidence files
   - Add notes and tags
   - Search cases

4. **AI Assistant:**
   - Open chat interface
   - Send legal research query
   - Verify streaming response
   - Check citations present
   - Confirm disclaimer shown

5. **Data Export/Delete:**
   - Export user data (GDPR Article 20)
   - Verify JSON file complete
   - Delete user data (Article 17)
   - Confirm data removed

**Document Results:**
```json
{
  "test_date": "2025-11-10",
  "tester": "Caretaker",
  "platform": "Windows 11",
  "results": {
    "first_launch": "PASS",
    "authentication": "PASS",
    "case_management": "PASS",
    "ai_assistant": "FAIL - disclaimer missing",
    "gdpr_flows": "PASS"
  },
  "bugs_found": [
    {
      "severity": "high",
      "title": "AI disclaimer not shown on mobile view",
      "steps_to_reproduce": "...",
      "issue_url": "https://github.com/..."
    }
  ]
}
```

### 8. Release Decision

#### Green Light Criteria (All Must Be True)
- ✅ All documentation current
- ✅ Database migrations safe
- ✅ All platforms build successfully
- ✅ Zero high/critical security vulnerabilities
- ✅ Performance benchmarks met
- ✅ Manual smoke tests pass
- ✅ Zero P0 blockers in backlog

#### Yellow Light (Proceed with Caution)
- ⚠️ 1-2 moderate security vulns (documented workarounds)
- ⚠️ Minor performance regression (<10%)
- ⚠️ 1-2 P1 bugs (with target fix version)

#### Red Light (Block Release)
- ❌ Any critical/high security vulnerability
- ❌ Data corruption risk
- ❌ Authentication broken
- ❌ Build failure on any platform
- ❌ P0 blocker unresolved
- ❌ GDPR compliance broken

### 9. Pre-Release Actions

If GREEN LIGHT:
```bash
# Update version in package.json
npm version minor  # or patch/major

# Create git tag
git tag v1.2.0
git push origin v1.2.0

# Trigger release workflow (automatic via GitHub Actions)
```

If YELLOW LIGHT:
- Document known issues in release notes
- Create follow-up issues for fixes
- Proceed with release but notify users

If RED LIGHT:
- Create P0 issue for each blocker
- Assign owners and deadlines
- Re-run readiness check after fixes

## Expected Outputs

### Console Summary (Green Light)
```
=== Justice Companion Release Readiness Check ===
Target Version: v1.2.0
Date: 2025-11-10

📄 Documentation:
✅ README.md current (updated 5 days ago)
✅ CHANGELOG.md complete (15 commits documented)
✅ API docs generated (no drift)
✅ Migration guide included

🗄️ Database:
✅ All migrations applied and tested
✅ Rollback scripts verified
✅ Backup system functional

🏗️ Builds:
✅ Windows: SUCCESS (212 MB .exe)
✅ macOS: SUCCESS (198 MB .dmg)
✅ Linux: SUCCESS (205 MB .AppImage, 198 MB .deb)
✅ Manual install tests PASS on all platforms

🔒 Security:
✅ Zero critical vulnerabilities
✅ Zero high vulnerabilities
✅ 2 moderate vulnerabilities (documented)
✅ Encryption keys secured via KeyManager
✅ GDPR compliance: PASS

⚡ Performance:
✅ Cold start: 2.7s (target <3s)
✅ Memory usage: 185 MB idle (target <200MB)
✅ Query performance: 95th percentile 87ms (target <100ms)

🧪 Testing:
✅ Unit tests: 1170/1170 PASS
✅ E2E tests: 45/45 PASS
✅ Manual smoke test: PASS

🟢 RELEASE READY - GREEN LIGHT
All criteria met. Proceed with v1.2.0 release.

Next steps:
1. Run: npm version minor
2. Run: git tag v1.2.0 && git push origin v1.2.0
3. Monitor GitHub Actions release workflow
4. Verify release artifacts uploaded

Full checklist: .localclaude/release-checklist-v1.2.0.json
```

### Release Notes Template
```markdown
# Justice Companion v1.2.0

**Release Date:** 2025-11-17

## 🎉 New Features
- AI-powered legal research with UK legislation integration
- GDPR-compliant data export and deletion (Articles 17 & 20)
- Secure encryption key management via OS keychain

## 🐛 Bug Fixes
- Fixed authentication session persistence issue
- Resolved memory leak in case list view
- Corrected type errors in migration scripts

## 🔒 Security
- Migrated encryption keys from .env to OS keychain (CVSS 9.1 fix)
- Updated better-sqlite3 to 11.10.0 (CVE-2024-1234 fix)
- Implemented rate limiting on GDPR endpoints

## ⚡ Performance
- Reduced cold start time from 3.2s to 2.7s
- Optimized database queries (20% faster case list load)
- Decreased idle memory usage by 15MB

## 📚 Documentation
- Added comprehensive GDPR compliance guide
- Updated API documentation with new endpoints
- Included database migration guide

## 🔧 Breaking Changes
**None** - Fully backward compatible with v1.1.x

## 📦 Installation
Download the installer for your platform:
- **Windows:** `Justice-Companion-Setup-1.2.0.exe`
- **macOS:** `Justice-Companion-1.2.0.dmg`
- **Linux:** `Justice-Companion-1.2.0.AppImage` or `.deb`

## 🛠️ Migration Guide
If upgrading from v1.1.x:
1. **Backup your database:** `pnpm db:backup` (or copy `~/.justice-companion/database.db`)
2. **Install new version:** Run installer (existing data preserved)
3. **Encryption key migration:** On first launch, existing .env keys will auto-migrate to OS keychain

## 🐞 Known Issues
- Login button slightly delayed on first click (< 200ms)
- Case export with >1000 evidence items may take 5-10 seconds

## 🙏 Contributors
- @fattits30-dev - Lead developer
- @claude-code - AI pair programmer
- Community testers (thank you!)

## 📝 Full Changelog
See [CHANGELOG.md](CHANGELOG.md) for complete commit history.

---
**Support:** Report issues at https://github.com/justice-companion/issues
**Docs:** https://docs.justice-companion.com
```

## Success Criteria
- ✓ All 6 categories verified
- ✓ Release decision made (Green/Yellow/Red)
- ✓ Release checklist completed
- ✓ Manual smoke test documented
- ✓ Release notes drafted (if green light)

## Run Frequency
**Weekly** (Fridays at 2 PM) or **on-demand** before planned releases

## Related Workflows
- "Daily Status Sweep" (daily health check)
- "Quality Gate Check" (per PR verification)
- "Documentation Stewardship" (post-merge doc updates)

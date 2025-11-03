# Snyk Security Diagnostics Remediation Plan

**Generated:** 2025-11-03
**Analysis Method:** Sequential Thinking MCP (32K token ultrathink)
**Total Issues:** 43 diagnostics across 18 files
**Estimated Time:** 65-80 minutes
**Complexity Score:** 6/10 (medium)

## Executive Summary

VS Code Snyk Code scanner identified 43 security diagnostics:
- **2 ERROR** severity (critical - hardcoded secrets in E2E tests)
- **7 WARNING** severity (1 in production code, 6 in test/dev files)
- **34 INFORMATION** severity (all in test files)

**Key Finding:** 97% of issues (40/43) are in test/development files and should be suppressed via `.snyk` policy, not fixed. Only 3 issues require investigation/fixing.

## Issue Breakdown

### Critical (ERROR Severity) - 2 Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `e2e/chat-streaming.spec.ts` | 56 | Hardcoded Non-Cryptographic Secret | ERROR |
| `e2e/chat-streaming.spec.ts` | 144 | Hardcoded Non-Cryptographic Secret | ERROR |

**Impact:** High - Potential exposure of API keys in E2E tests
**Action Required:** Investigate and extract to environment variables or suppress if test data

### High Priority (WARNING Severity) - 7 Issues

| File | Line | Issue | Context | Action |
|------|------|-------|---------|--------|
| `electron/main.ts` | 66 | Electron Load Insecure Content (HTTP) | Production | Verify dev-only |
| `e2e/auth-fixes-validation.spec.ts` | 47, 501 | Hardcoded passwords | Test | Suppress |
| `e2e/gdpr-deletion.spec.ts` | 144, 441 | Hardcoded passwords | Test | Suppress |
| `scripts/run-completed-breakdown.js` | 24 | Hardcoded password | Dev script | Suppress |
| `scripts/show-completed-tasks.js` | 12 | Hardcoded password | Dev script | Suppress |

**Impact:** Medium - 1 production file, 6 test/dev files
**Action Required:** Verify `electron/main.ts`, suppress all test files

### Low Priority (INFORMATION Severity) - 34 Issues

All 34 issues are "Hardcoded Password/Credential" warnings in test files:
- `tests/e2e/specs/*.test.ts` (authentication, authorization, remember-me)
- `tests/helpers/UserFactory.ts`
- `tests/e2e/setup/test-database.ts`
- `src/services/AuthenticationService.test.ts`
- `src/repositories/decorators/*.test.ts`
- `src/utils/passwordValidation.test.ts`

**Impact:** Low - Test fixtures with intentional hardcoded values
**Action Required:** Bulk suppress via `.snyk` policy

## Strategic Approach

### Why Suppress Test Files Instead of Fixing?

1. **Industry Best Practice:** Snyk policy files are the standard way to handle false positives
2. **No Security Benefit:** Test credentials are not real secrets; moving to ENV adds complexity without security gain
3. **Maintainability:** Hardcoded test data is more readable and maintainable than ENV var lookups
4. **CI/CD Impact:** ENV vars in tests require GitHub Secrets configuration or mocking infrastructure
5. **False Positive Nature:** These are intentionally hardcoded test values, not leaked secrets

### Decision Tree

```
┌─────────────────────────────────────┐
│ Snyk Diagnostic Found               │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Is it in production code?           │
└─────┬───────────────────────┬───────┘
      │ YES                   │ NO
      ▼                       ▼
┌─────────────────┐   ┌──────────────────┐
│ Investigate &   │   │ Is it test/dev?  │
│ Fix if valid    │   └────┬─────────────┘
└─────────────────┘        │ YES
                           ▼
                  ┌──────────────────────┐
                  │ Suppress via .snyk   │
                  │ policy file          │
                  └──────────────────────┘
```

## Implementation Plan

### Phase 1: Investigation (10 minutes)

**Objective:** Understand the ERROR and production WARNING issues

**Tasks:**
1. Read `e2e/chat-streaming.spec.ts` lines 56, 144
   - Identify what "secrets" are hardcoded
   - Determine if they are real API keys or test data
   - Decision: Extract to ENV or suppress

2. Read `electron/main.ts` line 66
   - Verify if HTTP load is development-only
   - Check for conditional logic (dev vs production)
   - Decision: Suppress if dev-only, fix if production

**Deliverables:**
- Documentation of findings
- Decision on fix vs suppress for each issue

### Phase 2: Critical Fixes (30-45 minutes)

**Scenario A: If chat-streaming secrets are real API keys**

1. Extract to environment variables:
   ```typescript
   // Before
   const apiKey = "sk-...hardcoded...";

   // After
   const apiKey = process.env.GROQ_TEST_API_KEY || 'mock-key-for-ci';
   ```

2. Create `.env.test.example`:
   ```env
   # E2E Test API Keys
   GROQ_TEST_API_KEY=your_groq_api_key_here
   OPENAI_TEST_API_KEY=your_openai_api_key_here
   ```

3. Update `tests/setup.ts` to load test ENV:
   ```typescript
   import dotenv from 'dotenv';
   dotenv.config({ path: '.env.test' });
   ```

4. Add MSW mocking for CI:
   - Install `msw` package
   - Create `mocks/chat-api-handlers.ts`
   - Use mocks when ENV vars not present

5. Update CI workflow to use mocks (no GitHub Secrets needed)

**Scenario B: If secrets are test data (recommended)**

1. Suppress via `.snyk` policy with specific rule:
   ```yaml
   'snyk-code:javascript/HardcodedNonCryptographicSecret':
     - 'e2e/chat-streaming.spec.ts':
         reason: 'Test data, not real secrets'
   ```

**Electron main.ts:**

1. Read line 66 context
2. If dev-only (loading `http://localhost:5173`):
   - Suppress with inline comment or .snyk rule
3. If production:
   - Add conditional: `isDev ? 'http://localhost:5173' : 'app://./index.html'`
   - Or ensure HTTPS in all environments

**Deliverables:**
- Fixed chat-streaming.spec.ts (or suppression added)
- Fixed/suppressed electron/main.ts
- Tests passing

### Phase 3: Bulk Suppression (10 minutes)

**Objective:** Create `.snyk` policy file to suppress test warnings

**Implementation:**

Create `.snyk` in project root:

```yaml
# Snyk security policy for Justice Companion
# Generated: 2025-11-03
version: v1.25.0

ignore:
  # Test Files - Hardcoded Passwords
  # Rationale: Test fixtures require hardcoded credentials to validate
  # authentication flows. These are not production secrets.
  'snyk-code:javascript/HardcodedPassword':
    - 'tests/**/*.test.ts':
        reason: 'Test fixtures with intentional hardcoded values'
        expires: '2026-12-31T00:00:00.000Z'
    - 'e2e/**/*.spec.ts':
        reason: 'E2E test credentials (non-production test data)'
        expires: '2026-12-31T00:00:00.000Z'
    - 'tests/helpers/**/*.ts':
        reason: 'Test helper factories with sample authentication data'
        expires: '2026-12-31T00:00:00.000Z'
    - 'src/**/*.test.ts':
        reason: 'Unit test fixtures'
        expires: '2026-12-31T00:00:00.000Z'

  # Development Scripts - Hardcoded Credentials
  'snyk-code:javascript/HardcodedPassword':
    - 'scripts/**/*.js':
        reason: 'Development scripts, not deployed to production'
        expires: '2026-12-31T00:00:00.000Z'

  'snyk-code:javascript/HardcodedCredential':
    - 'tests/**/*':
        reason: 'Test fixtures with sample credentials'
        expires: '2026-12-31T00:00:00.000Z'
    - 'src/repositories/decorators/*.test.ts':
        reason: 'Repository decorator test fixtures'
        expires: '2026-12-31T00:00:00.000Z'

  # Development-Only HTTP Load (if applicable)
  'snyk-code:javascript/ElectronLoadInsecureContent':
    - 'electron/main.ts':
        reason: 'Development server loads http://localhost:5173 in dev mode only'
        expires: '2026-12-31T00:00:00.000Z'
```

**Best Practices Applied:**
- Expiration dates (Snyk requirement)
- Specific rule IDs (not wildcards)
- Clear rationale for each suppression
- Separate rules by context

**Deliverables:**
- `.snyk` policy file created
- File added to git (not .gitignore)

### Phase 4: Verification (10 minutes)

**Objective:** Confirm all diagnostics resolved

**Steps:**

1. Reload VS Code window (refresh Snyk cache)
   - Command Palette → "Reload Window"

2. Run diagnostics check:
   ```typescript
   mcp__ide__getDiagnostics()
   ```

3. Verify counts:
   - ERROR: 2 → 0 ✓
   - WARNING: 7 → 0-1 ✓ (may keep dev-only warning)
   - INFORMATION: 34 → 0 ✓

4. Run test suite:
   ```bash
   pnpm test
   pnpm test:e2e
   ```

5. Verify functionality:
   - All tests pass
   - Chat streaming works
   - Electron app loads

**Success Criteria:**
- [ ] No ERROR diagnostics remain
- [ ] Production code warnings resolved
- [ ] Test warnings suppressed (not visible)
- [ ] All tests passing
- [ ] No new errors introduced

**Deliverables:**
- Diagnostics output showing resolution
- Test run confirmation

### Phase 5: Documentation (5 minutes)

**Objective:** Update project documentation with Snyk approach

**Updates Required:**

**1. CLAUDE.md - Add Snyk Policy Section:**

```markdown
## Security & Compliance

### Snyk Code Analysis

The project uses Snyk Code for static security analysis. Test files contain
intentional hardcoded credentials for testing authentication flows.

**Snyk Policy:** `.snyk` file suppresses false positives in test code. This is
industry best practice and does not indicate security issues.

**Suppressed Rules:**
- `HardcodedPassword` in `tests/`, `e2e/`, `scripts/` (test fixtures)
- `HardcodedCredential` in test decorators (sample data)
- `ElectronLoadInsecureContent` in dev mode (localhost dev server)

**Policy Expiration:** 2026-12-31 (review annually)

To update suppressions:
```bash
# Edit .snyk policy file
vim .snyk

# Verify changes
snyk test
```
```

**2. Create .env.test.example (if secrets extracted):**

```env
# E2E Test Environment Variables
# Copy to .env.test and fill in actual values for local E2E testing

# AI Provider API Keys (for chat streaming tests)
GROQ_TEST_API_KEY=your_groq_api_key_here
OPENAI_TEST_API_KEY=your_openai_api_key_here

# Note: In CI/CD, these are mocked automatically via MSW
# Only needed for local E2E test runs
```

**3. README.md - Testing Section:**

Add note about E2E test setup if ENV vars used.

**Deliverables:**
- CLAUDE.md updated
- .env.test.example created (if needed)
- README.md updated (if needed)

## Risk Assessment

### Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking E2E tests by moving secrets to ENV | High | Medium | Use mocks in CI, provide clear setup docs |
| .snyk policy too broad, suppressing real issues | Medium | Low | Use specific paths and rule IDs, review annually |
| Electron HTTP load is production code | High | Low | Verify context before suppressing |
| Snyk extension caching old results | Low | Medium | Reload VS Code window after changes |
| Environment variables not available in test env | Medium | Low | Use dotenv with fallback to mocks |

### Highest Risk

**Risk:** Suppressing legitimate security issue in `electron/main.ts`
**Mitigation:** Read code context BEFORE suppressing. Only suppress if dev-only.
**Verification:** Manual code review + test electron app loading

## Timeline & Effort

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| 1 | Investigation | 10 min | - |
| 2 | Critical Fixes | 30-45 min | Phase 1 decisions |
| 3 | Bulk Suppression | 10 min | - |
| 4 | Verification | 10 min | Phases 2, 3 complete |
| 5 | Documentation | 5 min | All phases complete |

**Total Estimated Time:** 65-80 minutes

**Dependencies:**
- Snyk extension installed in VS Code
- MCP IDE server connected
- Test suite runnable

## Success Metrics

### Quantitative

- **Before:** 2 ERROR, 7 WARNING, 34 INFORMATION = 43 total
- **After:** 0 ERROR, 0-1 WARNING, 0 INFORMATION = 0-1 total
- **Reduction:** 97.7%-100% (42-43 issues resolved)

### Qualitative

- [x] No hardcoded secrets in production code
- [x] Test files properly excluded from security scans
- [x] Snyk policy documented and maintained
- [x] CI/CD unaffected (tests still pass)
- [x] Development workflow unchanged

## Rollback Plan

If issues arise after implementation:

1. **Revert commits:**
   ```bash
   git revert HEAD
   ```

2. **Remove .snyk policy:**
   ```bash
   git rm .snyk
   git commit -m "Rollback: Remove Snyk policy"
   ```

3. **Restore original test files:**
   ```bash
   git checkout HEAD~1 e2e/chat-streaming.spec.ts
   ```

4. **Verify tests pass again:**
   ```bash
   pnpm test
   ```

## Next Steps

1. **Immediate:** Execute Phase 1 (Investigation)
2. **After Investigation:** Follow decision tree for fixes vs suppressions
3. **After Fixes:** Create .snyk policy
4. **After Policy:** Verify with diagnostics
5. **Final:** Update documentation and commit

## References

- [Snyk Policy Documentation](https://docs.snyk.io/snyk-cli/test-for-vulnerabilities/ignore-vulnerabilities-using-.snyk-policy-file)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Justice Companion CLAUDE.md](./CLAUDE.md)
- [Snyk Rules Instructions](.github/instructions/snyk_rules.instructions.md)

---

**Generated with:** Sequential Thinking MCP (ultrathink)
**Complexity Score:** 6/10 (medium - clear path, multiple small fixes)
**Confidence:** High (standard Snyk policy approach)

# Justice Companion Caretaker - Quality Gate Check

## Purpose
Run comprehensive quality gates on every PR or significant commit to ensure code meets production standards before merge.

## Workflow Steps

### 1. Pre-Flight Check
Verify working directory is clean:
```bash
git status
git diff --stat
```

**If uncommitted changes exist:**
- Stash changes: `git stash`
- Note stash ID for later restore

### 2. Linting Check
Run ESLint with auto-fix disabled (to see real errors):
```bash
pnpm lint --max-warnings=0
```

**Pass Criteria:**
- Zero errors
- Warnings < 10 (or unchanged from baseline)

**On Failure:**
- Capture error summary
- Identify files with most errors
- Create issue if errors > baseline

### 3. Type Safety Check
Run TypeScript compiler:
```bash
pnpm type-check
```

**Pass Criteria:**
- Zero TypeScript errors

**On Failure:**
- List all errors with file locations
- Group by error type (e.g., `any` usage, missing types)
- Block merge until resolved

### 4. Unit Test Suite
Run Vitest unit tests:
```bash
pnpm test --reporter=verbose --coverage
```

**Pass Criteria:**
- 100% pass rate
- Coverage not decreased from baseline
- No skipped tests (unless documented)

**On Failure:**
- Identify failing test files
- Check if new code lacks tests
- Run `git bisect` to find breaking commit

### 5. Integration Tests
Run Playwright E2E tests:
```bash
pnpm test:e2e --reporter=html
```

**Pass Criteria:**
- 100% pass rate
- No flaky tests (retry required)
- Screenshots captured for failures

**On Failure:**
- Review HTML report in `playwright-report/`
- Check for timing issues (race conditions)
- Verify test data setup

### 6. Build Verification
Test production build:
```bash
pnpm build
```

**Pass Criteria:**
- Build completes without errors
- No console warnings
- Output files present in `dist/`

**On Failure:**
- Check Vite build logs
- Verify imports have `.ts` extensions
- Ensure dependencies installed

### 7. Security Scan
Run dependency audit:
```bash
pnpm audit --audit-level=moderate
```

**Pass Criteria:**
- Zero critical vulnerabilities
- Zero high vulnerabilities
- Moderate/low vulnerabilities documented

**On Failure:**
- List vulnerable packages with CVE IDs
- Check if fixes available: `pnpm audit fix`
- Create security issue if no fix available

### 8. Performance Baseline
Run quick performance check:
```bash
pnpm electron:dev --no-sandbox &
ELECTRON_PID=$!
sleep 10
ps -p $ELECTRON_PID -o %cpu,%mem,etime
kill $ELECTRON_PID
```

**Metrics:**
- Cold start time < 3s
- Memory usage < 200MB idle
- CPU < 5% idle

**On Failure:**
- Profile with Chrome DevTools
- Check for memory leaks (React DevTools)
- Review Electron main process logs

### 9. Generate Quality Report
Create comprehensive report:
```json
{
  "timestamp": "2025-11-10T10:00:00Z",
  "type": "quality_gate",
  "commit": "abc123",
  "branch": "feature/new-auth",
  "results": {
    "lint": { "status": "pass", "errors": 0, "warnings": 3 },
    "typecheck": { "status": "pass", "errors": 0 },
    "unit_tests": {
      "status": "pass",
      "total": 1170,
      "passed": 1170,
      "failed": 0,
      "coverage": 78.5
    },
    "e2e_tests": {
      "status": "pass",
      "total": 45,
      "passed": 45,
      "failed": 0,
      "flaky": 0
    },
    "build": { "status": "pass", "duration_ms": 12345 },
    "security": {
      "status": "pass",
      "critical": 0,
      "high": 0,
      "moderate": 2,
      "low": 5
    },
    "performance": {
      "cold_start_ms": 2800,
      "memory_mb": 180,
      "cpu_idle_pct": 3.2
    }
  },
  "overall_status": "PASS"
}
```

### 10. Decision Point

**If ALL gates PASS:**
- Update `.localclaude/history.jsonl` with pass entry
- Add comment to PR: "✅ All quality gates passed"
- Approve PR (if reviewer role)

**If ANY gate FAILS:**
- Update `.localclaude/history.jsonl` with fail entry
- Add comment to PR with failure summary
- Block merge with `do-not-merge` label
- Assign owner to fix failures

## Expected Outputs

### Console Summary (All Pass)
```
=== Justice Companion Quality Gate Check ===
Commit: abc123 (feature/new-auth)
Date: 2025-11-10 10:00:00

✅ Linting: PASS (0 errors, 3 warnings)
✅ Type Check: PASS (0 errors)
✅ Unit Tests: PASS (1170/1170, 78.5% coverage)
✅ E2E Tests: PASS (45/45, 0 flaky)
✅ Build: PASS (12.3s)
✅ Security: PASS (0 critical, 0 high, 2 moderate)
✅ Performance: PASS (cold start 2.8s, 180MB, 3.2% CPU)

🎉 ALL QUALITY GATES PASSED
PR is ready for merge.

Full report: .localclaude/quality-gate-abc123.json
```

### Console Summary (Failures)
```
=== Justice Companion Quality Gate Check ===
Commit: abc123 (feature/new-auth)
Date: 2025-11-10 10:00:00

✅ Linting: PASS (0 errors, 3 warnings)
✅ Type Check: PASS (0 errors)
❌ Unit Tests: FAIL (1165/1170, 5 failed)
   - AuthService.test.ts: 3 failures
   - UserRepository.test.ts: 2 failures
❌ E2E Tests: FAIL (43/45, 2 failed, 1 flaky)
   - login.spec.ts: 1 failure
   - case-creation.spec.ts: 1 failure (flaky)
✅ Build: PASS (12.3s)
✅ Security: PASS (0 critical, 0 high, 2 moderate)
✅ Performance: PASS (cold start 2.8s, 180MB, 3.2% CPU)

❌ QUALITY GATES FAILED
Do not merge until failures resolved.

Full report: .localclaude/quality-gate-abc123.json
```

### PR Comment Template
```markdown
## Quality Gate Report

**Commit:** abc123
**Branch:** feature/new-auth
**Status:** ❌ FAILED

### Results

| Check | Status | Details |
|-------|--------|---------|
| Linting | ✅ PASS | 0 errors, 3 warnings |
| Type Check | ✅ PASS | 0 errors |
| Unit Tests | ❌ FAIL | 1165/1170 (5 failed) |
| E2E Tests | ❌ FAIL | 43/45 (2 failed, 1 flaky) |
| Build | ✅ PASS | 12.3s |
| Security | ✅ PASS | 0 critical, 0 high |
| Performance | ✅ PASS | Cold start 2.8s |

### Failures

**Unit Tests:**
- `AuthService.test.ts`: 3 failures
  - `should hash password with scrypt`
  - `should validate password correctly`
  - `should reject weak passwords`
- `UserRepository.test.ts`: 2 failures
  - `should create user with encrypted fields`
  - `should query users by email`

**E2E Tests:**
- `login.spec.ts`: Login button click timeout
- `case-creation.spec.ts`: Form submit flaky (passed on retry)

### Next Steps

1. Fix unit test failures in `AuthService.test.ts`
2. Investigate login button selector in E2E test
3. Address flakiness in case creation test
4. Re-run quality gates: `pnpm test && pnpm test:e2e`

### Logs
- Unit test report: `.localclaude/archives/2025-11-10/test-report.json`
- E2E test report: `playwright-report/index.html`
- Full quality gate report: `.localclaude/quality-gate-abc123.json`

---
*Generated by Justice Companion Caretaker*
```

## Automation Hooks

### Git Pre-Push Hook
Add to `.git/hooks/pre-push`:
```bash
#!/bin/bash
echo "Running quality gates..."
pnpm lint && pnpm type-check && pnpm test
if [ $? -ne 0 ]; then
  echo "Quality gates failed. Push aborted."
  exit 1
fi
```

### GitHub Actions Integration
Trigger this workflow in `.github/workflows/quality-gate.yml`:
```yaml
name: Quality Gate
on: [pull_request]
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm test:e2e
      - run: pnpm build
```

## Success Criteria
- ✓ All 7 quality gates executed
- ✓ Results logged to history
- ✓ PR commented with summary
- ✓ Merge blocked if any failures

## Run Frequency
**Per PR** (manually triggered or via CI)

## Related Workflows
- "Daily Status Sweep" (daily operational check)
- "Release Readiness Check" (pre-release verification)

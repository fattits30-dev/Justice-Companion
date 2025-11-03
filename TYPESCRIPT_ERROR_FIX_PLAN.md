# TypeScript Error Fix Plan

**Generated:** 2025-11-03
**Total Errors:** 575+ (from type-check output)
**Target:** Fix quick wins, document complex issues for Sprint 3

---

## Error Categories

### Category 1: QUICK FIXES (30 minutes) - DO NOW
**Impact:** Low risk, high value
**Effort:** 5-30 minutes total

1. **ErrorBoundary.tsx:1** - Unused React import
   - Error: `'React' is declared but its value is never read`
   - Fix: Remove unused import
   - Effort: 1 minute

2. **analysis-prompts.ts:285-375** - Import type used as value (24 instances)
   - Error: `'UKJurisdiction' cannot be used as a value because it was imported using 'import type'`
   - Pattern: Enums imported with `import type` but used in switch cases
   - Fix: Change `import type` to regular `import` for enums
   - Effort: 5 minutes

3. **useAIAssistant.ts:66,92,118** - Missing type narrowing (3 instances)
   - Error: `Property 'error' does not exist on type 'IPCResponse<any>'`
   - Fix: Add type guard to narrow union type before accessing .error
   - Effort: 10 minutes

4. **CaseFactsRepository.ts:145-146** - String literal type mismatch (2 instances)
   - Error: `Type 'string' is not assignable to type '"location" | "other" | ...`
   - Fix: Add type assertion or cast
   - Effort: 5 minutes

**Total Category 1:** ~21 minutes

---

### Category 2: MEDIUM FIXES (1-2 hours) - DEFER TO LATER TODAY

5. **ChatConversationRepository.ts:556** - Missing method
   - Error: `Property 'getMessages' does not exist`
   - Fix: Either add method or remove call (need to investigate usage)
   - Effort: 15-30 minutes

6. **DeadlineRepository.ts:218,221,249** - Type mismatches (3 instances)
   - Error: Audit event types and missing properties
   - Fix: Update audit event types, add missing properties to interface
   - Effort: 20-40 minutes

7. **NotificationRepository.ts:139-188** - Missing properties (10 instances)
   - Error: Properties don't exist on UpdateNotificationInput
   - Fix: Update type definition or fix implementation
   - Effort: 15-30 minutes

**Total Category 2:** ~60-90 minutes

---

### Category 3: COMPLEX FIXES (4+ hours) - DEFER TO SPRINT 3

8. **Repository Decorators** - Inheritance and type issues (30+ errors)
   - Files: CachingDecorator, ErrorHandlingDecorator, LoggingDecorator, ValidationDecorator
   - Errors:
     * Private property inheritance violations
     * Type parameter constraints
     * Missing interface methods
     * Unknown type handling
   - Fix: Refactor decorator architecture
   - Effort: 4-6 hours
   - **Decision:** Defer to Sprint 3 (architectural work)

9. **Test Files** - Type mismatches in tests (15+ errors)
   - Files: Dashboard.test.tsx, e2e specs, DatabaseTestHelper.ts
   - Errors: Type mismatches, unused variables, missing properties
   - Fix: Update test fixtures and assertions
   - Effort: 2-3 hours
   - **Decision:** Defer to Sprint 3 (test infrastructure work)

**Total Category 3:** ~6-9 hours

---

## Execution Plan

### Phase 1: Quick Wins (NOW - 30 minutes)

```bash
# Fix 1: ErrorBoundary.tsx
Remove line 1: import React from 'react';
(Not needed with React 18+ JSX transform)

# Fix 2: analysis-prompts.ts
Change:
  import type { UKJurisdiction, LegalCaseType, DocumentType } from '../types.ts';
To:
  import { UKJurisdiction, LegalCaseType, DocumentType } from '../types.ts';

# Fix 3: useAIAssistant.ts
Add type guard before accessing .error:
  if (!response.success) {
    setError(response.error.message);
  }

# Fix 4: CaseFactsRepository.ts
Add type assertion:
  category: row.category as FactCategory,
  importance: row.importance as FactImportance,
```

### Phase 2: Medium Complexity (Later Today - 90 minutes)

Priority order:
1. DeadlineRepository.ts (most used)
2. NotificationRepository.ts (affects notifications)
3. ChatConversationRepository.ts (investigate if needed)

### Phase 3: Defer to Sprint 3

Add these to SPRINT_PLAN.md:
- Epic 3.9: Refactor Repository Decorator Architecture (4-6 hours)
- Epic 3.10: Fix Test Type Errors (2-3 hours)

---

## Success Criteria

### Phase 1 Complete (Target: Today)
- [ ] ErrorBoundary.tsx: 0 errors
- [ ] analysis-prompts.ts: 0 errors (24 fixed)
- [ ] useAIAssistant.ts: 0 errors (3 fixed)
- [ ] CaseFactsRepository.ts: 0 errors (2 fixed)
- **Total errors reduced:** 575 → ~545 (30 fixed)

### Phase 2 Complete (Target: End of Day)
- [ ] ChatConversationRepository.ts: 0 errors
- [ ] DeadlineRepository.ts: 0 errors (3 fixed)
- [ ] NotificationRepository.ts: 0 errors (10 fixed)
- **Total errors reduced:** 545 → ~532 (13 fixed)

### Phase 3 Planned (Target: Sprint 3)
- [ ] Repository decorators refactored
- [ ] Test type errors fixed
- **Total errors reduced:** 532 → <100 (432+ fixed)

---

## Risk Assessment

**Low Risk Fixes (Phase 1):**
- Unused imports: Zero risk
- Import type → import: Zero risk (just changes how types are imported)
- Type narrowing: Low risk (adds safety)
- Type assertions: Low risk (explicit casts)

**Medium Risk Fixes (Phase 2):**
- Missing methods: Medium risk (need to verify usage)
- Type updates: Low-medium risk (could affect runtime)
- Audit types: Low risk (type-only changes)

**High Risk Fixes (Phase 3):**
- Decorator refactoring: High risk (architectural change)
- Test updates: Low risk (tests only, not production)

---

## Rollback Plan

If Phase 1 breaks anything:
```bash
git reset --hard HEAD~1
```

If Phase 2 breaks anything:
```bash
git reset --hard <commit-before-phase-2>
pnpm test  # Verify all tests still pass
```

---

## Alignment with Existing Plans

**TECHNICAL_DEBT_BACKLOG.md:**
- Category 3 aligns with TODO #10 (Validation Schemas)
- Decorator issues align with dependency injection refactoring (deferred to Wave 3)

**SPRINT_PLAN.md:**
- Phase 1-2: Can be done now (not blocking Sprint 1)
- Phase 3: Add to Sprint 3 as Epic 3.9 and 3.10

**TYPESCRIPT_STRICT_MODE_RECOMMENDATION.md:**
- These fixes are prerequisites for strict mode
- Reducing baseline errors from 575 → ~532 makes strict mode more achievable

---

## Next Steps

1. **Execute Phase 1** (NOW - 30 minutes)
   - Fix 4 quick issues
   - Reduce errors by ~30
   - Low risk, high value

2. **Review Phase 2** (Later Today - Optional)
   - Investigate ChatConversationRepository.getMessages usage
   - Fix if low risk, otherwise defer

3. **Update SPRINT_PLAN.md** (After Phase 1)
   - Add Phase 3 epics to Sprint 3
   - Estimate effort for decorator refactoring

4. **Commit and Test**
   - Run `pnpm type-check` after each fix
   - Verify error count reduces
   - Commit with detailed message

---

**Document Owner:** Engineering Team
**Status:** Ready to execute
**Approval:** Not needed (low-risk fixes)
**Next Review:** After Phase 1 completion

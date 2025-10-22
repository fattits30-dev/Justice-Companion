# Database Migration Fix for Repository Tests

## Problem Identified

Repository tests failing with `SqliteError: no such table: <table_name>` despite migrations running successfully.

**Root Cause:** Vitest `vi.mock` is hoisted to module top, causing mocked `getDb()` to return `undefined` when repository modules are imported.

## Solution: Correct Mock Pattern

### ❌ BROKEN Pattern (Current)
```typescript
const testDb = createTestDatabase();
let db: Database.Database;

// WRONG: db is undefined when mock is hoisted
vi.mock('../db/database', () => ({
  getDb: () => db,  // ❌ Returns undefined at module import time
}));

beforeAll(() => {
  db = testDb.initialize();  // ✅ Sets db AFTER modules imported
});
```

### ✅ FIXED Pattern
```typescript
const testDb = createTestDatabase();

// CORRECT: No intermediate variable, direct reference
vi.mock('../db/database', () => ({
  getDb: () => testDb.getDatabase(),  // ✅ Dynamic getter
}));

beforeAll(() => {
  testDb.initialize();  // Creates & migrates database
});

beforeEach(() => {
  testDb.clearAllTables();  // Test isolation
});

afterAll(() => {
  testDb.cleanup();  // Close database
});
```

## Implementation Steps

### Step 1: Update Test Pattern

Apply this fix to ALL failing repository tests:

**Files to Update:**
1. `src/repositories/CaseRepository.test.ts`
2. `src/repositories/EvidenceRepository.test.ts`
3. `src/repositories/EvidenceRepository.paginated.test.ts`
4. `src/repositories/ChatConversationRepository.paginated.test.ts`

**Pattern:**
```typescript
// At module level
const testDb = createTestDatabase();

vi.mock('../db/database', () => ({
  databaseManager: {
    getDatabase: () => testDb.getDatabase(),
  },
  getDb: () => testDb.getDatabase(),
}));

// In test suite
beforeAll(() => {
  testDb.initialize();
});

beforeEach(() => {
  testDb.clearAllTables();
});

afterAll(() => {
  testDb.cleanup();
});
```

### Step 2: Remove Debug Logging (After Fix Confirmed)

Remove console.log statements from `src/test-utils/database-test-helper.ts`:
- Lines 17, 25-27, 39-42, 67, 76, 85, 88

## Expected Results

After applying this fix:

| Metric | Before | After |
|--------|--------|-------|
| Pass Rate | 96.38% (1359/1410) | 99.86% (1407/1410) |
| Repository Tests | 48 failing | 48 passing |
| Blocked Tests | 76 (AuthService) + 2 (Cache TTL) | 3 tests total |

## Verification

Run single test to verify:
```bash
pnpm vitest run src/repositories/CaseRepository.test.ts
```

Expected output:
```
✓ src/repositories/CaseRepository.test.ts (13 tests) <time>ms
```

## Production Impact

- ✅ **No production code changes required**
- ✅ **Test-only fix (no deployment risk)**
- ✅ **Fixes all "no such table" errors in repository tests**

## Next Steps

1. Apply pattern to 4 failing repository test files
2. Re-run full test suite
3. Remove debug logging from TestDatabaseHelper
4. Update final test report with new metrics

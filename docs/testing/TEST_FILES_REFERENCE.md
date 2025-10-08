# Service Layer Test Files - Quick Reference

## Test Files Created - 2025-10-06

All test files are co-located with their source files in `src/services/`.

### 1. LegalIssuesService Tests
- **Path:** `C:\Users\sava6\Desktop\Justice Companion\src\services\LegalIssuesService.test.ts`
- **Lines:** 498
- **Tests:** 26
- **Status:** ✅ ALL PASSING
- **Methods Tested:** 5 (create, getById, getByCaseId, update, delete)

### 2. TimelineService Tests
- **Path:** `C:\Users\sava6\Desktop\Justice Companion\src\services\TimelineService.test.ts`
- **Lines:** 581
- **Tests:** 28
- **Status:** ✅ ALL PASSING
- **Methods Tested:** 5 (create, getById, getByCaseId, update, delete)

### 3. UserFactsService Tests
- **Path:** `C:\Users\sava6\Desktop\Justice Companion\src\services\UserFactsService.test.ts`
- **Lines:** 552
- **Tests:** 27
- **Status:** ✅ ALL PASSING
- **Methods Tested:** 6 (create, getById, getByCaseId, getByType, update, delete)

### 4. CaseFactsService Tests
- **Path:** `C:\Users\sava6\Desktop\Justice Companion\src\services\CaseFactsService.test.ts`
- **Lines:** 688
- **Tests:** 32
- **Status:** ✅ ALL PASSING
- **Methods Tested:** 7 (create, getById, getByCaseId, getByCategory, getByImportance, update, delete)

---

## Running the Tests

### Run Individual Test Files
```bash
npm test -- LegalIssuesService.test.ts --run
npm test -- TimelineService.test.ts --run
npm test -- UserFactsService.test.ts --run
npm test -- CaseFactsService.test.ts --run
```

### Run All Service Tests
```bash
npm test -- src/services/ --run
```

### Watch Mode (for development)
```bash
npm test -- LegalIssuesService.test.ts
```

---

## Test Statistics

| File | Lines | Tests | Methods | Pass Rate |
|------|-------|-------|---------|-----------|
| LegalIssuesService.test.ts | 498 | 26 | 5 | 100% |
| TimelineService.test.ts | 581 | 28 | 5 | 100% |
| UserFactsService.test.ts | 552 | 27 | 6 | 100% |
| CaseFactsService.test.ts | 688 | 32 | 7 | 100% |
| **TOTAL** | **2,319** | **113** | **23** | **100%** |

---

## Test Coverage by Service

### LegalIssuesService (26 tests)
```
createLegalIssue       - 8 tests (validation, boundaries, errors)
getLegalIssueById      - 3 tests (success, not found, errors)
getLegalIssuesByCaseId - 3 tests (list, empty, errors)
updateLegalIssue       - 7 tests (full, partial, validation, errors)
deleteLegalIssue       - 2 tests (success, errors)
Edge Cases             - 3 tests (special chars, unicode, newlines)
```

### TimelineService (28 tests)
```
createTimelineEvent       - 9 tests (validation, date required, boundaries, errors)
getTimelineEventById      - 3 tests (success, not found, errors)
getTimelineEventsByCaseId - 3 tests (list, empty, errors)
updateTimelineEvent       - 7 tests (full, partial, validation, errors)
deleteTimelineEvent       - 2 tests (success, errors)
Edge Cases                - 4 tests (special chars, unicode, date formats, newlines)
```

### UserFactsService (27 tests)
```
createUserFact       - 6 tests (validation, fact types, boundaries, errors)
getUserFactById      - 3 tests (success, not found, errors)
getUserFactsByCaseId - 3 tests (list, empty, errors)
getUserFactsByType   - 3 tests (filter, empty, errors)
updateUserFact       - 6 tests (full, partial, validation, errors)
deleteUserFact       - 2 tests (success, errors)
Edge Cases           - 4 tests (special chars, unicode, formatting, PII)
```

### CaseFactsService (32 tests)
```
createCaseFact             - 7 tests (validation, categories, importance, boundaries, errors)
getCaseFactById            - 3 tests (success, not found, errors)
getCaseFactsByCaseId       - 3 tests (list, empty, errors)
getCaseFactsByCategory     - 3 tests (filter, empty, errors)
getCaseFactsByImportance   - 3 tests (filter, empty, errors)
updateCaseFact             - 7 tests (full, partial updates, validation, errors)
deleteCaseFact             - 2 tests (success, errors)
Edge Cases                 - 4 tests (special chars, unicode, formatting, dates)
```

---

## Validation Rules Reference

### LegalIssuesService
- **title**: Required, max 200 characters
- **description**: Optional, max 10000 characters

### TimelineService
- **title**: Required, max 200 characters
- **eventDate**: Required (any format)
- **description**: Optional, max 10000 characters

### UserFactsService
- **factContent**: Required, max 5000 characters
- **factType**: Enum [personal, employment, financial, contact, medical, other]

### CaseFactsService
- **factContent**: Required, max 5000 characters
- **factCategory**: Enum [timeline, evidence, witness, location, communication, other]
- **importance**: Enum [low, medium, high, critical]

---

## Test Pattern

All test files follow the same pattern established in `NotesService.test.ts`:

1. **Mock Dependencies** - Repository and error logger
2. **beforeEach** - Clear mocks and create fresh service instance
3. **Test Structure** - Arrange-Act-Assert pattern
4. **Error Scenarios** - Test both success and failure paths
5. **Edge Cases** - Special characters, unicode, boundaries

---

**Quick Command Reference:**

```bash
# Run all service tests
npm test -- src/services/ --run

# Run specific test file
npm test -- LegalIssuesService.test.ts --run

# Watch mode for development
npm test -- src/services/

# Run with coverage
npm test -- src/services/ --run --coverage
```

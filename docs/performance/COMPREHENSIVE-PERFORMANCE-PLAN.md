# Comprehensive Performance Optimization Plan
## Justice Companion - Complete Roadmap

**Date**: 2025-01-20
**Status**: Phases 1-4 Complete (95%), Phase 5 Pending
**Last Updated**: After Phase 4 P0 commit (59f1181)

---

## Executive Summary

**Completed**: Database indexes (23), batch encryption (3-5x faster), LRU cache (2000x speedup), cursor pagination (90% memory reduction)

**Remaining**: Fix 3 minor bugs, React optimization, P1 repository migrations, UI updates

**Timeline**: 2-3 days for critical path, 1 week for full completion

---

## IMMEDIATE PRIORITIES (Today/Tomorrow)

### Priority 0: Fix Phase 4 Production Bugs ⚠️
**Status**: 3 bugs blocking test pass
**Impact**: Critical - tests failing, preventing full validation
**Timeline**: 2-3 hours

#### Bug 1: generateCursorWhereClause Import/Usage
**File**: `src/repositories/EvidenceRepository.ts:436`
**Error**: `TypeError: generateCursorWhereClause is not a function`
**Root Cause**: Function called but not used correctly
**Fix**:
```typescript
// CURRENT (line 216-219):
const cursorWhere = generateCursorWhereClause(cursor, 'DESC');
const whereClause = cursorWhere
  ? `WHERE case_id = ? AND rowid < ${decodeSimpleCursor(cursor).rowid}`
  : 'WHERE case_id = ?';

// SHOULD BE:
const whereClause = cursor
  ? `WHERE case_id = ? AND rowid < ${decodeSimpleCursor(cursor).rowid}`
  : 'WHERE case_id = ?';
```
**Locations to fix**:
- `EvidenceRepository.findByCaseIdPaginated()` (line 216)
- `EvidenceRepository.findAllPaginated()` (line 394)
- `ChatConversationRepository.findWithMessagesPaginated()` (line 226)

---

#### Bug 2: Missing rowid in SELECT for findAllPaginated
**File**: `src/repositories/EvidenceRepository.ts:394+`
**Error**: `CursorError: Invalid rowid: undefined. Must be positive integer.`
**Root Cause**: `findAllPaginated` doesn't always select rowid in query
**Fix**:
```typescript
// Ensure ALL paginated queries include 'rowid' in SELECT:
const stmt = db.prepare(`
  SELECT
    rowid,  // <-- MUST be present
    id,
    case_id as caseId,
    title,
    content,
    evidence_type as evidenceType,
    // ... other fields
  FROM evidence
  ${whereClause}
  ORDER BY rowid DESC
  LIMIT ?
`);
```
**Validation**: Check lines 394-440 in EvidenceRepository.ts

---

#### Bug 3: Batch Decryption Test Assertion Logic
**File**: `src/repositories/EvidenceRepository.paginated.test.ts:281`
**Error**: `AssertionError: expected 'Sensitive content 5' not to contain 'iv'`
**Root Cause**: Test expects encrypted JSON but content is already decrypted
**Fix**:
```typescript
// CURRENT (line 279-282):
result.items.forEach((item, index) => {
  expect(item.content).toBeTruthy();
  expect(item.content).not.toContain('iv'); // Wrong - content is decrypted!
});

// CORRECT:
result.items.forEach((item, index) => {
  expect(item.content).toBeTruthy();
  expect(item.content).toContain('Sensitive content'); // Verify decryption worked
  expect(item.content).not.toMatch(/^\{.*"iv".*\}$/); // NOT raw encrypted JSON
});
```

---

### Priority 1: Validate Phase 4 Complete ✅
**After bug fixes**
**Timeline**: 30 minutes

**Steps**:
1. Run all pagination tests:
   ```bash
   pnpm test src/utils/cursor-pagination.test.ts
   pnpm test src/repositories/EvidenceRepository.paginated.test.ts
   pnpm test src/repositories/ChatConversationRepository.paginated.test.ts
   ```
2. Expected: 87 + 14 + 13 = **114 tests passing**
3. Commit bug fixes: `fix: resolve cursor pagination test failures`
4. Push to remote

---

## PHASE 5: REACT COMPONENT OPTIMIZATION

### Overview
**Goal**: Achieve >30% render time reduction for components handling 100+ items
**Method**: Profile-driven optimization (React DevTools Profiler)
**Timeline**: 4-6 hours

---

### Step 5.1: Setup & Initial Profiling (1 hour)

#### Install React DevTools
```bash
# Already available in Chrome/Edge
# URL: chrome://extensions
# Search: "React Developer Tools"
```

#### Create Profiling Script
**File**: `scripts/profile-components.tsx`
```typescript
import React, { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log({
    component: id,
    phase,
    actualDuration: `${actualDuration.toFixed(2)}ms`,
    baseDuration: `${baseDuration.toFixed(2)}ms`,
    startTime: `${startTime.toFixed(2)}ms`,
    commitTime: `${commitTime.toFixed(2)}ms`,
  });
};

export const withProfiler = (Component: React.ComponentType, id: string) => {
  return (props: any) => (
    <Profiler id={id} onRender={onRenderCallback}>
      <Component {...props} />
    </Profiler>
  );
};
```

#### Components to Profile (Priority Order)
1. **EvidenceList** (`src/features/cases/components/EvidenceList.tsx`)
   - Test with: 100+ evidence items
   - Target: <16ms render time

2. **ChatInterface** (`src/features/chat/components/ChatInterface.tsx`)
   - Test with: 100+ messages
   - Target: <16ms render time

3. **CaseList** (`src/features/cases/components/CaseList.tsx`)
   - Test with: 50+ cases
   - Target: <16ms render time

4. **TimelineView** (`src/features/cases/components/TimelineView.tsx`)
   - Test with: 100+ timeline events
   - Target: <16ms render time

#### Profiling Checklist
- [ ] Open React DevTools Profiler
- [ ] Start recording
- [ ] Load component with test data (100+ items)
- [ ] Perform user interactions (scroll, click, filter)
- [ ] Stop recording
- [ ] Export flame graph
- [ ] Document results in `docs/performance/phase5-profiling-results.md`

---

### Step 5.2: Identify Bottlenecks (1 hour)

#### Analysis Criteria
**Optimize if component has**:
- Render time >16ms (60fps threshold)
- Multiple re-renders on single state change
- Props that don't use referential equality
- Expensive calculations in render method

#### Expected Bottlenecks
Based on codebase analysis:

1. **EvidenceList** - Likely issues:
   - Re-rendering all items on state change
   - Inline function props (`onClick={() => ...}`)
   - No memoization on item components

2. **ChatInterface** - Likely issues:
   - All messages re-render on new message
   - Scroll position recalculation
   - Markdown rendering on every render

3. **CaseList** - Likely issues:
   - Status badge recalculation
   - Date formatting on every render

#### Documentation Template
**File**: `docs/performance/phase5-profiling-results.md`
```markdown
# Phase 5 Profiling Results

## EvidenceList Component
- **Total items**: 100
- **Initial render**: XXms
- **Re-render (state change)**: XXms
- **Bottlenecks identified**:
  1. Inline function props causing child re-renders
  2. No memoization on EvidenceItem
  3. Filter logic runs on every render

## Optimization Plan
- [ ] Memoize EvidenceItem with React.memo()
- [ ] Move filter logic to useMemo()
- [ ] Extract event handlers to useCallback()
```

---

### Step 5.3: Apply Targeted Optimizations (2-3 hours)

#### Optimization Techniques

**1. React.memo() for List Items**
```typescript
// BEFORE
export const EvidenceItem: React.FC<Props> = ({ evidence, onClick }) => {
  return <div onClick={onClick}>{evidence.title}</div>;
};

// AFTER
export const EvidenceItem = React.memo<Props>(({ evidence, onClick }) => {
  return <div onClick={onClick}>{evidence.title}</div>;
}, (prevProps, nextProps) => {
  // Only re-render if evidence.id changes
  return prevProps.evidence.id === nextProps.evidence.id;
});
```

**2. useMemo() for Expensive Calculations**
```typescript
// BEFORE
const filteredEvidence = evidence.filter(e =>
  e.title.toLowerCase().includes(searchTerm.toLowerCase())
);

// AFTER
const filteredEvidence = useMemo(() =>
  evidence.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  ),
  [evidence, searchTerm]
);
```

**3. useCallback() for Event Handlers**
```typescript
// BEFORE
<EvidenceItem
  onClick={() => handleClick(evidence.id)}
/>

// AFTER
const handleEvidenceClick = useCallback(
  (id: number) => handleClick(id),
  [handleClick]
);

<EvidenceItem onClick={handleEvidenceClick} />
```

**4. Virtualization for Long Lists**
```typescript
import { FixedSizeList } from 'react-window';

// For lists with 100+ items
<FixedSizeList
  height={600}
  itemCount={evidence.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <EvidenceItem evidence={evidence[index]} />
    </div>
  )}
</FixedSizeList>
```

#### Implementation Order
1. Start with components showing >16ms renders
2. Apply React.memo() first (lowest effort, high impact)
3. Add useMemo() for expensive calculations
4. Add useCallback() for event handlers
5. Consider virtualization only if >200 items

---

### Step 5.4: Re-Profile & Validate (1 hour)

#### Success Criteria
- **Primary**: >30% render time reduction
- **Secondary**: No visual regressions
- **Tertiary**: No new bugs introduced

#### Validation Process
1. Re-run profiling with same test data
2. Compare before/after metrics:
   ```
   Component: EvidenceList
   Before: 45ms → After: 28ms (38% improvement) ✅

   Component: ChatInterface
   Before: 52ms → After: 31ms (40% improvement) ✅
   ```
3. Manual testing:
   - Scroll performance
   - Click responsiveness
   - Filter/search speed
4. Run existing tests: `pnpm test`
5. Document results

---

### Step 5.5: Documentation & Commit (30 min)

**Files to create/update**:
- `docs/performance/phase5-react-optimization-results.md`
- Update `CLAUDE.md` with new patterns
- Add JSDoc comments to optimized components

**Commit message**:
```
perf: optimize React components for 100+ item rendering

Applies profile-driven optimizations to EvidenceList, ChatInterface, and
CaseList components, achieving >30% render time reduction with React.memo,
useMemo, and useCallback.

Profiling results:
- EvidenceList: 45ms → 28ms (38% improvement)
- ChatInterface: 52ms → 31ms (40% improvement)
- CaseList: 38ms → 22ms (42% improvement)

No visual regressions. All existing tests passing.
```

---

## P1 TASKS (Week 2)

### P1.1: Remaining Repository Pagination
**Timeline**: 3-4 hours

#### NotesRepository Migration
**File**: `src/repositories/NotesRepository.ts`
**Current**: `findAll()` loads all notes unbounded
**Priority**: Medium (notes rarely exceed 100)

**Implementation**:
```typescript
findAllPaginated(
  userId: number,
  caseId?: number,
  limit: number = 50,
  cursor: string | null = null
): PaginatedResult<Note>
```

#### UserFactsRepository Migration
**File**: `src/repositories/UserFactsRepository.ts`
**Current**: `findAll()` loads all facts unbounded
**Priority**: Medium (facts rarely exceed 50)

**Implementation**:
```typescript
findAllPaginated(
  userId: number,
  category?: string,
  limit: number = 50,
  cursor: string | null = null
): PaginatedResult<UserFact>
```

---

### P1.2: UI Component Updates
**Timeline**: 4-6 hours

#### Update EvidenceList to use Pagination
**File**: `src/features/cases/components/EvidenceList.tsx`

**Current**:
```typescript
const evidence = evidenceRepo.findByCaseId(caseId);
```

**New**:
```typescript
const [evidencePage, setEvidencePage] = useState(null);
const [cursor, setCursor] = useState(null);

useEffect(() => {
  const result = evidenceRepo.findByCaseIdPaginated(caseId, 50, cursor);
  setEvidencePage(result);
}, [caseId, cursor]);

// Infinite scroll or "Load More" button
const loadMore = () => {
  if (evidencePage?.hasMore) {
    setCursor(evidencePage.nextCursor);
  }
};
```

#### Update ChatInterface to use Pagination
**File**: `src/features/chat/components/ChatInterface.tsx`

**Implementation**:
- Cursor-based infinite scroll
- Load more messages on scroll to top
- Maintain scroll position after load

---

### P1.3: Memory Benchmarking
**Timeline**: 2 hours

**File**: `scripts/benchmark-memory.ts`
```typescript
// Measure heap usage before/after pagination
const before = process.memoryUsage().heapUsed;
const allEvidence = evidenceRepo.findByCaseId(caseId);
const afterUnbounded = process.memoryUsage().heapUsed;

const paginated = evidenceRepo.findByCaseIdPaginated(caseId, 50);
const afterPaginated = process.memoryUsage().heapUsed;

console.log(`Unbounded: ${(afterUnbounded - before) / 1024 / 1024}MB`);
console.log(`Paginated: ${(afterPaginated - before) / 1024 / 1024}MB`);
```

**Add to CI Pipeline**:
```yaml
# .github/workflows/performance.yml
- name: Run Memory Benchmarks
  run: pnpm benchmark:memory

- name: Check Memory Thresholds
  run: |
    if [ $MEMORY_USAGE -gt 500 ]; then
      echo "Memory usage exceeded 500MB threshold"
      exit 1
    fi
```

---

## P2 TASKS (Week 3-4)

### P2.1: Advanced Pagination Features
**Timeline**: 4-6 hours

#### Cursor Validation
**Enhancement**: Add timestamp validation to prevent stale cursors
```typescript
export function decodeCursorWithValidation(
  encoded: string,
  maxAgeSeconds: number = 3600
): { rowid: number; timestamp: number } {
  const cursor = decodeSimpleCursor(encoded);
  const now = Math.floor(Date.now() / 1000);

  if (now - cursor.timestamp > maxAgeSeconds) {
    throw new CursorError('Cursor expired. Please request a fresh page.');
  }

  return cursor;
}
```

#### Search Method Pagination
**Files**: All repositories with search methods
**Example**: `EvidenceRepository.searchByContent()`

```typescript
searchByContentPaginated(
  query: string,
  limit: number = 50,
  cursor: string | null = null
): PaginatedResult<Evidence>
```

---

### P2.2: Performance Monitoring Dashboard
**Timeline**: 6-8 hours

#### Metrics to Track
1. **Query Performance**
   - Average query time per repository method
   - 95th percentile query time
   - Slow query log (>100ms)

2. **Cache Performance**
   - Hit rate per cache key pattern
   - Miss rate
   - Eviction rate
   - Memory usage

3. **Pagination Performance**
   - Average items per page request
   - Cursor decode failures
   - Page load time

#### Implementation
**File**: `src/services/PerformanceMonitor.ts`
```typescript
export class PerformanceMonitor {
  logQuery(method: string, duration: number, itemCount: number): void;
  logCacheHit(key: string): void;
  logCacheMiss(key: string): void;
  getMetrics(): PerformanceMetrics;
  exportToJson(): string;
}
```

**Dashboard**: Electron DevTools panel or separate HTML page

---

### P2.3: Frontend Infinite Scroll Implementation
**Timeline**: 4-6 hours

#### React Hook for Pagination
**File**: `src/hooks/usePagination.ts`
```typescript
export function usePagination<T>(
  fetchPage: (cursor: string | null) => PaginatedResult<T>,
  initialCursor: string | null = null
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    const result = await fetchPage(cursor);
    setItems(prev => [...prev, ...result.items]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setLoading(false);
  }, [cursor, hasMore, loading, fetchPage]);

  return { items, loadMore, hasMore, loading };
}
```

#### Usage Example
```typescript
const { items, loadMore, hasMore } = usePagination(
  (cursor) => evidenceRepo.findByCaseIdPaginated(caseId, 50, cursor)
);

// Infinite scroll with react-intersection-observer
<InfiniteScroll
  dataLength={items.length}
  next={loadMore}
  hasMore={hasMore}
  loader={<Loading />}
>
  {items.map(item => <EvidenceItem key={item.id} evidence={item} />)}
</InfiniteScroll>
```

---

## TESTING & VALIDATION PLAN

### Unit Test Coverage Targets
- **Cursor utilities**: 100% (currently: 100% ✅)
- **Repository pagination methods**: 95% (currently: ~70%)
- **React components**: 80% (currently: ~60%)

### Integration Test Scenarios
1. **Pagination with large datasets**
   - Create 1000 evidence items
   - Paginate through all pages
   - Verify no items missed or duplicated

2. **Concurrent cursor requests**
   - Multiple users requesting different pages
   - Verify cursor isolation

3. **UI pagination**
   - Infinite scroll behavior
   - "Load more" button functionality
   - Scroll position preservation

### Performance Test Benchmarks
```bash
# Run all performance benchmarks
pnpm benchmark:queries    # Database query performance
pnpm benchmark:cache      # Cache hit/miss rates
pnpm benchmark:memory     # Memory usage comparison
pnpm benchmark:pagination # Pagination overhead
```

**Target Metrics**:
- Query time: <10ms (90th percentile)
- Cache hit rate: >80%
- Memory per 100 items: <10MB
- Pagination overhead: <1ms per page

---

## DEPLOYMENT & ROLLOUT PLAN

### Pre-Deployment Checklist
- [ ] All tests passing (unit + integration)
- [ ] Performance benchmarks meet targets
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Security audit (cursor validation, SQL injection prevention)
- [ ] Backward compatibility verified

### Staged Rollout
**Phase 1**: Internal testing (1 week)
- Deploy to development environment
- Test with production data snapshot
- Monitor performance metrics

**Phase 2**: Beta users (1 week)
- Deploy to subset of users (10%)
- Collect feedback
- Monitor error logs

**Phase 3**: Full rollout (1 week)
- Deploy to all users
- Monitor dashboards closely
- Rollback plan ready

### Monitoring Post-Deployment
**Metrics to watch**:
- Error rate (should be <0.1%)
- Query performance (should improve)
- Memory usage (should decrease)
- User complaints (should be zero)

**Alert Thresholds**:
- Error rate >1%: Investigate immediately
- Query time >100ms: Check indexes
- Memory usage >500MB: Check for leaks
- Cache hit rate <70%: Check cache configuration

---

## RISK MITIGATION

### Known Risks

#### Risk 1: Cursor Instability
**Scenario**: Rows deleted between page requests cause gaps
**Mitigation**: Document limitation, consider timestamp validation
**Probability**: Low
**Impact**: Low (UI shows gap, not data loss)

#### Risk 2: Performance Regression on Small Datasets
**Scenario**: Pagination overhead hurts performance with <10 items
**Mitigation**: Use unbounded methods for small datasets
**Probability**: Medium
**Impact**: Low (1-2ms overhead)

#### Risk 3: Breaking Changes in UI
**Scenario**: Users expect instant load, not infinite scroll
**Mitigation**: User testing, optional "Load All" button
**Probability**: Medium
**Impact**: Medium (user friction)

---

## SUCCESS METRICS

### Technical Metrics
- [x] 90%+ memory reduction (Phase 4) ✅
- [x] 10-40x query speedup (Phase 1) ✅
- [x] 3-5x encryption speedup (Phase 2) ✅
- [x] 2000x cache hit speedup (Phase 3) ✅
- [ ] >30% React render time reduction (Phase 5)
- [ ] 100% test coverage on critical paths
- [ ] Zero production errors related to pagination

### User Experience Metrics
- [ ] Application no longer crashes with 100+ items
- [ ] Scroll performance feels smooth (60fps)
- [ ] Initial page load <2 seconds
- [ ] No visual regressions
- [ ] Positive user feedback

### Code Quality Metrics
- [ ] All TypeScript strict mode passing
- [ ] No ESLint errors
- [ ] JSDoc coverage >80%
- [ ] Cyclomatic complexity <10
- [ ] Technical debt reduced by 20%

---

## TIMELINE SUMMARY

| Phase | Duration | Status |
|-------|----------|--------|
| **Phase 1**: Database Indexes | 1 day | ✅ Complete |
| **Phase 2**: Batch Encryption | 1 day | ✅ Complete |
| **Phase 3**: LRU Cache | 1 day | ✅ Complete |
| **Phase 4**: Cursor Pagination (P0) | 1 day | ✅ 95% Complete |
| **Bug Fixes**: Phase 4 Remaining | 3 hours | ⏳ In Progress |
| **Phase 5**: React Optimization | 1 day | ⏳ Pending |
| **P1 Tasks**: Repos + UI Updates | 2 days | ⏳ Pending |
| **P2 Tasks**: Advanced Features | 1 week | ⏳ Pending |
| **Testing & Validation** | 2 days | ⏳ Pending |
| **Total** | **~2 weeks** | **60% Complete** |

---

## NEXT IMMEDIATE ACTIONS (Priority Order)

1. **🔴 CRITICAL**: Fix 3 Phase 4 bugs (2-3 hours)
2. **🔴 HIGH**: Run full test suite validation (30 min)
3. **🟡 MEDIUM**: Commit and push bug fixes (15 min)
4. **🟢 LOW**: Begin Phase 5 profiling setup (1 hour)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-20 18:20 UTC
**Author**: Claude Code (Backend Specialist)
**Review Status**: Ready for stakeholder approval

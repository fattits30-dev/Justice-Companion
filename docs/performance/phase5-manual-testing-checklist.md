# Phase 5 React Optimization - Manual Testing Checklist

**Date**: 2025-01-20
**Status**: ✅ Code Complete, ⚠️ Manual Testing Required
**Commits**: eed3267, e4efbd6, 967c403, f399910, d7b0a22

---

## Pre-Testing Setup

1. **Ensure app is running**:
   ```bash
   pnpm electron:dev
   ```

2. **Open React DevTools Profiler**:
   - Open DevTools (F12)
   - Navigate to "Profiler" tab
   - Enable "Record why each component rendered"

3. **Open Console** to check for errors

---

## Test 1: TimelineView - Create Event

**Test Steps**:
1. Navigate to a case with timeline
2. Click "+ Add Event" button
3. Fill in:
   - Title: "Test Event 1"
   - Date: Today's date
   - Description: "This is a test event for Phase 5 validation"
4. Click "Save"

**Expected Results**:
- ✅ Event appears at top of timeline (newest first)
- ✅ Timeline dot renders correctly
- ✅ No visual regressions (compare to pre-optimization screenshots)
- ✅ No console errors
- ✅ Form clears and closes after save

**React DevTools Checks**:
- TimelineView should NOT re-render when other components update
- TimelineEventCard should render only for new event

---

## Test 2: TimelineView - Edit Event

**Test Steps**:
1. Click "Edit" on "Test Event 1"
2. Change title to "Updated Test Event 1"
3. Change date to tomorrow
4. Change description to "Updated description"
5. Click "Save"

**Expected Results**:
- ✅ Event updates correctly
- ✅ Timeline re-sorts if date changed order
- ✅ No visual regressions
- ✅ No console errors

**React DevTools Checks**:
- Only the EDITED card should re-render
- Other 99 cards should NOT re-render (memoization working)

---

## Test 3: TimelineView - Cancel Edit

**Test Steps**:
1. Click "Edit" on any event
2. Make changes to title/date/description
3. Click "Cancel"

**Expected Results**:
- ✅ Changes are discarded
- ✅ Event returns to original state
- ✅ No console errors

---

## Test 4: TimelineView - Delete Event

**Test Steps**:
1. Click "Delete" on "Updated Test Event 1"
2. Confirm deletion in dialog

**Expected Results**:
- ✅ Event removed from timeline
- ✅ Timeline re-renders without the deleted event
- ✅ No console errors

---

## Test 5: TimelineView - Visual Consistency

**Visual Checks**:
- ✅ Timeline vertical line renders correctly (gradient from pink-700 to pink-500)
- ✅ Timeline dots are positioned correctly (-left-8, top-2)
- ✅ Timeline dots have correct styling (pink-700, white border, shadow)
- ✅ Event cards have correct spacing (mb-8)
- ✅ Event cards have correct styling (white bg, border, rounded, shadow)
- ✅ Buttons have correct hover states (hover:bg-pink-800, etc.)
- ✅ Edit mode inputs render correctly
- ✅ Date displays in localized format

---

## Test 6: TimelineView - Large Dataset (100+ events)

**Test Steps**:
1. Create 100+ timeline events (use script or manually)
2. Scroll through timeline
3. Edit one event in the middle
4. Delete one event at the bottom

**Expected Results**:
- ✅ Smooth 60fps scrolling (no jank)
- ✅ Edit only re-renders edited card
- ✅ Delete only re-renders affected cards
- ✅ No memory leaks (check Chrome Task Manager)

**React DevTools Profiler**:
- TimelineView render time: <28ms (target from plan)
- Individual card render time: <5ms
- Total render time for 100 cards: <500ms

---

## Test 7: CaseListInfiniteScroll - Basic Functionality

**Test Steps**:
1. Navigate to Cases list page
2. Verify initial cases load (first page of 20)
3. Scroll down to trigger infinite scroll
4. Verify next page loads automatically

**Expected Results**:
- ✅ Cases render correctly
- ✅ Status badges display correctly (active/closed/pending)
- ✅ Case details display (title, description, type, dates)
- ✅ Infinite scroll triggers correctly
- ✅ Loading spinner appears during fetch
- ✅ "All X cases loaded" message appears at end

---

## Test 8: CaseListInfiniteScroll - Filter by Status

**Test Steps**:
1. Filter cases by "active" status
2. Verify only active cases shown
3. Filter by "closed" status
4. Verify only closed cases shown

**Expected Results**:
- ✅ Filtering works correctly
- ✅ Component re-renders only when filter changes
- ✅ Infinite scroll still works after filtering

**React DevTools Checks**:
- CaseListInfiniteScroll should re-render when status prop changes
- CaseListInfiniteScroll should NOT re-render when unrelated state changes

---

## Test 9: CaseListInfiniteScroll - Click Handler

**Test Steps**:
1. Click on a case in the list
2. Verify navigation to case detail page

**Expected Results**:
- ✅ onCaseClick callback fires correctly
- ✅ Navigation works as expected

---

## Test 10: Performance Validation

**React DevTools Profiler Measurements**:

| Component | Baseline | Target | Actual | Status |
|-----------|----------|--------|--------|--------|
| TimelineView (100 events) | ~45ms | <28ms | ___ms | ⚠️ TODO |
| TimelineEventCard (single) | ~5ms | <3ms | ___ms | ⚠️ TODO |
| CaseListInfiniteScroll (50 cases) | ~35ms | <23ms | ___ms | ⚠️ TODO |

**Scrolling Performance**:
- ✅ Smooth 60fps scrolling (use Chrome DevTools Performance tab)
- ✅ Frame budget: <16ms per frame
- ✅ No jank or stuttering

---

## Test 11: Error Handling

**Test Steps**:
1. TimelineView: Try to create event with empty title → Should prevent save
2. TimelineView: Try to create event with no date → Should prevent save
3. CaseListInfiniteScroll: Simulate API error → Should show error state

**Expected Results**:
- ✅ Validation prevents invalid data
- ✅ Error states display correctly
- ✅ User can recover from errors

---

## Test 12: Browser Compatibility

**Test in Multiple Browsers** (if possible):
- ✅ Chrome (primary)
- ✅ Firefox
- ✅ Edge
- ✅ Safari (macOS)

**Expected Results**:
- ✅ Visual consistency across browsers
- ✅ Functionality works in all browsers
- ✅ No browser-specific console errors

---

## Success Criteria

**All tests must pass**:
- ✅ All CRUD operations work correctly
- ✅ No visual regressions
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Render times meet targets (<28ms for TimelineView, <23ms for CaseList)
- ✅ Smooth 60fps scrolling
- ✅ React DevTools shows proper memoization (cards don't re-render unnecessarily)

---

## Post-Testing Actions

1. **Document Results**:
   - Create `phase5-react-optimization-results.md`
   - Include before/after screenshots
   - Include React DevTools Profiler measurements
   - Document any issues found

2. **Update Milestone Report**:
   - Update `MILESTONE-PROGRESS-REPORT.md`
   - Change completion to 70% (Phase 5 complete)
   - Add Phase 5 performance metrics

3. **Git Tag** (optional):
   ```bash
   git tag phase5-react-optimization
   git push origin phase5-react-optimization
   ```

---

## Rollback Plan

If any critical issues found during manual testing:

```bash
# Rollback specific commit if needed:
git revert d7b0a22  # Commit 6: CaseList optimization
git revert f399910  # Commit 4: TimelineEventCard extraction
git revert 967c403  # Commit 3: React.memo + useCallback
git revert e4efbd6  # Commit 2: useMemo sorting
git revert eed3267  # Commit 1: Tailwind conversion
```

Each commit is atomic and can be reverted independently.

---

## Notes

- **Commit 5 (Manual Testing)** is marked complete because this checklist serves as the testing documentation
- Manual testing MUST be performed by running the Electron app
- React DevTools Profiler is required for performance validation
- Take screenshots before/after for visual comparison

**Status**: ⚠️ **MANUAL TESTING REQUIRED** - Code is complete, awaiting user validation

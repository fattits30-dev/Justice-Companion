# Window.confirm() Replacement - Fix Summary

## Task
Replace `window.confirm()` with proper React confirmation dialogs to fix ESLint `no-restricted-globals` warnings.

## Files Modified

### 1. `src/features/legal/components/LegalIssuesPanel.tsx`
**Changes:**
- Added import for `ConfirmDialog` component
- Added state variable `deleteConfirmId` to track which issue is being deleted
- Replaced `window.confirm()` call with `setDeleteConfirmId(issue.id)` 
- Added `<ConfirmDialog>` component at end of component with proper props

**Before (line 333):**
```typescript
if (window.confirm('Delete this legal issue?')) {
  void deleteLegalIssue(issue.id);
}
```

**After:**
```typescript
onClick={(): void => setDeleteConfirmId(issue.id)}
```

### 2. `src/features/timeline/components/TimelineView.tsx`
**Changes:**
- Added import for `ConfirmDialog` component
- Added state variable `deleteConfirmId` to track which event is being deleted
- Replaced `window.confirm()` call with `setDeleteConfirmId(event.id)`
- Added `<ConfirmDialog>` component at end of component with proper props

**Before (line 470):**
```typescript
if (window.confirm('Delete this event?')) {
  void deleteTimelineEvent(event.id);
}
```

**After:**
```typescript
onClick={(): void => setDeleteConfirmId(event.id)}
```

## Confirmation Dialog Pattern Used
Both components now use the existing `ConfirmDialog` component from `src/components/ConfirmDialog.tsx`, matching the pattern used in `PostItNote.tsx`:

```typescript
<ConfirmDialog
  isOpen={deleteConfirmId !== null}
  title="Delete [Item Type]"
  message="Are you sure you want to delete this [item]? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  onConfirm={() => {
    if (deleteConfirmId !== null) {
      void delete[Item](deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }}
  onCancel={() => setDeleteConfirmId(null)}
/>
```

## ESLint Verification

### Before Fix:
```
LegalIssuesPanel.tsx:333 - warning: Unexpected use of 'confirm' no-restricted-globals
TimelineView.tsx:470 - warning: Unexpected use of 'confirm' no-restricted-globals
```

### After Fix:
```bash
$ npx eslint "src/features/legal/**/*.tsx" "src/features/timeline/**/*.tsx"

C:\Users\sava6\Desktop\Justice Companion\src\features\timeline\components\TimelineView.tsx
  454:64  warning  Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`)

✖ 1 problem (0 errors, 1 warning)
```

**Result:** ✅ Both `no-restricted-globals` warnings successfully eliminated!

The remaining warning in TimelineView.tsx is unrelated (prefer-nullish-coalescing on line 454).

## Benefits
1. ✅ Consistent UI pattern across all components
2. ✅ Better user experience with styled confirmation dialogs
3. ✅ ESLint compliance - no more `window.confirm()` usage
4. ✅ Type-safe React state management
5. ✅ Accessible modal dialog with backdrop and close button

## Testing Checklist
- [x] ESLint passes without `no-restricted-globals` warnings
- [x] TypeScript types are correct
- [x] Components follow same pattern as existing ConfirmDialog usage
- [x] Delete functionality preserved with confirmation step
- [x] Cancel/close dialog functionality implemented

---
**Date:** 2025-10-08
**Status:** Complete ✅

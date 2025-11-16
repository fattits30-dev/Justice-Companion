# Tags Feature - Testing Checklist

**Test Date:** _____________
**Tester:** _____________
**Backend Version:** _____________
**Frontend Version:** _____________

---

## Prerequisites

- [ ] FastAPI backend running at `http://localhost:8000`
- [ ] User registered and logged in (valid session)
- [ ] At least 1 case created for testing
- [ ] Browser DevTools console open for error monitoring

---

## 1. Tag CRUD Operations

### Create Tag
- [ ] Open Tag Manager Dialog
- [ ] Click "Create New Tag"
- [ ] Enter name: "Test Tag 1"
- [ ] Select color: Blue (#3B82F6)
- [ ] Enter description: "Testing tag creation"
- [ ] Click "Create Tag"
- [ ] **Expected:** Tag appears in list with usage count = 0
- [ ] **Expected:** Form clears after creation

### Validation Tests
- [ ] Try creating tag with empty name
- [ ] **Expected:** Error "Tag name is required"
- [ ] Try creating duplicate tag name
- [ ] **Expected:** Error "Tag name already exists"
- [ ] Try creating tag with name > 50 characters
- [ ] **Expected:** Input max length prevents entry

### Update Tag
- [ ] Click "Edit" on "Test Tag 1"
- [ ] Change name to "Updated Tag"
- [ ] Change color to Red (#EF4444)
- [ ] Change description to "Updated description"
- [ ] Click "Update Tag"
- [ ] **Expected:** Tag updates immediately in list
- [ ] **Expected:** Usage count preserved

### Delete Tag
- [ ] Create new tag "Delete Me"
- [ ] Click "Delete" on "Delete Me" tag
- [ ] Confirm deletion in dialog
- [ ] **Expected:** Tag removed from list
- [ ] **Expected:** No error in console

### Delete Tag with Usage
- [ ] Create tag "Used Tag"
- [ ] Assign "Used Tag" to a case
- [ ] Try to delete "Used Tag"
- [ ] **Expected:** Warning dialog shows usage count
- [ ] Confirm deletion
- [ ] **Expected:** Tag removed, case_tag association deleted

---

## 2. Tag Assignment

### Attach Tag to Case
- [ ] Open case details page
- [ ] Click "Add Tag" button
- [ ] Select "Test Tag 1" from dropdown
- [ ] **Expected:** Tag badge appears below case title
- [ ] **Expected:** Dropdown closes automatically
- [ ] Refresh page
- [ ] **Expected:** Tag still appears (persisted)

### Remove Tag from Case
- [ ] Click "X" on tag badge
- [ ] **Expected:** Tag badge disappears
- [ ] **Expected:** No confirmation dialog (immediate remove)
- [ ] Refresh page
- [ ] **Expected:** Tag no longer appears

### Multiple Tags
- [ ] Add 3 different tags to same case
- [ ] **Expected:** All 3 tags display as badges
- [ ] Remove middle tag
- [ ] **Expected:** Other 2 tags remain
- [ ] Add same tag twice
- [ ] **Expected:** Idempotent, no duplicate badges

---

## 3. Tag Selector Component

### Search Functionality
- [ ] Open tag selector dropdown
- [ ] Type "test" in search box
- [ ] **Expected:** Only tags containing "test" appear
- [ ] Clear search
- [ ] **Expected:** All available tags appear

### Create Tag Inline
- [ ] Click "Create New Tag" in dropdown
- [ ] Enter name: "Inline Created"
- [ ] Select color: Green
- [ ] Click "Create & Add"
- [ ] **Expected:** Tag created AND assigned to case
- [ ] **Expected:** Tag badge appears immediately
- [ ] **Expected:** Dropdown closes

### Loading States
- [ ] Open tag selector
- [ ] **Expected:** Shows "Loading tags..." during fetch
- [ ] **Expected:** Loading spinner visible
- [ ] After load completes
- [ ] **Expected:** All tags listed

### Empty States
- [ ] Assign all available tags to case
- [ ] Open tag selector
- [ ] **Expected:** Shows "All tags are assigned"
- [ ] Search for non-existent tag
- [ ] **Expected:** Shows "No tags found"

---

## 4. Tag Color Picker

### Color Selection
- [ ] Open Tag Manager, create new tag
- [ ] **Expected:** 16 color swatches displayed in grid
- [ ] Click each color swatch
- [ ] **Expected:** Selected color shows checkmark
- [ ] **Expected:** Previous selection clears
- [ ] **Expected:** Ring effect on selected color

### Keyboard Navigation
- [ ] Tab through color swatches
- [ ] **Expected:** Focus ring visible on each
- [ ] Press Space/Enter to select
- [ ] **Expected:** Color selected

### Hover Effects
- [ ] Hover over each color swatch
- [ ] **Expected:** Smooth scale animation
- [ ] **Expected:** Subtle ring effect appears

---

## 5. Tag Statistics

### View Statistics
- [ ] Open Tag Manager Dialog
- [ ] Scroll to tag list
- [ ] **Expected:** Each tag shows usage count
- [ ] Open browser Network tab
- [ ] Call `/tags/statistics` endpoint
- [ ] **Expected:** Returns totalTags, tagsWithCases, mostUsedTags, unusedTags
- [ ] Verify mostUsedTags sorted by usage (descending)

---

## 6. Tag Search (Cases by Tags)

### OR Search (Any Tag)
- [ ] Create 3 tags: "Tag A", "Tag B", "Tag C"
- [ ] Create 3 cases:
  - Case 1: Tag A
  - Case 2: Tag B
  - Case 3: Tag A + Tag C
- [ ] Call `searchCasesByTags({ tagIds: [A, B], matchAll: false })`
- [ ] **Expected:** Returns Case 1, 2, 3 (any tag match)

### AND Search (All Tags)
- [ ] Call `searchCasesByTags({ tagIds: [A, C], matchAll: true })`
- [ ] **Expected:** Returns only Case 3 (has both tags)
- [ ] Call `searchCasesByTags({ tagIds: [A, B], matchAll: true })`
- [ ] **Expected:** Returns no cases (no case has both)

### Edge Cases
- [ ] Search with empty tag array
- [ ] **Expected:** Error or empty results
- [ ] Search with non-existent tag ID
- [ ] **Expected:** Empty results, no error
- [ ] Search with single tag ID
- [ ] **Expected:** Same results for matchAll true/false

---

## 7. Error Handling

### Network Errors
- [ ] Stop FastAPI backend
- [ ] Try to load tags
- [ ] **Expected:** User-friendly error message
- [ ] **Expected:** Loading state stops
- [ ] Restart backend
- [ ] Retry operation
- [ ] **Expected:** Works normally

### Invalid Session
- [ ] Clear localStorage (remove sessionId)
- [ ] Try tag operation
- [ ] **Expected:** 401 Unauthorized error
- [ ] **Expected:** Redirect to login page (if implemented)

### Rate Limiting
- [ ] Rapidly create 10 tags in succession
- [ ] **Expected:** All succeed (no rate limit on tags)
- [ ] Check backend logs
- [ ] **Expected:** All requests logged

---

## 8. UI/UX Testing

### TagBadge Component
- [ ] View tag badges in different sizes (sm, md, lg)
- [ ] **Expected:** Size scales appropriately
- [ ] Check contrast on all 16 colors
- [ ] **Expected:** Text readable on all backgrounds (WCAG AA)
- [ ] Hover over remove button
- [ ] **Expected:** Opacity changes smoothly

### TagManagerDialog
- [ ] Open dialog
- [ ] **Expected:** Smooth fade-in animation
- [ ] Click backdrop
- [ ] **Expected:** Dialog closes
- [ ] Press Escape key
- [ ] **Expected:** Dialog closes
- [ ] Scroll tag list (if >10 tags)
- [ ] **Expected:** Smooth scrolling, header sticky

### Responsive Design
- [ ] Resize browser to mobile width (< 640px)
- [ ] **Expected:** Tag badges wrap gracefully
- [ ] **Expected:** Color picker adjusts grid
- [ ] **Expected:** Dialogs responsive, no overflow

---

## 9. Performance Testing

### Load Testing
- [ ] Create 50 tags
- [ ] Open Tag Manager
- [ ] **Expected:** All tags load within 1 second
- [ ] Search through tags
- [ ] **Expected:** Search instant (<100ms)
- [ ] Assign 20 tags to single case
- [ ] **Expected:** All badges render smoothly

### Memory Leaks
- [ ] Open/close Tag Manager 10 times rapidly
- [ ] Check Chrome Task Manager
- [ ] **Expected:** Memory stabilizes, no continuous growth
- [ ] Assign/remove tags 20 times
- [ ] **Expected:** No memory leak warnings

---

## 10. Data Integrity

### Database Checks
- [ ] Create tag "DB Test"
- [ ] Check SQLite database directly:
  ```sql
  SELECT * FROM tags WHERE name = 'DB Test';
  ```
- [ ] **Expected:** Tag exists with correct user_id, color, description
- [ ] Assign tag to case
- [ ] Check case_tags table:
  ```sql
  SELECT * FROM case_tags WHERE tag_id = ?;
  ```
- [ ] **Expected:** Entry exists with correct case_id and tag_id
- [ ] Delete tag
- [ ] **Expected:** case_tags entry deleted (CASCADE)

### Audit Logs
- [ ] Check audit_log table after each CRUD operation:
  ```sql
  SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 5;
  ```
- [ ] **Expected:** Entries for:
  - tag_created
  - tag_updated
  - tag_deleted
  - tag_assigned_to_case
  - tag_removed_from_case

---

## 11. Cross-Browser Testing

### Chrome
- [ ] All features work ✅ / ❌
- [ ] Animations smooth ✅ / ❌
- [ ] No console errors ✅ / ❌

### Firefox
- [ ] All features work ✅ / ❌
- [ ] Animations smooth ✅ / ❌
- [ ] No console errors ✅ / ❌

### Edge
- [ ] All features work ✅ / ❌
- [ ] Animations smooth ✅ / ❌
- [ ] No console errors ✅ / ❌

### Safari (macOS)
- [ ] All features work ✅ / ❌
- [ ] Animations smooth ✅ / ❌
- [ ] No console errors ✅ / ❌

---

## 12. Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] **Expected:** Visible focus indicators
- [ ] Navigate Tag Manager with keyboard only
- [ ] **Expected:** All actions accessible
- [ ] Use Space/Enter to activate buttons
- [ ] **Expected:** Works identically to mouse clicks

### Screen Reader
- [ ] Use screen reader (NVDA/VoiceOver/JAWS)
- [ ] Navigate tag list
- [ ] **Expected:** Each tag announced with name and color
- [ ] Activate remove button
- [ ] **Expected:** Announces "Remove [tag name] tag"
- [ ] Navigate color picker
- [ ] **Expected:** Each color announced by name

### ARIA Labels
- [ ] Inspect Tag Manager HTML
- [ ] **Expected:** All buttons have `aria-label` or `aria-labelledby`
- [ ] **Expected:** Dialog has `role="dialog"`
- [ ] **Expected:** Color picker has `role="radiogroup"`

---

## Test Results Summary

**Total Tests:** _____ / _____
**Passed:** _____
**Failed:** _____
**Skipped:** _____

### Critical Issues Found:
1. _____________________________________________________________
2. _____________________________________________________________
3. _____________________________________________________________

### Minor Issues Found:
1. _____________________________________________________________
2. _____________________________________________________________
3. _____________________________________________________________

### Suggestions for Improvement:
1. _____________________________________________________________
2. _____________________________________________________________
3. _____________________________________________________________

---

## Sign-Off

**Tester Signature:** _____________
**Date:** _____________
**Status:** ⬜ Approved ⬜ Needs Revision ⬜ Failed

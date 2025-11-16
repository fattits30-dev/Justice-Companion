# Tags HTTP API Migration Guide

**Status:** ✅ COMPLETE
**Date:** 2025-11-13
**Migration:** Electron IPC → FastAPI HTTP REST API

---

## Overview

The tags feature has been successfully migrated from Electron IPC to HTTP REST API. All tag operations now communicate with the FastAPI backend at `http://127.0.0.1:8000/tags`.

### Key Changes

1. **API Client Integration:** All tag operations now use `apiClient.tags.*` methods
2. **New Components:** TagColorPicker, TagSelector, CaseTagSelector
3. **Updated Components:** TagManagerDialog, TagBadge
4. **Type Safety:** Comprehensive TypeScript types in `src/lib/types/api.ts`

---

## API Endpoints Reference

### Base URL
```
http://127.0.0.1:8000/tags
```

### Authentication
All endpoints require authentication via `X-Session-Id` header (automatically handled by `apiClient`).

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tags` | List all tags for authenticated user |
| `POST` | `/tags` | Create new tag |
| `GET` | `/tags/{id}` | Get specific tag by ID |
| `PUT` | `/tags/{id}` | Update tag |
| `DELETE` | `/tags/{id}` | Delete tag (cascade to case_tags) |
| `POST` | `/tags/{tag_id}/cases/{case_id}` | Attach tag to case |
| `DELETE` | `/tags/{tag_id}/cases/{case_id}` | Remove tag from case |
| `GET` | `/tags/{tag_id}/cases` | List all cases with tag |
| `GET` | `/tags/cases/{case_id}/tags` | List all tags for case |
| `GET` | `/tags/search` | Search cases by tags (AND/OR) |
| `GET` | `/tags/statistics` | Get tag usage statistics |

---

## API Client Methods

### Tag CRUD

```typescript
// List all tags
const response = await apiClient.tags.list();
// Returns: ApiResponse<TagResponse[]>

// Get single tag
const response = await apiClient.tags.get(tagId);
// Returns: ApiResponse<TagResponse>

// Create tag
const response = await apiClient.tags.create({
  name: "Urgent",
  color: "#EF4444",
  description: "High priority items"
});
// Returns: ApiResponse<TagResponse>

// Update tag
const response = await apiClient.tags.update(tagId, {
  name: "Critical",
  color: "#DC2626"
});
// Returns: ApiResponse<TagResponse>

// Delete tag
const response = await apiClient.tags.delete(tagId);
// Returns: ApiResponse<DeleteTagResponse>
```

### Tag Assignment

```typescript
// Attach tag to case
const response = await apiClient.tags.attachToCase(tagId, caseId);
// Returns: ApiResponse<TagAttachResponse>
// Idempotent: returns success even if already attached

// Remove tag from case
const response = await apiClient.tags.removeFromCase(tagId, caseId);
// Returns: ApiResponse<TagRemoveResponse>
// Idempotent: returns success even if not attached

// Get all tags for a case
const response = await apiClient.tags.getTagsForCase(caseId);
// Returns: ApiResponse<TagResponse[]>

// Get all cases with a tag
const response = await apiClient.tags.getCasesWithTag(tagId);
// Returns: ApiResponse<Case[]>
```

### Tag Search

```typescript
// Search cases by tags with AND logic
const response = await apiClient.tags.searchCasesByTags({
  tagIds: [1, 2, 3],
  matchAll: true  // Must have ALL tags
});
// Returns: ApiResponse<TagSearchResponse>

// Search cases by tags with OR logic
const response = await apiClient.tags.searchCasesByTags({
  tagIds: [1, 2, 3],
  matchAll: false  // Must have ANY tag
});
// Returns: ApiResponse<TagSearchResponse>
```

### Tag Statistics

```typescript
// Get tag usage statistics
const response = await apiClient.tags.getStatistics();
// Returns: ApiResponse<TagStatisticsResponse>
// Includes: totalTags, tagsWithCases, mostUsedTags, unusedTags
```

---

## Type Definitions

### Core Types

```typescript
export interface TagResponse {
  id: number;
  userId: number;
  name: string;
  color: string;
  description?: string;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface DeleteTagResponse {
  deleted: boolean;
  id: number;
}

export interface TagAttachResponse {
  success: boolean;
  message: string;
  caseId: number;
  tagId: number;
  wasAttached: boolean;
}

export interface TagRemoveResponse {
  success: boolean;
  message: string;
  caseId: number;
  tagId: number;
  removed: boolean;
}

export interface TagSearchResponse {
  caseIds: number[];
  matchAll: boolean;
  tagIds: number[];
  resultCount: number;
}

export interface TagStatisticsResponse {
  totalTags: number;
  tagsWithCases: number;
  mostUsedTags: Array<{
    id: number;
    name: string;
    color: string;
    usageCount: number;
  }>;
  unusedTags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}
```

---

## Component API

### TagColorPicker

Select from 16 predefined colors with visual feedback.

```typescript
import { TagColorPicker } from "./components/tags/TagColorPicker";

<TagColorPicker
  selectedColor="#3B82F6"
  onColorSelect={(color) => setColor(color)}
  size="md"  // "sm" | "md" | "lg"
/>
```

**Features:**
- 16 predefined colors (Red, Amber, Green, Blue, Violet, Pink, Gray, Teal, Orange, Purple, Lime, Cyan, Rose, Emerald, Indigo, Slate)
- Visual selection with checkmark
- Keyboard accessible
- Animated hover/selection states

### TagSelector

Multi-select dropdown for adding/removing tags from cases.

```typescript
import { TagSelector } from "./components/tags/TagSelector";

<TagSelector
  caseId={123}
  selectedTags={tags}
  onTagsChange={(newTags) => setTags(newTags)}
/>
```

**Features:**
- Search tags by name
- Create new tags inline
- Multi-select with visual badges
- Automatic tag assignment to case
- Loading states and error handling
- Click outside to close

### CaseTagSelector

Simplified tag selector with inline/block modes.

```typescript
import { CaseTagSelector } from "./components/tags/CaseTagSelector";

// Inline mode (compact)
<CaseTagSelector
  caseId={123}
  inline={true}
  onTagsChange={(tags) => console.log(tags)}
/>

// Block mode (full selector)
<CaseTagSelector
  caseId={123}
  onTagsChange={(tags) => console.log(tags)}
/>
```

**Features:**
- Auto-loads case tags on mount
- Inline mode: shows tags + "Add Tags" button
- Block mode: shows full TagSelector
- Real-time sync with backend

### TagManagerDialog

Comprehensive tag management interface.

```typescript
import { TagManagerDialog } from "./components/tags/TagManagerDialog";

<TagManagerDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

**Features:**
- Create new tags with color picker
- Edit existing tags (name, color, description)
- Delete tags with usage count warning
- Search and filter tags
- Tag statistics (usage count)
- Form validation
- Error handling

### TagBadge

Display tag with color and optional remove button.

```typescript
import { TagBadge } from "./components/ui/TagBadge";

<TagBadge
  name="Urgent"
  color="#EF4444"
  onRemove={() => removeTag(tagId)}
  size="sm"  // "sm" | "md" | "lg"
  variant="default"  // "default" | "outlined"
/>
```

**Features:**
- Automatic contrast color calculation (WCAG)
- Remove button with hover effect
- Multiple sizes
- Default (filled) and outlined variants

---

## Tag Color Palette

16 predefined colors for consistency across the application:

| Color | Hex | Use Case |
|-------|-----|----------|
| Red | `#EF4444` | Urgent, Critical, Danger |
| Amber | `#F59E0B` | Warning, Pending |
| Green | `#10B981` | Success, Completed |
| Blue | `#3B82F6` | Info, Default |
| Violet | `#8B5CF6` | Important |
| Pink | `#EC4899` | Highlight |
| Gray | `#6B7280` | Neutral |
| Teal | `#14B8A6` | Reviewed |
| Orange | `#F97316` | Action Required |
| Purple | `#A855F7` | Priority |
| Lime | `#84CC16` | Progress |
| Cyan | `#06B6D4` | Note |
| Rose | `#F43F5E` | Alert |
| Emerald | `#10B981` | Verified |
| Indigo | `#6366F1` | Draft |
| Slate | `#64748B` | Archived |

**Backend Validation:** All colors must be valid hex codes matching this palette (regex: `^#[0-9A-Fa-f]{6}$`).

---

## Migration Checklist

### Before Migration (Old IPC API)
- ❌ `window.api.tags.list(sessionId)`
- ❌ `window.api.tags.create(input, sessionId)`
- ❌ `window.api.tags.update(id, input, sessionId)`
- ❌ `window.api.tags.delete(id, sessionId)`
- ❌ `window.api.tags.tagCase(caseId, tagId, sessionId)`
- ❌ `window.api.tags.untagCase(caseId, tagId, sessionId)`
- ❌ Session ID management via `window.sessionManager`

### After Migration (HTTP API)
- ✅ `apiClient.tags.list()`
- ✅ `apiClient.tags.create({ name, color, description })`
- ✅ `apiClient.tags.update(id, { name, color, description })`
- ✅ `apiClient.tags.delete(id)`
- ✅ `apiClient.tags.attachToCase(tagId, caseId)`
- ✅ `apiClient.tags.removeFromCase(tagId, caseId)`
- ✅ `apiClient.tags.searchCasesByTags({ tagIds, matchAll })`
- ✅ `apiClient.tags.getStatistics()`
- ✅ Session ID automatically included in headers

---

## Testing Checklist

### Manual Testing

**Prerequisites:**
- FastAPI backend running at `http://localhost:8000`
- Valid session (logged in user)
- At least 1 case created

**Test Scenarios:**

#### Tag CRUD
- [ ] Create tag with valid name and color
- [ ] Create tag with duplicate name (should fail with error)
- [ ] Create tag with invalid color (should fail validation)
- [ ] Update tag name
- [ ] Update tag color
- [ ] Update tag description
- [ ] Delete unused tag (success)
- [ ] Delete tag in use (should show warning with usage count)
- [ ] List all tags (sorted alphabetically)

#### Tag Assignment
- [ ] Attach tag to case (success)
- [ ] Attach same tag to case again (idempotent, no error)
- [ ] Remove tag from case (success)
- [ ] Remove tag not attached to case (idempotent, no error)
- [ ] Get all tags for a case
- [ ] Get all cases with a specific tag

#### Tag Search
- [ ] Search cases with single tag (OR mode)
- [ ] Search cases with multiple tags (OR mode) - cases with ANY tag
- [ ] Search cases with multiple tags (AND mode) - cases with ALL tags
- [ ] Search with non-existent tag IDs (returns empty results)

#### Tag Statistics
- [ ] View total tags count
- [ ] View tags with cases count
- [ ] View most used tags (top 5)
- [ ] View unused tags

#### UI Components
- [ ] TagColorPicker shows all 16 colors
- [ ] TagColorPicker highlights selected color
- [ ] TagColorPicker keyboard navigation works
- [ ] TagSelector loads all available tags
- [ ] TagSelector search filters tags correctly
- [ ] TagSelector "Create New Tag" flow works
- [ ] TagSelector adds tag to case on selection
- [ ] TagSelector removes tag on badge click
- [ ] TagManagerDialog creates tag successfully
- [ ] TagManagerDialog updates tag successfully
- [ ] TagManagerDialog deletes tag with confirmation
- [ ] TagManagerDialog shows usage count
- [ ] CaseTagSelector loads case tags on mount
- [ ] CaseTagSelector inline mode displays correctly

#### Error Handling
- [ ] Invalid session returns 401
- [ ] Invalid tag ID returns 404
- [ ] Duplicate tag name returns 400
- [ ] Invalid color format returns 400
- [ ] Empty tag name returns 400
- [ ] Network error shows user-friendly message
- [ ] Loading states display during async operations

---

## Common Issues & Solutions

### Issue: Tags not loading

**Symptoms:** Empty tag list, no error message

**Solutions:**
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify session ID is valid: Check `apiClient.getSessionId()`
3. Check browser console for network errors
4. Verify backend logs for authentication errors

### Issue: Tag creation fails with 400

**Symptoms:** "Failed to create tag" error

**Solutions:**
1. Verify tag name is 1-50 characters
2. Verify color is valid hex (`#RRGGBB`)
3. Check for duplicate tag name (case-insensitive)
4. Review backend logs for validation details

### Issue: Tag deletion fails

**Symptoms:** "Failed to delete tag" error, tag still exists

**Solutions:**
1. Verify user owns the tag
2. Check if tag is in use (backend cascades to case_tags)
3. Review backend logs for foreign key errors
4. Ensure session is valid

### Issue: Tag search returns unexpected results

**Symptoms:** Wrong cases returned, or no results

**Solutions:**
1. Verify `matchAll` parameter is correct
   - `true`: Cases must have ALL tags (AND)
   - `false`: Cases must have ANY tag (OR)
2. Check tag IDs are valid
3. Verify user owns the cases
4. Review SQL query in backend logs

### Issue: Component not updating after tag operation

**Symptoms:** UI doesn't reflect changes immediately

**Solutions:**
1. Ensure `onTagsChange` callback is called
2. Check parent component state is updated
3. Verify `loadTags()` is called after CRUD operations
4. Add `useEffect` dependency for reactive updates

---

## Performance Considerations

### Caching
- Tags are loaded on-demand (not global state)
- Use React Query or SWR for caching if needed
- Consider memoizing tag lists in parent components

### Optimization Tips
1. **Debounce search input** in TagSelector (300ms)
2. **Lazy load tag statistics** (only when needed)
3. **Batch tag assignments** if creating multiple tags
4. **Use tag IDs** for filtering, not names (faster DB queries)

### Pagination
- Current implementation loads all tags (fine for <100 tags)
- Add pagination if user has >100 tags:
  ```typescript
  GET /tags?limit=20&offset=0
  ```

---

## Backend Implementation Notes

### Service Layer
- **TagService:** Handles all tag business logic
- **AuditLogger:** Logs all CRUD operations
- **Authentication:** Validates session on every request

### Database Schema
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name COLLATE NOCASE),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE case_tags (
  case_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (case_id, tag_id),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### Cascade Behavior
- **Delete User:** All tags deleted (ON DELETE CASCADE)
- **Delete Case:** All case_tags entries deleted (ON DELETE CASCADE)
- **Delete Tag:** All case_tags entries deleted (ON DELETE CASCADE)

### Validation Rules
- **Name:** 1-50 characters, unique per user (case-insensitive)
- **Color:** Must be hex format `#RRGGBB` (e.g., `#EF4444`)
- **Description:** Optional, max 200 characters

---

## Future Enhancements

### Planned Features
1. **Evidence Tags:** Extend tagging system to evidence items
2. **Tag Hierarchies:** Parent-child tag relationships
3. **Tag Templates:** Pre-defined tag sets for case types
4. **Tag Analytics:** Usage trends, popular tags by time period
5. **Bulk Operations:** Assign multiple tags to multiple cases
6. **Tag Import/Export:** Share tag sets between users
7. **Custom Colors:** Allow users to define custom hex colors

### API Extensions
1. `GET /tags/popular?limit=10` - Most used tags
2. `POST /tags/bulk-assign` - Assign multiple tags to multiple cases
3. `GET /tags/analytics` - Tag usage over time
4. `POST /tags/import` - Import tags from JSON
5. `GET /tags/export` - Export tags to JSON

---

## References

- **Backend Routes:** `backend/routes/tags.py`
- **Backend Service:** `backend/services/tag_service.py`
- **API Client:** `src/lib/apiClient.ts`
- **Type Definitions:** `src/lib/types/api.ts`
- **Components:** `src/components/tags/`
- **Tag Model:** `src/models/Tag.ts`

---

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Check browser console for client errors
3. Review API response structure in Network tab
4. Test API endpoints directly with `curl` or Postman
5. Refer to FastAPI docs: `http://localhost:8000/docs`

---

**Last Updated:** 2025-11-13
**Migration Status:** ✅ Complete and Production-Ready

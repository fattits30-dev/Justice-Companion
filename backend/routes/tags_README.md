# Tags API - FastAPI Backend Implementation

This module implements the tag management system for Justice Companion, migrated from the Electron IPC handlers to FastAPI REST API.

## Overview

Tags allow users to organize and categorize their legal cases with colored labels. The system supports:
- Creating, updating, and deleting tags
- Attaching/removing tags from cases (many-to-many relationship)
- Listing cases by tag
- Tag usage statistics

## Database Schema

### Tags Table
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name) -- Each user has unique tag names
);
```

### CaseTag Junction Table
```sql
CREATE TABLE case_tags (
  case_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (case_id, tag_id),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## API Endpoints

All endpoints require authentication via `session_id` in the `Authorization` header or query parameter.

### Tag Management

#### `POST /tags` - Create Tag
Creates a new tag for the authenticated user.

**Request Body:**
```json
{
  "name": "Urgent",
  "color": "#EF4444",
  "description": "High priority cases requiring immediate attention"
}
```

**Validation:**
- `name`: 1-50 characters, trimmed, unique per user
- `color`: Hex color code format `#RRGGBB`
- `description`: Optional, max 200 characters

**Response:** `201 Created`
```json
{
  "id": 1,
  "userId": 5,
  "name": "Urgent",
  "color": "#EF4444",
  "description": "High priority cases requiring immediate attention",
  "createdAt": "2025-01-13T10:30:00Z",
  "updatedAt": "2025-01-13T10:30:00Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid color format, duplicate name, empty name
- `401 Unauthorized`: Invalid or missing session
- `500 Internal Server Error`: Database error

---

#### `GET /tags` - List Tags
Lists all tags for the authenticated user with usage counts.

**Query Parameters:** None

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "userId": 5,
    "name": "Urgent",
    "color": "#EF4444",
    "description": "High priority cases",
    "usageCount": 3,
    "createdAt": "2025-01-13T10:30:00Z",
    "updatedAt": "2025-01-13T10:30:00Z"
  },
  {
    "id": 2,
    "userId": 5,
    "name": "Employment",
    "color": "#3B82F6",
    "description": null,
    "usageCount": 0,
    "createdAt": "2025-01-13T11:00:00Z",
    "updatedAt": "2025-01-13T11:00:00Z"
  }
]
```

**Sorting:** Tags are sorted alphabetically by name.

---

#### `GET /tags/{tag_id}` - Get Specific Tag
Retrieves a single tag by ID (must belong to authenticated user).

**Path Parameters:**
- `tag_id`: Integer tag ID

**Response:** `200 OK`
```json
{
  "id": 1,
  "userId": 5,
  "name": "Urgent",
  "color": "#EF4444",
  "description": "High priority cases",
  "usageCount": 3,
  "createdAt": "2025-01-13T10:30:00Z",
  "updatedAt": "2025-01-13T10:30:00Z"
}
```

**Errors:**
- `404 Not Found`: Tag doesn't exist or belongs to another user

---

#### `PUT /tags/{tag_id}` - Update Tag
Updates an existing tag (partial update).

**Path Parameters:**
- `tag_id`: Integer tag ID

**Request Body:** (all fields optional, at least one required)
```json
{
  "name": "Critical",
  "color": "#DC2626",
  "description": "Extremely urgent cases"
}
```

**Validation:**
- Same as `POST /tags`
- Updated `name` must not conflict with other user's tags

**Response:** `200 OK`
```json
{
  "id": 1,
  "userId": 5,
  "name": "Critical",
  "color": "#DC2626",
  "description": "Extremely urgent cases",
  "usageCount": 3,
  "createdAt": "2025-01-13T10:30:00Z",
  "updatedAt": "2025-01-13T14:20:00Z"
}
```

**Errors:**
- `400 Bad Request`: No fields provided, duplicate name, invalid color
- `404 Not Found`: Tag doesn't exist or unauthorized

---

#### `DELETE /tags/{tag_id}` - Delete Tag
Deletes a tag and removes all case associations.

**Path Parameters:**
- `tag_id`: Integer tag ID

**Response:** `200 OK`
```json
{
  "deleted": true,
  "id": 1
}
```

**Side Effects:**
- All `case_tags` entries with this `tag_id` are automatically deleted (CASCADE)

**Errors:**
- `404 Not Found`: Tag doesn't exist or unauthorized

---

### Case-Tag Association

#### `POST /tags/{tag_id}/cases/{case_id}` - Attach Tag to Case
Associates a tag with a case.

**Path Parameters:**
- `tag_id`: Integer tag ID
- `case_id`: Integer case ID

**Request Body:** None

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Tag attached to case successfully",
  "caseId": 10,
  "tagId": 1
}
```

**Idempotent:** Returns success if tag is already attached.

**Validation:**
- Both tag and case must belong to the authenticated user

**Errors:**
- `404 Not Found`: Tag or case doesn't exist or unauthorized

---

#### `DELETE /tags/{tag_id}/cases/{case_id}` - Remove Tag from Case
Removes tag association from a case.

**Path Parameters:**
- `tag_id`: Integer tag ID
- `case_id`: Integer case ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Tag removed from case successfully",
  "caseId": 10,
  "tagId": 1,
  "removed": true
}
```

**Idempotent:** Returns success even if tag wasn't attached.

**Errors:**
- `404 Not Found`: Tag or case doesn't exist or unauthorized

---

### Query Endpoints

#### `GET /tags/{tag_id}/cases` - List Cases with Tag
Lists all cases that have a specific tag.

**Path Parameters:**
- `tag_id`: Integer tag ID

**Response:** `200 OK`
```json
[
  {
    "id": 10,
    "title": "Employment Dispute with Acme Corp",
    "description": "Wrongful termination case",
    "caseType": "employment",
    "status": "active",
    "userId": 5,
    "caseNumber": "2025-EMP-001",
    "courtName": null,
    "judge": null,
    "opposingParty": "Acme Corporation",
    "opposingCounsel": null,
    "nextHearingDate": "2025-02-15",
    "filingDeadline": null,
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-13T14:30:00Z"
  }
]
```

**Sorting:** Cases are sorted by most recently updated first.

---

#### `GET /tags/cases/{case_id}/tags` - List Tags for Case
Lists all tags attached to a specific case.

**Path Parameters:**
- `case_id`: Integer case ID

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "userId": 5,
    "name": "Urgent",
    "color": "#EF4444",
    "description": "High priority cases",
    "usageCount": 3,
    "createdAt": "2025-01-13T10:30:00Z",
    "updatedAt": "2025-01-13T10:30:00Z"
  }
]
```

**Sorting:** Tags are sorted alphabetically by name.

---

#### `GET /tags/statistics` - Get Tag Statistics
Returns statistics about tag usage for the authenticated user.

**Response:** `200 OK`
```json
{
  "totalTags": 5,
  "tagsWithCases": 3,
  "mostUsedTags": [
    {
      "id": 1,
      "name": "Urgent",
      "color": "#EF4444",
      "usageCount": 7
    },
    {
      "id": 3,
      "name": "Review",
      "color": "#3B82F6",
      "usageCount": 4
    }
  ],
  "unusedTags": [
    {
      "id": 2,
      "name": "Employment",
      "color": "#10B981"
    }
  ]
}
```

**Fields:**
- `totalTags`: Total number of tags created by user
- `tagsWithCases`: Number of tags attached to at least one case
- `mostUsedTags`: Top 5 tags by case count
- `unusedTags`: Tags with zero cases

---

## Authentication

All endpoints require authentication via session ID:

**Header-based (recommended):**
```
Authorization: Bearer <session_id>
```
or
```
Authorization: <session_id>
```

**Query parameter (alternative):**
```
?session_id=<session_id>
```

**Error Response:** `401 Unauthorized`
```json
{
  "detail": "Session ID required (provide in Authorization header or session_id query param)"
}
```
or
```json
{
  "detail": "Invalid or expired session"
}
```

---

## Audit Logging

All tag operations are logged to the audit log:

- `tag.created` - Tag creation
- `tag.updated` - Tag modification
- `tag.deleted` - Tag deletion
- `case_tag.attached` - Tag attached to case
- `case_tag.removed` - Tag removed from case

Audit logs include:
- `event_type`: Operation type
- `user_id`: Authenticated user
- `resource_type`: "tag" or "case_tag"
- `resource_id`: Tag ID or "case_id:tag_id"
- `action`: "create", "update", "delete"
- `details`: Field changes, case/tag IDs
- `success`: Operation outcome
- `error_message`: Error details if failed

---

## Error Handling

### Validation Errors (400 Bad Request)
- Empty tag name
- Invalid hex color format
- Duplicate tag name (per user)
- No fields provided for update
- Tag name/color format violations

### Authorization Errors (401 Unauthorized)
- Missing session ID
- Invalid session ID
- Expired session

### Not Found Errors (404 Not Found)
- Tag doesn't exist
- Tag belongs to another user
- Case doesn't exist
- Case belongs to another user

### Server Errors (500 Internal Server Error)
- Database connection failures
- Unexpected errors

All errors return JSON:
```json
{
  "detail": "Human-readable error message"
}
```

---

## Data Validation

### Pydantic Models

**CreateTagRequest:**
```python
name: str (1-50 chars, trimmed)
color: str (regex: ^#[0-9A-Fa-f]{6}$)
description: Optional[str] (max 200 chars)
```

**UpdateTagRequest:**
```python
name: Optional[str] (1-50 chars, trimmed)
color: Optional[str] (regex: ^#[0-9A-Fa-f]{6}$)
description: Optional[str] (max 200 chars)
```

**TagResponse:**
```python
id: int
userId: int
name: str
color: str
description: Optional[str]
usageCount: Optional[int]
createdAt: str (ISO 8601)
updatedAt: str (ISO 8601)
```

---

## Database Queries

### Security
- All queries filter by `user_id` to ensure data isolation
- SQLite CASCADE deletes handle cleanup automatically
- Raw SQL with parameterized queries prevents SQL injection

### Performance
- Indexes on `user_id`, `name`, `case_id`, `tag_id`
- Efficient JOIN queries for tag usage counts
- Minimal database round trips

---

## Default Tag Colors

The system provides 10 predefined colors:

```python
DEFAULT_TAG_COLORS = [
    "#EF4444",  # Red
    "#F59E0B",  # Amber
    "#10B981",  # Green
    "#3B82F6",  # Blue
    "#8B5CF6",  # Violet
    "#EC4899",  # Pink
    "#6B7280",  # Gray (default)
    "#14B8A6",  # Teal
    "#F97316",  # Orange
    "#A855F7",  # Purple
]
```

---

## Migration from Electron IPC

### Mapping of IPC Channels to REST Endpoints

| Electron IPC Channel | FastAPI Endpoint | Method |
|---------------------|------------------|--------|
| `tags:list` | `/tags` | GET |
| `tags:create` | `/tags` | POST |
| `tags:update` | `/tags/{tag_id}` | PUT |
| `tags:delete` | `/tags/{tag_id}` | DELETE |
| `tags:tagEvidence` | `/tags/{tag_id}/cases/{case_id}` | POST |
| `tags:untagEvidence` | `/tags/{tag_id}/cases/{case_id}` | DELETE |
| `tags:getForEvidence` | `/tags/cases/{case_id}/tags` | GET |
| `tags:searchByTags` | `/tags/{tag_id}/cases` | GET |
| `tags:statistics` | `/tags/statistics` | GET |

### Breaking Changes
- Evidence tagging changed to case tagging
- `evidence_tags` table → `case_tags` table
- Response format uses camelCase consistently
- Timestamps are ISO 8601 strings (not Unix epochs)

---

## Testing Examples

### Create a Tag
```bash
curl -X POST http://localhost:8000/tags \
  -H "Authorization: <session_id>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Urgent", "color": "#EF4444", "description": "High priority"}'
```

### List User's Tags
```bash
curl -X GET http://localhost:8000/tags \
  -H "Authorization: <session_id>"
```

### Attach Tag to Case
```bash
curl -X POST http://localhost:8000/tags/1/cases/10 \
  -H "Authorization: <session_id>"
```

### Get Tag Statistics
```bash
curl -X GET http://localhost:8000/tags/statistics \
  -H "Authorization: <session_id>"
```

---

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Operations**
   - `POST /tags/bulk` - Create multiple tags at once
   - `POST /tags/{tag_id}/cases/bulk` - Attach tag to multiple cases

2. **Tag Templates**
   - Predefined tag sets for common case types
   - User-shareable tag templates

3. **Smart Tagging**
   - AI-powered tag suggestions based on case content
   - Auto-tagging based on case type/keywords

4. **Tag Hierarchies**
   - Parent-child tag relationships
   - Tag groups/categories

5. **Tag Colors**
   - Custom color picker integration
   - Color schemes/themes

6. **Advanced Search**
   - Filter cases by multiple tags (AND/OR logic)
   - Tag-based reports and analytics

---

## Related Files

- **Model:** `backend/models/tag.py` - SQLAlchemy ORM models
- **Routes:** `backend/routes/tags.py` - FastAPI endpoints (this file)
- **Migration:** `backend/migrations/002_create_case_tags.sql` - Database schema
- **Main App:** `backend/main.py` - Router registration
- **Original:** `electron/ipc-handlers/tags.ts` - Legacy IPC handlers

---

## License
Part of Justice Companion - Privacy-First Legal Case Management System

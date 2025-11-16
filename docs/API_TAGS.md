# Tag Management API Documentation

**Status:** Service layer integration complete
**Version:** 2.0 (Refactored with TagService)

## Overview

The Tag Management API provides endpoints for organizing cases with user-defined labels. Tags support:
- CRUD operations with ownership verification
- Many-to-many case-tag relationships
- Advanced search with AND/OR logic
- Usage statistics and analytics
- Comprehensive audit logging

## Architecture

### Service Layer Integration

All routes now use the service layer instead of direct database queries:

```
┌─────────────────┐
│  FastAPI Route  │  ← HTTP request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   TagService    │  ← Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AuditLogger    │  ← Immutable audit trail
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  ← SQLAlchemy ORM
└─────────────────┘
```

**Benefits:**
- Separation of concerns (route layer vs business logic)
- Testable business logic (isolated from HTTP)
- Consistent error handling across endpoints
- Automatic audit logging for all operations
- Easier to maintain and extend

## Authentication

All endpoints require authentication via session ID:

```bash
# Via Authorization header (recommended)
curl -H "Authorization: Bearer <session_id>" https://api.example.com/tags

# Via query parameter (alternative)
curl https://api.example.com/tags?session_id=<session_id>
```

## Endpoints

### 1. Create Tag

**POST** `/tags`

Create a new tag with name, color, and optional description.

**Request Body:**
```json
{
  "name": "Urgent",
  "color": "#FF0000",
  "description": "High priority cases (optional)"
}
```

**Validation Rules:**
- `name`: 1-50 characters, unique per user
- `color`: Hex color code (e.g., `#FF0000`)
- `description`: Optional, max 200 characters

**Response (201 Created):**
```json
{
  "id": 1,
  "userId": 123,
  "name": "Urgent",
  "color": "#FF0000",
  "description": "High priority cases",
  "usageCount": 0,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Duplicate tag name
- `401 Unauthorized` - Invalid/missing session
- `422 Unprocessable Entity` - Validation error

**Service Layer:** `TagService.create_tag()`

---

### 2. List Tags

**GET** `/tags`

List all tags for the authenticated user with usage counts.

**Query Parameters:** None

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "name": "Urgent",
    "color": "#FF0000",
    "description": "High priority cases",
    "usageCount": 5,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "userId": 123,
    "name": "Commercial",
    "color": "#00FF00",
    "description": null,
    "usageCount": 3,
    "createdAt": "2025-01-16T09:15:00Z",
    "updatedAt": "2025-01-16T09:15:00Z"
  }
]
```

**Notes:**
- Tags are ordered alphabetically by name
- `usageCount` shows number of cases using this tag
- Returns empty array if no tags exist

**Service Layer:** `TagService.get_tags()`

---

### 3. Search Cases by Tags (AND/OR Logic)

**GET** `/tags/search`

Search cases by tags with configurable AND or OR logic.

**Query Parameters:**
- `tag_ids` (required): Comma-separated tag IDs (e.g., `1,2,3`)
- `match_all` (optional): Boolean, default `true`
  - `true`: Cases must have **ALL** tags (AND logic)
  - `false`: Cases must have **ANY** tag (OR logic)

**Examples:**

**AND Logic (default):**
```bash
# Find cases with BOTH "Urgent" (tag 1) AND "Commercial" (tag 2)
GET /tags/search?tag_ids=1,2&match_all=true
```

**OR Logic:**
```bash
# Find cases with "Urgent" (tag 1) OR "Commercial" (tag 2)
GET /tags/search?tag_ids=1,2&match_all=false
```

**Response (200 OK):**
```json
{
  "caseIds": [101, 205, 312],
  "matchAll": true,
  "tagIds": [1, 2],
  "resultCount": 3
}
```

**Use Cases:**
- **AND Logic**: "Show me cases that are BOTH urgent AND commercial"
- **OR Logic**: "Show me cases that are urgent OR high-value"
- **Complex Filters**: Combine with other case filters for advanced search

**Service Layer:** `TagService.search_cases_by_tags()`

---

### 4. Get Tag by ID

**GET** `/tags/{tag_id}`

Retrieve a specific tag with usage count.

**Path Parameters:**
- `tag_id` (integer): Tag ID

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 123,
  "name": "Urgent",
  "color": "#FF0000",
  "description": "High priority cases",
  "usageCount": 5,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Tag doesn't exist or unauthorized

**Service Layer:** `TagService.get_tag_by_id()`

---

### 5. Update Tag

**PUT** `/tags/{tag_id}`

Update tag attributes (partial updates supported).

**Path Parameters:**
- `tag_id` (integer): Tag ID

**Request Body (all fields optional):**
```json
{
  "name": "Super Urgent",
  "color": "#FF6600",
  "description": "Highest priority cases"
}
```

**Notes:**
- Only provided fields are updated
- At least one field must be provided
- `updatedAt` timestamp is automatically updated

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 123,
  "name": "Super Urgent",
  "color": "#FF6600",
  "description": "Highest priority cases",
  "usageCount": 5,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-17T14:20:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - No fields provided or duplicate name
- `404 Not Found` - Tag doesn't exist or unauthorized

**Service Layer:** `TagService.update_tag()`

---

### 6. Delete Tag

**DELETE** `/tags/{tag_id}`

Delete a tag and remove it from all cases.

**Path Parameters:**
- `tag_id` (integer): Tag ID

**Response (200 OK):**
```json
{
  "deleted": true,
  "id": 1
}
```

**Notes:**
- Cascade deletion removes all case-tag associations
- Operation is permanent (no soft delete)
- Audit log entry is created before deletion

**Error Responses:**
- `404 Not Found` - Tag doesn't exist or unauthorized

**Service Layer:** `TagService.delete_tag()`

---

### 7. Attach Tag to Case

**POST** `/tags/{tag_id}/cases/{case_id}`

Attach a tag to a case.

**Path Parameters:**
- `tag_id` (integer): Tag ID
- `case_id` (integer): Case ID

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Tag attached to case successfully",
  "caseId": 101,
  "tagId": 1,
  "wasAttached": true
}
```

**Notes:**
- **Idempotent**: Attaching the same tag twice returns success
- `wasAttached` is `false` if tag was already attached
- Validates both tag and case belong to user

**Error Responses:**
- `404 Not Found` - Tag or case doesn't exist or unauthorized

**Service Layer:** `TagService.attach_tag_to_case()`

---

### 8. Remove Tag from Case

**DELETE** `/tags/{tag_id}/cases/{case_id}`

Remove a tag from a case.

**Path Parameters:**
- `tag_id` (integer): Tag ID
- `case_id` (integer): Case ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tag removed from case successfully",
  "caseId": 101,
  "tagId": 1,
  "removed": true
}
```

**Notes:**
- **Idempotent**: Removing a tag that isn't attached returns success
- `removed` is `false` if tag wasn't attached

**Service Layer:** `TagService.remove_tag_from_case()`

---

### 9. List Cases with Tag

**GET** `/tags/{tag_id}/cases`

List all cases that have a specific tag.

**Path Parameters:**
- `tag_id` (integer): Tag ID

**Response (200 OK):**
```json
[
  {
    "id": 101,
    "title": "Smith v. Jones",
    "description": "Contract dispute",
    "caseType": "civil",
    "status": "active",
    "userId": 123,
    "caseNumber": "CV-2025-001",
    "courtName": "District Court",
    "judge": "Hon. Sarah Johnson",
    "opposingParty": "Jones Inc.",
    "opposingCounsel": "Jane Smith, Esq.",
    "nextHearingDate": "2025-02-15T10:00:00Z",
    "filingDeadline": "2025-02-10T17:00:00Z",
    "createdAt": "2025-01-10T08:30:00Z",
    "updatedAt": "2025-01-15T14:20:00Z"
  }
]
```

**Notes:**
- Returns full case objects (not just IDs)
- Ordered by most recently updated first
- Returns empty array if no cases have this tag

**Service Layer:** `TagService.get_cases_by_tag()` + database query for case details

---

### 10. List Tags for Case

**GET** `/tags/cases/{case_id}/tags`

List all tags attached to a specific case.

**Path Parameters:**
- `case_id` (integer): Case ID

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "name": "Urgent",
    "color": "#FF0000",
    "description": "High priority cases",
    "usageCount": 5,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": 3,
    "userId": 123,
    "name": "Commercial",
    "color": "#00FF00",
    "description": null,
    "usageCount": 3,
    "createdAt": "2025-01-16T09:15:00Z",
    "updatedAt": "2025-01-16T09:15:00Z"
  }
]
```

**Notes:**
- Ordered alphabetically by tag name
- Returns empty array if case has no tags

**Error Responses:**
- `404 Not Found` - Case doesn't exist or unauthorized

**Service Layer:** `TagService.get_case_tags()`

---

### 11. Get Tag Statistics

**GET** `/tags/statistics`

Get tag usage statistics for the authenticated user.

**Response (200 OK):**
```json
{
  "totalTags": 10,
  "tagsWithCases": 7,
  "mostUsedTags": [
    {
      "id": 1,
      "name": "Urgent",
      "color": "#FF0000",
      "usageCount": 15
    },
    {
      "id": 2,
      "name": "Commercial",
      "color": "#00FF00",
      "usageCount": 12
    }
  ],
  "unusedTags": [
    {
      "id": 5,
      "name": "Archive",
      "color": "#808080"
    }
  ]
}
```

**Metrics:**
- `totalTags`: Total number of tags user has created
- `tagsWithCases`: Number of tags used on at least one case
- `mostUsedTags`: Top 5 most frequently used tags
- `unusedTags`: Tags with zero usage

**Service Layer:** `TagService.get_tag_statistics()`

---

## Tag Search Logic Explained

### AND Logic (match_all=true)

Cases must have **ALL** specified tags.

**Example:**
```bash
GET /tags/search?tag_ids=1,2,3&match_all=true
```

**SQL Query (conceptual):**
```sql
SELECT case_id
FROM case_tags
WHERE tag_id IN (1, 2, 3)
GROUP BY case_id
HAVING COUNT(DISTINCT tag_id) = 3  -- Must have ALL 3 tags
```

**Use Cases:**
- "Show me cases that are urgent AND commercial AND high-value"
- "Find cases with both 'criminal' AND 'appeal' tags"

### OR Logic (match_all=false)

Cases must have **ANY** of the specified tags.

**Example:**
```bash
GET /tags/search?tag_ids=1,2,3&match_all=false
```

**SQL Query (conceptual):**
```sql
SELECT DISTINCT case_id
FROM case_tags
WHERE tag_id IN (1, 2, 3)  -- Has ANY of these tags
```

**Use Cases:**
- "Show me cases that are urgent OR high-value"
- "Find cases with 'criminal' OR 'civil' tags"

---

## Audit Logging

All tag operations are automatically logged for compliance:

**Logged Events:**
- `tag.create` - Tag creation
- `tag.update` - Tag modification
- `tag.delete` - Tag deletion
- `tag.attach` - Tag attached to case
- `tag.detach` - Tag removed from case
- `tag.unauthorized_access` - Failed authorization attempt

**Audit Log Fields:**
- Event type and timestamp
- User ID and IP address
- Resource ID and action
- Success/failure status
- SHA-256 integrity hash (blockchain-style)

**Query Audit Logs:**
```python
from backend.services.audit_logger import AuditLogger

audit_logger = AuditLogger(db)
logs = audit_logger.query(
    resource_type="tag",
    user_id="123",
    start_date="2025-01-01T00:00:00Z"
)
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error or duplicate name
- `401 Unauthorized` - Invalid/missing session
- `403 Forbidden` - User doesn't own the resource
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Request body validation error
- `500 Internal Server Error` - Unexpected error

### Error Response Format

```json
{
  "detail": "Tag with name 'Urgent' already exists"
}
```

---

## Performance Considerations

### Database Indexes

Tags table has optimized indexes:
```sql
CREATE INDEX idx_tags_user_name ON tags(user_id, name);  -- Unique constraint
CREATE INDEX idx_tags_user ON tags(user_id);            -- User filter
CREATE INDEX idx_tags_name ON tags(name);               -- Name search

CREATE INDEX idx_case_tags_case ON case_tags(case_id);  -- Case lookup
CREATE INDEX idx_case_tags_tag ON case_tags(tag_id);    -- Tag lookup
```

### Query Optimization

- **List tags**: Single query with LEFT JOIN for usage counts
- **Search cases**: Uses HAVING clause for AND logic, DISTINCT for OR logic
- **Statistics**: Single query with aggregations

### Caching Recommendations

Consider caching:
- Tag list per user (invalidate on create/update/delete)
- Tag statistics (invalidate on tag attachment/removal)
- Case tags (invalidate on attach/detach operations)

---

## Code Examples

### Python (requests)

```python
import requests

BASE_URL = "https://api.example.com"
SESSION_ID = "your-session-id"

headers = {"Authorization": f"Bearer {SESSION_ID}"}

# Create tag
response = requests.post(
    f"{BASE_URL}/tags",
    json={"name": "Urgent", "color": "#FF0000"},
    headers=headers
)
tag = response.json()

# Search cases with AND logic
response = requests.get(
    f"{BASE_URL}/tags/search?tag_ids=1,2&match_all=true",
    headers=headers
)
results = response.json()
print(f"Found {results['resultCount']} cases")

# Attach tag to case
response = requests.post(
    f"{BASE_URL}/tags/{tag['id']}/cases/101",
    headers=headers
)
```

### JavaScript (fetch)

```javascript
const BASE_URL = "https://api.example.com";
const SESSION_ID = "your-session-id";

const headers = {
  "Authorization": `Bearer ${SESSION_ID}`,
  "Content-Type": "application/json"
};

// Create tag
const response = await fetch(`${BASE_URL}/tags`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "Urgent",
    color: "#FF0000"
  })
});
const tag = await response.json();

// Search with OR logic
const searchResponse = await fetch(
  `${BASE_URL}/tags/search?tag_ids=1,2&match_all=false`,
  { headers }
);
const results = await searchResponse.json();
console.log(`Found ${results.resultCount} cases`);
```

### cURL

```bash
# Create tag
curl -X POST "https://api.example.com/tags" \
  -H "Authorization: Bearer your-session-id" \
  -H "Content-Type: application/json" \
  -d '{"name":"Urgent","color":"#FF0000"}'

# Search cases (AND logic)
curl "https://api.example.com/tags/search?tag_ids=1,2&match_all=true" \
  -H "Authorization: Bearer your-session-id"

# Get statistics
curl "https://api.example.com/tags/statistics" \
  -H "Authorization: Bearer your-session-id"
```

---

## Migration Guide (v1 → v2)

### What Changed

**v1 (Direct Database Queries):**
```python
# Old: Direct SQL queries in route handlers
query = text("SELECT * FROM tags WHERE user_id = :user_id")
tags = db.execute(query, {"user_id": user_id}).fetchall()
```

**v2 (Service Layer):**
```python
# New: Business logic in TagService
tag_service = TagService(db=db, audit_logger=audit_logger)
tags = tag_service.get_tags(user_id=user_id)
```

### Breaking Changes

**None!** All endpoints maintain backward compatibility.

### New Features

1. **Tag Search Endpoint** (`GET /tags/search`)
   - AND/OR logic for finding cases by multiple tags
   - Previously had to filter client-side

2. **Enhanced Responses**
   - `wasAttached` / `removed` fields on attach/remove operations
   - More descriptive success messages

### Benefits

- Cleaner route handlers (40% less code)
- Testable business logic (isolated from HTTP)
- Consistent error handling
- Automatic audit logging
- Easier to extend with new features

---

## Best Practices

### Tag Naming Conventions

- Use descriptive names: "High Priority" not "P1"
- Keep names short: Max 20 characters recommended
- Use consistent casing: "Criminal Law" not "criminal law"
- Avoid special characters: Use spaces, hyphens only

### Color Coding

Suggested color scheme:
- **Red (#FF0000)**: Urgent/high priority
- **Orange (#FF6600)**: Important
- **Yellow (#FFD700)**: Review needed
- **Green (#00FF00)**: Approved/complete
- **Blue (#0000FF)**: Administrative
- **Purple (#800080)**: Special handling

### Performance Tips

1. **Batch operations**: Attach multiple tags in quick succession
2. **Cache frequently used tags**: Reduce repeated API calls
3. **Use search endpoint**: More efficient than filtering client-side
4. **Paginate case lists**: When retrieving cases with tags

---

## Testing

Comprehensive test suite included:

**File:** `backend/tests/test_routes_tags.py`

**Coverage:**
- 15+ test cases covering all endpoints
- Service layer integration
- Authentication and authorization
- Validation and error handling
- AND/OR search logic
- Edge cases and idempotency

**Run Tests:**
```bash
pytest backend/tests/test_routes_tags.py -v
```

---

## Support

For issues or questions:
- GitHub Issues: [Report Bug](https://github.com/your-org/justice-companion/issues)
- Documentation: [Full API Docs](https://docs.example.com)
- Email: support@example.com

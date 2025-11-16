# Search API Documentation

## Overview

The Search API provides comprehensive full-text search functionality across all legal entities in Justice Companion. It uses SQLite FTS5 (Full-Text Search) with BM25 ranking for high-performance searches, with automatic fallback to LIKE queries when FTS5 is unavailable.

## Base URL

```
/search
```

## Authentication

All endpoints require authentication via session ID in the Authorization header:

```http
Authorization: Bearer <session_id>
```

## Endpoints

### 1. Full-Text Search

**POST** `/search`

Search across cases, evidence, conversations, and notes.

#### Request Body

```json
{
  "query": "contract dispute",
  "filters": {
    "entityTypes": ["case", "evidence"],
    "caseStatus": ["active", "pending"],
    "dateRange": {
      "from": "2025-01-01",
      "to": "2025-12-31"
    },
    "tags": ["important", "urgent"],
    "caseIds": [1, 2, 3]
  },
  "sortBy": "relevance",
  "sortOrder": "desc",
  "limit": 20,
  "offset": 0
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query (1-500 chars) |
| `filters` | object | No | null | Search filters |
| `filters.entityTypes` | string[] | No | all | Entity types to search |
| `filters.caseStatus` | string[] | No | all | Case statuses to filter |
| `filters.dateRange` | object | No | null | Date range filter |
| `filters.tags` | string[] | No | all | Tags to filter |
| `filters.caseIds` | number[] | No | all | Case IDs to filter |
| `sortBy` | string | No | "relevance" | Sort field (relevance, date, title) |
| `sortOrder` | string | No | "desc" | Sort order (asc, desc) |
| `limit` | number | No | 20 | Results per page (1-100) |
| `offset` | number | No | 0 | Pagination offset |

#### Response

```json
{
  "results": [
    {
      "id": 1,
      "type": "case",
      "title": "Contract Dispute",
      "excerpt": "...contract breach involving...",
      "relevanceScore": 95.3,
      "caseId": null,
      "caseTitle": null,
      "createdAt": "2025-01-15T10:30:00Z",
      "metadata": {
        "status": "active",
        "caseType": "civil"
      }
    }
  ],
  "total": 42,
  "hasMore": true,
  "executionTime": 45
}
```

---

### 2. Rebuild Search Index

**POST** `/search/rebuild-index`

Rebuild the search index for the authenticated user.

#### Response

```json
{
  "success": true,
  "message": "Search index rebuilt for user 1"
}
```

**Use Cases:**
- Index becomes corrupted or out of sync
- After bulk data imports
- After system maintenance

---

### 3. Save Search

**POST** `/search/save`

Save a search query for later reuse.

#### Request Body

```json
{
  "name": "Contract Disputes - Active",
  "query": {
    "query": "contract dispute",
    "filters": {
      "entityTypes": ["case"],
      "caseStatus": ["active"]
    },
    "sortBy": "relevance",
    "sortOrder": "desc",
    "limit": 20,
    "offset": 0
  }
}
```

#### Response

```json
{
  "id": 1,
  "name": "Contract Disputes - Active",
  "queryJson": "{...}",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastUsedAt": null,
  "useCount": 0
}
```

---

### 4. List Saved Searches

**GET** `/search/saved`

Get all saved searches for the authenticated user.

#### Response

```json
[
  {
    "id": 1,
    "name": "Contract Disputes - Active",
    "queryJson": "{...}",
    "createdAt": "2025-01-15T10:30:00Z",
    "lastUsedAt": "2025-01-16T14:20:00Z",
    "useCount": 5
  }
]
```

---

### 5. Execute Saved Search

**POST** `/search/saved/{search_id}/execute`

Execute a previously saved search.

#### Response

Same format as the main search endpoint.

**Note:** Automatically updates `lastUsedAt` and `useCount`.

---

### 6. Delete Saved Search

**DELETE** `/search/saved/{search_id}`

Delete a saved search.

#### Response

HTTP 204 No Content

---

### 7. Get Search Suggestions

**GET** `/search/suggestions`

Get search suggestions based on user's search history.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prefix` | string | Yes | - | Search query prefix (1-100 chars) |
| `limit` | number | No | 5 | Max suggestions (1-20) |

#### Response

```json
[
  "contract dispute",
  "contract agreement",
  "contract breach"
]
```

---

### 8. Get Index Statistics

**GET** `/search/index/stats`

Get search index statistics.

#### Response

```json
{
  "totalDocuments": 1543,
  "documentsByType": {
    "case": 320,
    "evidence": 890,
    "conversation": 215,
    "note": 118
  },
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

---

### 9. Optimize Search Index

**POST** `/search/index/optimize`

Optimize the FTS5 search index for better performance.

#### Response

```json
{
  "success": true,
  "message": "Search index optimized successfully"
}
```

**When to Run:**
- After large bulk data imports
- After many deletions
- When experiencing performance degradation
- Periodically (e.g., weekly maintenance)

---

### 10. Update Index Entity

**POST** `/search/index/update`

Update a single entity in the search index.

#### Request Body

```json
{
  "entityType": "case",
  "entityId": 123
}
```

#### Response

```json
{
  "success": true,
  "message": "Updated case 123 in search index"
}
```

**Use Cases:**
- After creating a new case, evidence, conversation, or note
- After updating existing entity content
- Incremental index updates (more efficient than full rebuild)

---

### 11. Remove from Index

**DELETE** `/search/index/{entity_type}/{entity_id}`

Remove an entity from the search index.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity_type` | string | Entity type (case, evidence, conversation, note) |
| `entity_id` | number | Entity ID to remove |

#### Response

```json
{
  "success": true,
  "message": "Removed case 123 from search index"
}
```

---

## Search Syntax and Operators

### Basic Search

```
contract dispute
```

Searches for documents containing "contract" OR "dispute" (implicit OR).

### Prefix Matching

```
contr*
```

Matches "contract", "contractor", "contracting", etc.

### AND Operator

```
contract AND dispute
```

Requires both "contract" AND "dispute" in the document.

### NOT Operator

```
contract NOT employment
```

Matches documents containing "contract" but excludes those with "employment".

### Exact Phrase

```
"contract dispute"
```

Matches the exact phrase "contract dispute".

### Complex Queries

```
(contract OR agreement) AND dispute NOT employment
```

Combines multiple operators for complex queries.

## Entity Types

| Type | Description |
|------|-------------|
| `case` | Legal cases |
| `evidence` | Evidence items (documents, photos, etc.) |
| `conversation` | AI chat conversations |
| `note` | User notes |

## Case Statuses

| Status | Description |
|--------|-------------|
| `active` | Currently active cases |
| `closed` | Closed cases |
| `pending` | Pending cases |

## Sort Fields

| Field | Description |
|-------|-------------|
| `relevance` | BM25 relevance score (default) |
| `date` | Creation date |
| `title` | Alphabetical by title |

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Invalid entity type: invalid. Must be one of: case, evidence, conversation, note"
}
```

### 401 Unauthorized

```json
{
  "detail": "Session ID required (provide in Authorization header or session_id query param)"
}
```

### 404 Not Found

```json
{
  "detail": "Saved search not found"
}
```

### 422 Unprocessable Entity

```json
{
  "detail": [
    {
      "loc": ["body", "query"],
      "msg": "ensure this value has at least 1 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Search failed: database connection error"
}
```

## Performance Considerations

### FTS5 vs LIKE Search

- **FTS5**: Fast full-text search with BM25 ranking (preferred)
- **LIKE**: Fallback when FTS5 unavailable (slower, less accurate)

### Optimization Tips

1. **Index Regularly**: Rebuild or optimize index after bulk operations
2. **Use Filters**: Narrow search scope with entity type and date filters
3. **Limit Results**: Use pagination to reduce response size
4. **Cache Searches**: Save frequently used searches for faster access
5. **Prefix Matching**: Use `*` wildcard for broader matches

### Execution Times

Typical execution times on modern hardware:

| Operation | Execution Time |
|-----------|----------------|
| Simple search (< 10 results) | < 50ms |
| Complex search (100+ results) | < 200ms |
| Index rebuild (1000 docs) | < 5s |
| Index optimize | < 2s |

## Examples

### Example 1: Search Active Cases

```bash
curl -X POST "http://localhost:8000/search" \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "contract",
    "filters": {
      "entityTypes": ["case"],
      "caseStatus": ["active"]
    },
    "limit": 10,
    "offset": 0
  }'
```

### Example 2: Search with Date Range

```bash
curl -X POST "http://localhost:8000/search" \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "evidence",
    "filters": {
      "dateRange": {
        "from": "2025-01-01",
        "to": "2025-01-31"
      }
    },
    "sortBy": "date",
    "sortOrder": "desc",
    "limit": 20
  }'
```

### Example 3: Save and Execute Search

```bash
# Save search
curl -X POST "http://localhost:8000/search/save" \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Saved Search",
    "query": {
      "query": "contract dispute",
      "limit": 20
    }
  }'

# Execute saved search (returns search_id=1)
curl -X POST "http://localhost:8000/search/saved/1/execute" \
  -H "Authorization: Bearer <session_id>"
```

### Example 4: Rebuild and Optimize Index

```bash
# Rebuild index
curl -X POST "http://localhost:8000/search/rebuild-index" \
  -H "Authorization: Bearer <session_id>"

# Optimize index
curl -X POST "http://localhost:8000/search/index/optimize" \
  -H "Authorization: Bearer <session_id>"

# Get statistics
curl -X GET "http://localhost:8000/search/index/stats" \
  -H "Authorization: Bearer <session_id>"
```

## Security Considerations

1. **User Isolation**: All searches are automatically filtered by user_id
2. **Encryption**: Sensitive fields are decrypted before indexing and searching
3. **Audit Logging**: All search operations are logged for audit trail
4. **Authorization**: Session-based authentication required for all endpoints
5. **Input Validation**: All inputs validated with Pydantic schemas
6. **Rate Limiting**: Consider implementing rate limiting for production

## Best Practices

1. **Rebuild Index After Bulk Operations**: Always rebuild index after importing/deleting many records
2. **Use Entity Type Filters**: Narrow searches to specific entity types when possible
3. **Save Frequent Searches**: Save commonly used searches for faster access
4. **Monitor Index Stats**: Track index growth and performance
5. **Optimize Periodically**: Run index optimization weekly or after bulk operations
6. **Use Pagination**: Always paginate results for large datasets
7. **Handle Errors Gracefully**: Implement proper error handling in client applications

## Changelog

### Version 2.0 (2025-01-15)

- Migrated from direct DB queries to service layer architecture
- Added SearchService for business logic
- Added SearchIndexBuilder for index management
- Added index statistics endpoint
- Added index optimization endpoint
- Added incremental index update/remove endpoints
- Improved error handling and validation
- Added comprehensive documentation
- Added 20+ integration tests

### Version 1.0 (2024-12-01)

- Initial release
- Basic FTS5 search functionality
- Saved searches (CRUD)
- Search suggestions
- Index rebuild

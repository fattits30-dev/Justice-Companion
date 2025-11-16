# Search API Documentation

## Overview
Full-text search functionality for Justice Companion. Searches across cases, evidence, conversations, and notes with FTS5 support and LIKE fallback.

Migrated from: `electron/ipc-handlers/search.ts`

## Base URL
```
/search
```

## Authentication
All endpoints require session authentication via:
- **Header:** `Authorization: Bearer <session_id>` or `Authorization: <session_id>`
- **Query Parameter:** `?session_id=<session_id>` (fallback)

## Endpoints

### 1. POST /search
Perform full-text search across cases, evidence, conversations, and notes.

**Request Body:**
```json
{
  "query": "string (required, 1-500 chars)",
  "filters": {
    "caseStatus": ["active", "closed", "pending"],
    "dateRange": {
      "from": "2025-01-01",
      "to": "2025-12-31"
    },
    "entityTypes": ["case", "evidence", "conversation", "note"],
    "tags": ["tag1", "tag2"],
    "caseIds": [1, 2, 3]
  },
  "sortBy": "relevance",  // "relevance", "date", "title"
  "sortOrder": "desc",     // "asc", "desc"
  "limit": 20,             // 1-100
  "offset": 0
}
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "type": "case",
      "title": "Employment Dispute Case",
      "excerpt": "...relevant snippet...",
      "relevanceScore": 85.5,
      "caseId": 1,
      "caseTitle": "Smith vs Acme Corp",
      "createdAt": "2025-01-15T10:30:00Z",
      "metadata": {
        "status": "active",
        "caseType": "employment"
      }
    }
  ],
  "total": 42,
  "hasMore": true,
  "executionTime": 127  // milliseconds
}
```

**Features:**
- Uses SQLite FTS5 full-text search when available
- Automatically falls back to LIKE queries if FTS5 fails
- Filters results by user_id for security
- Supports pagination with limit/offset
- Returns relevance scores based on BM25 ranking
- Extracts contextual excerpts around matching terms

**Status Codes:**
- `200 OK` - Search completed successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid session
- `500 Internal Server Error` - Search failed

---

### 2. POST /search/rebuild-index
Rebuild the search index for the authenticated user.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Search index rebuilt for user 1"
}
```

**Purpose:**
- Clears and rebuilds all search index entries for the user
- Useful when index becomes corrupted or out of sync

**Status Codes:**
- `200 OK` - Index rebuilt successfully
- `401 Unauthorized` - Missing or invalid session
- `500 Internal Server Error` - Rebuild failed

---

### 3. POST /search/save
Save a search query for later reuse.

**Request Body:**
```json
{
  "name": "Recent active cases",
  "query": {
    "query": "contract dispute",
    "filters": {
      "caseStatus": ["active"],
      "entityTypes": ["case"]
    },
    "sortBy": "date",
    "sortOrder": "desc",
    "limit": 20
  }
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Recent active cases",
  "queryJson": "{...}",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastUsedAt": null,
  "useCount": 0
}
```

**Status Codes:**
- `201 Created` - Search saved successfully
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Missing or invalid session
- `500 Internal Server Error` - Save failed

---

### 4. GET /search/saved
List all saved searches for the authenticated user.

**Query Parameters:** None

**Response:**
```json
[
  {
    "id": 5,
    "name": "Recent active cases",
    "queryJson": "{...}",
    "createdAt": "2025-01-15T10:30:00Z",
    "lastUsedAt": "2025-01-20T14:22:00Z",
    "useCount": 12
  }
]
```

**Sorting:**
- Ordered by `lastUsedAt DESC`, then `createdAt DESC`

**Status Codes:**
- `200 OK` - List retrieved successfully
- `401 Unauthorized` - Missing or invalid session
- `500 Internal Server Error` - List failed

---

### 5. DELETE /search/saved/{search_id}
Delete a saved search.

**Path Parameters:**
- `search_id` (integer) - ID of the saved search

**Response:** None (204 No Content)

**Status Codes:**
- `204 No Content` - Deleted successfully
- `401 Unauthorized` - Missing or invalid session
- `404 Not Found` - Saved search not found
- `500 Internal Server Error` - Delete failed

---

### 6. POST /search/saved/{search_id}/execute
Execute a previously saved search.

**Path Parameters:**
- `search_id` (integer) - ID of the saved search

**Request Body:** None

**Response:**
Same as POST /search (SearchResponse)

**Side Effects:**
- Updates `lastUsedAt` to current timestamp
- Increments `useCount` by 1

**Status Codes:**
- `200 OK` - Search executed successfully
- `401 Unauthorized` - Missing or invalid session
- `404 Not Found` - Saved search not found
- `500 Internal Server Error` - Execution failed

---

### 7. GET /search/suggestions
Get search suggestions based on user's search history.

**Query Parameters:**
- `prefix` (string, required) - Search prefix (1-100 chars)
- `limit` (integer, optional) - Max suggestions (1-20, default: 5)

**Response:**
```json
[
  "contract dispute",
  "contract breach",
  "contract termination"
]
```

**Purpose:**
- Provides autocomplete suggestions from saved searches
- Matches queries that start with the given prefix

**Status Codes:**
- `200 OK` - Suggestions retrieved
- `400 Bad Request` - Invalid prefix
- `401 Unauthorized` - Missing or invalid session
- `500 Internal Server Error` - Suggestions failed

---

## Search Implementation Details

### FTS5 Full-Text Search
When available, uses SQLite FTS5 virtual table for fast full-text search:

```sql
SELECT
    si.*,
    bm25(search_index) AS rank
FROM search_index si
WHERE search_index MATCH :fts_query
  AND user_id = :user_id
  AND entity_type IN (...)
ORDER BY rank
LIMIT :limit OFFSET :offset
```

**FTS5 Query Syntax:**
- Input: `"contract dispute"`
- FTS5 Query: `"contract"* OR "dispute"*` (prefix matching)

**BM25 Ranking:**
- Uses SQLite's built-in BM25 algorithm
- Lower rank = higher relevance
- Converted to relevanceScore: `100.0 / (1.0 + rank)`

### LIKE Fallback
If FTS5 fails (e.g., index not available), falls back to LIKE queries:

```sql
-- Search cases
SELECT * FROM cases
WHERE user_id = :user_id
  AND (title LIKE '%query%' OR description LIKE '%query%')

-- Search evidence
SELECT * FROM evidence
WHERE user_id = :user_id
  AND (title LIKE '%query%' OR content LIKE '%query%')

-- Search notes
SELECT * FROM notes
WHERE user_id = :user_id
  AND (title LIKE '%query%' OR content LIKE '%query%')
```

**Relevance Calculation:**
- Exact phrase match: +10 points
- Individual term matches: +2 points each
- Match in first 100 characters: +5 points

### Excerpt Extraction
Contextual excerpts are extracted around matching terms:

1. Find first occurrence of any query term
2. Extract 50 chars before + 100 chars after match
3. Add "..." ellipsis at start/end if truncated
4. Max excerpt length: 150 characters

### Security
All queries filter by `user_id` to prevent data leakage:

```sql
WHERE user_id = :user_id
```

User can only search their own data.

### Audit Logging
All search operations are logged:

- Event: `search.query`
- Details: query text, filters, result count
- Success/failure status

---

## Error Handling

### Validation Errors (400)
```json
{
  "detail": "Invalid sortBy: foo. Must be one of: relevance, date, title"
}
```

### Authentication Errors (401)
```json
{
  "detail": "Invalid or expired session"
}
```

### Not Found Errors (404)
```json
{
  "detail": "Saved search not found"
}
```

### Server Errors (500)
```json
{
  "detail": "Search failed: database connection error"
}
```

---

## Usage Examples

### 1. Basic Search
```bash
curl -X POST http://localhost:8000/search \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "contract dispute",
    "limit": 10
  }'
```

### 2. Filtered Search
```bash
curl -X POST http://localhost:8000/search \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "employment termination",
    "filters": {
      "caseStatus": ["active"],
      "entityTypes": ["case", "evidence"],
      "dateRange": {
        "from": "2025-01-01",
        "to": "2025-12-31"
      }
    },
    "sortBy": "date",
    "sortOrder": "desc",
    "limit": 20,
    "offset": 0
  }'
```

### 3. Save Search
```bash
curl -X POST http://localhost:8000/search/save \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Active employment cases",
    "query": {
      "query": "employment",
      "filters": {
        "caseStatus": ["active"],
        "entityTypes": ["case"]
      }
    }
  }'
```

### 4. Execute Saved Search
```bash
curl -X POST http://localhost:8000/search/saved/5/execute \
  -H "Authorization: Bearer <session_id>"
```

### 5. Get Suggestions
```bash
curl "http://localhost:8000/search/suggestions?prefix=contract&limit=5" \
  -H "Authorization: Bearer <session_id>"
```

---

## Database Schema

### search_index Table (FTS5 Virtual Table)
```sql
CREATE VIRTUAL TABLE search_index USING fts5(
  entity_id,
  entity_type,
  title,
  content,
  content_encrypted,
  case_id,
  user_id,
  status,
  case_type,
  evidence_type,
  file_path,
  message_count,
  is_pinned,
  created_at,
  tokenize='porter unicode61'
);
```

### saved_searches Table
```sql
CREATE TABLE saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  query_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  use_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_last_used ON saved_searches(last_used_at DESC);
```

---

## Performance Considerations

### FTS5 Performance
- **Fast:** BM25 ranking on indexed data
- **Memory:** Index size ~30% of original data
- **Rebuild:** O(n) time complexity

### LIKE Fallback Performance
- **Slow:** Full table scans on cases, evidence, notes
- **Memory:** Minimal overhead
- **Recommended:** Rebuild FTS5 index instead

### Optimization Tips
1. Rebuild search index periodically: `POST /search/rebuild-index`
2. Use specific `entityTypes` filters to reduce search scope
3. Use `limit` parameter to reduce result set size
4. Use `caseIds` filter when searching within specific cases

---

## Migration from Electron IPC

**Before (TypeScript IPC):**
```typescript
const results = await window.electronAPI.search({
  query: "contract dispute",
  filters: { caseStatus: ["active"] }
});
```

**After (FastAPI HTTP):**
```typescript
const response = await fetch('http://localhost:8000/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionId}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "contract dispute",
    filters: { caseStatus: ["active"] }
  })
});

const results = await response.json();
```

---

## Testing

### Manual Testing with curl
```bash
# Login first
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "password123"}'

# Copy session_id from response

# Test search
curl -X POST http://localhost:8000/search \
  -H "Authorization: Bearer <session_id>" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### Automated Testing (pytest)
```python
def test_search_endpoint(client, authenticated_session):
    response = client.post(
        "/search",
        headers={"Authorization": f"Bearer {authenticated_session}"},
        json={"query": "contract dispute"}
    )
    assert response.status_code == 200
    assert "results" in response.json()
    assert "total" in response.json()
```

---

## Future Enhancements

1. **Encrypted Content Search:** Decrypt encrypted fields before searching
2. **Search Highlighting:** Highlight matching terms in excerpts
3. **Advanced Filters:** Support for boolean operators (AND, OR, NOT)
4. **Search Analytics:** Track popular search terms
5. **Search History:** Store anonymous search queries for analytics
6. **Faceted Search:** Group results by entity type with counts
7. **Spell Correction:** Suggest corrections for misspelled queries
8. **Search Export:** Export search results to CSV/PDF

---

## Troubleshooting

### Issue: "Search index not found"
**Solution:** Rebuild the search index:
```bash
curl -X POST http://localhost:8000/search/rebuild-index \
  -H "Authorization: Bearer <session_id>"
```

### Issue: "No results found"
**Cause:** User has no data or query doesn't match
**Solution:** Verify data exists in database

### Issue: "Search too slow"
**Cause:** Using LIKE fallback instead of FTS5
**Solution:** Rebuild FTS5 index for faster searches

### Issue: "Invalid session"
**Cause:** Session expired or invalid session_id
**Solution:** Login again to get new session_id

# SearchIndexBuilder Service - Comprehensive Guide

## Overview

The `SearchIndexBuilder` service manages FTS5 (Full-Text Search 5) index building and maintenance for Justice Companion. It provides comprehensive functionality for indexing cases, evidence, conversations, and notes with automatic decryption, tag extraction, and performance optimization.

**Migrated from:** `src/services/SearchIndexBuilder.ts`

## Features

### Core Functionality
- ✅ **Full Index Rebuild** - Rebuild entire search index for all users (admin only)
- ✅ **Per-User Index Rebuild** - Rebuild index for specific user (user-isolated)
- ✅ **Incremental Indexing** - Index individual entities (cases, evidence, etc.)
- ✅ **Automatic Decryption** - Decrypt encrypted fields during indexing
- ✅ **Tag Extraction** - Extract hashtags, dates, emails, phone numbers
- ✅ **FTS5 Optimization** - Optimize search index for performance
- ✅ **Index Statistics** - Monitor index size and composition
- ✅ **Transaction Safety** - Rollback on error
- ✅ **Audit Logging** - Comprehensive audit trail

### Security Features
- **User Isolation** - Per-user index rebuilds prevent cross-user data leakage
- **Encrypted Field Support** - Automatically decrypts AES-256-GCM encrypted fields
- **Audit Logging** - All operations logged for compliance
- **Admin-Only Operations** - Full rebuild requires admin privileges

## Architecture

### Database Schema

The `search_index` table (FTS5 virtual table):

```sql
CREATE VIRTUAL TABLE search_index USING fts5(
    entity_type,      -- 'case', 'evidence', 'conversation', 'note'
    entity_id,        -- ID of the source entity
    user_id,          -- User ownership (for filtering)
    case_id,          -- Associated case ID
    title,            -- Entity title (indexed)
    content,          -- Full text content (indexed)
    tags,             -- Extracted tags (indexed)
    created_at,       -- Creation timestamp

    -- Entity-specific fields
    status,           -- Case status
    case_type,        -- Case type
    evidence_type,    -- Evidence type
    file_path,        -- Evidence file path
    message_count,    -- Conversation message count
    is_pinned         -- Note pinned status
);
```

### Indexing Flow

```
Source Tables (cases, evidence, conversations, notes)
    ↓
Fetch entity data
    ↓
Decrypt encrypted fields (title, description, content)
    ↓
Extract tags (hashtags, dates, emails, phone numbers)
    ↓
Build full-text content
    ↓
INSERT OR REPLACE into search_index
    ↓
FTS5 index updated automatically
```

## Usage

### Basic Setup

```python
from sqlalchemy.orm import Session
from backend.services.search_index_builder import SearchIndexBuilder
from backend.services.encryption_service import EncryptionService

# Initialize services
encryption_service = EncryptionService(encryption_key="your-base64-key")
db: Session = get_database_session()

# Create builder
builder = SearchIndexBuilder(
    db=db,
    encryption_service=encryption_service
)
```

### Full Index Rebuild (Admin Only)

```python
# ADMIN ONLY - Rebuilds index for ALL users
try:
    await builder.rebuild_index()
    print("✓ Index rebuilt successfully")
except Exception as e:
    print(f"✗ Rebuild failed: {e}")
```

**⚠️ WARNING:** This operation:
- Clears the entire search_index table
- Reindexes ALL users' data
- Can take several minutes for large databases
- Should be run during maintenance windows

### User-Specific Index Rebuild

```python
# Rebuild index for specific user (safe for production)
user_id = 1

try:
    await builder.rebuild_index_for_user(user_id)
    print(f"✓ Index rebuilt for user {user_id}")
except Exception as e:
    print(f"✗ Rebuild failed: {e}")
```

**Use Cases:**
- User reports search not working
- After data migration for specific user
- After manual data corrections

### Incremental Indexing

#### Index a Case

```python
case_data = {
    "id": 1,
    "user_id": 1,
    "title": "Smith v. Jones Contract Dispute",
    "description": "Contract dispute over payment terms...",
    "case_type": "civil",
    "status": "active",
    "created_at": "2025-01-15T10:00:00Z"
}

await builder.index_case(case_data)
print("✓ Case indexed")
```

#### Index Evidence

```python
evidence_data = {
    "id": 1,
    "case_id": 1,
    "title": "Signed Contract",
    "content": "Full text of contract...",
    "evidence_type": "document",
    "file_path": "/evidence/contract.pdf",
    "created_at": "2025-01-15T10:05:00Z"
}

await builder.index_evidence(evidence_data)
print("✓ Evidence indexed")
```

#### Index Conversation

```python
conversation_data = {
    "id": 1,
    "user_id": 1,
    "title": "Legal Research on Contract Law",
    "case_id": 1,
    "message_count": 10,
    "created_at": "2025-01-15T11:00:00Z"
}

await builder.index_conversation(conversation_data)
print("✓ Conversation indexed")
```

#### Index Note

```python
note_data = {
    "id": 1,
    "user_id": 1,
    "title": "Meeting Notes",
    "content": "Discussed settlement options...",
    "case_id": 1,
    "is_pinned": True,
    "created_at": "2025-01-15T14:30:00Z"
}

await builder.index_note(note_data)
print("✓ Note indexed")
```

### Update Existing Index Entry

```python
# Update case in index (re-indexes it)
await builder.update_in_index("case", case_id=1)

# Update evidence in index
await builder.update_in_index("evidence", evidence_id=1)

# Update conversation in index
await builder.update_in_index("conversation", conversation_id=1)

# Update note in index
await builder.update_in_index("note", note_id=1)
```

**When to use:**
- Entity data changed (title, description, etc.)
- Status changed
- Content updated

### Remove from Index

```python
# Remove case from index
await builder.remove_from_index("case", entity_id=1)

# Remove evidence from index
await builder.remove_from_index("evidence", entity_id=1)

# Remove conversation from index
await builder.remove_from_index("conversation", entity_id=1)

# Remove note from index
await builder.remove_from_index("note", entity_id=1)
```

**When to use:**
- Entity deleted
- Entity no longer searchable

### Optimize Index

```python
# Optimize FTS5 index for better performance
try:
    await builder.optimize_index()
    print("✓ Index optimized")
except Exception as e:
    print(f"✗ Optimization failed: {e}")
```

**When to run:**
- After bulk indexing operations
- Periodic maintenance (weekly/monthly)
- After large deletions
- When search performance degrades

**What it does:**
1. Runs FTS5 `rebuild` command (rebuilds internal structures)
2. Runs FTS5 `optimize` command (merges segments, compacts data)

### Get Index Statistics

```python
stats = await builder.get_index_stats()

print(f"Total documents: {stats['total_documents']}")
print(f"Cases: {stats['documents_by_type'].get('case', 0)}")
print(f"Evidence: {stats['documents_by_type'].get('evidence', 0)}")
print(f"Conversations: {stats['documents_by_type'].get('conversation', 0)}")
print(f"Notes: {stats['documents_by_type'].get('note', 0)}")
print(f"Last updated: {stats['last_updated']}")
```

**Output:**
```
Total documents: 1523
Cases: 342
Evidence: 789
Conversations: 251
Notes: 141
Last updated: 2025-01-15T14:30:00Z
```

## Tag Extraction

The service automatically extracts searchable tags from content:

### Hashtags
```python
content = "This is a #legal #case with #evidence"
# Extracts: ["legal", "case", "evidence"]
```

### Dates (YYYY-MM-DD)
```python
content = "Incident occurred on 2025-01-15"
# Extracts: ["2025-01-15"]
```

### Email Addresses
```python
content = "Contact: attorney@lawfirm.com"
# Extracts: ["attorney@lawfirm.com"]
```

### Phone Numbers
```python
content = "Phone: +1 (555) 123-4567"
# Extracts: ["+1 (555) 123-4567"]
```

**Why tags matter:**
- Enable specialized searches (e.g., "find all cases mentioning email@example.com")
- Improve relevance scoring
- Support filtering by date ranges

## Encrypted Field Handling

The service automatically decrypts encrypted fields during indexing:

```python
# Encrypted description (AES-256-GCM)
encrypted_description = {
    "ciphertext": "base64-encoded-ciphertext",
    "iv": "base64-encoded-iv",
    "authTag": "base64-encoded-auth-tag",
    "salt": "base64-encoded-salt"
}

case_data = {
    "id": 1,
    "user_id": 1,
    "title": "Case Title",
    "description": json.dumps(encrypted_description),  # Encrypted
    "case_type": "civil",
    "status": "active"
}

# Builder automatically decrypts description before indexing
await builder.index_case(case_data)

# Search index now contains plaintext for FTS5 search
```

**Encryption detection:**
1. Checks if content is JSON
2. Checks if JSON contains `ciphertext` key
3. Validates EncryptedData structure
4. Decrypts using EncryptionService
5. Falls back to plaintext if decryption fails

## Error Handling

### Transaction Rollback

```python
# Full rebuild with rollback on error
try:
    await builder.rebuild_index()
except Exception as e:
    # Database automatically rolled back
    logger.error(f"Rebuild failed: {e}")
    # Index unchanged
```

### Graceful Degradation

```python
# Individual indexing errors don't raise exceptions
case_data_1 = {"id": 1, "user_id": 1, "title": "Case 1"}
case_data_2 = {"id": 2, "user_id": 1}  # Missing title - error

await builder.index_case(case_data_1)  # ✓ Succeeds
await builder.index_case(case_data_2)  # ✗ Logs error, continues
await builder.index_case(case_data_3)  # ✓ Succeeds

# 2 out of 3 cases indexed
```

**Why:**
- Prevents single entity errors from blocking entire rebuild
- Logged for debugging
- Can be retried individually

## Performance Considerations

### Bulk Indexing

```python
# ❌ Slow: Commit after each entity
for case in cases:
    await builder.index_case(case)
    # Implicit commit after each

# ✅ Fast: Batch in transaction
await builder.rebuild_index_for_user(user_id)
# Single transaction for all entities
```

### Optimization Frequency

```
Small databases (<1000 docs):  Monthly
Medium databases (1K-10K docs): Weekly
Large databases (>10K docs):   Daily or after bulk operations
```

### Index Size Estimation

```
Average document size: 1-5 KB
FTS5 index overhead: 50-100% of raw data
10,000 documents ≈ 50-100 MB index size
```

## Testing

Run the comprehensive test suite (40+ tests):

```bash
pytest backend/services/test_search_index_builder.py -v
```

**Test Coverage:**
- ✅ Full index rebuild
- ✅ Per-user index rebuild
- ✅ Individual entity indexing (case, evidence, conversation, note)
- ✅ Encrypted field decryption
- ✅ Tag extraction (hashtags, dates, emails, phones)
- ✅ Index updates and removals
- ✅ Index optimization
- ✅ Statistics retrieval
- ✅ Error handling and rollback
- ✅ Transaction safety

## Integration with FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.services.search_index_builder import SearchIndexBuilder
from backend.services.encryption_service import EncryptionService
from backend.dependencies import get_db, get_current_user, require_admin

router = APIRouter(prefix="/api/search/index", tags=["search-index"])

@router.post("/rebuild")
async def rebuild_search_index(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Rebuild entire search index (ADMIN ONLY).

    ⚠️ WARNING: This operation can take several minutes.
    """
    encryption_service = EncryptionService(get_encryption_key())
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        await builder.rebuild_index()
        stats = await builder.get_index_stats()
        return {
            "success": True,
            "message": "Index rebuilt successfully",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rebuild/{user_id}")
async def rebuild_user_index(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Rebuild search index for specific user."""
    # Verify user can only rebuild their own index
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized")

    encryption_service = EncryptionService(get_encryption_key())
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        await builder.rebuild_index_for_user(user_id)
        stats = await builder.get_index_stats()
        return {
            "success": True,
            "message": f"Index rebuilt for user {user_id}",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_search_index(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Optimize FTS5 search index (ADMIN ONLY)."""
    encryption_service = EncryptionService(get_encryption_key())
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        await builder.optimize_index()
        return {
            "success": True,
            "message": "Index optimized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_index_statistics(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Get search index statistics (ADMIN ONLY)."""
    encryption_service = EncryptionService(get_encryption_key())
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        stats = await builder.get_index_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Maintenance Schedule

### Daily
- Monitor index size (`get_index_stats()`)
- Check for indexing errors in audit logs

### Weekly
- Run `optimize_index()` for medium/large databases
- Review index statistics for anomalies

### Monthly
- Run full `rebuild_index()` during maintenance window
- Verify index integrity
- Clean up orphaned entries

### On Demand
- `rebuild_index_for_user()` - When user reports search issues
- `update_in_index()` - When entity data changes
- `remove_from_index()` - When entity deleted

## Troubleshooting

### Search Not Finding Results

```python
# 1. Check index stats
stats = await builder.get_index_stats()
if stats['total_documents'] == 0:
    print("Index is empty - run rebuild")

# 2. Rebuild user index
await builder.rebuild_index_for_user(user_id)

# 3. Optimize index
await builder.optimize_index()

# 4. Test direct FTS5 query
query = text("SELECT * FROM search_index WHERE search_index MATCH 'test'")
results = db.execute(query).fetchall()
```

### Index Size Too Large

```python
# Check documents by type
stats = await builder.get_index_stats()
print(stats['documents_by_type'])

# Remove old/archived entities
await builder.remove_from_index("case", old_case_id)

# Optimize to compact
await builder.optimize_index()
```

### Slow Indexing

```python
# Use transactions for bulk operations
await builder.rebuild_index_for_user(user_id)  # ✓ Single transaction

# Don't index one-by-one
# for case in cases:
#     await builder.index_case(case)  # ✗ Many transactions
```

### Decryption Errors

```python
# Check encryption service is configured
if builder.encryption_service is None:
    print("⚠️ Encryption service not configured")

# Test decryption manually
encrypted_data = EncryptedData.from_dict(json.loads(encrypted_json))
decrypted = encryption_service.decrypt(encrypted_data)
```

## Migration from TypeScript

See [SEARCH_INDEX_BUILDER_MIGRATION.md](./SEARCH_INDEX_BUILDER_MIGRATION.md) for detailed migration guide.

**Key Differences:**
- Python uses `async`/`await` (TypeScript was pseudo-async)
- SQLAlchemy text() queries instead of better-sqlite3
- Type hints instead of TypeScript types
- Pytest fixtures instead of Vitest

## API Reference

### Class: `SearchIndexBuilder`

#### `__init__(db: Session, encryption_service: Optional[EncryptionService] = None)`
Initialize the search index builder.

#### `async rebuild_index() -> None`
Rebuild entire search index for all users (ADMIN ONLY).

#### `async rebuild_index_for_user(user_id: int) -> None`
Rebuild search index for specific user.

#### `async index_case(case_data: Dict[str, Any]) -> None`
Index a single case.

#### `async index_evidence(evidence_data: Dict[str, Any]) -> None`
Index a single evidence item.

#### `async index_conversation(conversation_data: Dict[str, Any]) -> None`
Index a single conversation.

#### `async index_note(note_data: Dict[str, Any]) -> None`
Index a single note.

#### `async remove_from_index(entity_type: str, entity_id: int) -> None`
Remove an item from the search index.

#### `async update_in_index(entity_type: str, entity_id: int) -> None`
Update an item in the search index by re-indexing it.

#### `async optimize_index() -> None`
Optimize the FTS5 search index for better performance.

#### `async get_index_stats() -> Dict[str, Any]`
Get index statistics.

## License

Part of Justice Companion - Privacy-first legal case management.

## Support

For issues or questions:
1. Check audit logs for indexing errors
2. Run index statistics to diagnose
3. Review test suite for examples
4. See migration guide for TypeScript comparison

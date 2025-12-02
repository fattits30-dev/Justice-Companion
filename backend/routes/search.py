"""
Full-text search routes for Justice Companion.
Migrated from electron/ipc-handlers/search.ts

Routes:
- POST /search - Full-text search across cases, evidence, conversations, notes
- POST /search/rebuild-index - Rebuild search index for authenticated user
- POST /search/save - Save a search query
- GET /search/saved - Get all saved searches
- DELETE /search/saved/{search_id} - Delete a saved search
- POST /search/saved/{search_id}/execute - Execute a saved search
- GET /search/suggestions - Get search suggestions
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
import re

from backend.models.base import get_db
from backend.services.auth.service import AuthenticationService
from backend.routes.auth import get_current_user
from backend.services.search_service import (
    SearchService,
    SearchQuery,
    SearchFilters as ServiceSearchFilters,
)
from backend.services.search_index_builder import SearchIndexBuilder
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

# Import schemas from consolidated schema file
from backend.schemas.search import (
    SearchFilters,
    SearchRequest,
    SaveSearchRequest,
    SearchResultItem,
    SearchResponse,
    SavedSearchResponse,
    RebuildIndexResponse,
    IndexStatsResponse,
    UpdateIndexRequest,
    VALID_ENTITY_TYPES,
    VALID_SORT_BY,
    VALID_SORT_ORDER,
    VALID_CASE_STATUSES,
)

router = APIRouter(prefix="/search", tags=["search"])

# ===== DEPENDENCIES =====
def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    import os

    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not configured",
        )
    return EncryptionService(key=encryption_key)

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)

def get_search_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
) -> SearchService:
    """Get search service instance."""
    return SearchService(db=db, encryption_service=encryption_service)

def get_index_builder(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
) -> SearchIndexBuilder:
    """Get search index builder instance."""
    return SearchIndexBuilder(db=db, encryption_service=encryption_service)

def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db=db)

# ===== HELPER FUNCTIONS =====
def build_fts_query(query: str) -> str:
    """Build FTS5 query from user input."""
    # Escape special characters
    escaped = query.replace('"', '""').strip()

    # Split into terms
    terms = [t for t in escaped.split() if t]

    # Build FTS5 query with prefix matching
    return " OR ".join([f'"{term}"*' for term in terms])

def extract_excerpt(content: str, query: str, max_length: int = 150) -> str:
    """Extract an excerpt from content around the query terms."""
    if not content:
        return ""

    lower_content = content.lower()
    lower_query = query.lower()
    query_terms = [t for t in lower_query.split() if t]

    # Find the first occurrence of any query term
    first_index = -1
    for term in query_terms:
        index = lower_content.find(term)
        if index != -1 and (first_index == -1 or index < first_index):
            first_index = index

    if first_index == -1:
        # No match found, return beginning of content
        return content[:max_length] + ("..." if len(content) > max_length else "")

    # Extract excerpt around the match
    start = max(0, first_index - 50)
    end = min(len(content), first_index + max_length - 50)

    excerpt = content[start:end]

    # Add ellipsis if needed
    if start > 0:
        excerpt = "..." + excerpt
    if end < len(content):
        excerpt = excerpt + "..."

    return excerpt

def calculate_relevance(text: str, query: str) -> float:
    """Calculate relevance score for a text against a query."""
    lower_text = text.lower()
    lower_query = query.lower()
    query_terms = [t.strip() for t in lower_query.split() if t.strip()]

    score = 0.0

    # Exact phrase match
    if lower_query in lower_text:
        score += 10.0

    # Individual term matches
    for term in query_terms:
        # Escape special regex characters
        escaped_term = re.escape(term)
        matches = len(re.findall(escaped_term, lower_text))
        score += matches * 2.0

    # Match in first 100 characters (higher weight)
    if lower_query in lower_text[:100]:
        score += 5.0

    return score

def search_with_fts5(
    db: Session, user_id: int, query: str, filters: Optional[SearchFilters], limit: int, offset: int
) -> Dict[str, Any]:
    """Search using SQLite FTS5 full-text search."""
    from sqlalchemy import text

    # Build FTS5 query
    fts_query = build_fts_query(query)

    # Build WHERE conditions
    where_conditions = ["user_id = :user_id"]
    params = {"user_id": user_id, "fts_query": fts_query, "limit": limit, "offset": offset}

    # Filter by entity types
    if filters and filters.entityTypes:
        placeholders = ", ".join([f":entity_type_{i}" for i in range(len(filters.entityTypes))])
        where_conditions.append(f"entity_type IN ({placeholders})")
        for i, entity_type in enumerate(filters.entityTypes):
            params[f"entity_type_{i}"] = entity_type

    # Filter by case IDs
    if filters and filters.caseIds:
        placeholders = ", ".join([f":case_id_{i}" for i in range(len(filters.caseIds))])
        where_conditions.append(f"case_id IN ({placeholders})")
        for i, case_id in enumerate(filters.caseIds):
            params[f"case_id_{i}"] = case_id

    # Filter by date range
    if filters and filters.dateRange:
        where_conditions.append("created_at >= :date_from AND created_at <= :date_to")
        params["date_from"] = filters.dateRange["from"]
        params["date_to"] = filters.dateRange["to"]

    where_clause = " AND ".join(where_conditions)

    # Count query
    count_query = text(
        f"""
        SELECT COUNT(*) as total
        FROM search_index
        WHERE search_index MATCH :fts_query
          AND {where_clause}
    """
    )

    # Search query
    search_query = text(
        f"""
        SELECT
            si.*,
            bm25(search_index) AS rank
        FROM search_index si
        WHERE search_index MATCH :fts_query
          AND {where_clause}
        ORDER BY rank
        LIMIT :limit OFFSET :offset
    """
    )

    try:
        # Get total count
        count_result = db.execute(count_query, params).fetchone()
        total = count_result[0] if count_result else 0

        # Get search results
        rows = db.execute(search_query, params).fetchall()

        results = []
        for row in rows:
            result_dict = dict(row._mapping)

            # Calculate relevance score from rank
            rank = abs(result_dict.get("rank", 0))
            relevance_score = 100.0 / (1.0 + rank) if rank > 0 else 100.0

            # Extract excerpt
            content = result_dict.get("content", "") or ""
            excerpt = extract_excerpt(content, query)

            # Build result item
            result_item = {
                "id": result_dict.get("entity_id"),
                "type": result_dict.get("entity_type"),
                "title": result_dict.get("title", ""),
                "excerpt": excerpt,
                "relevanceScore": relevance_score,
                "caseId": result_dict.get("case_id"),
                "caseTitle": None,  # TODO: Resolve case title
                "createdAt": result_dict.get("created_at", ""),
                "metadata": {},
            }

            # Add type-specific metadata
            entity_type = result_dict.get("entity_type")
            if entity_type == "case":
                result_item["metadata"] = {
                    "status": result_dict.get("status"),
                    "caseType": result_dict.get("case_type"),
                }
            elif entity_type == "evidence":
                result_item["metadata"] = {
                    "evidenceType": result_dict.get("evidence_type"),
                    "filePath": result_dict.get("file_path"),
                }
            elif entity_type == "conversation":
                result_item["metadata"] = {"messageCount": result_dict.get("message_count")}
            elif entity_type == "note":
                result_item["metadata"] = {"isPinned": bool(result_dict.get("is_pinned"))}

            results.append(result_item)

        return {"results": results, "total": total}

    except Exception as exc:
        # Fallback to LIKE search if FTS5 fails
        raise

def search_with_like(
    db: Session, user_id: int, query: str, filters: Optional[SearchFilters], limit: int, offset: int
) -> Dict[str, Any]:
    """Fallback search using LIKE queries when FTS5 is not available."""
    from sqlalchemy import text

    results = []
    total = 0

    # Prepare LIKE pattern
    like_pattern = f"%{query}%"
    entity_types = (
        filters.entityTypes if filters and filters.entityTypes else ["case", "evidence", "note"]
    )

    # Search cases
    if "case" in entity_types:
        case_query = text(
            """
            SELECT
                id as entity_id,
                'case' as entity_type,
                title,
                description as content,
                NULL as case_id,
                status,
                case_type,
                created_at
            FROM cases
            WHERE user_id = :user_id
              AND (title LIKE :pattern OR description LIKE :pattern)
            LIMIT :limit
        """
        )

        case_rows = db.execute(
            case_query, {"user_id": user_id, "pattern": like_pattern, "limit": limit}
        ).fetchall()

        for row in case_rows:
            row_dict = dict(row._mapping)
            results.append(
                {
                    "id": row_dict["entity_id"],
                    "type": "case",
                    "title": row_dict["title"],
                    "excerpt": extract_excerpt(row_dict.get("content", ""), query),
                    "relevanceScore": calculate_relevance(
                        f"{row_dict['title']} {row_dict.get('content', '')}", query
                    ),
                    "caseId": None,
                    "caseTitle": None,
                    "createdAt": row_dict.get("created_at", ""),
                    "metadata": {
                        "status": row_dict.get("status"),
                        "caseType": row_dict.get("case_type"),
                    },
                }
            )
        total += len(case_rows)

    # Search evidence
    if "evidence" in entity_types:
        evidence_query = text(
            """
            SELECT
                e.id as entity_id,
                'evidence' as entity_type,
                e.title,
                e.content,
                e.case_id,
                e.evidence_type,
                e.file_path,
                e.created_at,
                c.title as case_title
            FROM evidence e
            LEFT JOIN cases c ON e.case_id = c.id
            WHERE e.user_id = :user_id
              AND (e.title LIKE :pattern OR e.content LIKE :pattern)
            LIMIT :limit
        """
        )

        evidence_rows = db.execute(
            evidence_query, {"user_id": user_id, "pattern": like_pattern, "limit": limit}
        ).fetchall()

        for row in evidence_rows:
            row_dict = dict(row._mapping)
            results.append(
                {
                    "id": row_dict["entity_id"],
                    "type": "evidence",
                    "title": row_dict["title"],
                    "excerpt": extract_excerpt(row_dict.get("content", ""), query),
                    "relevanceScore": calculate_relevance(
                        f"{row_dict['title']} {row_dict.get('content', '')}", query
                    ),
                    "caseId": row_dict.get("case_id"),
                    "caseTitle": row_dict.get("case_title"),
                    "createdAt": row_dict.get("created_at", ""),
                    "metadata": {
                        "evidenceType": row_dict.get("evidence_type"),
                        "filePath": row_dict.get("file_path"),
                    },
                }
            )
        total += len(evidence_rows)

    # Search notes
    if "note" in entity_types:
        note_query = text(
            """
            SELECT
                n.id as entity_id,
                'note' as entity_type,
                COALESCE(n.title, 'Untitled Note') as title,
                n.content,
                n.case_id,
                n.is_pinned,
                n.created_at,
                c.title as case_title
            FROM notes n
            LEFT JOIN cases c ON n.case_id = c.id
            WHERE n.user_id = :user_id
              AND (n.title LIKE :pattern OR n.content LIKE :pattern)
            LIMIT :limit
        """
        )

        note_rows = db.execute(
            note_query, {"user_id": user_id, "pattern": like_pattern, "limit": limit}
        ).fetchall()

        for row in note_rows:
            row_dict = dict(row._mapping)
            results.append(
                {
                    "id": row_dict["entity_id"],
                    "type": "note",
                    "title": row_dict["title"],
                    "excerpt": extract_excerpt(row_dict.get("content", ""), query),
                    "relevanceScore": calculate_relevance(
                        f"{row_dict['title']} {row_dict.get('content', '')}", query
                    ),
                    "caseId": row_dict.get("case_id"),
                    "caseTitle": row_dict.get("case_title"),
                    "createdAt": row_dict.get("created_at", ""),
                    "metadata": {"isPinned": bool(row_dict.get("is_pinned"))},
                }
            )
        total += len(note_rows)

    # Sort by relevance
    results.sort(key=lambda x: x["relevanceScore"], reverse=True)

    # Apply pagination
    paginated_results = results[offset: offset + limit]

    return {"results": paginated_results, "total": total}

# ===== ROUTES =====
@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def search(
    request: SearchRequest,
    user_id: int = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Full-text search across cases, evidence, conversations, and notes.

    Uses SQLite FTS5 for fast full-text search when available.
    Falls back to LIKE queries if FTS5 index is not available.
    All results are filtered by user_id for security.

    Search Syntax:
    - Simple: "contract dispute" - searches for terms
    - Prefix: "contr*" - matches "contract", "contractor", etc.
    - AND: "contract AND dispute" - requires both terms (implicit OR by default)
    - NOT: "contract NOT employment" - excludes employment matches
    - Phrase: '"contract dispute"' - exact phrase match
    - Entity filter: Use filters.entityTypes to search specific entity types

    Supported Operators:
    - OR (default): Multiple terms matched as alternatives
    - AND: Requires all terms (use explicit AND in query)
    - NOT: Excludes terms (use explicit NOT in query)
    - *: Prefix wildcard (e.g., "contr*")
    - "...": Exact phrase match
    """
    try:
        # Convert API request filters to service filters
        service_filters = None
        if request.filters:
            service_filters = ServiceSearchFilters(
                case_status=request.filters.caseStatus,
                date_range=request.filters.dateRange,
                entity_types=request.filters.entityTypes,
                tags=request.filters.tags,
                case_ids=request.filters.caseIds,
            )

        # Create search query
        query = SearchQuery(
            query=request.query,
            filters=service_filters,
            sort_by=request.sortBy,
            sort_order=request.sortOrder,
            limit=request.limit,
            offset=request.offset,
        )

        # Execute search using service
        response = search_service.search(user_id=user_id, query=query)

        # Convert service response to API response
        return {
            "results": [r.to_dict() for r in response.results],
            "total": response.total,
            "hasMore": response.has_more,
            "executionTime": response.execution_time,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/rebuild-index", response_model=RebuildIndexResponse, status_code=status.HTTP_200_OK)
async def rebuild_search_index(
    user_id: int = Depends(get_current_user),
    index_builder: SearchIndexBuilder = Depends(get_index_builder),
):
    """
    Rebuild the search index for the authenticated user.

    This operation:
    1. Clears all existing search index entries for the user
    2. Re-indexes all cases, evidence, conversations, and notes
    3. Decrypts encrypted fields before indexing
    4. Extracts tags from content (hashtags, dates, emails, phone numbers)

    Useful when:
    - The index becomes corrupted or out of sync
    - After bulk data imports
    - After system maintenance
    """
    try:
        await index_builder.rebuild_index_for_user(user_id=user_id)

        return {"success": True, "message": f"Search index rebuilt for user {user_id}"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rebuild search index: {str(e)}")

@router.post("/save", response_model=SavedSearchResponse, status_code=status.HTTP_201_CREATED)
async def save_search(
    request: SaveSearchRequest,
    user_id: int = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Save a search query for later reuse.

    Saved searches allow users to:
    - Store frequently used searches
    - Track search history
    - Quickly re-execute complex queries
    """
    try:
        # Convert API request filters to service filters
        service_filters = None
        if request.query.filters:
            service_filters = ServiceSearchFilters(
                case_status=request.query.filters.caseStatus,
                date_range=request.query.filters.dateRange,
                entity_types=request.query.filters.entityTypes,
                tags=request.query.filters.tags,
                case_ids=request.query.filters.caseIds,
            )

        # Create search query
        query = SearchQuery(
            query=request.query.query,
            filters=service_filters,
            sort_by=request.query.sortBy,
            sort_order=request.query.sortOrder,
            limit=request.query.limit,
            offset=request.query.offset,
        )

        # Save using service
        saved_search = search_service.save_search(user_id=user_id, name=request.name, query=query)

        return {
            "id": saved_search.id,
            "name": saved_search.name,
            "queryJson": saved_search.query_json,
            "createdAt": saved_search.created_at,
            "lastUsedAt": saved_search.last_used_at,
            "useCount": saved_search.use_count,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save search: {str(e)}")

@router.get("/saved", response_model=List[SavedSearchResponse])
async def list_saved_searches(
    user_id: int = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Get all saved searches for the authenticated user.

    Returns searches ordered by last used date (most recent first).
    """
    try:
        saved_searches = search_service.get_saved_searches(user_id=user_id)

        return [
            {
                "id": s.id,
                "name": s.name,
                "queryJson": s.query_json,
                "createdAt": s.created_at,
                "lastUsedAt": s.last_used_at,
                "useCount": s.use_count,
            }
            for s in saved_searches
        ]

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list saved searches: {str(e)}")

@router.delete("/saved/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_search(
    search_id: int,
    user_id: int = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Delete a saved search.

    Only the owner can delete a saved search.
    """
    try:
        deleted = search_service.delete_saved_search(user_id=user_id, search_id=search_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Saved search not found")

        return None

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete saved search: {str(e)}")

@router.post("/saved/{search_id}/execute", response_model=SearchResponse)
async def execute_saved_search(
    search_id: int,
    user_id: int = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Execute a previously saved search.

    This endpoint:
    1. Retrieves the saved search query
    2. Updates last_used_at and use_count
    3. Executes the search with current data
    4. Returns results in same format as main search endpoint
    """
    try:
        response = search_service.execute_saved_search(user_id=user_id, search_id=search_id)

        return {
            "results": [r.to_dict() for r in response.results],
            "total": response.total,
            "hasMore": response.has_more,
            "executionTime": response.execution_time,
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to execute saved search: {str(e)}")

@router.get("/suggestions", response_model=List[str])
async def get_search_suggestions(
    prefix: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=5, ge=1, le=20),
    user_id: int = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Get search suggestions based on user's search history.

    Returns recent search queries that match the given prefix,
    ordered by last used date (most recent first).

    Useful for autocomplete features in the UI.
    """
    try:
        suggestions = search_service.get_search_suggestions(
            user_id=user_id, prefix=prefix, limit=limit
        )

        return suggestions

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

# ===== INDEX MANAGEMENT ENDPOINTS =====

@router.get("/index/stats", response_model=IndexStatsResponse)
async def get_index_statistics(
    user_id: int = Depends(get_current_user),
    index_builder: SearchIndexBuilder = Depends(get_index_builder),
):
    """
    Get search index statistics.

    Returns:
    - Total number of indexed documents
    - Count of documents by entity type (case, evidence, conversation, note)
    - Last updated timestamp
    """
    try:
        stats = await index_builder.get_index_stats()

        return {
            "totalDocuments": stats["total_documents"],
            "documentsByType": stats["documents_by_type"],
            "lastUpdated": stats["last_updated"],
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get index statistics: {str(e)}")

@router.post("/index/optimize", response_model=RebuildIndexResponse)
async def optimize_search_index(
    user_id: int = Depends(get_current_user),
    index_builder: SearchIndexBuilder = Depends(get_index_builder),
):
    """
    Optimize the FTS5 search index for better performance.

    This operation:
    1. Rebuilds the FTS5 index structure
    2. Optimizes the index for faster queries
    3. Reclaims unused space

    Run this operation periodically or after:
    - Large bulk data imports
    - Many deletions
    - Performance degradation
    """
    try:
        await index_builder.optimize_index()

        return {"success": True, "message": "Search index optimized successfully"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to optimize search index: {str(e)}")

@router.post("/index/update", response_model=RebuildIndexResponse)
async def update_index_entity(
    request: UpdateIndexRequest,
    user_id: int = Depends(get_current_user),
    index_builder: SearchIndexBuilder = Depends(get_index_builder),
):
    """
    Update a single entity in the search index.

    Use this endpoint to incrementally update the index when:
    - A case, evidence, conversation, or note is created
    - An entity is updated
    - Content is modified

    This is more efficient than rebuilding the entire index.
    """
    try:
        await index_builder.update_in_index(
            entity_type=request.entityType, entity_id=request.entityId
        )

        return {
            "success": True,
            "message": f"Updated {request.entityType} {request.entityId} in search index",
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update index: {str(e)}")

@router.delete("/index/{entity_type}/{entity_id}", response_model=RebuildIndexResponse)
async def remove_from_index(
    entity_type: str,
    entity_id: int,
    user_id: int = Depends(get_current_user),
    index_builder: SearchIndexBuilder = Depends(get_index_builder),
):
    """
    Remove an entity from the search index.

    Use this endpoint when:
    - A case, evidence, conversation, or note is deleted
    - An entity should no longer appear in search results

    Args:
        entity_type: Type of entity (case, evidence, conversation, note)
        entity_id: ID of the entity to remove
    """
    # Validate entity type
    valid_types = ["case", "evidence", "conversation", "note"]
    if entity_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity type: {entity_type}. Must be one of: {', '.join(valid_types)}",
        )

    try:
        await index_builder.remove_from_index(entity_type=entity_type, entity_id=entity_id)

        return {"success": True, "message": f"Removed {entity_type} {entity_id} from search index"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to remove from index: {str(e)}")

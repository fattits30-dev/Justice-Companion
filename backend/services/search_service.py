"""
Full-text search service for Justice Companion.
Ported from src/services/SearchService.ts

Provides comprehensive search functionality across all legal entities:
- Cases, evidence, conversations, notes
- FTS5 full-text search with BM25 ranking
- Fallback to LIKE queries when FTS5 unavailable
- Saved searches with history
- User ownership filtering for security
"""

import json
import re
import time
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.services.encryption_service import EncryptionService, EncryptedData
from backend.services.audit_logger import log_audit_event


# ===== TYPE DEFINITIONS =====

class SearchFilters:
    """Filters for search queries."""
    def __init__(
        self,
        case_status: Optional[List[str]] = None,
        date_range: Optional[Dict[str, str]] = None,
        entity_types: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        case_ids: Optional[List[int]] = None
    ):
        self.case_status = case_status or []
        self.date_range = date_range
        self.entity_types = entity_types or []
        self.tags = tags or []
        self.case_ids = case_ids or []


class SearchQuery:
    """Search query with filters and pagination."""
    def __init__(
        self,
        query: str,
        filters: Optional[SearchFilters] = None,
        sort_by: str = "relevance",
        sort_order: str = "desc",
        limit: int = 20,
        offset: int = 0
    ):
        self.query = query.strip()
        self.filters = filters
        self.sort_by = sort_by
        self.sort_order = sort_order
        self.limit = limit
        self.offset = offset


class SearchResult:
    """Individual search result item."""
    def __init__(
        self,
        id: int,
        type: str,
        title: str,
        excerpt: str,
        relevance_score: float,
        case_id: Optional[int] = None,
        case_title: Optional[str] = None,
        created_at: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.type = type
        self.title = title
        self.excerpt = excerpt
        self.relevance_score = relevance_score
        self.case_id = case_id
        self.case_title = case_title
        self.created_at = created_at
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "excerpt": self.excerpt,
            "relevanceScore": self.relevance_score,
            "caseId": self.case_id,
            "caseTitle": self.case_title,
            "createdAt": self.created_at,
            "metadata": self.metadata
        }


class SearchResponse:
    """Response model for search results."""
    def __init__(
        self,
        results: List[SearchResult],
        total: int,
        has_more: bool,
        query: SearchQuery,
        execution_time: int
    ):
        self.results = results
        self.total = total
        self.has_more = has_more
        self.query = query
        self.execution_time = execution_time

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "results": [r.to_dict() for r in self.results],
            "total": self.total,
            "hasMore": self.has_more,
            "executionTime": self.execution_time
        }


class SavedSearch:
    """Saved search query for later reuse."""
    def __init__(
        self,
        id: int,
        user_id: int,
        name: str,
        query_json: str,
        created_at: str,
        last_used_at: Optional[str] = None,
        use_count: int = 0
    ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.query_json = query_json
        self.created_at = created_at
        self.last_used_at = last_used_at
        self.use_count = use_count


# ===== SEARCH SERVICE =====

class SearchService:
    """
    Full-text search service for Justice Companion.

    Provides comprehensive search across all legal entities with:
    - FTS5 full-text search with BM25 ranking
    - Fallback to LIKE queries when FTS5 unavailable
    - Encryption support for sensitive content
    - User ownership filtering for security
    - Saved searches with history

    Example:
        service = SearchService(db=session, encryption_service=enc_service)
        query = SearchQuery(query="contract dispute", limit=20)
        response = service.search(user_id=1, query=query)
        for result in response.results:
            print(f"{result.type}: {result.title}")
    """

    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None
    ):
        """
        Initialize search service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Optional encryption service for decrypting content
        """
        self.db = db
        self.encryption_service = encryption_service

    def search(self, user_id: int, query: SearchQuery) -> SearchResponse:
        """
        Perform a comprehensive search across all entities.

        Args:
            user_id: User ID for ownership filtering
            query: Search query with filters and pagination

        Returns:
            SearchResponse with results and metadata

        Security:
        - All results filtered by user_id
        - Encrypted content is decrypted before returning
        - Audit log entry created for search
        """
        start_time = time.time()

        # Log the search for audit purposes
        log_audit_event(
            db=self.db,
            event_type="query.paginated",
            user_id=str(user_id),
            resource_type="search",
            resource_id="global",
            action="read",
            details={
                "query": query.query,
                "filters": self._serialize_filters(query.filters)
            },
            success=True
        )

        # Default entity types if not specified
        entity_types = query.filters.entity_types if query.filters else []
        if not entity_types:
            entity_types = ["case", "evidence", "conversation", "note"]

        try:
            # Try FTS5 search first
            results, total = self._search_with_fts5(
                user_id=user_id,
                original_query=query.query,
                filters=query.filters,
                entity_types=entity_types,
                limit=query.limit,
                offset=query.offset
            )
        except Exception:
            # Fallback to LIKE search if FTS5 fails
            results, total = self._fallback_search(
                user_id=user_id,
                query=query.query,
                filters=query.filters,
                entity_types=entity_types,
                limit=query.limit,
                offset=query.offset
            )

        # Sort results
        sorted_results = self._sort_results(
            results=results,
            sort_by=query.sort_by,
            sort_order=query.sort_order
        )

        # Calculate execution time
        execution_time = int((time.time() - start_time) * 1000)

        return SearchResponse(
            results=sorted_results[:query.limit],
            total=total,
            has_more=total > query.offset + query.limit,
            query=query,
            execution_time=execution_time
        )

    def _search_with_fts5(
        self,
        user_id: int,
        original_query: str,
        filters: Optional[SearchFilters],
        entity_types: List[str],
        limit: int,
        offset: int
    ) -> Tuple[List[SearchResult], int]:
        """
        Search using SQLite FTS5 full-text search with BM25 ranking.

        Args:
            user_id: User ID for ownership filtering
            original_query: Original search query string
            filters: Optional search filters
            entity_types: List of entity types to search
            limit: Maximum results to return
            offset: Pagination offset

        Returns:
            Tuple of (results list, total count)

        Raises:
            Exception: If FTS5 query fails (caller should fallback to LIKE)
        """
        results: List[SearchResult] = []

        # Build FTS5 query
        fts_query = self._build_fts_query(original_query)

        # Build WHERE conditions
        where_conditions = ["user_id = :user_id"]
        params: Dict[str, Any] = {"user_id": user_id, "fts_query": fts_query}

        # Filter by entity types
        if entity_types:
            placeholders = ", ".join([f":entity_type_{i}" for i in range(len(entity_types))])
            where_conditions.append(f"entity_type IN ({placeholders})")
            for i, entity_type in enumerate(entity_types):
                params[f"entity_type_{i}"] = entity_type

        # Filter by case IDs
        if filters and filters.case_ids:
            placeholders = ", ".join([f":case_id_{i}" for i in range(len(filters.case_ids))])
            where_conditions.append(f"case_id IN ({placeholders})")
            for i, case_id in enumerate(filters.case_ids):
                params[f"case_id_{i}"] = case_id

        # Filter by date range
        if filters and filters.date_range:
            where_conditions.append("created_at >= :date_from AND created_at <= :date_to")
            params["date_from"] = filters.date_range.get("from", "")
            params["date_to"] = filters.date_range.get("to", "")

        where_clause = " AND ".join(where_conditions)

        # Count query
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM search_index
            WHERE search_index MATCH :fts_query
              AND {where_clause}
        """)

        # Search query with BM25 ranking
        search_query = text(f"""
            SELECT
                si.*,
                bm25(search_index) AS rank
            FROM search_index si
            WHERE search_index MATCH :fts_query
              AND {where_clause}
            ORDER BY rank
            LIMIT :limit OFFSET :offset
        """)

        params["limit"] = limit
        params["offset"] = offset

        # Execute queries
        count_result = self.db.execute(count_query, params).fetchone()
        total = count_result[0] if count_result else 0

        rows = self.db.execute(search_query, params).fetchall()

        # Transform rows to SearchResult objects
        for row in rows:
            row_dict = dict(row._mapping)
            rank = abs(row_dict.get("rank", 0))
            result = self._transform_search_result(
                row=row_dict,
                relevance_score=rank,
                search_term=original_query
            )
            if result:
                results.append(result)

        return results, total

    def _fallback_search(
        self,
        user_id: int,
        query: str,
        filters: Optional[SearchFilters],
        entity_types: List[str],
        limit: int,
        offset: int
    ) -> Tuple[List[SearchResult], int]:
        """
        Fallback search using LIKE queries when FTS5 is not available.

        Args:
            user_id: User ID for ownership filtering
            query: Search query string
            filters: Optional search filters
            entity_types: List of entity types to search
            limit: Maximum results to return
            offset: Pagination offset

        Returns:
            Tuple of (results list, total count)
        """
        results: List[SearchResult] = []
        total = 0

        if "case" in entity_types:
            case_results, case_count = self._collect_case_results(
                user_id=user_id,
                query=query,
                filters=filters
            )
            results.extend(case_results)
            total += case_count

        if "evidence" in entity_types:
            evidence_results, evidence_count = self._collect_evidence_results(
                user_id=user_id,
                query=query,
                filters=filters
            )
            results.extend(evidence_results)
            total += evidence_count

        if "conversation" in entity_types:
            conversation_results, conversation_count = self._collect_conversation_results(
                user_id=user_id,
                query=query,
                filters=filters
            )
            results.extend(conversation_results)
            total += conversation_count

        if "note" in entity_types:
            note_results, note_count = self._collect_note_results(
                user_id=user_id,
                query=query,
                filters=filters
            )
            results.extend(note_results)
            total += note_count

        # Apply pagination
        return results[offset:offset + limit], total

    def _collect_case_results(
        self,
        user_id: int,
        query: str,
        filters: Optional[SearchFilters]
    ) -> Tuple[List[SearchResult], int]:
        """Search cases using LIKE query."""
        like_pattern = f"%{query}%"

        case_query = text("""
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
            LIMIT 100
        """)

        rows = self.db.execute(case_query, {
            "user_id": user_id,
            "pattern": like_pattern
        }).fetchall()

        results = []
        for row in rows:
            row_dict = dict(row._mapping)
            content = row_dict.get("content") or ""
            title = row_dict.get("title") or ""

            results.append(SearchResult(
                id=row_dict["entity_id"],
                type="case",
                title=title,
                excerpt=self._extract_excerpt(content, query),
                relevance_score=self._calculate_relevance(f"{title} {content}", query),
                case_id=None,
                case_title=None,
                created_at=row_dict.get("created_at", ""),
                metadata={
                    "status": row_dict.get("status"),
                    "caseType": row_dict.get("case_type")
                }
            ))

        return results, len(results)

    def _collect_evidence_results(
        self,
        user_id: int,
        query: str,
        filters: Optional[SearchFilters]
    ) -> Tuple[List[SearchResult], int]:
        """Search evidence using LIKE query."""
        like_pattern = f"%{query}%"

        evidence_query = text("""
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
            LIMIT 100
        """)

        rows = self.db.execute(evidence_query, {
            "user_id": user_id,
            "pattern": like_pattern
        }).fetchall()

        results = []
        for row in rows:
            row_dict = dict(row._mapping)
            content = row_dict.get("content") or ""
            title = row_dict.get("title") or ""

            results.append(SearchResult(
                id=row_dict["entity_id"],
                type="evidence",
                title=title,
                excerpt=self._extract_excerpt(content, query),
                relevance_score=self._calculate_relevance(f"{title} {content}", query),
                case_id=row_dict.get("case_id"),
                case_title=row_dict.get("case_title"),
                created_at=row_dict.get("created_at", ""),
                metadata={
                    "evidenceType": row_dict.get("evidence_type"),
                    "filePath": row_dict.get("file_path")
                }
            ))

        return results, len(results)

    def _collect_conversation_results(
        self,
        user_id: int,
        query: str,
        filters: Optional[SearchFilters]
    ) -> Tuple[List[SearchResult], int]:
        """Search conversations using LIKE query."""
        like_pattern = f"%{query}%"

        conversation_query = text("""
            SELECT
                cc.id as entity_id,
                'conversation' as entity_type,
                cc.title,
                cc.case_id,
                cc.created_at,
                c.title as case_title,
                (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id) as message_count
            FROM chat_conversations cc
            LEFT JOIN cases c ON cc.case_id = c.id
            WHERE cc.user_id = :user_id
              AND cc.title LIKE :pattern
            LIMIT 100
        """)

        rows = self.db.execute(conversation_query, {
            "user_id": user_id,
            "pattern": like_pattern
        }).fetchall()

        results = []
        for row in rows:
            row_dict = dict(row._mapping)
            title = row_dict.get("title") or "Untitled Conversation"

            results.append(SearchResult(
                id=row_dict["entity_id"],
                type="conversation",
                title=title,
                excerpt=self._extract_excerpt(title, query),
                relevance_score=self._calculate_relevance(title, query),
                case_id=row_dict.get("case_id"),
                case_title=row_dict.get("case_title"),
                created_at=row_dict.get("created_at", ""),
                metadata={
                    "messageCount": row_dict.get("message_count", 0)
                }
            ))

        return results, len(results)

    def _collect_note_results(
        self,
        user_id: int,
        query: str,
        filters: Optional[SearchFilters]
    ) -> Tuple[List[SearchResult], int]:
        """Search notes using LIKE query."""
        like_pattern = f"%{query}%"

        note_query = text("""
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
            LIMIT 100
        """)

        rows = self.db.execute(note_query, {
            "user_id": user_id,
            "pattern": like_pattern
        }).fetchall()

        results = []
        for row in rows:
            row_dict = dict(row._mapping)
            content = row_dict.get("content") or ""
            title = row_dict.get("title") or "Untitled Note"

            results.append(SearchResult(
                id=row_dict["entity_id"],
                type="note",
                title=title,
                excerpt=self._extract_excerpt(content, query),
                relevance_score=self._calculate_relevance(f"{title} {content}", query),
                case_id=row_dict.get("case_id"),
                case_title=row_dict.get("case_title"),
                created_at=row_dict.get("created_at", ""),
                metadata={
                    "isPinned": bool(row_dict.get("is_pinned"))
                }
            ))

        return results, len(results)

    def _transform_search_result(
        self,
        row: Dict[str, Any],
        relevance_score: float,
        search_term: str
    ) -> Optional[SearchResult]:
        """
        Transform a search index row to a SearchResult object.

        Args:
            row: Database row as dictionary
            relevance_score: BM25 rank or calculated relevance score
            search_term: Original search term for excerpt generation

        Returns:
            SearchResult object or None if transformation fails
        """
        try:
            # Resolve content (decrypt if needed)
            content = self._resolve_content(row)

            # Resolve case title
            case_title = self._resolve_case_title(row)

            # Map metadata based on entity type
            metadata = self._map_metadata(row)

            return SearchResult(
                id=row.get("entity_id", 0),
                type=row.get("entity_type", ""),
                title=row.get("title", ""),
                excerpt=self._extract_excerpt(content, search_term),
                relevance_score=abs(relevance_score),
                case_id=row.get("case_id"),
                case_title=case_title,
                created_at=row.get("created_at", ""),
                metadata=metadata
            )
        except Exception:
            # Log error and return None
            return None

    def _resolve_content(self, row: Dict[str, Any]) -> str:
        """
        Resolve content from row, decrypting if necessary.

        Args:
            row: Database row with content field

        Returns:
            Decrypted or raw content string
        """
        raw_content = row.get("content") or ""
        is_encrypted = row.get("content_encrypted", 0)

        if not is_encrypted or not isinstance(raw_content, str):
            return raw_content

        # Try to decrypt if encryption service is available
        if not self.encryption_service:
            return raw_content

        try:
            encrypted_payload = json.loads(raw_content)
            encrypted_data = EncryptedData.from_dict(encrypted_payload)
            decrypted = self.encryption_service.decrypt(encrypted_data)
            return decrypted or raw_content
        except Exception:
            return raw_content

    def _resolve_case_title(self, row: Dict[str, Any]) -> Optional[str]:
        """
        Resolve case title from case_id.

        Args:
            row: Database row with case_id field

        Returns:
            Case title or None
        """
        case_id = row.get("case_id")
        if not case_id:
            return None

        try:
            case_query = text("SELECT title FROM cases WHERE id = :case_id")
            case_row = self.db.execute(case_query, {"case_id": case_id}).fetchone()
            return case_row[0] if case_row else None
        except Exception:
            return None

    def _map_metadata(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map entity-specific metadata from row.

        Args:
            row: Database row

        Returns:
            Metadata dictionary
        """
        entity_type = row.get("entity_type", "")

        if entity_type == "case":
            return {
                k: v for k, v in {
                    "status": row.get("status"),
                    "caseType": row.get("case_type")
                }.items() if v is not None
            }
        elif entity_type == "evidence":
            return {
                k: v for k, v in {
                    "evidenceType": row.get("evidence_type"),
                    "filePath": row.get("file_path")
                }.items() if v is not None
            }
        elif entity_type == "conversation":
            message_count = row.get("message_count")
            return {"messageCount": message_count} if message_count is not None else {}
        elif entity_type == "note":
            is_pinned = row.get("is_pinned")
            return {"isPinned": bool(is_pinned)} if is_pinned is not None else {}

        return {}

    def _build_fts_query(self, query: str) -> str:
        """
        Build FTS5 query from user input with prefix matching.

        Args:
            query: User's search query

        Returns:
            FTS5-formatted query string

        Example:
            "contract dispute" -> '"contract"* OR "dispute"*'
        """
        # Escape special characters
        escaped = query.replace('"', '""').strip()

        # Split into terms
        terms = [t for t in escaped.split() if t]

        # Build FTS5 query with prefix matching
        return " OR ".join([f'"{term}"*' for term in terms])

    def _extract_excerpt(
        self,
        content: str,
        query: str,
        max_length: int = 150
    ) -> str:
        """
        Extract an excerpt from content around the query terms.

        Args:
            content: Full content text
            query: Search query
            max_length: Maximum excerpt length

        Returns:
            Excerpt with ellipsis if truncated
        """
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

    def _calculate_relevance(self, text: str, query: str) -> float:
        """
        Calculate relevance score for a text against a query.

        Uses simple scoring algorithm:
        - Exact phrase match: +10 points
        - Each term match: +2 points per occurrence
        - Match in first 100 chars: +5 points

        Args:
            text: Text to score
            query: Search query

        Returns:
            Relevance score (higher is better)
        """
        lower_text = text.lower()
        lower_query = query.lower()
        query_terms = [t.strip() for t in lower_query.split() if t.strip()]

        score = 0.0

        # Exact phrase match
        if lower_query in lower_text:
            score += 10.0

        # Individual term matches
        for term in query_terms:
            escaped_term = re.escape(term)
            matches = len(re.findall(escaped_term, lower_text))
            score += matches * 2.0

        # Match in first 100 characters (higher weight)
        if lower_query in lower_text[:100]:
            score += 5.0

        return score

    def _sort_results(
        self,
        results: List[SearchResult],
        sort_by: str,
        sort_order: str
    ) -> List[SearchResult]:
        """
        Sort search results by specified criteria.

        Args:
            results: List of search results
            sort_by: Sort field ("relevance", "date", "title")
            sort_order: Sort order ("asc", "desc")

        Returns:
            Sorted list of search results
        """
        reverse = (sort_order == "desc")

        if sort_by == "relevance":
            return sorted(results, key=lambda r: r.relevance_score, reverse=reverse)
        elif sort_by == "date":
            return sorted(
                results,
                key=lambda r: r.created_at or "",
                reverse=reverse
            )
        elif sort_by == "title":
            return sorted(results, key=lambda r: r.title.lower(), reverse=reverse)

        return results

    def _serialize_filters(self, filters: Optional[SearchFilters]) -> Optional[Dict[str, Any]]:
        """Serialize filters for audit logging."""
        if not filters:
            return None
        return {
            "caseStatus": filters.case_status,
            "dateRange": filters.date_range,
            "entityTypes": filters.entity_types,
            "tags": filters.tags,
            "caseIds": filters.case_ids
        }

    # ===== SAVED SEARCHES =====

    def save_search(
        self,
        user_id: int,
        name: str,
        query: SearchQuery
    ) -> SavedSearch:
        """
        Save a search query for later reuse.

        Args:
            user_id: User ID
            name: Name for the saved search
            query: SearchQuery to save

        Returns:
            SavedSearch object
        """
        query_json = json.dumps({
            "query": query.query,
            "filters": self._serialize_filters(query.filters),
            "sortBy": query.sort_by,
            "sortOrder": query.sort_order,
            "limit": query.limit,
            "offset": query.offset
        })

        insert_query = text("""
            INSERT INTO saved_searches (user_id, name, query_json, created_at, use_count)
            VALUES (:user_id, :name, :query_json, CURRENT_TIMESTAMP, 0)
        """)

        result = self.db.execute(insert_query, {
            "user_id": user_id,
            "name": name,
            "query_json": query_json
        })
        self.db.commit()

        search_id = result.lastrowid

        # Log audit event
        log_audit_event(
            db=self.db,
            event_type="query.paginated",
            user_id=str(user_id),
            resource_type="search.saved",
            resource_id=str(search_id),
            action="create",
            details={"name": name},
            success=True
        )

        # Fetch and return the saved search
        select_query = text("SELECT * FROM saved_searches WHERE id = :search_id")
        saved_row = self.db.execute(select_query, {"search_id": search_id}).fetchone()

        return SavedSearch(
            id=saved_row[0],
            user_id=saved_row[1],
            name=saved_row[2],
            query_json=saved_row[3],
            created_at=saved_row[4],
            last_used_at=saved_row[5],
            use_count=saved_row[6]
        )

    def get_saved_searches(self, user_id: int) -> List[SavedSearch]:
        """
        Get all saved searches for a user.

        Args:
            user_id: User ID

        Returns:
            List of SavedSearch objects
        """
        query = text("""
            SELECT id, user_id, name, query_json, created_at, last_used_at, use_count
            FROM saved_searches
            WHERE user_id = :user_id
            ORDER BY last_used_at DESC, created_at DESC
        """)

        rows = self.db.execute(query, {"user_id": user_id}).fetchall()

        return [
            SavedSearch(
                id=row[0],
                user_id=row[1],
                name=row[2],
                query_json=row[3],
                created_at=row[4],
                last_used_at=row[5],
                use_count=row[6]
            )
            for row in rows
        ]

    def delete_saved_search(self, user_id: int, search_id: int) -> bool:
        """
        Delete a saved search.

        Args:
            user_id: User ID (for ownership verification)
            search_id: Saved search ID

        Returns:
            True if deleted, False if not found
        """
        delete_query = text("""
            DELETE FROM saved_searches
            WHERE id = :search_id AND user_id = :user_id
        """)

        result = self.db.execute(delete_query, {
            "search_id": search_id,
            "user_id": user_id
        })
        self.db.commit()

        if result.rowcount > 0:
            log_audit_event(
                db=self.db,
                event_type="query.paginated",
                user_id=str(user_id),
                resource_type="search.saved",
                resource_id=str(search_id),
                action="delete",
                success=True
            )
            return True

        return False

    def execute_saved_search(
        self,
        user_id: int,
        search_id: int
    ) -> SearchResponse:
        """
        Execute a previously saved search.

        Args:
            user_id: User ID (for ownership verification)
            search_id: Saved search ID

        Returns:
            SearchResponse with results

        Raises:
            ValueError: If saved search not found
        """
        # Get saved search
        select_query = text("""
            SELECT query_json
            FROM saved_searches
            WHERE id = :search_id AND user_id = :user_id
        """)

        saved_row = self.db.execute(select_query, {
            "search_id": search_id,
            "user_id": user_id
        }).fetchone()

        if not saved_row:
            raise ValueError("Saved search not found")

        # Update last_used_at and use_count
        update_query = text("""
            UPDATE saved_searches
            SET last_used_at = CURRENT_TIMESTAMP,
                use_count = use_count + 1
            WHERE id = :search_id
        """)
        self.db.execute(update_query, {"search_id": search_id})
        self.db.commit()

        # Parse and execute the saved query
        query_dict = json.loads(saved_row[0])
        filters = None
        if query_dict.get("filters"):
            filters = SearchFilters(
                case_status=query_dict["filters"].get("caseStatus"),
                date_range=query_dict["filters"].get("dateRange"),
                entity_types=query_dict["filters"].get("entityTypes"),
                tags=query_dict["filters"].get("tags"),
                case_ids=query_dict["filters"].get("caseIds")
            )

        query = SearchQuery(
            query=query_dict["query"],
            filters=filters,
            sort_by=query_dict.get("sortBy", "relevance"),
            sort_order=query_dict.get("sortOrder", "desc"),
            limit=query_dict.get("limit", 20),
            offset=query_dict.get("offset", 0)
        )

        return self.search(user_id=user_id, query=query)

    def get_search_suggestions(
        self,
        user_id: int,
        prefix: str,
        limit: int = 5
    ) -> List[str]:
        """
        Get search suggestions based on user's search history.

        Args:
            user_id: User ID
            prefix: Search query prefix
            limit: Maximum suggestions to return

        Returns:
            List of search query strings
        """
        query = text("""
            SELECT DISTINCT query_json
            FROM saved_searches
            WHERE user_id = :user_id
              AND query_json LIKE :pattern
            ORDER BY last_used_at DESC, created_at DESC
            LIMIT :limit
        """)

        rows = self.db.execute(query, {
            "user_id": user_id,
            "pattern": f'%"query":"{prefix}%',
            "limit": limit
        }).fetchall()

        suggestions = []
        for row in rows:
            try:
                query_data = json.loads(row[0])
                if "query" in query_data:
                    suggestions.append(query_data["query"])
            except (json.JSONDecodeError, KeyError):
                continue

        return suggestions

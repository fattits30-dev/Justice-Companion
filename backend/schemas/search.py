"""
Search schemas - Pydantic models for search API operations.

Single source of truth for search-related request and response types.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ===== CONSTANTS =====
VALID_ENTITY_TYPES = ["case", "evidence", "conversation", "note", "document"]
VALID_SORT_BY = ["relevance", "date", "title"]
VALID_SORT_ORDER = ["asc", "desc"]
VALID_CASE_STATUSES = ["active", "closed", "pending"]


# ===== REQUEST SCHEMAS =====


class SearchFilters(BaseModel):
    """Filters for search queries."""

    caseStatus: Optional[List[str]] = None
    dateRange: Optional[Dict[str, str]] = None  # {"from": "2025-01-01", "to": "2025-12-31"}
    entityTypes: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    caseIds: Optional[List[int]] = None

    @field_validator("caseStatus")
    @classmethod
    def validate_case_status(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            for item in v:
                if item not in VALID_CASE_STATUSES:
                    raise ValueError(f"Invalid case status: {item}")
        return v

    @field_validator("entityTypes")
    @classmethod
    def validate_entity_types(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            for item in v:
                if item not in VALID_ENTITY_TYPES:
                    raise ValueError(f"Invalid entity type: {item}")
        return v

    @field_validator("dateRange")
    @classmethod
    def validate_date_range(cls, v: Optional[Dict[str, str]]) -> Optional[Dict[str, str]]:
        if v:
            if "from" not in v or "to" not in v:
                raise ValueError("Date range must have 'from' and 'to' fields")
            try:
                datetime.strptime(v["from"], "%Y-%m-%d")
                datetime.strptime(v["to"], "%Y-%m-%d")
            except ValueError:
                raise ValueError("Invalid date format (use YYYY-MM-DD)")
        return v


class SearchRequest(BaseModel):
    """Request model for search."""

    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    filters: Optional[SearchFilters] = None
    sortBy: str = Field(default="relevance", description="Sort field")
    sortOrder: str = Field(default="desc", description="Sort order")
    limit: int = Field(default=20, ge=1, le=100, description="Results per page")
    offset: int = Field(default=0, ge=0, description="Pagination offset")

    @field_validator("sortBy")
    @classmethod
    def validate_sort_by(cls, v: str) -> str:
        if v not in VALID_SORT_BY:
            raise ValueError(f"Invalid sortBy: {v}. Must be one of: {', '.join(VALID_SORT_BY)}")
        return v

    @field_validator("sortOrder")
    @classmethod
    def validate_sort_order(cls, v: str) -> str:
        if v not in VALID_SORT_ORDER:
            raise ValueError(
                f"Invalid sortOrder: {v}. Must be one of: {', '.join(VALID_SORT_ORDER)}"
            )
        return v

    @field_validator("query")
    @classmethod
    def strip_query(cls, v: str) -> str:
        return v.strip()


class SaveSearchRequest(BaseModel):
    """Request model for saving a search."""

    name: str = Field(..., min_length=1, max_length=100, description="Search name")
    query: SearchRequest

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class UpdateIndexRequest(BaseModel):
    """Request model for updating a single entity in index."""

    entityType: str = Field(..., description="Entity type (case, evidence, conversation, note)")
    entityId: int = Field(..., description="Entity ID to update")

    @field_validator("entityType")
    @classmethod
    def validate_entity_type(cls, v: str) -> str:
        valid_types = ["case", "evidence", "conversation", "note"]
        if v not in valid_types:
            raise ValueError(f"Invalid entity type: {v}. Must be one of: {', '.join(valid_types)}")
        return v


# ===== RESPONSE SCHEMAS =====


class SearchResultItem(BaseModel):
    """Individual search result."""

    id: int
    type: str  # "case" | "evidence" | "conversation" | "note" | "document"
    title: str
    excerpt: str
    relevanceScore: float
    caseId: Optional[int] = None
    caseTitle: Optional[str] = None
    createdAt: str
    metadata: Dict[str, Any]


class SearchResponse(BaseModel):
    """Response model for search results."""

    results: List[SearchResultItem]
    total: int
    hasMore: bool
    executionTime: int  # milliseconds


class SavedSearchResponse(BaseModel):
    """Response model for saved search."""

    id: int
    name: str
    queryJson: str
    createdAt: str
    lastUsedAt: Optional[str] = None
    useCount: int


class RebuildIndexResponse(BaseModel):
    """Response model for index rebuild."""

    success: bool
    message: str


class IndexStatsResponse(BaseModel):
    """Response model for index statistics."""

    totalDocuments: int
    documentsByType: Dict[str, int]
    lastUpdated: Optional[str]

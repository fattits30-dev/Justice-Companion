"""
Pagination schemas for list endpoints.

Provides standardized pagination support with:
- Limit/offset pagination
- Total count
- Next/previous page indicators
"""

from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field

T = TypeVar('T')


class PaginationParams(BaseModel):
    """
    Standard pagination parameters for list endpoints.

    Usage:
        @router.get("/items")
        def list_items(pagination: PaginationParams = Depends()):
            items = db.query(Item).offset(pagination.offset).limit(pagination.limit).all()
            total = db.query(Item).count()
            return PaginatedResponse(items=items, total=total, **pagination.dict())
    """
    limit: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of items to return (1-100)"
    )
    offset: int = Field(
        default=0,
        ge=0,
        description="Number of items to skip"
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standard paginated response wrapper.

    Includes:
    - items: List of results
    - total: Total number of items
    - limit: Items per page
    - offset: Current offset
    - hasNext: Whether there are more items
    - hasPrevious: Whether there are previous items
    """
    items: List[T]
    total: int = Field(description="Total number of items across all pages")
    limit: int = Field(description="Maximum items per page")
    offset: int = Field(description="Current offset")

    @property
    def hasNext(self) -> bool:
        """Check if there are more items after current page."""
        return self.offset + self.limit < self.total

    @property
    def hasPrevious(self) -> bool:
        """Check if there are items before current page."""
        return self.offset > 0

    @property
    def page(self) -> int:
        """Calculate current page number (1-indexed)."""
        return (self.offset // self.limit) + 1 if self.limit > 0 else 1

    @property
    def totalPages(self) -> int:
        """Calculate total number of pages."""
        return (self.total + self.limit - 1) // self.limit if self.limit > 0 else 1


class CursorParams(BaseModel):
    """
    Cursor-based pagination parameters for real-time data.

    More efficient for frequently-changing datasets than offset pagination.

    Usage:
        @router.get("/messages")
        def list_messages(cursor: CursorParams = Depends()):
            query = db.query(Message)
            if cursor.after:
                query = query.filter(Message.id > cursor.after)
            if cursor.before:
                query = query.filter(Message.id < cursor.before)
            items = query.limit(cursor.limit).all()
            return items
    """
    limit: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of items to return (1-100)"
    )
    after: Optional[str] = Field(
        default=None,
        description="Cursor to get items after"
    )
    before: Optional[str] = Field(
        default=None,
        description="Cursor to get items before"
    )

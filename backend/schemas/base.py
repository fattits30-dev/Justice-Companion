"""
Base schemas - common response types used across all domains.

This module provides the single source of truth for common Pydantic models
used throughout the API.
"""

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class SuccessResponse(BaseModel):
    """Generic success response for operations without data payload."""

    success: bool = True
    message: Optional[str] = None
    data: Optional[dict] = None


class ErrorDetail(BaseModel):
    """Detailed error information."""

    code: Optional[str] = None
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """Standard error response."""

    success: bool = False
    detail: str
    errors: Optional[List[ErrorDetail]] = None


class RateLimitInfo(BaseModel):
    """Rate limit information (returned in error responses)."""

    retry_after_seconds: int
    attempts_remaining: Optional[int] = None


class RateLimitedErrorResponse(ErrorResponse):
    """Error response with rate limit information."""

    rate_limit_info: Optional[RateLimitInfo] = None


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""

    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int
    has_next: bool = False
    has_prev: bool = False


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    success: bool = True
    data: List[T]
    pagination: PaginationMeta

    model_config = ConfigDict(from_attributes=True)


class DataResponse(BaseModel, Generic[T]):
    """Generic single-item data response wrapper."""

    success: bool = True
    data: T
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DeleteResponse(BaseModel):
    """Standard response for delete operations."""

    success: bool = True
    message: str = "Item deleted successfully"
    deleted_id: Optional[int] = None


class BulkOperationResponse(BaseModel):
    """Response for bulk operations."""

    success: bool = True
    processed: int = 0
    failed: int = 0
    errors: Optional[List[str]] = None

"""
Case schemas - Pydantic models for case API operations.

Single source of truth for case-related request and response types.
"""

from typing import Any, Dict, List, Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.models.case import CaseType, CaseStatus


# ===== VALIDATION CONSTANTS =====
VALID_CASE_TYPES = ["employment", "housing", "consumer", "family", "debt", "other"]
VALID_CASE_STATUSES = ["active", "closed", "pending"]
VALID_FACT_CATEGORIES = [
    "timeline",
    "evidence",
    "witness",
    "location",
    "communication",
    "other",
]
VALID_IMPORTANCE_LEVELS = ["low", "medium", "high", "critical"]


# ===== BASE SCHEMAS (Repository Pattern) =====


class CaseBase(BaseModel):
    """Base case schema for ORM operations."""
    title: str
    description: Optional[str] = None
    case_type: CaseType
    status: CaseStatus = CaseStatus.ACTIVE
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    judge: Optional[str] = None
    opposing_party: Optional[str] = None
    opposing_counsel: Optional[str] = None
    next_hearing_date: Optional[date] = None
    filing_deadline: Optional[date] = None


class CaseInDBBase(CaseBase):
    """Case schema with ID for database responses."""
    id: int
    user_id: str

    model_config = ConfigDict(from_attributes=True)


class Case(CaseInDBBase):
    """Full case response schema."""
    pass


class CaseInDB(CaseInDBBase):
    """Case as stored in database."""
    pass


# ===== LEGACY API SCHEMAS (camelCase for frontend) =====


def _strip_optional(value: Optional[str]) -> Optional[str]:
    return value.strip() if value else None


def _strip_required(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("Title cannot be empty")
    return stripped


def _validate_optional_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Invalid date format (use YYYY-MM-DD)") from exc
    return value


class CaseCreateRequest(BaseModel):
    """Request model for creating a new case (legacy format)."""

    title: str = Field(..., min_length=1, max_length=200, description="Case title")
    description: Optional[str] = Field(
        None, max_length=10000, description="Case description"
    )
    caseType: str = Field(..., description="Type of legal case")
    status: str = Field(default="active", description="Case status")
    caseNumber: Optional[str] = Field(
        None, max_length=50, description="Court case number"
    )
    courtName: Optional[str] = Field(None, max_length=200, description="Court name")
    judge: Optional[str] = Field(None, max_length=100, description="Judge name")
    opposingParty: Optional[str] = Field(
        None, max_length=200, description="Opposing party name"
    )
    opposingCounsel: Optional[str] = Field(
        None,
        max_length=200,
        description="Opposing counsel name",
    )
    nextHearingDate: Optional[str] = Field(
        None, description="Next hearing date (YYYY-MM-DD)"
    )
    filingDeadline: Optional[str] = Field(
        None, description="Filing deadline (YYYY-MM-DD)"
    )
    aiMetadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata describing AI-assisted extraction context",
    )

    @model_validator(mode="after")
    def normalize_fields(self) -> "CaseCreateRequest":
        """Normalize whitespace-sensitive fields and enforce legacy constraints."""
        if self.caseType not in VALID_CASE_TYPES:
            raise ValueError(
                f"Please select a valid case type: {', '.join(VALID_CASE_TYPES)}"
            )
        if self.status not in VALID_CASE_STATUSES:
            raise ValueError(
                f"Please select a valid status: {', '.join(VALID_CASE_STATUSES)}"
            )
        self.title = _strip_required(self.title)
        self.description = _strip_optional(self.description)
        self.courtName = _strip_optional(self.courtName)
        self.judge = _strip_optional(self.judge)
        self.opposingParty = _strip_optional(self.opposingParty)
        self.opposingCounsel = _strip_optional(self.opposingCounsel)
        self.nextHearingDate = _validate_optional_date(self.nextHearingDate)
        self.filingDeadline = _validate_optional_date(self.filingDeadline)
        return self


class CaseUpdateRequest(BaseModel):
    """Request model for updating an existing case (legacy format)."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)
    caseType: Optional[str] = None
    status: Optional[str] = None
    caseNumber: Optional[str] = Field(None, max_length=50)
    courtName: Optional[str] = Field(None, max_length=200)
    judge: Optional[str] = Field(None, max_length=100)
    opposingParty: Optional[str] = Field(None, max_length=200)
    opposingCounsel: Optional[str] = Field(None, max_length=200)
    nextHearingDate: Optional[str] = None
    filingDeadline: Optional[str] = None

    @model_validator(mode="after")
    def normalize_fields(self) -> "CaseUpdateRequest":
        """Apply optional validation rules and consistent trimming."""
        if self.caseType and self.caseType not in VALID_CASE_TYPES:
            raise ValueError(
                f"Please select a valid case type: {', '.join(VALID_CASE_TYPES)}"
            )
        if self.status and self.status not in VALID_CASE_STATUSES:
            raise ValueError(
                f"Please select a valid status: {', '.join(VALID_CASE_STATUSES)}"
            )
        self.title = _strip_optional(self.title)
        self.description = _strip_optional(self.description)
        self.courtName = _strip_optional(self.courtName)
        self.judge = _strip_optional(self.judge)
        self.opposingParty = _strip_optional(self.opposingParty)
        self.opposingCounsel = _strip_optional(self.opposingCounsel)
        self.nextHearingDate = _validate_optional_date(self.nextHearingDate)
        self.filingDeadline = _validate_optional_date(self.filingDeadline)
        return self


class CaseFactCreateRequest(BaseModel):
    """Request model for creating a case fact."""

    caseId: int = Field(..., gt=0, description="Case ID")
    factContent: str = Field(
        ..., min_length=1, max_length=10000, description="Fact content"
    )
    factCategory: str = Field(..., description="Fact category")
    importance: str = Field(default="medium", description="Importance level")

    @model_validator(mode="after")
    def normalize_fields(self) -> "CaseFactCreateRequest":
        """Normalize and validate fact data prior to persistence."""
        if self.factCategory not in VALID_FACT_CATEGORIES:
            raise ValueError(f"Invalid fact category: {', '.join(VALID_FACT_CATEGORIES)}")
        if self.importance not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(
                f"Invalid importance level: {', '.join(VALID_IMPORTANCE_LEVELS)}"
            )
        self.factContent = self.factContent.strip()
        if not self.factContent:
            raise ValueError("Fact content cannot be empty")
        return self


class BulkDeleteRequest(BaseModel):
    """Request model for bulk delete operation."""

    case_ids: List[int] = Field(
        ..., min_length=1, description="List of case IDs to delete"
    )
    fail_fast: bool = Field(
        default=True, description="Stop on first error and rollback"
    )


class BulkArchiveRequest(BaseModel):
    """Request model for bulk archive operation."""

    case_ids: List[int] = Field(
        ..., min_length=1, description="List of case IDs to archive"
    )
    fail_fast: bool = Field(
        default=True, description="Stop on first error and rollback"
    )


class BulkUpdateRequest(BaseModel):
    """Request model for bulk update operation.
    
    Note: CaseUpdate type is imported from bulk_operation_service in routes.
    """

    updates: List[Any] = Field(
        ..., min_length=1, description="List of case updates"
    )
    fail_fast: bool = Field(
        default=True, description="Stop on first error and rollback"
    )


# ===== RESPONSE SCHEMAS =====


class LegacyCaseResponse(BaseModel):
    """Response model for case data (legacy format with camelCase)."""

    id: int
    title: str
    description: Optional[str]
    caseType: str
    status: str
    userId: int
    caseNumber: Optional[str] = None
    courtName: Optional[str] = None
    judge: Optional[str] = None
    opposingParty: Optional[str] = None
    opposingCounsel: Optional[str] = None
    nextHearingDate: Optional[str] = None
    filingDeadline: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseFactResponse(BaseModel):
    """Response model for case fact data."""

    id: int
    caseId: int
    factContent: str
    factCategory: str
    importance: str
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseDeleteResponse(BaseModel):
    """Response model for case deletion."""

    deleted: bool
    id: int


class CasePaginationMetadata(BaseModel):
    """Pagination metadata for case list responses."""

    total: int
    page: int
    page_size: int
    total_pages: int


class CaseListResponse(BaseModel):
    """Response model for case list with pagination."""

    cases: List[LegacyCaseResponse]
    pagination: CasePaginationMetadata


# ===== ALIASES FOR BACKWARDS COMPATIBILITY =====
CreateCaseRequest = CaseCreateRequest
UpdateCaseRequest = CaseUpdateRequest
CreateCaseFactRequest = CaseFactCreateRequest
DeleteCaseResponse = CaseDeleteResponse
PaginationMetadata = CasePaginationMetadata
CaseCreate = CaseBase  # For repository pattern
CaseUpdate = CaseUpdateRequest

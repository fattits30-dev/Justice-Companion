"""
Evidence schemas - Pydantic models for evidence API operations.

Single source of truth for evidence-related request and response types.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ===== CONSTANTS =====
VALID_EVIDENCE_TYPES = ["document", "photo", "email", "recording", "note", "witness"]
SUPPORTED_DOCUMENT_FORMATS = [".pdf", ".docx", ".txt"]


# ===== REQUEST SCHEMAS =====


class EvidenceCreate(BaseModel):
    """Request model for creating/uploading evidence."""

    caseId: int = Field(..., gt=0, description="Case ID this evidence belongs to")
    evidenceType: str = Field(..., description="Type of evidence")
    title: str = Field(..., min_length=1, max_length=500, description="Evidence title")
    description: Optional[str] = Field(
        None, max_length=10000, description="Evidence description (deprecated, use content)"
    )
    filePath: Optional[str] = Field(
        None, max_length=1000, description="File path for file-based evidence"
    )
    content: Optional[str] = Field(None, description="Text content for note-based evidence")
    obtainedDate: Optional[str] = Field(None, description="Date evidence was obtained (YYYY-MM-DD)")

    @field_validator("evidenceType")
    @classmethod
    def validate_evidence_type(cls, v: str) -> str:
        if v not in VALID_EVIDENCE_TYPES:
            raise ValueError(
                f"Invalid evidence type. Must be one of: {', '.join(VALID_EVIDENCE_TYPES)}"
            )
        return v

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        return v.strip()

    @field_validator("obtainedDate")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError("Invalid date format (use YYYY-MM-DD)")
        return v


class EvidenceUpdate(BaseModel):
    """Request model for updating evidence metadata."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    evidenceType: Optional[str] = None
    obtainedDate: Optional[str] = None

    @field_validator("evidenceType")
    @classmethod
    def validate_evidence_type(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_EVIDENCE_TYPES:
            raise ValueError(
                f"Invalid evidence type. Must be one of: {', '.join(VALID_EVIDENCE_TYPES)}"
            )
        return v

    @field_validator("title", "description")
    @classmethod
    def strip_strings(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else None

    @field_validator("obtainedDate")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError("Invalid date format (use YYYY-MM-DD)")
        return v


# ===== RESPONSE SCHEMAS =====


class EvidenceResponse(BaseModel):
    """Response model for evidence data."""

    id: int
    caseId: int
    evidenceType: str
    title: str
    filePath: Optional[str] = None
    content: Optional[str] = None
    obtainedDate: Optional[str] = None
    uploadedAt: str  # Alias for createdAt (from TypeScript)
    createdAt: str
    updatedAt: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ParsedDocumentResponse(BaseModel):
    """Response model for parsed document data."""

    text: str = Field(..., description="Extracted plain text content")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="Document type (pdf, docx, txt)")
    page_count: Optional[int] = Field(None, description="Number of pages (PDF only)")
    word_count: int = Field(..., description="Total word count")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Document metadata")


class CitationResponse(BaseModel):
    """Response model for extracted citation."""

    text: str = Field(..., description="Citation text")
    type: str = Field(..., description="Citation type (FullCaseCitation, FullLawCitation, etc.)")
    span: List[int] = Field(..., description="[start, end] position in text")
    metadata: Dict[str, Any] = Field(..., description="Structured citation metadata")
    court_listener_link: Optional[str] = Field(
        None, description="CourtListener search link (case citations only)"
    )


class CitationListResponse(BaseModel):
    """Response model for citation list with summary."""

    citations: List[CitationResponse]
    summary: Dict[str, Any] = Field(..., description="Citation statistics")


class EvidenceDeleteResponse(BaseModel):
    """Response model for evidence deletion."""

    success: bool


class FileUploadResponse(BaseModel):
    """Response model for file upload with parsing."""

    evidence: EvidenceResponse
    parsed_document: Optional[ParsedDocumentResponse] = None
    citations: Optional[List[CitationResponse]] = None


# ===== ALIASES FOR BACKWARDS COMPATIBILITY =====
CreateEvidenceRequest = EvidenceCreate
UpdateEvidenceRequest = EvidenceUpdate
DeleteEvidenceResponse = EvidenceDeleteResponse

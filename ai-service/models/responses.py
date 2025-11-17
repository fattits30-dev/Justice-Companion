"""
Response Models

Pydantic models for AI agent responses.
All models use Pydantic v2 with strict validation.

Author: Justice Companion Team
License: MIT
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class CaseType(str, Enum):
    """Valid case types for UK civil legal matters"""

    EMPLOYMENT = "employment"
    HOUSING = "housing"
    CONSUMER = "consumer"
    FAMILY = "family"
    OTHER = "other"


class ExtractionSource(BaseModel):
    """
    Source information for an extracted field.

    Fields:
        source: Location in document where data was found
        text: Exact text from document
    """

    source: str = Field(..., description="Location in document")
    text: str = Field(..., description="Exact text from document")


class ExtractedFields(BaseModel):
    """
    Extraction sources for all case data fields.

    Each field contains source information showing where the data came from.
    """

    title: Optional[ExtractionSource] = None
    description: Optional[ExtractionSource] = None
    opposingParty: Optional[ExtractionSource] = None
    caseNumber: Optional[ExtractionSource] = None
    courtName: Optional[ExtractionSource] = None
    filingDeadline: Optional[ExtractionSource] = None
    nextHearingDate: Optional[ExtractionSource] = None


class ConfidenceScores(BaseModel):
    """
    Confidence scores for extracted fields (0.0 = no confidence, 1.0 = full confidence).

    All fields must be between 0.0 and 1.0.
    """

    title: float = Field(..., ge=0.0, le=1.0, description="Confidence in case title")
    caseType: float = Field(..., ge=0.0, le=1.0, description="Confidence in case type")
    description: float = Field(..., ge=0.0, le=1.0, description="Confidence in description")
    opposingParty: float = Field(..., ge=0.0, le=1.0, description="Confidence in opposing party")
    caseNumber: float = Field(..., ge=0.0, le=1.0, description="Confidence in case number")
    courtName: float = Field(..., ge=0.0, le=1.0, description="Confidence in court name")
    filingDeadline: float = Field(..., ge=0.0, le=1.0, description="Confidence in filing deadline")
    nextHearingDate: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence in next hearing date"
    )


class SuggestedCaseData(BaseModel):
    """
    Suggested case data extracted from document.

    This structured data can be used to pre-populate a case creation form.
    """

    # Ownership verification
    documentOwnershipMismatch: bool = Field(
        ..., description="True if document belongs to someone other than the user"
    )
    documentClaimantName: Optional[str] = Field(
        None, description="Claimant name from document (if different from user)"
    )

    # Core case information
    title: str = Field(..., min_length=1, description="Brief descriptive case title")
    caseType: CaseType = Field(..., description="Category of legal case")
    description: str = Field(..., min_length=1, description="2-3 sentence summary")
    claimantName: str = Field(..., min_length=1, description="User's name (always set by backend)")

    # Optional case details
    opposingParty: Optional[str] = Field(None, description="Full legal name of opposing party")
    caseNumber: Optional[str] = Field(None, description="Court/tribunal case reference")
    courtName: Optional[str] = Field(None, description="Court or tribunal name")
    filingDeadline: Optional[str] = Field(None, description="Filing deadline in YYYY-MM-DD format")
    nextHearingDate: Optional[str] = Field(
        None, description="Next hearing date in YYYY-MM-DD format"
    )

    # Metadata
    confidence: ConfidenceScores = Field(..., description="Confidence scores for all fields")
    extractedFrom: ExtractedFields = Field(
        ..., description="Source information for extracted fields"
    )

    @field_validator("filingDeadline", "nextHearingDate")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate date is in YYYY-MM-DD format"""
        if v is None:
            return v

        # Check format YYYY-MM-DD
        if len(v) != 10 or v[4] != "-" or v[7] != "-":
            raise ValueError("Date must be in YYYY-MM-DD format")

        # Check components are digits
        year, month, day = v.split("-")
        if not (year.isdigit() and month.isdigit() and day.isdigit()):
            raise ValueError("Date components must be numeric")

        # Basic range validation
        year_int, month_int, day_int = int(year), int(month), int(day)
        if not (1900 <= year_int <= 2100):
            raise ValueError("Year must be between 1900 and 2100")
        if not (1 <= month_int <= 12):
            raise ValueError("Month must be between 1 and 12")
        if not (1 <= day_int <= 31):
            raise ValueError("Day must be between 1 and 31")

        return v


class DocumentAnalysisResponse(BaseModel):
    """
    Response from document analysis.

    Contains conversational analysis and structured case data.
    """

    analysis: str = Field(..., min_length=1, description="Conversational analysis for user")
    suggestedCaseData: SuggestedCaseData = Field(..., description="Structured case data")

    # Optional metadata (tokens, latency, etc.)
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Optional metadata (tokens used, latency, etc.)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "analysis": "This is an Employment Tribunal claim form...",
                    "suggestedCaseData": {
                        "documentOwnershipMismatch": False,
                        "documentClaimantName": None,
                        "title": "Employment Tribunal - Unfair Dismissal",
                        "caseType": "employment",
                        "description": "Claim for unfair dismissal against employer",
                        "claimantName": "John Doe",
                        "opposingParty": "ABC Corporation Ltd",
                        "caseNumber": "ET/123456/2024",
                        "courtName": "London Central Employment Tribunal",
                        "filingDeadline": "2024-12-31",
                        "nextHearingDate": "2025-02-15",
                        "confidence": {
                            "title": 0.95,
                            "caseType": 0.98,
                            "description": 0.90,
                            "opposingParty": 0.95,
                            "caseNumber": 1.0,
                            "courtName": 0.98,
                            "filingDeadline": 0.85,
                            "nextHearingDate": 0.80,
                        },
                        "extractedFrom": {
                            "title": {
                                "source": "Section 1: Claim Details",
                                "text": "Unfair Dismissal Claim",
                            },
                            "caseNumber": {"source": "Header", "text": "Case No: ET/123456/2024"},
                        },
                    },
                    "metadata": {"tokensUsed": 1250, "latencyMs": 2341, "promptVersion": "v1"},
                }
            ]
        }
    }

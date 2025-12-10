"""Typed models and enums for the unified AI service."""

from __future__ import annotations

from enum import Enum
from typing import Any, Callable, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

AIProviderType = Literal[
    "openai",
    "anthropic",
    "huggingface",
    "qwen",
    "google",
    "cohere",
    "together",
    "anyscale",
    "mistral",
    "perplexity",
    "emberton",
    "ollama",
    "groq",
]


class UKJurisdiction(str, Enum):
    """UK Legal Jurisdictions."""

    ENGLAND_WALES = "england_wales"
    SCOTLAND = "scotland"
    NORTHERN_IRELAND = "northern_ireland"


class LegalCaseType(str, Enum):
    """Legal Case Types."""

    EMPLOYMENT = "employment"
    HOUSING = "housing"
    BENEFITS = "benefits"
    CONSUMER = "consumer"
    CIVIL_RIGHTS = "civil_rights"
    SMALL_CLAIMS = "small_claims"
    FAMILY = "family"
    OTHER = "other"


class DocumentType(str, Enum):
    """Document types for AI-assisted drafting."""

    LETTER = "letter"
    WITNESS_STATEMENT = "witness_statement"
    TRIBUNAL_SUBMISSION = "tribunal_submission"
    COURT_FORM = "court_form"
    APPEAL = "appeal"
    GRIEVANCE = "grievance"


class ActionPriority(str, Enum):
    """Priority levels for recommended actions."""

    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueSeverity(str, Enum):
    """Severity levels for legal issues."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvidenceImportance(str, Enum):
    """Importance levels for evidence gaps."""

    CRITICAL = "critical"
    IMPORTANT = "important"
    HELPFUL = "helpful"


class EvidenceStrength(str, Enum):
    """Overall evidence strength assessment."""

    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"


class LegalSourceType(str, Enum):
    """Legal source types."""

    STATUTE = "statute"
    CASE_LAW = "case_law"
    REGULATION = "regulation"
    GUIDANCE = "guidance"


class ChatMessage(BaseModel):
    """Chat message with role and content."""

    role: Literal["system", "user", "assistant"]
    content: str

    model_config = ConfigDict(from_attributes=True)


class AIProviderConfig(BaseModel):
    """AI Provider Configuration."""

    provider: AIProviderType
    api_key: str = Field(
        "",
        min_length=0,
        description="API key for the provider (optional for keyless providers)",
    )
    model: str = Field(..., min_length=1, description="Model identifier")
    endpoint: Optional[str] = Field(None, description="Optional custom endpoint")
    temperature: Optional[float] = Field(
        0.7,
        ge=0.0,
        le=2.0,
        description="Temperature (0.0-2.0)",
    )
    max_tokens: Optional[int] = Field(
        4096,
        ge=1,
        description="Maximum tokens to generate",
    )
    top_p: Optional[float] = Field(
        0.9,
        ge=0.0,
        le=1.0,
        description="Top-p sampling (0.0-1.0)",
    )
    timeout: Optional[float] = Field(
        None,
        ge=1.0,
        description="Request timeout in seconds (None = use operation defaults)",
    )

    model_config = ConfigDict(from_attributes=True)


class StreamingCallbacks(BaseModel):
    """Streaming callbacks (function references, not serializable)."""

    on_token: Optional[Callable[[str], None]] = None
    on_thinking: Optional[Callable[[str], None]] = None
    on_complete: Optional[Callable[[str], None]] = None
    on_error: Optional[Callable[[Exception], None]] = None
    on_function_call: Optional[Callable[[str, Any, Any], None]] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)


class AIProviderMetadata(BaseModel):
    """Provider metadata and capabilities."""

    name: str
    default_endpoint: str
    supports_streaming: bool
    default_model: str
    max_context_tokens: int
    available_models: List[str]

    model_config = ConfigDict(from_attributes=True)


class TimelineEvent(BaseModel):
    """Timeline event for case analysis."""

    date: str
    event: str
    significance: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceSummary(BaseModel):
    """Evidence summary for case analysis."""

    type: str
    description: str
    date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LegalIssue(BaseModel):
    """Legal issue identification."""

    issue: str
    severity: IssueSeverity
    relevant_law: List[str]
    potential_claims: List[str]
    defenses: List[str]

    model_config = ConfigDict(from_attributes=True)


class ApplicableLaw(BaseModel):
    """Applicable law reference."""

    statute: str
    section: str
    summary: str
    application: str
    jurisdiction: UKJurisdiction

    model_config = ConfigDict(from_attributes=True)


class ActionItem(BaseModel):
    """Recommended action item."""

    action: str
    deadline: Optional[str] = None
    priority: ActionPriority
    rationale: str

    model_config = ConfigDict(from_attributes=True)


class EvidenceGap(BaseModel):
    """Evidence gap identification."""

    description: str
    importance: EvidenceImportance
    suggested_sources: List[str]

    model_config = ConfigDict(from_attributes=True)


class ComplexityScore(BaseModel):
    """Case complexity scoring."""

    score: int = Field(..., ge=1, le=10)
    factors: List[str]
    explanation: str

    model_config = ConfigDict(from_attributes=True)


class LegalSource(BaseModel):
    """Legal source reference."""

    type: LegalSourceType
    title: str
    citation: str
    url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseAnalysisRequest(BaseModel):
    """Request for comprehensive case analysis."""

    case_id: str
    case_type: LegalCaseType
    jurisdiction: UKJurisdiction
    description: str
    evidence: List[EvidenceSummary]
    timeline: List[TimelineEvent]
    context: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseAnalysisResponse(BaseModel):
    """Comprehensive case analysis response."""

    legal_issues: List[LegalIssue]
    applicable_law: List[ApplicableLaw]
    recommended_actions: List[ActionItem]
    evidence_gaps: List[EvidenceGap]
    estimated_complexity: ComplexityScore
    reasoning: str
    disclaimer: str
    sources: Optional[List[LegalSource]] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceAnalysisRequest(BaseModel):
    """Request for evidence analysis."""

    case_id: str
    case_type: LegalCaseType
    jurisdiction: UKJurisdiction
    existing_evidence: List[str]
    claims: List[str]
    context: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceAnalysisResponse(BaseModel):
    """Evidence analysis response."""

    gaps: List[EvidenceGap]
    suggestions: List[str]
    strength: EvidenceStrength
    explanation: str
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)


class DocumentContext(BaseModel):
    """Document context for drafting."""

    case_id: str
    case_type: LegalCaseType
    jurisdiction: UKJurisdiction
    facts: str
    objectives: str
    evidence: Optional[List[str]] = None
    recipient: Optional[str] = None
    additional_context: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentMetadata(BaseModel):
    """Document metadata."""

    type: DocumentType
    created_at: str
    word_count: Optional[int] = None
    model_used: str
    case_id: str

    model_config = ConfigDict(from_attributes=True)


class DocumentDraftRequest(BaseModel):
    """Request for document drafting."""

    document_type: DocumentType
    context: DocumentContext

    model_config = ConfigDict(from_attributes=True)


class DocumentDraftResponse(BaseModel):
    """Document draft response."""

    content: str
    metadata: DocumentMetadata
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""

    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class ExtractionSource(BaseModel):
    """Field extraction source metadata."""

    source: str
    text: str

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class FieldConfidence(BaseModel):
    """Confidence scores for extracted fields."""

    title: float = Field(..., ge=0.0, le=1.0)
    case_type: float = Field(..., ge=0.0, le=1.0)
    description: float = Field(..., ge=0.0, le=1.0)
    opposing_party: float = Field(..., ge=0.0, le=1.0)
    case_number: float = Field(..., ge=0.0, le=1.0)
    court_name: float = Field(..., ge=0.0, le=1.0)
    filing_deadline: float = Field(..., ge=0.0, le=1.0)
    next_hearing_date: float = Field(..., ge=0.0, le=1.0)

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SuggestedCaseData(BaseModel):
    """Suggested case data extracted from document."""

    document_ownership_mismatch: Optional[bool] = False
    document_claimant_name: Optional[str] = None
    title: str
    case_type: Literal["employment", "housing", "consumer", "family", "other"]
    description: str
    claimant_name: Optional[str] = None
    opposing_party: Optional[str] = None
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    filing_deadline: Optional[str] = None
    next_hearing_date: Optional[str] = None
    confidence: FieldConfidence
    extracted_from: Dict[str, Optional[ExtractionSource]]

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class DocumentExtractionResponse(BaseModel):
    """Document extraction response."""

    analysis: str
    suggested_case_data: SuggestedCaseData

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ParsedDocument(BaseModel):
    """Parsed document metadata."""

    filename: str
    text: str
    word_count: int
    file_type: str

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """User profile for document extraction."""

    name: str
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


__all__ = [
    "AIProviderConfig",
    "AIProviderMetadata",
    "AIProviderType",
    "ActionItem",
    "ActionPriority",
    "ApplicableLaw",
    "CaseAnalysisRequest",
    "CaseAnalysisResponse",
    "ChatMessage",
    "ComplexityScore",
    "DocumentContext",
    "DocumentDraftRequest",
    "DocumentDraftResponse",
    "DocumentExtractionResponse",
    "DocumentMetadata",
    "DocumentType",
    "EvidenceAnalysisRequest",
    "EvidenceAnalysisResponse",
    "EvidenceGap",
    "EvidenceImportance",
    "EvidenceStrength",
    "EvidenceSummary",
    "ExtractionSource",
    "FieldConfidence",
    "LegalCaseType",
    "LegalIssue",
    "LegalSource",
    "LegalSourceType",
    "ParsedDocument",
    "StreamingCallbacks",
    "SuggestedCaseData",
    "TimelineEvent",
    "UKJurisdiction",
    "UserProfile",
    "to_camel",
]

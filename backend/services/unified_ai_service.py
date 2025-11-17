"""
Unified AI Service - Multi-Provider AI Integration

Supports 10 AI providers with unified interface:
- OpenAI, Anthropic, Qwen, Hugging Face, Google, Cohere, Together, Anyscale, Mistral, Perplexity

Features:
- Streaming responses with token-by-token delivery
- Provider auto-detection and configuration
- OpenAI-compatible API for most providers
- Secure API key management
- Async operations for all AI calls
- Comprehensive type hints (Python 3.12+)
- Pydantic models for input validation
- Audit logging support

Security:
- API keys never logged or exposed
- All operations audited
- HTTPException for error handling
- Input validation with Pydantic
"""

from typing import Optional, List, Dict, Any, AsyncIterator, Literal, Callable
from enum import Enum
from datetime import datetime
import json
import re
from pydantic import BaseModel, Field, ConfigDict

from fastapi import HTTPException

# Type aliases for provider types
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
]


# ============================================================================
# ENUMS
# ============================================================================


class UKJurisdiction(str, Enum):
    """UK Legal Jurisdictions"""

    ENGLAND_WALES = "england_wales"
    SCOTLAND = "scotland"
    NORTHERN_IRELAND = "northern_ireland"


class LegalCaseType(str, Enum):
    """Legal Case Types"""

    EMPLOYMENT = "employment"
    HOUSING = "housing"
    BENEFITS = "benefits"
    CONSUMER = "consumer"
    CIVIL_RIGHTS = "civil_rights"
    SMALL_CLAIMS = "small_claims"
    FAMILY = "family"
    OTHER = "other"


class DocumentType(str, Enum):
    """Document types for AI-assisted drafting"""

    LETTER = "letter"
    WITNESS_STATEMENT = "witness_statement"
    TRIBUNAL_SUBMISSION = "tribunal_submission"
    COURT_FORM = "court_form"
    APPEAL = "appeal"
    GRIEVANCE = "grievance"


class ActionPriority(str, Enum):
    """Priority levels for recommended actions"""

    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueSeverity(str, Enum):
    """Severity levels for legal issues"""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvidenceImportance(str, Enum):
    """Importance levels for evidence gaps"""

    CRITICAL = "critical"
    IMPORTANT = "important"
    HELPFUL = "helpful"


class EvidenceStrength(str, Enum):
    """Overall evidence strength assessment"""

    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"


class LegalSourceType(str, Enum):
    """Legal source types"""

    STATUTE = "statute"
    CASE_LAW = "case_law"
    REGULATION = "regulation"
    GUIDANCE = "guidance"


# ============================================================================
# PYDANTIC MODELS
# ============================================================================


class ChatMessage(BaseModel):
    """Chat message with role and content"""

    role: Literal["system", "user", "assistant"]
    content: str

    model_config = ConfigDict(from_attributes=True)


class AIProviderConfig(BaseModel):
    """AI Provider Configuration"""

    provider: AIProviderType
    api_key: str = Field(..., min_length=1, description="API key for the provider")
    model: str = Field(..., min_length=1, description="Model identifier")
    endpoint: Optional[str] = Field(None, description="Optional custom endpoint")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Temperature (0.0-2.0)")
    max_tokens: Optional[int] = Field(4096, ge=1, description="Maximum tokens to generate")
    top_p: Optional[float] = Field(0.9, ge=0.0, le=1.0, description="Top-p sampling (0.0-1.0)")

    model_config = ConfigDict(from_attributes=True)


class StreamingCallbacks(BaseModel):
    """Streaming callbacks (function references, not serializable)"""

    on_token: Optional[Callable[[str], None]] = None
    on_thinking: Optional[Callable[[str], None]] = None
    on_complete: Optional[Callable[[str], None]] = None
    on_error: Optional[Callable[[Exception], None]] = None
    on_function_call: Optional[Callable[[str, Any, Any], None]] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)


class AIProviderMetadata(BaseModel):
    """Provider metadata and capabilities"""

    name: str
    default_endpoint: str
    supports_streaming: bool
    default_model: str
    max_context_tokens: int
    available_models: List[str]

    model_config = ConfigDict(from_attributes=True)


class TimelineEvent(BaseModel):
    """Timeline event for case analysis"""

    date: str
    event: str
    significance: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceSummary(BaseModel):
    """Evidence summary for case analysis"""

    type: str
    description: str
    date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LegalIssue(BaseModel):
    """Legal issue identification"""

    issue: str
    severity: IssueSeverity
    relevant_law: List[str]
    potential_claims: List[str]
    defenses: List[str]

    model_config = ConfigDict(from_attributes=True)


class ApplicableLaw(BaseModel):
    """Applicable law reference"""

    statute: str
    section: str
    summary: str
    application: str
    jurisdiction: UKJurisdiction

    model_config = ConfigDict(from_attributes=True)


class ActionItem(BaseModel):
    """Recommended action item"""

    action: str
    deadline: Optional[str] = None
    priority: ActionPriority
    rationale: str

    model_config = ConfigDict(from_attributes=True)


class EvidenceGap(BaseModel):
    """Evidence gap identification"""

    description: str
    importance: EvidenceImportance
    suggested_sources: List[str]

    model_config = ConfigDict(from_attributes=True)


class ComplexityScore(BaseModel):
    """Case complexity scoring"""

    score: int = Field(..., ge=1, le=10)
    factors: List[str]
    explanation: str

    model_config = ConfigDict(from_attributes=True)


class LegalSource(BaseModel):
    """Legal source reference"""

    type: LegalSourceType
    title: str
    citation: str
    url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseAnalysisRequest(BaseModel):
    """Request for comprehensive case analysis"""

    case_id: str
    case_type: LegalCaseType
    jurisdiction: UKJurisdiction
    description: str
    evidence: List[EvidenceSummary]
    timeline: List[TimelineEvent]
    context: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseAnalysisResponse(BaseModel):
    """Comprehensive case analysis response"""

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
    """Request for evidence analysis"""

    case_id: str
    case_type: LegalCaseType
    jurisdiction: UKJurisdiction
    existing_evidence: List[str]
    claims: List[str]
    context: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceAnalysisResponse(BaseModel):
    """Evidence analysis response"""

    gaps: List[EvidenceGap]
    suggestions: List[str]
    strength: EvidenceStrength
    explanation: str
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)


class DocumentContext(BaseModel):
    """Document context for drafting"""

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
    """Document metadata"""

    type: DocumentType
    created_at: str
    word_count: Optional[int] = None
    model_used: str
    case_id: str

    model_config = ConfigDict(from_attributes=True)


class DocumentDraftRequest(BaseModel):
    """Request for document drafting"""

    document_type: DocumentType
    context: DocumentContext

    model_config = ConfigDict(from_attributes=True)


class DocumentDraftResponse(BaseModel):
    """Document draft response"""

    content: str
    metadata: DocumentMetadata
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)


class ExtractionSource(BaseModel):
    """Field extraction source metadata"""

    source: str
    text: str

    model_config = ConfigDict(from_attributes=True)


class FieldConfidence(BaseModel):
    """Confidence scores for extracted fields"""

    title: float = Field(..., ge=0.0, le=1.0)
    case_type: float = Field(..., ge=0.0, le=1.0)
    description: float = Field(..., ge=0.0, le=1.0)
    opposing_party: float = Field(..., ge=0.0, le=1.0)
    case_number: float = Field(..., ge=0.0, le=1.0)
    court_name: float = Field(..., ge=0.0, le=1.0)
    filing_deadline: float = Field(..., ge=0.0, le=1.0)
    next_hearing_date: float = Field(..., ge=0.0, le=1.0)

    model_config = ConfigDict(from_attributes=True)


class SuggestedCaseData(BaseModel):
    """Suggested case data extracted from document"""

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

    model_config = ConfigDict(from_attributes=True)


class DocumentExtractionResponse(BaseModel):
    """Document extraction response"""

    analysis: str
    suggested_case_data: SuggestedCaseData

    model_config = ConfigDict(from_attributes=True)


class ParsedDocument(BaseModel):
    """Parsed document metadata"""

    filename: str
    text: str
    word_count: int
    file_type: str

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """User profile for document extraction"""

    name: str
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PROVIDER METADATA
# ============================================================================

AI_PROVIDER_METADATA: Dict[str, AIProviderMetadata] = {
    "openai": AIProviderMetadata(
        name="OpenAI",
        default_endpoint="https://api.openai.com/v1",
        supports_streaming=True,
        default_model="gpt-4-turbo",
        max_context_tokens=128000,
        available_models=[
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
        ],
    ),
    "anthropic": AIProviderMetadata(
        name="Anthropic",
        default_endpoint="https://api.anthropic.com/v1",
        supports_streaming=True,
        default_model="claude-3-5-sonnet-20241022",
        max_context_tokens=200000,
        available_models=[
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
        ],
    ),
    "huggingface": AIProviderMetadata(
        name="Hugging Face",
        default_endpoint="https://api-inference.huggingface.co",
        supports_streaming=True,
        default_model="meta-llama/Meta-Llama-3.1-70B-Instruct",
        max_context_tokens=128000,
        available_models=["meta-llama/Meta-Llama-3.1-70B-Instruct", "Qwen/Qwen2.5-72B-Instruct"],
    ),
    "qwen": AIProviderMetadata(
        name="Qwen 2.5-72B",
        default_endpoint="https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1",
        supports_streaming=True,
        default_model="Qwen/Qwen2.5-72B-Instruct",
        max_context_tokens=32768,
        available_models=["Qwen/Qwen2.5-72B-Instruct"],
    ),
    "google": AIProviderMetadata(
        name="Google AI",
        default_endpoint="https://generativelanguage.googleapis.com/v1",
        supports_streaming=True,
        default_model="gemini-2.0-flash-exp",
        max_context_tokens=1000000,
        available_models=["gemini-2.0-flash-exp", "gemini-1.5-pro"],
    ),
    "cohere": AIProviderMetadata(
        name="Cohere",
        default_endpoint="https://api.cohere.com/v1",
        supports_streaming=True,
        default_model="command-r-plus",
        max_context_tokens=128000,
        available_models=["command-r-plus", "command-r"],
    ),
    "together": AIProviderMetadata(
        name="Together AI",
        default_endpoint="https://api.together.xyz/v1",
        supports_streaming=True,
        default_model="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        max_context_tokens=32768,
        available_models=["meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"],
    ),
    "anyscale": AIProviderMetadata(
        name="Anyscale",
        default_endpoint="https://api.endpoints.anyscale.com/v1",
        supports_streaming=True,
        default_model="meta-llama/Meta-Llama-3.1-70B-Instruct",
        max_context_tokens=32768,
        available_models=["meta-llama/Meta-Llama-3.1-70B-Instruct"],
    ),
    "mistral": AIProviderMetadata(
        name="Mistral AI",
        default_endpoint="https://api.mistral.ai/v1",
        supports_streaming=True,
        default_model="mistral-large-latest",
        max_context_tokens=128000,
        available_models=["mistral-large-latest", "mistral-medium-latest"],
    ),
    "perplexity": AIProviderMetadata(
        name="Perplexity",
        default_endpoint="https://api.perplexity.ai",
        supports_streaming=True,
        default_model="llama-3.1-sonar-large-128k-online",
        max_context_tokens=128000,
        available_models=["llama-3.1-sonar-large-128k-online"],
    ),
}


# ============================================================================
# UNIFIED AI SERVICE
# ============================================================================


class UnifiedAIService:
    """
    Multi-provider AI service with unified interface.

    Supports 10 AI providers with automatic client initialization,
    streaming responses, and comprehensive error handling.

    Example:
        config = AIProviderConfig(
            provider="openai",
            api_key="sk-...",
            model="gpt-4-turbo"
        )
        service = UnifiedAIService(config, audit_logger=logger)

        # Streaming chat
        async for token in service.stream_chat(messages):
            print(token, end="", flush=True)

        # Non-streaming chat
        response = await service.chat(messages)
        print(response)
    """

    def __init__(self, config: AIProviderConfig, audit_logger=None):
        """
        Initialize unified AI service.

        Args:
            config: AI provider configuration
            audit_logger: Optional audit logger instance
        """
        self.config = config
        self.audit_logger = audit_logger
        self.client: Any = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """
        Initialize the appropriate API client based on provider.

        Raises:
            HTTPException: If provider is unsupported or initialization fails
        """
        provider = self.config.provider
        api_key = self.config.api_key
        metadata = AI_PROVIDER_METADATA.get(provider)

        if not metadata:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

        base_url = self.config.endpoint or metadata.default_endpoint

        try:
            if provider == "anthropic":
                # Anthropic SDK (requires: pip install anthropic)
                try:
                    import anthropic

                    self.client = anthropic.Anthropic(api_key=api_key, base_url=base_url)
                except ImportError:
                    raise HTTPException(
                        status_code=500,
                        detail="Anthropic SDK not installed. Run: pip install anthropic",
                    )

            elif provider in [
                "openai",
                "together",
                "anyscale",
                "mistral",
                "perplexity",
                "huggingface",
                "google",
                "cohere",
            ]:
                # OpenAI-compatible API (requires: pip install openai)
                try:
                    import openai

                    self.client = openai.OpenAI(api_key=api_key, base_url=base_url)
                except ImportError:
                    raise HTTPException(
                        status_code=500, detail="OpenAI SDK not installed. Run: pip install openai"
                    )

            elif provider == "qwen":
                # Hugging Face Inference API (requires: pip install huggingface-hub)
                try:
                    from huggingface_hub import InferenceClient

                    self.client = InferenceClient(token=api_key)
                except ImportError:
                    raise HTTPException(
                        status_code=500,
                        detail="Hugging Face SDK not installed. Run: pip install huggingface-hub",
                    )

            else:
                raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(
                    f"AI client initialization failed for {provider}", error=str(e)
                )
            raise HTTPException(
                status_code=500, detail=f"Failed to initialize {provider} client: {str(e)}"
            )

    def update_config(self, config: AIProviderConfig) -> None:
        """
        Update service configuration and reinitialize client.

        Args:
            config: New AI provider configuration
        """
        self.config = config
        self._initialize_client()

    def is_configured(self) -> bool:
        """
        Check if service is properly configured.

        Returns:
            True if client is initialized and API key is set
        """
        return self.client is not None and len(self.config.api_key) > 0

    def get_provider(self) -> str:
        """Get current provider type."""
        return self.config.provider

    def get_model(self) -> str:
        """Get current model name."""
        return self.config.model

    def get_provider_capabilities(self) -> Dict[str, Any]:
        """
        Get provider capabilities and metadata.

        Returns:
            Dictionary with provider capabilities
        """
        metadata = AI_PROVIDER_METADATA[self.config.provider]
        return {
            "name": metadata.name,
            "supports_streaming": metadata.supports_streaming,
            "max_context_tokens": metadata.max_context_tokens,
            "current_model": self.config.model,
            "endpoint": self.config.endpoint or metadata.default_endpoint,
        }

    async def stream_chat(
        self,
        messages: List[ChatMessage],
        on_token: Optional[Callable[[str], None]] = None,
        on_complete: Optional[Callable[[str], None]] = None,
        on_error: Optional[Callable[[Exception], None]] = None,
    ) -> AsyncIterator[str]:
        """
        Stream chat completion with token-by-token delivery.

        Args:
            messages: Chat history (system, user, assistant messages)
            on_token: Optional callback for each token
            on_complete: Optional callback when complete
            on_error: Optional callback for errors

        Yields:
            Token strings as they arrive

        Raises:
            HTTPException: If client not configured or streaming fails
        """
        if not self.client:
            error = HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )
            if on_error:
                on_error(error)
            raise error

        try:
            full_response = ""

            # Route to appropriate streaming method
            if self.config.provider == "anthropic":
                async for token in self._stream_anthropic_chat(messages):
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            elif self.config.provider == "qwen":
                async for token in self._stream_qwen_chat(messages):
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            else:
                # OpenAI-compatible providers
                async for token in self._stream_openai_compatible_chat(messages):
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            if on_complete:
                on_complete(full_response)

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(
                    f"Streaming chat failed for {self.config.provider}", error=str(e)
                )
            if on_error:
                on_error(e)
            raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

    async def _stream_anthropic_chat(self, messages: List[ChatMessage]) -> AsyncIterator[str]:
        """
        Stream chat for Anthropic (Claude).

        Args:
            messages: Chat messages

        Yields:
            Token strings
        """
        # Anthropic requires system message separate
        system_message = ""
        conversation_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                conversation_messages.append({"role": msg.role, "content": msg.content})

        request_params = {
            "model": self.config.model,
            "system": system_message,
            "messages": conversation_messages,
            "max_tokens": self.config.max_tokens or 4096,
            "temperature": self.config.temperature or 0.7,
            "stream": True,
        }

        async with self.client.messages.stream(**request_params) as stream:
            async for event in stream:
                if hasattr(event, "delta") and hasattr(event.delta, "text"):
                    yield event.delta.text

    async def _stream_qwen_chat(self, messages: List[ChatMessage]) -> AsyncIterator[str]:
        """
        Stream chat for Qwen using Hugging Face Inference API.

        Args:
            messages: Chat messages

        Yields:
            Token strings
        """
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        stream = self.client.chat_completion(
            model=self.config.model,
            messages=formatted_messages,
            temperature=self.config.temperature or 0.3,
            max_tokens=self.config.max_tokens or 2048,
            top_p=self.config.top_p or 0.9,
            stream=True,
        )

        for chunk in stream:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    yield delta.content

    async def _stream_openai_compatible_chat(
        self, messages: List[ChatMessage]
    ) -> AsyncIterator[str]:
        """
        Stream chat for OpenAI-compatible providers.

        Args:
            messages: Chat messages

        Yields:
            Token strings
        """
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        request_params = {
            "model": self.config.model,
            "messages": formatted_messages,
            "stream": True,
            "temperature": self.config.temperature or 0.7,
            "max_tokens": self.config.max_tokens or 8192,
            "top_p": self.config.top_p or 0.9,
        }

        stream = self.client.chat.completions.create(**request_params)

        for chunk in stream:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    yield delta.content

    async def chat(self, messages: List[ChatMessage]) -> str:
        """
        Non-streaming chat completion.

        Args:
            messages: Chat messages

        Returns:
            Complete response text

        Raises:
            HTTPException: If client not configured or chat fails
        """
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            if self.config.provider == "anthropic":
                return await self._chat_anthropic_non_streaming(messages)
            elif self.config.provider == "qwen":
                return await self._chat_qwen_non_streaming(messages)
            else:
                return await self._chat_openai_compatible_non_streaming(messages)

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(f"Chat failed for {self.config.provider}", error=str(e))
            raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

    async def _chat_anthropic_non_streaming(self, messages: List[ChatMessage]) -> str:
        """Non-streaming chat for Anthropic."""
        system_message = ""
        conversation_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                conversation_messages.append({"role": msg.role, "content": msg.content})

        response = self.client.messages.create(
            model=self.config.model,
            system=system_message,
            messages=conversation_messages,
            max_tokens=self.config.max_tokens or 4096,
            temperature=self.config.temperature or 0.7,
        )

        result = ""
        for content in response.content:
            if content.type == "text":
                result += content.text

        return result

    async def _chat_qwen_non_streaming(self, messages: List[ChatMessage]) -> str:
        """Non-streaming chat for Qwen."""
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        response = self.client.chat_completion(
            model=self.config.model,
            messages=formatted_messages,
            temperature=self.config.temperature or 0.3,
            max_tokens=self.config.max_tokens or 2048,
            top_p=self.config.top_p or 0.9,
        )

        return response.choices[0].message.content or ""

    async def _chat_openai_compatible_non_streaming(self, messages: List[ChatMessage]) -> str:
        """Non-streaming chat for OpenAI-compatible providers."""
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        completion = self.client.chat.completions.create(
            model=self.config.model,
            messages=formatted_messages,
            temperature=self.config.temperature or 0.7,
            max_tokens=self.config.max_tokens or 2048,
            top_p=self.config.top_p or 0.9,
        )

        return completion.choices[0].message.content or ""

    async def analyze_case(self, request: CaseAnalysisRequest) -> CaseAnalysisResponse:
        """
        Analyze a case and provide structured legal analysis.

        Args:
            request: Case analysis request

        Returns:
            Structured case analysis

        Raises:
            HTTPException: If analysis fails
        """
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            # Build prompt (simplified - should use prompts from analysis-prompts module)
            prompt = f"""Analyze this legal case and provide structured analysis in JSON format.

Case Type: {request.case_type.value}
Jurisdiction: {request.jurisdiction.value}
Description: {request.description}

Evidence: {json.dumps([e.dict() for e in request.evidence], indent=2)}
Timeline: {json.dumps([t.dict() for t in request.timeline], indent=2)}

Provide analysis in this JSON structure:
{{
  "legalIssues": [...],
  "applicableLaw": [...],
  "recommendedActions": [...],
  "evidenceGaps": [...],
  "estimatedComplexity": {{"score": 1-10, "factors": [...], "explanation": "..."}},
  "reasoning": "...",
  "disclaimer": "This is information, not legal advice.",
  "sources": [...]
}}
"""

            messages = [ChatMessage(role="user", content=prompt)]
            response = await self.chat(messages)

            # Extract JSON from response
            json_match = re.search(r"```json\n?(.*?)\n?```", response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r"\{.*\}", response, re.DOTALL)
                json_str = json_match.group(0) if json_match else response

            analysis_data = json.loads(json_str)
            return CaseAnalysisResponse(**analysis_data)

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(
                    f"Case analysis failed", error=str(e), case_id=request.case_id
                )
            raise HTTPException(status_code=500, detail=f"Case analysis failed: {str(e)}")

    async def analyze_evidence(self, request: EvidenceAnalysisRequest) -> EvidenceAnalysisResponse:
        """
        Analyze evidence and identify gaps.

        Args:
            request: Evidence analysis request

        Returns:
            Evidence analysis with gap identification

        Raises:
            HTTPException: If analysis fails
        """
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            prompt = f"""Analyze evidence for this legal case and identify gaps.

Case Type: {request.case_type.value}
Existing Evidence: {json.dumps(request.existing_evidence)}
Claims: {json.dumps(request.claims)}

Provide analysis in JSON format with:
- gaps: evidence gaps with importance and suggestions
- suggestions: additional documentation needed
- strength: overall evidence strength (strong/moderate/weak)
- explanation: detailed reasoning
- disclaimer: legal disclaimer
"""

            messages = [ChatMessage(role="user", content=prompt)]
            response = await self.chat(messages)

            # Extract JSON
            json_match = re.search(r"```json\n?(.*?)\n?```", response, re.DOTALL)
            json_str = json_match.group(1) if json_match else response

            analysis_data = json.loads(json_str)
            return EvidenceAnalysisResponse(**analysis_data)

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(
                    f"Evidence analysis failed", error=str(e), case_id=request.case_id
                )
            raise HTTPException(status_code=500, detail=f"Evidence analysis failed: {str(e)}")

    async def draft_document(self, request: DocumentDraftRequest) -> DocumentDraftResponse:
        """
        Draft a legal document.

        Args:
            request: Document draft request

        Returns:
            Drafted document with metadata

        Raises:
            HTTPException: If drafting fails
        """
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            prompt = f"""Draft a {request.document_type.value} for this legal case.

Case Type: {request.context.case_type.value}
Facts: {request.context.facts}
Objectives: {request.context.objectives}

Provide response in JSON format:
{{
  "content": "Full document text",
  "metadata": {{
    "type": "{request.document_type.value}",
    "createdAt": "{datetime.utcnow().isoformat()}",
    "wordCount": 0,
    "modelUsed": "{self.config.model}",
    "caseId": "{request.context.case_id}"
  }},
  "disclaimer": "This is a draft template, not legal advice."
}}
"""

            messages = [ChatMessage(role="user", content=prompt)]
            response = await self.chat(messages)

            # Extract JSON
            json_match = re.search(r"```json\n?(.*?)\n?```", response, re.DOTALL)
            json_str = json_match.group(1) if json_match else response

            draft_data = json.loads(json_str)
            return DocumentDraftResponse(**draft_data)

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(
                    f"Document drafting failed",
                    error=str(e),
                    document_type=request.document_type.value,
                )
            raise HTTPException(status_code=500, detail=f"Document drafting failed: {str(e)}")

    async def extract_case_data_from_document(
        self,
        parsed_doc: ParsedDocument,
        user_profile: UserProfile,
        user_question: Optional[str] = None,
    ) -> DocumentExtractionResponse:
        """
        Extract structured case data from document.

        Args:
            parsed_doc: Parsed document with text
            user_profile: User profile (name, email)
            user_question: Optional user question

        Returns:
            Conversational analysis + structured case data

        Raises:
            HTTPException: If extraction fails
        """
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            extraction_prompt = f"""You are a UK civil legal assistant analyzing a document for {user_profile.name or "someone"} who just uploaded it.

DOCUMENT: {parsed_doc.filename}
FILE TYPE: {parsed_doc.file_type.upper()}
LENGTH: {parsed_doc.word_count} words

CONTENT:
{parsed_doc.text}

{f'USER QUESTION: "{user_question}"' if user_question else ''}

Provide your response in TWO parts:

PART 1 - Conversational Analysis (plain text):
[Your friendly analysis talking directly to the user, ending with actionable suggestions]

PART 2 - Structured Data (JSON format):
```json
{{
  "documentOwnershipMismatch": false,
  "documentClaimantName": null,
  "title": "Brief descriptive case title",
  "caseType": "employment|housing|consumer|family|other",
  "description": "2-3 sentence summary",
  "claimantName": "{user_profile.name or "User"}",
  "opposingParty": "Full legal name if found, otherwise null",
  "caseNumber": "Case reference if found, otherwise null",
  "courtName": "Court/tribunal name if found, otherwise null",
  "filingDeadline": "YYYY-MM-DD if deadline mentioned, otherwise null",
  "nextHearingDate": "YYYY-MM-DD if hearing mentioned, otherwise null",
  "confidence": {{
    "title": 0.0-1.0,
    "caseType": 0.0-1.0,
    "description": 0.0-1.0,
    "opposingParty": 0.0-1.0,
    "caseNumber": 0.0-1.0,
    "courtName": 0.0-1.0,
    "filingDeadline": 0.0-1.0,
    "nextHearingDate": 0.0-1.0
  }},
  "extractedFrom": {{}}
}}
```
"""

            messages = [
                ChatMessage(
                    role="system",
                    content="You are Justice Companion AI, a legal document analysis specialist for UK civil legal matters.",
                ),
                ChatMessage(role="user", content=extraction_prompt),
            ]

            response = await self.chat(messages)

            # Split response
            json_match = re.search(r"```json\n?(.*?)\n?```", response, re.DOTALL)

            if not json_match:
                # Fallback
                return DocumentExtractionResponse(
                    analysis=response,
                    suggested_case_data=SuggestedCaseData(
                        title=f"Case regarding {parsed_doc.filename}",
                        case_type="other",
                        description=f"Document uploaded: {parsed_doc.filename}",
                        claimant_name=user_profile.name or "User",
                        confidence=FieldConfidence(
                            title=0.3,
                            case_type=0.3,
                            description=0.3,
                            opposing_party=0.0,
                            case_number=0.0,
                            court_name=0.0,
                            filing_deadline=0.0,
                            next_hearing_date=0.0,
                        ),
                        extracted_from={},
                    ),
                )

            analysis_text = response[: json_match.start()].strip()
            json_str = json_match.group(1)

            suggested_case_data = SuggestedCaseData(**json.loads(json_str))
            suggested_case_data.claimant_name = user_profile.name or "User"

            return DocumentExtractionResponse(
                analysis=analysis_text or response, suggested_case_data=suggested_case_data
            )

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.log_error(
                    f"Document extraction failed", error=str(e), filename=parsed_doc.filename
                )
            raise HTTPException(status_code=500, detail=f"Document extraction failed: {str(e)}")

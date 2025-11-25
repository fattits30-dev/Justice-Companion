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
import logging
from pydantic import BaseModel, Field, ConfigDict

# Configure logger
logger = logging.getLogger(__name__)

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
        default_endpoint="https://router.huggingface.co/v1",
        supports_streaming=True,
        default_model="meta-llama/Llama-3.3-70B-Instruct",
        max_context_tokens=128000,
        available_models=[
            "meta-llama/Llama-3.3-70B-Instruct",
            "meta-llama/Meta-Llama-3.1-70B-Instruct",
            "meta-llama/Meta-Llama-3.1-8B-Instruct",
            "Qwen/Qwen2.5-72B-Instruct",
            "Qwen/Qwen2.5-Coder-32B-Instruct",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "microsoft/Phi-3.5-mini-instruct",
            "google/gemma-2-27b-it",
        ],
    ),
    "qwen": AIProviderMetadata(
        name="Qwen 2.5-72B",
        default_endpoint="https://router.huggingface.co/v1",
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
                "google",
                "cohere",
            ]:
                # OpenAI-compatible API (requires: pip install openai)
                try:
                    import openai

                    self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
                except ImportError:
                    raise HTTPException(
                        status_code=500, detail="OpenAI SDK not installed. Run: pip install openai"
                    )

            elif provider in ["huggingface", "qwen"]:
                # Hugging Face Inference API (requires: pip install huggingface-hub)
                try:
                    from huggingface_hub import InferenceClient

                    # Use configured endpoint if provided (for HF Pro router access)
                    if self.config.endpoint:
                        self.client = InferenceClient(base_url=self.config.endpoint, token=api_key)
                    else:
                        # Default: use HF's automatic routing
                        self.client = InferenceClient(token=api_key)
                except ImportError:
                    raise HTTPException(
                        status_code=500,
                        detail="Hugging Face SDK not installed. Run: pip install huggingface-hub",
                    )

            else:
                raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.init",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id=str(provider),
                    action="initialize",
                    success=False,
                    error_message=f"AI client initialization failed for {provider}: {str(exc)}"
                )
            raise HTTPException(
                status_code=500, detail=f"Failed to initialize {provider} client: {str(exc)}"
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
        logger.info("[DEBUG] stream_chat called with provider=%s, messages=%s", self.config.provider, len(messages))

        if not self.client:
            error = HTTPException(
                status_code=500, detail="%s client not configured" % self.config.provider
            )
            if on_error:
                on_error(error)
            raise error

        try:
            full_response = ""

            # Route to appropriate streaming method
            if self.config.provider == "anthropic":
                logger.info("[DEBUG] Routing to Anthropic streaming")
                async for token in self._stream_anthropic_chat(messages):
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            elif self.config.provider in ["huggingface", "qwen"]:
                logger.info("[DEBUG] Routing to HuggingFace/Qwen streaming")
                async for token in self._stream_huggingface_chat(messages):
                    logger.info("[DEBUG] Got token from HuggingFace: %s", token)
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            else:
                # OpenAI-compatible providers
                logger.info("[DEBUG] Routing to OpenAI-compatible streaming for provider: %s", self.config.provider)
                async for token in self._stream_openai_compatible_chat(messages):
                    logger.info("[DEBUG] Got token from stream: %s", token)
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            logger.info("[DEBUG] Stream complete, full_response length: %s", len(full_response))
            if on_complete:
                on_complete(full_response)

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.stream_chat",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id=self.config.provider,
                    action="stream",
                    success=False,
                    error_message=f"Streaming chat failed for {self.config.provider}: {str(exc)}"
                )
            if on_error:
                on_error(exc)
            raise HTTPException(status_code=500, detail=f"Streaming failed: {str(exc)}")

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

    async def _stream_huggingface_chat(self, messages: List[ChatMessage]) -> AsyncIterator[str]:
        """
        Stream chat for HuggingFace/Qwen using Hugging Face Inference API.

        Uses the OpenAI-compatible chat.completions.create() API.

        NOTE: InferenceClient returns a SYNCHRONOUS iterator, so we must run it
        in an executor to avoid blocking the async event loop.

        Args:
            messages: Chat messages

        Yields:
            Token strings
        """
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        logger.info(f"[DEBUG] Creating HuggingFace stream with model={self.config.model}, messages={len(formatted_messages)}")

        # HuggingFace InferenceClient uses OpenAI-compatible API
        stream = self.client.chat.completions.create(
            model=self.config.model,
            messages=formatted_messages,
            temperature=self.config.temperature or 0.7,
            max_tokens=self.config.max_tokens or 2048,
            top_p=self.config.top_p or 0.9,
            stream=True,
        )

        logger.info(f"[DEBUG] Stream created successfully")

        # InferenceClient returns SYNCHRONOUS iterator - must run in executor
        # to avoid blocking the async event loop
        def sync_iterate():
            """Synchronous iteration over HuggingFace stream."""
            chunk_count = 0
            for chunk in stream:
                chunk_count += 1
                logger.info(f"[DEBUG] Chunk #{chunk_count}: {chunk}")
                if hasattr(chunk, "choices") and chunk.choices:
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        logger.info(f"[DEBUG] Yielding content: {delta.content}")
                        yield delta.content
                    else:
                        logger.info(f"[DEBUG] Delta has no content: {delta}")
                else:
                    logger.info(f"[DEBUG] Chunk has no choices")
            logger.info(f"[DEBUG] HuggingFace stream complete. Total chunks: {chunk_count}")

        # Run sync iteration in thread pool to avoid blocking event loop
        loop = asyncio.get_running_loop()
        executor = ThreadPoolExecutor(max_workers=1)
        try:
            gen = sync_iterate()
            while True:
                try:
                    # Get next token in executor (non-blocking)
                    token = await loop.run_in_executor(executor, next, gen, None)
                    if token is None:
                        break
                    yield token
                except StopIteration:
                    break
        finally:
            executor.shutdown(wait=False)

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

        logger.info(f"[DEBUG] Creating stream with params: model={self.config.model}, messages={len(formatted_messages)}")
        stream = self.client.chat.completions.create(**request_params)
        logger.info(f"[DEBUG] Stream created, type: {type(stream)}")

        chunk_count = 0
        async for chunk in stream:
            chunk_count += 1
            logger.info(f"[DEBUG] Received chunk #{chunk_count}: {chunk}")
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    logger.info(f"[DEBUG] Yielding content: {delta.content}")
                    yield delta.content
                else:
                    logger.info(f"[DEBUG] Delta has no content: {delta}")
            else:
                logger.info(f"[DEBUG] Chunk has no choices")

        logger.info(f"[DEBUG] Stream complete. Total chunks: {chunk_count}")

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
            elif self.config.provider in ["huggingface", "qwen"]:
                return await self._chat_qwen_non_streaming(messages)
            else:
                return await self._chat_openai_compatible_non_streaming(messages)

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.chat",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id=self.config.provider,
                    action="chat",
                    success=False,
                    error_message=f"Chat failed for {self.config.provider}: {str(exc)}"
                )
            raise HTTPException(status_code=500, detail=f"Chat failed: {str(exc)}")

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
        """
        Non-streaming chat for Qwen/HuggingFace.

        NOTE: InferenceClient.chat_completion() is SYNCHRONOUS, so we must run it
        in an executor to avoid blocking the async event loop.
        """
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        def sync_chat_completion():
            """Synchronous chat completion call."""
            response = self.client.chat_completion(
                model=self.config.model,
                messages=formatted_messages,
                temperature=self.config.temperature or 0.3,
                max_tokens=self.config.max_tokens or 2048,
                top_p=self.config.top_p or 0.9,
            )
            return response.choices[0].message.content or ""

        # Run sync call in thread pool to avoid blocking event loop
        loop = asyncio.get_running_loop()
        executor = ThreadPoolExecutor(max_workers=1)
        try:
            result = await loop.run_in_executor(executor, sync_chat_completion)
            return result
        finally:
            executor.shutdown(wait=False)

    async def _chat_openai_compatible_non_streaming(self, messages: List[ChatMessage]) -> str:
        """Non-streaming chat for OpenAI-compatible providers."""
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        completion = await self.client.chat.completions.create(
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

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.case_analysis",
                    user_id=None,
                    resource_type="case",
                    resource_id=str(request.case_id),
                    action="analyze",
                    success=False,
                    error_message=f"Case analysis failed: {str(exc)}"
                )
            raise HTTPException(status_code=500, detail=f"Case analysis failed: {str(exc)}")

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

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.evidence_analysis",
                    user_id=None,
                    resource_type="case",
                    resource_id=str(request.case_id),
                    action="analyze_evidence",
                    success=False,
                    error_message=f"Evidence analysis failed: {str(exc)}"
                )
            raise HTTPException(status_code=500, detail=f"Evidence analysis failed: {str(exc)}")

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

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.document_draft",
                    user_id=None,
                    resource_type="document",
                    resource_id=request.document_type.value,
                    action="draft",
                    success=False,
                    error_message=f"Document drafting failed: {str(exc)}"
                )
            raise HTTPException(status_code=500, detail=f"Document drafting failed: {str(exc)}")

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

IMPORTANT NAME MISMATCH CHECK:
- The user who uploaded this is: "{user_profile.name or "User"}"
- If the document is clearly about/for a DIFFERENT person (e.g., "Sarah Mitchell" vs "{user_profile.name or "User"}"), set document_ownership_mismatch to TRUE
- If names match or are similar, set to FALSE

CASE TYPE DETECTION - Choose the BEST match:
- "employment" = dismissal, redundancy, unfair dismissal, discrimination at work, employment contracts, wages, workplace grievances
- "housing" = eviction, landlord disputes, rent issues, repairs, tenancy agreements, homelessness
- "consumer" = faulty goods, services disputes, refunds, contracts with businesses
- "family" = divorce, child custody, domestic issues
- "other" = ONLY if none of the above apply

TITLE FORMAT - Create a descriptive title like:
- "Smith vs ABC Corp - Unfair Dismissal"
- "Jones vs City Council - Housing Disrepair"
- "[Claimant] vs [Opponent] - [Issue Type]"

Provide your response in TWO parts:

PART 1 - Conversational Analysis (plain text):
[Your friendly analysis talking directly to the user, summarizing key facts and dates, ending with actionable suggestions]
[If document_ownership_mismatch is TRUE, WARN the user: "⚠️ IMPORTANT: This document appears to be for [name from document], not for you ({user_profile.name or "User"})."]

PART 2 - Structured Data (JSON format):
You MUST provide valid JSON in this exact format. Extract ALL available information from the document:

```json
{{
  "document_ownership_mismatch": false,
  "document_claimant_name": null,
  "title": "Claimant vs Opposing Party - Issue Type",
  "case_type": "employment",
  "description": "2-3 sentence summary of the case facts and key issues",
  "claimant_name": "{user_profile.name or "User"}",
  "opposing_party": "Full company/person name from document",
  "case_number": "Reference number like BT/HR/2024/0847 if found",
  "court_name": "Employment Tribunal or court name if mentioned",
  "filing_deadline": "2024-12-15",
  "next_hearing_date": null,
  "confidence": {{
    "title": 0.85,
    "case_type": 0.95,
    "description": 0.9,
    "opposing_party": 0.95,
    "case_number": 0.8,
    "court_name": 0.0,
    "filing_deadline": 0.7,
    "next_hearing_date": 0.0
  }},
  "extracted_from": {{
    "title": {{"source": "document header", "text": "RE: TERMINATION OF EMPLOYMENT"}},
    "description": {{"source": "document body", "text": "Your employment is being terminated on the grounds of gross misconduct"}},
    "opposing_party": {{"source": "document letterhead", "text": "Brightstone Technologies Ltd"}},
    "case_number": {{"source": "document footer", "text": "Reference: BT/HR/2024/0847"}},
    "court_name": null,
    "filing_deadline": {{"source": "appeal section", "text": "deadline for submitting your appeal is 26th September 2024"}},
    "next_hearing_date": null
  }}
}}
```

IMPORTANT - For extracted_from:
- Provide the EXACT quoted text from the document for EACH extracted field
- Include source location (e.g., "document header", "paragraph 3", "letterhead")
- This shows the user exactly where the AI found each piece of information
- Set to null ONLY if the field was not found in the document

CRITICAL: The JSON must be valid and parseable. Use null (not "null") for missing values. Use actual numbers for confidence scores (0.0-1.0).
"""

            messages = [
                ChatMessage(
                    role="system",
                    content="You are Justice Companion AI, a legal document analysis specialist for UK civil legal matters.",
                ),
                ChatMessage(role="user", content=extraction_prompt),
            ]

            response = await self.chat(messages)
            logger.info(f"[DEBUG] AI response received, length: {len(response)}")

            # Try multiple patterns to find JSON
            json_match = re.search(r"```json\n?(.*?)\n?```", response, re.DOTALL)

            if not json_match:
                # Try to find raw JSON object
                json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"case_type"[\s\S]*"confidence"[\s\S]*\}', response)

            if not json_match:
                # Try to find any JSON-like structure
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response)

            if not json_match:
                # Fallback - try to extract case type from response text
                logger.warning(f"[DEBUG] No JSON found in response. Response preview: {response[:500]}...")

                # Try to detect case type from keywords
                response_lower = response.lower()
                detected_case_type = "other"
                if any(word in response_lower for word in ["dismissal", "employment", "redundancy", "unfair", "workplace", "employer"]):
                    detected_case_type = "employment"
                elif any(word in response_lower for word in ["eviction", "landlord", "tenant", "rent", "housing"]):
                    detected_case_type = "housing"
                elif any(word in response_lower for word in ["refund", "consumer", "goods", "service"]):
                    detected_case_type = "consumer"

                return DocumentExtractionResponse(
                    analysis=response,
                    suggested_case_data=SuggestedCaseData(
                        title=f"Case regarding {parsed_doc.filename}",
                        case_type=detected_case_type,
                        description=f"Document uploaded for analysis: {parsed_doc.filename}",
                        claimant_name=user_profile.name or "User",
                        confidence=FieldConfidence(
                            title=0.3,
                            case_type=0.5 if detected_case_type != "other" else 0.3,
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
            json_str = json_match.group(1) if json_match.lastindex else json_match.group(0)

            logger.info(f"[DEBUG] Found JSON, attempting to parse: {json_str[:200]}...")

            try:
                parsed_json = json.loads(json_str)
                suggested_case_data = SuggestedCaseData(**parsed_json)
                suggested_case_data.claimant_name = user_profile.name or "User"

                logger.info(f"[DEBUG] Successfully parsed case data: title={suggested_case_data.title}, type={suggested_case_data.case_type}")
                logger.info(f"[DEBUG] extracted_from data: {suggested_case_data.extracted_from}")

                return DocumentExtractionResponse(
                    analysis=analysis_text or response, suggested_case_data=suggested_case_data
                )
            except json.JSONDecodeError as e:
                logger.error(f"[DEBUG] JSON parse error: {exc}. JSON string: {json_str}")

                # Return fallback with the analysis text we have
                return DocumentExtractionResponse(
                    analysis=analysis_text or response,
                    suggested_case_data=SuggestedCaseData(
                        title=f"Case regarding {parsed_doc.filename}",
                        case_type="other",
                        description=f"Document uploaded for analysis: {parsed_doc.filename}",
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
            except Exception as exc:
                logger.error(f"[DEBUG] Error creating SuggestedCaseData: {exc}. Parsed JSON: {parsed_json}")
                raise

        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.document_extraction",
                    user_id=None,
                    resource_type="document",
                    resource_id=parsed_doc.filename,
                    action="extract",
                    success=False,
                    error_message=f"Document extraction failed: {str(exc)}"
                )
            raise HTTPException(status_code=500, detail=f"Document extraction failed: {str(exc)}")

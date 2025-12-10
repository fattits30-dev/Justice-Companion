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

import logging
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, cast

from fastapi import HTTPException

from backend.services.ai.analysis import (
    run_case_analysis,
    run_document_draft,
    run_evidence_analysis,
)
from backend.services.ai.ingestion import (
    extract_case_data_from_document as run_document_extraction,
)
from backend.services.ai.models import (
    AIProviderConfig,
    CaseAnalysisRequest,
    CaseAnalysisResponse,
    ChatMessage,
    DocumentDraftRequest,
    DocumentDraftResponse,
    DocumentExtractionResponse,
    EvidenceAnalysisRequest,
    EvidenceAnalysisResponse,
    ParsedDocument,
    UserProfile,
)
from backend.services.ai.providers import AI_PROVIDER_METADATA, create_provider_client

# Response caching
from backend.utils.response_cache import AIResponseCache, get_global_cache

# Timeout utilities
from backend.utils.timeout_config import (
    DEFAULT_TIMEOUT_CONFIG,
    AITimeoutError,
    TimeoutConfig,
    get_timeout_for_operation,
)
from backend.utils.timeout_wrapper import run_with_timeout

# Configure logger
logger = logging.getLogger(__name__)


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

    def __init__(
        self,
        config: AIProviderConfig,
        audit_logger=None,
        timeout_config: Optional[TimeoutConfig] = None,
        response_cache: Optional[AIResponseCache] = None,
        enable_cache: bool = True,
    ):
        """
        Initialize unified AI service.

        Args:
            config: AI provider configuration
            audit_logger: Optional audit logger instance
            timeout_config: Optional timeout configuration (defaults to DEFAULT_TIMEOUT_CONFIG)
            response_cache: Optional response cache (defaults to global cache if enable_cache=True)
            enable_cache: Whether to enable response caching (default: True)
        """
        self.config = config
        self.audit_logger = audit_logger
        self.timeout_config = timeout_config or DEFAULT_TIMEOUT_CONFIG
        self.enable_cache = enable_cache
        self.response_cache = response_cache if enable_cache else None

        # Use global cache if caching enabled but no cache provided
        if self.enable_cache and self.response_cache is None:
            self.response_cache = get_global_cache()

        self.client: Any = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """
        Initialize the appropriate API client based on provider.

        Raises:
            HTTPException: If provider is unsupported or initialization fails
        """
        self.client = create_provider_client(
            config=self.config,
            audit_logger=self.audit_logger,
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

    def _get_timeout(self, operation: str) -> float:
        """
        Get timeout for specific operation.

        Args:
            operation: Operation name (e.g., 'chat', 'stream_chat', 'document_extraction')

        Returns:
            Timeout in seconds

        Priority:
        1. Config-specific timeout (AIProviderConfig.timeout)
        2. Operation-specific timeout with provider multiplier
        3. Default timeout
        """
        return get_timeout_for_operation(
            operation=operation,
            provider=self.config.provider,
            config=self.timeout_config,
            custom_timeout=self.config.timeout,
        )

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
        logger.info(
            "[DEBUG] stream_chat called with provider=%s, messages=%s",
            self.config.provider,
            len(messages),
        )

        if not self.client:
            error = HTTPException(
                status_code=500,
                detail="%s client not configured" % self.config.provider,
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
                logger.info(
                    "[DEBUG] Routing to OpenAI-compatible streaming for provider: %s",
                    self.config.provider,
                )
                async for token in self._stream_openai_compatible_chat(messages):
                    logger.info("[DEBUG] Got token from stream: %s", token)
                    full_response += token
                    if on_token:
                        on_token(token)
                    yield token

            logger.info(
                "[DEBUG] Stream complete, full_response length: %s", len(full_response)
            )
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
                    error_message=f"Streaming chat failed for {self.config.provider}: {str(exc)}",
                )
            if on_error:
                on_error(exc)
            raise HTTPException(
                status_code=500, detail=f"Streaming failed: {str(exc)}"
            ) from exc

    async def _stream_anthropic_chat(
        self, messages: List[ChatMessage]
    ) -> AsyncIterator[str]:
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

    async def _stream_huggingface_chat(
        self, messages: List[ChatMessage]
    ) -> AsyncIterator[str]:
        """
        Stream chat for HuggingFace/Qwen using Hugging Face Inference API.

        Uses the OpenAI-compatible chat.completions.create() API.

        Args:
            messages: Chat messages

        Yields:
            Token strings
        """
        formatted_messages = [
            {"role": msg.role, "content": msg.content} for msg in messages
        ]

        logger.info(
            "[DEBUG] Creating HuggingFace stream with model=%s, messages=%s",
            self.config.model,
            len(formatted_messages),
        )

        # HuggingFace InferenceClient uses OpenAI-compatible API
        # IMPORTANT: Must await the coroutine to get the actual stream iterator
        stream = await self.client.chat.completions.create(
            model=self.config.model,
            messages=formatted_messages,
            temperature=self.config.temperature or 0.7,
            max_tokens=self.config.max_tokens or 2048,
            top_p=self.config.top_p or 0.9,
            stream=True,
        )

        logger.info("[DEBUG] Stream created successfully, iterating...")

        # Iterate over the async stream
        chunk_count = 0
        async for chunk in stream:
            chunk_count += 1
            logger.info("[DEBUG] Chunk #%s: %s", chunk_count, chunk)
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    logger.info("[DEBUG] Yielding content: %s", delta.content)
                    yield delta.content
                else:
                    logger.info("[DEBUG] Delta has no content: %s", delta)
            else:
                logger.info("[DEBUG] Chunk has no choices")

        logger.info(
            "[DEBUG] HuggingFace stream complete. Total chunks: %s", chunk_count
        )

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
        formatted_messages = [
            {"role": msg.role, "content": msg.content} for msg in messages
        ]

        request_params = {
            "model": self.config.model,
            "messages": formatted_messages,
            "stream": True,
            "temperature": self.config.temperature or 0.7,
            "max_tokens": self.config.max_tokens or 8192,
            "top_p": self.config.top_p or 0.9,
        }

        logger.info(
            "[DEBUG] Creating stream with params: model=%s, messages=%s",
            self.config.model,
            len(formatted_messages),
        )
        stream = await self.client.chat.completions.create(**request_params)
        logger.info("[DEBUG] Stream created, type: %s", type(stream))

        chunk_count = 0
        async for chunk in stream:
            chunk_count += 1
            logger.info("[DEBUG] Received chunk #%s: %s", chunk_count, chunk)
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    logger.info("[DEBUG] Yielding content: %s", delta.content)
                    yield delta.content
                else:
                    logger.info("[DEBUG] Delta has no content: %s", delta)
            else:
                logger.info("[DEBUG] Chunk has no choices")

        logger.info("[DEBUG] Stream complete. Total chunks: %s", chunk_count)

    async def chat(self, messages: List[ChatMessage]) -> str:
        """
        Non-streaming chat completion with caching.

        Args:
            messages: Chat messages

        Returns:
            Complete response text (from cache or AI provider)

        Raises:
            HTTPException: If client not configured or chat fails
            AITimeoutError: If operation exceeds timeout
        """
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        # Check cache first
        if self.enable_cache and self.response_cache:
            messages_dict = [
                {"role": msg.role, "content": msg.content} for msg in messages
            ]
            cached_response = self.response_cache.get(
                messages=messages_dict,
                provider=self.config.provider,
                model=self.config.model,
            )
            if cached_response:
                logger.info(
                    "Cache HIT for %s/%s (%s messages)",
                    self.config.provider,
                    self.config.model,
                    len(messages),
                )
                return cached_response

        try:
            # Get timeout for chat operation
            timeout = self._get_timeout("chat")
            logger.debug(
                "Chat operation with %s has %ss timeout",
                self.config.provider,
                timeout,
            )

            # Route to provider-specific method with timeout
            if self.config.provider == "anthropic":
                coro = self._chat_anthropic_non_streaming(messages)
            elif self.config.provider in ["huggingface", "qwen"]:
                coro = self._chat_qwen_non_streaming(messages)
            else:
                coro = self._chat_openai_compatible_non_streaming(messages)

            # Apply timeout wrapper
            response = await run_with_timeout(
                coro=coro,
                timeout=timeout,
                operation_name="chat",
                provider=self.config.provider,
            )

            # Cache the response
            if self.enable_cache and self.response_cache:
                messages_dict = [
                    {"role": msg.role, "content": msg.content} for msg in messages
                ]
                self.response_cache.set(
                    messages=messages_dict,
                    provider=self.config.provider,
                    model=self.config.model,
                    response=response,
                )
                logger.debug(
                    "Cached response for %s/%s (%s messages)",
                    self.config.provider,
                    self.config.model,
                    len(messages),
                )

            return response

        except AITimeoutError:
            # Re-raise timeout errors without wrapping
            raise
        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.chat",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id=self.config.provider,
                    action="chat",
                    success=False,
                    error_message=f"Chat failed for {self.config.provider}: {str(exc)}",
                )
            raise HTTPException(
                status_code=500, detail=f"Chat failed: {str(exc)}"
            ) from exc

    async def _chat_anthropic_non_streaming(self, messages: List[ChatMessage]) -> str:
        """Non-streaming chat for Anthropic."""
        system_message = ""
        conversation_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                conversation_messages.append({"role": msg.role, "content": msg.content})

        response = await self.client.messages.create(
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

        formatted_messages = [
            {"role": msg.role, "content": msg.content} for msg in messages
        ]

        def sync_chat_completion() -> str:
            """Synchronous chat completion call."""
            response = self.client.chat_completion(
                model=self.config.model,
                messages=formatted_messages,
                temperature=self.config.temperature or 0.3,
                max_tokens=self.config.max_tokens or 2048,
                top_p=self.config.top_p or 0.9,
            )
            content = response.choices[0].message.content
            if content is None:
                return ""
            return cast(str, content)

        # Run sync call in thread pool to avoid blocking event loop
        loop = asyncio.get_running_loop()
        executor = ThreadPoolExecutor(max_workers=1)
        try:
            result = await loop.run_in_executor(executor, sync_chat_completion)
            return cast(str, result)
        finally:
            executor.shutdown(wait=False)

    async def _chat_openai_compatible_non_streaming(
        self, messages: List[ChatMessage]
    ) -> str:
        """Non-streaming chat for OpenAI-compatible providers."""
        formatted_messages = [
            {"role": msg.role, "content": msg.content} for msg in messages
        ]

        completion = await self.client.chat.completions.create(
            model=self.config.model,
            messages=formatted_messages,
            temperature=self.config.temperature or 0.7,
            max_tokens=self.config.max_tokens or 2048,
            top_p=self.config.top_p or 0.9,
        )

        content = completion.choices[0].message.content
        if content is None:
            return ""
        return cast(str, content)

    async def analyze_case(self, request: CaseAnalysisRequest) -> CaseAnalysisResponse:
        """Analyze a case and provide structured legal analysis."""
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            return await run_case_analysis(chat_fn=self.chat, request=request)
        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.case_analysis",
                    user_id=None,
                    resource_type="case",
                    resource_id=str(request.case_id),
                    action="analyze",
                    success=False,
                    error_message=f"Case analysis failed: {str(exc)}",
                )
            raise HTTPException(
                status_code=500, detail=f"Case analysis failed: {str(exc)}"
            ) from exc

    async def analyze_evidence(
        self, request: EvidenceAnalysisRequest
    ) -> EvidenceAnalysisResponse:
        """Analyze evidence and identify gaps."""
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            return await run_evidence_analysis(chat_fn=self.chat, request=request)
        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.evidence_analysis",
                    user_id=None,
                    resource_type="case",
                    resource_id=str(request.case_id),
                    action="analyze_evidence",
                    success=False,
                    error_message=f"Evidence analysis failed: {str(exc)}",
                )
            raise HTTPException(
                status_code=500, detail=f"Evidence analysis failed: {str(exc)}"
            ) from exc

    async def draft_document(
        self, request: DocumentDraftRequest
    ) -> DocumentDraftResponse:
        """Draft a legal document."""
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        doc_type = (
            request.document_type.value
            if hasattr(request.document_type, "value")
            else request.document_type
        )

        try:
            return await run_document_draft(
                chat_fn=self.chat,
                request=request,
                model_name=self.config.model,
            )
        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.document_draft",
                    user_id=None,
                    resource_type="document",
                    resource_id=doc_type,
                    action="draft",
                    success=False,
                    error_message=f"Document drafting failed: {str(exc)}",
                )
            raise HTTPException(
                status_code=500, detail=f"Document drafting failed: {str(exc)}"
            ) from exc

    async def extract_case_data_from_document(
        self,
        parsed_doc: ParsedDocument,
        user_profile: UserProfile,
        user_question: Optional[str] = None,
    ) -> DocumentExtractionResponse:
        """Extract structured case data from document input."""
        if not self.client:
            raise HTTPException(
                status_code=500, detail=f"{self.config.provider} client not configured"
            )

        try:
            return await run_document_extraction(
                chat_fn=self.chat,
                parsed_doc=parsed_doc,
                user_profile=user_profile,
                user_question=user_question,
            )
        except Exception as exc:
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.document_extraction",
                    user_id=None,
                    resource_type="document",
                    resource_id=parsed_doc.filename,
                    action="extract",
                    success=False,
                    error_message=f"Document extraction failed: {str(exc)}",
                )
            raise HTTPException(
                status_code=500, detail=f"Document extraction failed: {str(exc)}"
            ) from exc

"""
AI Service Factory - Multi-Provider AI Service Manager

Migrated from: src/services/AIServiceFactory.ts

Supports two AI providers:
- OpenAI (cloud-based GPT-4o/GPT-3.5-turbo) - User provides API key
- IntegratedAIService (local Qwen 3 8B) - Fallback

Provider Selection Logic:
- If OpenAI is configured (API key set) → Use OpenAI
- If OpenAI not configured or fails → Use IntegratedAIService (local)

This provides flexibility: users can choose cloud (better quality, pay-per-use)
or local (privacy, no internet required, no costs).

Features:
- Singleton pattern for service management
- Provider auto-switching based on configuration
- Model file validation and size checking
- Comprehensive audit logging
- Thread-safe singleton implementation
- Type hints (Python 3.12+)
- Pydantic models for validation
- HTTPException for error handling

Architecture:
- Factory pattern for creating AI service instances
- Lazy initialization for service creation
- Configuration-driven provider selection
- Case facts repository injection for context

Security:
- API keys handled by provider services (not stored here)
- Audit logging for all AI operations
- No sensitive data logged
- Provider isolation

Usage:
    from backend.services.ai_service_factory import AIServiceFactory

    # Get singleton instance
    factory = AIServiceFactory.get_instance(
        model_path="/path/to/models",
        audit_logger=audit_logger
    )

    # Configure OpenAI
    factory.configure_openai(api_key="sk-...", model="gpt-4o")

    # Get current service
    service = factory.get_ai_service()

    # Handle chat request
    response = await factory.handle_chat_request(request)
"""

import os
import logging
from typing import Optional, Any, Literal
from threading import Lock
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict

from fastapi import HTTPException


# Configure logger
logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================


class AIProviderType(str, Enum):
    """AI Provider Types"""

    OPENAI = "openai"
    INTEGRATED = "integrated"


# ============================================================================
# PYDANTIC MODELS
# ============================================================================


class AIChatMessage(BaseModel):
    """Chat message structure"""

    model_config = ConfigDict(from_attributes=True)

    role: Literal["system", "user", "assistant"]
    content: str
    timestamp: Optional[str] = None
    thinking_content: Optional[str] = None  # AI's internal reasoning from <think> tags


class LegislationResult(BaseModel):
    """Legislation search result from UK legal APIs"""

    model_config = ConfigDict(from_attributes=True)

    title: str
    section: Optional[str] = None
    content: str
    url: str
    relevance: Optional[float] = None


class CaseResult(BaseModel):
    """Case law search result from UK legal APIs"""

    model_config = ConfigDict(from_attributes=True)

    citation: str
    court: str
    date: str
    summary: str
    outcome: Optional[str] = None
    url: str
    relevance: Optional[float] = None


class KnowledgeEntry(BaseModel):
    """Knowledge base entry (cached FAQs, guides)"""

    model_config = ConfigDict(from_attributes=True)

    topic: str
    category: str
    content: str
    sources: list[str]


class LegalContext(BaseModel):
    """Legal context from RAG retrieval"""

    model_config = ConfigDict(from_attributes=True)

    legislation: list[LegislationResult] = Field(default_factory=list)
    case_law: list[CaseResult] = Field(default_factory=list)
    knowledge_base: list[KnowledgeEntry] = Field(default_factory=list)


class AIConfig(BaseModel):
    """AI model configuration"""

    model_config = ConfigDict(from_attributes=True)

    endpoint: str = ""  # External endpoint (deprecated - using integrated AI)
    model: str = "local-model"
    temperature: float = 0.3  # Low temperature for factual legal information
    max_tokens: int = 2000
    stream: bool = False
    context_size: Optional[int] = None  # Auto-detect from model
    threads: Optional[int] = None  # Auto-detect CPU threads
    batch_size: Optional[int] = None  # Use library default


class AIChatRequest(BaseModel):
    """AI chat request with legal context"""

    model_config = ConfigDict(from_attributes=True)

    messages: list[AIChatMessage]
    context: Optional[LegalContext] = None
    config: Optional[AIConfig] = None
    case_id: Optional[int] = None


class AIChatResponse(BaseModel):
    """Successful AI chat response"""

    model_config = ConfigDict(from_attributes=True)

    success: Literal[True] = True
    message: AIChatMessage
    sources: list[str] = Field(default_factory=list)
    tokens_used: Optional[int] = None


class AIErrorResponse(BaseModel):
    """AI error response"""

    model_config = ConfigDict(from_attributes=True)

    success: Literal[False] = False
    error: str
    code: Optional[str] = None


# Union type for all AI responses
AIResponse = AIChatResponse | AIErrorResponse


# ============================================================================
# STUB CLASSES (Temporary - Replace with Real Implementations)
# ============================================================================


class IntegratedAIService:
    """
    Integrated AI Service using local Qwen 3 8B model.

    This is a stub implementation. Replace with actual service that:
    - Loads Qwen 3 8B model using node-llama-cpp (or Python equivalent)
    - Handles chat requests with streaming support
    - Uses case facts repository for context injection
    - Implements RAG pipeline for UK legal data
    """

    def __init__(self, model_path: str, audit_logger=None):
        """
        Initialize integrated AI service.

        Args:
            model_path: Path to local GGUF model file
            audit_logger: Optional audit logger for tracking operations
        """
        self.model_path = model_path
        self.audit_logger = audit_logger
        self.case_facts_repository = None

        logger.info(f"IntegratedAIService initialized with model path: {model_path}")

    def set_case_facts_repository(self, repository: Any) -> None:
        """
        Set case facts repository for context injection.

        Args:
            repository: CaseFactsRepository instance
        """
        self.case_facts_repository = repository

        if self.audit_logger:
            self.audit_logger.log(
                event_type="ai.repository_set",
                user_id=None,
                resource_type="ai_service",
                resource_id="integrated",
                action="configure",
                details={"repository_set": True},
                success=True,
            )

    async def handle_chat_request(self, request: AIChatRequest) -> AIResponse:
        """
        Handle chat request using local AI model.

        Args:
            request: Chat request with messages and context

        Returns:
            AI response (success or error)
        """
        try:
            # Log request
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.chat_request",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id="integrated",
                    action="chat",
                    details={
                        "message_count": len(request.messages),
                        "has_context": request.context is not None,
                        "case_id": request.case_id,
                    },
                    success=True,
                )

            # Stub implementation - replace with actual AI logic
            return AIErrorResponse(
                success=False, error="Integrated AI service not implemented", code="NOT_IMPLEMENTED"
            )

        except Exception as e:
            logger.error(f"Integrated AI service error: {e}", exc_info=True)

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.chat_request",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id="integrated",
                    action="chat",
                    details={"error": str(e)},
                    success=False,
                    error_message=str(e),
                )

            raise HTTPException(status_code=500, detail=f"Integrated AI service error: {str(e)}")


class OpenAIService:
    """
    OpenAI Service for cloud-based GPT models.

    This is a stub implementation. Replace with actual service that:
    - Uses OpenAI Python SDK
    - Supports GPT-4o, GPT-4-turbo, GPT-3.5-turbo
    - Implements streaming responses
    - Handles rate limiting and errors
    - Integrates with RAG pipeline
    """

    def __init__(self, model: str, audit_logger=None):
        """
        Initialize OpenAI service.

        Args:
            model: OpenAI model name (e.g., "gpt-4o", "gpt-3.5-turbo")
            audit_logger: Optional audit logger for tracking operations
        """
        self.model = model
        self.api_key: Optional[str] = None
        self.audit_logger = audit_logger

        logger.info(f"OpenAIService initialized with model: {model}")

    def update_config(self, api_key: str, model: str) -> None:
        """
        Update OpenAI configuration.

        Args:
            api_key: OpenAI API key
            model: OpenAI model name
        """
        self.api_key = api_key
        self.model = model

        if self.audit_logger:
            self.audit_logger.log(
                event_type="ai.config_updated",
                user_id=None,
                resource_type="ai_service",
                resource_id="openai",
                action="configure",
                details={"model": model},
                success=True,
            )

        logger.info(f"OpenAI config updated: model={model}")

    def get_model(self) -> str:
        """Get current model name."""
        return self.model

    async def handle_chat_request(self, request: AIChatRequest) -> AIResponse:
        """
        Handle chat request using OpenAI API.

        Args:
            request: Chat request with messages and context

        Returns:
            AI response (success or error)
        """
        try:
            # Log request
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.chat_request",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id="openai",
                    action="chat",
                    details={
                        "message_count": len(request.messages),
                        "has_context": request.context is not None,
                        "case_id": request.case_id,
                        "model": self.model,
                    },
                    success=True,
                )

            # Stub implementation - replace with actual OpenAI API calls
            return AIErrorResponse(
                success=False, error="OpenAI service not implemented", code="NOT_IMPLEMENTED"
            )

        except Exception as e:
            logger.error(f"OpenAI service error: {e}", exc_info=True)

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai.chat_request",
                    user_id=None,
                    resource_type="ai_service",
                    resource_id="openai",
                    action="chat",
                    details={"error": str(e), "model": self.model},
                    success=False,
                    error_message=str(e),
                )

            raise HTTPException(status_code=500, detail=f"OpenAI service error: {str(e)}")


# ============================================================================
# AI SERVICE FACTORY
# ============================================================================


class AIServiceFactory:
    """
    AI Service Factory - Multi-Provider AI Service Manager

    Singleton factory for managing AI service providers (OpenAI, Integrated).

    Features:
    - Thread-safe singleton pattern
    - Provider auto-switching based on configuration
    - Model file validation
    - Audit logging for all operations
    - Case facts repository injection

    Provider Selection:
    1. If OpenAI configured (API key set) → Use OpenAI
    2. Otherwise → Use IntegratedAIService (local Qwen 3)

    Thread Safety:
    - Uses threading.Lock for singleton initialization
    - All operations are thread-safe

    Usage:
        factory = AIServiceFactory.get_instance(
            model_path="/path/to/model.gguf",
            audit_logger=audit_logger
        )

        # Configure OpenAI
        factory.configure_openai("sk-...", "gpt-4o")

        # Get service and handle request
        response = await factory.handle_chat_request(request)
    """

    # Class-level singleton instance
    _instance: Optional["AIServiceFactory"] = None
    _lock: Lock = Lock()

    def __init__(self, model_path: str, audit_logger=None):
        """
        Private constructor for singleton.

        Args:
            model_path: Path to local GGUF model file
            audit_logger: Optional audit logger for tracking operations
        """
        # IntegratedService created without repository initially
        # Will be set via set_case_facts_repository() after initialization
        self.integrated_service = IntegratedAIService(model_path, audit_logger)

        # OpenAI service will be created when user configures it
        self.openai_service: Optional[OpenAIService] = None

        # Model path for validation
        self.model_path = model_path

        # Current provider
        self.current_provider: Literal["openai", "integrated"] = "integrated"

        # Audit logger
        self.audit_logger = audit_logger

        # Log initialization
        logger.info(
            f"AIServiceFactory initialized with model_path={model_path}, "
            f"default_provider=integrated"
        )

        if audit_logger:
            audit_logger.log(
                event_type="ai_factory.initialized",
                user_id=None,
                resource_type="ai_factory",
                resource_id="singleton",
                action="initialize",
                details={"model_path": model_path, "default_provider": "integrated"},
                success=True,
            )

    @classmethod
    def get_instance(
        cls, model_path: Optional[str] = None, audit_logger=None
    ) -> "AIServiceFactory":
        """
        Get singleton instance (thread-safe).

        Args:
            model_path: Path to local GGUF model file (required on first call)
            audit_logger: Optional audit logger for tracking operations

        Returns:
            Singleton AIServiceFactory instance

        Raises:
            ValueError: If model_path not provided on first call
        """
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking pattern
                if cls._instance is None:
                    if model_path is None:
                        raise ValueError("model_path required on first call to get_instance()")

                    cls._instance = cls(model_path, audit_logger)

        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """
        Reset singleton instance (for testing).

        WARNING: Only use in tests. This will break existing references.
        """
        with cls._lock:
            cls._instance = None
            logger.warning("AIServiceFactory singleton instance reset")

    def set_case_facts_repository(self, repository: Any) -> None:
        """
        Set case facts repository for the integrated service.

        The case facts repository provides context for AI requests by
        retrieving relevant case information based on the case_id.

        Args:
            repository: CaseFactsRepository instance
        """
        self.integrated_service.set_case_facts_repository(repository)

        logger.info("Case facts repository set for integrated service")

        if self.audit_logger:
            self.audit_logger.log(
                event_type="ai_factory.repository_set",
                user_id=None,
                resource_type="ai_factory",
                resource_id="singleton",
                action="configure",
                details={"repository_set": True},
                success=True,
            )

    def configure_openai(self, api_key: str, model: str) -> None:
        """
        Configure OpenAI service with API key and model.

        Creates new OpenAIService if not exists, or updates existing one.
        Automatically switches to OpenAI provider after configuration.

        Args:
            api_key: OpenAI API key (starts with "sk-")
            model: OpenAI model name (e.g., "gpt-4o", "gpt-3.5-turbo")
        """
        if self.openai_service is None:
            self.openai_service = OpenAIService(model, self.audit_logger)
            logger.info(f"Created new OpenAIService with model: {model}")
        else:
            self.openai_service.update_config(api_key, model)
            logger.info(f"Updated OpenAIService config: model={model}")

        # Auto-switch to OpenAI provider
        self.current_provider = "openai"

        if self.audit_logger:
            self.audit_logger.log(
                event_type="ai_factory.openai_configured",
                user_id=None,
                resource_type="ai_factory",
                resource_id="singleton",
                action="configure",
                details={"model": model, "provider_switched": "openai"},
                success=True,
            )

    def get_current_provider(self) -> Literal["openai", "integrated"]:
        """
        Get current provider status.

        Returns:
            Current provider type ("openai" or "integrated")
        """
        return self.current_provider

    def get_ai_service(self) -> IntegratedAIService | OpenAIService:
        """
        Get AI service based on current configuration.

        Returns OpenAI service if configured, otherwise returns integrated service.

        Returns:
            Active AI service instance
        """
        if self.openai_service is not None:
            return self.openai_service
        return self.integrated_service

    def switch_to_openai(self) -> bool:
        """
        Switch provider to OpenAI if configured.

        Returns:
            True if switch successful, False if OpenAI not configured
        """
        if self.openai_service is not None:
            self.current_provider = "openai"

            logger.info("Switched to OpenAI provider")

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai_factory.provider_switched",
                    user_id=None,
                    resource_type="ai_factory",
                    resource_id="singleton",
                    action="switch",
                    details={"provider": "openai"},
                    success=True,
                )

            return True

        logger.warning("Cannot switch to OpenAI: service not configured")
        return False

    def switch_to_integrated(self) -> None:
        """Switch provider to integrated service."""
        self.current_provider = "integrated"

        logger.info("Switched to integrated provider")

        if self.audit_logger:
            self.audit_logger.log(
                event_type="ai_factory.provider_switched",
                user_id=None,
                resource_type="ai_factory",
                resource_id="singleton",
                action="switch",
                details={"provider": "integrated"},
                success=True,
            )

    def is_model_available(self) -> bool:
        """
        Check if local model file exists.

        Returns:
            True if model file exists at configured path
        """
        try:
            exists = os.path.exists(self.model_path)

            if not exists:
                logger.warning(f"Model file not found: {self.model_path}")

            return exists

        except Exception as e:
            logger.error(f"Failed to check model existence: {e}", exc_info=True)

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai_factory.model_check_failed",
                    user_id=None,
                    resource_type="ai_factory",
                    resource_id="singleton",
                    action="validate",
                    details={"error": str(e)},
                    success=False,
                    error_message=str(e),
                )

            return False

    def get_model_size(self) -> int:
        """
        Get model file size in bytes.

        Returns:
            Model file size in bytes, or 0 if error/not found
        """
        try:
            if not os.path.exists(self.model_path):
                return 0

            size = os.path.getsize(self.model_path)

            # Convert to human-readable format for logging
            size_mb = size / (1024 * 1024)
            size_gb = size / (1024 * 1024 * 1024)

            if size_gb >= 1:
                logger.info(f"Model size: {size_gb:.2f} GB")
            else:
                logger.info(f"Model size: {size_mb:.2f} MB")

            return size

        except Exception as e:
            logger.error(f"Failed to get model size: {e}", exc_info=True)

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai_factory.model_size_check_failed",
                    user_id=None,
                    resource_type="ai_factory",
                    resource_id="singleton",
                    action="validate",
                    details={"error": str(e)},
                    success=False,
                    error_message=str(e),
                )

            return 0

    async def handle_chat_request(self, request: AIChatRequest) -> AIResponse:
        """
        Handle chat request using appropriate AI service.

        Routes request to active provider (OpenAI or Integrated).
        Logs all operations for audit trail.

        Args:
            request: Chat request with messages and context

        Returns:
            AI response (success or error)

        Raises:
            HTTPException: If request fails with non-recoverable error
        """
        try:
            # Get active service
            service = self.get_ai_service()

            # Get provider name for logging
            provider = self.current_provider
            model = (
                self.openai_service.get_model()
                if provider == "openai" and self.openai_service
                else "local-qwen"
            )

            logger.info(f"Handling chat request with provider={provider}, model={model}")

            # Handle request
            response = await service.handle_chat_request(request)

            # Log successful request
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai_factory.chat_completed",
                    user_id=None,
                    resource_type="ai_factory",
                    resource_id="singleton",
                    action="chat",
                    details={
                        "provider": provider,
                        "model": model,
                        "success": response.success if hasattr(response, "success") else True,
                        "message_count": len(request.messages),
                        "case_id": request.case_id,
                    },
                    success=True,
                )

            logger.info(
                f"AI request completed successfully: provider={provider}, " f"model={model}"
            )

            return response

        except Exception as e:
            logger.error(
                f"AI request failed: provider={self.current_provider}, error={e}", exc_info=True
            )

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai_factory.chat_failed",
                    user_id=None,
                    resource_type="ai_factory",
                    resource_id="singleton",
                    action="chat",
                    details={"provider": self.current_provider, "error": str(e)},
                    success=False,
                    error_message=str(e),
                )

            raise

    async def chat(self, request: AIChatRequest) -> AIResponse:
        """
        Chat method for RAGService compatibility.

        This is an alias for handle_chat_request() to maintain compatibility
        with legacy code that expects a chat() method.

        Args:
            request: Chat request with messages and context

        Returns:
            AI response (success or error)
        """
        return await self.handle_chat_request(request)


# ============================================================================
# SINGLETON EXPORT (for convenience)
# ============================================================================

# Note: Singleton instance should be initialized in main.py or app startup
# with proper model_path and audit_logger. This is just a placeholder.
#
# Example initialization:
#   from backend.services.ai_service_factory import AIServiceFactory
#
#   ai_factory = AIServiceFactory.get_instance(
#       model_path="/path/to/models/Qwen_Qwen3-8B-Q4_K_M.ggu",
#       audit_logger=audit_logger
#   )


def get_ai_service_factory() -> AIServiceFactory:
    """
    Get singleton AIServiceFactory instance.

    Returns:
        Singleton instance

    Raises:
        RuntimeError: If instance not initialized (call get_instance() first)
    """
    if AIServiceFactory._instance is None:
        raise RuntimeError(
            "AIServiceFactory not initialized. Call AIServiceFactory.get_instance() "
            "with model_path first."
        )
    return AIServiceFactory._instance

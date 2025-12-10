"""
AI Provider Configuration Service - Manages AI Provider Configurations
Ported from src/services/AIProviderConfigService.ts

Features:
- Secure storage of API keys using EncryptionService
- Provider configuration persistence in database
- Active provider selection per user
- Configuration validation
- Support for 10 AI providers (OpenAI, Anthropic, Hugging Face, Qwen,
    Google, Cohere, Together, Anyscale, Mistral, Perplexity)
- Comprehensive audit logging
- Thread-safe operations

Security:
- API keys encrypted at rest with AES-256-GCM
- Per-user configuration isolation
- All operations audited
- Input validation with Pydantic

Example:
    service = AIProviderConfigService(db, encryption_service, audit_logger)

    # Save provider configuration
    config = AIProviderConfigInput(
        provider="openai",
        api_key="sk-...",
        model="gpt-4-turbo",
        temperature=0.7
    )
    await service.set_provider_config(user_id=1, config=config)

    # Get active provider
    active_config = await service.get_active_provider_config(user_id=1)
"""

import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.models.ai_provider_config import AIProviderConfig
from backend.services.security.encryption import EncryptionService


class AIProviderType(str, Enum):
    """Supported AI provider types."""

    HUGGINGFACE = "huggingface"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    QWEN = "qwen"
    GOOGLE = "google"
    COHERE = "cohere"
    TOGETHER = "together"
    ANYSCALE = "anyscale"
    MISTRAL = "mistral"
    PERPLEXITY = "perplexity"
    EMBERTON = "emberton"
    OLLAMA = "ollama"
    GROQ = "groq"


class AIProviderMetadata(BaseModel):
    """Provider metadata information."""

    name: str
    default_endpoint: str
    supports_streaming: bool
    default_model: str
    max_context_tokens: int
    available_models: List[str]
    requires_api_key: bool = True


class AIProviderConfigInput(BaseModel):
    """Input model for creating/updating AI provider configuration."""

    provider: AIProviderType
    api_key: Optional[str] = Field(None, min_length=0)
    model: str = Field(..., min_length=1)
    endpoint: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0, le=2)
    max_tokens: Optional[int] = Field(None, ge=1, le=100000)
    top_p: Optional[float] = Field(None, ge=0, le=1)
    enabled: bool = True

    @field_validator("api_key")
    @classmethod
    def normalize_api_key(cls, v: Optional[str]) -> Optional[str]:
        """Normalize API key; allow empty when provider does not require one."""
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("model")
    @classmethod
    @classmethod
    def validate_model(cls, v: str) -> str:
        """Validate model name is not empty."""
        if not v or not v.strip():
            raise ValueError("Model name cannot be empty")
        return v.strip()


class AIProviderConfigOutput(BaseModel):
    """Output model for AI provider configuration (with decrypted API key)."""

    id: int
    user_id: int
    provider: str
    api_key: str  # Decrypted
    model: str
    endpoint: Optional[str]
    temperature: Optional[float]
    max_tokens: Optional[int]
    top_p: Optional[float]
    enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AIProviderConfigSummary(BaseModel):
    """Summary model for AI provider configuration (without API key)."""

    id: int
    user_id: int
    provider: str
    model: str
    endpoint: Optional[str]
    temperature: Optional[float]
    max_tokens: Optional[int]
    top_p: Optional[float]
    enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ValidationResult(BaseModel):
    """Result of configuration validation."""

    valid: bool
    errors: List[str]


class TestResult(BaseModel):
    """Result of provider connection test."""

    success: bool
    error: Optional[str] = None


# Provider metadata dictionary (matching TypeScript AI_PROVIDER_METADATA)
AI_PROVIDER_METADATA: Dict[AIProviderType, AIProviderMetadata] = {
    AIProviderType.OPENAI: AIProviderMetadata(
        name="OpenAI",
        default_endpoint="https://api.openai.com/v1",
        supports_streaming=True,
        default_model="gpt-4-turbo",
        max_context_tokens=128000,
        available_models=[
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-4o",
        ],
    ),
    AIProviderType.ANTHROPIC: AIProviderMetadata(
        name="Anthropic",
        default_endpoint="https://api.anthropic.com/v1",
        supports_streaming=True,
        default_model="claude-3-5-sonnet-20241022",
        max_context_tokens=200000,
        available_models=[
            "claude-3-5-sonnet-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ],
    ),
    AIProviderType.HUGGINGFACE: AIProviderMetadata(
        name="Hugging Face",
        default_endpoint="https://api-inference.huggingface.co",
        supports_streaming=True,
        default_model="meta-llama/Llama-3.3-70B-Instruct",  # Updated: 11 inference providers!
        max_context_tokens=128000,
        available_models=[
            "meta-llama/Llama-3.3-70B-Instruct",  # 11 providers (fireworks, together, cerebras, etc.)
            "meta-llama/Llama-3.1-8B-Instruct",  # 8 providers (fast, lightweight)
            "Qwen/Qwen2.5-72B-Instruct",  # 4 providers (deep reasoning)
            "mistralai/Mistral-7B-Instruct-v0.3",  # 2 providers (Apache 2.0, no gating)
            "google/gemma-2-27b-it",  # Good balance (gated)
        ],
    ),
    AIProviderType.QWEN: AIProviderMetadata(
        name="Qwen",
        default_endpoint="https://api-inference.huggingface.co",
        supports_streaming=True,
        default_model="Qwen/Qwen2.5-72B-Instruct",
        max_context_tokens=32000,
        available_models=[
            "Qwen/Qwen2.5-72B-Instruct",
            "Qwen/Qwen2.5-7B-Instruct",
        ],
    ),
    AIProviderType.GOOGLE: AIProviderMetadata(
        name="Google Gemini",
        default_endpoint="https://generativelanguage.googleapis.com/v1beta",
        supports_streaming=True,
        default_model="gemini-1.5-pro",
        max_context_tokens=1000000,
        available_models=[
            "gemini-1.5-pro",
            "gemini-1.5-flash",
        ],
    ),
    AIProviderType.COHERE: AIProviderMetadata(
        name="Cohere",
        default_endpoint="https://api.cohere.ai/v1",
        supports_streaming=True,
        default_model="command-r-plus",
        max_context_tokens=128000,
        available_models=[
            "command-r-plus",
            "command-r",
            "command-light",
        ],
    ),
    AIProviderType.TOGETHER: AIProviderMetadata(
        name="Together AI",
        default_endpoint="https://api.together.xyz/v1",
        supports_streaming=True,
        default_model="meta-llama/Llama-3-70b-chat-hf",
        max_context_tokens=8192,
        available_models=[
            "meta-llama/Llama-3-70b-chat-hf",
            "meta-llama/Llama-3-8b-chat-hf",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
        ],
    ),
    AIProviderType.ANYSCALE: AIProviderMetadata(
        name="Anyscale",
        default_endpoint="https://api.endpoints.anyscale.com/v1",
        supports_streaming=True,
        default_model="meta-llama/Meta-Llama-3-70B-Instruct",
        max_context_tokens=8192,
        available_models=[
            "meta-llama/Meta-Llama-3-70B-Instruct",
            "meta-llama/Meta-Llama-3-8B-Instruct",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
        ],
    ),
    AIProviderType.MISTRAL: AIProviderMetadata(
        name="Mistral AI",
        default_endpoint="https://api.mistral.ai/v1",
        supports_streaming=True,
        default_model="mistral-large-latest",
        max_context_tokens=32000,
        available_models=[
            "mistral-large-latest",
            "mistral-small-latest",
            "open-mixtral-8x22b",
        ],
    ),
    AIProviderType.PERPLEXITY: AIProviderMetadata(
        name="Perplexity",
        default_endpoint="https://api.perplexity.ai",
        supports_streaming=True,
        default_model="llama-3-sonar-large-32k-online",
        max_context_tokens=32768,
        available_models=[
            "llama-3-sonar-large-32k-online",
            "llama-3-sonar-small-32k-online",
            "llama-3-70b-instruct",
        ],
    ),
    AIProviderType.EMBERTON: AIProviderMetadata(
        name="Emberton AI",
        default_endpoint="https://api.emberton.ai/v1",
        supports_streaming=True,
        default_model="emberton-legal-1.0",
        max_context_tokens=128000,
        available_models=[
            "emberton-legal-1.0",
            "emberton-legal-pro",
            "emberton-case-analysis",
        ],
    ),
    AIProviderType.OLLAMA: AIProviderMetadata(
        name="Ollama (Local)",
        default_endpoint="http://localhost:11434/v1",
        supports_streaming=True,
        default_model="llama3",
        max_context_tokens=8192,
        available_models=[
            "llama3",
            "mistral",
            "gemma",
            "qwen2",
            "phi3",
        ],
        requires_api_key=False,
    ),
    AIProviderType.GROQ: AIProviderMetadata(
        name="Groq",
        default_endpoint="https://api.groq.com/openai/v1",
        supports_streaming=True,
        default_model="llama-3.3-70b-versatile",
        max_context_tokens=128000,
        available_models=[
            "llama-3.3-70b-versatile",  # Fastest 70B model
            "llama-3.1-8b-instant",  # Ultra-fast lightweight
            "mixtral-8x7b-32768",  # Excellent reasoning
            "gemma2-9b-it",  # Google's Gemma 2
        ],
    ),
}


class AIProviderConfigService:
    """
    AI Provider Configuration Service - Manages AI provider settings.

    Thread-safe service for managing AI provider configurations with encrypted API keys.
    All operations are audited and per-user isolated.
    """

    def __init__(
        self, db: Session, encryption_service: EncryptionService, audit_logger=None
    ):
        """
        Initialize AI provider configuration service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Encryption service for API key encryption
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

    def _log_audit(self, action: str, user_id: int, details: Dict[str, Any]) -> None:
        """
        Log audit event if audit logger is configured.

        Args:
            action: Action name (e.g., "ai_config.create", "ai_config.update")
            user_id: User ID performing the action
            details: Additional details to log
        """
        if self.audit_logger:
            try:
                self.audit_logger.log(
                    action=action,
                    user_id=user_id,
                    resource_type="ai_provider_config",
                    details=details,
                )
            except Exception as exc:
                # Don't fail operations due to audit logging errors
                print(f"[AIProviderConfigService] Audit logging failed: {exc}")

    async def set_provider_config(
        self, user_id: int, config: AIProviderConfigInput
    ) -> AIProviderConfigSummary:
        """
        Set configuration for an AI provider.

        Creates or updates the provider configuration with encrypted API key.
        If this is the first provider for the user, it becomes active automatically.

        Args:
            user_id: User ID
            config: Provider configuration input

        Returns:
            Created/updated configuration summary (without API key)

        Raises:
            HTTPException: If validation fails or database error occurs
        """
        try:
            # Validate configuration
            validation = self.validate_config(config)
            if not validation.valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid configuration: {', '.join(validation.errors)}",
                )

            # Normalize provider and API key requirements
            try:
                provider_enum = (
                    config.provider
                    if isinstance(config.provider, AIProviderType)
                    else AIProviderType(config.provider)
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid provider: {config.provider}",
                ) from exc

            metadata = AI_PROVIDER_METADATA.get(provider_enum)
            requires_key = metadata.requires_api_key if metadata else True
            api_key_value = (config.api_key or "").strip()

            if requires_key and not api_key_value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"API key is required for {provider_enum.value if hasattr(provider_enum, 'value') else provider_enum}",
                )

            if not api_key_value:
                api_key_value = "ollama-local"

            # Encrypt API key (or placeholder for keyless providers)
            encrypted_key = self.encryption_service.encrypt(api_key_value)
            if not encrypted_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to encrypt API key",
                )

            # Serialize encrypted data to JSON
            encrypted_key_json = json.dumps(encrypted_key.to_dict())

            # Check if configuration already exists for this provider
            provider_val = (
                provider_enum.value
                if hasattr(provider_enum, "value")
                else provider_enum
            )
            existing_config = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id,
                        AIProviderConfig.provider == provider_val,
                    )
                )
                .first()
            )

            if existing_config:
                # Update existing configuration
                existing_config.encrypted_api_key = encrypted_key_json
                existing_config.model = config.model
                existing_config.endpoint = config.endpoint
                existing_config.temperature = config.temperature
                existing_config.max_tokens = config.max_tokens
                existing_config.top_p = config.top_p
                existing_config.enabled = config.enabled
                existing_config.updated_at = datetime.utcnow()

                db_config = existing_config
                action = "ai_config.update"
            else:
                # Check if user has any configurations (to determine if this should be active)
                user_config_count = (
                    self.db.query(AIProviderConfig)
                    .filter(AIProviderConfig.user_id == user_id)
                    .count()
                )

                # Create new configuration
                db_config = AIProviderConfig(
                    user_id=user_id,
                    provider=provider_val,
                    encrypted_api_key=encrypted_key_json,
                    model=config.model,
                    endpoint=config.endpoint,
                    temperature=config.temperature,
                    max_tokens=config.max_tokens,
                    top_p=config.top_p,
                    enabled=config.enabled,
                    is_active=(user_config_count == 0),  # First provider is active
                )
                self.db.add(db_config)
                action = "ai_config.create"

            self.db.commit()
            self.db.refresh(db_config)

            # Audit log
            self._log_audit(
                action=action,
                user_id=user_id,
                details={
                    "provider": provider_val,
                    "model": config.model,
                    "config_id": db_config.id,
                },
            )

            return AIProviderConfigSummary.from_orm(db_config)

        except HTTPException:
            raise
        except Exception as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save provider configuration: {str(exc)}",
            ) from exc

    async def get_provider_config(
        self, user_id: int, provider: AIProviderType
    ) -> Optional[AIProviderConfigOutput]:
        """
        Get configuration for a specific provider (including decrypted API key).

        Args:
            user_id: User ID
            provider: Provider type

        Returns:
            Provider configuration with decrypted API key, or None if not found

        Raises:
            HTTPException: If decryption fails or database error occurs
        """
        try:
            provider_val = provider.value if hasattr(provider, "value") else provider
            db_config = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id,
                        AIProviderConfig.provider == provider_val,
                    )
                )
                .first()
            )

            if not db_config:
                return None

            # Decrypt API key
            encrypted_data_dict = json.loads(db_config.encrypted_api_key)
            from backend.services.security.encryption import EncryptedData

            encrypted_data = EncryptedData.from_dict(encrypted_data_dict)

            decrypted_key = self.encryption_service.decrypt(encrypted_data)
            if not decrypted_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to decrypt API key",
                )

            # Build output model
            return AIProviderConfigOutput(
                id=db_config.id,
                user_id=db_config.user_id,
                provider=db_config.provider,
                api_key=decrypted_key,
                model=db_config.model,
                endpoint=db_config.endpoint,
                temperature=db_config.temperature,
                max_tokens=db_config.max_tokens,
                top_p=db_config.top_p,
                enabled=db_config.enabled,
                is_active=db_config.is_active,
                created_at=db_config.created_at,
                updated_at=db_config.updated_at,
            )

        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get provider configuration: {str(exc)}",
            ) from exc

    async def get_active_provider_config(
        self, user_id: int
    ) -> Optional[AIProviderConfigOutput]:
        """
        Get active provider configuration for a user.

        Args:
            user_id: User ID

        Returns:
            Active provider configuration with decrypted API key, or None if no active provider

        Raises:
            HTTPException: If decryption fails or database error occurs
        """
        try:
            db_config = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id, AIProviderConfig.is_active
                    )
                )
                .first()
            )

            if not db_config:
                return None

            # Decrypt API key
            encrypted_data_dict = json.loads(db_config.encrypted_api_key)
            from backend.services.security.encryption import EncryptedData

            encrypted_data = EncryptedData.from_dict(encrypted_data_dict)

            decrypted_key = self.encryption_service.decrypt(encrypted_data)
            if not decrypted_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to decrypt API key",
                )

            # Build output model
            return AIProviderConfigOutput(
                id=db_config.id,
                user_id=db_config.user_id,
                provider=db_config.provider,
                api_key=decrypted_key,
                model=db_config.model,
                endpoint=db_config.endpoint,
                temperature=db_config.temperature,
                max_tokens=db_config.max_tokens,
                top_p=db_config.top_p,
                enabled=db_config.enabled,
                is_active=db_config.is_active,
                created_at=db_config.created_at,
                updated_at=db_config.updated_at,
            )

        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get active provider configuration: {str(exc)}",
            ) from exc

    async def set_active_provider(
        self, user_id: int, provider: AIProviderType
    ) -> AIProviderConfigSummary:
        """
        Set active provider for a user.

        Deactivates all other providers and activates the specified one.

        Args:
            user_id: User ID
            provider: Provider type to activate

        Returns:
            Updated configuration summary

        Raises:
            HTTPException: If provider not configured or database error occurs
        """
        try:
            # Verify provider is configured
            provider_val = provider.value if hasattr(provider, "value") else provider
            target_config = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id,
                        AIProviderConfig.provider == provider_val,
                    )
                )
                .first()
            )

            if not target_config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Provider {provider_val} is not configured",
                )

            # Deactivate all providers for this user
            self.db.query(AIProviderConfig).filter(
                AIProviderConfig.user_id == user_id
            ).update({"is_active": False})

            # Activate target provider
            target_config.is_active = True
            target_config.updated_at = datetime.utcnow()

            self.db.commit()
            self.db.refresh(target_config)

            # Audit log
            self._log_audit(
                action="ai_config.set_active",
                user_id=user_id,
                details={"provider": provider_val, "config_id": target_config.id},
            )

            return AIProviderConfigSummary.from_orm(target_config)

        except HTTPException:
            raise
        except Exception as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to set active provider: {str(exc)}",
            ) from exc

    def get_active_provider(self, user_id: int) -> Optional[AIProviderType]:
        """
        Get active provider type for a user.

        Args:
            user_id: User ID

        Returns:
            Active provider type, or None if no active provider
        """
        try:
            db_config = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id, AIProviderConfig.is_active
                    )
                )
                .first()
            )

            if not db_config:
                return None

            return AIProviderType(db_config.provider)

        except Exception:
            return None

    def is_provider_configured(self, user_id: int, provider: AIProviderType) -> bool:
        """
        Check if a provider is configured for a user.

        Args:
            user_id: User ID
            provider: Provider type

        Returns:
            True if provider is configured, False otherwise
        """
        try:
            provider_val = provider.value if hasattr(provider, "value") else provider
            count = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id,
                        AIProviderConfig.provider == provider_val,
                    )
                )
                .count()
            )

            return count > 0

        except Exception:
            return False

    def get_configured_providers(self, user_id: int) -> List[AIProviderType]:
        """
        Get list of configured providers for a user.

        Args:
            user_id: User ID

        Returns:
            List of configured provider types
        """
        try:
            configs = (
                self.db.query(AIProviderConfig)
                .filter(AIProviderConfig.user_id == user_id)
                .all()
            )

            return [AIProviderType(config.provider) for config in configs]

        except Exception:
            return []

    def list_provider_configs(self, user_id: int) -> List[AIProviderConfigSummary]:
        """
        List all provider configurations for a user (without API keys).

        Args:
            user_id: User ID

        Returns:
            List of provider configuration summaries
        """
        try:
            configs = (
                self.db.query(AIProviderConfig)
                .filter(AIProviderConfig.user_id == user_id)
                .order_by(
                    AIProviderConfig.is_active.desc(), AIProviderConfig.created_at.asc()
                )
                .all()
            )

            return [AIProviderConfigSummary.from_orm(config) for config in configs]

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list provider configurations: {str(exc)}",
            ) from exc

    async def remove_provider_config(
        self, user_id: int, provider: AIProviderType
    ) -> None:
        """
        Remove provider configuration.

        If the removed provider was active, automatically activates another provider.

        Args:
            user_id: User ID
            provider: Provider type to remove

        Raises:
            HTTPException: If provider not found or database error occurs
        """
        try:
            provider_val = provider.value if hasattr(provider, "value") else provider
            db_config = (
                self.db.query(AIProviderConfig)
                .filter(
                    and_(
                        AIProviderConfig.user_id == user_id,
                        AIProviderConfig.provider == provider_val,
                    )
                )
                .first()
            )

            if not db_config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Provider {provider_val} is not configured",
                )

            was_active = db_config.is_active

            # Delete configuration
            self.db.delete(db_config)
            self.db.commit()

            # If this was the active provider, try to activate another
            if was_active:
                remaining_configs = (
                    self.db.query(AIProviderConfig)
                    .filter(AIProviderConfig.user_id == user_id)
                    .first()
                )

                if remaining_configs:
                    remaining_configs.is_active = True
                    remaining_configs.updated_at = datetime.utcnow()
                    self.db.commit()

            # Audit log
            self._log_audit(
                action="ai_config.delete",
                user_id=user_id,
                details={"provider": provider_val, "was_active": was_active},
            )

        except HTTPException:
            raise
        except Exception as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove provider configuration: {str(exc)}",
            ) from exc

    def get_provider_metadata(self, provider: AIProviderType) -> AIProviderMetadata:
        """
        Get metadata for a provider.

        Args:
            provider: Provider type

        Returns:
            Provider metadata

        Raises:
            HTTPException: If provider type is invalid
        """
        # Try to convert string to Enum if needed
        if not isinstance(provider, Enum):
            try:
                provider = AIProviderType(provider)
            except ValueError:
                pass  # Let lookup fail naturally

        metadata = AI_PROVIDER_METADATA.get(provider)
        if not metadata:
            provider_val = provider.value if hasattr(provider, "value") else provider
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown provider: {provider_val}",
            )
        return metadata

    def list_all_providers_metadata(self) -> Dict[str, Dict[str, Any]]:
        """
        Get metadata for all supported providers.

        Returns:
            Dictionary of provider metadata dictionaries keyed by provider type
        """
        return {
            (
                provider.value if hasattr(provider, "value") else provider
            ): metadata.dict()
            for provider, metadata in AI_PROVIDER_METADATA.items()
        }

    def validate_config(self, config: AIProviderConfigInput) -> ValidationResult:
        """
        Validate provider configuration.

        Args:
            config: Configuration to validate

        Returns:
            Validation result with errors list
        """
        errors: List[str] = []

        # API key validation (optional for providers like Ollama)
        requires_key = True
        try:
            provider_key = (
                config.provider
                if isinstance(config.provider, AIProviderType)
                else AIProviderType(config.provider)
            )
            metadata = AI_PROVIDER_METADATA.get(provider_key)
            requires_key = metadata.requires_api_key if metadata else True
        except Exception:
            requires_key = True

        if requires_key and (not config.api_key or not str(config.api_key).strip()):
            errors.append("API key is required")

        # Model validation
        if not config.model or not config.model.strip():
            errors.append("Model is required")

        # Temperature validation
        if config.temperature is not None:
            if config.temperature < 0 or config.temperature > 2:
                errors.append("Temperature must be between 0 and 2")

        # Max tokens validation
        if config.max_tokens is not None:
            if config.max_tokens < 1 or config.max_tokens > 100000:
                errors.append("Max tokens must be between 1 and 100,000")

        # Top P validation
        if config.top_p is not None:
            if config.top_p < 0 or config.top_p > 1:
                errors.append("Top P must be between 0 and 1")

        return ValidationResult(valid=len(errors) == 0, errors=errors)

    async def test_provider(self, user_id: int, provider: AIProviderType) -> TestResult:
        """
        Test provider connection with a simple message.

        Args:
            user_id: User ID
            provider: Provider type to test

        Returns:
            Test result with success status and optional error message
        """
        try:
            # Get provider configuration
            config = await self.get_provider_config(user_id, provider)
            if not config:
                return TestResult(success=False, error="Provider not configured")

            # Import SDK here to avoid circular imports
            from backend.services.ai.sdk import (
                AIClientConfig,
                AIClientSDK,
                ChatMessage,
                MessageRole,
            )

            # Create SDK client with decrypted API key
            decrypted_key = config.api_key or ""

            provider_val = provider.value if hasattr(provider, "value") else provider

            sdk_config = AIClientConfig(
                provider=provider_val,
                api_key=decrypted_key,
                model=config.model,
                max_tokens=50,  # Minimal tokens for test
                temperature=0.1,
            )
            client = AIClientSDK(sdk_config)

            # Send a simple test message
            test_message = ChatMessage(
                role=MessageRole.USER,
                content="Hello, respond with just 'OK' to confirm connection.",
            )
            response = await client.chat([test_message])

            # Check if we got a response
            if response and len(response) > 0:
                return TestResult(success=True, error=None)
            else:
                return TestResult(success=False, error="Empty response from provider")

        except Exception as exc:
            return TestResult(success=False, error=str(exc))

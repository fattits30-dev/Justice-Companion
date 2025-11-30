"""AI Provider Configuration model for storing AI service provider settings."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Dict, Any, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from sqlalchemy.sql import func

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.user import User


class AIProvider(str, Enum):
    """Supported AI providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    HUGGINGFACE = "huggingface"
    QWEN = "qwen"
    GOOGLE = "google"
    COHERE = "cohere"
    TOGETHER = "together"
    ANYSCALE = "anyscale"
    MISTRAL = "mistral"
    PERPLEXITY = "perplexity"


# Parameter constraints
TEMPERATURE_MIN = 0.0
TEMPERATURE_MAX = 2.0
TOP_P_MIN = 0.0
TOP_P_MAX = 1.0
MAX_TOKENS_MIN = 1
MAX_TOKENS_MAX = 1000000  # Reasonable upper limit


class AIProviderConfig(Base):
    """
    AI Provider Configuration model - stores encrypted API keys and settings for AI providers.

    Supports the following AI providers:
    - OpenAI, Anthropic, Hugging Face, Qwen, Google, Cohere, Together, Anyscale, Mistral, Perplexity

    Security:
    - API keys stored encrypted using EncryptionService
    - Per-user configuration isolation
    - Audit logging for all changes

    Parameter constraints:
    - temperature: [{TEMPERATURE_MIN:.1f}, {TEMPERATURE_MAX:.1f}]
    - max_tokens: [{MAX_TOKENS_MIN}, {MAX_TOKENS_MAX:,}]
    - top_p: [{TOP_P_MIN:.1f}, {TOP_P_MAX:.1f}]

    Schema:
    - id: Auto-incrementing primary key
    - user_id: Foreign key to users table
    - provider: Provider type (enum values: openai, anthropic, etc.)
    - encrypted_api_key: Encrypted API key (JSON format from EncryptionService)
    - model: AI model name (e.g., "gpt-4-turbo", "claude-3-5-sonnet-20241022")
    - endpoint: Optional custom endpoint URL
    - temperature: Optional temperature parameter
    - max_tokens: Optional max tokens limit
    - top_p: Optional top_p parameter
    - enabled: Whether this configuration is enabled
    - is_active: Whether this is the active provider for the user
    - created_at: Configuration creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "ai_provider_configs"

    # Table constraints
    __table_args__ = (
        # Ensure only one active provider per user
        # NOTE: SQLite doesn't support subqueries in CHECK constraints, so this is enforced at the application level
        # CheckConstraint(
        #     "CASE WHEN is_active = true THEN "
        #     "(SELECT COUNT(*) FROM ai_provider_configs apc2 "
        #     "WHERE apc2.user_id = user_id AND apc2.is_active = true) = 1 "
        #     "ELSE (SELECT COUNT(*) FROM ai_provider_configs apc2 "
        #     "WHERE apc2.user_id = user_id AND apc2.is_active = true) <= 1 END",
        #     name="single_active_provider_per_user"
        # ),
        # Parameter value constraints
        CheckConstraint(
            f"temperature IS NULL OR (temperature >= {TEMPERATURE_MIN} AND "
            f"temperature <= {TEMPERATURE_MAX})",
            name="temperature_range"
        ),
        CheckConstraint(
            f"top_p IS NULL OR (top_p >= {TOP_P_MIN} AND top_p <= {TOP_P_MAX})",
            name="top_p_range"
        ),
        CheckConstraint(
            f"max_tokens IS NULL OR (max_tokens >= {MAX_TOKENS_MIN} AND "
            f"max_tokens <= {MAX_TOKENS_MAX})",
            name="max_tokens_range"
        ),
        # Provider constraint - dynamically build from enum
        CheckConstraint(
            "provider IN ('openai', 'anthropic', 'huggingface', 'qwen', "
            "'google', 'cohere', 'together', 'anyscale', 'mistral', 'perplexity')",
            name="valid_provider"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(
        String, nullable=False, index=True
    )
    encrypted_api_key: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    endpoint: Mapped[str | None] = mapped_column(String, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_p: Mapped[float | None] = mapped_column(Float, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="ai_provider_configs")

    # Property getters for status checks
    @property
    def is_enabled(self) -> bool:
        """
        Check if this AI provider configuration is enabled and can be used.

        Returns:
            bool: True if the configuration is enabled, False otherwise.
        """
        return self.enabled

    @property
    def is_active_provider(self) -> bool:
        """
        Check if this is the currently active AI provider for the user.

        Returns:
            bool: True if this is the active provider, False otherwise.
        """
        return self.is_active

    @property
    def provider_enum(self) -> AIProvider:
        """
        Get the provider as an enum value.

        Returns:
            AIProvider: The provider enum value.

        Raises:
            ValueError: If the provider value is not a valid enum member.
        """
        return AIProvider(self.provider)

    # Field validators
    @validates('provider')
    def validate_provider(self, key: str, value: str) -> str:
        """Validate that the provider is supported."""
        try:
            AIProvider(value)  # This will raise ValueError if invalid
        except ValueError:
            valid_providers = [p.value for p in AIProvider]
            raise ValueError(f"Invalid provider '{value}'. Must be one of: {valid_providers}")
        return value

    @validates('temperature')
    def validate_temperature(self, key: str, value: Optional[float]) -> Optional[float]:
        """Validate temperature parameter range."""
        if value is not None and not (TEMPERATURE_MIN <= value <= TEMPERATURE_MAX):
            raise ValueError(
                f"temperature must be between {TEMPERATURE_MIN} and {TEMPERATURE_MAX}, got {value}"
            )
        return value

    @validates('top_p')
    def validate_top_p(self, key: str, value: Optional[float]) -> Optional[float]:
        """Validate top_p parameter range."""
        if value is not None and not (TOP_P_MIN <= value <= TOP_P_MAX):
            raise ValueError(
                f"top_p must be between {TOP_P_MIN} and {TOP_P_MAX}, got {value}"
            )
        return value

    @validates('max_tokens')
    def validate_max_tokens(self, key: str, value: Optional[int]) -> Optional[int]:
        """Validate max_tokens parameter range."""
        if value is not None and not (MAX_TOKENS_MIN <= value <= MAX_TOKENS_MAX):
            raise ValueError(
                f"max_tokens must be between {MAX_TOKENS_MIN} and {MAX_TOKENS_MAX:,}, got {value}"
            )
        return value

    # Utility methods
    def get_parameter_constraints(self) -> Dict[str, Dict[str, float]]:
        """
        Get the parameter constraints for this configuration.

        Returns:
            dict: Dictionary containing parameter constraints.
        """
        return {
            "temperature": {"min": TEMPERATURE_MIN, "max": TEMPERATURE_MAX},
            "top_p": {"min": TOP_P_MIN, "max": TOP_P_MAX},
            "max_tokens": {"min": MAX_TOKENS_MIN, "max": MAX_TOKENS_MAX},
        }

    def validate_parameters(self) -> None:
        """
        Validate all parameters in this configuration.

        Raises:
            ValueError: If any parameter is out of range.
        """
        self.validate_temperature("temperature", self.temperature)
        self.validate_top_p("top_p", self.top_p)
        self.validate_max_tokens("max_tokens", self.max_tokens)

    def get_safe_model_config(self) -> Dict[str, Any]:
        """
        Get model configuration parameters (excluding sensitive data).
        Useful for passing to AI service clients.

        Returns:
            dict: Safe configuration dict with parameters only.
        """
        return {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "endpoint": self.endpoint,
        }

    # Class methods
    @classmethod
    def get_supported_providers(cls) -> list[str]:
        """
        Get list of all supported AI providers.

        Returns:
            list: List of supported provider strings.
        """
        return [provider.value for provider in AIProvider]

    @classmethod
    def get_provider_enum(cls, provider_name: str) -> AIProvider:
        """
        Get AIProvider enum from string name.

        Args:
            provider_name: String name of the provider.

        Returns:
            AIProvider: The corresponding enum value.

        Raises:
            ValueError: If provider_name is not a valid provider.
        """
        return AIProvider(provider_name)

    def to_dict(self) -> Dict[str, Any]:
        """
        Get a dictionary representation of the configuration excluding sensitive data.

        Returns:
            dict: Configuration data without encrypted API key.
        """
        try:
            return {
                "id": self.id,
                "user_id": self.user_id,
                "provider": self.provider,
                "model": self.model,
                "endpoint": self.endpoint,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
                "top_p": self.top_p,
                "enabled": self.enabled,
                "is_active": self.is_active,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "updated_at": self.updated_at.isoformat() if self.updated_at else None,
                "constraints": self.get_parameter_constraints(),
            }
        except (AttributeError, ValueError):
            # Fallback to basic dict if isoformat fails or other issues
            return {
                "id": self.id,
                "user_id": self.user_id,
                "provider": self.provider,
                "model": self.model,
                "endpoint": self.endpoint,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
                "top_p": self.top_p,
                "enabled": self.enabled,
                "is_active": self.is_active,
                "created_at": str(self.created_at) if self.created_at else None,
                "updated_at": str(self.updated_at) if self.updated_at else None,
                "constraints": self.get_parameter_constraints(),
            }

    def __repr__(self):
        return (
            "<AIProviderConfig("
            f"id={self.id}, user_id={self.user_id}, provider={self.provider}, "
            f"model={self.model}, is_active={self.is_active})>"
        )

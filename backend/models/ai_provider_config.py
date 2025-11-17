"""
AI Provider Configuration model for storing AI service provider settings.
Based on TypeScript AIProviderConfigService.ts
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base


class AIProviderConfig(Base):
    """
    AI Provider Configuration model - stores encrypted API keys and settings for AI providers.

    Supports 10 AI providers:
    - OpenAI, Anthropic, Hugging Face, Qwen, Google, Cohere, Together, Anyscale, Mistral, Perplexity

    Security:
    - API keys stored encrypted using EncryptionService
    - Per-user configuration isolation
    - Audit logging for all changes

    Schema:
    - id: Auto-incrementing primary key
    - user_id: Foreign key to users table
    - provider: Provider type (openai, anthropic, etc.)
    - encrypted_api_key: Encrypted API key (JSON format from EncryptionService)
    - model: AI model name (e.g., "gpt-4-turbo", "claude-3-5-sonnet-20241022")
    - endpoint: Optional custom endpoint URL
    - temperature: Optional temperature parameter (0-2)
    - max_tokens: Optional max tokens limit
    - top_p: Optional top_p parameter (0-1)
    - enabled: Whether this configuration is enabled
    - is_active: Whether this is the active provider for the user
    - created_at: Configuration creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "ai_provider_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider = Column(String, nullable=False, index=True)  # openai, anthropic, etc.
    encrypted_api_key = Column(String, nullable=False)  # Encrypted with EncryptionService
    model = Column(String, nullable=False)  # Model name
    endpoint = Column(String, nullable=True)  # Optional custom endpoint
    temperature = Column(Float, nullable=True)  # Optional temperature (0-2)
    max_tokens = Column(Integer, nullable=True)  # Optional max tokens
    top_p = Column(Float, nullable=True)  # Optional top_p (0-1)
    enabled = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=False)  # Only one active per user
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="ai_provider_configs")

    def __repr__(self):
        return f"<AIProviderConfig(id={self.id}, user_id={self.user_id}, provider={self.provider}, model={self.model}, is_active={self.is_active})>"

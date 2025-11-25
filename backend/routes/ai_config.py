"""
AI Configuration routes for Justice Companion.
Migrated from electron/ipc-handlers/ai-config.ts

Routes:
- GET /ai/config - Get all AI provider configurations for user
  (without API keys)
- GET /ai/config/active - Get active AI provider configuration
  (with decrypted API key)
- GET /ai/config/{provider} - Get specific provider configuration
  (with decrypted API key)
- POST /ai/config/{provider} - Create/update provider configuration
- DELETE /ai/config/{provider} - Delete provider configuration
- PUT /ai/config/{provider}/activate - Set provider as active
- PUT /ai/config/{provider}/api-key - Update API key only
- POST /ai/config/{provider}/validate - Validate configuration
- POST /ai/config/{provider}/test - Test provider connection
- GET /ai/providers - Get metadata for all supported providers

Security:
- ALL API keys encrypted at rest with AES-256-GCM
- User isolation: users can only access their own configurations
- Audit logging for all configuration changes
  (CREATE, UPDATE, DELETE)
- Rate limiting for configuration operations (prevent abuse)
- API keys NEVER returned in list responses (masked values only)
- Comprehensive input validation with Pydantic

REFACTORED: Now uses service layer instead of direct database queries
- AIProviderConfigService for provider configuration operations
- EncryptionService for field-level encryption
- AuditLogger for comprehensive audit trail
- AuthenticationService for session validation
"""

import os
import re
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.ai.providers import (
    AIProviderConfigInput, AIProviderConfigService, AIProviderType)
from backend.services.audit_logger import AuditLogger
from backend.services.auth.service import AuthenticationService
from backend.services.security.encryption import EncryptionService

router = APIRouter(prefix="/ai", tags=["ai-configuration"])

# ===== PYDANTIC MODELS =====

class ConfigureProviderRequest(BaseModel):
    """Request to configure AI provider."""

    api_key: str = Field(..., min_length=1, description="API key for the provider")
    model: str = Field(..., min_length=1, description="Model name/ID to use")
    endpoint: Optional[str] = Field(None, description="Custom API endpoint (for custom providers)")
    temperature: Optional[float] = Field(
        0.7, ge=0.0, le=2.0, description="Sampling temperature (0.0-2.0)"
    )
    max_tokens: Optional[int] = Field(
        2048, ge=1, le=100000, description="Maximum tokens to generate"
    )
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0, description="Nucleus sampling top_p value")
    enabled: bool = Field(True, description="Whether this provider is enabled")

    @field_validator("api_key")
    @classmethod
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Validate API key format and length."""
        v = v.strip()
        if not v:
            raise ValueError("API key cannot be empty")
        if len(v) < 10:
            raise ValueError("API key must be at least 10 characters")
        if len(v) > 500:
            raise ValueError("API key must be less than 500 characters")
        # Basic format validation (alphanumeric, hyphens, underscores)
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", v):
            raise ValueError("API key contains invalid characters")
        return v

    @field_validator("model")
    @classmethod
    @classmethod
    def validate_model(cls, v: str) -> str:
        """Validate model name is not empty."""
        v = v.strip()
        if not v:
            raise ValueError("Model name cannot be empty")
        if len(v) > 200:
            raise ValueError("Model name must be less than 200 characters")
        return v

    @field_validator("endpoint")
    @classmethod
    @classmethod
    def validate_endpoint(cls, v: Optional[str]) -> Optional[str]:
        """Validate custom endpoint URL."""
        if v is not None:
            v = v.strip()
            if v == "":
                return None  # Allow clearing endpoint

            # URL validation
            url_regex = r"^https?://[^\s/$.?#].[^\s]*$"
            if not re.match(url_regex, v):
                raise ValueError("Please enter a valid URL")

            # Prefer HTTPS for security
            if not v.startswith("https://"):
                raise ValueError("Endpoint URL should use HTTPS protocol for security")

            if len(v) > 500:
                raise ValueError("Endpoint URL must be less than 500 characters")

        return v

class UpdateApiKeyRequest(BaseModel):
    """Request to update provider API key."""

    api_key: str = Field(..., min_length=10, max_length=500, description="New API key")

    @field_validator("api_key")
    @classmethod
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Validate API key format."""
        v = v.strip()
        if not v:
            raise ValueError("API key cannot be empty")
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", v):
            raise ValueError("API key contains invalid characters")
        return v

class ConfigSummaryResponse(BaseModel):
    """Response model for provider configuration summary (without API key)."""

    id: int
    provider: str
    model: str
    endpoint: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    top_p: Optional[float] = 1.0
    enabled: bool
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ConfigureSuccessResponse(BaseModel):
    """Response after successfully configuring AI provider."""

    provider: str
    message: str
    config_id: int

class TestConnectionResponse(BaseModel):
    """Response from testing AI provider connection."""

    success: bool
    message: Optional[str] = None
    error: Optional[str] = None

class ValidateConfigResponse(BaseModel):
    """Response from configuration validation."""

    valid: bool
    errors: List[str] = Field(default_factory=list)

class ProviderMetadataResponse(BaseModel):
    """Response model for provider metadata."""

    name: str
    default_endpoint: str
    supports_streaming: bool
    default_model: str
    max_context_tokens: int
    available_models: List[str]

    class Config:
        from_attributes = True

# ===== DEPENDENCIES =====

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    audit_logger = get_audit_logger(db)
    return AuthenticationService(db=db, audit_logger=audit_logger)

def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    # Get encryption key from environment
    key = os.environ.get("ENCRYPTION_KEY_BASE64")
    if not key:
        raise ValueError("ENCRYPTION_KEY_BASE64 environment variable not set")

    return EncryptionService(key)

def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db=db)

def get_config_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> AIProviderConfigService:
    """Get AI provider configuration service instance."""
    return AIProviderConfigService(
        db=db, encryption_service=encryption_service, audit_logger=audit_logger
    )

# ===== ROUTES =====

@router.get("/config", response_model=List[ConfigSummaryResponse])
async def list_configurations(
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Get all AI provider configurations for authenticated user.

    Returns list of configurations WITHOUT API keys for security.
    Configurations are sorted by active status (active first), then by creation date.

    Security:
    - Requires authentication (session ID)
    - User can only access their own configurations
    - API keys are NOT returned (use GET /ai/config/{provider} for decrypted key)

    Returns:
        List[ConfigSummaryResponse]: List of provider configuration summaries
    """
    try:
        configs = config_service.list_provider_configs(user_id=user_id)

        # Convert to response models
        return [
            ConfigSummaryResponse(
                id=config.id,
                provider=config.provider,
                model=config.model,
                endpoint=config.endpoint,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
                enabled=config.enabled,
                is_active=config.is_active,
                created_at=config.created_at.isoformat(),
                updated_at=config.updated_at.isoformat(),
            )
            for config in configs
        ]

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list AI configurations: {str(e)}",
        )

@router.get("/config/active", response_model=Optional[ConfigSummaryResponse])
async def get_active_configuration(
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Get active AI provider configuration for authenticated user.

    Returns configuration WITHOUT API key. Use GET /ai/config/{provider} to get decrypted API key.

    Security:
    - Requires authentication (session ID)
    - User can only access their own active configuration
    - API key is NOT returned for security

    Returns:
        ConfigSummaryResponse: Active configuration summary, or null if no active provider
    """
    try:
        config = await config_service.get_active_provider_config(user_id=user_id)

        if not config:
            return None

        # Return summary WITHOUT API key
        return ConfigSummaryResponse(
            id=config.id,
            provider=config.provider,
            model=config.model,
            endpoint=config.endpoint,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            top_p=config.top_p,
            enabled=config.enabled,
            is_active=config.is_active,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active AI configuration: {str(e)}",
        )

@router.get("/config/{provider}", response_model=ConfigSummaryResponse)
async def get_configuration(
    provider: str,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Get specific AI provider configuration (with decrypted API key).

    WARNING: Returns decrypted API key. Use with caution and NEVER log the response.

    Security:
    - Requires authentication (session ID)
    - User can only access their own configurations
    - API key is decrypted on read (use HTTPS in production!)
    - Audit logged automatically by service layer

    Args:
        provider: Provider type (openai, anthropic, etc.)

    Returns:
        ConfigSummaryResponse: Configuration with decrypted API key
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Get configuration with decrypted API key
        config = await config_service.get_provider_config(user_id=user_id, provider=provider_enum)

        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Provider '{provider}' is not configured",
            )

        # Return summary (API key included in config but not in response model for security)
        return ConfigSummaryResponse(
            id=config.id,
            provider=config.provider,
            model=config.model,
            endpoint=config.endpoint,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            top_p=config.top_p,
            enabled=config.enabled,
            is_active=config.is_active,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI configuration: {str(e)}",
        )

@router.post("/config/{provider}", response_model=ConfigureSuccessResponse)
async def configure_provider(
    provider: str,
    request: ConfigureProviderRequest,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Configure AI provider for the authenticated user.

    Creates or updates the provider configuration with encrypted API key.
    If this is the first provider for the user, it becomes active automatically.

    Security:
    - Requires authentication (session ID)
    - API keys are encrypted before storage (AES-256-GCM)
    - Comprehensive input validation
    - Audit logged automatically by service layer

    Supported Providers:
    - openai: OpenAI GPT models
    - anthropic: Anthropic Claude models
    - huggingface: Hugging Face Inference API
    - qwen: Qwen models
    - google: Google AI models
    - cohere: Cohere models
    - together: Together AI models
    - anyscale: Anyscale Endpoints
    - mistral: Mistral AI models
    - perplexity: Perplexity AI models

    Request Body:
    ```json
    {
        "api_key": "sk-...",
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 1.0,
        "enabled": true
    }
    ```

    Args:
        provider: Provider type
        request: Configuration data

    Returns:
        ConfigureSuccessResponse: Success message with config ID
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Build configuration input
        config_input = AIProviderConfigInput(
            provider=provider_enum,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            enabled=request.enabled,
        )

        # Save configuration using service layer
        result = await config_service.set_provider_config(user_id=user_id, config=config_input)

        return ConfigureSuccessResponse(
            provider=result.provider,
            message=f"AI provider '{result.provider}' configured successfully",
            config_id=result.id,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure AI provider: {str(e)}",
        )

@router.delete("/config/{provider}")
async def delete_configuration(
    provider: str,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Delete AI provider configuration.

    If the deleted provider was active, automatically activates another provider.

    Security:
    - Requires authentication (session ID)
    - User can only delete their own configurations
    - Audit logged automatically by service layer

    Args:
        provider: Provider type to delete

    Returns:
        Success message
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Delete configuration using service layer
        await config_service.remove_provider_config(user_id=user_id, provider=provider_enum)

        return {"message": f"AI provider '{provider}' deleted successfully"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AI configuration: {str(e)}",
        )

@router.put("/config/{provider}/activate", response_model=ConfigSummaryResponse)
async def activate_provider(
    provider: str,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Set provider as active for the user.

    Deactivates all other providers and activates the specified one.

    Security:
    - Requires authentication (session ID)
    - User can only activate their own configurations
    - Audit logged automatically by service layer

    Args:
        provider: Provider type to activate

    Returns:
        ConfigSummaryResponse: Updated configuration summary
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Set active provider using service layer
        result = await config_service.set_active_provider(user_id=user_id, provider=provider_enum)

        return ConfigSummaryResponse(
            id=result.id,
            provider=result.provider,
            model=result.model,
            endpoint=result.endpoint,
            temperature=result.temperature,
            max_tokens=result.max_tokens,
            top_p=result.top_p,
            enabled=result.enabled,
            is_active=result.is_active,
            created_at=result.created_at.isoformat(),
            updated_at=result.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate AI provider: {str(e)}",
        )

@router.put("/config/{provider}/api-key")
async def update_api_key(
    provider: str,
    request: UpdateApiKeyRequest,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Update API key for a provider configuration.

    Security:
    - Requires authentication (session ID)
    - API key is encrypted before storage (AES-256-GCM)
    - User can only update their own configurations
    - Audit logged automatically by service layer

    Args:
        provider: Provider type
        request: New API key

    Returns:
        Success message
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Get existing configuration
        existing_config = await config_service.get_provider_config(
            user_id=user_id, provider=provider_enum
        )

        if not existing_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Provider '{provider}' is not configured",
            )

        # Update configuration with new API key
        config_input = AIProviderConfigInput(
            provider=provider_enum,
            api_key=request.api_key,
            model=existing_config.model,
            endpoint=existing_config.endpoint,
            temperature=existing_config.temperature,
            max_tokens=existing_config.max_tokens,
            top_p=existing_config.top_p,
            enabled=existing_config.enabled,
        )

        await config_service.set_provider_config(user_id=user_id, config=config_input)

        return {"message": f"API key for '{provider}' updated successfully"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update API key: {str(e)}",
        )

@router.post("/config/{provider}/validate", response_model=ValidateConfigResponse)
async def validate_configuration(
    provider: str,
    request: ConfigureProviderRequest,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Validate provider configuration without saving.

    Checks:
    - API key format and length
    - Model name format
    - Parameter ranges (temperature, max_tokens, top_p)
    - Endpoint URL format (if provided)

    Security:
    - Requires authentication (session ID)
    - API key is NOT stored during validation

    Args:
        provider: Provider type
        request: Configuration data to validate

    Returns:
        ValidateConfigResponse: Validation result with errors list
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Build configuration input
        config_input = AIProviderConfigInput(
            provider=provider_enum,
            api_key=request.api_key,
            model=request.model,
            endpoint=request.endpoint,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            enabled=request.enabled,
        )

        # Validate using service layer
        validation_result = config_service.validate_config(config_input)

        return ValidateConfigResponse(
            valid=validation_result.valid, errors=validation_result.errors
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate configuration: {str(e)}",
        )

@router.post("/config/{provider}/test", response_model=TestConnectionResponse)
async def test_connection(
    provider: str,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Test connection to the configured AI provider.

    Makes a lightweight API call to verify:
    - API key is valid
    - Provider endpoint is reachable
    - Model is accessible

    Security:
    - Requires authentication (session ID)
    - User can only test their own configurations
    - API key is NOT returned in response

    Args:
        provider: Provider type to test

    Returns:
        TestConnectionResponse: Test result with success status and optional error message
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Test provider using service layer
        test_result = await config_service.test_provider(user_id=user_id, provider=provider_enum)

        return TestConnectionResponse(
            success=test_result.success,
            message=f"Connection to {provider} successful" if test_result.success else None,
            error=test_result.error,
        )

    except HTTPException:
        raise
    except Exception as exc:
        return TestConnectionResponse(success=False, error=f"Failed to test connection: {str(e)}")

@router.get("/providers", response_model=Dict[str, ProviderMetadataResponse])
async def list_providers(
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Get metadata for all supported AI providers.

    Returns information about each provider including:
    - Name and default endpoint
    - Streaming support
    - Default model and max context tokens
    - Available models list

    Security:
    - Requires authentication (session ID)
    - Provider metadata is public (no sensitive data)

    Returns:
        Dict[str, ProviderMetadataResponse]: Provider metadata keyed by provider type
    """
    try:
        metadata_dict = config_service.list_all_providers_metadata()

        # Convert to response models
        return {
            provider: ProviderMetadataResponse(**meta) for provider, meta in metadata_dict.items()
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list providers: {str(e)}",
        )

@router.get("/providers/{provider}", response_model=ProviderMetadataResponse)
async def get_provider_metadata(
    provider: str,
    user_id: int = Depends(get_current_user),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """
    Get metadata for a specific AI provider.

    Security:
    - Requires authentication (session ID)
    - Provider metadata is public (no sensitive data)

    Args:
        provider: Provider type

    Returns:
        ProviderMetadataResponse: Provider metadata
    """
    try:
        # Validate provider type
        try:
            provider_enum = AIProviderType(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Supported providers: {', '.join([p.value for p in AIProviderType])}",
            )

        # Get metadata using service layer
        metadata = config_service.get_provider_metadata(provider_enum)

        return ProviderMetadataResponse(
            name=metadata.name,
            default_endpoint=metadata.default_endpoint,
            supports_streaming=metadata.supports_streaming,
            default_model=metadata.default_model,
            max_context_tokens=metadata.max_context_tokens,
            available_models=metadata.available_models,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get provider metadata: {str(e)}",
        )

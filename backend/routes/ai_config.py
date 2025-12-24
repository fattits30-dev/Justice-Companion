"""AI Service Configuration Routes"""

import base64
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id
from backend.models.base import get_db
from backend.services.ai.provider_config import (
    AIProviderConfigInput,
    AIProviderConfigService,
    AIProviderType,
)
from backend.services.audit_logger import AuditLogger
from backend.services.security.encryption import EncryptionService

router = APIRouter(prefix="/ai", tags=["AI Config"])
logger = logging.getLogger(__name__)


# ====================
# Dependency Injection
# ====================


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if encryption_key:
        return EncryptionService(encryption_key)

    ephemeral_key = base64.b64encode(os.urandom(32)).decode("utf-8")
    logger.warning(
        "ENCRYPTION_KEY_BASE64 not set; using an ephemeral key for AI config routes."
    )
    return EncryptionService(ephemeral_key)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)


def get_config_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> AIProviderConfigService:
    """Get AI provider configuration service instance."""
    return AIProviderConfigService(db, encryption_service, audit_logger)


# ====================
# Request Models
# ====================


class SetAPIKeyRequest(BaseModel):
    """Request model for setting API key"""

    api_key: Optional[str] = Field(
        None,
        min_length=10,
        max_length=500,
        pattern=r"^[A-Za-z0-9._-]+$",
        description="Provider API key (alphanumeric, dot, underscore, hyphen)",
    )
    model: Optional[str] = Field(None, description="AI model to use")
    endpoint: Optional[str] = Field(None, max_length=500)
    temperature: Optional[float] = Field(0.3, ge=0, le=2)
    max_tokens: Optional[int] = Field(4096, ge=1, le=100000)
    top_p: Optional[float] = Field(None, ge=0, le=1)


# ====================
# Routes
# ====================


@router.get("/providers")
async def list_providers(
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """List all available AI providers with metadata"""
    metadata = config_service.list_all_providers_metadata()
    return metadata


@router.get("/providers/{provider}")
async def get_provider_metadata(
    provider: str,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Get metadata for a specific provider"""
    try:
        provider_type = AIProviderType(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

    metadata = config_service.get_provider_metadata(provider_type)
    return metadata.dict()


@router.get("/config")
async def list_configs(
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """List all AI provider configurations for the user (without API keys)"""
    configs = config_service.list_provider_configs(user_id)
    return [
        {
            "id": config.id,
            "provider": config.provider,
            "model": config.model,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "is_active": config.is_active,
            "enabled": config.enabled,
        }
        for config in configs
    ]


@router.get("/config/active")
async def get_active_config(
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Get the currently active AI provider configuration"""
    config = await config_service.get_active_provider_config(user_id)

    if not config:
        return {
            "provider": None,
            "enabled": False,
            "message": "No AI provider configured. Configure in Settings.",
        }

    return {
        "provider": config.provider,
        "model": config.model,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
        "is_active": config.is_active,
        "enabled": config.enabled,
    }


class ConfigureProviderRequest(BaseModel):
    """Request model for configuring a provider"""

    api_key: Optional[str] = Field(
        None,
        min_length=10,
        max_length=500,
        pattern=r"^[A-Za-z0-9._-]+$",
        description="Provider API key (alphanumeric, dot, underscore, hyphen)",
    )
    model: str = Field(..., min_length=1, max_length=200)
    endpoint: Optional[str] = Field(None, max_length=500)
    temperature: Optional[float] = Field(0.3, ge=0, le=2)
    max_tokens: Optional[int] = Field(4096, ge=1, le=100000)
    top_p: Optional[float] = Field(None, ge=0, le=1)
    enabled: Optional[bool] = Field(True)


@router.post("/config/{provider}")
async def configure_provider(
    provider: str,
    data: ConfigureProviderRequest,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Configure an AI provider with API key and settings"""
    try:
        # Validate provider
        try:
            provider_type = AIProviderType(provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

        metadata = config_service.get_provider_metadata(provider_type)
        api_key_value = (data.api_key or "").strip() if data.api_key is not None else ""

        if metadata.requires_api_key and not api_key_value:
            raise HTTPException(
                status_code=400, detail=f"{provider} requires an API key"
            )

        # Allow keyless providers (e.g., Ollama) to use a placeholder
        if not api_key_value:
            api_key_value = "ollama-local"

        # Create configuration input
        config_input = AIProviderConfigInput(
            provider=provider_type,
            api_key=api_key_value,
            model=data.model,
            endpoint=data.endpoint,
            temperature=data.temperature,
            max_tokens=data.max_tokens,
            top_p=data.top_p,
            enabled=data.enabled if data.enabled is not None else True,
        )

        # Save configuration (will create or update)
        result = await config_service.set_provider_config(user_id, config_input)

        # Set as active provider
        await config_service.set_active_provider(user_id, provider_type)

        return {
            "success": True,
            "provider": provider,
            "message": f"{provider} configuration saved and activated successfully",
            "config_id": result.id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save configuration: {str(e)}"
        )


@router.put("/config/huggingface/api-key")
async def set_hf_api_key(
    data: SetAPIKeyRequest,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Set or update HuggingFace API key and configuration"""
    try:
        # Create configuration input
        config_input = AIProviderConfigInput(
            provider=AIProviderType.HUGGINGFACE,
            api_key=data.api_key,
            model=data.model or "Qwen/Qwen2.5-72B-Instruct",
            endpoint="https://api-inference.huggingface.co",
            temperature=data.temperature,
            max_tokens=data.max_tokens,
            top_p=data.top_p,
            enabled=True,
        )

        # Save configuration (will create or update)
        result = await config_service.set_provider_config(user_id, config_input)

        # Set as active provider
        await config_service.set_active_provider(user_id, AIProviderType.HUGGINGFACE)

        return {
            "success": True,
            "message": "HuggingFace configuration saved and activated successfully",
            "config": {
                "provider": result.provider,
                "model": result.model,
                "is_active": True,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save configuration: {str(e)}"
        )


@router.get("/config/huggingface")
async def get_hf_config(
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Get HuggingFace configuration status"""
    config = await config_service.get_provider_config(
        user_id, AIProviderType.HUGGINGFACE
    )

    if not config:
        return {
            "provider": "huggingface",
            "configured": False,
            "message": "HuggingFace not configured",
        }

    return {
        "provider": "huggingface",
        "configured": True,
        "model": config.model,
        "is_active": config.is_active,
        "enabled": config.enabled,
    }


@router.put("/config/{provider}/activate")
async def activate_provider(
    provider: str,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Set a provider as the active provider (must be already configured)"""
    try:
        provider_type = AIProviderType(provider)

        # Check if provider is configured
        if not config_service.is_provider_configured(user_id, provider_type):
            raise HTTPException(
                status_code=400,
                detail=f"{provider} is not configured. Configure it first before activating.",
            )

        # Set as active
        result = await config_service.set_active_provider(user_id, provider_type)

        return {
            "success": True,
            "provider": provider,
            "message": f"{provider} is now the active provider",
            "config": {
                "provider": result.provider,
                "model": result.model,
                "is_active": result.is_active,
            },
        }
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to activate provider: {str(e)}"
        )


@router.put("/config/{provider}/api-key")
async def update_api_key(
    provider: str,
    data: SetAPIKeyRequest,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Update only the API key for a configured provider."""
    try:
        provider_type = AIProviderType(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

    # Require provider to be configured first
    existing_config = await config_service.get_provider_config(user_id, provider_type)
    if not existing_config:
        raise HTTPException(
            status_code=404,
            detail=f"{provider} not configured",
        )

    api_key_value = (data.api_key or "").strip()
    if not api_key_value:
        raise HTTPException(status_code=400, detail="API key is required")

    config_input = AIProviderConfigInput(
        provider=provider_type,
        api_key=api_key_value,
        model=data.model or existing_config.model,
        endpoint=data.endpoint or existing_config.endpoint,
        temperature=(
            data.temperature
            if data.temperature is not None
            else existing_config.temperature
        ),
        max_tokens=(
            data.max_tokens
            if data.max_tokens is not None
            else existing_config.max_tokens
        ),
        top_p=data.top_p if data.top_p is not None else existing_config.top_p,
        enabled=existing_config.enabled,
    )

    result = await config_service.set_provider_config(user_id, config_input)

    return {
        "success": True,
        "message": f"{provider} API key updated successfully",
        "config": {
            "provider": result.provider,
            "model": result.model,
            "is_active": result.is_active,
        },
    }


@router.post("/config/{provider}/validate")
async def validate_provider_config(
    provider: str,
    data: ConfigureProviderRequest,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Validate provider configuration without saving it."""
    try:
        provider_type = AIProviderType(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

    config_input = AIProviderConfigInput(
        provider=provider_type,
        api_key=data.api_key,
        model=data.model,
        endpoint=data.endpoint,
        temperature=data.temperature,
        max_tokens=data.max_tokens,
        top_p=data.top_p,
        enabled=data.enabled if data.enabled is not None else True,
    )

    result = config_service.validate_config(config_input)
    return {"valid": result.valid, "errors": result.errors}


@router.post("/config/{provider}/test")
async def test_provider_connection(
    provider: str,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Test connectivity for a configured provider."""
    try:
        provider_type = AIProviderType(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

    result = await config_service.test_provider(user_id, provider_type)

    message = "Connection test successful" if result.success else None

    return {
        "success": result.success,
        "message": message,
        "error": result.error,
    }


@router.delete("/config/{provider}")
async def delete_config(
    provider: str,
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Delete AI provider configuration"""
    try:
        provider_type = AIProviderType(provider)
        await config_service.remove_provider_config(user_id, provider_type)
        return {
            "success": True,
            "message": f"{provider} configuration deleted successfully",
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete configuration: {str(e)}"
        )

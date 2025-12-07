"""AI Service Configuration Routes"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from backend.models.base import get_db
from backend.dependencies import get_current_user_id
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.services.ai.providers import (
    AIProviderConfigService,
    AIProviderType,
    AIProviderConfigInput,
)
import os

router = APIRouter(prefix="/ai", tags=["AI Config"])


# ====================
# Dependency Injection
# ====================

def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        # Use a fallback key for development
        return EncryptionService(b"0" * 32)
    return EncryptionService(encryption_key)


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
    api_key: str = Field(..., min_length=10, max_length=500)
    model: Optional[str] = Field(None, description="AI model to use")
    temperature: Optional[float] = Field(0.3, ge=0, le=2)
    max_tokens: Optional[int] = Field(4096, ge=1, le=100000)


# ====================
# Routes
# ====================

@router.get("/providers")
async def list_providers(
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """List all available AI providers with metadata"""
    metadata = config_service.list_all_providers_metadata()
    return metadata


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
            "message": "No AI provider configured. Configure in Settings."
        }

    return {
        "provider": config.provider,
        "model": config.model,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
        "is_active": config.is_active,
        "enabled": config.enabled,
    }


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
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/config/huggingface")
async def get_hf_config(
    user_id: int = Depends(get_current_user_id),
    config_service: AIProviderConfigService = Depends(get_config_service),
):
    """Get HuggingFace configuration status"""
    config = await config_service.get_provider_config(user_id, AIProviderType.HUGGINGFACE)

    if not config:
        return {
            "provider": "huggingface",
            "configured": False,
            "message": "HuggingFace not configured"
        }

    return {
        "provider": "huggingface",
        "configured": True,
        "model": config.model,
        "is_active": config.is_active,
        "enabled": config.enabled,
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
            "message": f"{provider} configuration deleted successfully"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete configuration: {str(e)}")

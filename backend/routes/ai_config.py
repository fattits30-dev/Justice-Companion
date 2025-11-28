"""AI Service Configuration Routes"""
import httpx
from fastapi import APIRouter, HTTPException

from backend.services.auth.service import AuthenticationService
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.services.ai.providers import AIProviderConfigService

router = APIRouter(prefix="/ai", tags=["AI Config"])


# Dependency injection functions

def get_auth_service() -> AuthenticationService:
    """Get authentication service instance."""
    # In a real implementation, this would be properly injected
    # For now, return a mock/placeholder
    return AuthenticationService(db=None, audit_logger=AuditLogger(db=None))


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    return EncryptionService()


def get_audit_logger() -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db=None)


def get_config_service() -> AIProviderConfigService:
    """Get AI provider configuration service instance."""
    # This would be properly injected in production
    return AIProviderConfigService(db=None)


@router.get("/providers")
async def list_providers():
    """List available AI providers and their metadata"""
    return {
        "huggingface": {
            "name": "Hugging Face",
            "description": "Hugging Face Inference API - Mistral, Zephyr models",
            "models": [
                "mistralai/Mistral-7B-Instruct-v0.2",
                "HuggingFaceH4/zephyr-7b-beta",
                "mistralai/Mixtral-8x7B-Instruct-v0.1"
            ],
            "requires_api_key": True,
            "features": ["chat", "analysis", "drafting"]
        },
        "ollama": {
            "name": "Ollama (Local)",
            "description": "Local LLM via Ollama - Privacy-first, offline capable",
            "models": ["llama2", "mistral", "codellama"],
            "requires_api_key": False,
            "features": ["chat", "analysis"]
        }
    }


@router.get("/config/active")
async def get_active_config():
    """Get currently active AI provider configuration"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8001/config/active")
            return response.json()
    except httpx.ConnectError:
        # AI service not running - return default "none" config
        return {
            "provider": None,
            "enabled": False,
            "message": "AI service not available"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")


@router.post("/config/huggingface/api-key")
async def set_hf_api_key(data: dict):
    """Forward API key to AI service"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "http://localhost:8001/config/huggingface/api-key",
                json=data
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")


@router.get("/config/huggingface")
async def get_hf_config():
    """Get HuggingFace config from AI service"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8001/config/huggingface")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")

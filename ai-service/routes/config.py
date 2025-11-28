"""AI Service Configuration Routes"""
from fastapi import APIRouter
from config import settings

router = APIRouter()


@router.get("/active")
async def get_active_config():
    """Get currently active AI provider configuration"""
    if settings.HF_API_TOKEN:
        return {
            "provider": "huggingface",
            "enabled": True,
            "model": settings.MODEL_CHAT_PRIMARY,
            "endpoint": "https://api-inference.huggingface.co/models",
        }
    else:
        return {
            "provider": None,
            "enabled": False,
            "message": "No AI provider configured"
        }


@router.get("/huggingface")
async def get_hf_config():
    """Get HuggingFace configuration"""
    return {
        "configured": bool(settings.HF_API_TOKEN),
        "model": settings.MODEL_CHAT_PRIMARY,
        "endpoint": "https://api-inference.huggingface.co/models",
    }


@router.post("/huggingface/api-key")
async def set_hf_api_key(data: dict):
    """Set HuggingFace API key (runtime only - doesn't persist)"""
    # Note: This only sets for the current session
    # Persistent config should be via .env file
    if "api_key" in data:
        settings.HF_API_TOKEN = data["api_key"]
        return {"success": True, "message": "API key updated for current session"}
    return {"success": False, "message": "No api_key provided"}

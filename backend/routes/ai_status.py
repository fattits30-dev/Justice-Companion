"""AI Service Status Routes"""
from fastapi import APIRouter
import httpx

from backend.services.security.encryption import EncryptionService

router = APIRouter(prefix="/ai", tags=["AI"])


# Dependency injection functions

def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    return EncryptionService()


@router.get("/health")
async def ai_health():
    """Check AI service health"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8001/health")
            return response.json()
    except Exception as e:
        return {"status": "offline", "error": str(e)}

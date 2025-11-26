"""AI Service Status Routes"""
from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/ai", tags=["AI"])

@router.get("/health")
async def ai_health():
    """Check AI service health"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8001/health")
            return response.json()
    except Exception as e:
        return {"status": "offline", "error": str(e)}

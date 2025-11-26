"""AI Service Configuration Routes"""
from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/ai/config", tags=["AI Config"])

@router.post("/huggingface/api-key")
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

@router.get("/huggingface")
async def get_hf_config():
    """Get HuggingFace config from AI service"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8001/config/huggingface")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")

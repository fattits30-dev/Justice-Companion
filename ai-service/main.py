"""
Justice Companion AI Service
============================
Dedicated AI/ML service for legal document processing, 
chat assistance, and analysis powered by Hugging Face.

Architecture: Microservice (FastAPI)
Port: 8001
Dependencies: Hugging Face Inference API (Pro tier)
"""

import os
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes import chat, vision, analysis, drafting, research, config
from providers.huggingface.client import HuggingFaceClient
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Startup
    print("[AI-SERVICE] Justice Companion AI Service starting...")
    print(f"[AI-SERVICE] Hugging Face API: {'Connected' if settings.HF_API_TOKEN else 'No token configured'}")
    
    # Initialize HF client
    app.state.hf_client = HuggingFaceClient()
    
    yield
    
    # Shutdown
    print("[AI-SERVICE] AI Service shutting down...")


app = FastAPI(
    title="Justice Companion AI Service",
    description="AI-powered legal assistance for UK citizens",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow backend service to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",  # Backend
        "http://localhost:5176",  # Frontend (dev)
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    """Service health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "hf_connected": bool(settings.HF_API_TOKEN),
    }


# Global exception handler - catch ALL errors and log them
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and log the full traceback"""
    print(f"\n{'='*60}", flush=True)
    print(f"[AI-SERVICE ERROR] Unhandled exception on {request.method} {request.url}", flush=True)
    print(f"Exception type: {type(exc).__name__}", flush=True)
    print(f"Exception message: {str(exc)}", flush=True)
    print(f"Full traceback:", flush=True)
    traceback.print_exc()
    print(f"{'='*60}\n", flush=True)
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


# Include routers
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(vision.router, prefix="/vision", tags=["Vision/OCR"])
app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
app.include_router(drafting.router, prefix="/drafting", tags=["Drafting"])
app.include_router(research.router, prefix="/research", tags=["Legal Research"])
app.include_router(config.router, prefix="/config", tags=["Configuration"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
    )

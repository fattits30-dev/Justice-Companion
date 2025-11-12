"""
Justice Companion AI Service

FastAPI-based microservice for AI operations.
Provides document analysis, case suggestions, chat, and legal research.

Prioritizes Hugging Face (local + API) for privacy-first operation.

Author: Justice Companion Team
License: MIT
"""
# Force reload for verbose logging

import os
import sys
import tempfile
from contextlib import asynccontextmanager
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Import our modules
from services.model_client import (
    ModelClient,
    HuggingFaceLocalClient,
    HuggingFaceAPIClient,
    OpenAIClient,
)
from services.image_processor import ImageProcessorService
from agents.document_analyzer import DocumentAnalyzerAgent
from models.requests import DocumentAnalysisRequest, ParsedDocument, UserProfile
from models.responses import DocumentAnalysisResponse


# Version info
VERSION = "1.0.0"
SERVICE_NAME = "Justice Companion AI Service"

# Global model client (initialized in lifespan)
model_client: Optional[ModelClient] = None
model_provider: str = "Not initialized"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    Initializes model client with Hugging Face-first selection.
    """
    global model_client, model_provider

    # Startup
    print(f"[AI Service] Starting {SERVICE_NAME} v{VERSION} (with verbose logging)")
    print(f"[AI Service] Python version: {sys.version}")
    print(f"[AI Service] Working directory: {os.getcwd()}")

    # Initialize model client (Hugging Face-first strategy)
    print("[AI Service] Initializing model client...")

    # Model selection priority:
    # 1. Hugging Face Local (best for privacy, free, but requires GPU/CPU)
    # 2. Hugging Face API (£9/month fallback, good privacy, less powerful hardware)
    # 3. OpenAI (optional, for users who prefer it)

    hf_token = os.getenv("HF_TOKEN")
    openai_key = os.getenv("OPENAI_API_KEY")
    use_local = os.getenv("USE_LOCAL_MODELS", "false").lower() == "true"

    config = {
        "model": os.getenv("MODEL_NAME", "google/flan-t5-large"),
        "temperature": 0.7,
        "max_tokens": 2000,
    }

    try:
        if use_local:
            # Try Hugging Face Local first (PRIMARY - privacy-first)
            print("[AI Service] Attempting to initialize Hugging Face Local...")
            try:
                model_client = HuggingFaceLocalClient(config)
                model_provider = "Hugging Face Local (Privacy-First)"
                print(f"[AI Service] [OK] Initialized {model_provider}")
                print(f"[AI Service] Model: {config['model']}")
                print(f"[AI Service] Device: {model_client.device}")
            except Exception as e:
                print(f"[AI Service] Local models not available: {e}")
                model_client = None

        if model_client is None and hf_token:
            # Fallback to Hugging Face API (Pro subscription)
            print("[AI Service] Initializing Hugging Face API (Pro)...")
            config["api_token"] = hf_token
            config["model"] = os.getenv("HF_MODEL", "Qwen/Qwen3-30B-A3B-Instruct-2507")
            model_client = HuggingFaceAPIClient(config)
            model_provider = "Hugging Face API (Pro - Qwen3)"
            print(f"[AI Service] [OK] Initialized {model_provider}")
            print(f"[AI Service] Model: {config['model']}")

        elif model_client is None and openai_key:
            # Optional OpenAI fallback
            print("[AI Service] Initializing OpenAI (Optional)...")
            config["api_key"] = openai_key
            config["model"] = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
            model_client = OpenAIClient(config)
            model_provider = "OpenAI (Optional)"
            print(f"[AI Service] [OK] Initialized {model_provider}")
            print(f"[AI Service] Model: {config['model']}")

        elif model_client is None:
            # No models available
            print("[AI Service] [FAILED] No AI models configured!")
            print("[AI Service] Set HF_TOKEN or OPENAI_API_KEY environment variable")
            print("[AI Service] Or set USE_LOCAL_MODELS=true for local Hugging Face")
            model_provider = "None (No API keys configured)"

    except Exception as e:
        print(f"[AI Service] [FAILED] Model initialization failed: {e}")
        model_provider = f"Failed: {str(e)}"
        model_client = None

    yield

    # Shutdown
    print(f"[AI Service] Shutting down {SERVICE_NAME}")


# Create FastAPI app
app = FastAPI(
    title=SERVICE_NAME,
    version=VERSION,
    description="AI-powered legal assistant microservice",
    lifespan=lifespan
)

# CORS middleware - allow requests from Electron renderer
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
        "http://127.0.0.1:*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - service info"""
    return {
        "service": SERVICE_NAME,
        "version": VERSION,
        "status": "running",
        "endpoints": {
            "health": "/health",
            "api_v1": "/api/v1"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for PythonProcessManager"""
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": VERSION
    }


@app.get("/api/v1/info")
async def api_info():
    """API version info with model provider status"""
    return {
        "api_version": "v1",
        "service": SERVICE_NAME,
        "version": VERSION,
        "model_provider": model_provider,
        "model_ready": model_client is not None,
        "available_agents": [
            "document_analyzer",
            "case_suggester",
            "conversation",
            "legal_researcher"
        ]
    }


@app.post("/api/v1/analyze-document", response_model=DocumentAnalysisResponse)
async def analyze_document(request: DocumentAnalysisRequest):
    """
    Analyze legal document and extract case data.

    Uses Hugging Face (local or API) for privacy-first operation.
    Falls back to OpenAI if configured.

    Args:
        request: DocumentAnalysisRequest with document and user profile

    Returns:
        DocumentAnalysisResponse with analysis and suggested case data

    Raises:
        HTTPException: If model not initialized or analysis fails
    """
    # Check if model is initialized
    if model_client is None:
        raise HTTPException(
            status_code=503,
            detail="AI model not initialized. Set HF_TOKEN or OPENAI_API_KEY environment variable."
        )

    try:
        print(f"[AI Service] analyze_document called with document: {request.document.filename}")
        print(f"[AI Service] Document text length: {len(request.document.text)} chars")
        print(f"[AI Service] User: {request.userProfile.name}")

        # Create DocumentAnalyzerAgent with initialized model client
        config = {
            "model": model_client.config.get("model", "unknown"),
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        agent = DocumentAnalyzerAgent(model_client, config)

        # Execute analysis
        print(f"[AI Service] Executing agent.execute()...")
        response = await agent.execute(request)
        print(f"[AI Service] Agent execution completed successfully")

        return response

    except ValueError as e:
        # Invalid request (validation error)
        print(f"[AI Service] ValueError in analyze_document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    except RuntimeError as e:
        # Model generation error
        print(f"[AI Service] RuntimeError in analyze_document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")

    except Exception as e:
        # Unexpected error
        print(f"[AI Service] Unexpected error in analyze_document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/v1/analyze-image", response_model=DocumentAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    userName: str = Form(...),
    userEmail: Optional[str] = Form(None),
    sessionId: str = Form(...),
    userQuestion: Optional[str] = Form(None),
):
    """
    Analyze image of legal document using OCR and extract case data.

    Supports: JPG, PNG, BMP, TIFF, PDF (scanned), HEIC (iPhone photos)

    Args:
        file: Uploaded image file
        userName: User's full name
        userEmail: User's email address (optional)
        sessionId: Session UUID
        userQuestion: Optional question about the document

    Returns:
        DocumentAnalysisResponse with analysis and suggested case data

    Raises:
        HTTPException: If model not initialized, OCR fails, or analysis fails
    """
    # Check if model is initialized
    if model_client is None:
        raise HTTPException(
            status_code=503,
            detail="AI model not initialized. Set HF_TOKEN or OPENAI_API_KEY environment variable."
        )

    temp_file_path = None
    try:
        # Save uploaded file to temp directory
        temp_dir = tempfile.gettempdir()

        # Sanitize filename to prevent path traversal
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Filename is required"
            )
        safe_filename = os.path.basename(file.filename)  # Remove any path components
        file_extension = Path(safe_filename).suffix.lower()

        # Validate file extension is allowed
        allowed_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".heic", ".pdf"}
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_extension}. Supported: {', '.join(allowed_extensions)}"
            )

        # Create safe temporary filename
        temp_file_path = os.path.join(temp_dir, f"upload_{sessionId}_{safe_filename}")

        # Write file
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Initialize OCR service
        image_processor = ImageProcessorService()

        # Check if Tesseract is available
        if not image_processor.is_tesseract_available():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Tesseract OCR is not installed. "
                    "Please install Tesseract:\n"
                    "  Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
                    "  macOS: brew install tesseract\n"
                    "  Linux: apt-get install tesseract-ocr"
                )
            )

        # Extract text based on file type
        if file_extension in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"]:
            # Image file - extract text directly
            print(f"[AI Service] Extracting text from image: {file.filename}")
            text, ocr_metadata = image_processor.extract_text_from_image(temp_file_path)

        elif file_extension == ".heic":
            # HEIC (iPhone photos) - convert to JPG first
            print(f"[AI Service] Converting HEIC to JPG: {file.filename}")
            jpg_path = image_processor.convert_heic_to_jpg(temp_file_path)
            text, ocr_metadata = image_processor.extract_text_from_image(jpg_path)
            # Clean up converted JPG
            if os.path.exists(jpg_path):
                os.remove(jpg_path)

        elif file_extension == ".pdf":
            # Scanned PDF - extract text from all pages
            print(f"[AI Service] Extracting text from PDF: {file.filename}")
            text, ocr_metadata = image_processor.extract_text_from_pdf(temp_file_path)

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_extension}. Supported: JPG, PNG, BMP, TIFF, PDF, HEIC"
            )

        # Check if OCR extracted any text
        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No text found in image. Image may be blank, too low quality, or not contain readable text."
            )

        print(f"[AI Service] Extracted {len(text)} characters (confidence: {ocr_metadata.get('ocr_confidence', 0):.1f}%)")

        # Create ParsedDocument from OCR results
        word_count = len(text.split())
        parsed_document = ParsedDocument(
            filename=file.filename,
            text=text,
            wordCount=word_count,
            fileType=file_extension.lstrip(".")
        )

        # Create user profile
        user_profile = UserProfile(
            name=userName,
            email=userEmail
        )

        # Create analysis request
        analysis_request = DocumentAnalysisRequest(
            document=parsed_document,
            userProfile=user_profile,
            sessionId=sessionId,
            userQuestion=userQuestion
        )

        # Create DocumentAnalyzerAgent with initialized model client
        config = {
            "model": model_client.config.get("model", "unknown"),
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        agent = DocumentAnalyzerAgent(model_client, config)

        # Execute analysis
        response = await agent.execute(analysis_request)

        # Add OCR metadata to response
        if response.metadata is None:
            response.metadata = {}
        response.metadata["ocr"] = ocr_metadata

        return response

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except ValueError as e:
        # Invalid request (validation error)
        raise HTTPException(status_code=400, detail=str(e))

    except RuntimeError as e:
        # OCR or model generation error
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        # Unexpected error
        print(f"[AI Service] Unexpected error in analyze_image: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    finally:
        # Clean up temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                print(f"[AI Service] Failed to clean up temp file: {e}")


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Catch-all exception handler"""
    print(f"[AI Service] Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "status_code": 500
        }
    )


if __name__ == "__main__":
    # Get port from environment or default to 5051
    port = int(os.getenv("PORT", "5051"))
    host = os.getenv("HOST", "127.0.0.1")
    is_dev = os.getenv("ENVIRONMENT", "production") == "development"

    print(f"[AI Service] Starting server on {host}:{port}")
    print(f"[AI Service] Mode: {'DEVELOPMENT' if is_dev else 'PRODUCTION'}")

    # Use import string for reload mode (required by uvicorn)
    # Use app object for production (faster startup)
    if is_dev:
        uvicorn.run(
            "main:app",  # Import string required for reload
            host=host,
            port=port,
            log_level="info",
            access_log=True,
            reload=True
        )
    else:
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="info",
            access_log=True,
            reload=False
        )

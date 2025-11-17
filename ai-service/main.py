"""
Justice Companion AI Service

FastAPI-based microservice for AI operations.
Provides document analysis, case suggestions, chat, and legal research.

Prioritizes Hugging Face (local + API) for privacy-first operation.

Author: Justice Companion Team
License: MIT
"""

import logging
import os
import sys
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ConfigDict
from pydantic_settings import BaseSettings
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


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Pydantic configuration - disable protected namespace warnings for model_name field
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        protected_namespaces=(),  # Disable protected namespace warnings (we use model_name intentionally)
    )

    # Service configuration
    version: str = "1.0.0"
    service_name: str = "Justice Companion AI Service"

    # Server configuration
    host: str = "127.0.0.1"
    port: int = 5051
    environment: str = "production"

    # Model configuration
    use_local_models: bool = False
    model_name: str = "google/flan-t5-large"
    hf_model: str = "Qwen/Qwen3-30B-A3B-Instruct-2507"
    openai_model: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    max_tokens: int = 2000

    # API keys (optional)
    hf_token: Optional[str] = None
    openai_api_key: Optional[str] = None

    # File upload configuration
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: set = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".heic", ".pdf"}


# Global settings and model client
settings = Settings()
model_client: Optional[ModelClient] = None
model_provider: str = "Not initialized"


class ImageAnalysisService:
    """Service for analyzing images of legal documents using OCR and AI."""

    def __init__(self, model_client: ModelClient, settings: Settings):
        self.model_client = model_client
        self.settings = settings
        self.image_processor = ImageProcessorService()

    async def analyze_image(
        self,
        file: UploadFile,
        user_name: str,
        user_email: Optional[str],
        session_id: str,
        user_question: Optional[str],
    ) -> DocumentAnalysisResponse:
        """
        Analyze an uploaded image file and extract legal document information.

        Args:
            file: The uploaded file
            user_name: User's full name
            user_email: User's email (optional)
            session_id: Session identifier
            user_question: Optional question about the document

        Returns:
            DocumentAnalysisResponse with analysis results

        Raises:
            HTTPException: For various error conditions
        """
        temp_file_path = None
        try:
            # Validate and save uploaded file
            temp_file_path = await self._save_uploaded_file(file, session_id)

            # Ensure filename is not None
            filename = file.filename or "unknown_file"

            # Extract text from image
            text, ocr_metadata = self._extract_text_from_file(temp_file_path, filename)

            # Create document objects
            parsed_document = self._create_parsed_document(filename, text)
            user_profile = UserProfile(name=user_name, email=user_email)

            # Create analysis request
            analysis_request = DocumentAnalysisRequest(
                document=parsed_document,
                userProfile=user_profile,
                sessionId=session_id,
                userQuestion=user_question,
            )

            # Execute AI analysis
            response = await self._execute_analysis(analysis_request)

            # Add OCR metadata to response
            if response.metadata is None:
                response.metadata = {}
            response.metadata["ocr"] = ocr_metadata

            return response

        finally:
            # Clean up temp file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file: {e}")

    async def _save_uploaded_file(self, file: UploadFile, session_id: str) -> str:
        """Save uploaded file to temporary directory with validation."""
        # Validate filename
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # Sanitize filename to prevent path traversal
        safe_filename = os.path.basename(file.filename)
        file_extension = Path(safe_filename).suffix.lower()

        # Validate file extension
        if file_extension not in self.settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_extension}. Supported: {', '.join(self.settings.allowed_extensions)}",
            )

        # Create temporary file path
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"upload_{session_id}_{safe_filename}")

        # Save file
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        return temp_file_path

    def _extract_text_from_file(self, file_path: str, filename: str) -> tuple[str, dict]:
        """Extract text from image file using OCR."""
        # Check if Tesseract is available
        if not self.image_processor.is_tesseract_available():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Tesseract OCR is not installed. "
                    "Please install Tesseract:\n"
                    "  Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
                    "  macOS: brew install tesseract\n"
                    "  Linux: apt-get install tesseract-ocr"
                ),
            )

        file_extension = Path(filename).suffix.lower()

        # Extract text based on file type
        if file_extension in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"]:
            logger.info(f"Extracting text from image: {filename}")
            text, ocr_metadata = self.image_processor.extract_text_from_image(file_path)

        elif file_extension == ".heic":
            logger.info(f"Converting HEIC to JPG: {filename}")
            jpg_path = self.image_processor.convert_heic_to_jpg(file_path)
            text, ocr_metadata = self.image_processor.extract_text_from_image(jpg_path)
            # Clean up converted JPG
            if os.path.exists(jpg_path):
                os.remove(jpg_path)

        elif file_extension == ".pdf":
            logger.info(f"Extracting text from PDF: {filename}")
            text, ocr_metadata = self.image_processor.extract_text_from_pdf(file_path)

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_extension}. Supported: JPG, PNG, BMP, TIFF, PDF, HEIC",
            )

        # Validate extracted text
        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No text found in image. Image may be blank, too low quality, or not contain readable text.",
            )

        confidence = ocr_metadata.get("ocr_confidence", 0)
        logger.info(f"Extracted {len(text)} characters (confidence: {confidence:.1f}%)")

        return text, ocr_metadata

    def _create_parsed_document(self, filename: str, text: str) -> ParsedDocument:
        """Create ParsedDocument from extracted text."""
        word_count = len(text.split())
        file_extension = Path(filename).suffix.lower().lstrip(".")

        return ParsedDocument(
            filename=filename, text=text, wordCount=word_count, fileType=file_extension
        )

    async def _execute_analysis(self, request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
        """Execute AI analysis on the document."""
        config = {
            "model": self.model_client.config.get("model", "unknown"),
            "temperature": self.settings.temperature,
            "max_tokens": self.settings.max_tokens,
        }

        agent = DocumentAnalyzerAgent(self.model_client, config)
        return await agent.execute(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    Initializes model client with Hugging Face-first selection.
    """
    global model_client, model_provider

    # Startup
    logger.info(f"Starting {settings.service_name} v{settings.version}")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")

    # Initialize model client (Hugging Face-first strategy)
    logger.info("Initializing model client...")

    # Model selection priority:
    # 1. Hugging Face Local (best for privacy, free, but requires GPU/CPU)
    # 2. Hugging Face API (£9/month fallback, good privacy, less powerful hardware)
    # 3. OpenAI (optional, for users who prefer it)

    config = {
        "model": settings.model_name,
        "temperature": settings.temperature,
        "max_tokens": settings.max_tokens,
    }

    try:
        if settings.use_local_models:
            # Try Hugging Face Local first (PRIMARY - privacy-first)
            logger.info("Attempting to initialize Hugging Face Local...")
            try:
                model_client = HuggingFaceLocalClient(config)
                model_provider = "Hugging Face Local (Privacy-First)"
                logger.info(f"Initialized {model_provider}")
                logger.info(f"Model: {config['model']}")
                logger.info(f"Device: {model_client.device}")
            except Exception as e:
                logger.warning(f"Local models not available: {e}")
                model_client = None

        if model_client is None and settings.hf_token:
            # Fallback to Hugging Face API (Pro subscription)
            logger.info("Initializing Hugging Face API (Pro)...")
            config["api_token"] = settings.hf_token
            config["model"] = settings.hf_model
            model_client = HuggingFaceAPIClient(config)
            model_provider = "Hugging Face API (Pro - Qwen3)"
            logger.info(f"Initialized {model_provider}")
            logger.info(f"Model: {config['model']}")

        elif model_client is None and settings.openai_api_key:
            # Optional OpenAI fallback
            logger.info("Initializing OpenAI (Optional)...")
            config["api_key"] = settings.openai_api_key
            config["model"] = settings.openai_model
            model_client = OpenAIClient(config)
            model_provider = "OpenAI (Optional)"
            logger.info(f"Initialized {model_provider}")
            logger.info(f"Model: {config['model']}")

        elif model_client is None:
            # No models available
            logger.error("No AI models configured!")
            logger.error("Set HF_TOKEN or OPENAI_API_KEY environment variable")
            logger.error("Or set USE_LOCAL_MODELS=true for local Hugging Face")
            model_provider = "None (No API keys configured)"

    except Exception as e:
        logger.error(f"Model initialization failed: {e}")
        model_provider = f"Failed: {str(e)}"
        model_client = None

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.service_name}")


# Create FastAPI app
app = FastAPI(
    title=settings.service_name,
    version=settings.version,
    description="AI-powered legal assistant microservice",
    lifespan=lifespan,
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
        "service": settings.service_name,
        "version": settings.version,
        "status": "running",
        "endpoints": {"health": "/health", "api_v1": "/api/v1"},
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for PythonProcessManager"""
    return {"status": "healthy", "service": settings.service_name, "version": settings.version}


@app.get("/api/v1/info")
async def api_info():
    """API version info with model provider status"""
    return {
        "api_version": "v1",
        "service": settings.service_name,
        "version": settings.version,
        "model_provider": model_provider,
        "model_ready": model_client is not None,
        "available_agents": [
            "document_analyzer",
            "case_suggester",
            "conversation",
            "legal_researcher",
        ],
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
            detail="AI model not initialized. Set HF_TOKEN or OPENAI_API_KEY environment variable.",
        )

    try:
        logger.info(f"analyze_document called with document: {request.document.filename}")
        logger.info(f"Document text length: {len(request.document.text)} chars")
        logger.info(f"User: {request.userProfile.name}")

        # Create DocumentAnalyzerAgent with initialized model client
        config = {
            "model": model_client.config.get("model", "unknown"),
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens,
        }
        agent = DocumentAnalyzerAgent(model_client, config)

        # Execute analysis
        logger.info("Executing agent.execute()...")
        response = await agent.execute(request)
        logger.info("Agent execution completed successfully")

        return response

    except ValueError as e:
        # Invalid request (validation error)
        logger.error(f"ValueError in analyze_document: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except RuntimeError as e:
        # Model generation error
        logger.error(f"RuntimeError in analyze_document: {e}")
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")

    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error in analyze_document: {e}")
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
            detail="AI model not initialized. Set HF_TOKEN or OPENAI_API_KEY environment variable.",
        )

    try:
        # Create and use image analysis service
        image_service = ImageAnalysisService(model_client, settings)
        return await image_service.analyze_image(
            file=file,
            user_name=userName,
            user_email=userEmail,
            session_id=sessionId,
            user_question=userQuestion,
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except ValueError as e:
        # Invalid request (validation error)
        logger.error(f"ValueError in analyze_image: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except RuntimeError as e:
        # OCR or model generation error
        logger.error(f"RuntimeError in analyze_image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error in analyze_image: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code, content={"error": exc.detail, "status_code": exc.status_code}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Catch-all exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": str(exc), "status_code": 500},
    )


if __name__ == "__main__":
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    logger.info(f"Mode: {'DEVELOPMENT' if settings.environment == 'development' else 'PRODUCTION'}")

    # Use import string for reload mode (required by uvicorn)
    # Use app object for production (faster startup)
    if settings.environment == "development":
        uvicorn.run(
            "main:app",  # Import string required for reload
            host=settings.host,
            port=settings.port,
            log_level="info",
            access_log=True,
            reload=True,
        )
    else:
        uvicorn.run(
            app,
            host=settings.host,
            port=settings.port,
            log_level="info",
            access_log=True,
            reload=False,
        )

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
import re
import secrets
import sys
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

# Third party imports
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings, SettingsConfigDict

# Add current directory to Python path for relative imports
# This ensures the script works whether run from project root or ai-service/
sys.path.insert(0, os.path.dirname(__file__))

# First party imports (must be after sys.path modification)
from agents.document_analyzer import DocumentAnalyzerAgent  # noqa: E402
from models.requests import DocumentAnalysisRequest  # noqa: E402
from models.requests import ParsedDocument, UserProfile  # noqa: E402
from models.responses import DocumentAnalysisResponse  # noqa: E402
from services.image_processor import ImageProcessorService  # noqa: E402
from services.model_client import HuggingFaceAPIClient  # noqa: E402
from services.model_client import OpenAIClient  # noqa: E402
from services.model_client import HuggingFaceLocalClient, ModelClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Pydantic configuration - disable protected namespace warnings
    # for the model_name field
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        # Disable protected namespace warnings
        # (we use model_name intentionally)
        protected_namespaces=(),
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
    allowed_extensions: set = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp",
        ".tiff",
        ".tif",
        ".heic",
        ".pdf",
    }


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
        self._upload_root = (
            Path(tempfile.gettempdir()) / "justice-companion" / "uploads"
        ).resolve()

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        safe_name = Path(filename or "upload").name
        sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", safe_name)
        return sanitized or "upload.txt"

    def _ensure_within_upload_root(self, candidate: Path) -> Path:
        root = self._upload_root
        root.mkdir(parents=True, exist_ok=True)
        resolved = candidate.resolve()
        root_str = str(root)
        resolved_str = str(resolved)
        # Use both Path.is_relative_to and commonpath so static analyzers see the guard
        if (
            not resolved.is_relative_to(root)
            or os.path.commonpath([resolved_str, root_str]) != root_str
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid file path supplied",
            )
        return resolved

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
        temp_file_path: Optional[Path] = None
        try:
            # Validate and save uploaded file
            temp_file_path = await self._save_uploaded_file(file, session_id)

            # Ensure filename is not None
            filename = file.filename or "unknown_file"

            # Extract text from image
            text, ocr_metadata = self._extract_text_from_file(
                temp_file_path,
                filename,
            )

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
            if temp_file_path:
                self._delete_temp_file(temp_file_path)

    def _delete_temp_file(self, path: Path) -> None:
        """Delete temporary files constrained to the upload root."""
        try:
            safe_path = self._ensure_within_upload_root(path)
        except HTTPException as exc:
            logger.warning(
                "Attempted to delete file outside upload root: %s",
                exc,
            )
            return

        try:
            safe_path.unlink(missing_ok=True)
        except OSError as exc:
            logger.warning(
                "Failed to delete temp file %s: %s",
                safe_path,
                exc,
            )

    async def _save_uploaded_file(
        self,
        file: UploadFile,
        session_id: str,
    ) -> Path:
        """Save uploaded file to temporary directory with validation."""
        # Validate filename
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # Use a random directory name per upload to avoid user-controlled paths
        session_dir_name = secrets.token_hex(16)
        safe_filename = self._sanitize_filename(file.filename)
        file_extension = Path(safe_filename).suffix.lower() or ".bin"

        # Validate file extension
        if file_extension not in self.settings.allowed_extensions:
            allowed = ", ".join(sorted(self.settings.allowed_extensions))
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported file type: "
                    f"{file_extension}. Supported: {allowed}"
                ),
            )

        # Create temporary file path under dedicated directory (guarded)
        session_dir = self._ensure_within_upload_root(
            self._upload_root / session_dir_name
        )
        session_dir.mkdir(parents=True, exist_ok=True)
        stored_filename = f"{secrets.token_hex(16)}{file_extension}"
        temp_file_path = self._ensure_within_upload_root(
            session_dir / stored_filename
        )

        # Save file with streaming write + size enforcement
        max_size = self.settings.max_file_size
        chunk_size = 1024 * 1024  # 1MB chunks
        total_bytes = 0

        await file.seek(0)
        with temp_file_path.open("wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    buffer.close()
                    self._delete_temp_file(temp_file_path)
                    max_mb = max_size // (1024 * 1024)
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "File exceeds maximum allowed size of "
                            f"{max_mb}MB"
                        ),
                    )
                buffer.write(chunk)

        return temp_file_path

    def _extract_text_from_file(
        self,
        file_path: Path,
        filename: str,
    ) -> tuple[str, dict]:
        """Extract text from image file using OCR."""
        safe_path = self._ensure_within_upload_root(file_path)
        file_path_str = safe_path.as_posix()

        # Check if Tesseract is available
        if not self.image_processor.is_tesseract_available():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Tesseract OCR is not installed. "
                    "Please install Tesseract:\n"
                    "  Windows: https://github.com/UB-Mannheim/"
                    "tesseract/wiki\n"
                    "  macOS: brew install tesseract\n"
                    "  Linux: apt-get install tesseract-ocr"
                ),
            )

        file_extension = Path(filename).suffix.lower()

        # Extract text based on file type
        if file_extension in (
            ".jpg",
            ".jpeg",
            ".png",
            ".bmp",
            ".tiff",
            ".tif",
        ):
            logger.info(f"Extracting text from image: {filename}")
            text, ocr_metadata = self.image_processor.extract_text_from_image(
                file_path_str
            )

        elif file_extension == ".heic":
            logger.info(f"Converting HEIC to JPG: {filename}")
            jpg_path = self.image_processor.convert_heic_to_jpg(file_path_str)
            jpg_resolved = self._ensure_within_upload_root(Path(jpg_path))
            text, ocr_metadata = self.image_processor.extract_text_from_image(
                str(jpg_resolved)
            )
            # Clean up converted JPG
            self._delete_temp_file(jpg_resolved)

        elif file_extension == ".pdf":
            logger.info(f"Extracting text from PDF: {filename}")
            text, ocr_metadata = self.image_processor.extract_text_from_pdf(
                file_path_str
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported file type: "
                    f"{file_extension}. Supported: "
                    "JPG, PNG, BMP, TIFF, PDF, HEIC"
                ),
            )

        # Validate extracted text
        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "No text found in image. Image may be blank, too low "
                    "quality, or not contain readable text."
                ),
            )

        confidence = ocr_metadata.get("ocr_confidence", 0)
        logger.info(
            "Extracted %s characters (confidence: %.1f%%)",
            len(text),
            confidence,
        )

        return text, ocr_metadata

    def _create_parsed_document(
        self,
        filename: str,
        text: str,
    ) -> ParsedDocument:
        """Create ParsedDocument from extracted text."""
        word_count = len(text.split())
        file_extension = Path(filename).suffix.lower().lstrip(".")

        return ParsedDocument(
            filename=filename,
            text=text,
            wordCount=word_count,
            fileType=file_extension,
        )

    async def _execute_analysis(
        self,
        request: DocumentAnalysisRequest,
    ) -> DocumentAnalysisResponse:
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
    logger.info("Starting %s v%s", settings.service_name, settings.version)
    logger.info("Python version: %s", sys.version)
    logger.info("Working directory: %s", os.getcwd())

    # Initialize model client (Hugging Face-first strategy)
    logger.info("Initializing model client...")

    # Model selection priority:
    # 1. Hugging Face Local (best for privacy, free, but requires GPU/CPU)
    # 2. Hugging Face API (£9/month fallback, good privacy)
    #    Less powerful hardware requirements
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
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.version,
    }


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
            detail=(
                "AI model not initialized. Set HF_TOKEN or OPENAI_API_KEY "
                "environment variable."
            ),
        )

    try:
        logger.info(
            "analyze_document called with document: %s",
            request.document.filename,
        )
        logger.info(
            "Document text length: %s chars",
            len(request.document.text),
        )
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
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}",
        )


@app.post("/api/v1/analyze-image", response_model=DocumentAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    user_name: str = Form(...),
    user_email: Optional[str] = Form(None),
    session_id: str = Form(...),
    user_question: Optional[str] = Form(None),
):
    """
    Analyze image of legal document using OCR and extract case data.

    Supports: JPG, PNG, BMP, TIFF, PDF (scanned), HEIC (iPhone photos)

    Args:
        file: Uploaded image file
        user_name: User's full name
        user_email: User's email address (optional)
        session_id: Session UUID
        user_question: Optional question about the document

    Returns:
        DocumentAnalysisResponse with analysis and suggested case data

    Raises:
        HTTPException: If model not initialized, OCR fails, or analysis fails
    """
    # Check if model is initialized
    if model_client is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI model not initialized. Set HF_TOKEN or OPENAI_API_KEY "
                "environment variable."
            ),
        )

    try:
        # Create and use image analysis service
        image_service = ImageAnalysisService(model_client, settings)
        return await image_service.analyze_image(
            file=file,
            user_name=user_name,
            user_email=user_email,
            session_id=session_id,
            user_question=user_question,
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
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}",
        )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Catch-all exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "status_code": 500,
        },
    )


if __name__ == "__main__":
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    mode = (
        "DEVELOPMENT"
        if settings.environment == "development"
        else "PRODUCTION"
    )
    logger.info("Mode: %s", mode)

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

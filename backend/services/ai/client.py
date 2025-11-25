"""
Python AI Client Service - Document Analysis and OCR Processing

This service handles AI-powered document analysis and image OCR processing on the
Python backend. Unlike the TypeScript client (which makes HTTP requests TO the Python
backend), this service PERFORMS the actual AI operations.

Converted from: src/services/PythonAIClient.ts

Key Features:
- Document analysis using AI models (OpenAI, Anthropic, HuggingFace)
- Image OCR using Tesseract with automatic preprocessing
- Structured case data extraction with confidence scores
- Automatic retries with exponential backoff
- Comprehensive error handling and logging
- Support for multiple image formats (JPG, PNG, BMP, TIFF, PDF, HEIC)

Author: Justice Companion Team
License: MIT
"""

from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from pathlib import Path
import asyncio
import logging

from pydantic import BaseModel, Field, ConfigDict, field_validator
from fastapi import HTTPException

# AI service imports
try:
    # Try absolute import (when running from project root)
    from backend.services.ai.service import (
        UnifiedAIService,
        AIProviderConfig,
        ParsedDocument,
        UserProfile,
        ExtractionSource,
        AIProviderType,
    )
except ImportError:
    # Fall back to relative import (when running tests)
    from unified_ai_service import (
        UnifiedAIService,
        AIProviderConfig,
        ParsedDocument,
        UserProfile,
        ExtractionSource,
        AIProviderType,
    )

# Type aliases
CaseType = Literal["employment", "housing", "consumer", "family", "other"]

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# PYDANTIC MODELS - Request/Response Types
# ============================================================================

class ConfidenceScores(BaseModel):
    """Confidence scores for extracted fields (0.0-1.0)"""

    title: float = Field(..., ge=0.0, le=1.0)
    case_type: float = Field(..., ge=0.0, le=1.0)
    description: float = Field(..., ge=0.0, le=1.0)
    opposing_party: float = Field(..., ge=0.0, le=1.0)
    case_number: float = Field(..., ge=0.0, le=1.0)
    court_name: float = Field(..., ge=0.0, le=1.0)
    filing_deadline: float = Field(..., ge=0.0, le=1.0)
    next_hearing_date: float = Field(..., ge=0.0, le=1.0)

    model_config = ConfigDict(from_attributes=True)

class SuggestedCaseDataResponse(BaseModel):
    """Suggested case data extracted from document"""

    document_ownership_mismatch: bool = Field(
        False, description="Whether document claimant name differs from user name"
    )
    document_claimant_name: Optional[str] = Field(
        None, description="Claimant name found in document (if different from user)"
    )
    title: str = Field(..., min_length=1, description="Case title")
    case_type: CaseType = Field(..., description="Legal case type")
    description: str = Field(..., min_length=1, description="Case description")
    claimant_name: str = Field(..., description="User's name as claimant")
    opposing_party: Optional[str] = Field(None, description="Opposing party name")
    case_number: Optional[str] = Field(None, description="Court/tribunal case number")
    court_name: Optional[str] = Field(None, description="Court or tribunal name")
    filing_deadline: Optional[str] = Field(None, description="Filing deadline in YYYY-MM-DD format")
    next_hearing_date: Optional[str] = Field(
        None, description="Next hearing date in YYYY-MM-DD format"
    )
    confidence: ConfidenceScores = Field(..., description="Confidence scores for each field")
    extracted_from: Dict[str, Optional[ExtractionSource]] = Field(
        default_factory=dict, description="Source text for each extracted field"
    )

    model_config = ConfigDict(from_attributes=True)

class DocumentAnalysisRequest(BaseModel):
    """Request for document analysis"""

    document: ParsedDocument = Field(..., description="Parsed document with text content")
    user_profile: UserProfile = Field(..., description="User profile information")
    session_id: str = Field(..., min_length=1, description="Session UUID")
    user_question: Optional[str] = Field(None, description="Optional user question about document")

    model_config = ConfigDict(from_attributes=True)

class DocumentAnalysisResponse(BaseModel):
    """Response from document analysis"""

    analysis: str = Field(..., description="Conversational analysis for user")
    suggested_case_data: SuggestedCaseDataResponse = Field(
        ..., description="Structured case data extracted from document"
    )
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    model_config = ConfigDict(from_attributes=True)

class OCRResult(BaseModel):
    """OCR processing result"""

    text: str = Field(..., description="Extracted text from image")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence score")
    word_count: int = Field(..., ge=0, description="Number of words extracted")
    language: str = Field(default="eng", description="Detected language")
    preprocessing_applied: List[str] = Field(
        default_factory=list, description="Preprocessing steps applied"
    )

    model_config = ConfigDict(from_attributes=True)

class ImageAnalysisRequest(BaseModel):
    """Request for image analysis with OCR"""

    image_path: str = Field(..., description="Path to image file")
    user_name: str = Field(..., min_length=1, description="User's full name")
    session_id: str = Field(..., min_length=1, description="Session UUID")
    user_email: Optional[str] = Field(None, description="User's email address")
    user_question: Optional[str] = Field(None, description="Optional user question")

    model_config = ConfigDict(from_attributes=True)

    @field_validator("image_path")
    @classmethod
    @classmethod
    def validate_image_path(cls, v: str) -> str:
        """Validate image path exists"""
        path = Path(v)
        if not path.exists():
            raise ValueError(f"Image file not found: {v}")
        if not path.is_file():
            raise ValueError(f"Path is not a file: {v}")
        return v

class ServiceHealthResponse(BaseModel):
    """Health check response"""

    status: Literal["healthy", "unhealthy"]
    service: str = "Python AI Service"
    version: str = "1.0.0"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    ai_provider: Optional[str] = None
    model_ready: bool = False

    model_config = ConfigDict(from_attributes=True)

class ServiceInfoResponse(BaseModel):
    """Service information response"""

    api_version: str = "v1"
    service: str = "Python AI Service"
    version: str = "1.0.0"
    model_provider: str
    model_ready: bool
    available_agents: List[str] = Field(
        default_factory=lambda: ["document_analyzer", "ocr_processor", "case_extractor"]
    )

    model_config = ConfigDict(from_attributes=True)

# ============================================================================
# PYTHON AI CLIENT SERVICE - Server-Side Implementation
# ============================================================================

class PythonAIClientService:
    """
    Python AI Client Service - Server-side document analysis and OCR.

    This service performs AI operations on the Python backend, handling:
    - Document text analysis and case data extraction
    - Image OCR processing with Tesseract
    - Structured data extraction with confidence scoring
    - Multi-provider AI support (OpenAI, Anthropic, HuggingFace)

    Unlike the TypeScript client which makes HTTP requests, this service
    HANDLES those requests and performs the actual AI processing.

    Example:
        >>> config = AIProviderConfig(
        ...     provider=AIProviderType.OPENAI,
        ...     api_key="sk-...",
        ...     model="gpt-4-turbo"
        ... )
        >>> service = PythonAIClientService(config)
        >>>
        >>> request = DocumentAnalysisRequest(
        ...     document=ParsedDocument(
        ...         filename="contract.pdf",
        ...         text="Employment contract content...",
        ...         word_count=500,
        ...         file_type="pdf"
        ...     ),
        ...     user_profile=UserProfile(name="John Doe", email="john@example.com"),
        ...     session_id="uuid-session-id"
        ... )
        >>>
        >>> result = await service.analyze_document(request)
        >>> print(result.suggested_case_data.case_type)  # "employment"
    """

    def __init__(
        self,
        ai_config: AIProviderConfig,
        timeout: int = 120,
        max_retries: int = 3,
        retry_delay: int = 1000,
        audit_logger: Optional[Any] = None,
    ):
        """
        Initialize Python AI Client Service.

        Args:
            ai_config: AI provider configuration
            timeout: Request timeout in seconds (default: 120)
            max_retries: Maximum retry attempts (default: 3)
            retry_delay: Initial retry delay in milliseconds (default: 1000)
            audit_logger: Optional audit logger instance

        Raises:
            ValueError: If configuration is invalid
        """
        self.ai_config = ai_config
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay_ms = retry_delay
        self.audit_logger = audit_logger

        # Initialize AI service
        self.ai_service = UnifiedAIService(config=ai_config, audit_logger=audit_logger)

        logger.info(
            f"Initialized PythonAIClientService with {ai_config.provider.value}/{ai_config.model}"
        )

    async def is_available(self) -> bool:
        """
        Check if service is available and AI client is configured.

        Returns:
            True if service is healthy and ready to process requests

        Example:
            >>> if await service.is_available():
            ...     result = await service.analyze_document(request)
        """
        try:
            return self.ai_service.is_configured()
        except Exception as error:
            logger.warning(f"Service availability check failed: {error}")
            return False

    async def get_health(self) -> ServiceHealthResponse:
        """
        Get service health status.

        Returns:
            Health status with provider information

        Example:
            >>> health = await service.get_health()
            >>> print(health.status)  # "healthy"
        """
        is_ready = await self.is_available()

        return ServiceHealthResponse(
            status="healthy" if is_ready else "unhealthy",
            ai_provider=self.ai_config.provider.value,
            model_ready=is_ready,
        )

    async def get_info(self) -> ServiceInfoResponse:
        """
        Get service information including provider and model details.

        Returns:
            Service information response

        Example:
            >>> info = await service.get_info()
            >>> print(f"{info.model_provider} ready: {info.model_ready}")
        """
        is_ready = await self.is_available()

        return ServiceInfoResponse(
            model_provider=self.ai_config.provider.value, model_ready=is_ready
        )

    async def analyze_document(self, request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
        """
        Analyze document text and extract structured case data.

        Uses AI to:
        1. Generate conversational analysis of document
        2. Extract structured case data (title, type, parties, dates)
        3. Assign confidence scores to extracted fields
        4. Detect document ownership mismatches

        Args:
            request: Document analysis request with parsed text

        Returns:
            Analysis with suggested case data

        Raises:
            HTTPException: If analysis fails or service unavailable

        Example:
            >>> request = DocumentAnalysisRequest(
            ...     document=ParsedDocument(...),
            ...     user_profile=UserProfile(name="Alice Smith"),
            ...     session_id="uuid"
            ... )
            >>> result = await service.analyze_document(request)
            >>> print(result.suggested_case_data.case_type)
        """
        return await self._retry_operation(self._analyze_document_impl, request)

    async def _analyze_document_impl(
        self, request: DocumentAnalysisRequest
    ) -> DocumentAnalysisResponse:
        """Internal implementation of document analysis with retry support."""
        try:
            logger.info(
                f"Analyzing document: {request.document.filename} "
                f"({request.document.word_count} words)"
            )

            # Use unified AI service to extract case data
            extraction_result = await self.ai_service.extract_case_data_from_document(
                parsed_doc=request.document,
                user_profile=request.user_profile,
                user_question=request.user_question,
            )

            # Convert to response format
            suggested_case_data = SuggestedCaseDataResponse(
                document_ownership_mismatch=extraction_result.suggested_case_data.document_ownership_mismatch
                or False,
                document_claimant_name=extraction_result.suggested_case_data.document_claimant_name,
                title=extraction_result.suggested_case_data.title,
                case_type=extraction_result.suggested_case_data.case_type,
                description=extraction_result.suggested_case_data.description,
                claimant_name=extraction_result.suggested_case_data.claimant_name
                or request.user_profile.name,
                opposing_party=extraction_result.suggested_case_data.opposing_party,
                case_number=extraction_result.suggested_case_data.case_number,
                court_name=extraction_result.suggested_case_data.court_name,
                filing_deadline=extraction_result.suggested_case_data.filing_deadline,
                next_hearing_date=extraction_result.suggested_case_data.next_hearing_date,
                confidence=ConfidenceScores(
                    title=extraction_result.suggested_case_data.confidence.title,
                    case_type=extraction_result.suggested_case_data.confidence.case_type,
                    description=extraction_result.suggested_case_data.confidence.description,
                    opposing_party=extraction_result.suggested_case_data.confidence.opposing_party,
                    case_number=extraction_result.suggested_case_data.confidence.case_number,
                    court_name=extraction_result.suggested_case_data.confidence.court_name,
                    filing_deadline=extraction_result.suggested_case_data.confidence.filing_deadline,
                    next_hearing_date=extraction_result.suggested_case_data.confidence.next_hearing_date,
                ),
                extracted_from=extraction_result.suggested_case_data.extracted_from,
            )

            logger.info(f"Document analyzed successfully: {suggested_case_data.case_type} case")

            return DocumentAnalysisResponse(
                analysis=extraction_result.analysis,
                suggested_case_data=suggested_case_data,
                metadata={
                    "provider": self.ai_config.provider.value,
                    "model": self.ai_config.model,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        except Exception as error:
            logger.error(f"Document analysis failed: {error}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Document analysis failed: {str(error)}")

    async def analyze_image(self, request: ImageAnalysisRequest) -> DocumentAnalysisResponse:
        """
        Analyze image using OCR and extract structured case data.

        Supports: JPG, PNG, BMP, TIFF, PDF (scanned), HEIC (iPhone photos)

        Process:
        1. Preprocess image (deskew, denoise, enhance contrast)
        2. Run Tesseract OCR to extract text
        3. Analyze extracted text with AI
        4. Extract structured case data

        Args:
            request: Image analysis request with file path

        Returns:
            Analysis with suggested case data and OCR metadata

        Raises:
            HTTPException: If OCR fails, Tesseract not installed, or analysis fails

        Example:
            >>> request = ImageAnalysisRequest(
            ...     image_path="/path/to/contract.jpg",
            ...     user_name="Bob Johnson",
            ...     session_id="uuid"
            ... )
            >>> result = await service.analyze_image(request)
            >>> print(result.metadata["ocr"]["confidence"])
        """
        return await self._retry_operation(self._analyze_image_impl, request)

    async def _analyze_image_impl(self, request: ImageAnalysisRequest) -> DocumentAnalysisResponse:
        """Internal implementation of image analysis with OCR."""
        try:
            logger.info(f"Analyzing image with OCR: {request.image_path}")

            # Step 1: Perform OCR
            ocr_result = await self._perform_ocr(request.image_path)

            logger.info(
                f"OCR extracted {ocr_result.word_count} words "
                f"(confidence: {ocr_result.confidence:.2%})"
            )

            # Step 2: Create parsed document from OCR text
            filename = Path(request.image_path).name
            parsed_doc = ParsedDocument(
                filename=filename,
                text=ocr_result.text,
                word_count=ocr_result.word_count,
                file_type=Path(request.image_path).suffix.lstrip("."),
            )

            # Step 3: Analyze extracted text
            user_profile = UserProfile(name=request.user_name, email=request.user_email)

            extraction_result = await self.ai_service.extract_case_data_from_document(
                parsed_doc=parsed_doc,
                user_profile=user_profile,
                user_question=request.user_question,
            )

            # Convert to response format
            suggested_case_data = SuggestedCaseDataResponse(
                document_ownership_mismatch=extraction_result.suggested_case_data.document_ownership_mismatch
                or False,
                document_claimant_name=extraction_result.suggested_case_data.document_claimant_name,
                title=extraction_result.suggested_case_data.title,
                case_type=extraction_result.suggested_case_data.case_type,
                description=extraction_result.suggested_case_data.description,
                claimant_name=extraction_result.suggested_case_data.claimant_name
                or request.user_name,
                opposing_party=extraction_result.suggested_case_data.opposing_party,
                case_number=extraction_result.suggested_case_data.case_number,
                court_name=extraction_result.suggested_case_data.court_name,
                filing_deadline=extraction_result.suggested_case_data.filing_deadline,
                next_hearing_date=extraction_result.suggested_case_data.next_hearing_date,
                confidence=ConfidenceScores(
                    title=extraction_result.suggested_case_data.confidence.title,
                    case_type=extraction_result.suggested_case_data.confidence.case_type,
                    description=extraction_result.suggested_case_data.confidence.description,
                    opposing_party=extraction_result.suggested_case_data.confidence.opposing_party,
                    case_number=extraction_result.suggested_case_data.confidence.case_number,
                    court_name=extraction_result.suggested_case_data.confidence.court_name,
                    filing_deadline=extraction_result.suggested_case_data.confidence.filing_deadline,
                    next_hearing_date=extraction_result.suggested_case_data.confidence.next_hearing_date,
                ),
                extracted_from=extraction_result.suggested_case_data.extracted_from,
            )

            logger.info(
                f"Image analyzed successfully: {suggested_case_data.case_type} case "
                f"(OCR confidence: {ocr_result.confidence:.2%})"
            )

            return DocumentAnalysisResponse(
                analysis=extraction_result.analysis,
                suggested_case_data=suggested_case_data,
                metadata={
                    "provider": self.ai_config.provider.value,
                    "model": self.ai_config.model,
                    "timestamp": datetime.utcnow().isoformat(),
                    "ocr": {
                        "confidence": ocr_result.confidence,
                        "word_count": ocr_result.word_count,
                        "language": ocr_result.language,
                        "preprocessing": ocr_result.preprocessing_applied,
                    },
                },
            )

        except Exception as error:
            logger.error(f"Image analysis failed: {error}", exc_info=True)

            # Provide helpful error messages
            if "tesseract" in str(error).lower():
                raise HTTPException(
                    status_code=503,
                    detail="Tesseract OCR not installed. Install with: apt-get install tesseract-ocr (Linux) or brew install tesseract (macOS)",
                )

            raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(error)}")

    async def _perform_ocr(self, image_path: str) -> OCRResult:
        """
        Perform OCR on image file using Tesseract.

        Preprocessing steps:
        1. Convert to grayscale
        2. Deskew (straighten rotated text)
        3. Denoise (remove artifacts)
        4. Enhance contrast (adaptive histogram equalization)
        5. Binarization (convert to black/white)

        Args:
            image_path: Path to image file

        Returns:
            OCR result with extracted text and confidence

        Raises:
            RuntimeError: If Tesseract is not installed
            ValueError: If image format is unsupported
        """
        try:
            # Import OCR dependencies (lazy import)
            try:
                import pytesseract
                from PIL import Image
                import numpy as np
                import cv2
            except ImportError as e:
                missing_lib = str(e).split("'")[1]
                raise RuntimeError(
                    f"OCR library not installed: {missing_lib}. "
                    f"Install with: pip install pytesseract pillow opencv-python"
                )

            # Load image
            image = Image.open(image_path)

            # Convert to numpy array for preprocessing
            img_array = np.array(image)

            # Preprocessing pipeline
            preprocessing_steps = []

            # 1. Convert to grayscale if needed
            if len(img_array.shape) == 3:
                img_gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                preprocessing_steps.append("grayscale")
            else:
                img_gray = img_array

            # 2. Denoise
            img_denoised = cv2.fastNlMeansDenoising(img_gray, None, 10, 7, 21)
            preprocessing_steps.append("denoise")

            # 3. Deskew (detect and correct rotation)
            coords = np.column_stack(np.where(img_denoised > 0))
            if len(coords) > 0:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle

                if abs(angle) > 0.5:  # Only rotate if needed
                    (h, w) = img_denoised.shape
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    img_deskewed = cv2.warpAffine(
                        img_denoised,
                        M,
                        (w, h),
                        flags=cv2.INTER_CUBIC,
                        borderMode=cv2.BORDER_REPLICATE,
                    )
                    preprocessing_steps.append(f"deskew_{angle:.1f}deg")
                else:
                    img_deskewed = img_denoised
            else:
                img_deskewed = img_denoised

            # 4. Enhance contrast (adaptive histogram equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            img_enhanced = clahe.apply(img_deskewed)
            preprocessing_steps.append("contrast_enhance")

            # 5. Binarization (Otsu's thresholding)
            _, img_binary = cv2.threshold(img_enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            preprocessing_steps.append("binarize")

            # Convert back to PIL Image
            processed_image = Image.fromarray(img_binary)

            # Run Tesseract OCR
            custom_config = (
                r"--oem 3 --psm 6"  # OEM 3: Default, PSM 6: Assume uniform block of text
            )

            # Extract text
            text = pytesseract.image_to_string(processed_image, config=custom_config)

            # Get detailed data for confidence calculation
            data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)

            # Calculate average confidence (excluding -1 values)
            confidences = [float(conf) for conf in data["conf"] if conf != -1 and conf != "-1"]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            # Count words
            words = text.split()
            word_count = len(words)

            logger.debug(
                f"OCR completed: {word_count} words, "
                f"confidence: {avg_confidence:.2%}, "
                f"preprocessing: {', '.join(preprocessing_steps)}"
            )

            return OCRResult(
                text=text.strip(),
                confidence=avg_confidence / 100.0,  # Convert to 0.0-1.0
                word_count=word_count,
                language="eng",
                preprocessing_applied=preprocessing_steps,
            )

        except Exception as error:
            logger.error(f"OCR processing failed: {error}", exc_info=True)
            raise RuntimeError(f"OCR processing failed: {str(error)}")

    async def _retry_operation(self, operation_func, request) -> DocumentAnalysisResponse:
        """
        Retry operation with exponential backoff.

        Retry logic:
        - Retry on 5xx errors (server errors)
        - Retry on 429 (rate limit)
        - Don't retry on 4xx errors (client errors, except 429)
        - Exponential backoff: 1s, 2s, 4s

        Args:
            operation_func: Async function to retry
            request: Request object to pass to function

        Returns:
            Operation result

        Raises:
            HTTPException: After max retries exceeded or on client error
        """
        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                return await operation_func(request)

            except HTTPException as error:
                last_error = error

                # Don't retry on client errors (400-499) except 429 (rate limit)
                if 400 <= error.status_code < 500 and error.status_code != 429:
                    logger.warning(
                        f"Client error (won't retry): {error.status_code} - {error.detail}"
                    )
                    raise

                # Don't retry on last attempt
                if attempt == self.max_retries:
                    break

                # Calculate delay with exponential backoff
                delay_ms = self.retry_delay_ms * (2**attempt)
                delay_sec = delay_ms / 1000.0

                logger.warning(
                    f"Retry attempt {attempt + 1}/{self.max_retries} "
                    f"after {delay_sec}s (error: {error.status_code})"
                )

                await asyncio.sleep(delay_sec)

            except Exception as error:
                last_error = error

                # Don't retry on last attempt
                if attempt == self.max_retries:
                    break

                delay_ms = self.retry_delay_ms * (2**attempt)
                delay_sec = delay_ms / 1000.0

                logger.warning(
                    f"Retry attempt {attempt + 1}/{self.max_retries} "
                    f"after {delay_sec}s (error: {str(error)})"
                )

                await asyncio.sleep(delay_sec)

        # Max retries exceeded
        error_msg = str(last_error) if last_error else "Unknown error"
        logger.error(f"Max retries exceeded: {error_msg}")

        raise HTTPException(
            status_code=500,
            detail=f"Operation failed after {self.max_retries} retries: {error_msg}",
        )

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_python_ai_client_service(
    provider: str = "openai",
    api_key: str = "",
    model: str = "gpt-4-turbo",
    endpoint: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    timeout: int = 120,
    max_retries: int = 3,
    audit_logger: Optional[Any] = None,
) -> PythonAIClientService:
    """
    Factory function to create Python AI Client Service.

    Args:
        provider: AI provider name (default: "openai")
        api_key: API key for provider
        model: Model name (default: "gpt-4-turbo")
        endpoint: Optional custom endpoint
        temperature: Sampling temperature (default: 0.7)
        max_tokens: Maximum tokens (default: 4096)
        timeout: Request timeout in seconds (default: 120)
        max_retries: Maximum retry attempts (default: 3)
        audit_logger: Optional audit logger

    Returns:
        Configured PythonAIClientService instance

    Example:
        >>> service = create_python_ai_client_service(
        ...     provider="openai",
        ...     api_key="sk-...",
        ...     model="gpt-4-turbo"
        ... )
        >>> health = await service.get_health()
        >>> print(health.status)
    """
    ai_config = AIProviderConfig(
        provider=AIProviderType(provider),
        api_key=api_key,
        model=model,
        endpoint=endpoint,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return PythonAIClientService(
        ai_config=ai_config, timeout=timeout, max_retries=max_retries, audit_logger=audit_logger
    )

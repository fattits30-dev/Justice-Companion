"""
Comprehensive tests for Python AI Client Service.

Tests cover:
- Service initialization and configuration
- Health checks and service info
- Document analysis (text extraction)
- Image analysis with OCR
- Error handling and retries
- Confidence scoring
- Edge cases and validation

Author: Justice Companion Team
License: MIT
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Service imports
import sys

# Add parent directories to path for imports
backend_path = Path(__file__).parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from services.python_ai_client import (
    PythonAIClientService,
    create_python_ai_client_service,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    ImageAnalysisRequest,
    ConfidenceScores,
    OCRResult,
)
from services.unified_ai_service import (
    AIProviderConfig,
    AIProviderType,
    ParsedDocument,
    UserProfile,
    DocumentExtractionResponse,
    SuggestedCaseData,
    FieldConfidence,
)
from fastapi import HTTPException

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_ai_config():
    """Mock AI provider configuration."""
    return AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key="sk-test-key-12345",
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4096
    )

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    logger.log_error = Mock()
    return logger

@pytest.fixture
def sample_parsed_document():
    """Sample parsed document."""
    return ParsedDocument(
        filename="employment_contract.pdf",
        text="""
        EMPLOYMENT CONTRACT

        This employment contract is between ABC Corp (Employer) and
        John Smith (Employee) dated January 15, 2024.

        Position: Software Engineer
        Salary: £50,000 per annum
        Start Date: February 1, 2024

        Termination Notice: 30 days written notice required.
        """,
        word_count=52,
        file_type="pdf"
    )

@pytest.fixture
def sample_user_profile():
    """Sample user profile."""
    return UserProfile(
        name="John Smith",
        email="john.smith@example.com"
    )

@pytest.fixture
def sample_document_request(sample_parsed_document, sample_user_profile):
    """Sample document analysis request."""
    return DocumentAnalysisRequest(
        document=sample_parsed_document,
        user_profile=sample_user_profile,
        session_id="test-session-uuid-12345",
        user_question="What type of legal document is this?"
    )

@pytest.fixture
def sample_extraction_response():
    """Sample extraction response from AI service."""
    return DocumentExtractionResponse(
        analysis="This appears to be an employment contract between ABC Corp and John Smith...",
        suggested_case_data=SuggestedCaseData(
            document_ownership_mismatch=False,
            document_claimant_name=None,
            title="Employment Contract Dispute - ABC Corp",
            case_type="employment",
            description="Employment contract dated January 15, 2024 for Software Engineer position",
            claimant_name="John Smith",
            opposing_party="ABC Corp",
            case_number=None,
            court_name=None,
            filing_deadline=None,
            next_hearing_date=None,
            confidence=FieldConfidence(
                title=0.95,
                case_type=0.98,
                description=0.92,
                opposing_party=0.96,
                case_number=0.0,
                court_name=0.0,
                filing_deadline=0.0,
                next_hearing_date=0.0
            ),
            extracted_from={}
        )
    )

# ============================================================================
# SERVICE INITIALIZATION TESTS
# ============================================================================

def test_service_initialization(mock_ai_config, mock_audit_logger):
    """Test service initialization with valid configuration."""
    service = PythonAIClientService(
        ai_config=mock_ai_config,
        timeout=120,
        max_retries=3,
        retry_delay=1000,
        audit_logger=mock_audit_logger
    )

    assert service.ai_config.provider == AIProviderType.OPENAI
    assert service.ai_config.model == "gpt-4-turbo"
    assert service.timeout == 120
    assert service.max_retries == 3
    assert service.retry_delay_ms == 1000
    assert service.audit_logger == mock_audit_logger

def test_service_initialization_defaults(mock_ai_config):
    """Test service initialization with default parameters."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    assert service.timeout == 120
    assert service.max_retries == 3
    assert service.retry_delay_ms == 1000
    assert service.audit_logger is None

def test_factory_function_creation():
    """Test factory function creates service correctly."""
    service = create_python_ai_client_service(
        provider="openai",
        api_key="sk-test-key",
        model="gpt-4-turbo",
        temperature=0.8,
        max_tokens=2048,
        timeout=60,
        max_retries=5
    )

    assert isinstance(service, PythonAIClientService)
    assert service.ai_config.provider == AIProviderType.OPENAI
    assert service.ai_config.model == "gpt-4-turbo"
    assert service.ai_config.temperature == 0.8
    assert service.ai_config.max_tokens == 2048
    assert service.timeout == 60
    assert service.max_retries == 5

def test_factory_function_defaults():
    """Test factory function with default parameters."""
    service = create_python_ai_client_service(api_key="sk-test-key")

    assert service.ai_config.provider == AIProviderType.OPENAI
    assert service.ai_config.model == "gpt-4-turbo"
    assert service.timeout == 120
    assert service.max_retries == 3

# ============================================================================
# HEALTH CHECK TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_is_available_when_configured(mock_ai_config):
    """Test is_available returns True when service is configured."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service.ai_service, 'is_configured', return_value=True):
        result = await service.is_available()
        assert result is True

@pytest.mark.asyncio
async def test_is_available_when_not_configured(mock_ai_config):
    """Test is_available returns False when service is not configured."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service.ai_service, 'is_configured', return_value=False):
        result = await service.is_available()
        assert result is False

@pytest.mark.asyncio
async def test_is_available_handles_exceptions(mock_ai_config):
    """Test is_available handles exceptions gracefully."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service.ai_service, 'is_configured', side_effect=Exception("Test error")):
        result = await service.is_available()
        assert result is False

@pytest.mark.asyncio
async def test_get_health_when_healthy(mock_ai_config):
    """Test get_health returns healthy status."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service, 'is_available', return_value=True):
        health = await service.get_health()

        assert health.status == "healthy"
        assert health.service == "Python AI Service"
        assert health.ai_provider == "openai"
        assert health.model_ready is True
        assert health.version == "1.0.0"

@pytest.mark.asyncio
async def test_get_health_when_unhealthy(mock_ai_config):
    """Test get_health returns unhealthy status."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service, 'is_available', return_value=False):
        health = await service.get_health()

        assert health.status == "unhealthy"
        assert health.model_ready is False

@pytest.mark.asyncio
async def test_get_info(mock_ai_config):
    """Test get_info returns service information."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service, 'is_available', return_value=True):
        info = await service.get_info()

        assert info.api_version == "v1"
        assert info.service == "Python AI Service"
        assert info.version == "1.0.0"
        assert info.model_provider == "openai"
        assert info.model_ready is True
        assert len(info.available_agents) == 3
        assert "document_analyzer" in info.available_agents
        assert "ocr_processor" in info.available_agents
        assert "case_extractor" in info.available_agents

# ============================================================================
# DOCUMENT ANALYSIS TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_analyze_document_success(
    mock_ai_config,
    sample_document_request,
    sample_extraction_response
):
    """Test successful document analysis."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(sample_document_request)

        assert isinstance(result, DocumentAnalysisResponse)
        assert result.analysis == sample_extraction_response.analysis
        assert result.suggested_case_data.case_type == "employment"
        assert result.suggested_case_data.title == "Employment Contract Dispute - ABC Corp"
        assert result.suggested_case_data.opposing_party == "ABC Corp"
        assert result.metadata is not None
        assert result.metadata["provider"] == "openai"
        assert result.metadata["model"] == "gpt-4-turbo"

@pytest.mark.asyncio
async def test_analyze_document_confidence_scores(
    mock_ai_config,
    sample_document_request,
    sample_extraction_response
):
    """Test confidence scores are correctly converted."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(sample_document_request)

        assert result.suggested_case_data.confidence.title == 0.95
        assert result.suggested_case_data.confidence.case_type == 0.98
        assert result.suggested_case_data.confidence.description == 0.92
        assert result.suggested_case_data.confidence.opposing_party == 0.96
        assert result.suggested_case_data.confidence.case_number == 0.0
        assert result.suggested_case_data.confidence.court_name == 0.0

@pytest.mark.asyncio
async def test_analyze_document_with_user_question(
    mock_ai_config,
    sample_parsed_document,
    sample_user_profile,
    sample_extraction_response
):
    """Test document analysis with user question."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    request = DocumentAnalysisRequest(
        document=sample_parsed_document,
        user_profile=sample_user_profile,
        session_id="test-session",
        user_question="Is this contract legally binding?"
    )

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ) as mock_extract:
        await service.analyze_document(request)

        # Verify user question was passed to AI service
        mock_extract.assert_called_once()
        call_args = mock_extract.call_args
        assert call_args.kwargs['user_question'] == "Is this contract legally binding?"

@pytest.mark.asyncio
async def test_analyze_document_without_user_question(
    mock_ai_config,
    sample_parsed_document,
    sample_user_profile,
    sample_extraction_response
):
    """Test document analysis without user question."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    request = DocumentAnalysisRequest(
        document=sample_parsed_document,
        user_profile=sample_user_profile,
        session_id="test-session",
        user_question=None
    )

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(request)
        assert isinstance(result, DocumentAnalysisResponse)

@pytest.mark.asyncio
async def test_analyze_document_error_handling(
    mock_ai_config,
    sample_document_request
):
    """Test document analysis error handling."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=0)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        side_effect=Exception("AI service error")
    ):
        with pytest.raises(HTTPException) as exc_info:
            await service.analyze_document(sample_document_request)

        assert exc_info.value.status_code == 500
        assert "Document analysis failed" in exc_info.value.detail

# ============================================================================
# IMAGE ANALYSIS AND OCR TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_analyze_image_success(mock_ai_config, sample_extraction_response, tmp_path):
    """Test successful image analysis with OCR."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    # Create temporary test image
    test_image = tmp_path / "test_contract.jpg"
    test_image.write_text("dummy image")

    request = ImageAnalysisRequest(
        image_path=str(test_image),
        user_name="Alice Johnson",
        session_id="test-session-uuid",
        user_email="alice@example.com",
        user_question="What does this document say?"
    )

    mock_ocr_result = OCRResult(
        text="EMPLOYMENT CONTRACT\n\nThis contract is between ABC Corp and Alice Johnson...",
        confidence=0.92,
        word_count=45,
        language="eng",
        preprocessing_applied=["grayscale", "denoise", "contrast_enhance", "binarize"]
    )

    with patch.object(service, '_perform_ocr', return_value=mock_ocr_result), \
         patch.object(service.ai_service, 'extract_case_data_from_document', return_value=sample_extraction_response):

        result = await service.analyze_image(request)

        assert isinstance(result, DocumentAnalysisResponse)
        assert result.analysis == sample_extraction_response.analysis
        assert result.metadata is not None
        assert result.metadata["ocr"]["confidence"] == 0.92
        assert result.metadata["ocr"]["word_count"] == 45
        assert "grayscale" in result.metadata["ocr"]["preprocessing"]

@pytest.mark.asyncio
async def test_analyze_image_validates_file_existence(mock_ai_config):
    """Test image analysis validates file existence."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    with pytest.raises(ValueError) as exc_info:
        request = ImageAnalysisRequest(
            image_path="/nonexistent/path/image.jpg",
            user_name="Test User",
            session_id="test-session"
        )

    assert "not found" in str(exc_info.value).lower()

@pytest.mark.asyncio
async def test_perform_ocr_preprocessing(mock_ai_config, tmp_path):
    """Test OCR preprocessing pipeline."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    # Create a simple test image
    test_image = tmp_path / "test.png"

    # Mock PIL, cv2, and pytesseract
    with patch('services.python_ai_client.Image') as mock_image, \
         patch('services.python_ai_client.np') as mock_np, \
         patch('services.python_ai_client.cv2') as mock_cv2, \
         patch('services.python_ai_client.pytesseract') as mock_pytesseract:

        # Setup mocks
        mock_img = MagicMock()
        mock_image.open.return_value = mock_img
        mock_image.fromarray.return_value = mock_img

        mock_np.array.return_value = MagicMock()
        mock_cv2.cvtColor.return_value = MagicMock()
        mock_cv2.fastNlMeansDenoising.return_value = MagicMock()
        mock_cv2.createCLAHE.return_value.apply.return_value = MagicMock()
        mock_cv2.threshold.return_value = (0, MagicMock())

        mock_pytesseract.image_to_string.return_value = "Test OCR text"
        mock_pytesseract.image_to_data.return_value = {
            "conf": [85, 90, 88, -1, 92]
        }

        # Create dummy file
        test_image.write_text("dummy")

        result = await service._perform_ocr(str(test_image))

        assert result.text == "Test OCR text"
        assert result.confidence > 0.0
        assert result.word_count == 3
        assert "grayscale" in result.preprocessing_applied
        assert "denoise" in result.preprocessing_applied

@pytest.mark.asyncio
async def test_perform_ocr_missing_dependencies(mock_ai_config, tmp_path):
    """Test OCR fails gracefully when dependencies are missing."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    test_image = tmp_path / "test.png"
    test_image.write_text("dummy")

    with patch('services.python_ai_client.pytesseract', None):
        with pytest.raises(RuntimeError) as exc_info:
            await service._perform_ocr(str(test_image))

        assert "not installed" in str(exc_info.value).lower()

@pytest.mark.asyncio
async def test_analyze_image_tesseract_not_installed_error(
    mock_ai_config,
    tmp_path
):
    """Test image analysis returns 503 when Tesseract is not installed."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=0)

    test_image = tmp_path / "test.jpg"
    test_image.write_text("dummy")

    request = ImageAnalysisRequest(
        image_path=str(test_image),
        user_name="Test User",
        session_id="test-session"
    )

    with patch.object(
        service,
        '_perform_ocr',
        side_effect=RuntimeError("tesseract not installed")
    ):
        with pytest.raises(HTTPException) as exc_info:
            await service.analyze_image(request)

        assert exc_info.value.status_code == 503
        assert "Tesseract OCR not installed" in exc_info.value.detail

# ============================================================================
# RETRY LOGIC TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_retry_logic_succeeds_on_first_attempt(
    mock_ai_config,
    sample_document_request,
    sample_extraction_response
):
    """Test retry logic succeeds on first attempt."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=3)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ) as mock_extract:

        result = await service.analyze_document(sample_document_request)

        assert isinstance(result, DocumentAnalysisResponse)
        # Should only be called once (no retries)
        assert mock_extract.call_count == 1

@pytest.mark.asyncio
async def test_retry_logic_succeeds_after_retries(
    mock_ai_config,
    sample_document_request,
    sample_extraction_response
):
    """Test retry logic succeeds after transient failures."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=3, retry_delay=10)

    call_count = 0

    async def mock_extract_with_retries(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise HTTPException(status_code=503, detail="Service temporarily unavailable")
        return sample_extraction_response

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        side_effect=mock_extract_with_retries
    ):
        result = await service.analyze_document(sample_document_request)

        assert isinstance(result, DocumentAnalysisResponse)
        assert call_count == 3  # Failed twice, succeeded on third

@pytest.mark.asyncio
async def test_retry_logic_max_retries_exceeded(
    mock_ai_config,
    sample_document_request
):
    """Test retry logic fails after max retries."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=2, retry_delay=10)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        side_effect=HTTPException(status_code=503, detail="Service unavailable")
    ) as mock_extract:

        with pytest.raises(HTTPException) as exc_info:
            await service.analyze_document(sample_document_request)

        assert exc_info.value.status_code == 500
        assert "failed after 2 retries" in exc_info.value.detail
        # Should be called max_retries + 1 times (initial + retries)
        assert mock_extract.call_count == 3

@pytest.mark.asyncio
async def test_retry_logic_does_not_retry_client_errors(
    mock_ai_config,
    sample_document_request
):
    """Test retry logic does not retry 4xx client errors (except 429)."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=3)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        side_effect=HTTPException(status_code=400, detail="Bad request")
    ) as mock_extract:

        with pytest.raises(HTTPException) as exc_info:
            await service.analyze_document(sample_document_request)

        assert exc_info.value.status_code == 400
        # Should only be called once (no retries for 400 errors)
        assert mock_extract.call_count == 1

@pytest.mark.asyncio
async def test_retry_logic_retries_rate_limit_errors(
    mock_ai_config,
    sample_document_request,
    sample_extraction_response
):
    """Test retry logic retries 429 rate limit errors."""
    service = PythonAIClientService(ai_config=mock_ai_config, max_retries=2, retry_delay=10)

    call_count = 0

    async def mock_extract_with_rate_limit(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        return sample_extraction_response

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        side_effect=mock_extract_with_rate_limit
    ):
        result = await service.analyze_document(sample_document_request)

        assert isinstance(result, DocumentAnalysisResponse)
        assert call_count == 2  # Failed once with 429, succeeded on retry

@pytest.mark.asyncio
async def test_retry_exponential_backoff_delays(
    mock_ai_config,
    sample_document_request
):
    """Test retry logic uses exponential backoff delays."""
    service = PythonAIClientService(
        ai_config=mock_ai_config,
        max_retries=3,
        retry_delay=100  # 100ms base delay
    )

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        side_effect=HTTPException(status_code=503, detail="Service unavailable")
    ), patch('services.python_ai_client.asyncio.sleep') as mock_sleep:

        with pytest.raises(HTTPException):
            await service.analyze_document(sample_document_request)

        # Verify exponential backoff: 100ms, 200ms, 400ms
        assert mock_sleep.call_count == 3
        sleep_delays = [call.args[0] for call in mock_sleep.call_args_list]
        assert sleep_delays[0] == 0.1  # 100ms
        assert sleep_delays[1] == 0.2  # 200ms
        assert sleep_delays[2] == 0.4  # 400ms

# ============================================================================
# EDGE CASES AND VALIDATION TESTS
# ============================================================================

def test_document_request_validation():
    """Test document request validates required fields."""
    with pytest.raises(ValueError):
        DocumentAnalysisRequest(
            document=None,
            user_profile=UserProfile(name="Test"),
            session_id="test"
        )

def test_image_request_validation_file_not_found():
    """Test image request validates file existence."""
    with pytest.raises(ValueError) as exc_info:
        ImageAnalysisRequest(
            image_path="/nonexistent/file.jpg",
            user_name="Test User",
            session_id="test-session"
        )

    assert "not found" in str(exc_info.value).lower()

def test_confidence_scores_validation():
    """Test confidence scores must be between 0 and 1."""
    with pytest.raises(ValueError):
        ConfidenceScores(
            title=1.5,  # Invalid: > 1.0
            case_type=0.9,
            description=0.8,
            opposing_party=0.7,
            case_number=0.0,
            court_name=0.0,
            filing_deadline=0.0,
            next_hearing_date=0.0
        )

def test_ocr_result_confidence_validation():
    """Test OCR result confidence must be between 0 and 1."""
    with pytest.raises(ValueError):
        OCRResult(
            text="Test",
            confidence=1.5,  # Invalid
            word_count=1,
            language="eng"
        )

@pytest.mark.asyncio
async def test_service_handles_empty_document_text(
    mock_ai_config,
    sample_user_profile,
    sample_extraction_response
):
    """Test service handles empty document text."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    empty_doc = ParsedDocument(
        filename="empty.txt",
        text="",
        word_count=0,
        file_type="txt"
    )

    request = DocumentAnalysisRequest(
        document=empty_doc,
        user_profile=sample_user_profile,
        session_id="test-session"
    )

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(request)
        assert isinstance(result, DocumentAnalysisResponse)

@pytest.mark.asyncio
async def test_service_handles_very_long_document(
    mock_ai_config,
    sample_user_profile,
    sample_extraction_response
):
    """Test service handles very long documents."""
    service = PythonAIClientService(ai_config=mock_ai_config)

    long_text = "This is a test document. " * 10000  # ~50k words

    long_doc = ParsedDocument(
        filename="long_contract.pd",
        text=long_text,
        word_count=50000,
        file_type="pd"
    )

    request = DocumentAnalysisRequest(
        document=long_doc,
        user_profile=sample_user_profile,
        session_id="test-session"
    )

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(request)
        assert isinstance(result, DocumentAnalysisResponse)

# ============================================================================
# MULTIPLE PROVIDER TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_service_with_anthropic_provider(sample_document_request, sample_extraction_response):
    """Test service works with Anthropic provider."""
    config = AIProviderConfig(
        provider=AIProviderType.ANTHROPIC,
        api_key="sk-ant-test-key",
        model="claude-3-5-sonnet-20241022"
    )

    service = PythonAIClientService(ai_config=config)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(sample_document_request)
        assert result.metadata["provider"] == "anthropic"

@pytest.mark.asyncio
async def test_service_with_huggingface_provider(sample_document_request, sample_extraction_response):
    """Test service works with HuggingFace provider."""
    config = AIProviderConfig(
        provider=AIProviderType.HUGGINGFACE,
        api_key="hf-test-key",
        model="meta-llama/Meta-Llama-3.1-70B-Instruct"
    )

    service = PythonAIClientService(ai_config=config)

    with patch.object(
        service.ai_service,
        'extract_case_data_from_document',
        return_value=sample_extraction_response
    ):
        result = await service.analyze_document(sample_document_request)
        assert result.metadata["provider"] == "huggingface"

# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

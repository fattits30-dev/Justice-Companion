# Python AI Client Service - README

## Overview

The **Python AI Client Service** is a server-side service that handles AI-powered document analysis and image OCR processing for Justice Companion. This service performs the actual AI operations on the Python backend.

**Important Distinction:**
- **TypeScript Client** (`src/services/PythonAIClient.ts`): HTTP client that makes requests FROM Electron TO Python backend
- **Python Service** (`backend/services/python_ai_client.py`): Server-side service that HANDLES those requests and performs AI operations

## Features

- **Document Text Analysis**: Extract structured case data from parsed document text
- **Image OCR Processing**: Extract text from images using Tesseract with advanced preprocessing
- **Confidence Scoring**: Assign confidence scores (0.0-1.0) to all extracted fields
- **Multi-Provider AI Support**: Works with OpenAI, Anthropic, HuggingFace, and 7 other providers
- **Automatic Retries**: Exponential backoff retry logic for transient failures
- **Comprehensive Error Handling**: Detailed error messages and logging
- **Health Checks**: Service availability and readiness endpoints
- **Audit Logging**: Optional audit trail for all operations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TypeScript Client (Electron Main Process)                   │
│  src/services/PythonAIClient.ts                              │
│                                                               │
│  - Makes HTTP requests to Python backend                     │
│  - Handles form data for image uploads                       │
│  - Provides clean TypeScript API                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP (port 5051)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Python AI Client Service (FastAPI Backend)                  │
│  backend/services/python_ai_client.py                        │
│                                                               │
│  1. Document Analysis                                        │
│     - Parse document text                                    │
│     - Extract case data with AI                              │
│     - Return structured response                             │
│                                                               │
│  2. Image OCR                                                │
│     - Preprocess image (denoise, deskew, enhance)            │
│     - Run Tesseract OCR                                      │
│     - Analyze extracted text                                 │
│     - Return structured response + OCR metadata              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Unified AI Service                                          │
│  backend/services/unified_ai_service.py                      │
│                                                               │
│  - Multi-provider AI integration                             │
│  - Case data extraction prompts                              │
│  - Streaming and non-streaming chat                          │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Dependencies

```bash
# Core dependencies (in requirements.txt)
pip install fastapi==0.115.0
pip install pydantic[email]==2.9.2
pip install openai>=1.54.0
pip install anthropic>=0.39.0
pip install huggingface-hub>=0.26.0

# OCR dependencies
pip install pytesseract>=0.3.10
pip install pillow>=10.0.0
pip install opencv-python>=4.8.0
```

### System Requirements

**Tesseract OCR** (required for image analysis):

- **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr tesseract-ocr-eng`
- **macOS**: `brew install tesseract`
- **Windows**: Download installer from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

**Python**: 3.9+ (recommended: 3.12+)

## Quick Start

### Basic Usage

```python
from backend.services.python_ai_client import (
    PythonAIClientService,
    create_python_ai_client_service,
    DocumentAnalysisRequest,
    ImageAnalysisRequest
)
from backend.services.unified_ai_service import (
    AIProviderConfig,
    AIProviderType,
    ParsedDocument,
    UserProfile
)

# Create service
service = create_python_ai_client_service(
    provider="openai",
    api_key="sk-your-api-key",
    model="gpt-4-turbo",
    timeout=120,
    max_retries=3
)

# Check health
health = await service.get_health()
print(f"Service status: {health.status}")

# Analyze document
request = DocumentAnalysisRequest(
    document=ParsedDocument(
        filename="contract.pdf",
        text="Employment contract between...",
        word_count=500,
        file_type="pdf"
    ),
    user_profile=UserProfile(
        name="John Smith",
        email="john@example.com"
    ),
    session_id="uuid-session-id",
    user_question="What type of contract is this?"
)

result = await service.analyze_document(request)
print(f"Case type: {result.suggested_case_data.case_type}")
print(f"Title: {result.suggested_case_data.title}")
print(f"Confidence: {result.suggested_case_data.confidence.case_type:.2%}")
```

### Image OCR Analysis

```python
from backend.services.python_ai_client import ImageAnalysisRequest

# Analyze image with OCR
request = ImageAnalysisRequest(
    image_path="/path/to/scanned_contract.jpg",
    user_name="Alice Johnson",
    session_id="uuid-session-id",
    user_email="alice@example.com",
    user_question="What are the key terms?"
)

result = await service.analyze_image(request)
print(f"OCR confidence: {result.metadata['ocr']['confidence']:.2%}")
print(f"Words extracted: {result.metadata['ocr']['word_count']}")
print(f"Case type: {result.suggested_case_data.case_type}")
```

## API Reference

### PythonAIClientService

Main service class for document and image analysis.

#### Constructor

```python
PythonAIClientService(
    ai_config: AIProviderConfig,
    timeout: int = 120,
    max_retries: int = 3,
    retry_delay: int = 1000,
    audit_logger: Optional[Any] = None
)
```

**Parameters:**
- `ai_config`: AI provider configuration (provider, API key, model)
- `timeout`: Request timeout in seconds (default: 120)
- `max_retries`: Maximum retry attempts (default: 3)
- `retry_delay`: Initial retry delay in milliseconds (default: 1000)
- `audit_logger`: Optional audit logger instance

#### Methods

##### `async is_available() -> bool`

Check if service is available and ready to process requests.

**Returns:** `True` if service is healthy

##### `async get_health() -> ServiceHealthResponse`

Get detailed health status.

**Returns:** Health response with status, provider, and readiness

##### `async get_info() -> ServiceInfoResponse`

Get service information including provider and available agents.

**Returns:** Service info with version, provider, and capabilities

##### `async analyze_document(request: DocumentAnalysisRequest) -> DocumentAnalysisResponse`

Analyze document text and extract structured case data.

**Parameters:**
- `request`: Document analysis request with parsed text

**Returns:** Analysis with suggested case data and confidence scores

**Raises:**
- `HTTPException(500)`: If analysis fails
- `HTTPException(503)`: If AI service unavailable

##### `async analyze_image(request: ImageAnalysisRequest) -> DocumentAnalysisResponse`

Analyze image using OCR and extract structured case data.

**Parameters:**
- `request`: Image analysis request with file path

**Returns:** Analysis with suggested case data and OCR metadata

**Raises:**
- `HTTPException(503)`: If Tesseract OCR not installed
- `HTTPException(500)`: If OCR or analysis fails

### Request Models

#### DocumentAnalysisRequest

```python
DocumentAnalysisRequest(
    document: ParsedDocument,
    user_profile: UserProfile,
    session_id: str,
    user_question: Optional[str] = None
)
```

#### ImageAnalysisRequest

```python
ImageAnalysisRequest(
    image_path: str,
    user_name: str,
    session_id: str,
    user_email: Optional[str] = None,
    user_question: Optional[str] = None
)
```

### Response Models

#### DocumentAnalysisResponse

```python
DocumentAnalysisResponse(
    analysis: str,  # Conversational analysis for user
    suggested_case_data: SuggestedCaseDataResponse,
    metadata: Optional[Dict[str, Any]] = None
)
```

#### SuggestedCaseDataResponse

```python
SuggestedCaseDataResponse(
    title: str,
    case_type: "employment" | "housing" | "consumer" | "family" | "other",
    description: str,
    claimant_name: str,
    opposing_party: Optional[str],
    case_number: Optional[str],
    court_name: Optional[str],
    filing_deadline: Optional[str],  # YYYY-MM-DD
    next_hearing_date: Optional[str],  # YYYY-MM-DD
    confidence: ConfidenceScores,
    extracted_from: Dict[str, Optional[ExtractionSource]]
)
```

#### ConfidenceScores

All fields are floats between 0.0 and 1.0:

```python
ConfidenceScores(
    title: float,
    case_type: float,
    description: float,
    opposing_party: float,
    case_number: float,
    court_name: float,
    filing_deadline: float,
    next_hearing_date: float
)
```

## OCR Processing

### Supported Image Formats

- **JPG/JPEG**: Standard photos and scans
- **PNG**: Lossless images
- **BMP**: Windows bitmaps
- **TIFF**: Multi-page documents
- **PDF**: Scanned PDFs (first page)
- **HEIC**: iPhone photos (requires pillow-heif)

### Preprocessing Pipeline

The OCR engine applies these preprocessing steps automatically:

1. **Grayscale Conversion**: Convert color images to grayscale
2. **Denoising**: Remove noise and artifacts using non-local means denoising
3. **Deskewing**: Detect and correct text rotation (up to 45°)
4. **Contrast Enhancement**: Apply CLAHE (adaptive histogram equalization)
5. **Binarization**: Convert to black/white using Otsu's thresholding

### OCR Configuration

Tesseract is configured with:
- **OEM 3**: Default OCR Engine Mode (LSTM + legacy)
- **PSM 6**: Assume uniform block of text

### OCR Result Metadata

```python
{
    "ocr": {
        "confidence": 0.92,  # 0.0-1.0
        "word_count": 485,
        "language": "eng",
        "preprocessing": [
            "grayscale",
            "denoise",
            "deskew_3.2deg",
            "contrast_enhance",
            "binarize"
        ]
    }
}
```

## Retry Logic

### Retry Strategy

- **Server Errors (5xx)**: Retry with exponential backoff
- **Rate Limits (429)**: Retry with exponential backoff
- **Client Errors (4xx)**: No retry (except 429)
- **Network Errors**: Retry with exponential backoff

### Exponential Backoff

With `retry_delay=1000` (1 second):
- Attempt 1: Immediate
- Attempt 2: Wait 1s
- Attempt 3: Wait 2s
- Attempt 4: Wait 4s

**Example:**
```python
service = PythonAIClientService(
    ai_config=config,
    max_retries=3,
    retry_delay=1000  # 1000ms = 1s
)
```

## Error Handling

### Common Errors

#### HTTPException(503) - Tesseract Not Installed

```python
try:
    result = await service.analyze_image(request)
except HTTPException as e:
    if e.status_code == 503 and "Tesseract" in e.detail:
        print("Please install Tesseract OCR")
```

**Solution:** Install Tesseract (see Installation section)

#### HTTPException(500) - Document Analysis Failed

```python
try:
    result = await service.analyze_document(request)
except HTTPException as e:
    if e.status_code == 500:
        print(f"Analysis error: {e.detail}")
```

**Possible causes:**
- AI service timeout
- Invalid API key
- Model not available
- Rate limit exceeded (after retries)

#### ValueError - File Not Found

```python
try:
    request = ImageAnalysisRequest(
        image_path="/nonexistent/image.jpg",
        user_name="Test User",
        session_id="test-session"
    )
except ValueError as e:
    print(f"Validation error: {e}")
```

**Solution:** Verify file path exists and is readable

## Multi-Provider Support

### Supported Providers

1. **OpenAI** - GPT-4, GPT-3.5
2. **Anthropic** - Claude 3.5, Claude 3
3. **HuggingFace** - Llama, Qwen, and 500k+ models
4. **Qwen** - Qwen 2.5 via HuggingFace
5. **Google** - Gemini 1.5 Pro
6. **Cohere** - Command R+
7. **Together AI** - Llama 3.1
8. **Anyscale** - Llama 3.1
9. **Mistral AI** - Mistral Large
10. **Perplexity** - Sonar Large

### Provider Configuration

```python
# OpenAI (default)
config = AIProviderConfig(
    provider=AIProviderType.OPENAI,
    api_key="sk-...",
    model="gpt-4-turbo"
)

# Anthropic
config = AIProviderConfig(
    provider=AIProviderType.ANTHROPIC,
    api_key="sk-ant-...",
    model="claude-3-5-sonnet-20241022"
)

# HuggingFace (privacy-first, ~£9/month)
config = AIProviderConfig(
    provider=AIProviderType.HUGGINGFACE,
    api_key="hf_...",
    model="meta-llama/Meta-Llama-3.1-70B-Instruct"
)
```

## Testing

### Run All Tests

```bash
cd backend/services
pytest test_python_ai_client.py -v
```

### Run Specific Test

```bash
pytest test_python_ai_client.py::test_analyze_document_success -v
```

### Test Coverage

```bash
pytest test_python_ai_client.py --cov=python_ai_client --cov-report=html
```

### Test Categories

- **Service Initialization**: 4 tests
- **Health Checks**: 5 tests
- **Document Analysis**: 7 tests
- **Image OCR**: 6 tests
- **Retry Logic**: 6 tests
- **Edge Cases**: 5 tests
- **Multi-Provider**: 2 tests

**Total: 35+ comprehensive tests**

## Performance

### Typical Response Times

- **Document Analysis** (500 words): 2-5 seconds
- **Image OCR + Analysis** (A4 page): 5-15 seconds
- **Health Check**: <100ms
- **Service Info**: <50ms

### Optimization Tips

1. **Reduce max_tokens**: Lower token count = faster responses
2. **Use faster models**: GPT-3.5 Turbo, Claude Haiku
3. **Parallel processing**: Process multiple documents concurrently
4. **Image preprocessing**: Crop irrelevant borders before OCR
5. **Cache results**: Store analysis results for duplicate documents

## Security

### API Key Management

**Never log or expose API keys:**
```python
# ✅ Good
logger.info(f"Using provider: {config.provider.value}")

# ❌ Bad
logger.info(f"API key: {config.api_key}")
```

### Input Validation

All inputs are validated with Pydantic:
- File paths must exist
- Confidence scores must be 0.0-1.0
- Required fields enforced
- Email validation (if provided)

### Audit Logging

```python
audit_logger = MyAuditLogger()

service = PythonAIClientService(
    ai_config=config,
    audit_logger=audit_logger
)

# All operations logged:
# - Document analysis requests
# - Image analysis requests
# - Errors and failures
# - Provider and model used
```

## Troubleshooting

### Tesseract Not Found

**Error:** `pytesseract.pytesseract.TesseractNotFoundError`

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

### Low OCR Confidence

**Symptoms:** `ocr.confidence < 0.5`

**Solutions:**
1. Ensure image is high resolution (300 DPI minimum)
2. Check image is not rotated >45°
3. Verify text is clearly visible (not blurred or faded)
4. Try manual preprocessing (crop, straighten, enhance contrast)

### AI Model Timeout

**Error:** `HTTPException(500): Operation failed after 3 retries`

**Solutions:**
1. Increase timeout: `PythonAIClientService(timeout=300)`
2. Increase max_retries: `max_retries=5`
3. Use faster model: `model="gpt-3.5-turbo"`
4. Reduce document size (split into chunks)

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'cv2'`

**Solution:**
```bash
pip install opencv-python pillow pytesseract
```

## License

MIT License - See LICENSE file for details

## Author

Justice Companion Team

## Related Documentation

- [Unified AI Service README](./UNIFIED_AI_SERVICE_README.md)
- [AI SDK Service README](./AI_SDK_SERVICE_README.md)
- [Migration Guide](./PYTHON_AI_CLIENT_MIGRATION.md)
- [Usage Examples](./example_python_ai_client.py)

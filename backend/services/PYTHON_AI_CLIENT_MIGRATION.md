# Python AI Client - Migration Guide

## Overview

This guide helps you migrate from the TypeScript client (`src/services/PythonAIClient.ts`) to understanding and using the Python backend service (`backend/services/python_ai_client.py`).

**Important:** These are complementary services, not replacements:
- **TypeScript Client**: Makes HTTP requests FROM Electron TO Python backend
- **Python Service**: HANDLES those requests and performs AI operations

## Architecture Before/After

### Before (TypeScript Only)

```
┌────────────────────────────────────┐
│  Electron Main Process              │
│                                     │
│  - Document parsing                 │
│  - Database operations              │
│  - IPC handlers                     │
│  - Limited AI capabilities          │
└────────────────────────────────────┘
```

### After (TypeScript + Python)

```
┌────────────────────────────────────┐
│  Electron Main Process              │
│  src/services/PythonAIClient.ts     │
│                                     │
│  - Makes HTTP requests              │
│  - Handles form data                │
│  - Provides TypeScript API          │
└──────────────┬─────────────────────┘
               │ HTTP (port 5051)
               ▼
┌────────────────────────────────────┐
│  Python FastAPI Backend             │
│  backend/services/python_ai_client.py│
│                                     │
│  - Document analysis with AI        │
│  - Image OCR with Tesseract         │
│  - Case data extraction             │
│  - Multi-provider AI support        │
└────────────────────────────────────┘
```

## Key Differences

### TypeScript Client (Frontend)

**Purpose:** HTTP client for making requests

**Location:** `src/services/PythonAIClient.ts`

**Key Methods:**
- `isAvailable()` - Check if Python backend is reachable
- `getInfo()` - Get service information
- `analyzeDocument(request)` - Send document for analysis
- `analyzeImage(imagePath, userName, sessionId)` - Upload image for OCR

**Example:**
```typescript
import { PythonAIClient } from './services/PythonAIClient';

const client = new PythonAIClient({
  baseURL: 'http://localhost:5051',
  timeout: 120000,
  maxRetries: 3
});

const result = await client.analyzeDocument({
  document: parsedDoc,
  userProfile: { name: 'John Smith', email: 'john@example.com' },
  sessionId: 'uuid-12345'
});
```

### Python Service (Backend)

**Purpose:** Performs AI operations and OCR processing

**Location:** `backend/services/python_ai_client.py`

**Key Methods:**
- `is_available()` - Check if AI service is configured
- `get_health()` - Get health status
- `analyze_document(request)` - Perform AI-powered document analysis
- `analyze_image(request)` - Perform OCR + AI analysis

**Example:**
```python
from backend.services.python_ai_client import create_python_ai_client_service

service = create_python_ai_client_service(
    provider="openai",
    api_key="sk-...",
    model="gpt-4-turbo"
)

result = await service.analyze_document(request)
```

## Migration Steps

### Step 1: Install Python Dependencies

```bash
# Core dependencies
pip install fastapi==0.115.0
pip install pydantic[email]==2.9.2
pip install openai>=1.54.0
pip install anthropic>=0.39.0
pip install huggingface-hub>=0.26.0

# OCR dependencies
pip install pytesseract>=0.3.10
pip install pillow>=10.0.0
pip install opencv-python>=4.8.0

# System dependencies (Tesseract OCR)
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS:
brew install tesseract

# Windows:
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

### Step 2: Configure AI Provider

Create environment variables or configuration file:

```bash
# .env file
OPENAI_API_KEY=sk-your-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
HUGGINGFACE_API_KEY=hf_your-key-here

# Default AI provider
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4-turbo
```

### Step 3: Initialize Service

**Python Backend (FastAPI):**

```python
# backend/main.py
from fastapi import FastAPI
from backend.services.python_ai_client import create_python_ai_client_service
import os

app = FastAPI()

# Initialize AI service
ai_service = create_python_ai_client_service(
    provider=os.getenv("DEFAULT_AI_PROVIDER", "openai"),
    api_key=os.getenv("OPENAI_API_KEY"),
    model=os.getenv("DEFAULT_AI_MODEL", "gpt-4-turbo"),
    timeout=120,
    max_retries=3
)

@app.get("/health")
async def health_check():
    return await ai_service.get_health()

@app.post("/api/v1/analyze-document")
async def analyze_document(request: DocumentAnalysisRequest):
    return await ai_service.analyze_document(request)
```

### Step 4: Use TypeScript Client

**Electron Main Process:**

```typescript
// electron/services/AIDocumentAnalyzer.ts
import { PythonAIClient } from '../../src/services/PythonAIClient';

export class AIDocumentAnalyzer {
  private client: PythonAIClient;

  constructor() {
    this.client = new PythonAIClient({
      baseURL: 'http://localhost:5051',
      timeout: 120000,
      maxRetries: 3
    });
  }

  async analyzeDocument(parsedDoc: ParsedDocument, userProfile: UserProfile) {
    // Check if Python backend is available
    const available = await this.client.isAvailable();
    if (!available) {
      throw new Error('Python AI service is not available');
    }

    // Analyze document
    const result = await this.client.analyzeDocument({
      document: parsedDoc,
      userProfile,
      sessionId: generateUUID(),
      userQuestion: 'What type of legal document is this?'
    });

    return result;
  }
}
```

## API Comparison

### Health Check

**TypeScript:**
```typescript
const isAvailable = await client.isAvailable();
// Returns: boolean

const info = await client.getInfo();
// Returns: { api_version, service, version, model_provider, model_ready, available_agents }
```

**Python:**
```python
is_available = await service.is_available()
# Returns: bool

health = await service.get_health()
# Returns: ServiceHealthResponse(status, service, version, ai_provider, model_ready)

info = await service.get_info()
# Returns: ServiceInfoResponse(api_version, service, model_provider, available_agents)
```

### Document Analysis

**TypeScript:**
```typescript
const result = await client.analyzeDocument({
  document: {
    filename: 'contract.pdf',
    text: 'Contract text...',
    wordCount: 500,
    fileType: 'pdf'
  },
  userProfile: {
    name: 'John Smith',
    email: 'john@example.com'
  },
  sessionId: 'uuid-12345',
  userQuestion: 'What type of contract is this?'
});

// Returns: DocumentAnalysisResponse
// - analysis: string (conversational analysis)
// - suggestedCaseData: SuggestedCaseData
// - metadata: object (optional)
```

**Python:**
```python
result = await service.analyze_document(
    DocumentAnalysisRequest(
        document=ParsedDocument(
            filename='contract.pdf',
            text='Contract text...',
            word_count=500,
            file_type='pdf'
        ),
        user_profile=UserProfile(
            name='John Smith',
            email='john@example.com'
        ),
        session_id='uuid-12345',
        user_question='What type of contract is this?'
    )
)

# Returns: DocumentAnalysisResponse
# - analysis: str
# - suggested_case_data: SuggestedCaseDataResponse
# - metadata: Optional[Dict[str, Any]]
```

### Image OCR

**TypeScript:**
```typescript
const result = await client.analyzeImage(
  '/path/to/image.jpg',
  'Alice Johnson',
  'uuid-session-id',
  'alice@example.com',
  'What does this document say?'
);

// Returns: DocumentAnalysisResponse with OCR metadata
// - metadata.ocr.confidence: number
// - metadata.ocr.wordCount: number
// - metadata.ocr.preprocessing: string[]
```

**Python:**
```python
result = await service.analyze_image(
    ImageAnalysisRequest(
        image_path='/path/to/image.jpg',
        user_name='Alice Johnson',
        session_id='uuid-session-id',
        user_email='alice@example.com',
        user_question='What does this document say?'
    )
)

# Returns: DocumentAnalysisResponse
# - metadata['ocr']['confidence']: float
# - metadata['ocr']['word_count']: int
# - metadata['ocr']['preprocessing']: List[str]
```

## Error Handling

### TypeScript Client Errors

```typescript
try {
  const result = await client.analyzeDocument(request);
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 503) {
      console.error('Python AI service unavailable');
    } else if (error.response?.status === 400) {
      console.error('Invalid request:', error.response.data);
    }
  } else {
    console.error('Network error:', error.message);
  }
}
```

### Python Service Errors

```python
from fastapi import HTTPException

try:
    result = await service.analyze_document(request)
except HTTPException as e:
    if e.status_code == 503:
        print("Tesseract OCR not installed or AI service unavailable")
    elif e.status_code == 500:
        print(f"Analysis failed: {e.detail}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Testing

### TypeScript Client Tests

```typescript
// tests/services/PythonAIClient.test.ts
import { PythonAIClient } from '../../src/services/PythonAIClient';
import nock from 'nock';

describe('PythonAIClient', () => {
  it('should check service availability', async () => {
    nock('http://localhost:5051')
      .get('/health')
      .reply(200, { status: 'healthy' });

    const client = new PythonAIClient({ baseURL: 'http://localhost:5051' });
    const isAvailable = await client.isAvailable();
    expect(isAvailable).toBe(true);
  });

  it('should analyze document', async () => {
    nock('http://localhost:5051')
      .post('/api/v1/analyze-document')
      .reply(200, { analysis: 'Test analysis', suggestedCaseData: {...} });

    const client = new PythonAIClient({ baseURL: 'http://localhost:5051' });
    const result = await client.analyzeDocument(mockRequest);
    expect(result.analysis).toBe('Test analysis');
  });
});
```

### Python Service Tests

```python
# backend/services/test_python_ai_client.py
import pytest
from backend.services.python_ai_client import PythonAIClientService
from unittest.mock import patch

@pytest.mark.asyncio
async def test_is_available(mock_ai_config):
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service.ai_service, 'is_configured', return_value=True):
        result = await service.is_available()
        assert result is True

@pytest.mark.asyncio
async def test_analyze_document(mock_ai_config, sample_request, sample_response):
    service = PythonAIClientService(ai_config=mock_ai_config)

    with patch.object(service.ai_service, 'extract_case_data_from_document',
                     return_value=sample_response):
        result = await service.analyze_document(sample_request)
        assert result.suggested_case_data.case_type == "employment"
```

## Performance Considerations

### TypeScript Client

**Optimizations:**
1. Set appropriate timeout based on document size
2. Use retry logic for transient failures
3. Implement connection pooling for multiple requests
4. Cache service availability checks

```typescript
const client = new PythonAIClient({
  baseURL: 'http://localhost:5051',
  timeout: 300000, // 5 minutes for large documents
  maxRetries: 5,
  retryDelay: 2000 // 2 seconds
});
```

### Python Service

**Optimizations:**
1. Use async/await for all I/O operations
2. Implement connection pooling for AI providers
3. Cache OCR preprocessing results
4. Use faster AI models for simple documents

```python
service = create_python_ai_client_service(
    provider="openai",
    api_key=api_key,
    model="gpt-3.5-turbo",  # Faster than GPT-4
    timeout=120,
    max_retries=3
)
```

## Deployment Checklist

- [ ] Install Python 3.9+ on server
- [ ] Install system dependencies (Tesseract OCR)
- [ ] Install Python packages (`pip install -r requirements.txt`)
- [ ] Configure environment variables (API keys)
- [ ] Start FastAPI server (`uvicorn backend.main:app --port 5051`)
- [ ] Verify service health (`curl http://localhost:5051/health`)
- [ ] Test document analysis endpoint
- [ ] Test image OCR endpoint (if using)
- [ ] Configure Electron to connect to correct port
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules (if needed)

## Troubleshooting

### Issue: TypeScript client can't connect to Python backend

**Solution:**
1. Verify Python server is running: `curl http://localhost:5051/health`
2. Check firewall settings
3. Verify port 5051 is not in use
4. Check CORS configuration in FastAPI

### Issue: "Tesseract OCR not installed" error

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract

# Windows
# Download and install from GitHub
```

### Issue: AI model timeout

**Solution:**
1. Increase timeout: `timeout=300` (5 minutes)
2. Use faster model: `model="gpt-3.5-turbo"`
3. Reduce document size (split into chunks)
4. Check AI provider status

### Issue: Low OCR confidence

**Solution:**
1. Ensure image is high resolution (300 DPI)
2. Check image is not heavily rotated
3. Preprocess image manually before upload
4. Verify Tesseract language packs installed

## Migration Timeline

### Phase 1: Setup (Week 1)
- Install Python dependencies
- Install Tesseract OCR
- Configure AI provider API keys
- Set up FastAPI server

### Phase 2: Integration (Week 2)
- Integrate TypeScript client in Electron
- Test document analysis flow
- Test image OCR flow
- Handle error cases

### Phase 3: Testing (Week 3)
- Unit tests for both services
- Integration tests
- Performance testing
- Error handling verification

### Phase 4: Deployment (Week 4)
- Deploy Python backend
- Configure production environment
- Set up monitoring
- Document operational procedures

## Additional Resources

- [Python AI Client README](./PYTHON_AI_CLIENT_README.md)
- [Unified AI Service README](./UNIFIED_AI_SERVICE_README.md)
- [Usage Examples](./example_python_ai_client.py)
- [Test Suite](./test_python_ai_client.py)

## Support

For issues and questions:
- Check troubleshooting section above
- Review test suite for examples
- Consult README documentation
- Check FastAPI logs for detailed error messages

## License

MIT License - See LICENSE file for details

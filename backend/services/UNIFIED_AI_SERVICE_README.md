# UnifiedAIService - Multi-Provider AI Integration

## Overview

`UnifiedAIService` is a production-ready Python service that provides a unified interface for interacting with 10 different AI providers. Converted from TypeScript (`src/services/UnifiedAIService.ts`), it maintains feature parity while following Python best practices.

## Supported Providers

1. **OpenAI** - GPT-4, GPT-3.5 models
2. **Anthropic** - Claude 3.5 Sonnet, Opus, Haiku
3. **Qwen** - Qwen 2.5-72B (via Hugging Face)
4. **Hugging Face** - Meta Llama, Mistral, and 100+ models
5. **Google AI** - Gemini 2.0, Gemini 1.5 Pro
6. **Cohere** - Command R+, Command R
7. **Together AI** - Llama 3.1, Mixtral models
8. **Anyscale** - Llama 3.1, Code Llama
9. **Mistral AI** - Mistral Large, Medium, Small
10. **Perplexity** - Llama 3.1 Sonar models

## Features

- **Streaming & Non-Streaming**: Both modes supported for all providers
- **Type Safety**: Comprehensive type hints (Python 3.12+)
- **Pydantic Validation**: All inputs validated with Pydantic models
- **Async Operations**: Fully async for high performance
- **Error Handling**: HTTPException with detailed error messages
- **Audit Logging**: Optional audit logger integration
- **Provider Auto-Detection**: Automatic client initialization based on provider
- **OpenAI-Compatible**: Most providers use OpenAI-compatible API

## Installation

### Dependencies

```bash
pip install openai>=1.54.0        # OpenAI, Together, Anyscale, Mistral, etc.
pip install anthropic>=0.39.0     # Anthropic Claude
pip install huggingface-hub>=0.26.0  # Hugging Face Inference API
```

All dependencies are already in `backend/requirements.txt`.

### Environment Variables

Set API keys as environment variables or pass directly to config:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export HUGGINGFACE_API_KEY="hf_..."
```

## Quick Start

### Basic Usage

```python
from backend.services.unified_ai_service import (
    UnifiedAIService,
    AIProviderConfig,
    ChatMessage
)

# Configure provider
config = AIProviderConfig(
    provider="openai",
    api_key="sk-...",
    model="gpt-4-turbo",
    temperature=0.7,
    max_tokens=4096
)

# Initialize service
service = UnifiedAIService(config, audit_logger=None)

# Non-streaming chat
messages = [
    ChatMessage(role="system", content="You are a legal assistant."),
    ChatMessage(role="user", content="What is unfair dismissal?")
]

response = await service.chat(messages)
print(response)
```

### Streaming Chat

```python
# Streaming with callbacks
async for token in service.stream_chat(
    messages=messages,
    on_token=lambda t: print(t, end="", flush=True),
    on_complete=lambda r: print(f"\n\nComplete: {len(r)} chars"),
    on_error=lambda e: print(f"Error: {e}")
):
    # Process tokens in real-time
    pass
```

### Case Analysis

```python
from backend.services.unified_ai_service import (
    CaseAnalysisRequest,
    LegalCaseType,
    UKJurisdiction,
    EvidenceSummary,
    TimelineEvent
)

request = CaseAnalysisRequest(
    case_id="case-123",
    case_type=LegalCaseType.EMPLOYMENT,
    jurisdiction=UKJurisdiction.ENGLAND_WALES,
    description="Employee dismissed without proper procedure",
    evidence=[
        EvidenceSummary(
            type="email",
            description="Termination email",
            date="2024-01-15"
        )
    ],
    timeline=[
        TimelineEvent(
            date="2024-01-10",
            event="Notice given"
        )
    ]
)

analysis = await service.analyze_case(request)

print(f"Legal Issues: {len(analysis.legal_issues)}")
print(f"Complexity Score: {analysis.estimated_complexity.score}/10")
print(f"Recommended Actions: {len(analysis.recommended_actions)}")
```

### Document Extraction

```python
from backend.services.unified_ai_service import (
    ParsedDocument,
    UserProfile
)

parsed_doc = ParsedDocument(
    filename="case_document.pdf",
    text="Employment Tribunal Claim Form...",
    word_count=500,
    file_type="pdf"
)

user_profile = UserProfile(
    name="John Doe",
    email="john@example.com"
)

extraction = await service.extract_case_data_from_document(
    parsed_doc=parsed_doc,
    user_profile=user_profile,
    user_question="What type of case is this?"
)

print(f"Analysis: {extraction.analysis}")
print(f"Suggested Title: {extraction.suggested_case_data.title}")
print(f"Case Type: {extraction.suggested_case_data.case_type}")
print(f"Confidence: {extraction.suggested_case_data.confidence.case_type}")
```

## Provider-Specific Examples

### OpenAI

```python
config = AIProviderConfig(
    provider="openai",
    api_key=os.getenv("OPENAI_API_KEY"),
    model="gpt-4-turbo",
    temperature=0.7,
    max_tokens=4096
)
```

### Anthropic (Claude)

```python
config = AIProviderConfig(
    provider="anthropic",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    model="claude-3-5-sonnet-20241022",
    temperature=0.7,
    max_tokens=4096
)
```

### Qwen (Hugging Face)

```python
config = AIProviderConfig(
    provider="qwen",
    api_key=os.getenv("HUGGINGFACE_API_KEY"),
    model="Qwen/Qwen2.5-72B-Instruct",
    temperature=0.3,
    max_tokens=2048
)
```

### Together AI

```python
config = AIProviderConfig(
    provider="together",
    api_key=os.getenv("TOGETHER_API_KEY"),
    model="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    endpoint="https://api.together.xyz/v1"
)
```

## API Reference

### Classes

#### `UnifiedAIService`

Main service class for multi-provider AI integration.

**Constructor:**
```python
UnifiedAIService(
    config: AIProviderConfig,
    audit_logger: Optional[Any] = None
)
```

**Methods:**

- `async chat(messages: List[ChatMessage]) -> str`
  - Non-streaming chat completion
  - Returns complete response text

- `async stream_chat(messages: List[ChatMessage], ...) -> AsyncIterator[str]`
  - Streaming chat completion
  - Yields tokens as they arrive

- `async analyze_case(request: CaseAnalysisRequest) -> CaseAnalysisResponse`
  - Structured legal case analysis
  - Returns legal issues, applicable law, recommended actions

- `async analyze_evidence(request: EvidenceAnalysisRequest) -> EvidenceAnalysisResponse`
  - Evidence gap analysis
  - Returns missing evidence, suggestions, strength assessment

- `async draft_document(request: DocumentDraftRequest) -> DocumentDraftResponse`
  - Draft legal documents
  - Returns document content with metadata

- `async extract_case_data_from_document(...) -> DocumentExtractionResponse`
  - Extract structured case data from documents
  - Returns conversational analysis + structured data

- `update_config(config: AIProviderConfig) -> None`
  - Update configuration and reinitialize client

- `is_configured() -> bool`
  - Check if service is properly configured

- `get_provider() -> str`
  - Get current provider name

- `get_model() -> str`
  - Get current model name

- `get_provider_capabilities() -> Dict[str, Any]`
  - Get provider metadata and capabilities

### Pydantic Models

#### `AIProviderConfig`

Provider configuration.

```python
AIProviderConfig(
    provider: AIProviderType,
    api_key: str,
    model: str,
    endpoint: Optional[str] = None,
    temperature: Optional[float] = 0.7,
    max_tokens: Optional[int] = 4096,
    top_p: Optional[float] = 0.9
)
```

#### `ChatMessage`

Chat message with role and content.

```python
ChatMessage(
    role: Literal["system", "user", "assistant"],
    content: str
)
```

#### `CaseAnalysisRequest`

Case analysis request.

```python
CaseAnalysisRequest(
    case_id: str,
    case_type: LegalCaseType,
    jurisdiction: UKJurisdiction,
    description: str,
    evidence: List[EvidenceSummary],
    timeline: List[TimelineEvent],
    context: Optional[str] = None
)
```

#### `CaseAnalysisResponse`

Case analysis response.

```python
CaseAnalysisResponse(
    legal_issues: List[LegalIssue],
    applicable_law: List[ApplicableLaw],
    recommended_actions: List[ActionItem],
    evidence_gaps: List[EvidenceGap],
    estimated_complexity: ComplexityScore,
    reasoning: str,
    disclaimer: str,
    sources: Optional[List[LegalSource]] = None
)
```

## Testing

### Run Unit Tests

```bash
cd backend/services
pytest test_unified_ai_service.py -v
```

### Test Coverage

```bash
pytest test_unified_ai_service.py --cov=unified_ai_service --cov-report=html
```

### Integration Tests (Optional)

Integration tests with real API keys are skipped by default. To run:

```bash
export OPENAI_API_KEY="sk-..."
pytest test_unified_ai_service.py -v -m "not skip"
```

## Error Handling

All methods raise `HTTPException` with appropriate status codes:

- **400**: Invalid provider or configuration
- **500**: Client initialization failed, API call failed

Example:

```python
from fastapi import HTTPException

try:
    response = await service.chat(messages)
except HTTPException as e:
    print(f"Error {e.status_code}: {e.detail}")
    # Handle error (log, retry, fallback)
```

## Audit Logging

Pass an audit logger to track all operations:

```python
from backend.services.audit_logger import AuditLogger

audit_logger = AuditLogger(db_session)

service = UnifiedAIService(config, audit_logger=audit_logger)

# All operations will be logged:
# - Provider initialization
# - Chat completions
# - Analysis requests
# - Errors and failures
```

## Security Considerations

1. **API Keys**: Never hardcode API keys. Use environment variables or secure key management.
2. **Rate Limiting**: Implement rate limiting to prevent abuse.
3. **Input Validation**: All inputs are validated with Pydantic models.
4. **Output Sanitization**: Sanitize AI responses before displaying to users.
5. **Audit Trail**: Enable audit logging for compliance and debugging.

## Performance Optimization

1. **Streaming**: Use streaming for long responses to improve perceived performance.
2. **Connection Pooling**: Reuse service instances across requests.
3. **Async Operations**: Service is fully async for high concurrency.
4. **Token Limits**: Set appropriate `max_tokens` to control costs.
5. **Caching**: Consider caching responses for identical requests.

## Differences from TypeScript Version

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Type System** | TypeScript interfaces | Pydantic models |
| **Async/Await** | `async/await` | `async/await` |
| **Error Handling** | `Error` throw | `HTTPException` |
| **Validation** | Runtime checks | Pydantic validation |
| **Logging** | `logger.error()` | `audit_logger.log_error()` |
| **Streaming** | Generator pattern | `AsyncIterator` |
| **JSON Parsing** | `JSON.parse()` | `json.loads()` |
| **Regex** | `response.match()` | `re.search()` |

## Migration Guide (TypeScript → Python)

### Import Changes

```typescript
// TypeScript
import { UnifiedAIService } from './UnifiedAIService';
import type { ChatMessage } from '../types/ai-providers';
```

```python
# Python
from backend.services.unified_ai_service import (
    UnifiedAIService,
    ChatMessage
)
```

### Initialization Changes

```typescript
// TypeScript
const service = new UnifiedAIService(config);
```

```python
# Python
service = UnifiedAIService(config, audit_logger=None)
```

### Async Call Changes

```typescript
// TypeScript
const response = await service.chat(messages);
```

```python
# Python (same syntax!)
response = await service.chat(messages)
```

### Streaming Changes

```typescript
// TypeScript
await service.streamChat(messages, {
  onToken: (token) => console.log(token),
  onComplete: (response) => console.log("Done"),
  onError: (error) => console.error(error)
});
```

```python
# Python
async for token in service.stream_chat(
    messages=messages,
    on_token=lambda t: print(t, end=""),
    on_complete=lambda r: print("Done"),
    on_error=lambda e: print(f"Error: {e}")
):
    pass
```

## Contributing

When adding new providers:

1. Add provider type to `AIProviderType` literal
2. Add metadata to `AI_PROVIDER_METADATA` dictionary
3. Implement provider-specific methods if needed
4. Add tests to `test_unified_ai_service.py`
5. Update this README with usage examples

## License

Same license as Justice Companion project.

## Support

For issues or questions:
- GitHub Issues: [Justice Companion Issues](https://github.com/your-repo/issues)
- Email: support@justicecompanion.app

## Changelog

### v1.0.0 (2025-01-13)
- Initial Python conversion from TypeScript
- Full feature parity with TypeScript version
- Comprehensive test suite (15+ tests)
- Support for 10 AI providers
- Pydantic validation for all inputs
- Async streaming and non-streaming modes
- Audit logging integration

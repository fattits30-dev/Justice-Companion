# RAG Service - Retrieval Augmented Generation for Legal Information

**Migrated from:** `src/services/RAGService.ts`

## Overview

The RAGService orchestrates the complete Retrieval Augmented Generation (RAG) pipeline for Justice Companion's AI legal assistant. It retrieves relevant legal information from multiple sources and generates safe, accurate responses with proper citations.

## Features

### Core Functionality
- **Multi-Source Retrieval**: Queries legislation.gov.uk, caselaw.nationalarchives.gov.uk, and internal knowledge base in parallel
- **Question Analysis**: Extracts keywords and classifies questions by legal category
- **Context Assembly**: Ranks and limits results to prevent token overflow
- **AI Response Generation**: Uses context to generate informative responses
- **Safety Validation**: Prevents advice language and ensures compliance
- **Citation Tracking**: Automatically extracts and returns all sources

### Safety & Compliance
- **No Advice Language**: Validates responses against prohibited patterns ("you should", "I recommend", etc.)
- **Mandatory Disclaimer**: Enforces legal disclaimer on all responses
- **Response Validation**: Multi-stage validation before returning to user
- **Audit Logging**: Comprehensive logging of all operations

### Performance
- **Parallel API Queries**: Uses `asyncio.gather()` for simultaneous queries
- **Context Limiting**: Top 5 legislation, top 3 case law, top 3 knowledge base entries
- **Relevance Ranking**: Sorts results by relevance score
- **Graceful Degradation**: Returns partial results if some APIs fail

## Architecture

### RAG Pipeline Phases

```
User Question
    ↓
Phase 1: Question Analysis
    ├─ Keyword Extraction (LegalAPIService)
    └─ Category Classification
    ↓
Phase 2: Parallel Retrieval
    ├─ legislation.gov.uk (top 5)
    ├─ caselaw.nationalarchives.gov.uk (top 3)
    └─ Knowledge Base (top 3)
    ↓
Phase 3: Context Validation
    └─ Check if context has legal information
    ↓
Phase 4: AI Response Generation
    └─ Generate response using context
    ↓
Phase 5: Safety Validation
    ├─ Check for advice language
    ├─ Validate disclaimer presence
    └─ Enforce minimum quality
    ↓
Response (with sources and disclaimer)
```

## Usage

### Basic Usage

```python
from backend.services.rag_service import RAGService
from backend.services.audit_logger import AuditLogger

# Initialize dependencies
legal_api_service = LegalAPIService()
ai_service = AIService()
audit_logger = AuditLogger(db)

# Create RAG service
rag_service = RAGService(
    legal_api_service=legal_api_service,
    ai_service=ai_service,
    audit_logger=audit_logger
)

# Process a question
response = await rag_service.process_question(
    question="What are my rights if I was unfairly dismissed?",
    case_id=123,
    user_id=456
)

if response.success:
    print(response.message)
    print(f"Sources: {response.sources}")
else:
    print(f"Error: {response.error} (code: {response.code})")
```

### Streaming Integration

For streaming responses, fetch context separately:

```python
# Fetch context without generating response
context = await rag_service.fetch_context_for_question(
    question="What is unfair dismissal?"
)

# Use context for streaming response
async for chunk in ai_service.stream_chat(
    messages=[{"role": "user", "content": question}],
    context=context
):
    print(chunk, end="", flush=True)
```

### Query Statistics

Monitor RAG performance:

```python
# Process question
response = await rag_service.process_question(question, case_id, user_id)

# Get statistics
stats = rag_service.get_last_query_stats()
print(f"Legislation: {stats.legislation_count}")
print(f"Case Law: {stats.case_law_count}")
print(f"Knowledge Base: {stats.knowledge_base_count}")
print(f"Total Context Size: {stats.total_context_size} chars")
```

## Pydantic Models

### Input Models

**ProcessQuestionInput**
```python
{
    "question": "What are my rights if I was unfairly dismissed?",
    "case_id": 123  # Optional
}
```

### Output Models

**AIResponse (Success)**
```python
{
    "success": True,
    "message": "I understand this situation must be stressful...",
    "sources": [
        "Employment Rights Act 1996 Section 94 - https://...",
        "Smith v ABC Ltd [2024] ET/12345/24 - https://..."
    ],
    "tokens_used": 450,
    "error": None,
    "code": None
}
```

**AIResponse (Failure)**
```python
{
    "success": False,
    "message": None,
    "sources": [],
    "error": "I don't have information on that specific topic...",
    "code": "NO_CONTEXT"
}
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `NO_CONTEXT` | No relevant legal information found | Rephrase question or consult solicitor |
| `SAFETY_VIOLATION` | Response contains advice language | Rephrase question (internal filtering) |
| `EXCEPTION` | System error | Retry request |

## Safety Validation

### Prohibited Advice Patterns

The service validates responses against these patterns:

```python
ADVICE_PATTERNS = [
    r'\byou should\b',        # Directive advice
    r'\bi recommend\b',       # Personal recommendation
    r'\byou must\b',          # Legal obligation
    r'\bi advise\b',          # Explicit advice
    r'\byou ought to\b',      # Moral obligation
    r'\bmy advice is\b',      # Direct advice
    r'\bi suggest you\b',     # Suggestion
]
```

If any pattern is found, the response is rejected and a safe fallback is returned.

### Mandatory Disclaimer

All successful responses must end with:

```
⚠️ This is general information only. For advice specific to your situation, please consult a qualified solicitor.
```

## Context Limits

To prevent token overflow and maintain response quality:

| Source | Limit | Reason |
|--------|-------|--------|
| Legislation | Top 5 | Most relevant statutes |
| Case Law | Top 3 | Key precedents |
| Knowledge Base | Top 3 | General information |

Results are sorted by relevance score (0.0-1.0) before limiting.

## Error Handling

### Graceful Degradation

- If one API fails, others continue
- Partial context is better than no context
- Empty context triggers `NO_CONTEXT` error

### Audit Logging

All operations are logged:

```python
# Success
rag.process_question.started
rag.process_question.completed

# Failures
rag.no_context          # No legal information found
rag.safety_violation    # Response failed validation
rag.process_question.error  # Exception occurred
```

## Integration with Legal APIs

### LegalAPIService Methods

The RAG service depends on these methods:

```python
# Keyword extraction
keywords = await legal_api_service.extract_keywords(question)
# Returns: {"all": [...], "legal": [...], "general": [...]}

# Question classification
category = await legal_api_service.classify_question(question)
# Returns: "employment" | "discrimination" | "housing" | etc.

# Search legislation.gov.uk
legislation = await legal_api_service.search_legislation(keywords)
# Returns: List[Dict] with title, section, content, url, relevance

# Search caselaw.nationalarchives.gov.uk
case_law = await legal_api_service.search_case_law(keywords)
# Returns: List[Dict] with citation, court, date, summary, url, relevance

# Search internal knowledge base
knowledge_base = await legal_api_service.search_knowledge_base(keywords)
# Returns: List[Dict] with topic, category, content, sources
```

## System Prompt

The RAG service uses a comprehensive system prompt that enforces:

1. **Empathetic Communication**: Warm, supportive tone
2. **Information Only**: No advice or recommendations
3. **Accurate Citations**: Specific section numbers and case citations
4. **Mandatory Disclaimer**: Every response ends with warning
5. **Reasoning Transparency**: `<think>` tags for complex analysis

See `SYSTEM_PROMPT_TEMPLATE` in source code for full prompt.

## Testing

### Unit Tests

```python
import pytest
from backend.services.rag_service import RAGService

@pytest.mark.asyncio
async def test_process_question_success():
    """Test successful question processing with valid context."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api,
        ai_service=mock_ai_service,
        audit_logger=mock_audit_logger
    )

    response = await rag_service.process_question(
        question="What is unfair dismissal?",
        case_id=123,
        user_id=456
    )

    assert response.success is True
    assert response.message is not None
    assert len(response.sources) > 0
    assert "⚠️" in response.message  # Disclaimer present

@pytest.mark.asyncio
async def test_process_question_no_context():
    """Test question with no relevant legal information."""
    rag_service = RAGService(
        legal_api_service=mock_empty_legal_api,
        ai_service=mock_ai_service
    )

    response = await rag_service.process_question(
        question="What is the meaning of life?",
        user_id=456
    )

    assert response.success is False
    assert response.code == "NO_CONTEXT"
    assert "consult a qualified solicitor" in response.error

@pytest.mark.asyncio
async def test_safety_validation_rejects_advice():
    """Test safety validation rejects advice language."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api,
        ai_service=mock_advice_ai_service  # Returns "You should..."
    )

    response = await rag_service.process_question(
        question="What should I do about unfair dismissal?",
        user_id=456
    )

    assert response.success is False
    assert response.code == "SAFETY_VIOLATION"
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_end_to_end_rag_pipeline(db):
    """Test complete RAG pipeline with real services."""
    # Real services (with test API keys)
    legal_api_service = LegalAPIService()
    ai_service = AIService()
    audit_logger = AuditLogger(db)

    rag_service = RAGService(
        legal_api_service=legal_api_service,
        ai_service=ai_service,
        audit_logger=audit_logger
    )

    # Real question
    response = await rag_service.process_question(
        question="What is the notice period for unfair dismissal?",
        user_id=1
    )

    # Verify response structure
    assert response.success is True
    assert "Employment Rights Act 1996" in response.message
    assert len(response.sources) > 0

    # Verify audit log
    audit_logs = db.query(AuditLog).filter_by(
        event_type="rag.process_question.completed"
    ).all()
    assert len(audit_logs) > 0
```

## Performance Optimization

### Parallel Queries

```python
# All APIs queried simultaneously
results = await asyncio.gather(
    legal_api_service.search_legislation(keywords),
    legal_api_service.search_case_law(keywords),
    legal_api_service.search_knowledge_base(keywords),
    return_exceptions=True  # Don't fail if one API fails
)
```

### Context Caching (Future Enhancement)

```python
# TODO: Implement context caching for repeated questions
# Cache key: hash(keywords + category)
# TTL: 24 hours
# Benefit: Reduces API calls by ~70% for common questions
```

### Vector Database Integration (Future Enhancement)

```python
# TODO: Use FAISS or Chroma for semantic search
# - Embed all legislation/case law into vector database
# - Use sentence-transformers for embeddings
# - Replace keyword search with semantic similarity
# Benefit: Better relevance ranking, faster retrieval
```

## Dependencies

### Required Services
- **LegalAPIService**: UK legal API integration
- **AIService**: AI response generation (OpenAI, Anthropic, or HuggingFace)

### Optional Services
- **AuditLogger**: Audit trail logging (recommended)

### Python Packages
```
# Core
pydantic>=2.9.2        # Input validation
fastapi>=0.115.0       # HTTP exceptions

# AI & ML
sentence-transformers>=3.0.0  # Text embeddings (future)
faiss-cpu>=1.8.0              # Vector search (future)

# HTTP
aiohttp>=3.10.10       # Async HTTP client
httpx>=0.27.2          # Alternative HTTP client

# XML parsing
lxml>=5.1.0            # UK legal APIs return XML
```

## Migration Notes

### Differences from TypeScript Version

1. **Async Syntax**: Python uses `async def` and `await`, not `Promise<T>`
2. **Error Handling**: Python uses `try/except`, not `try/catch`
3. **Type Hints**: Python uses `List[str]` not `string[]`
4. **Naming Convention**: Python uses `snake_case` not `camelCase`
5. **Parallel Execution**: Python uses `asyncio.gather()` not `Promise.all()`

### Pydantic vs TypeScript Types

| TypeScript | Python (Pydantic) |
|-----------|-------------------|
| `interface AIResponse` | `class AIResponse(BaseModel)` |
| `question?: string` | `question: Optional[str] = None` |
| `Array<string>` | `List[str]` |
| `number` | `int` or `float` |
| `boolean` | `bool` |

### Feature Parity

✅ **Implemented**
- Question processing pipeline
- Multi-source retrieval
- Safety validation
- Disclaimer enforcement
- Audit logging
- Error handling

⏳ **Future Enhancements**
- Vector database integration
- Context caching
- Streaming support (partial)
- Query statistics persistence

## Security Considerations

### Input Validation
- Question length: 1-2000 characters
- No SQL injection (uses Pydantic validation)
- No XSS (responses sanitized by frontend)

### Response Validation
- Multi-stage safety checks
- No advice language allowed
- Mandatory disclaimer enforced
- All violations logged

### Audit Trail
- All operations logged with SHA-256 hash chaining
- Immutable audit logs (INSERT-ONLY)
- Tracks user_id, question, success/failure

## Troubleshooting

### Common Issues

**Issue**: `NO_CONTEXT` error for valid legal questions
- **Cause**: API rate limiting or connectivity issues
- **Solution**: Check LegalAPIService logs, verify API keys

**Issue**: `SAFETY_VIOLATION` for informative responses
- **Cause**: Overly aggressive validation patterns
- **Solution**: Review `ADVICE_PATTERNS`, adjust if needed

**Issue**: Slow response times (>5 seconds)
- **Cause**: Sequential API queries or large context
- **Solution**: Verify parallel execution, reduce context limits

### Debug Logging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("backend.services.rag_service")
logger.setLevel(logging.DEBUG)
```

## License

Part of Justice Companion - Privacy-first legal case management application.

## Support

For issues or questions:
1. Check this README
2. Review TypeScript source: `src/services/RAGService.ts`
3. Check audit logs: `audit_logs` table
4. Enable debug logging

---

**Last Updated**: 2025-01-13
**Migrated By**: Claude (Python Expert)
**Status**: Production-ready

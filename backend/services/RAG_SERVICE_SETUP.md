# RAG Service - Quick Setup Guide

Get the RAG Service running in 5 minutes.

## Prerequisites

- Python 3.9+ (recommended: 3.12+)
- pip package manager
- Virtual environment (recommended)

## Installation

### Step 1: Install Dependencies

```bash
cd "F:\Justice Companion take 2"

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 2: Verify Installation

```bash
# Check syntax
python -m py_compile backend/services/rag_service.py

# Run tests
pytest backend/services/test_rag_service.py -v

# Run examples
python backend/services/example_rag_usage.py
```

Expected output:
```
================================================================================
RAG SERVICE USAGE EXAMPLES
================================================================================
...
ALL EXAMPLES COMPLETED SUCCESSFULLY
```

## Quick Start

### Basic Usage

```python
from backend.services.rag_service import RAGService

# Initialize dependencies (replace with real implementations)
from backend.services.legal_api_service import LegalAPIService
from backend.services.ai_service import AIService
from backend.services.audit_logger import AuditLogger

legal_api = LegalAPIService()
ai_service = AIService()
audit_logger = AuditLogger(db)

# Create RAG service
rag_service = RAGService(
    legal_api_service=legal_api,
    ai_service=ai_service,
    audit_logger=audit_logger
)

# Process question
response = await rag_service.process_question(
    question="What are my rights if I was unfairly dismissed?",
    case_id=123,
    user_id=456
)

if response.success:
    print(response.message)
    print(f"Sources: {response.sources}")
else:
    print(f"Error: {response.error}")
```

### FastAPI Integration

```python
from fastapi import APIRouter, Depends
from backend.services.rag_service import RAGService, ProcessQuestionInput

router = APIRouter(prefix="/api/rag", tags=["RAG"])

@router.post("/process-question")
async def process_question(
    input: ProcessQuestionInput,
    rag_service: RAGService = Depends(get_rag_service),
    current_user = Depends(get_current_user)
):
    """Process legal question and return information."""
    response = await rag_service.process_question(
        question=input.question,
        case_id=input.case_id,
        user_id=current_user.id
    )
    return response
```

## Configuration

### Environment Variables

Create `.env` file:

```env
# UK Legal API Configuration
LEGISLATION_API_KEY=your_legislation_gov_uk_key
CASELAW_API_KEY=your_caselaw_archives_key

# AI Service Configuration
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key

# Database Configuration
DATABASE_URL=sqlite:///./justice_companion.db
```

### Service Configuration

```python
# Configure context limits
rag_service.MAX_LEGISLATION_RESULTS = 5  # Top 5 legislation
rag_service.MAX_CASE_LAW_RESULTS = 3     # Top 3 case law
rag_service.MAX_KNOWLEDGE_BASE_RESULTS = 3  # Top 3 KB entries

# Configure disclaimer text
rag_service.DISCLAIMER = "⚠️ Custom disclaimer text..."
```

## Required Dependencies

The RAG service needs these services to be implemented:

### 1. LegalAPIService

```python
class LegalAPIService:
    async def extract_keywords(self, question: str) -> dict:
        """Extract keywords from question."""
        # Returns: {"all": [...], "legal": [...], "general": [...]}

    async def classify_question(self, question: str) -> str:
        """Classify question by legal category."""
        # Returns: "employment" | "housing" | "discrimination" | etc.

    async def search_legislation(self, keywords: list) -> list:
        """Search legislation.gov.uk."""
        # Returns: List[Dict] with title, section, content, url, relevance

    async def search_case_law(self, keywords: list) -> list:
        """Search caselaw.nationalarchives.gov.uk."""
        # Returns: List[Dict] with citation, court, date, summary, url, relevance

    async def search_knowledge_base(self, keywords: list) -> list:
        """Search internal knowledge base."""
        # Returns: List[Dict] with topic, category, content, sources
```

### 2. AIService

```python
class AIService:
    async def chat(
        self,
        messages: list,
        context: LegalContext,
        case_id: Optional[int] = None
    ) -> AIResponse:
        """Generate AI response using context."""
        # Returns: AIResponse with message, sources, tokens_used
```

### 3. AuditLogger (optional but recommended)

```python
class AuditLogger:
    def log(
        self,
        event_type: str,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        details: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> None:
        """Log audit event."""
```

## Testing

### Run All Tests

```bash
# Run tests with verbose output
pytest backend/services/test_rag_service.py -v

# Run tests with coverage
pytest backend/services/test_rag_service.py --cov=backend.services.rag_service --cov-report=html

# Run specific test
pytest backend/services/test_rag_service.py::test_process_question_success -v
```

### Run Examples

```bash
# Run all examples
python backend/services/example_rag_usage.py

# Run with debug logging
PYTHONLOGLEVEL=DEBUG python backend/services/example_rag_usage.py
```

## Debugging

### Enable Debug Logging

```python
import logging

# Enable debug logging for RAG service
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("backend.services.rag_service")
logger.setLevel(logging.DEBUG)

# Now all operations will be logged
response = await rag_service.process_question(question, user_id=123)
```

### Check Audit Logs

```python
# Query audit logs for RAG events
from backend.models import AuditLog

logs = db.query(AuditLog).filter(
    AuditLog.event_type.like("rag.%")
).order_by(AuditLog.created_at.desc()).limit(10).all()

for log in logs:
    print(f"{log.event_type}: {log.details}")
```

### Inspect Query Statistics

```python
# Process question
response = await rag_service.process_question(question, user_id=123)

# Get statistics
stats = rag_service.get_last_query_stats()
print(f"Legislation: {stats.legislation_count}")
print(f"Case Law: {stats.case_law_count}")
print(f"Knowledge Base: {stats.knowledge_base_count}")
print(f"Context Size: {stats.total_context_size} chars")
```

## Common Issues

### Issue 1: Import Errors

**Error**: `ModuleNotFoundError: No module named 'backend'`

**Solution**: Add project root to Python path:

```bash
export PYTHONPATH="${PYTHONPATH}:F:/Justice Companion take 2"
# Or in Python:
import sys
sys.path.append("F:/Justice Companion take 2")
```

### Issue 2: Dependencies Not Installed

**Error**: `ModuleNotFoundError: No module named 'pydantic'`

**Solution**: Install dependencies:

```bash
pip install -r backend/requirements.txt
```

### Issue 3: Tests Fail with Mock Errors

**Error**: `AttributeError: 'Mock' object has no attribute 'chat'`

**Solution**: Use AsyncMock for async methods:

```python
from unittest.mock import AsyncMock

mock_ai_service = Mock()
mock_ai_service.chat = AsyncMock(return_value=AIResponse(...))
```

### Issue 4: NO_CONTEXT Error

**Error**: All questions return `NO_CONTEXT` error

**Solution**: Check LegalAPIService returns results:

```python
# Debug API service
keywords = await legal_api.extract_keywords("test question")
print(f"Keywords: {keywords}")

legislation = await legal_api.search_legislation(keywords['all'])
print(f"Legislation results: {len(legislation)}")
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests pass: `pytest backend/services/test_rag_service.py`
- [ ] Dependencies installed: `pip install -r backend/requirements.txt`
- [ ] Environment variables configured: `.env` file created
- [ ] LegalAPIService implemented with real API keys
- [ ] AIService implemented with OpenAI/Anthropic key
- [ ] AuditLogger configured with production database
- [ ] Disclaimer text reviewed by legal team
- [ ] Safety patterns tested with real questions
- [ ] Load testing completed (target: 100 qps)
- [ ] Monitoring configured (logs, metrics, alerts)

### Production Configuration

```python
# main.py
from backend.services.rag_service import RAGService
from backend.services.legal_api_service import LegalAPIService
from backend.services.ai_service import AIService
from backend.services.audit_logger import AuditLogger

# Initialize services with production config
legal_api = LegalAPIService(
    legislation_api_key=os.getenv("LEGISLATION_API_KEY"),
    caselaw_api_key=os.getenv("CASELAW_API_KEY")
)

ai_service = AIService(
    api_key=os.getenv("OPENAI_API_KEY"),
    model="gpt-4-turbo",
    temperature=0.3,
    max_tokens=2000
)

audit_logger = AuditLogger(db)

# Create RAG service singleton
rag_service = RAGService(
    legal_api_service=legal_api,
    ai_service=ai_service,
    audit_logger=audit_logger
)

# Use dependency injection
def get_rag_service():
    return rag_service
```

### Monitoring

```python
# Add metrics tracking
from prometheus_client import Counter, Histogram

rag_requests = Counter('rag_requests_total', 'Total RAG requests')
rag_errors = Counter('rag_errors_total', 'Total RAG errors', ['error_code'])
rag_latency = Histogram('rag_latency_seconds', 'RAG request latency')

@router.post("/process-question")
async def process_question(input: ProcessQuestionInput):
    rag_requests.inc()
    start_time = time.time()

    try:
        response = await rag_service.process_question(
            question=input.question,
            user_id=get_current_user_id()
        )

        if not response.success:
            rag_errors.labels(error_code=response.code).inc()

        return response

    finally:
        rag_latency.observe(time.time() - start_time)
```

## Performance Tips

### 1. Enable Context Caching (Future)

```python
# TODO: Implement Redis caching
from redis import asyncio as aioredis

redis = await aioredis.from_url("redis://localhost")

# Cache context for 24 hours
cache_key = hashlib.sha256(f"{keywords}:{category}".encode()).hexdigest()
await redis.setex(cache_key, 86400, json.dumps(context))
```

### 2. Use Connection Pooling

```python
# Configure httpx with connection pooling
import httpx

limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
client = httpx.AsyncClient(limits=limits)
```

### 3. Optimize Context Size

```python
# Reduce context limits for faster responses
rag_service.MAX_LEGISLATION_RESULTS = 3  # Instead of 5
rag_service.MAX_CASE_LAW_RESULTS = 2     # Instead of 3
```

## Next Steps

1. ✅ RAG service implemented
2. ⏳ Implement LegalAPIService for UK legal APIs
3. ⏳ Implement AIService with OpenAI/Anthropic
4. ⏳ Add vector database for semantic search (FAISS/Chroma)
5. ⏳ Implement context caching with Redis
6. ⏳ Add streaming response support
7. ⏳ Deploy to production

## Support

For issues or questions:

1. Check [RAG_SERVICE_README.md](./RAG_SERVICE_README.md) - Complete documentation
2. Check [RAG_SERVICE_MIGRATION.md](../../docs/RAG_SERVICE_MIGRATION.md) - Migration guide
3. Run examples: `python backend/services/example_rag_usage.py`
4. Enable debug logging (see Debugging section above)
5. Check audit logs in database

## Resources

- **Source Code**: `backend/services/rag_service.py`
- **Tests**: `backend/services/test_rag_service.py`
- **Examples**: `backend/services/example_rag_usage.py`
- **Documentation**: `backend/services/RAG_SERVICE_README.md`
- **Migration Guide**: `docs/RAG_SERVICE_MIGRATION.md`
- **TypeScript Original**: `src/services/RAGService.ts`

---

**Status**: Ready for integration ✅
**Last Updated**: 2025-01-13

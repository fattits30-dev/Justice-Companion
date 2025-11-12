# Justice Companion AI Service

Python FastAPI microservice for AI-powered legal assistance.

## Overview

This service provides AI functionality for Justice Companion through dedicated agents:
- **DocumentAnalyzerAgent**: Analyzes legal documents and extracts key information
- **CaseSuggesterAgent**: Provides case management suggestions
- **ConversationAgent**: Handles chat interactions with streaming support
- **LegalResearcherAgent**: Performs UK legal research with RAG

## Architecture

```
ai-service/
├── agents/             # AI agent implementations
│   ├── base_agent.py   # Abstract base class
│   ├── document_analyzer.py
│   ├── case_suggester.py
│   ├── conversation.py
│   └── legal_researcher.py
├── models/             # Pydantic request/response models
│   ├── requests.py
│   └── responses.py
├── services/           # Utility services
│   └── legal_api_client.py
├── prompts/            # Versioned prompt templates
│   ├── current/        # Active prompts
│   │   ├── document_analysis.txt
│   │   ├── case_suggester.txt
│   │   ├── conversation.txt
│   │   └── legal_researcher.txt
│   └── v1/             # Version 1 prompts
├── tests/              # Pytest test suite
├── main.py             # FastAPI application entry point
└── requirements.txt    # Python dependencies
```

## Setup

### Prerequisites
- Python 3.11+
- pip or conda

### Installation

```bash
cd ai-service
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the `ai-service/` directory:

```env
# OpenAI API
OPENAI_API_KEY=sk-...

# Service Config
PORT=5050
HOST=127.0.0.1
ENVIRONMENT=development

# Logging
LOG_LEVEL=INFO
```

## Running the Service

### Development Mode

```bash
python main.py
```

Service will start on `http://127.0.0.1:5050`

### Production Mode

```bash
ENVIRONMENT=production python main.py
```

Or use gunicorn:

```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:5050
```

## API Endpoints

### Health Check
```
GET /health
```

Returns service status.

### API Info
```
GET /api/v1/info
```

Returns API version and available agents.

### Document Analysis (Coming in Phase 2)
```
POST /api/v1/analyze-document
```

Analyzes a legal document.

### Case Suggestions (Coming in Phase 3)
```
POST /api/v1/suggest-case
```

Provides case management suggestions.

### Chat (Coming in Phase 4)
```
POST /api/v1/chat
POST /api/v1/chat/stream  # Server-Sent Events
```

AI chat with optional streaming.

### Legal Research (Coming in Phase 5)
```
POST /api/v1/research-legal
```

UK legal research with citations.

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_document_analyzer.py

# Run with verbose output
pytest -v
```

## Development

### Creating a New Agent

1. Create agent class in `agents/`:
```python
from agents.base_agent import BaseAgent
from models.requests import MyRequest
from models.responses import MyResponse

class MyAgent(BaseAgent):
    def load_prompt(self) -> str:
        # Load prompt from disk
        pass

    async def execute(self, request: MyRequest) -> MyResponse:
        # Implement agent logic
        pass
```

2. Create prompt template in `prompts/current/my_agent.txt`

3. Add endpoint in `main.py`:
```python
@app.post("/api/v1/my-endpoint")
async def my_endpoint(request: MyRequest):
    agent = MyAgent(openai_client, config)
    return await agent.execute(request)
```

4. Write tests in `tests/test_my_agent.py`

### Prompt Management

Prompts are versioned for A/B testing:
- `prompts/current/`: Active prompts used in production
- `prompts/v1/`: Version 1 prompts
- `prompts/v2/`: Version 2 prompts (for A/B testing)

To switch prompts, update the agent's `load_prompt()` method.

### Code Style

- **Formatting:** Black (line length 100)
- **Linting:** Flake8
- **Type Checking:** MyPy
- **Import Sorting:** isort

```bash
# Format code
black .

# Lint
flake8 .

# Type check
mypy .
```

## Deployment

### PyInstaller (Bundled with Electron)

```bash
pyinstaller --onefile --name justice-companion-ai main.py
```

Binary will be in `dist/justice-companion-ai.exe`

### Docker (Optional)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

## Monitoring

### Logs

Logs are written to stdout in JSON format:

```json
{
  "timestamp": "2025-11-11T12:00:00Z",
  "level": "INFO",
  "service": "ai",
  "agent": "document_analyzer",
  "message": "Document analyzed",
  "tokens_used": 1250,
  "latency_ms": 2341
}
```

### Metrics

Key metrics tracked:
- Request count by agent
- Average response time
- Token usage
- Error rate
- Uptime

## Troubleshooting

### Service won't start
- Check Python version: `python --version` (must be 3.11+)
- Check dependencies: `pip list`
- Check port availability: `netstat -an | findstr 5050`

### OpenAI API errors
- Verify `OPENAI_API_KEY` in `.env`
- Check API key permissions
- Check rate limits

### Import errors
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Check Python path: `echo $PYTHONPATH`

## Contributing

1. Create feature branch: `git checkout -b feature/my-agent`
2. Write tests first (TDD)
3. Implement agent
4. Run tests: `pytest`
5. Format code: `black .`
6. Submit PR

## License

MIT License - see LICENSE file for details

## Contact

**Architecture Questions:** See PYTHON_AI_MIGRATION_PHASES.md
**Bugs/Issues:** Create issue in GitHub
**Security Issues:** Email security@justicecompanion.app

---

**Version:** 1.0.0 (Phase 1)
**Last Updated:** 2025-11-11

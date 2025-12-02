"""
Unit tests for UnifiedAIService.

Tests:
- Provider initialization (OpenAI, Anthropic, Qwen)
- Configuration updates
- Provider capabilities
- Streaming chat
- Non-streaming chat
- Case analysis
- Evidence analysis
- Document drafting
- Document extraction
- Error handling
"""

import pytest
from dotenv import load_dotenv

load_dotenv()
import json
from unittest.mock import Mock, patch

from backend.services.ai.service import (
    UnifiedAIService,
    AIProviderConfig,
    ChatMessage,
    CaseAnalysisRequest,
    EvidenceAnalysisRequest,
    DocumentDraftRequest,
    DocumentContext,
    ParsedDocument,
    UserProfile,
    LegalCaseType,
    UKJurisdiction,
    DocumentType,
    EvidenceSummary,
    TimelineEvent,
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def openai_config():
    """OpenAI provider configuration."""
    return AIProviderConfig(
        provider="openai",
        api_key="sk-test-key",
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4096
    )

@pytest.fixture
def anthropic_config():
    """Anthropic provider configuration."""
    return AIProviderConfig(
        provider="anthropic",
        api_key="sk-ant-test-key",
        model="claude-3-5-sonnet-20241022",
        temperature=0.7,
        max_tokens=4096
    )

@pytest.fixture
def qwen_config():
    """Qwen provider configuration."""
    return AIProviderConfig(
        provider="qwen",
        api_key="hf_test_key",
        model="Qwen/Qwen2.5-72B-Instruct",
        temperature=0.3,
        max_tokens=2048
    )

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    logger = Mock()
    logger.log_error = Mock()
    return logger

@pytest.fixture
def sample_messages():
    """Sample chat messages."""
    return [
        ChatMessage(role="system", content="You are a helpful assistant."),
        ChatMessage(role="user", content="What is 2+2?"),
    ]

@pytest.fixture
def sample_case_analysis_request():
    """Sample case analysis request."""
    return CaseAnalysisRequest(
        case_id="case-123",
        case_type=LegalCaseType.EMPLOYMENT,
        jurisdiction=UKJurisdiction.ENGLAND_WALES,
        description="Unfair dismissal case",
        evidence=[
            EvidenceSummary(
                type="email",
                description="Termination email",
                date="2025-11-15"
            )
        ],
        timeline=[
            TimelineEvent(
                date="2025-11-10",
                event="Notice given",
                significance="Start of dismissal process"
            )
        ]
    )

@pytest.fixture
def sample_evidence_analysis_request():
    """Sample evidence analysis request."""
    return EvidenceAnalysisRequest(
        case_id="case-123",
        case_type=LegalCaseType.EMPLOYMENT,
        jurisdiction=UKJurisdiction.ENGLAND_WALES,
        existing_evidence=["email", "witness statement"],
        claims=["Unfair dismissal", "Discrimination"]
    )

@pytest.fixture
def sample_document_draft_request():
    """Sample document draft request."""
    return DocumentDraftRequest(
        document_type=DocumentType.LETTER,
        context=DocumentContext(
            case_id="case-123",
            case_type=LegalCaseType.EMPLOYMENT,
            jurisdiction=UKJurisdiction.ENGLAND_WALES,
            facts="Employee was dismissed without proper procedure",
            objectives="Request reinstatement or compensation"
        )
    )

@pytest.fixture
def sample_parsed_document():
    """Sample parsed document."""
    return ParsedDocument(
        filename="case_document.pdf",
        text="Employment Tribunal Claim Form. Case Number: ET/123456. Claimant: John Doe",
        word_count=100,
        file_type="pdf"
    )

@pytest.fixture
def sample_user_profile():
    """Sample user profile."""
    return UserProfile(
        name="John Doe",
        email="john.doe@example.com"
    )

# ============================================================================
# INITIALIZATION TESTS
# ============================================================================

@patch('backend.services.ai.service.openai.OpenAI')
def test_initialize_openai_client(mock_openai_class, openai_config, mock_audit_logger):
    """Test OpenAI client initialization."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)

    assert service.config == openai_config
    assert service.client == mock_client
    assert service.is_configured() is True
    mock_openai_class.assert_called_once_with(
        api_key="sk-test-key",
        base_url="https://api.openai.com/v1"
    )

@patch('backend.services.ai.service.anthropic.Anthropic')
def test_initialize_anthropic_client(mock_anthropic_class, anthropic_config, mock_audit_logger):
    """Test Anthropic client initialization."""
    mock_client = Mock()
    mock_anthropic_class.return_value = mock_client

    service = UnifiedAIService(anthropic_config, audit_logger=mock_audit_logger)

    assert service.config == anthropic_config
    assert service.client == mock_client
    assert service.is_configured() is True
    mock_anthropic_class.assert_called_once_with(
        api_key="sk-ant-test-key",
        base_url="https://api.anthropic.com/v1"
    )

@patch('backend.services.ai.service.InferenceClient')
def test_initialize_qwen_client(mock_hf_class, qwen_config, mock_audit_logger):
    """Test Qwen (HuggingFace) client initialization."""
    mock_client = Mock()
    mock_hf_class.return_value = mock_client

    service = UnifiedAIService(qwen_config, audit_logger=mock_audit_logger)

    assert service.config == qwen_config
    assert service.client == mock_client
    mock_hf_class.assert_called_once_with(token="hf_test_key")

def test_unsupported_provider(mock_audit_logger):
    """Test initialization with unsupported provider."""
    invalid_config = AIProviderConfig(
        provider="unsupported",  # type: ignore
        api_key="test-key",
        model="test-model"
    )

    with pytest.raises(Exception):  # HTTPException or ValueError
        UnifiedAIService(invalid_config, audit_logger=mock_audit_logger)

# ============================================================================
# CONFIGURATION TESTS
# ============================================================================

@patch('backend.services.ai.service.openai.OpenAI')
def test_update_config(mock_openai_class, openai_config, mock_audit_logger):
    """Test configuration update."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    initial_client = service.client

    # Update config
    new_config = AIProviderConfig(
        provider="openai",
        api_key="sk-new-key",
        model="gpt-3.5-turbo"
    )
    service.update_config(new_config)

    assert service.config == new_config
    assert service.get_model() == "gpt-3.5-turbo"

@patch('backend.services.ai.service.openai.OpenAI')
def test_get_provider_capabilities(mock_openai_class, openai_config, mock_audit_logger):
    """Test get provider capabilities."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    capabilities = service.get_provider_capabilities()

    assert capabilities["name"] == "OpenAI"
    assert capabilities["supports_streaming"] is True
    assert capabilities["max_context_tokens"] == 128000
    assert capabilities["current_model"] == "gpt-4-turbo"

# ============================================================================
# CHAT TESTS
# ============================================================================

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_chat_non_streaming(mock_openai_class, openai_config, sample_messages, mock_audit_logger):
    """Test non-streaming chat completion."""
    mock_client = Mock()
    mock_completion = Mock()
    mock_completion.choices = [
        Mock(message=Mock(content="The answer is 4"))
    ]
    mock_client.chat.completions.create = Mock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    response = await service.chat(sample_messages)

    assert response == "The answer is 4"
    mock_client.chat.completions.create.assert_called_once()

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_stream_chat(mock_openai_class, openai_config, sample_messages, mock_audit_logger):
    """Test streaming chat completion."""
    mock_client = Mock()

    # Mock streaming response
    class MockDelta:
        def __init__(self, content):
            self.content = content

    class MockChoice:
        def __init__(self, delta):
            self.delta = delta

    class MockChunk:
        def __init__(self, content):
            self.choices = [MockChoice(MockDelta(content))]

    mock_stream = [
        MockChunk("The "),
        MockChunk("answer "),
        MockChunk("is "),
        MockChunk("4"),
    ]

    mock_client.chat.completions.create = Mock(return_value=mock_stream)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)

    tokens = []
    async for token in service.stream_chat(sample_messages):
        tokens.append(token)

    assert "".join(tokens) == "The answer is 4"

# ============================================================================
# ANALYSIS TESTS
# ============================================================================

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_analyze_case(
    mock_openai_class,
    openai_config,
    sample_case_analysis_request,
    mock_audit_logger
):
    """Test case analysis."""
    mock_client = Mock()

    # Mock response with JSON
    analysis_json = {
        "legalIssues": [{
            "issue": "Unfair dismissal",
            "severity": "high",
            "relevantLaw": ["Employment Rights Act 1996"],
            "potentialClaims": ["Unfair dismissal"],
            "defenses": []
        }],
        "applicableLaw": [],
        "recommendedActions": [],
        "evidenceGaps": [],
        "estimatedComplexity": {
            "score": 6,
            "factors": ["Multiple claims"],
            "explanation": "Moderate complexity"
        },
        "reasoning": "Analysis complete",
        "disclaimer": "This is information, not legal advice."
    }

    mock_completion = Mock()
    mock_completion.choices = [
        Mock(message=Mock(content=f"```json\n{json.dumps(analysis_json)}\n```"))
    ]
    mock_client.chat.completions.create = Mock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    response = await service.analyze_case(sample_case_analysis_request)

    assert len(response.legal_issues) == 1
    assert response.legal_issues[0].issue == "Unfair dismissal"
    assert response.estimated_complexity.score == 6

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_analyze_evidence(
    mock_openai_class,
    openai_config,
    sample_evidence_analysis_request,
    mock_audit_logger
):
    """Test evidence analysis."""
    mock_client = Mock()

    analysis_json = {
        "gaps": [{
            "description": "Missing employment contract",
            "importance": "critical",
            "suggestedSources": ["HR department"]
        }],
        "suggestions": ["Obtain employment contract"],
        "strength": "moderate",
        "explanation": "Some evidence available",
        "disclaimer": "This is information, not legal advice."
    }

    mock_completion = Mock()
    mock_completion.choices = [
        Mock(message=Mock(content=json.dumps(analysis_json)))
    ]
    mock_client.chat.completions.create = Mock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    response = await service.analyze_evidence(sample_evidence_analysis_request)

    assert len(response.gaps) == 1
    assert response.gaps[0].description == "Missing employment contract"
    assert response.strength == "moderate"

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_draft_document(
    mock_openai_class,
    openai_config,
    sample_document_draft_request,
    mock_audit_logger
):
    """Test document drafting."""
    mock_client = Mock()

    draft_json = {
        "content": "Dear Sir/Madam,\n\nI am writing regarding...",
        "metadata": {
            "type": "letter",
            "createdAt": "2025-11-15T10:00:00",
            "wordCount": 150,
            "modelUsed": "gpt-4-turbo",
            "caseId": "case-123"
        },
        "disclaimer": "This is a draft template, not legal advice."
    }

    mock_completion = Mock()
    mock_completion.choices = [
        Mock(message=Mock(content=json.dumps(draft_json)))
    ]
    mock_client.chat.completions.create = Mock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    response = await service.draft_document(sample_document_draft_request)

    assert "Dear Sir/Madam" in response.content
    assert response.metadata.type == DocumentType.LETTER
    assert response.metadata.word_count == 150

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_extract_case_data_from_document(
    mock_openai_class,
    openai_config,
    sample_parsed_document,
    sample_user_profile,
    mock_audit_logger
):
    """Test document extraction."""
    mock_client = Mock()

    response_text = """This is an Employment Tribunal claim form. The case involves unfair dismissal.

```json
{
  "documentOwnershipMismatch": false,
  "documentClaimantName": null,
  "title": "Employment Tribunal Claim - Unfair Dismissal",
  "caseType": "employment",
  "description": "Claim for unfair dismissal",
  "claimantName": "John Doe",
  "opposingParty": "ABC Company Ltd",
  "caseNumber": "ET/123456",
  "courtName": "Employment Tribunal (Manchester)",
  "filingDeadline": "2026-01-15",
  "nextHearingDate": null,
  "confidence": {
    "title": 0.9,
    "caseType": 0.95,
    "description": 0.85,
    "opposingParty": 0.8,
    "caseNumber": 0.95,
    "courtName": 0.9,
    "filingDeadline": 0.75,
    "nextHearingDate": 0.0
  },
  "extractedFrom": {}
}
```
"""

    mock_completion = Mock()
    mock_completion.choices = [
        Mock(message=Mock(content=response_text))
    ]
    mock_client.chat.completions.create = Mock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    response = await service.extract_case_data_from_document(
        sample_parsed_document,
        sample_user_profile
    )

    assert "Employment Tribunal" in response.analysis
    assert response.suggested_case_data.title == "Employment Tribunal Claim - Unfair Dismissal"
    assert response.suggested_case_data.case_type == "employment"
    assert response.suggested_case_data.case_number == "ET/123456"
    assert response.suggested_case_data.claimant_name == "John Doe"
    assert response.suggested_case_data.confidence.case_type == 0.95

# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_chat_without_client(openai_config, sample_messages, mock_audit_logger):
    """Test chat without initialized client."""
    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    service.client = None  # Simulate uninitialized client

    with pytest.raises(Exception):  # HTTPException
        await service.chat(sample_messages)

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_chat_api_error(mock_openai_class, openai_config, sample_messages, mock_audit_logger):
    """Test chat with API error."""
    mock_client = Mock()
    mock_client.chat.completions.create = Mock(side_effect=Exception("API Error"))
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)

    with pytest.raises(Exception):  # HTTPException
        await service.chat(sample_messages)

    # Verify error was logged
    mock_audit_logger.log_error.assert_called()

@pytest.mark.asyncio
@patch('backend.services.ai.service.openai.OpenAI')
async def test_extract_case_data_fallback(
    mock_openai_class,
    openai_config,
    sample_parsed_document,
    sample_user_profile,
    mock_audit_logger
):
    """Test document extraction with fallback (no JSON)."""
    mock_client = Mock()

    # Response without JSON
    response_text = "This is a simple analysis without structured data."

    mock_completion = Mock()
    mock_completion.choices = [
        Mock(message=Mock(content=response_text))
    ]
    mock_client.chat.completions.create = Mock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client

    service = UnifiedAIService(openai_config, audit_logger=mock_audit_logger)
    response = await service.extract_case_data_from_document(
        sample_parsed_document,
        sample_user_profile
    )

    # Should return fallback with low confidence
    assert response.analysis == response_text
    assert response.suggested_case_data.confidence.title == 0.3
    assert response.suggested_case_data.case_type == "other"

# ============================================================================
# PROVIDER-SPECIFIC TESTS
# ============================================================================

@pytest.mark.asyncio
@patch('backend.services.ai.service.anthropic.Anthropic')
async def test_anthropic_chat(mock_anthropic_class, anthropic_config, sample_messages, mock_audit_logger):
    """Test Anthropic-specific chat."""
    mock_client = Mock()

    # Mock Anthropic response
    class MockTextContent:
        type = "text"
        text = "The answer is 4"

    mock_response = Mock()
    mock_response.content = [MockTextContent()]

    mock_client.messages.create = Mock(return_value=mock_response)
    mock_anthropic_class.return_value = mock_client

    service = UnifiedAIService(anthropic_config, audit_logger=mock_audit_logger)
    response = await service.chat(sample_messages)

    assert response == "The answer is 4"
    mock_client.messages.create.assert_called_once()

@pytest.mark.asyncio
@patch('backend.services.ai.service.InferenceClient')
async def test_qwen_chat(mock_hf_class, qwen_config, sample_messages, mock_audit_logger):
    """Test Qwen-specific chat."""
    mock_client = Mock()

    # Mock HuggingFace response
    mock_response = Mock()
    mock_response.choices = [
        Mock(message=Mock(content="The answer is 4"))
    ]

    mock_client.chat_completion = Mock(return_value=mock_response)
    mock_hf_class.return_value = mock_client

    service = UnifiedAIService(qwen_config, audit_logger=mock_audit_logger)
    response = await service.chat(sample_messages)

    assert response == "The answer is 4"
    mock_client.chat_completion.assert_called_once()

# ============================================================================
# INTEGRATION TEST (Requires Real API Keys - Skip by Default)
# ============================================================================

@pytest.mark.skip(reason="Requires real API key and costs money")
@pytest.mark.asyncio
async def test_real_openai_integration():
    """Integration test with real OpenAI API (skip by default)."""
    import os

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")

    config = AIProviderConfig(
        provider="openai",
        api_key=api_key,
        model="gpt-3.5-turbo",
        max_tokens=50
    )

    service = UnifiedAIService(config)
    messages = [ChatMessage(role="user", content="What is 2+2? Answer in one word.")]

    response = await service.chat(messages)
    assert "4" in response.lower()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

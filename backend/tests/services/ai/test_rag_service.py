"""
Comprehensive test suite for RAGService.

Tests cover:
- Question processing pipeline (happy path)
- Context retrieval and assembly
- Safety validation (advice patterns)
- Disclaimer enforcement
- Error handling (NO_CONTEXT, SAFETY_VIOLATION)
- Audit logging integration
- Parallel API queries
- Context limiting and sorting
"""

import pytest
from unittest.mock import Mock, AsyncMock

from backend.services.ai.rag import (
    RAGService,
    LegalContext,
    LegislationResult,
    CaseResult,
    KnowledgeEntry,
    AIResponse,
    ProcessQuestionInput,
    build_context_string,
    extract_sources,
    build_system_prompt,
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_legal_api_service():
    """Mock LegalAPIService with valid responses."""
    service = Mock()
    service.extract_keywords = AsyncMock(return_value={"all": ["unfair", "dismissal", "employment"]})
    service.classify_question = AsyncMock(return_value="employment")
    service.search_legislation = AsyncMock(return_value=[
        {
            "title": "Employment Rights Act 1996",
            "section": "Section 94",
            "content": "An employee has the right not to be unfairly dismissed.",
            "url": "https://legislation.gov.uk/ukpga/1996/18/section/94",
            "relevance": 0.95
        }
    ])
    service.search_case_law = AsyncMock(return_value=[
        {
            "citation": "Smith v ABC Ltd [2025] ET/12345/25",
            "court": "Employment Tribunal",
            "date": "2025-09-15",
            "summary": "Claimant successfully proved unfair dismissal.",
            "outcome": "Claimant successful",
            "url": "https://caselaw.nationalarchives.gov.uk/eat/2025/123",
            "relevance": 0.90
        }
    ])
    service.search_knowledge_base = AsyncMock(return_value=[
        {
            "topic": "Unfair Dismissal",
            "category": "Employment",
            "content": "Unfair dismissal is when an employer terminates employment without valid reason.",
            "sources": ["ACAS Guide 2025"]
        }
    ])
    return service

@pytest.fixture
def mock_empty_legal_api_service():
    """Mock LegalAPIService with no results."""
    service = Mock()
    service.extract_keywords = AsyncMock(return_value={"all": []})
    service.classify_question = AsyncMock(return_value="unknown")
    service.search_legislation = AsyncMock(return_value=[])
    service.search_case_law = AsyncMock(return_value=[])
    service.search_knowledge_base = AsyncMock(return_value=[])
    return service

@pytest.fixture
def mock_ai_service():
    """Mock AIService with valid informative response."""
    service = Mock()
    service.chat = AsyncMock(return_value=AIResponse(
        success=True,
        message=(
            "I understand this situation must be stressful. "
            "The Employment Rights Act 1996 Section 94 states that an employee has the right not to be unfairly dismissed. "
            "This means your employer must have a valid reason and follow a fair procedure."
        ),
        sources=[
            "Employment Rights Act 1996 Section 94 - https://legislation.gov.uk/...",
            "Smith v ABC Ltd [2024] ET/12345/24 - https://caselaw.nationalarchives.gov.uk/..."
        ],
        tokens_used=150
    ))
    return service

@pytest.fixture
def mock_advice_ai_service():
    """Mock AIService that returns prohibited advice language."""
    service = Mock()
    service.chat = AsyncMock(return_value=AIResponse(
        success=True,
        message="You should contact a solicitor immediately. I recommend taking legal action.",
        sources=["Employment Rights Act 1996 Section 94 - https://legislation.gov.uk/..."],
        tokens_used=50
    ))
    return service

@pytest.fixture
def mock_audit_logger():
    """Mock AuditLogger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def sample_legal_context():
    """Sample legal context for testing."""
    return LegalContext(
        legislation=[
            LegislationResult(
                title="Employment Rights Act 1996",
                section="Section 94",
                content="An employee has the right not to be unfairly dismissed.",
                url="https://legislation.gov.uk/ukpga/1996/18/section/94",
                relevance=0.95
            )
        ],
        case_law=[
            CaseResult(
                citation="Smith v ABC Ltd [2025] ET/12345/25",
                court="Employment Tribunal",
                date="2025-09-15",
                summary="Claimant successfully proved unfair dismissal.",
                outcome="Claimant successful",
                url="https://caselaw.nationalarchives.gov.uk/eat/2025/123",
                relevance=0.90
            )
        ],
        knowledge_base=[
            KnowledgeEntry(
                topic="Unfair Dismissal",
                category="Employment",
                content="Unfair dismissal is when an employer terminates employment without valid reason.",
                sources=["ACAS Guide 2025"]
            )
        ]
    )

# ============================================================================
# TEST PROCESS QUESTION - HAPPY PATH
# ============================================================================

@pytest.mark.asyncio
async def test_process_question_success(
    mock_legal_api_service,
    mock_ai_service,
    mock_audit_logger
):
    """Test successful question processing with valid context."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api_service,
        ai_service=mock_ai_service,
        audit_logger=mock_audit_logger
    )

    response = await rag_service.process_question(
        question="What are my rights if I was unfairly dismissed?",
        case_id=123,
        user_id=456
    )

    # Verify response structure
    assert response.success is True
    assert response.message is not None
    assert len(response.sources) > 0
    assert response.error is None
    assert response.code is None

    # Verify disclaimer is present
    assert "⚠️" in response.message
    assert "general information only" in response.message.lower()

    # Verify audit logging
    assert mock_audit_logger.log.call_count >= 2  # started + completed
    audit_calls = [call.kwargs for call in mock_audit_logger.log.call_args_list]
    assert any("rag.process_question.started" in call.get("event_type", "") for call in audit_calls)
    assert any("rag.process_question.completed" in call.get("event_type", "") for call in audit_calls)

@pytest.mark.asyncio
async def test_process_question_with_case_context(
    mock_legal_api_service,
    mock_ai_service
):
    """Test question processing with case ID context."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api_service,
        ai_service=mock_ai_service
    )

    response = await rag_service.process_question(
        question="What is unfair dismissal?",
        case_id=789,
        user_id=123
    )

    assert response.success is True
    # Verify AI service was called with case_id
    mock_ai_service.chat.assert_called_once()
    call_kwargs = mock_ai_service.chat.call_args.kwargs
    assert call_kwargs.get("case_id") == 789

# ============================================================================
# TEST NO CONTEXT ERROR
# ============================================================================

@pytest.mark.asyncio
async def test_process_question_no_context(
    mock_empty_legal_api_service,
    mock_ai_service,
    mock_audit_logger
):
    """Test question with no relevant legal information."""
    rag_service = RAGService(
        legal_api_service=mock_empty_legal_api_service,
        ai_service=mock_ai_service,
        audit_logger=mock_audit_logger
    )

    response = await rag_service.process_question(
        question="What is the meaning of life?",
        user_id=456
    )

    # Verify error response
    assert response.success is False
    assert response.code == "NO_CONTEXT"
    assert "don't have information" in response.error.lower()
    assert "consult a qualified solicitor" in response.error.lower()

    # Verify AI service was NOT called
    mock_ai_service.chat.assert_not_called()

    # Verify audit logging for no context
    audit_calls = [call.kwargs for call in mock_audit_logger.log.call_args_list]
    assert any("rag.no_context" in call.get("event_type", "") for call in audit_calls)

# ============================================================================
# TEST SAFETY VALIDATION
# ============================================================================

@pytest.mark.asyncio
async def test_safety_validation_rejects_advice_language(
    mock_legal_api_service,
    mock_advice_ai_service,
    mock_audit_logger
):
    """Test safety validation rejects advice language."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api_service,
        ai_service=mock_advice_ai_service,
        audit_logger=mock_audit_logger
    )

    response = await rag_service.process_question(
        question="What should I do about unfair dismissal?",
        user_id=456
    )

    # Verify response was rejected
    assert response.success is False
    assert response.code == "SAFETY_VIOLATION"
    assert "validation failed" in response.error.lower()

    # Verify audit logging for safety violation
    audit_calls = [call.kwargs for call in mock_audit_logger.log.call_args_list]
    assert any("rag.safety_violation" in call.get("event_type", "") for call in audit_calls)

def test_validate_response_detects_advice_patterns():
    """Test validation detects all prohibited advice patterns."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    # Test each prohibited pattern
    advice_phrases = [
        "You should contact a solicitor immediately.",
        "I recommend taking legal action.",
        "You must file a claim within 3 months.",
        "I advise you to seek professional help.",
        "You ought to document everything.",
        "My advice is to consult an employment lawyer.",
        "I suggest you contact ACAS first."
    ]

    for phrase in advice_phrases:
        validation = rag_service._validate_response(phrase + " " * 50)  # Pad to 50+ chars
        assert validation.valid is False, f"Failed to detect: {phrase}"
        assert len(validation.violations) > 0

def test_validate_response_allows_information_language():
    """Test validation allows informative (non-advice) language."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    informative_responses = [
        (
            "The law states that employees have the right not to be unfairly dismissed. "
            "Many people in this situation choose to contact ACAS for guidance. "
            "Options typically include raising a grievance or filing an employment tribunal claim. "
            "⚠️ This is general information only."
        ),
        (
            "According to the Employment Rights Act 1996, unfair dismissal occurs when an employer "
            "terminates employment without valid reason. People commonly explore options such as "
            "mediation or legal representation. ⚠️ Disclaimer included."
        )
    ]

    for response in informative_responses:
        validation = rag_service._validate_response(response)
        assert validation.valid is True, f"Incorrectly rejected informative response: {response[:100]}"
        assert len(validation.violations) == 0

def test_validate_response_requires_disclaimer():
    """Test validation requires disclaimer presence."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    # Response without disclaimer
    response_no_disclaimer = (
        "The Employment Rights Act 1996 Section 94 states that employees have the right "
        "not to be unfairly dismissed by their employer."
    )

    validation = rag_service._validate_response(response_no_disclaimer)
    assert validation.valid is False
    assert any("disclaimer" in v.lower() for v in validation.violations)

def test_validate_response_requires_minimum_length():
    """Test validation requires minimum response length."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    # Response too short
    short_response = "Yes. ⚠️"

    validation = rag_service._validate_response(short_response)
    assert validation.valid is False
    assert any("too short" in v.lower() for v in validation.violations)

# ============================================================================
# TEST DISCLAIMER ENFORCEMENT
# ============================================================================

def test_enforce_disclaimer_adds_when_missing():
    """Test disclaimer is added when missing."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    response_without_disclaimer = "The law states that employees have rights."

    result = rag_service._enforce_disclaimer(response_without_disclaimer)

    assert "⚠️" in result
    assert "general information only" in result.lower()
    assert "consult a qualified solicitor" in result.lower()

def test_enforce_disclaimer_does_not_duplicate():
    """Test disclaimer is not duplicated if already present."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    response_with_disclaimer = (
        "The law states that employees have rights. "
        "⚠️ This is general information only. For advice specific to your situation, "
        "please consult a qualified solicitor."
    )

    result = rag_service._enforce_disclaimer(response_with_disclaimer)

    # Should be unchanged
    assert result == response_with_disclaimer
    # Should not have duplicate disclaimers
    assert result.count("⚠️") == 1

# ============================================================================
# TEST CONTEXT ASSEMBLY
# ============================================================================

@pytest.mark.asyncio
async def test_fetch_context_for_question(mock_legal_api_service):
    """Test public method for fetching context (for streaming)."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api_service,
        ai_service=Mock()
    )

    context = await rag_service.fetch_context_for_question(
        question="What is unfair dismissal?"
    )

    # Verify context structure
    assert isinstance(context, LegalContext)
    assert len(context.legislation) > 0
    assert len(context.case_law) > 0
    assert len(context.knowledge_base) > 0

def test_limit_and_sort_legislation():
    """Test legislation results are limited and sorted by relevance."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    # Create 10 legislation results with varying relevance
    results = [
        {
            "title": f"Act {i}",
            "content": f"Content {i}",
            "url": f"https://example.com/{i}",
            "relevance": i * 0.1
        }
        for i in range(10)
    ]

    limited = rag_service._limit_and_sort_legislation(results)

    # Should return top 5
    assert len(limited) == 5
    # Should be sorted by relevance (descending)
    assert limited[0].relevance == 0.9
    assert limited[4].relevance == 0.5

def test_limit_and_sort_case_law():
    """Test case law results are limited and sorted by relevance."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    # Create 10 case law results with varying relevance
    results = [
        {
            "citation": f"Case {i}",
            "court": "Employment Tribunal",
            "date": "2025-11-01",
            "summary": f"Summary {i}",
            "url": f"https://example.com/{i}",
            "relevance": i * 0.1
        }
        for i in range(10)
    ]

    limited = rag_service._limit_and_sort_case_law(results)

    # Should return top 3
    assert len(limited) == 3
    # Should be sorted by relevance (descending)
    assert limited[0].relevance == 0.9
    assert limited[2].relevance == 0.7

def test_limit_knowledge_base():
    """Test knowledge base results are limited."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    # Create 10 knowledge base results
    results = [
        {
            "topic": f"Topic {i}",
            "category": "Employment",
            "content": f"Content {i}",
            "sources": [f"Source {i}"]
        }
        for i in range(10)
    ]

    limited = rag_service._limit_knowledge_base(results)

    # Should return top 3
    assert len(limited) == 3

# ============================================================================
# TEST CONTEXT VALIDATION
# ============================================================================

def test_has_valid_context_with_legislation():
    """Test context is valid with legislation only."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    context = LegalContext(
        legislation=[LegislationResult(
            title="Test Act",
            content="Test content",
            url="https://example.com"
        )],
        case_law=[],
        knowledge_base=[]
    )

    assert rag_service._has_valid_context(context) is True

def test_has_valid_context_empty():
    """Test context is invalid when completely empty."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    context = LegalContext(
        legislation=[],
        case_law=[],
        knowledge_base=[]
    )

    assert rag_service._has_valid_context(context) is False

# ============================================================================
# TEST QUERY STATISTICS
# ============================================================================

@pytest.mark.asyncio
async def test_get_last_query_stats_after_query(
    mock_legal_api_service,
    mock_ai_service
):
    """Test query statistics are tracked after processing."""
    rag_service = RAGService(
        legal_api_service=mock_legal_api_service,
        ai_service=mock_ai_service
    )

    # Process question
    await rag_service.process_question(
        question="What is unfair dismissal?",
        user_id=123
    )

    # Get statistics
    stats = rag_service.get_last_query_stats()

    assert stats.has_stats is True
    assert stats.legislation_count == 1
    assert stats.case_law_count == 1
    assert stats.knowledge_base_count == 1
    assert stats.total_context_size is not None
    assert stats.total_context_size > 0

def test_get_last_query_stats_no_queries():
    """Test statistics when no queries have been processed."""
    rag_service = RAGService(
        legal_api_service=Mock(),
        ai_service=Mock()
    )

    stats = rag_service.get_last_query_stats()

    assert stats.has_stats is False
    assert stats.message is not None

# ============================================================================
# TEST HELPER FUNCTIONS
# ============================================================================

def test_build_context_string(sample_legal_context):
    """Test context string building for AI prompt."""
    context_string = build_context_string(sample_legal_context)

    # Verify all sections present
    assert "=== RELEVANT LEGISLATION ===" in context_string
    assert "=== RELEVANT CASE LAW ===" in context_string
    assert "=== KNOWLEDGE BASE ===" in context_string

    # Verify content
    assert "Employment Rights Act 1996" in context_string
    assert "Smith v ABC Ltd" in context_string
    assert "Unfair Dismissal" in context_string

def test_extract_sources(sample_legal_context):
    """Test source extraction from context."""
    sources = extract_sources(sample_legal_context)

    # Should extract all sources with URLs
    assert len(sources) == 2  # 1 legislation + 1 case law
    assert any("Employment Rights Act 1996" in s for s in sources)
    assert any("Smith v ABC Ltd" in s for s in sources)

    # All sources should have URLs
    for source in sources:
        assert "https://" in source.lower() or "http://" in source.lower()

def test_build_system_prompt(sample_legal_context):
    """Test complete system prompt building."""
    system_prompt = build_system_prompt(sample_legal_context)

    # Verify template content
    assert "UK legal information assistant" in system_prompt
    assert "INFORMATION ONLY" in system_prompt
    assert "NEVER" in system_prompt
    assert "Employment Rights Act 1996" in system_prompt
    assert "Smith v ABC Ltd" in system_prompt

# ============================================================================
# TEST ERROR HANDLING
# ============================================================================

@pytest.mark.asyncio
async def test_process_question_handles_api_exception(mock_audit_logger):
    """Test graceful handling of API exceptions."""
    # Create service that raises exception
    failing_api_service = Mock()
    failing_api_service.extract_keywords = AsyncMock(side_effect=Exception("API Error"))

    rag_service = RAGService(
        legal_api_service=failing_api_service,
        ai_service=Mock(),
        audit_logger=mock_audit_logger
    )

    response = await rag_service.process_question(
        question="What is unfair dismissal?",
        user_id=123
    )

    # Should return error response, not raise exception
    assert response.success is False
    assert response.code == "EXCEPTION"
    assert "error occurred" in response.error.lower()

    # Should log error
    audit_calls = [call.kwargs for call in mock_audit_logger.log.call_args_list]
    assert any("error" in call.get("event_type", "").lower() for call in audit_calls)

@pytest.mark.asyncio
async def test_fetch_context_handles_partial_api_failure():
    """Test context assembly continues when one API fails."""
    # Create service where one API fails
    partial_api_service = Mock()
    partial_api_service.extract_keywords = AsyncMock(return_value={"all": ["test"]})
    partial_api_service.classify_question = AsyncMock(return_value="employment")
    partial_api_service.search_legislation = AsyncMock(return_value=[
        {
            "title": "Test Act",
            "content": "Test content",
            "url": "https://example.com",
            "relevance": 0.8
        }
    ])
    partial_api_service.search_case_law = AsyncMock(side_effect=Exception("Case Law API Error"))
    partial_api_service.search_knowledge_base = AsyncMock(return_value=[])

    rag_service = RAGService(
        legal_api_service=partial_api_service,
        ai_service=Mock()
    )

    context = await rag_service.fetch_context_for_question("Test question")

    # Should have legislation, but not case law
    assert len(context.legislation) > 0
    assert len(context.case_law) == 0
    assert len(context.knowledge_base) == 0

# ============================================================================
# TEST INPUT VALIDATION
# ============================================================================

def test_process_question_input_validation():
    """Test Pydantic input validation."""
    # Valid input
    valid_input = ProcessQuestionInput(
        question="What is unfair dismissal?",
        case_id=123
    )
    assert valid_input.question == "What is unfair dismissal?"
    assert valid_input.case_id == 123

    # Empty question (should fail)
    with pytest.raises(ValueError):
        ProcessQuestionInput(question="", case_id=123)

    # Whitespace-only question (should fail)
    with pytest.raises(ValueError):
        ProcessQuestionInput(question="   ", case_id=123)

    # Question too long (should fail)
    with pytest.raises(ValueError):
        ProcessQuestionInput(question="a" * 2001, case_id=123)

# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

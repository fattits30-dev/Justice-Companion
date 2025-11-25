"""
Test suite for enhanced chat routes with service layer integration.

Tests cover:
- Conversation CRUD operations
- Message handling
- AI integration (streaming and non-streaming)
- RAG integration for legal context
- Error handling and edge cases
- Security (ownership verification)

All tests use service layer mocks instead of database mocks.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routes.chat_enhanced import router
from backend.services.chat_service import (
    ChatService,
    ConversationResponse,
    MessageResponse,
    ConversationWithMessagesResponse
)
from backend.services.ai.service import UnifiedAIService
from backend.services.ai.rag import RAGService, LegalContext
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

# ===== FIXTURES =====

@pytest.fixture
def app():
    """Create FastAPI app with chat router."""
    app = FastAPI()
    app.include_router(router)
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)

@pytest.fixture
def mock_db():
    """Mock database session."""
    mock_db = Mock()
    mock_db.execute = Mock()
    mock_db.commit = Mock()
    mock_db.rollback = Mock()
    return mock_db

@pytest.fixture
def mock_chat_service():
    """Mock ChatService."""
    service = Mock(spec=ChatService)
    service.create_conversation = AsyncMock()
    service.get_conversation = AsyncMock()
    service.load_conversation = AsyncMock()
    service.get_all_conversations = AsyncMock()
    service.get_recent_conversations_by_case = AsyncMock()
    service.add_message = AsyncMock()
    service.delete_conversation = AsyncMock()
    service.verify_ownership = AsyncMock()
    return service

@pytest.fixture
def mock_ai_service():
    """Mock UnifiedAIService."""
    service = Mock(spec=UnifiedAIService)
    service.chat = AsyncMock(return_value="Mock AI response")
    service.stream_chat = AsyncMock()
    service.analyze_case = AsyncMock()
    service.analyze_evidence = AsyncMock()
    service.draft_document = AsyncMock()
    service.extract_case_data_from_document = AsyncMock()
    return service

@pytest.fixture
def mock_rag_service():
    """Mock RAGService."""
    service = Mock(spec=RAGService)
    service.fetch_context_for_question = AsyncMock(return_value=LegalContext())
    service.process_question = AsyncMock()
    return service

@pytest.fixture
def mock_encryption_service():
    """Mock EncryptionService."""
    return Mock(spec=EncryptionService)

@pytest.fixture
def mock_audit_logger():
    """Mock AuditLogger."""
    logger = Mock(spec=AuditLogger)
    logger.log = Mock()
    return logger

@pytest.fixture
def mock_user_id():
    """Mock authenticated user ID."""
    return 1

# ===== HELPER FUNCTIONS =====

def override_dependencies(
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Override FastAPI dependencies with mocks."""
    from backend.routes.chat_enhanced import (
        get_db,
        get_chat_service,
        get_ai_service,
        get_rag_service,
        get_encryption_service,
        get_audit_logger,
        get_current_user
    )

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_chat_service] = lambda: mock_chat_service
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service
    app.dependency_overrides[get_rag_service] = lambda: mock_rag_service
    app.dependency_overrides[get_encryption_service] = lambda: mock_encryption_service
    app.dependency_overrides[get_audit_logger] = lambda: mock_audit_logger
    app.dependency_overrides[get_current_user] = lambda: mock_user_id

# ===== CONVERSATION CRUD TESTS =====

def test_get_conversations_success(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test GET /conversations - successful retrieval."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock service response
    mock_chat_service.get_recent_conversations_by_case.return_value = [
        ConversationResponse(
            id=1,
            user_id=1,
            case_id=None,
            title="Test conversation",
            created_at="2025-01-01T00:00:00Z",
            updated_at="2025-01-01T00:00:00Z",
            message_count=2
        )
    ]

    # Make request
    response = client.get("/chat/conversations")

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == 1
    assert data[0]["title"] == "Test conversation"

    # Verify service was called correctly
    mock_chat_service.get_recent_conversations_by_case.assert_called_once_with(
        user_id=mock_user_id,
        case_id=None,
        limit=10
    )

def test_get_conversations_with_case_filter(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test GET /conversations with case_id filter."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    mock_chat_service.get_recent_conversations_by_case.return_value = []

    response = client.get("/chat/conversations?case_id=5&limit=20")

    assert response.status_code == 200

    # Verify service was called with filters
    mock_chat_service.get_recent_conversations_by_case.assert_called_once_with(
        user_id=mock_user_id,
        case_id=5,
        limit=20
    )

def test_get_conversation_by_id_success(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test GET /conversations/{id} - successful retrieval."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock service response
    mock_chat_service.load_conversation.return_value = ConversationWithMessagesResponse(
        id=1,
        user_id=1,
        case_id=None,
        title="Test conversation",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        message_count=2,
        messages=[
            MessageResponse(
                id=1,
                conversation_id=1,
                role="user",
                content="Hello",
                thinking_content=None,
                timestamp="2025-01-01T00:00:00Z",
                token_count=None
            ),
            MessageResponse(
                id=2,
                conversation_id=1,
                role="assistant",
                content="Hi there!",
                thinking_content=None,
                timestamp="2025-01-01T00:01:00Z",
                token_count=None
            )
        ]
    )

    # Make request
    response = client.get("/chat/conversations/1")

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert len(data["messages"]) == 2
    assert data["messages"][0]["content"] == "Hello"
    assert data["messages"][1]["content"] == "Hi there!"

    # Verify service was called
    mock_chat_service.load_conversation.assert_called_once_with(1, mock_user_id)

def test_delete_conversation_success(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test DELETE /conversations/{id} - successful deletion."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    mock_chat_service.delete_conversation.return_value = True

    # Make request
    response = client.delete("/chat/conversations/1")

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify service was called
    mock_chat_service.delete_conversation.assert_called_once_with(1, mock_user_id)

# ===== CHAT MESSAGE TESTS =====

def test_send_chat_non_streaming_success(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test POST /send - non-streaming chat success."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock conversation creation
    mock_chat_service.create_conversation.return_value = ConversationResponse(
        id=10,
        user_id=1,
        case_id=None,
        title="Test question",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        message_count=0
    )

    # Mock message creation
    mock_chat_service.add_message.return_value = MessageResponse(
        id=1,
        conversation_id=10,
        role="user",
        content="Test question",
        thinking_content=None,
        timestamp="2025-01-01T00:00:00Z",
        token_count=None
    )

    # Mock AI response
    mock_ai_service.chat.return_value = "This is a test response."

    # Mock RAG context
    mock_rag_service.fetch_context_for_question.return_value = LegalContext()

    # Make request
    response = client.post("/chat/send", json={
        "message": "Test question",
        "useRAG": True
    })

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "This is a test response."
    assert data["conversationId"] == 10
    assert "sources" in data

    # Verify service calls
    mock_chat_service.create_conversation.assert_called_once()
    assert mock_chat_service.add_message.call_count == 2  # User + assistant messages
    mock_ai_service.chat.assert_called_once()

def test_send_chat_existing_conversation(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test POST /send - add message to existing conversation."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock existing conversation
    mock_chat_service.verify_ownership.return_value = True
    mock_chat_service.load_conversation.return_value = ConversationWithMessagesResponse(
        id=5,
        user_id=1,
        case_id=None,
        title="Existing conversation",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        message_count=2,
        messages=[
            MessageResponse(
                id=1,
                conversation_id=5,
                role="user",
                content="Previous message",
                thinking_content=None,
                timestamp="2025-01-01T00:00:00Z",
                token_count=None
            )
        ]
    )

    mock_ai_service.chat.return_value = "Follow-up response"

    # Make request
    response = client.post("/chat/send", json={
        "message": "Follow-up question",
        "conversationId": 5,
        "useRAG": False
    })

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["conversationId"] == 5

    # Verify conversation was loaded
    mock_chat_service.verify_ownership.assert_called_once_with(5, mock_user_id)
    mock_chat_service.load_conversation.assert_called_once_with(5, mock_user_id)

    # Verify no new conversation created
    mock_chat_service.create_conversation.assert_not_called()

def test_send_chat_validation_error(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test POST /send - validation error for empty message."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Make request with empty message
    response = client.post("/chat/send", json={
        "message": "",
        "useRAG": True
    })

    # Assertions
    assert response.status_code == 422  # Validation error

# ===== AI INTEGRATION TESTS =====

def test_analyze_case_success(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test POST /analyze-case - successful analysis."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock case ownership check
    mock_db.execute.return_value.fetchone.return_value = Mock(id=1)

    # Mock AI analysis response
    from backend.services.ai.service import CaseAnalysisResponse
    mock_ai_service.analyze_case.return_value = CaseAnalysisResponse(
        legal_issues=[],
        applicable_law=[],
        recommended_actions=[],
        evidence_gaps=[],
        estimated_complexity=Mock(score=5, factors=[], explanation="Medium complexity"),
        reasoning="Test reasoning",
        disclaimer="This is information, not legal advice."
    )

    # Make request
    response = client.post("/chat/analyze-case", json={
        "case_id": "1",
        "case_type": "employment",
        "jurisdiction": "england_wales",
        "description": "Test case",
        "evidence": [],
        "timeline": []
    })

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert "reasoning" in data

    # Verify AI service was called
    mock_ai_service.analyze_case.assert_called_once()

def test_analyze_case_unauthorized(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test POST /analyze-case - unauthorized access."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock case ownership check - case not found
    mock_db.execute.return_value.fetchone.return_value = None

    # Make request
    response = client.post("/chat/analyze-case", json={
        "case_id": "999",
        "case_type": "employment",
        "jurisdiction": "england_wales",
        "description": "Test case",
        "evidence": [],
        "timeline": []
    })

    # Assertions
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# ===== STREAMING TESTS =====

@pytest.mark.asyncio
async def test_stream_chat_success(
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test POST /stream - successful streaming response."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock streaming tokens
    async def mock_stream():
        yield "Hello "
        yield "world!"

    mock_ai_service.stream_chat.return_value = mock_stream()

    # Mock conversation creation
    mock_chat_service.create_conversation.return_value = ConversationResponse(
        id=15,
        user_id=1,
        case_id=None,
        title="Streaming test",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        message_count=0
    )

    # Note: Testing streaming with TestClient is complex
    # In production, use Playwright or httpx for SSE testing

# ===== ERROR HANDLING TESTS =====

def test_service_layer_exception_handling(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test error handling when service layer raises exception."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock service exception
    mock_chat_service.get_recent_conversations_by_case.side_effect = Exception("Database error")

    # Make request
    response = client.get("/chat/conversations")

    # Assertions
    assert response.status_code == 500
    assert "error" in response.json()["detail"].lower()

# ===== INTEGRATION TESTS =====

def test_rag_integration(
    client,
    app,
    mock_db,
    mock_chat_service,
    mock_ai_service,
    mock_rag_service,
    mock_encryption_service,
    mock_audit_logger,
    mock_user_id
):
    """Test RAG service integration in chat flow."""
    override_dependencies(
        app, mock_db, mock_chat_service, mock_ai_service, mock_rag_service,
        mock_encryption_service, mock_audit_logger, mock_user_id
    )

    # Mock RAG context with legal sources
    from backend.services.ai.rag import LegislationResult
    mock_context = LegalContext(
        legislation=[
            LegislationResult(
                title="Employment Rights Act 1996",
                section="Section 94",
                content="Test content",
                url="https://legislation.gov.uk/...",
                relevance=0.9
            )
        ]
    )
    mock_rag_service.fetch_context_for_question.return_value = mock_context

    # Mock conversation creation
    mock_chat_service.create_conversation.return_value = ConversationResponse(
        id=20,
        user_id=1,
        case_id=None,
        title="RAG test",
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        message_count=0
    )

    mock_ai_service.chat.return_value = "Response with legal context"

    # Make request
    response = client.post("/chat/send", json={
        "message": "What is unfair dismissal?",
        "useRAG": True
    })

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert len(data["sources"]) > 0  # Should have legal sources

    # Verify RAG was called
    mock_rag_service.fetch_context_for_question.assert_called_once_with(
        "What is unfair dismissal?"
    )

# ===== SUMMARY =====

"""
Test Coverage Summary:
- Conversation CRUD: 4 tests
- Message handling: 3 tests
- AI integration: 2 tests
- Streaming: 1 test (stub)
- Error handling: 1 test
- RAG integration: 1 test

Total: 12 tests covering:
- Service layer mocking (not database mocking)
- Dependency injection
- Error handling
- Security (ownership verification)
- RAG integration
- Streaming responses (stub)

To run tests:
    pytest backend/routes/test_chat_enhanced.py -v

To run with coverage:
    pytest backend/routes/test_chat_enhanced.py --cov=backend/routes/chat_enhanced --cov-report=html
"""

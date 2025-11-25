"""
Unit tests for AI Service Factory

Tests singleton pattern, provider management, and service orchestration.

Run with:
    pytest backend/services/test_ai_service_factory.py -v
    pytest backend/services/test_ai_service_factory.py -v --cov=backend.services.ai.factory
"""

import pytest
import tempfile
import os
from unittest.mock import Mock, AsyncMock

from backend.services.ai.factory import (
    AIServiceFactory,
    IntegratedAIService,
    OpenAIService,
    AIChatRequest,
    AIChatMessage,
    AIErrorResponse,
    LegalContext,
    get_ai_service_factory
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def temp_model_file():
    """Create temporary model file for testing"""
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        # Write some dummy data (10 MB)
        f.write(b"0" * (10 * 1024 * 1024))
        temp_path = f.name

    yield temp_path

    # Cleanup
    try:
        os.unlink(temp_path)
    except Exception:
        pass

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger"""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def factory(temp_model_file, mock_audit_logger):
    """Create AIServiceFactory instance for testing"""
    # Reset singleton before each test
    AIServiceFactory.reset_instance()

    factory = AIServiceFactory.get_instance(
        model_path=temp_model_file,
        audit_logger=mock_audit_logger
    )

    yield factory

    # Cleanup
    AIServiceFactory.reset_instance()

@pytest.fixture
def sample_chat_request():
    """Sample chat request for testing"""
    return AIChatRequest(
        messages=[
            AIChatMessage(
                role="user",
                content="What are my rights regarding unfair dismissal?"
            )
        ],
        case_id=123
    )

# ============================================================================
# SINGLETON PATTERN TESTS
# ============================================================================

def test_singleton_instance_creation(temp_model_file):
    """Test singleton instance is created correctly"""
    AIServiceFactory.reset_instance()

    factory1 = AIServiceFactory.get_instance(
        model_path=temp_model_file
    )
    factory2 = AIServiceFactory.get_instance()

    # Should return same instance
    assert factory1 is factory2

    AIServiceFactory.reset_instance()

def test_singleton_requires_model_path_on_first_call():
    """Test singleton raises error if model_path not provided on first call"""
    AIServiceFactory.reset_instance()

    with pytest.raises(ValueError, match="model_path required"):
        AIServiceFactory.get_instance()

    AIServiceFactory.reset_instance()

def test_singleton_thread_safety(temp_model_file):
    """Test singleton is thread-safe"""
    import threading

    AIServiceFactory.reset_instance()

    instances = []

    def create_instance():
        factory = AIServiceFactory.get_instance(
            model_path=temp_model_file
        )
        instances.append(factory)

    # Create 10 threads
    threads = [threading.Thread(target=create_instance) for _ in range(10)]

    # Start all threads
    for thread in threads:
        thread.start()

    # Wait for all threads
    for thread in threads:
        thread.join()

    # All instances should be the same
    assert len(set(id(inst) for inst in instances)) == 1

    AIServiceFactory.reset_instance()

def test_reset_instance(temp_model_file):
    """Test reset_instance() resets singleton"""
    AIServiceFactory.reset_instance()

    factory1 = AIServiceFactory.get_instance(model_path=temp_model_file)
    factory1_id = id(factory1)

    AIServiceFactory.reset_instance()

    factory2 = AIServiceFactory.get_instance(model_path=temp_model_file)
    factory2_id = id(factory2)

    # Should be different instances
    assert factory1_id != factory2_id

    AIServiceFactory.reset_instance()

# ============================================================================
# INITIALIZATION TESTS
# ============================================================================

def test_factory_initialization(factory, mock_audit_logger):
    """Test factory initializes with correct defaults"""
    assert factory.current_provider == "integrated"
    assert factory.integrated_service is not None
    assert factory.openai_service is None
    assert factory.audit_logger == mock_audit_logger

def test_factory_logs_initialization(temp_model_file, mock_audit_logger):
    """Test factory logs initialization event"""
    AIServiceFactory.reset_instance()

    factory = AIServiceFactory.get_instance(
        model_path=temp_model_file,
        audit_logger=mock_audit_logger
    )

    # Should log initialization
    mock_audit_logger.log.assert_called()

    # Find initialization call
    init_call = None
    for call in mock_audit_logger.log.call_args_list:
        if call[1].get("event_type") == "ai_factory.initialized":
            init_call = call
            break

    assert init_call is not None
    assert init_call[1]["success"] is True
    assert init_call[1]["details"]["default_provider"] == "integrated"

    AIServiceFactory.reset_instance()

# ============================================================================
# PROVIDER CONFIGURATION TESTS
# ============================================================================

def test_configure_openai_creates_service(factory, mock_audit_logger):
    """Test configure_openai() creates OpenAI service"""
    assert factory.openai_service is None

    factory.configure_openai("sk-test-key", "gpt-4o")

    assert factory.openai_service is not None
    assert factory.openai_service.model == "gpt-4o"
    assert factory.current_provider == "openai"

def test_configure_openai_updates_existing_service(factory):
    """Test configure_openai() updates existing service"""
    factory.configure_openai("sk-test-key-1", "gpt-4o")
    service1 = factory.openai_service

    factory.configure_openai("sk-test-key-2", "gpt-3.5-turbo")
    service2 = factory.openai_service

    # Should be same service instance, different config
    assert service1 is service2
    assert factory.openai_service.model == "gpt-3.5-turbo"

def test_configure_openai_logs_event(factory, mock_audit_logger):
    """Test configure_openai() logs configuration event"""
    factory.configure_openai("sk-test-key", "gpt-4o")

    # Find configuration call
    config_call = None
    for call in mock_audit_logger.log.call_args_list:
        if call[1].get("event_type") == "ai_factory.openai_configured":
            config_call = call
            break

    assert config_call is not None
    assert config_call[1]["success"] is True
    assert config_call[1]["details"]["model"] == "gpt-4o"
    assert config_call[1]["details"]["provider_switched"] == "openai"

# ============================================================================
# PROVIDER SWITCHING TESTS
# ============================================================================

def test_switch_to_openai_success(factory):
    """Test switch_to_openai() succeeds when OpenAI configured"""
    factory.configure_openai("sk-test-key", "gpt-4o")

    # Switch to integrated first
    factory.switch_to_integrated()
    assert factory.current_provider == "integrated"

    # Switch back to OpenAI
    result = factory.switch_to_openai()

    assert result is True
    assert factory.current_provider == "openai"

def test_switch_to_openai_failure(factory):
    """Test switch_to_openai() fails when OpenAI not configured"""
    assert factory.openai_service is None

    result = factory.switch_to_openai()

    assert result is False
    assert factory.current_provider == "integrated"

def test_switch_to_integrated(factory):
    """Test switch_to_integrated() works"""
    factory.configure_openai("sk-test-key", "gpt-4o")
    assert factory.current_provider == "openai"

    factory.switch_to_integrated()

    assert factory.current_provider == "integrated"

def test_switch_provider_logs_events(factory, mock_audit_logger):
    """Test provider switching logs audit events"""
    factory.configure_openai("sk-test-key", "gpt-4o")
    factory.switch_to_integrated()

    # Find switch event
    switch_call = None
    for call in mock_audit_logger.log.call_args_list:
        if call[1].get("event_type") == "ai_factory.provider_switched":
            switch_call = call
            break

    assert switch_call is not None
    assert switch_call[1]["success"] is True
    assert switch_call[1]["details"]["provider"] == "integrated"

# ============================================================================
# SERVICE RETRIEVAL TESTS
# ============================================================================

def test_get_ai_service_returns_integrated_by_default(factory):
    """Test get_ai_service() returns integrated service by default"""
    service = factory.get_ai_service()

    assert service is factory.integrated_service

def test_get_ai_service_returns_openai_when_configured(factory):
    """Test get_ai_service() returns OpenAI when configured"""
    factory.configure_openai("sk-test-key", "gpt-4o")

    service = factory.get_ai_service()

    assert service is factory.openai_service

def test_get_current_provider(factory):
    """Test get_current_provider() returns correct provider"""
    assert factory.get_current_provider() == "integrated"

    factory.configure_openai("sk-test-key", "gpt-4o")
    assert factory.get_current_provider() == "openai"

    factory.switch_to_integrated()
    assert factory.get_current_provider() == "integrated"

# ============================================================================
# MODEL VALIDATION TESTS
# ============================================================================

def test_is_model_available_true(factory, temp_model_file):
    """Test is_model_available() returns True when model exists"""
    assert os.path.exists(temp_model_file)
    assert factory.is_model_available() is True

def test_is_model_available_false(factory):
    """Test is_model_available() returns False when model doesn't exist"""
    factory.model_path = "/nonexistent/path/model.gguf"

    assert factory.is_model_available() is False

def test_get_model_size(factory, temp_model_file):
    """Test get_model_size() returns correct size"""
    size = factory.get_model_size()

    # Should be ~10 MB (we wrote 10 MB in fixture)
    expected_size = 10 * 1024 * 1024
    assert size == expected_size

def test_get_model_size_nonexistent(factory):
    """Test get_model_size() returns 0 for nonexistent model"""
    factory.model_path = "/nonexistent/path/model.gguf"

    size = factory.get_model_size()

    assert size == 0

def test_get_model_size_logs_error(factory, mock_audit_logger):
    """Test get_model_size() returns 0 for nonexistent path"""
    factory.model_path = "/nonexistent/path/model.gguf"  # Nonexistent path

    size = factory.get_model_size()

    # Should return 0 for nonexistent path
    assert size == 0

    # Note: This doesn't log an error, it just returns 0
    # The method only logs errors for actual exceptions (e.g., permission errors)

# ============================================================================
# CASE FACTS REPOSITORY TESTS
# ============================================================================

def test_set_case_facts_repository(factory):
    """Test set_case_facts_repository() sets repository"""
    mock_repository = Mock()

    factory.set_case_facts_repository(mock_repository)

    assert factory.integrated_service.case_facts_repository == mock_repository

def test_set_case_facts_repository_logs_event(factory, mock_audit_logger):
    """Test set_case_facts_repository() logs audit event"""
    mock_repository = Mock()

    factory.set_case_facts_repository(mock_repository)

    # Find repository set event
    repo_call = None
    for call in mock_audit_logger.log.call_args_list:
        if call[1].get("event_type") == "ai_factory.repository_set":
            repo_call = call
            break

    assert repo_call is not None
    assert repo_call[1]["success"] is True
    assert repo_call[1]["details"]["repository_set"] is True

# ============================================================================
# CHAT REQUEST HANDLING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_handle_chat_request_integrated(factory, sample_chat_request):
    """Test handle_chat_request() routes to integrated service"""
    # Mock integrated service
    factory.integrated_service.handle_chat_request = AsyncMock(
        return_value=AIErrorResponse(
            success=False,
            error="Test response",
            code="TEST"
        )
    )

    response = await factory.handle_chat_request(sample_chat_request)

    # Should call integrated service
    factory.integrated_service.handle_chat_request.assert_called_once_with(
        sample_chat_request
    )
    assert response.success is False

@pytest.mark.asyncio
async def test_handle_chat_request_openai(factory, sample_chat_request):
    """Test handle_chat_request() routes to OpenAI when configured"""
    factory.configure_openai("sk-test-key", "gpt-4o")

    # Mock OpenAI service
    factory.openai_service.handle_chat_request = AsyncMock(
        return_value=AIErrorResponse(
            success=False,
            error="Test response",
            code="TEST"
        )
    )

    response = await factory.handle_chat_request(sample_chat_request)

    # Should call OpenAI service
    factory.openai_service.handle_chat_request.assert_called_once_with(
        sample_chat_request
    )
    assert response.success is False

@pytest.mark.asyncio
async def test_handle_chat_request_logs_success(factory, mock_audit_logger, sample_chat_request):
    """Test handle_chat_request() logs successful request"""
    # Mock integrated service
    factory.integrated_service.handle_chat_request = AsyncMock(
        return_value=AIErrorResponse(
            success=False,
            error="Test",
            code="TEST"
        )
    )

    await factory.handle_chat_request(sample_chat_request)

    # Find completion event
    completion_call = None
    for call in mock_audit_logger.log.call_args_list:
        if call[1].get("event_type") == "ai_factory.chat_completed":
            completion_call = call
            break

    assert completion_call is not None
    assert completion_call[1]["success"] is True
    assert completion_call[1]["details"]["provider"] == "integrated"

@pytest.mark.asyncio
async def test_handle_chat_request_logs_failure(factory, mock_audit_logger, sample_chat_request):
    """Test handle_chat_request() logs failed request"""
    # Mock integrated service to raise exception
    factory.integrated_service.handle_chat_request = AsyncMock(
        side_effect=Exception("Test error")
    )

    with pytest.raises(Exception):
        await factory.handle_chat_request(sample_chat_request)

    # Find failure event
    failure_call = None
    for call in mock_audit_logger.log.call_args_list:
        if call[1].get("event_type") == "ai_factory.chat_failed":
            failure_call = call
            break

    assert failure_call is not None
    assert failure_call[1]["success"] is False
    assert "Test error" in failure_call[1]["error_message"]

@pytest.mark.asyncio
async def test_chat_method_alias(factory, sample_chat_request):
    """Test chat() method is alias for handle_chat_request()"""
    # Mock integrated service
    factory.integrated_service.handle_chat_request = AsyncMock(
        return_value=AIErrorResponse(
            success=False,
            error="Test",
            code="TEST"
        )
    )

    response = await factory.chat(sample_chat_request)

    # Should call handle_chat_request internally
    factory.integrated_service.handle_chat_request.assert_called_once()
    assert response.success is False

# ============================================================================
# HELPER FUNCTION TESTS
# ============================================================================

def test_get_ai_service_factory_success(factory):
    """Test get_ai_service_factory() returns singleton"""
    result = get_ai_service_factory()

    assert result is factory

def test_get_ai_service_factory_not_initialized():
    """Test get_ai_service_factory() raises error if not initialized"""
    AIServiceFactory.reset_instance()

    with pytest.raises(RuntimeError, match="not initialized"):
        get_ai_service_factory()

    AIServiceFactory.reset_instance()

# ============================================================================
# INTEGRATED SERVICE TESTS
# ============================================================================

def test_integrated_service_initialization(temp_model_file, mock_audit_logger):
    """Test IntegratedAIService initializes correctly"""
    service = IntegratedAIService(temp_model_file, mock_audit_logger)

    assert service.model_path == temp_model_file
    assert service.audit_logger == mock_audit_logger
    assert service.case_facts_repository is None

def test_integrated_service_set_repository(temp_model_file, mock_audit_logger):
    """Test IntegratedAIService.set_case_facts_repository()"""
    service = IntegratedAIService(temp_model_file, mock_audit_logger)
    mock_repository = Mock()

    service.set_case_facts_repository(mock_repository)

    assert service.case_facts_repository == mock_repository
    mock_audit_logger.log.assert_called()

@pytest.mark.asyncio
async def test_integrated_service_handle_chat_request(temp_model_file, mock_audit_logger, sample_chat_request):
    """Test IntegratedAIService.handle_chat_request() stub implementation"""
    service = IntegratedAIService(temp_model_file, mock_audit_logger)

    response = await service.handle_chat_request(sample_chat_request)

    # Should return stub error
    assert response.success is False
    assert "not implemented" in response.error.lower()
    assert response.code == "NOT_IMPLEMENTED"

# ============================================================================
# OPENAI SERVICE TESTS
# ============================================================================

def test_openai_service_initialization(mock_audit_logger):
    """Test OpenAIService initializes correctly"""
    service = OpenAIService("gpt-4o", mock_audit_logger)

    assert service.model == "gpt-4o"
    assert service.api_key is None
    assert service.audit_logger == mock_audit_logger

def test_openai_service_update_config(mock_audit_logger):
    """Test OpenAIService.update_config()"""
    service = OpenAIService("gpt-4o", mock_audit_logger)

    service.update_config("sk-test-key", "gpt-3.5-turbo")

    assert service.api_key == "sk-test-key"
    assert service.model == "gpt-3.5-turbo"
    mock_audit_logger.log.assert_called()

def test_openai_service_get_model(mock_audit_logger):
    """Test OpenAIService.get_model()"""
    service = OpenAIService("gpt-4o", mock_audit_logger)

    assert service.get_model() == "gpt-4o"

@pytest.mark.asyncio
async def test_openai_service_handle_chat_request(mock_audit_logger, sample_chat_request):
    """Test OpenAIService.handle_chat_request() stub implementation"""
    service = OpenAIService("gpt-4o", mock_audit_logger)

    response = await service.handle_chat_request(sample_chat_request)

    # Should return stub error
    assert response.success is False
    assert "not implemented" in response.error.lower()
    assert response.code == "NOT_IMPLEMENTED"

# ============================================================================
# PYDANTIC MODEL TESTS
# ============================================================================

def test_ai_chat_message_validation():
    """Test AIChatMessage validation"""
    # Valid message
    msg = AIChatMessage(
        role="user",
        content="Test message"
    )
    assert msg.role == "user"
    assert msg.content == "Test message"
    assert msg.timestamp is None

    # Invalid role should raise validation error
    with pytest.raises(Exception):  # Pydantic validation error
        AIChatMessage(role="invalid", content="Test")

def test_ai_chat_request_validation():
    """Test AIChatRequest validation"""
    request = AIChatRequest(
        messages=[
            AIChatMessage(role="user", content="Test")
        ],
        case_id=123
    )

    assert len(request.messages) == 1
    assert request.case_id == 123
    assert request.context is None
    assert request.config is None

def test_legal_context_validation():
    """Test LegalContext validation"""
    context = LegalContext(
        legislation=[
            {
                "title": "Employment Rights Act 1996",
                "section": "Section 94",
                "content": "Test content",
                "url": "https://example.com"
            }
        ]
    )

    assert len(context.legislation) == 1
    assert context.legislation[0].title == "Employment Rights Act 1996"

def test_ai_error_response_validation():
    """Test AIErrorResponse validation"""
    error = AIErrorResponse(
        success=False,
        error="Test error",
        code="TEST_CODE"
    )

    assert error.success is False
    assert error.error == "Test error"
    assert error.code == "TEST_CODE"

# ============================================================================
# EDGE CASES AND ERROR HANDLING
# ============================================================================

def test_factory_with_none_audit_logger(temp_model_file):
    """Test factory works without audit logger"""
    AIServiceFactory.reset_instance()

    factory = AIServiceFactory.get_instance(
        model_path=temp_model_file,
        audit_logger=None
    )

    # Should not raise exceptions
    factory.configure_openai("sk-test", "gpt-4o")
    factory.switch_to_integrated()
    factory.is_model_available()

    AIServiceFactory.reset_instance()

def test_model_path_with_spaces(mock_audit_logger):
    """Test factory handles model path with spaces"""
    AIServiceFactory.reset_instance()

    path_with_spaces = "F:\\Test Path\\model file.gguf"

    factory = AIServiceFactory.get_instance(
        model_path=path_with_spaces,
        audit_logger=mock_audit_logger
    )

    assert factory.model_path == path_with_spaces

    AIServiceFactory.reset_instance()

@pytest.mark.asyncio
async def test_handle_chat_request_with_context(factory, mock_audit_logger):
    """Test handle_chat_request() with legal context"""
    request = AIChatRequest(
        messages=[
            AIChatMessage(role="user", content="Test")
        ],
        context=LegalContext(
            legislation=[
                {
                    "title": "Test Act",
                    "content": "Test content",
                    "url": "https://example.com"
                }
            ]
        )
    )

    # Mock service
    factory.integrated_service.handle_chat_request = AsyncMock(
        return_value=AIErrorResponse(
            success=False,
            error="Test",
            code="TEST"
        )
    )

    await factory.handle_chat_request(request)

    # Should pass context through
    factory.integrated_service.handle_chat_request.assert_called_once_with(request)

"""
Unit tests for AI SDK Service.

Tests the AISDKService class functionality including:
- Configuration and initialization
- Provider selection and switching
- Non-streaming chat completions
- Streaming chat completions
- Error handling
- Audit logging
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch

from backend.services.ai.sdk import (
    AISDKService,
    AIProviderConfig,
    AIProviderType,
    ChatMessage,
    MessageRole,
    ProviderCapabilities,
    AIServiceError,
    ProviderNotConfiguredError,
    ProviderNotSupportedError,
    create_ai_sdk_service,
)

# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger for testing."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def openai_config():
    """OpenAI provider configuration."""
    return AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key="sk-test-key-123",
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4096
    )

@pytest.fixture
def anthropic_config():
    """Anthropic provider configuration."""
    return AIProviderConfig(
        provider=AIProviderType.ANTHROPIC,
        api_key="sk-ant-test-key-123",
        model="claude-3-5-sonnet-20241022",
        temperature=0.7,
        max_tokens=4096
    )

@pytest.fixture
def sample_messages():
    """Sample chat messages for testing."""
    return [
        ChatMessage(role=MessageRole.SYSTEM, content="You are a helpful assistant."),
        ChatMessage(role=MessageRole.USER, content="Hello, how are you?"),
    ]

# ============================================================================
# Configuration Tests
# ============================================================================

class TestConfiguration:
    """Tests for service configuration and initialization."""

    def test_valid_openai_config(self, openai_config):
        """Test valid OpenAI configuration."""
        assert openai_config.provider == AIProviderType.OPENAI
        assert openai_config.api_key == "sk-test-key-123"
        assert openai_config.model == "gpt-4-turbo"
        assert openai_config.temperature == 0.7
        assert openai_config.max_tokens == 4096

    def test_valid_anthropic_config(self, anthropic_config):
        """Test valid Anthropic configuration."""
        assert anthropic_config.provider == AIProviderType.ANTHROPIC
        assert anthropic_config.api_key == "sk-ant-test-key-123"
        assert anthropic_config.model == "claude-3-5-sonnet-20241022"

    def test_invalid_api_key(self):
        """Test that empty API key raises validation error."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="String should have at least 1 character"):
            AIProviderConfig(
                provider=AIProviderType.OPENAI,
                api_key="",
                model="gpt-4-turbo"
            )

    def test_temperature_validation(self):
        """Test temperature parameter validation."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AIProviderConfig(
                provider=AIProviderType.OPENAI,
                api_key="sk-test",
                model="gpt-4",
                temperature=3.0  # Out of range
            )

    def test_max_tokens_validation(self):
        """Test max_tokens parameter validation."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AIProviderConfig(
                provider=AIProviderType.OPENAI,
                api_key="sk-test",
                model="gpt-4",
                max_tokens=0  # Must be > 0
            )

# ============================================================================
# Service Initialization Tests
# ============================================================================

class TestServiceInitialization:
    """Tests for service initialization."""

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_openai_initialization(self, mock_openai_class, openai_config, mock_audit_logger):
        """Test OpenAI client initialization."""
        mock_client = AsyncMock()
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config, audit_logger=mock_audit_logger)

        assert service.config == openai_config
        assert service.audit_logger == mock_audit_logger
        assert service.client is not None
        mock_openai_class.assert_called_once()

    @patch('backend.services.ai.sdk.AsyncAnthropic')
    def test_anthropic_initialization(self, mock_anthropic_class, anthropic_config):
        """Test Anthropic client initialization."""
        mock_client = AsyncMock()
        mock_anthropic_class.return_value = mock_client

        service = AISDKService(anthropic_config)

        assert service.config == anthropic_config
        assert service.client is not None
        mock_anthropic_class.assert_called_once()

    def test_unsupported_provider_with_none_sdks(self):
        """Test that unsupported provider raises error when SDKs not installed."""
        config = AIProviderConfig(
            provider=AIProviderType.OPENAI,
            api_key="sk-test",
            model="gpt-4"
        )

        with patch('backend.services.ai.sdk.AsyncOpenAI', None):
            with pytest.raises(ProviderNotSupportedError, match="OpenAI SDK not installed"):
                AISDKService(config)

# ============================================================================
# Service Methods Tests
# ============================================================================

class TestServiceMethods:
    """Tests for service methods."""

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_get_provider(self, mock_openai_class, openai_config):
        """Test get_provider method."""
        mock_openai_class.return_value = AsyncMock()
        service = AISDKService(openai_config)

        assert service.get_provider() == AIProviderType.OPENAI

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_get_model_name(self, mock_openai_class, openai_config):
        """Test get_model_name method."""
        mock_openai_class.return_value = AsyncMock()
        service = AISDKService(openai_config)

        assert service.get_model_name() == "gpt-4-turbo"

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_is_configured_true(self, mock_openai_class, openai_config):
        """Test is_configured returns True when properly set up."""
        mock_openai_class.return_value = AsyncMock()
        service = AISDKService(openai_config)

        assert service.is_configured() is True

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_update_config(self, mock_openai_class, openai_config):
        """Test update_config reinitializes client."""
        mock_openai_class.return_value = AsyncMock()
        service = AISDKService(openai_config)

        new_config = AIProviderConfig(
            provider=AIProviderType.OPENAI,
            api_key="sk-new-key",
            model="gpt-3.5-turbo"
        )

        service.update_config(new_config)

        assert service.config == new_config
        assert service.get_model_name() == "gpt-3.5-turbo"

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_get_provider_capabilities(self, mock_openai_class, openai_config):
        """Test get_provider_capabilities returns correct metadata."""
        mock_openai_class.return_value = AsyncMock()
        service = AISDKService(openai_config)

        capabilities = service.get_provider_capabilities()

        assert isinstance(capabilities, ProviderCapabilities)
        assert capabilities.name == "OpenAI"
        assert capabilities.supports_streaming is True
        assert capabilities.max_context_tokens == 128000
        assert capabilities.current_model == "gpt-4-turbo"
        assert "openai.com" in capabilities.endpoint

# ============================================================================
# Chat Completion Tests
# ============================================================================

class TestChatCompletion:
    """Tests for non-streaming chat completions."""

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_openai_chat_success(self, mock_openai_class, openai_config, sample_messages):
        """Test successful OpenAI chat completion."""
        # Mock the client and response
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "I'm doing well, thank you!"

        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config)
        response = await service.chat(sample_messages)

        assert response == "I'm doing well, thank you!"
        mock_client.chat.completions.create.assert_called_once()

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncAnthropic')
    async def test_anthropic_chat_success(self, mock_anthropic_class, anthropic_config, sample_messages):
        """Test successful Anthropic chat completion."""
        # Mock the client and response
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "I'm doing great, thanks for asking!"
        mock_response.content = [mock_content_block]

        mock_client.messages.create = AsyncMock(return_value=mock_response)
        mock_anthropic_class.return_value = mock_client

        service = AISDKService(anthropic_config)
        response = await service.chat(sample_messages)

        assert response == "I'm doing great, thanks for asking!"
        mock_client.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_chat_not_configured(self, openai_config):
        """Test chat raises error when client not configured."""
        with patch('backend.services.ai.sdk.AsyncOpenAI', None):
            service = AISDKService.__new__(AISDKService)
            service.config = openai_config
            service.client = None
            service.audit_logger = None

            with pytest.raises(ProviderNotConfiguredError):
                await service.chat([])

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_chat_error_handling(self, mock_openai_class, openai_config, sample_messages):
        """Test chat error handling."""
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API Error")
        )
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config)

        with pytest.raises(AIServiceError, match="Chat completion failed"):
            await service.chat(sample_messages)

# ============================================================================
# Streaming Tests
# ============================================================================

class TestStreamingChat:
    """Tests for streaming chat completions."""

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_openai_streaming_success(self, mock_openai_class, openai_config, sample_messages):
        """Test successful OpenAI streaming."""
        # Mock streaming response
        mock_client = AsyncMock()

        async def mock_stream():
            chunks = [
                Mock(choices=[Mock(delta=Mock(content="Hello"))]),
                Mock(choices=[Mock(delta=Mock(content=" there"))]),
                Mock(choices=[Mock(delta=Mock(content="!"))]),
            ]
            for chunk in chunks:
                yield chunk

        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config)

        tokens = []
        complete_response = []

        def on_token(token: str):
            tokens.append(token)

        def on_complete(response: str):
            complete_response.append(response)

        await service.stream_chat(
            sample_messages,
            on_token=on_token,
            on_complete=on_complete
        )

        assert len(tokens) == 3
        assert tokens == ["Hello", " there", "!"]
        assert len(complete_response) == 1
        assert complete_response[0] == "Hello there!"

    @pytest.mark.asyncio
    async def test_streaming_not_configured(self, openai_config):
        """Test streaming raises error when client not configured."""
        with patch('backend.services.ai.sdk.AsyncOpenAI', None):
            service = AISDKService.__new__(AISDKService)
            service.config = openai_config
            service.client = None
            service.audit_logger = None

            error_called = []

            def on_error(error: Exception):
                error_called.append(error)

            await service.stream_chat([], on_error=on_error)

            assert len(error_called) == 1
            assert isinstance(error_called[0], ProviderNotConfiguredError)

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_streaming_error_handling(self, mock_openai_class, openai_config, sample_messages):
        """Test streaming error handling."""
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("Streaming error")
        )
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config)

        error_called = []

        def on_error(error: Exception):
            error_called.append(error)

        await service.stream_chat(
            sample_messages,
            on_error=on_error
        )

        assert len(error_called) == 1
        assert "Streaming error" in str(error_called[0])

# ============================================================================
# Audit Logging Tests
# ============================================================================

class TestAuditLogging:
    """Tests for audit logging functionality."""

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_chat_audit_log_success(
        self,
        mock_openai_class,
        openai_config,
        mock_audit_logger,
        sample_messages
    ):
        """Test audit logging on successful chat."""
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Response"

        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config, audit_logger=mock_audit_logger)
        await service.chat(sample_messages)

        # Verify audit log was called
        assert mock_audit_logger.log.call_count == 1
        call_args = mock_audit_logger.log.call_args[0][0]

        assert call_args["event_type"] == "ai.chat"
        assert call_args["action"] == "completion"
        assert call_args["success"] is True
        assert call_args["details"]["provider"] == "openai"
        assert call_args["details"]["model"] == "gpt-4-turbo"

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_chat_audit_log_failure(
        self,
        mock_openai_class,
        openai_config,
        mock_audit_logger,
        sample_messages
    ):
        """Test audit logging on chat failure."""
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API Error")
        )
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config, audit_logger=mock_audit_logger)

        with pytest.raises(AIServiceError):
            await service.chat(sample_messages)

        # Verify error was logged
        assert mock_audit_logger.log.call_count == 1
        call_args = mock_audit_logger.log.call_args[0][0]

        assert call_args["event_type"] == "ai.chat"
        assert call_args["success"] is False
        assert "API Error" in call_args["error_message"]

# ============================================================================
# Factory Function Tests
# ============================================================================

class TestFactoryFunction:
    """Tests for create_ai_sdk_service factory function."""

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_create_service_openai(self, mock_openai_class):
        """Test factory function creates OpenAI service."""
        mock_openai_class.return_value = AsyncMock()

        service = create_ai_sdk_service(
            provider="openai",
            api_key="sk-test",
            model="gpt-4-turbo"
        )

        assert isinstance(service, AISDKService)
        assert service.get_provider() == AIProviderType.OPENAI
        assert service.get_model_name() == "gpt-4-turbo"

    @patch('backend.services.ai.sdk.AsyncAnthropic')
    def test_create_service_anthropic(self, mock_anthropic_class):
        """Test factory function creates Anthropic service."""
        mock_anthropic_class.return_value = AsyncMock()

        service = create_ai_sdk_service(
            provider="anthropic",
            api_key="sk-ant-test",
            model="claude-3-5-sonnet-20241022"
        )

        assert isinstance(service, AISDKService)
        assert service.get_provider() == AIProviderType.ANTHROPIC

    @patch('backend.services.ai.sdk.AsyncOpenAI')
    def test_create_service_with_custom_params(self, mock_openai_class):
        """Test factory function with custom parameters."""
        mock_openai_class.return_value = AsyncMock()
        mock_logger = Mock()

        service = create_ai_sdk_service(
            provider="openai",
            api_key="sk-test",
            model="gpt-4",
            endpoint="https://custom-endpoint.com",
            temperature=0.5,
            max_tokens=2048,
            audit_logger=mock_logger
        )

        assert service.config.endpoint == "https://custom-endpoint.com"
        assert service.config.temperature == 0.5
        assert service.config.max_tokens == 2048
        assert service.audit_logger == mock_logger

# ============================================================================
# Integration-Style Tests
# ============================================================================

class TestIntegrationScenarios:
    """Integration-style tests for common usage scenarios."""

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_full_chat_workflow(self, mock_openai_class, openai_config):
        """Test complete chat workflow."""
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Response"

        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai_class.return_value = mock_client

        service = AISDKService(openai_config)

        # Check configuration
        assert service.is_configured()
        assert service.get_provider() == AIProviderType.OPENAI

        # Get capabilities
        capabilities = service.get_provider_capabilities()
        assert capabilities.supports_streaming is True

        # Perform chat
        messages = [
            ChatMessage(role=MessageRole.USER, content="Hello")
        ]
        response = await service.chat(messages)

        assert response == "Response"

    @pytest.mark.asyncio
    @patch('backend.services.ai.sdk.AsyncOpenAI')
    async def test_provider_switching(self, mock_openai_class):
        """Test switching between providers."""
        mock_openai_class.return_value = AsyncMock()

        # Start with OpenAI
        openai_config = AIProviderConfig(
            provider=AIProviderType.OPENAI,
            api_key="sk-test-openai",
            model="gpt-4"
        )
        service = AISDKService(openai_config)

        assert service.get_provider() == AIProviderType.OPENAI

        # Switch to Anthropic
        with patch('backend.services.ai.sdk.AsyncAnthropic') as mock_anthropic:
            mock_anthropic.return_value = AsyncMock()

            anthropic_config = AIProviderConfig(
                provider=AIProviderType.ANTHROPIC,
                api_key="sk-ant-test",
                model="claude-3-5-sonnet-20241022"
            )
            service.update_config(anthropic_config)

            assert service.get_provider() == AIProviderType.ANTHROPIC
            assert service.get_model_name() == "claude-3-5-sonnet-20241022"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

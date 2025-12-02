"""
Test suite for Python AI client service.

Tests AI provider integration, chat completion, and model switching.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from backend.services.ai.python_ai_client import PythonAIClient, AIProviderConfig, ChatMessage


class TestPythonAIClient:
    """Test PythonAIClient functionality."""

    @pytest.fixture
    def ai_client(self):
        """Create a PythonAIClient instance for testing."""
        return PythonAIClient()

    @pytest.fixture
    def sample_config(self):
        """Sample AI provider configuration."""
        return AIProviderConfig(
            provider="openai",
            api_key="sk-test123",
            model="gpt-4",
            temperature=0.7,
            max_tokens=2048,
            endpoint=None
        )

    @pytest.fixture
    def sample_messages(self):
        """Sample chat messages."""
        return [
            ChatMessage(role="system", content="You are a helpful assistant."),
            ChatMessage(role="user", content="Hello, how are you?")
        ]

    def test_initialization(self, ai_client):
        """Test PythonAIClient initializes correctly."""
        assert ai_client is not None
        assert hasattr(ai_client, 'chat_completion')
        assert hasattr(ai_client, 'list_models')
        assert hasattr(ai_client, 'validate_config')

    def test_config_validation(self, ai_client, sample_config):
        """Test configuration validation."""
        # Valid config
        is_valid, error = ai_client.validate_config(sample_config)
        assert is_valid is True
        assert error is None

        # Invalid config - empty API key raises Pydantic validation error
        # (api_key field has min_length=1 constraint)
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AIProviderConfig(
                provider="openai",
                api_key="",
                model="gpt-4"
            )

    @pytest.mark.asyncio
    async def test_chat_completion_success(self, ai_client, sample_config, sample_messages):
        """Test successful chat completion."""
        # Mock successful response
        mock_response = {
            "choices": [
                {
                    "message": {
                        "content": "Hello! I'm doing well, thank you for asking."
                    }
                }
            ]
        }

        with patch.object(ai_client, '_make_api_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            response = await ai_client.chat_completion(sample_messages, sample_config)

            assert response is not None
            assert "Hello! I'm doing well" in response
            mock_request.assert_called_once()

    @pytest.mark.asyncio
    async def test_chat_completion_error_handling(self, ai_client, sample_config, sample_messages):
        """Test error handling in chat completion."""
        with patch.object(ai_client, '_make_api_request', new_callable=AsyncMock) as mock_request:
            mock_request.side_effect = Exception("API Error")

            with pytest.raises(Exception):
                await ai_client.chat_completion(sample_messages, sample_config)

    def test_provider_detection(self, ai_client):
        """Test AI provider detection."""
        # OpenAI
        config_openai = AIProviderConfig(provider="openai", api_key="sk-123", model="gpt-4")
        assert ai_client._get_provider_client(config_openai) is not None

        # Anthropic
        config_anthropic = AIProviderConfig(provider="anthropic", api_key="sk-ant-123", model="claude-3")
        assert ai_client._get_provider_client(config_anthropic) is not None

        # Unknown provider
        config_unknown = AIProviderConfig(provider="unknown", api_key="key", model="model")
        assert ai_client._get_provider_client(config_unknown) is None

    @pytest.mark.asyncio
    async def test_streaming_chat_completion(self, ai_client, sample_config, sample_messages):
        """Test streaming chat completion."""
        # Mock streaming response
        async def mock_stream():
            chunks = ["Hello", "!", " How", " are", " you", "?"]
            for chunk in chunks:
                yield chunk

        with patch.object(ai_client, '_make_streaming_request', new_callable=AsyncMock) as mock_stream:
            mock_stream.return_value = mock_stream()

            chunks = []
            async for chunk in ai_client.chat_completion_stream(sample_messages, sample_config):
                chunks.append(chunk)

            assert len(chunks) > 0
            assert "".join(chunks) == "Hello! How are you?"

    def test_model_listing(self, ai_client, sample_config):
        """Test model listing functionality."""
        with patch.object(ai_client, '_fetch_available_models') as mock_fetch:
            mock_fetch.return_value = ["gpt-4", "gpt-3.5-turbo", "claude-3"]

            models = ai_client.list_models(sample_config)

            assert isinstance(models, list)
            assert "gpt-4" in models

    def test_token_counting(self, ai_client, sample_messages):
        """Test token counting functionality."""
        total_tokens = ai_client.count_tokens(sample_messages)

        assert isinstance(total_tokens, int)
        assert total_tokens > 0

        # Test with different message types
        long_message = ChatMessage(role="user", content="This is a very long message " * 100)
        long_tokens = ai_client.count_tokens([long_message])

        assert long_tokens > total_tokens

    def test_rate_limiting(self, ai_client, sample_config):
        """Test rate limiting functionality."""
        # Make multiple requests quickly
        for i in range(10):
            ai_client._check_rate_limit(sample_config)

        # Should eventually trigger rate limiting
        with pytest.raises(Exception):  # Rate limit exceeded
            ai_client._check_rate_limit(sample_config)

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, ai_client, sample_config, sample_messages):
        """Test concurrent request handling."""
        # Mock successful responses
        mock_response = {
            "choices": [{"message": {"content": "Response"}}]
        }

        with patch.object(ai_client, '_make_api_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            # Make multiple concurrent requests
            tasks = [
                ai_client.chat_completion(sample_messages, sample_config)
                for _ in range(5)
            ]

            results = await asyncio.gather(*tasks)

            assert len(results) == 5
            assert all("Response" in result for result in results)
            assert mock_request.call_count == 5

    def test_config_serialization(self, sample_config):
        """Test configuration serialization."""
        # Serialize
        config_dict = sample_config.to_dict()
        assert config_dict["provider"] == "openai"
        assert config_dict["model"] == "gpt-4"
        assert "api_key" not in config_dict  # Should not serialize API key

        # Deserialize
        new_config = AIProviderConfig.from_dict(config_dict, api_key="sk-test123")
        assert new_config.provider == sample_config.provider
        assert new_config.model == sample_config.model


class TestChatMessage:
    """Test ChatMessage functionality."""

    def test_message_creation(self):
        """Test chat message creation."""
        message = ChatMessage(
            role="user",
            content="Hello, world!"
        )

        assert message.role == "user"
        assert message.content == "Hello, world!"

    def test_message_validation(self):
        """Test message validation."""
        # Valid message
        valid_message = ChatMessage(role="user", content="Valid content")
        assert valid_message.is_valid() is True

        # Invalid message - empty content
        invalid_message = ChatMessage(role="user", content="")
        assert invalid_message.is_valid() is False

        # Invalid message - invalid role
        invalid_role_message = ChatMessage(role="invalid_role", content="Content")
        assert invalid_role_message.is_valid() is False

    def test_message_roles(self):
        """Test different message roles."""
        system_msg = ChatMessage(role="system", content="You are helpful")
        user_msg = ChatMessage(role="user", content="Hello")
        assistant_msg = ChatMessage(role="assistant", content="Hi there!")

        assert system_msg.role == "system"
        assert user_msg.role == "user"
        assert assistant_msg.role == "assistant"

        assert all(msg.is_valid() for msg in [system_msg, user_msg, assistant_msg])


class TestAIProviderConfig:
    """Test AIProviderConfig functionality."""

    def test_config_creation(self):
        """Test configuration creation."""
        config = AIProviderConfig(
            provider="openai",
            api_key="sk-123456",
            model="gpt-4",
            temperature=0.7,
            max_tokens=2048
        )

        assert config.provider == "openai"
        assert config.api_key == "sk-123456"
        assert config.model == "gpt-4"
        assert config.temperature == 0.7

    def test_config_defaults(self):
        """Test configuration defaults."""
        config = AIProviderConfig(
            provider="anthropic",
            api_key="sk-ant-123",
            model="claude-3"
        )

        # Should have defaults
        assert config.temperature == 0.7  # Default
        assert config.max_tokens == 2048  # Default
        assert config.endpoint is None  # Default

    def test_config_validation(self):
        """Test configuration validation."""
        # Valid config
        valid_config = AIProviderConfig(
            provider="openai",
            api_key="sk-valid123",
            model="gpt-4"
        )
        assert valid_config.is_valid() is True

        # Invalid config - missing provider
        invalid_config = AIProviderConfig(
            provider="",
            api_key="sk-123",
            model="gpt-4"
        )
        assert invalid_config.is_valid() is False


class TestErrorHandling:
    """Test error handling in PythonAIClient."""

    def test_network_error_handling(self, ai_client, sample_config, sample_messages):
        """Test network error handling."""
        with patch.object(ai_client, '_make_api_request', side_effect=ConnectionError("Network failed")):
            with pytest.raises(ConnectionError):
                asyncio.run(ai_client.chat_completion(sample_messages, sample_config))

    def test_api_error_handling(self, ai_client, sample_config, sample_messages):
        """Test API error handling."""
        # Mock API error response
        mock_response = {
            "error": {
                "message": "Invalid API key",
                "type": "authentication_error"
            }
        }

        with patch.object(ai_client, '_make_api_request', return_value=mock_response):
            with pytest.raises(Exception):
                asyncio.run(ai_client.chat_completion(sample_messages, sample_config))

    def test_invalid_response_handling(self, ai_client, sample_config, sample_messages):
        """Test invalid response handling."""
        # Mock malformed response
        mock_response = {"invalid": "response"}

        with patch.object(ai_client, '_make_api_request', return_value=mock_response):
            with pytest.raises(KeyError):  # Missing 'choices' key
                asyncio.run(ai_client.chat_completion(sample_messages, sample_config))

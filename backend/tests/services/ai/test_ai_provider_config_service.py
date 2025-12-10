"""
Test suite for AIProviderConfigService
Demonstrates complete functionality with comprehensive test cases.
"""

import os

import pytest
from dotenv import load_dotenv

load_dotenv()
import base64
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.ai_provider_config import AIProviderConfig
from backend.models.base import Base
from backend.models.user import User
from backend.services.ai.providers import (
    AIProviderConfigInput,
    AIProviderConfigService,
    AIProviderType,
)
from backend.services.security.encryption import EncryptionService

# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture
def db_engine():
    """Create in-memory SQLite database for testing."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db_engine):
    """Create database session for testing."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def encryption_key():
    """Generate test encryption key."""
    return base64.b64encode(os.urandom(32)).decode("utf-8")


@pytest.fixture
def encryption_service(encryption_key):
    """Create encryption service for testing."""
    return EncryptionService(encryption_key)


@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="test_hash",
        password_salt="test_salt",
        role="user",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def ai_provider_config_service(db_session, encryption_service):
    """Create AI provider config service for testing."""
    return AIProviderConfigService(
        db=db_session, encryption_service=encryption_service, audit_logger=None
    )


class TestAIProviderConfigService:
    """Test suite for AI provider configuration service."""

    @pytest.mark.asyncio
    async def test_set_provider_config_creates_new(
        self, ai_provider_config_service, test_user
    ):
        """Test creating a new provider configuration."""
        config_input = AIProviderConfigInput(
            provider=AIProviderType.OPENAI,
            api_key="sk-test-key-123",
            model="gpt-4-turbo",
            temperature=0.7,
            max_tokens=4000,
        )

        result = await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config_input
        )

        assert result is not None
        assert result.provider == "openai"
        assert result.model == "gpt-4-turbo"
        assert result.temperature == 0.7
        assert result.max_tokens == 4000
        assert result.is_active is True  # First provider becomes active

    @pytest.mark.asyncio
    async def test_set_provider_config_updates_existing(
        self, ai_provider_config_service, test_user
    ):
        """Test updating an existing provider configuration."""
        # Create initial config
        config_input1 = AIProviderConfigInput(
            provider=AIProviderType.OPENAI,
            api_key="sk-test-key-123",
            model="gpt-3.5-turbo",
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config_input1
        )

        # Update config
        config_input2 = AIProviderConfigInput(
            provider=AIProviderType.OPENAI,
            api_key="sk-new-key-456",
            model="gpt-4-turbo",
            temperature=0.8,
        )
        result = await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config_input2
        )

        assert result.model == "gpt-4-turbo"
        assert result.temperature == 0.8

    @pytest.mark.asyncio
    async def test_get_provider_config_with_decryption(
        self, ai_provider_config_service, test_user
    ):
        """Test getting provider config with decrypted API key."""
        api_key = "sk-test-secret-key"

        # Create config
        config_input = AIProviderConfigInput(
            provider=AIProviderType.ANTHROPIC,
            api_key=api_key,
            model="claude-3-5-sonnet-20241022",
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config_input
        )

        # Get config
        result = await ai_provider_config_service.get_provider_config(
            user_id=test_user.id, provider=AIProviderType.ANTHROPIC
        )

        assert result is not None
        assert result.api_key == api_key  # Decrypted
        assert result.provider == "anthropic"
        assert result.model == "claude-3-5-sonnet-20241022"

    @pytest.mark.asyncio
    async def test_get_provider_config_returns_none_if_not_found(
        self, ai_provider_config_service, test_user
    ):
        """Test getting non-existent provider config returns None."""
        result = await ai_provider_config_service.get_provider_config(
            user_id=test_user.id, provider=AIProviderType.OPENAI
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_get_active_provider_config(
        self, ai_provider_config_service, test_user
    ):
        """Test getting active provider configuration."""
        # Create two providers
        config1 = AIProviderConfigInput(
            provider=AIProviderType.OPENAI, api_key="sk-openai-key", model="gpt-4-turbo"
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config1
        )

        config2 = AIProviderConfigInput(
            provider=AIProviderType.ANTHROPIC,
            api_key="sk-anthropic-key",
            model="claude-3-5-sonnet-20241022",
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config2
        )

        # First provider should be active
        active_config = await ai_provider_config_service.get_active_provider_config(
            user_id=test_user.id
        )

        assert active_config is not None
        assert active_config.provider == "openai"
        assert active_config.is_active is True

    @pytest.mark.asyncio
    async def test_set_active_provider(self, ai_provider_config_service, test_user):
        """Test setting active provider."""
        # Create two providers
        config1 = AIProviderConfigInput(
            provider=AIProviderType.OPENAI, api_key="sk-openai-key", model="gpt-4-turbo"
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config1
        )

        config2 = AIProviderConfigInput(
            provider=AIProviderType.ANTHROPIC,
            api_key="sk-anthropic-key",
            model="claude-3-5-sonnet-20241022",
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config2
        )

        # Set Anthropic as active
        result = await ai_provider_config_service.set_active_provider(
            user_id=test_user.id, provider=AIProviderType.ANTHROPIC
        )

        assert result.is_active is True
        assert result.provider == "anthropic"

        # Verify it's now active
        active_config = await ai_provider_config_service.get_active_provider_config(
            user_id=test_user.id
        )
        assert active_config.provider == "anthropic"

    def test_get_active_provider_type(
        self, ai_provider_config_service, test_user, db_session
    ):
        """Test getting active provider type."""
        # Create provider
        config = AIProviderConfig(
            user_id=test_user.id,
            provider="openai",
            encrypted_api_key='{"algorithm":"aes-256-gcm","ciphertext":"test","iv":"test","authTag":"test","version":1}',
            model="gpt-4-turbo",
            is_active=True,
        )
        db_session.add(config)
        db_session.commit()

        # Get active provider type
        active_provider = ai_provider_config_service.get_active_provider(
            user_id=test_user.id
        )

        assert active_provider == AIProviderType.OPENAI

    def test_is_provider_configured(
        self, ai_provider_config_service, test_user, db_session
    ):
        """Test checking if provider is configured."""
        # Initially not configured
        assert (
            ai_provider_config_service.is_provider_configured(
                user_id=test_user.id, provider=AIProviderType.OPENAI
            )
            is False
        )

        # Create provider
        config = AIProviderConfig(
            user_id=test_user.id,
            provider="openai",
            encrypted_api_key='{"algorithm":"aes-256-gcm","ciphertext":"test","iv":"test","authTag":"test","version":1}',
            model="gpt-4-turbo",
            is_active=True,
        )
        db_session.add(config)
        db_session.commit()

        # Now configured
        assert (
            ai_provider_config_service.is_provider_configured(
                user_id=test_user.id, provider=AIProviderType.OPENAI
            )
            is True
        )

    def test_get_configured_providers(
        self, ai_provider_config_service, test_user, db_session
    ):
        """Test getting list of configured providers."""
        # Create multiple providers
        configs = [
            AIProviderConfig(
                user_id=test_user.id,
                provider="openai",
                encrypted_api_key='{"algorithm":"aes-256-gcm","ciphertext":"test","iv":"test","authTag":"test","version":1}',
                model="gpt-4-turbo",
                is_active=True,
            ),
            AIProviderConfig(
                user_id=test_user.id,
                provider="anthropic",
                encrypted_api_key='{"algorithm":"aes-256-gcm","ciphertext":"test","iv":"test","authTag":"test","version":1}',
                model="claude-3-5-sonnet-20241022",
                is_active=False,
            ),
        ]
        for config in configs:
            db_session.add(config)
        db_session.commit()

        # Get configured providers
        providers = ai_provider_config_service.get_configured_providers(
            user_id=test_user.id
        )

        assert len(providers) == 2
        assert AIProviderType.OPENAI in providers
        assert AIProviderType.ANTHROPIC in providers

    def test_list_provider_configs(
        self, ai_provider_config_service, test_user, db_session
    ):
        """Test listing all provider configurations."""
        # Create multiple providers
        configs = [
            AIProviderConfig(
                user_id=test_user.id,
                provider="openai",
                encrypted_api_key='{"algorithm":"aes-256-gcm","ciphertext":"test","iv":"test","authTag":"test","version":1}',
                model="gpt-4-turbo",
                temperature=0.7,
                is_active=True,
            ),
            AIProviderConfig(
                user_id=test_user.id,
                provider="anthropic",
                encrypted_api_key='{"algorithm":"aes-256-gcm","ciphertext":"test","iv":"test","authTag":"test","version":1}',
                model="claude-3-5-sonnet-20241022",
                temperature=0.5,
                is_active=False,
            ),
        ]
        for config in configs:
            db_session.add(config)
        db_session.commit()

        # List configs
        result = ai_provider_config_service.list_provider_configs(user_id=test_user.id)

        assert len(result) == 2
        # Active provider should be first
        assert result[0].provider == "openai"
        assert result[0].is_active is True
        assert result[1].provider == "anthropic"
        assert result[1].is_active is False

    @pytest.mark.asyncio
    async def test_remove_provider_config(self, ai_provider_config_service, test_user):
        """Test removing provider configuration."""
        # Create provider
        config_input = AIProviderConfigInput(
            provider=AIProviderType.OPENAI, api_key="sk-test-key", model="gpt-4-turbo"
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config_input
        )

        # Verify it exists
        assert (
            ai_provider_config_service.is_provider_configured(
                user_id=test_user.id, provider=AIProviderType.OPENAI
            )
            is True
        )

        # Remove it
        await ai_provider_config_service.remove_provider_config(
            user_id=test_user.id, provider=AIProviderType.OPENAI
        )

        # Verify it's gone
        assert (
            ai_provider_config_service.is_provider_configured(
                user_id=test_user.id, provider=AIProviderType.OPENAI
            )
            is False
        )

    @pytest.mark.asyncio
    async def test_remove_active_provider_activates_another(
        self, ai_provider_config_service, test_user
    ):
        """Test removing active provider activates another one."""
        # Create two providers
        config1 = AIProviderConfigInput(
            provider=AIProviderType.OPENAI, api_key="sk-openai-key", model="gpt-4-turbo"
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config1
        )

        config2 = AIProviderConfigInput(
            provider=AIProviderType.ANTHROPIC,
            api_key="sk-anthropic-key",
            model="claude-3-5-sonnet-20241022",
        )
        await ai_provider_config_service.set_provider_config(
            user_id=test_user.id, config=config2
        )

        # OpenAI is active (first one)
        active = ai_provider_config_service.get_active_provider(test_user.id)
        assert active == AIProviderType.OPENAI

        # Remove OpenAI
        await ai_provider_config_service.remove_provider_config(
            user_id=test_user.id, provider=AIProviderType.OPENAI
        )

        # Anthropic should now be active
        active = ai_provider_config_service.get_active_provider(test_user.id)
        assert active == AIProviderType.ANTHROPIC

    def test_get_provider_metadata(self, ai_provider_config_service):
        """Test getting provider metadata."""
        metadata = ai_provider_config_service.get_provider_metadata(
            AIProviderType.OPENAI
        )

        assert metadata.name == "OpenAI"
        assert metadata.default_endpoint == "https://api.openai.com/v1"
        assert metadata.supports_streaming is True
        assert metadata.default_model == "gpt-4-turbo"
        assert metadata.max_context_tokens == 128000
        assert "gpt-4o" in metadata.available_models

    def test_list_all_providers_metadata(self, ai_provider_config_service):
        """Test listing all providers metadata."""
        all_metadata = ai_provider_config_service.list_all_providers_metadata()

        assert len(all_metadata) == 10  # 10 providers
        assert "openai" in all_metadata
        assert "anthropic" in all_metadata
        assert "huggingface" in all_metadata
        assert all_metadata["openai"]["name"] == "OpenAI"

    def test_validate_config_success(self, ai_provider_config_service):
        """Test configuration validation with valid config."""
        config = AIProviderConfigInput(
            provider=AIProviderType.OPENAI,
            api_key="sk-test-key",
            model="gpt-4-turbo",
            temperature=0.7,
            max_tokens=4000,
            top_p=0.9,
        )

        result = ai_provider_config_service.validate_config(config)

        assert result.valid is True
        assert len(result.errors) == 0

    def test_validate_config_invalid_temperature(self, ai_provider_config_service):
        """Test configuration validation with invalid temperature."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            AIProviderConfigInput(
                provider=AIProviderType.OPENAI,
                api_key="sk-test-key",
                model="gpt-4-turbo",
                temperature=3.0,  # Invalid: > 2
            )

    def test_validate_config_invalid_max_tokens(self, ai_provider_config_service):
        """Test configuration validation with invalid max_tokens."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            AIProviderConfigInput(
                provider=AIProviderType.OPENAI,
                api_key="sk-test-key",
                model="gpt-4-turbo",
                max_tokens=200000,  # Invalid: > 100000
            )

    def test_validate_config_invalid_top_p(self, ai_provider_config_service):
        """Test configuration validation with invalid top_p."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            AIProviderConfigInput(
                provider=AIProviderType.OPENAI,
                api_key="sk-test-key",
                model="gpt-4-turbo",
                top_p=1.5,  # Invalid: > 1
            )

    @pytest.mark.asyncio
    async def test_test_provider_not_configured(
        self, ai_provider_config_service, test_user
    ):
        """Test provider connection test when provider not configured."""
        result = await ai_provider_config_service.test_provider(
            user_id=test_user.id, provider=AIProviderType.OPENAI
        )

        assert result.success is False
        assert result.error == "Provider not configured"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])

"""
Example usage of AIProviderConfigService
Demonstrates real-world usage patterns for managing AI provider configurations.
"""

import asyncio
import base64
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.user import User
from backend.services.ai_provider_config_service import (
    AIProviderConfigService,
    AIProviderType,
    AIProviderConfigInput,
)
from backend.services.encryption_service import EncryptionService


async def main():
    """Demonstrate AI provider configuration service usage."""

    # Setup database (in-memory for demo)
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Setup encryption service
    encryption_key = base64.b64encode(os.urandom(32)).decode("utf-8")
    encryption_service = EncryptionService(encryption_key)

    # Create test user
    user = User(
        username="demo_user",
        email="demo@example.com",
        password_hash="hash",
        password_salt="salt",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create service
    service = AIProviderConfigService(
        db=db, encryption_service=encryption_service, audit_logger=None
    )

    print("=" * 80)
    print("AI Provider Configuration Service - Usage Examples")
    print("=" * 80)

    # Example 1: List all supported providers
    print("\n1. List All Supported Providers")
    print("-" * 80)
    all_providers = service.list_all_providers_metadata()
    for provider_key, metadata in all_providers.items():
        print(f"  {provider_key}: {metadata['name']}")
        print(f"    Default Model: {metadata['default_model']}")
        print(f"    Max Tokens: {metadata['max_context_tokens']:,}")
        print(f"    Streaming: {metadata['supports_streaming']}")
        print()

    # Example 2: Configure OpenAI provider
    print("\n2. Configure OpenAI Provider")
    print("-" * 80)
    openai_config = AIProviderConfigInput(
        provider=AIProviderType.OPENAI,
        api_key="sk-demo-openai-key-12345",
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4000,
    )

    result = await service.set_provider_config(user_id=user.id, config=openai_config)
    print(f"✓ OpenAI configured:")
    print(f"  Model: {result.model}")
    print(f"  Temperature: {result.temperature}")
    print(f"  Max Tokens: {result.max_tokens}")
    print(f"  Active: {result.is_active}")

    # Example 3: Configure Anthropic provider
    print("\n3. Configure Anthropic Provider")
    print("-" * 80)
    anthropic_config = AIProviderConfigInput(
        provider=AIProviderType.ANTHROPIC,
        api_key="sk-ant-demo-key-67890",
        model="claude-3-5-sonnet-20241022",
        temperature=0.5,
        max_tokens=8000,
    )

    result = await service.set_provider_config(user_id=user.id, config=anthropic_config)
    print(f"✓ Anthropic configured:")
    print(f"  Model: {result.model}")
    print(f"  Temperature: {result.temperature}")
    print(f"  Max Tokens: {result.max_tokens}")
    print(f"  Active: {result.is_active}")

    # Example 4: List all configured providers
    print("\n4. List All Configured Providers")
    print("-" * 80)
    configured = service.list_provider_configs(user_id=user.id)
    for config in configured:
        print(f"  {config.provider}:")
        print(f"    Model: {config.model}")
        print(f"    Active: {'✓' if config.is_active else '✗'}")
        print(f"    Created: {config.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

    # Example 5: Get active provider configuration (with decrypted API key)
    print("\n5. Get Active Provider Configuration")
    print("-" * 80)
    active_config = await service.get_active_provider_config(user_id=user.id)
    if active_config:
        print(f"  Provider: {active_config.provider}")
        print(f"  Model: {active_config.model}")
        print(f"  API Key: {active_config.api_key[:10]}... (decrypted)")
        print(f"  Temperature: {active_config.temperature}")
    else:
        print("  No active provider")

    # Example 6: Switch active provider
    print("\n6. Switch Active Provider to Anthropic")
    print("-" * 80)
    await service.set_active_provider(user_id=user.id, provider=AIProviderType.ANTHROPIC)
    active_provider = service.get_active_provider(user_id=user.id)
    print(f"✓ Active provider changed to: {active_provider.value}")

    # Example 7: Get specific provider configuration
    print("\n7. Get Specific Provider Configuration")
    print("-" * 80)
    anthropic_config = await service.get_provider_config(
        user_id=user.id, provider=AIProviderType.ANTHROPIC
    )
    if anthropic_config:
        print(f"  Provider: {anthropic_config.provider}")
        print(f"  Model: {anthropic_config.model}")
        print(f"  API Key: {anthropic_config.api_key[:15]}... (decrypted)")
        print(f"  Endpoint: {anthropic_config.endpoint or 'Default'}")
        print(f"  Temperature: {anthropic_config.temperature}")
        print(f"  Max Tokens: {anthropic_config.max_tokens}")

    # Example 8: Check if provider is configured
    print("\n8. Check Provider Configuration Status")
    print("-" * 80)
    providers_to_check = [
        AIProviderType.OPENAI,
        AIProviderType.ANTHROPIC,
        AIProviderType.GOOGLE,
        AIProviderType.HUGGINGFACE,
    ]
    for provider in providers_to_check:
        is_configured = service.is_provider_configured(user_id=user.id, provider=provider)
        status = "✓ Configured" if is_configured else "✗ Not configured"
        print(f"  {provider.value}: {status}")

    # Example 9: Update existing provider configuration
    print("\n9. Update OpenAI Configuration")
    print("-" * 80)
    updated_openai_config = AIProviderConfigInput(
        provider=AIProviderType.OPENAI,
        api_key="sk-new-openai-key-updated",
        model="gpt-4o",  # Updated model
        temperature=0.9,  # Updated temperature
        max_tokens=8000,  # Updated max tokens
    )
    result = await service.set_provider_config(user_id=user.id, config=updated_openai_config)
    print(f"✓ OpenAI configuration updated:")
    print(f"  Model: {result.model}")
    print(f"  Temperature: {result.temperature}")
    print(f"  Max Tokens: {result.max_tokens}")

    # Example 10: Validate configuration
    print("\n10. Validate Provider Configuration")
    print("-" * 80)

    # Valid configuration
    valid_config = AIProviderConfigInput(
        provider=AIProviderType.GOOGLE,
        api_key="valid-key",
        model="gemini-2.0-flash-exp",
        temperature=0.7,
        max_tokens=4000,
    )
    validation = service.validate_config(valid_config)
    print(f"  Valid config: {validation.valid}")

    # Invalid configuration (temperature out of range)
    invalid_config = AIProviderConfigInput(
        provider=AIProviderType.GOOGLE,
        api_key="valid-key",
        model="gemini-2.0-flash-exp",
        temperature=3.0,  # Invalid!
        max_tokens=200000,  # Invalid!
    )
    validation = service.validate_config(invalid_config)
    print(f"  Invalid config: {validation.valid}")
    if not validation.valid:
        print(f"  Errors:")
        for error in validation.errors:
            print(f"    - {error}")

    # Example 11: Get provider metadata
    print("\n11. Get Provider Metadata")
    print("-" * 80)
    metadata = service.get_provider_metadata(AIProviderType.ANTHROPIC)
    print(f"  Name: {metadata.name}")
    print(f"  Default Endpoint: {metadata.default_endpoint}")
    print(f"  Default Model: {metadata.default_model}")
    print(f"  Max Context Tokens: {metadata.max_context_tokens:,}")
    print(f"  Supports Streaming: {metadata.supports_streaming}")
    print(f"  Available Models ({len(metadata.available_models)}):")
    for model in metadata.available_models[:5]:  # Show first 5
        print(f"    - {model}")
    if len(metadata.available_models) > 5:
        print(f"    ... and {len(metadata.available_models) - 5} more")

    # Example 12: Test provider connection
    print("\n12. Test Provider Connection")
    print("-" * 80)
    test_result = await service.test_provider(user_id=user.id, provider=AIProviderType.ANTHROPIC)
    print(f"  Test Result: {'✓ Success' if test_result.success else '✗ Failed'}")
    if test_result.error:
        print(f"  Error: {test_result.error}")

    # Example 13: Remove provider configuration
    print("\n13. Remove OpenAI Configuration")
    print("-" * 80)
    await service.remove_provider_config(user_id=user.id, provider=AIProviderType.OPENAI)
    print(f"✓ OpenAI configuration removed")

    # Verify removal
    is_configured = service.is_provider_configured(user_id=user.id, provider=AIProviderType.OPENAI)
    print(f"  OpenAI configured: {'Yes' if is_configured else 'No'}")

    # Check if another provider became active
    active_provider = service.get_active_provider(user_id=user.id)
    if active_provider:
        print(f"  New active provider: {active_provider.value}")

    # Example 14: Configure multiple providers
    print("\n14. Configure Multiple Providers")
    print("-" * 80)

    providers_config = [
        AIProviderConfigInput(
            provider=AIProviderType.GOOGLE, api_key="google-key-123", model="gemini-2.0-flash-exp"
        ),
        AIProviderConfigInput(
            provider=AIProviderType.HUGGINGFACE,
            api_key="hf-key-456",
            model="meta-llama/Meta-Llama-3.1-70B-Instruct",
        ),
        AIProviderConfigInput(
            provider=AIProviderType.MISTRAL, api_key="mistral-key-789", model="mistral-large-latest"
        ),
    ]

    for config in providers_config:
        result = await service.set_provider_config(user_id=user.id, config=config)
        print(f"✓ {config.provider.value} configured with model {result.model}")

    # List all configured
    configured = service.get_configured_providers(user_id=user.id)
    print(f"\nTotal configured providers: {len(configured)}")
    for provider in configured:
        print(f"  - {provider.value}")

    # Example 15: Final summary
    print("\n15. Final Configuration Summary")
    print("-" * 80)
    all_configs = service.list_provider_configs(user_id=user.id)
    print(f"Total Providers: {len(all_configs)}")
    print()
    for config in all_configs:
        active_marker = "★" if config.is_active else " "
        print(f"  [{active_marker}] {config.provider}")
        print(f"      Model: {config.model}")
        print(f"      Temperature: {config.temperature or 'default'}")
        print(f"      Max Tokens: {config.max_tokens or 'default'}")
        print()

    print("=" * 80)
    print("✓ All examples completed successfully!")
    print("=" * 80)

    # Cleanup
    db.close()


if __name__ == "__main__":
    asyncio.run(main())

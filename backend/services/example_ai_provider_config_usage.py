"""Example usage scenarios for AIProviderConfigService."""

from __future__ import annotations

import asyncio
import base64
import os
from typing import Any, Dict, cast

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.user import User
from backend.services.ai_provider_config_service import (
    AIProviderConfigInput, AIProviderConfigService, AIProviderType)
from backend.services.encryption_service import EncryptionService


def _get_example_secret(provider: str) -> str:
    """Fetch provider-specific API keys from the environment."""

    sanitized = provider.lower().replace(" ", "_")
    env_candidates = [
        f"EXAMPLE_{provider.upper()}_API_KEY",
        f"{provider.upper()}_API_KEY",
    ]
    for env_var in env_candidates:
        env_value = os.getenv(env_var)
        if env_value:
            return env_value
    joined = ", ".join(env_candidates)
    raise RuntimeError(
        f"Set one of {joined} before running the {sanitized} provider example."
    )


def _metadata_to_dict(metadata: Any) -> Dict[str, Any]:
    """Normalize metadata objects to dictionaries for safe printing."""

    if isinstance(metadata, dict):
        return metadata
    if hasattr(metadata, "model_dump"):
        return metadata.model_dump()  # type: ignore[call-arg]
    return {
        "name": getattr(metadata, "name", "unknown"),
        "default_model": getattr(metadata, "default_model", "n/a"),
        "max_context_tokens": getattr(metadata, "max_context_tokens", 0),
        "supports_streaming": getattr(metadata, "supports_streaming", False),
    }


async def main() -> None:
    """Demonstrate AI provider configuration workflows."""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    encryption_key = base64.b64encode(os.urandom(32)).decode("utf-8")
    encryption_service = EncryptionService(encryption_key)

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

    user_id_attr = user.id
    if user_id_attr is None:
        raise RuntimeError("Demo user did not receive an ID")
    user_id = cast(int, user_id_attr)

    service = AIProviderConfigService(
        db=db,
        encryption_service=encryption_service,
        audit_logger=None,
    )

    print("=" * 80)
    print("AI Provider Configuration Service - Usage Examples")
    print("=" * 80)

    print("\n1. List All Supported Providers")
    print("-" * 80)
    all_providers = service.list_all_providers_metadata()
    for provider_key, metadata in all_providers.items():
        info = _metadata_to_dict(metadata)
        print(f"  {provider_key}: {info['name']}")
        print(f"    Default Model: {info['default_model']}")
        print(f"    Max Tokens: {info['max_context_tokens']:,}")
        print(f"    Streaming: {info['supports_streaming']}")
        print()

    print("\n2. Configure OpenAI Provider")
    print("-" * 80)
    openai_config = AIProviderConfigInput(
        provider=AIProviderType.OPENAI,
        api_key=_get_example_secret("openai"),
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4000,
        top_p=0.9,
    )
    result = await service.set_provider_config(user_id=user_id, config=openai_config)
    print("✓ OpenAI configured:")
    print(f"  Model: {result.model}")
    print(f"  Temperature: {result.temperature}")
    print(f"  Max Tokens: {result.max_tokens}")
    print(f"  Active: {result.is_active}")

    print("\n3. Configure Anthropic Provider")
    print("-" * 80)
    anthropic_config = AIProviderConfigInput(
        provider=AIProviderType.ANTHROPIC,
        api_key=_get_example_secret("anthropic"),
        model="claude-3-5-sonnet-20241022",
        temperature=0.5,
        max_tokens=8000,
        top_p=0.8,
    )
    result = await service.set_provider_config(user_id=user_id, config=anthropic_config)
    print("✓ Anthropic configured:")
    print(f"  Model: {result.model}")
    print(f"  Temperature: {result.temperature}")
    print(f"  Max Tokens: {result.max_tokens}")
    print(f"  Active: {result.is_active}")

    print("\n4. List All Configured Providers")
    print("-" * 80)
    configured = service.list_provider_configs(user_id=user_id)
    for config in configured:
        print(f"  {config.provider}:")
        print(f"    Model: {config.model}")
        print(f"    Active: {'✓' if config.is_active else '✗'}")
        created = config.created_at.strftime("%Y-%m-%d %H:%M:%S")
        print(f"    Created: {created}")

    print("\n5. Get Active Provider Configuration")
    print("-" * 80)
    active_config = await service.get_active_provider_config(user_id=user_id)
    if active_config:
        print(f"  Provider: {active_config.provider}")
        print(f"  Model: {active_config.model}")
        print(f"  API Key: {active_config.api_key[:10]}... (decrypted)")
        print(f"  Temperature: {active_config.temperature}")
    else:
        print("  No active provider")

    print("\n6. Switch Active Provider to Anthropic")
    print("-" * 80)
    await service.set_active_provider(user_id=user_id, provider=AIProviderType.ANTHROPIC)
    active_provider = service.get_active_provider(user_id=user_id)
    if active_provider:
        print(f"✓ Active provider changed to: {active_provider.value}")

    print("\n7. Get Specific Provider Configuration")
    print("-" * 80)
    anthropic_stored = await service.get_provider_config(
        user_id=user_id,
        provider=AIProviderType.ANTHROPIC,
    )
    if anthropic_stored:
        print(f"  Provider: {anthropic_stored.provider}")
        print(f"  Model: {anthropic_stored.model}")
        print(f"  API Key: {anthropic_stored.api_key[:15]}... (decrypted)")
        endpoint = anthropic_stored.endpoint or "Default"
        print(f"  Endpoint: {endpoint}")
        print(f"  Temperature: {anthropic_stored.temperature}")
        print(f"  Max Tokens: {anthropic_stored.max_tokens}")

    print("\n8. Check Provider Configuration Status")
    print("-" * 80)
    for provider in [
        AIProviderType.OPENAI,
        AIProviderType.ANTHROPIC,
        AIProviderType.GOOGLE,
        AIProviderType.HUGGINGFACE,
    ]:
        is_configured = service.is_provider_configured(
            user_id=user_id,
            provider=provider,
        )
        status = "✓ Configured" if is_configured else "✗ Not configured"
        print(f"  {provider.value}: {status}")

    print("\n9. Update OpenAI Configuration")
    print("-" * 80)
    updated_openai_config = AIProviderConfigInput(
        provider=AIProviderType.OPENAI,
        api_key=_get_example_secret("openai"),
        model="gpt-4o",
        temperature=0.9,
        max_tokens=8000,
        top_p=0.85,
    )
    result = await service.set_provider_config(
        user_id=user_id,
        config=updated_openai_config,
    )
    print("✓ OpenAI configuration updated:")
    print(f"  Model: {result.model}")
    print(f"  Temperature: {result.temperature}")
    print(f"  Max Tokens: {result.max_tokens}")

    print("\n10. Validate Provider Configuration")
    print("-" * 80)
    google_key = _get_example_secret("google")
    valid_config = AIProviderConfigInput(
        provider=AIProviderType.GOOGLE,
        api_key=google_key,
        model="gemini-2.0-flash-exp",
        temperature=0.7,
        max_tokens=4000,
        top_p=0.9,
    )
    validation = service.validate_config(valid_config)
    print(f"  Valid config: {validation.valid}")

    invalid_config = AIProviderConfigInput(
        provider=AIProviderType.GOOGLE,
        api_key=google_key,
        model="gemini-2.0-flash-exp",
        temperature=3.0,
        max_tokens=200000,
        top_p=1.2,
    )
    validation = service.validate_config(invalid_config)
    print(f"  Invalid config: {validation.valid}")
    if not validation.valid:
        print("  Errors:")
        for error in validation.errors:
            print(f"    - {error}")

    print("\n11. Get Provider Metadata")
    print("-" * 80)
    metadata = service.get_provider_metadata(AIProviderType.ANTHROPIC)
    print(f"  Name: {metadata.name}")
    print(f"  Default Endpoint: {metadata.default_endpoint}")
    print(f"  Default Model: {metadata.default_model}")
    print(f"  Max Context Tokens: {metadata.max_context_tokens:,}")
    print(f"  Supports Streaming: {metadata.supports_streaming}")
    print(f"  Available Models ({len(metadata.available_models)}):")
    for model_name in metadata.available_models[:5]:
        print(f"    - {model_name}")
    remaining = len(metadata.available_models) - 5
    if remaining > 0:
        print(f"    ... and {remaining} more")

    print("\n12. Test Provider Connection")
    print("-" * 80)
    test_result = await service.test_provider(
        user_id=user_id,
        provider=AIProviderType.ANTHROPIC,
    )
    outcome = "✓ Success" if test_result.success else "✗ Failed"
    print(f"  Test Result: {outcome}")
    if test_result.error:
        print(f"  Error: {test_result.error}")

    print("\n13. Remove OpenAI Configuration")
    print("-" * 80)
    await service.remove_provider_config(
        user_id=user_id,
        provider=AIProviderType.OPENAI,
    )
    print("✓ OpenAI configuration removed")
    is_configured = service.is_provider_configured(
        user_id=user_id,
        provider=AIProviderType.OPENAI,
    )
    print(f"  OpenAI configured: {'Yes' if is_configured else 'No'}")

    new_active = service.get_active_provider(user_id=user_id)
    if new_active:
        print(f"  New active provider: {new_active.value}")

    print("\n14. Configure Multiple Providers")
    print("-" * 80)
    providers_config = [
        AIProviderConfigInput(
            provider=AIProviderType.GOOGLE,
            api_key=_get_example_secret("google"),
            model="gemini-2.0-flash-exp",
            temperature=0.5,
            max_tokens=4000,
            top_p=0.9,
        ),
        AIProviderConfigInput(
            provider=AIProviderType.HUGGINGFACE,
            api_key=_get_example_secret("huggingface"),
            model="meta-llama/Meta-Llama-3.1-70B-Instruct",
            temperature=0.2,
            max_tokens=2000,
            top_p=0.8,
        ),
        AIProviderConfigInput(
            provider=AIProviderType.MISTRAL,
            api_key=_get_example_secret("mistral"),
            model="mistral-large-latest",
            temperature=0.3,
            max_tokens=4000,
            top_p=0.85,
        ),
    ]
    for config in providers_config:
        result = await service.set_provider_config(user_id=user_id, config=config)
        print(f"✓ {config.provider.value} configured with model {result.model}")

    configured = service.get_configured_providers(user_id=user_id)
    print(f"\nTotal configured providers: {len(configured)}")
    for provider in configured:
        print(f"  - {provider.value}")

    print("\n15. Final Configuration Summary")
    print("-" * 80)
    all_configs = service.list_provider_configs(user_id=user_id)
    print(f"Total Providers: {len(all_configs)}")
    print()
    for config in all_configs:
        active_marker = "★" if config.is_active else " "
        print(f"  [{active_marker}] {config.provider}")
        print(f"      Model: {config.model}")
        temperature = config.temperature or "default"
        print(f"      Temperature: {temperature}")
        max_tokens = config.max_tokens or "default"
        print(f"      Max Tokens: {max_tokens}")
        print()

    print("=" * 80)
    print("✓ All examples completed successfully!")
    print("=" * 80)
    db.close()


if __name__ == "__main__":
    asyncio.run(main())

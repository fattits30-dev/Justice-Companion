"""Provider client factory used by the unified AI service."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException

from backend.services.ai.models import AIProviderConfig

from .metadata import AI_PROVIDER_METADATA


def _resolve_api_key(config: AIProviderConfig) -> str:
    """Return a provider API key, inserting defaults for keyless providers."""

    if config.provider == "ollama" and not config.api_key:
        return "ollama-local"
    if not config.api_key:
        raise HTTPException(
            status_code=400,
            detail=f"API key required for {config.provider}",
        )
    return config.api_key


def create_provider_client(
    config: AIProviderConfig,
    audit_logger: Optional[Any] = None,
) -> Any:
    """Instantiate an SDK client for the configured provider."""

    metadata = AI_PROVIDER_METADATA.get(config.provider)
    if not metadata:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {config.provider}",
        )

    api_key = _resolve_api_key(config)
    base_url = config.endpoint or metadata.default_endpoint

    try:
        if config.provider == "anthropic":
            try:
                import anthropic

                return anthropic.AsyncAnthropic(api_key=api_key, base_url=base_url)
            except ImportError as exc:
                raise HTTPException(
                    status_code=500,
                    detail="Anthropic SDK not installed. Run: pip install anthropic",
                ) from exc

        if config.provider in {
            "openai",
            "together",
            "anyscale",
            "mistral",
            "perplexity",
            "google",
            "cohere",
            "emberton",
            "ollama",
        }:
            try:
                import openai

                return openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
            except ImportError as exc:
                raise HTTPException(
                    status_code=500,
                    detail="OpenAI SDK not installed. Run: pip install openai",
                ) from exc

        if config.provider in {"huggingface", "qwen"}:
            try:
                from huggingface_hub import InferenceClient

                if config.endpoint:
                    return InferenceClient(base_url=config.endpoint, api_key=api_key)
                return InferenceClient(api_key=api_key)
            except ImportError as exc:
                raise HTTPException(
                    status_code=500,
                    detail="Hugging Face SDK not installed. Run: pip install huggingface-hub",
                ) from exc

        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {config.provider}",
        )

    except Exception as exc:  # pragma: no cover - defensive logging
        if audit_logger:
            audit_logger.log(
                event_type="ai.init",
                user_id=None,
                resource_type="ai_service",
                resource_id=str(config.provider),
                action="initialize",
                success=False,
                error_message=f"AI client initialization failed for {config.provider}: {exc}",
            )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize {config.provider} client: {exc}",
        ) from exc


__all__ = ["create_provider_client", "AI_PROVIDER_METADATA"]

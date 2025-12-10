"""Provider metadata describing supported AI vendors."""

from __future__ import annotations

from typing import Dict

from backend.services.ai.models import AIProviderMetadata

AI_PROVIDER_METADATA: Dict[str, AIProviderMetadata] = {
    "huggingface": AIProviderMetadata(
        name="Hugging Face",
        default_endpoint="https://router.huggingface.co/v1",
        supports_streaming=True,
        default_model="meta-llama/Llama-3.3-70B-Instruct",
        max_context_tokens=128000,
        available_models=[
            "meta-llama/Llama-3.3-70B-Instruct",
            "meta-llama/Meta-Llama-3.1-70B-Instruct",
            "meta-llama/Meta-Llama-3.1-8B-Instruct",
            "Qwen/Qwen2.5-72B-Instruct",
            "Qwen/Qwen2.5-Coder-32B-Instruct",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "microsoft/Phi-3.5-mini-instruct",
            "google/gemma-2-27b-it",
        ],
    ),
    "openai": AIProviderMetadata(
        name="OpenAI",
        default_endpoint="https://api.openai.com/v1",
        supports_streaming=True,
        default_model="gpt-4-turbo",
        max_context_tokens=128000,
        available_models=["gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"],
    ),
    "anthropic": AIProviderMetadata(
        name="Anthropic",
        default_endpoint="https://api.anthropic.com/v1",
        supports_streaming=True,
        default_model="claude-3-5-sonnet-20241022",
        max_context_tokens=200000,
        available_models=["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
    ),
    "qwen": AIProviderMetadata(
        name="Qwen",
        default_endpoint="https://api-inference.huggingface.co/models/Qwen",
        supports_streaming=True,
        default_model="Qwen/Qwen2.5-72B-Instruct",
        max_context_tokens=32768,
        available_models=["Qwen/Qwen2.5-72B-Instruct"],
    ),
    "google": AIProviderMetadata(
        name="Google",
        default_endpoint="https://generativelanguage.googleapis.com/v1beta/openai",
        supports_streaming=True,
        default_model="gemini-1.5-pro",
        max_context_tokens=1000000,
        available_models=["gemini-1.5-pro", "gemini-1.5-flash"],
    ),
    "cohere": AIProviderMetadata(
        name="Cohere",
        default_endpoint="https://api.cohere.com/v1",
        supports_streaming=True,
        default_model="command-r-plus",
        max_context_tokens=128000,
        available_models=["command-r-plus", "command-r"],
    ),
    "together": AIProviderMetadata(
        name="Together AI",
        default_endpoint="https://api.together.xyz/v1",
        supports_streaming=True,
        default_model="meta-llama/Llama-3-70b-chat-hf",
        max_context_tokens=8192,
        available_models=["meta-llama/Llama-3-70b-chat-hf"],
    ),
    "anyscale": AIProviderMetadata(
        name="Anyscale",
        default_endpoint="https://api.endpoints.anyscale.com/v1",
        supports_streaming=True,
        default_model="meta-llama/Llama-3-70b-chat-hf",
        max_context_tokens=8192,
        available_models=["meta-llama/Llama-3-70b-chat-hf"],
    ),
    "mistral": AIProviderMetadata(
        name="Mistral AI",
        default_endpoint="https://api.mistral.ai/v1",
        supports_streaming=True,
        default_model="mistral-large-latest",
        max_context_tokens=32768,
        available_models=["mistral-large-latest", "mistral-small-latest"],
    ),
    "perplexity": AIProviderMetadata(
        name="Perplexity",
        default_endpoint="https://api.perplexity.ai",
        supports_streaming=True,
        default_model="llama-3-sonar-large-32k-online",
        max_context_tokens=32768,
        available_models=["llama-3-sonar-large-32k-online"],
    ),
    "emberton": AIProviderMetadata(
        name="Emberton AI",
        default_endpoint="https://api.emberton.ai/v1",
        supports_streaming=True,
        default_model="emberton-legal-1.0",
        max_context_tokens=128000,
        available_models=[
            "emberton-legal-1.0",
            "emberton-legal-pro",
            "emberton-case-analysis",
        ],
    ),
    "ollama": AIProviderMetadata(
        name="Ollama (Local)",
        default_endpoint="http://localhost:11434/v1",
        supports_streaming=True,
        default_model="llama3",
        max_context_tokens=8192,
        available_models=["llama3", "mistral", "gemma", "qwen2", "phi3"],
    ),
}

__all__ = ["AI_PROVIDER_METADATA"]

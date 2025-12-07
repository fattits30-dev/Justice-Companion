"""
Timeout configuration for AI service operations.

Provides configurable timeouts for different AI operations and providers,
preventing indefinite hangs and ensuring system responsiveness.

Features:
- Per-operation timeout defaults
- Per-provider timeout overrides
- Graceful timeout handling with custom exceptions
- Integration with async operations
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class TimeoutConfig:
    """
    Timeout configuration for AI operations.

    All timeout values are in seconds.
    """
    # Streaming chat timeouts (per-token, so longer)
    stream_chat_timeout: float = 300.0  # 5 minutes for streaming

    # Non-streaming chat timeouts
    chat_timeout: float = 120.0  # 2 minutes for complete response

    # Document operations (can be slower due to large text)
    document_extraction_timeout: float = 180.0  # 3 minutes
    document_parsing_timeout: float = 120.0  # 2 minutes

    # Analysis operations
    case_analysis_timeout: float = 180.0  # 3 minutes
    evidence_analysis_timeout: float = 120.0  # 2 minutes

    # Document drafting
    document_draft_timeout: float = 150.0  # 2.5 minutes

    # OCR operations (can be slow for multi-page docs)
    ocr_timeout: float = 300.0  # 5 minutes

    # Default timeout for unlisted operations
    default_timeout: float = 120.0  # 2 minutes

    def get_timeout(self, operation: str) -> float:
        """
        Get timeout for specific operation.

        Args:
            operation: Operation name (e.g., 'stream_chat', 'chat', 'document_extraction')

        Returns:
            Timeout in seconds
        """
        timeout_map = {
            'stream_chat': self.stream_chat_timeout,
            'chat': self.chat_timeout,
            'document_extraction': self.document_extraction_timeout,
            'document_parsing': self.document_parsing_timeout,
            'case_analysis': self.case_analysis_timeout,
            'evidence_analysis': self.evidence_analysis_timeout,
            'document_draft': self.document_draft_timeout,
            'ocr': self.ocr_timeout,
        }
        return timeout_map.get(operation, self.default_timeout)


# Provider-specific timeout overrides (some providers are slower/faster)
PROVIDER_TIMEOUT_MULTIPLIERS: Dict[str, float] = {
    # Anthropic Claude - reliable, standard timeouts
    "anthropic": 1.0,

    # OpenAI - fast, can use shorter timeouts
    "openai": 0.8,

    # HuggingFace - can be slower, especially for large models
    "huggingface": 1.5,
    "qwen": 1.5,

    # Google Gemini - fast, can use shorter timeouts
    "google": 0.8,

    # Cohere - standard
    "cohere": 1.0,

    # Together AI - fast
    "together": 0.9,

    # Anyscale - standard
    "anyscale": 1.0,

    # Mistral - fast
    "mistral": 0.9,

    # Perplexity - slower due to online search
    "perplexity": 1.5,
}


def get_timeout_for_operation(
    operation: str,
    provider: str,
    config: Optional[TimeoutConfig] = None,
    custom_timeout: Optional[float] = None,
) -> float:
    """
    Get timeout for specific operation and provider.

    Priority:
    1. Custom timeout (if provided)
    2. Provider-specific multiplier applied to operation default
    3. Operation default
    4. Global default

    Args:
        operation: Operation name
        provider: Provider name (e.g., 'openai', 'anthropic')
        config: Optional custom timeout config
        custom_timeout: Optional custom timeout override

    Returns:
        Timeout in seconds

    Example:
        >>> get_timeout_for_operation('chat', 'huggingface')
        180.0  # 120.0 * 1.5 multiplier for HuggingFace

        >>> get_timeout_for_operation('stream_chat', 'openai')
        240.0  # 300.0 * 0.8 multiplier for OpenAI
    """
    # Use custom timeout if provided
    if custom_timeout is not None:
        logger.debug(f"Using custom timeout: {custom_timeout}s for {operation}")
        return custom_timeout

    # Get base timeout from config
    timeout_config = config or TimeoutConfig()
    base_timeout = timeout_config.get_timeout(operation)

    # Apply provider multiplier
    multiplier = PROVIDER_TIMEOUT_MULTIPLIERS.get(provider, 1.0)
    final_timeout = base_timeout * multiplier

    logger.debug(
        f"Timeout for {operation} with {provider}: {final_timeout}s "
        f"(base: {base_timeout}s, multiplier: {multiplier}x)"
    )

    return final_timeout


class AITimeoutError(Exception):
    """
    Exception raised when AI operation times out.

    Includes context about the operation and provider for debugging.
    """
    def __init__(
        self,
        operation: str,
        provider: str,
        timeout: float,
        message: Optional[str] = None,
    ):
        self.operation = operation
        self.provider = provider
        self.timeout = timeout

        default_message = (
            f"AI operation '{operation}' with provider '{provider}' "
            f"timed out after {timeout}s"
        )
        super().__init__(message or default_message)


# Default timeout configuration instance
DEFAULT_TIMEOUT_CONFIG = TimeoutConfig()

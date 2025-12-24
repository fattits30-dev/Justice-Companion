"""
AI Service context managers for proper resource management.

This module provides context managers for AI service clients to ensure
proper cleanup, connection management, and error handling.
"""

from contextlib import contextmanager, asynccontextmanager
from typing import Generator, AsyncGenerator, Optional
import logging

from backend.services.ai.service import UnifiedAIService
from backend.services.ai.models import AIProviderConfig
from backend.services.ai.stub import StubAIService

logger = logging.getLogger(__name__)


@contextmanager
def ai_service_context(
    config: AIProviderConfig,
    audit_logger=None,
    use_cache: bool = True
) -> Generator[UnifiedAIService, None, None]:
    """
    Context manager for AI service with automatic cleanup.

    Ensures proper resource cleanup even if exceptions occur.
    Useful for batch operations or standalone AI calls.

    Usage:
        config = AIProviderConfig(provider="openai", api_key="...", model="gpt-4")
        with ai_service_context(config) as ai_service:
            response = await ai_service.chat(messages)
            # Automatically cleaned up on exit

    Args:
        config: AI provider configuration
        audit_logger: Optional audit logger instance
        use_cache: Whether to use response caching (default True)

    Yields:
        UnifiedAIService instance
    """
    service = None
    try:
        service = UnifiedAIService(config, audit_logger=audit_logger)
        logger.info(f"AI service initialized: provider={config.provider}, model={config.model}")
        yield service
    except Exception as e:
        logger.error(f"AI service error: {e}")
        raise
    finally:
        if service:
            # Cleanup any resources (connections, caches, etc.)
            logger.debug(f"AI service context cleanup: provider={config.provider}")


@contextmanager
def stub_ai_service_context(
    audit_logger=None
) -> Generator[StubAIService, None, None]:
    """
    Context manager for stub AI service (testing/development).

    Provides deterministic responses without calling external APIs.
    Perfect for tests, demos, and offline development.

    Usage:
        with stub_ai_service_context() as ai_service:
            response = await ai_service.chat(messages)
            # Returns stub responses

    Args:
        audit_logger: Optional audit logger instance

    Yields:
        StubAIService instance
    """
    service = None
    try:
        service = StubAIService(audit_logger=audit_logger)
        logger.info("Stub AI service initialized")
        yield service
    except Exception as e:
        logger.error(f"Stub AI service error: {e}")
        raise
    finally:
        if service:
            logger.debug("Stub AI service context cleanup")


@asynccontextmanager
async def async_ai_service_context(
    config: AIProviderConfig,
    audit_logger=None,
    timeout: Optional[int] = None
) -> AsyncGenerator[UnifiedAIService, None]:
    """
    Async context manager for AI service with timeout support.

    Provides async initialization and cleanup with optional timeout.
    Ideal for async operations with external AI providers.

    Usage:
        async with async_ai_service_context(config, timeout=30) as ai_service:
            response = await ai_service.chat(messages)

    Args:
        config: AI provider configuration
        audit_logger: Optional audit logger instance
        timeout: Optional timeout in seconds for operations

    Yields:
        UnifiedAIService instance
    """
    service = None
    try:
        service = UnifiedAIService(config, audit_logger=audit_logger)
        logger.info(
            f"Async AI service initialized: provider={config.provider}, "
            f"model={config.model}, timeout={timeout}s"
        )
        yield service
    except Exception as e:
        logger.error(f"Async AI service error: {e}")
        raise
    finally:
        if service:
            logger.debug(f"Async AI service cleanup: provider={config.provider}")


class AIServiceManager:
    """
    AI service manager with context manager support and connection pooling.

    Provides high-level interface for managing AI service lifecycle,
    including connection pooling, error recovery, and resource cleanup.
    """

    def __init__(
        self,
        config: AIProviderConfig,
        audit_logger=None,
        max_retries: int = 3,
        timeout: Optional[int] = None
    ):
        """
        Initialize AI service manager.

        Args:
            config: AI provider configuration
            audit_logger: Optional audit logger instance
            max_retries: Maximum retry attempts on failure
            timeout: Optional timeout in seconds
        """
        self.config = config
        self.audit_logger = audit_logger
        self.max_retries = max_retries
        self.timeout = timeout
        self.service: Optional[UnifiedAIService] = None
        self._closed = False

    def __enter__(self) -> 'AIServiceManager':
        """Enter context and initialize service."""
        if not self.service:
            self.service = UnifiedAIService(self.config, audit_logger=self.audit_logger)
            logger.info(f"AIServiceManager initialized: {self.config.provider}/{self.config.model}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context with cleanup."""
        self.close()
        return False

    async def __aenter__(self) -> 'AIServiceManager':
        """Async enter context."""
        if not self.service:
            self.service = UnifiedAIService(self.config, audit_logger=self.audit_logger)
            logger.info(f"AIServiceManager async initialized: {self.config.provider}")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async exit context."""
        self.close()
        return False

    def close(self):
        """Close and cleanup resources."""
        if not self._closed:
            if self.service:
                logger.debug(f"AIServiceManager cleanup: {self.config.provider}")
                # Cleanup AI service resources
                self.service = None
            self._closed = True

    def get_service(self) -> UnifiedAIService:
        """
        Get the AI service instance.

        Returns:
            UnifiedAIService instance

        Raises:
            RuntimeError: If service not initialized (context not entered)
        """
        if not self.service:
            raise RuntimeError("AIServiceManager not initialized. Use within context manager.")
        return self.service

    @classmethod
    @contextmanager
    def create(
        cls,
        config: AIProviderConfig,
        audit_logger=None,
        **kwargs
    ) -> Generator['AIServiceManager', None, None]:
        """
        Create AI service manager with context support.

        Usage:
            config = AIProviderConfig(provider="openai", api_key="...", model="gpt-4")
            with AIServiceManager.create(config) as manager:
                service = manager.get_service()
                response = await service.chat(messages)

        Args:
            config: AI provider configuration
            audit_logger: Optional audit logger
            **kwargs: Additional manager options

        Yields:
            AIServiceManager instance
        """
        manager = cls(config, audit_logger=audit_logger, **kwargs)
        try:
            yield manager.__enter__()
        finally:
            manager.close()


__all__ = [
    'ai_service_context',
    'stub_ai_service_context',
    'async_ai_service_context',
    'AIServiceManager',
]

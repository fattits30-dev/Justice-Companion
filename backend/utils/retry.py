"""
Retry utility with exponential backoff for AI service calls.

Handles transient failures with configurable retry strategies.
"""

import asyncio
import logging
from typing import TypeVar, Callable, Optional, Type, Tuple
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
    ):
        """
        Initialize retry configuration.

        Args:
            max_retries: Maximum number of retry attempts (default: 3)
            base_delay: Initial delay in seconds (default: 1.0)
            max_delay: Maximum delay in seconds (default: 60.0)
            exponential_base: Base for exponential backoff (default: 2.0)
            jitter: Add random jitter to prevent thundering herd (default: True)
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for given attempt with exponential backoff.

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Delay in seconds
        """
        # Exponential backoff: base_delay * (exponential_base ^ attempt)
        delay = min(
            self.base_delay * (self.exponential_base ** attempt),
            self.max_delay
        )

        # Add jitter (randomize between 50% and 100% of calculated delay)
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random() * 0.5)

        return delay


# Default retry configs for different scenarios
DEFAULT_RETRY_CONFIG = RetryConfig(
    max_retries=3,
    base_delay=1.0,
    max_delay=60.0,
)

AGGRESSIVE_RETRY_CONFIG = RetryConfig(
    max_retries=5,
    base_delay=0.5,
    max_delay=30.0,
)

CONSERVATIVE_RETRY_CONFIG = RetryConfig(
    max_retries=2,
    base_delay=2.0,
    max_delay=120.0,
)


def retry_async(
    config: Optional[RetryConfig] = None,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
):
    """
    Decorator for async functions with retry logic and exponential backoff.

    Args:
        config: Retry configuration (default: DEFAULT_RETRY_CONFIG)
        retryable_exceptions: Tuple of exception types to retry (default: all)

    Usage:
        @retry_async(config=AGGRESSIVE_RETRY_CONFIG)
        async def call_ai_api():
            response = await client.chat(...)
            return response

        @retry_async(retryable_exceptions=(ConnectionError, TimeoutError))
        async def flaky_network_call():
            return await make_request()
    """
    if config is None:
        config = DEFAULT_RETRY_CONFIG

    if retryable_exceptions is None:
        retryable_exceptions = (Exception,)

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(config.max_retries + 1):
                try:
                    return await func(*args, **kwargs)

                except retryable_exceptions as e:
                    last_exception = e

                    # Don't retry on last attempt
                    if attempt >= config.max_retries:
                        logger.error(
                            f"{func.__name__} failed after {config.max_retries} retries: {e}"
                        )
                        raise

                    # Calculate delay and sleep
                    delay = config.calculate_delay(attempt)
                    logger.warning(
                        f"{func.__name__} failed (attempt {attempt + 1}/{config.max_retries + 1}): {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    await asyncio.sleep(delay)

            # Should never reach here, but just in case
            if last_exception:
                raise last_exception

            raise RuntimeError(f"{func.__name__} failed with no exception")

        return wrapper

    return decorator


def retry_sync(
    config: Optional[RetryConfig] = None,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
):
    """
    Decorator for synchronous functions with retry logic and exponential backoff.

    Args:
        config: Retry configuration (default: DEFAULT_RETRY_CONFIG)
        retryable_exceptions: Tuple of exception types to retry (default: all)

    Usage:
        @retry_sync(config=CONSERVATIVE_RETRY_CONFIG)
        def read_file():
            return open('file.txt').read()
    """
    if config is None:
        config = DEFAULT_RETRY_CONFIG

    if retryable_exceptions is None:
        retryable_exceptions = (Exception,)

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            import time
            last_exception = None

            for attempt in range(config.max_retries + 1):
                try:
                    return func(*args, **kwargs)

                except retryable_exceptions as e:
                    last_exception = e

                    # Don't retry on last attempt
                    if attempt >= config.max_retries:
                        logger.error(
                            f"{func.__name__} failed after {config.max_retries} retries: {e}"
                        )
                        raise

                    # Calculate delay and sleep
                    delay = config.calculate_delay(attempt)
                    logger.warning(
                        f"{func.__name__} failed (attempt {attempt + 1}/{config.max_retries + 1}): {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)

            # Should never reach here, but just in case
            if last_exception:
                raise last_exception

            raise RuntimeError(f"{func.__name__} failed with no exception")

        return wrapper

    return decorator

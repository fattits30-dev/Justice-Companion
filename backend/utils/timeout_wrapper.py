"""
Timeout wrapper for async operations.

Provides a decorator and context manager for applying timeouts to async operations,
with graceful error handling and logging.

Works with the timeout_config module to provide operation-specific timeouts.
"""

import asyncio
import logging
from typing import TypeVar, Callable, Optional, Any
from functools import wraps

from backend.utils.timeout_config import AITimeoutError

logger = logging.getLogger(__name__)

T = TypeVar('T')


def with_timeout(
    operation_name: str,
    timeout: Optional[float] = None,
    on_timeout: Optional[Callable[[str, float], None]] = None,
):
    """
    Decorator to apply timeout to async function.

    Args:
        operation_name: Name of operation for logging and errors
        timeout: Timeout in seconds (if None, must be passed at runtime)
        on_timeout: Optional callback when timeout occurs

    Usage:
        @with_timeout(operation_name="chat", timeout=120.0)
        async def chat(messages):
            response = await client.chat(...)
            return response

        # Or with runtime timeout:
        @with_timeout(operation_name="dynamic_operation")
        async def operation(data, _timeout=60.0):
            # Use _timeout parameter
            ...

    Raises:
        AITimeoutError: When operation exceeds timeout
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Allow runtime timeout override via _timeout parameter
            runtime_timeout = kwargs.pop('_timeout', timeout)

            if runtime_timeout is None:
                # No timeout - run without limit
                logger.debug(f"{operation_name}: Running without timeout")
                return await func(*args, **kwargs)

            logger.debug(
                f"{operation_name}: Running with {runtime_timeout}s timeout"
            )

            try:
                # Run with timeout using asyncio.wait_for
                result = await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=runtime_timeout
                )
                return result

            except asyncio.TimeoutError:
                error_msg = (
                    f"Operation '{operation_name}' exceeded timeout of {runtime_timeout}s"
                )
                logger.error(error_msg)

                # Call optional callback
                if on_timeout:
                    on_timeout(operation_name, runtime_timeout)

                # Raise custom timeout error
                raise AITimeoutError(
                    operation=operation_name,
                    provider="unknown",  # Provider context added by caller
                    timeout=runtime_timeout,
                    message=error_msg
                )

        return wrapper

    return decorator


async def run_with_timeout(
    coro: Any,
    timeout: float,
    operation_name: str = "async_operation",
    provider: str = "unknown",
) -> Any:
    """
    Run async operation with timeout (non-decorator version).

    Args:
        coro: Coroutine to execute
        timeout: Timeout in seconds
        operation_name: Name for logging and errors
        provider: Provider name for error context

    Returns:
        Result of coroutine

    Raises:
        AITimeoutError: When operation exceeds timeout

    Usage:
        result = await run_with_timeout(
            client.chat(messages),
            timeout=120.0,
            operation_name="chat",
            provider="openai"
        )
    """
    logger.debug(
        f"{operation_name} ({provider}): Running with {timeout}s timeout"
    )

    try:
        result = await asyncio.wait_for(coro, timeout=timeout)
        logger.debug(f"{operation_name} ({provider}): Completed successfully")
        return result

    except asyncio.TimeoutError:
        error_msg = (
            f"Operation '{operation_name}' with provider '{provider}' "
            f"exceeded timeout of {timeout}s"
        )
        logger.error(error_msg)

        raise AITimeoutError(
            operation=operation_name,
            provider=provider,
            timeout=timeout,
            message=error_msg
        )


class TimeoutContext:
    """
    Context manager for timeout operations.

    Usage:
        async with TimeoutContext(120.0, "chat", "openai"):
            response = await client.chat(messages)
            # Automatically times out after 120 seconds
    """

    def __init__(
        self,
        timeout: float,
        operation_name: str = "operation",
        provider: str = "unknown",
    ):
        self.timeout = timeout
        self.operation_name = operation_name
        self.provider = provider
        self._task: Optional[asyncio.Task] = None

    async def __aenter__(self):
        logger.debug(
            f"{self.operation_name} ({self.provider}): "
            f"Starting with {self.timeout}s timeout"
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is asyncio.TimeoutError:
            error_msg = (
                f"Operation '{self.operation_name}' with provider '{self.provider}' "
                f"exceeded timeout of {self.timeout}s"
            )
            logger.error(error_msg)

            # Convert asyncio.TimeoutError to AITimeoutError
            raise AITimeoutError(
                operation=self.operation_name,
                provider=self.provider,
                timeout=self.timeout,
                message=error_msg
            ) from exc_val

        return False  # Don't suppress other exceptions


# Helper for common timeout pattern with logging
async def safe_run_with_timeout(
    coro: Any,
    timeout: float,
    operation_name: str,
    provider: str,
    fallback: Optional[Any] = None,
    log_error: bool = True,
) -> Any:
    """
    Run async operation with timeout and optional fallback.

    Args:
        coro: Coroutine to execute
        timeout: Timeout in seconds
        operation_name: Name for logging
        provider: Provider name
        fallback: Optional fallback value if timeout occurs
        log_error: Whether to log errors (default: True)

    Returns:
        Result of coroutine or fallback value

    Usage:
        # With fallback - doesn't raise on timeout
        result = await safe_run_with_timeout(
            client.chat(messages),
            timeout=120.0,
            operation_name="chat",
            provider="openai",
            fallback="Unable to complete chat due to timeout"
        )

        # Without fallback - raises AITimeoutError
        result = await safe_run_with_timeout(
            client.chat(messages),
            timeout=120.0,
            operation_name="chat",
            provider="openai"
        )
    """
    try:
        return await run_with_timeout(coro, timeout, operation_name, provider)

    except AITimeoutError as e:
        if log_error:
            logger.error(f"Timeout in {operation_name}: {e}")

        if fallback is not None:
            logger.warning(f"Returning fallback value for {operation_name}")
            return fallback

        raise

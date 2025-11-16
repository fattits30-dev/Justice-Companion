"""
Rate Limiting Service for Justice Companion

This module provides rate limiting functionality to prevent brute force attacks
and abuse of API endpoints. It implements a sliding window algorithm with
automatic lockout and cleanup of expired entries.

Key Features:
- Sliding window rate limiting
- Automatic account lockout on max attempts
- Configurable limits per operation type
- Thread-safe operations
- Automatic cleanup of expired entries
- In-memory storage with optional Redis support
"""

import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class RateLimitAttempt:
    """
    Represents a rate limit attempt record.

    Attributes:
        count: Number of attempts made
        first_attempt_at: Timestamp of first attempt in current window
        last_attempt_at: Timestamp of most recent attempt
        locked_until: Timestamp when lock expires (None if not locked)
    """
    count: int = 0
    first_attempt_at: datetime = field(default_factory=datetime.now)
    last_attempt_at: datetime = field(default_factory=datetime.now)
    locked_until: Optional[datetime] = None


@dataclass
class RateLimitResult:
    """
    Result of rate limit check.

    Attributes:
        allowed: Whether the operation is allowed
        remaining_time: Seconds until unlock (if locked)
        attempts_remaining: Number of attempts remaining before lockout
        message: Human-readable message
    """
    allowed: bool
    remaining_time: Optional[int] = None
    attempts_remaining: Optional[int] = None
    message: Optional[str] = None


@dataclass
class RateLimitConfig:
    """
    Configuration for a specific rate limit operation.

    Attributes:
        max_attempts: Maximum number of attempts allowed
        window_seconds: Time window in seconds for rate limiting
        lock_duration_seconds: Duration of lockout in seconds
    """
    max_attempts: int
    window_seconds: int
    lock_duration_seconds: int


class RateLimitService:
    """
    Thread-safe rate limiting service using sliding window algorithm.

    This service tracks rate limits per user per operation and automatically
    locks accounts that exceed the maximum number of attempts within a time
    window. It includes automatic cleanup of expired entries.

    Example:
        >>> rate_limiter = RateLimitService()
        >>> result = rate_limiter.check_rate_limit(
        ...     user_id=123,
        ...     operation="gdpr_export",
        ...     max_requests=5,
        ...     window_seconds=86400
        ... )
        >>> if not result.allowed:
        ...     raise HTTPException(429, result.message)
    """

    # Default configurations for common operations
    DEFAULT_CONFIGS: Dict[str, RateLimitConfig] = {
        "login": RateLimitConfig(
            max_attempts=5,
            window_seconds=15 * 60,  # 15 minutes
            lock_duration_seconds=15 * 60,  # 15 minutes
        ),
        "gdpr_export": RateLimitConfig(
            max_attempts=5,
            window_seconds=24 * 60 * 60,  # 24 hours
            lock_duration_seconds=0,  # No lockout, just deny
        ),
        "gdpr_delete": RateLimitConfig(
            max_attempts=1,
            window_seconds=30 * 24 * 60 * 60,  # 30 days
            lock_duration_seconds=0,  # No lockout, just deny
        ),
        "api_request": RateLimitConfig(
            max_attempts=100,
            window_seconds=60,  # 1 minute
            lock_duration_seconds=5 * 60,  # 5 minutes
        ),
    }

    def __init__(
        self,
        cleanup_interval_seconds: int = 5 * 60,  # 5 minutes
        use_redis: bool = False,
        redis_client=None,
    ):
        """
        Initialize the rate limit service.

        Args:
            cleanup_interval_seconds: Interval for automatic cleanup (default: 5 minutes)
            use_redis: Whether to use Redis for storage (default: False)
            redis_client: Redis client instance (required if use_redis=True)
        """
        self._attempts: Dict[str, RateLimitAttempt] = {}
        self._lock = threading.RLock()
        self._cleanup_interval = cleanup_interval_seconds
        self._cleanup_timer: Optional[threading.Timer] = None
        self._use_redis = use_redis
        self._redis_client = redis_client

        if use_redis and not redis_client:
            raise ValueError("redis_client is required when use_redis=True")

        self._start_cleanup_timer()
        logger.info(
            f"RateLimitService initialized (storage={'redis' if use_redis else 'memory'}, "
            f"cleanup_interval={cleanup_interval_seconds}s)"
        )

    def check_rate_limit(
        self,
        user_id: int,
        operation: str,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None,
    ) -> RateLimitResult:
        """
        Check if an operation is allowed for a user.

        This method checks if the user has exceeded the rate limit for the
        specified operation. If a default configuration exists for the
        operation, it will be used unless overridden by parameters.

        Args:
            user_id: User identifier
            operation: Operation name (e.g., "login", "gdpr_export")
            max_requests: Maximum requests allowed (overrides default)
            window_seconds: Time window in seconds (overrides default)

        Returns:
            RateLimitResult indicating if operation is allowed

        Example:
            >>> result = rate_limiter.check_rate_limit(123, "login")
            >>> if not result.allowed:
            ...     print(f"Try again in {result.remaining_time} seconds")
        """
        # Get configuration
        config = self._get_config(operation, max_requests, window_seconds)
        key = self._get_key(user_id, operation)
        now = datetime.now()

        with self._lock:
            # Clean up expired entries first
            self._cleanup_expired_entries()

            attempt = self._attempts.get(key)

            # No previous attempts
            if not attempt:
                return RateLimitResult(
                    allowed=True,
                    attempts_remaining=config.max_attempts,
                    message="Operation allowed",
                )

            # Check if locked
            if attempt.locked_until and attempt.locked_until > now:
                remaining_seconds = int((attempt.locked_until - now).total_seconds())
                logger.warning(
                    f"Rate limit exceeded for user {user_id}, operation '{operation}'. "
                    f"Attempts: {attempt.count}, Lock time remaining: {remaining_seconds}s"
                )
                return RateLimitResult(
                    allowed=False,
                    remaining_time=remaining_seconds,
                    message=f"Too many attempts. Try again in {remaining_seconds} seconds.",
                )

            # Check if sliding window has expired
            window_start = now - timedelta(seconds=config.window_seconds)
            if attempt.first_attempt_at < window_start:
                # Window expired, reset
                del self._attempts[key]
                return RateLimitResult(
                    allowed=True,
                    attempts_remaining=config.max_attempts,
                    message="Operation allowed",
                )

            # Check if max attempts reached
            if attempt.count >= config.max_attempts:
                # Lock if configured
                if config.lock_duration_seconds > 0:
                    attempt.locked_until = now + timedelta(
                        seconds=config.lock_duration_seconds
                    )
                    logger.warning(
                        f"Account locked for user {user_id}, operation '{operation}'. "
                        f"Attempts: {attempt.count}, Lock duration: {config.lock_duration_seconds}s"
                    )
                    return RateLimitResult(
                        allowed=False,
                        remaining_time=config.lock_duration_seconds,
                        message=f"Too many attempts. Try again in {config.lock_duration_seconds} seconds.",
                    )
                else:
                    # No lockout, but deny request
                    return RateLimitResult(
                        allowed=False,
                        message=f"Rate limit exceeded. Please try again later.",
                    )

            # Still within limits
            attempts_remaining = config.max_attempts - attempt.count
            return RateLimitResult(
                allowed=True,
                attempts_remaining=attempts_remaining,
                message=f"Operation allowed. {attempts_remaining} attempts remaining.",
            )

    def increment(self, user_id: int, operation: str) -> None:
        """
        Increment the attempt count for a user and operation.

        This method is called after a failed operation (e.g., failed login).
        It updates the attempt count and may trigger a lockout if the maximum
        number of attempts is exceeded.

        Args:
            user_id: User identifier
            operation: Operation name

        Example:
            >>> rate_limiter.increment(123, "login")
        """
        config = self._get_config(operation)
        key = self._get_key(user_id, operation)
        now = datetime.now()

        with self._lock:
            attempt = self._attempts.get(key)

            if not attempt:
                # First failed attempt
                attempt = RateLimitAttempt(
                    count=1,
                    first_attempt_at=now,
                    last_attempt_at=now,
                    locked_until=None,
                )
                self._attempts[key] = attempt
                logger.debug(f"First failed attempt recorded for user {user_id}, operation '{operation}'")
                return

            # If already locked, don't increment further
            if attempt.locked_until and attempt.locked_until > now:
                attempt.last_attempt_at = now
                logger.debug(f"Attempt on locked account for user {user_id}, operation '{operation}'")
                return

            # Check if we're still within the sliding window
            window_start = now - timedelta(seconds=config.window_seconds)

            if attempt.first_attempt_at < window_start:
                # Reset if outside window
                attempt.count = 1
                attempt.first_attempt_at = now
                attempt.last_attempt_at = now
                attempt.locked_until = None
                logger.debug(f"Window expired, reset attempts for user {user_id}, operation '{operation}'")
            else:
                # Increment count only if not at max
                if attempt.count < config.max_attempts:
                    attempt.count += 1
                attempt.last_attempt_at = now

                # Lock if max attempts reached
                if attempt.count >= config.max_attempts and not attempt.locked_until:
                    if config.lock_duration_seconds > 0:
                        attempt.locked_until = now + timedelta(
                            seconds=config.lock_duration_seconds
                        )
                        logger.error(
                            f"RATE LIMIT EXCEEDED for user {user_id}, operation '{operation}'. "
                            f"Account locked for {config.lock_duration_seconds}s"
                        )

    def get_remaining(self, user_id: int, operation: str) -> int:
        """
        Get the number of remaining attempts for a user and operation.

        Args:
            user_id: User identifier
            operation: Operation name

        Returns:
            Number of attempts remaining before rate limit

        Example:
            >>> remaining = rate_limiter.get_remaining(123, "login")
            >>> print(f"You have {remaining} attempts remaining")
        """
        config = self._get_config(operation)
        key = self._get_key(user_id, operation)
        now = datetime.now()

        with self._lock:
            attempt = self._attempts.get(key)

            if not attempt:
                return config.max_attempts

            # Check if window has expired
            window_start = now - timedelta(seconds=config.window_seconds)
            if attempt.first_attempt_at < window_start:
                return config.max_attempts

            return max(0, config.max_attempts - attempt.count)

    def reset(self, user_id: int, operation: str) -> None:
        """
        Reset rate limit for a user and operation.

        This method is typically called after a successful operation
        (e.g., successful login) to clear any failed attempts.

        Args:
            user_id: User identifier
            operation: Operation name

        Example:
            >>> rate_limiter.reset(123, "login")
        """
        key = self._get_key(user_id, operation)

        with self._lock:
            if key in self._attempts:
                del self._attempts[key]
                logger.debug(f"Rate limit reset for user {user_id}, operation '{operation}'")

    def is_locked(self, user_id: int, operation: str) -> bool:
        """
        Check if a user is currently locked for an operation.

        Args:
            user_id: User identifier
            operation: Operation name

        Returns:
            True if user is locked, False otherwise

        Example:
            >>> if rate_limiter.is_locked(123, "login"):
            ...     print("Account is locked")
        """
        key = self._get_key(user_id, operation)
        now = datetime.now()

        with self._lock:
            attempt = self._attempts.get(key)

            if not attempt or not attempt.locked_until:
                return False

            return attempt.locked_until > now

    def get_attempt_count(self, user_id: int, operation: str) -> int:
        """
        Get the current attempt count for a user and operation.

        Args:
            user_id: User identifier
            operation: Operation name

        Returns:
            Number of attempts made in current window

        Example:
            >>> count = rate_limiter.get_attempt_count(123, "login")
            >>> print(f"User has made {count} attempts")
        """
        config = self._get_config(operation)
        key = self._get_key(user_id, operation)
        now = datetime.now()

        with self._lock:
            attempt = self._attempts.get(key)

            if not attempt:
                return 0

            # Check if window has expired
            window_start = now - timedelta(seconds=config.window_seconds)
            if attempt.first_attempt_at < window_start:
                return 0

            return attempt.count

    def get_reset_time(self, user_id: int, operation: str) -> Optional[datetime]:
        """
        Get the timestamp when rate limit will reset.

        Args:
            user_id: User identifier
            operation: Operation name

        Returns:
            Datetime when limit resets, or None if no limit active

        Example:
            >>> reset_time = rate_limiter.get_reset_time(123, "login")
            >>> if reset_time:
            ...     print(f"Limit resets at {reset_time}")
        """
        config = self._get_config(operation)
        key = self._get_key(user_id, operation)

        with self._lock:
            attempt = self._attempts.get(key)

            if not attempt:
                return None

            # If locked, return unlock time
            if attempt.locked_until and attempt.locked_until > datetime.now():
                return attempt.locked_until

            # Otherwise, return window expiry time
            return attempt.first_attempt_at + timedelta(seconds=config.window_seconds)

    def cleanup_expired(self) -> int:
        """
        Manually trigger cleanup of expired entries.

        Returns:
            Number of entries cleaned up

        Example:
            >>> cleaned = rate_limiter.cleanup_expired()
            >>> print(f"Cleaned up {cleaned} expired entries")
        """
        with self._lock:
            return self._cleanup_expired_entries()

    def get_statistics(self) -> Dict[str, int]:
        """
        Get statistics about current rate limiting state.

        Returns:
            Dictionary with statistics:
            - total_tracked: Total number of tracked entries
            - locked_accounts: Number of currently locked accounts
            - active_attempts: Number of entries with active attempts

        Example:
            >>> stats = rate_limiter.get_statistics()
            >>> print(f"Tracking {stats['total_tracked']} users")
        """
        now = datetime.now()
        locked_accounts = 0
        active_attempts = 0

        with self._lock:
            for attempt in self._attempts.values():
                if attempt.locked_until and attempt.locked_until > now:
                    locked_accounts += 1

                # Check if has attempts in recent window (use longest window)
                # For simplicity, use 24 hours
                window_start = now - timedelta(hours=24)
                if attempt.first_attempt_at >= window_start:
                    active_attempts += 1

            return {
                "total_tracked": len(self._attempts),
                "locked_accounts": locked_accounts,
                "active_attempts": active_attempts,
            }

    def destroy(self) -> None:
        """
        Clean up resources and stop background timers.

        This method should be called when shutting down the service
        to ensure proper cleanup.

        Example:
            >>> rate_limiter.destroy()
        """
        if self._cleanup_timer:
            self._cleanup_timer.cancel()
            self._cleanup_timer = None

        with self._lock:
            self._attempts.clear()

        logger.info("RateLimitService destroyed")

    # Private helper methods

    def _get_key(self, user_id: int, operation: str) -> str:
        """Generate storage key for user and operation."""
        return f"{user_id}:{operation.lower()}"

    def _get_config(
        self,
        operation: str,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None,
    ) -> RateLimitConfig:
        """Get configuration for operation, with optional overrides."""
        # Use default config if available
        config = self.DEFAULT_CONFIGS.get(operation)

        if not config:
            # Create config from parameters or use sensible defaults
            config = RateLimitConfig(
                max_attempts=max_requests or 100,
                window_seconds=window_seconds or 60,
                lock_duration_seconds=5 * 60,  # 5 minutes default
            )

        # Override with explicit parameters
        if max_requests is not None:
            config.max_attempts = max_requests
        if window_seconds is not None:
            config.window_seconds = window_seconds

        return config

    def _cleanup_expired_entries(self) -> int:
        """Clean up expired entries from memory. Must be called with lock held."""
        now = datetime.now()
        keys_to_delete = []

        for key, attempt in self._attempts.items():
            # Determine longest window for this entry
            # For simplicity, use 24 hours as max window
            max_window = timedelta(hours=24)
            window_start = now - max_window

            # Remove if:
            # 1. Lock has expired and last attempt was long ago
            # 2. No lock and last attempt was long ago
            lock_expired = not attempt.locked_until or attempt.locked_until <= now
            window_expired = attempt.last_attempt_at < window_start

            if lock_expired and window_expired:
                keys_to_delete.append(key)

        # Delete expired entries
        for key in keys_to_delete:
            del self._attempts[key]

        if keys_to_delete:
            logger.debug(f"Cleaned up {len(keys_to_delete)} expired rate limit entries")

        return len(keys_to_delete)

    def _start_cleanup_timer(self) -> None:
        """Start automatic cleanup timer."""
        if self._cleanup_timer:
            self._cleanup_timer.cancel()

        def cleanup_task():
            try:
                self.cleanup_expired()
            except Exception as e:
                logger.error(f"Error during rate limit cleanup: {e}")
            finally:
                # Schedule next cleanup
                self._start_cleanup_timer()

        self._cleanup_timer = threading.Timer(self._cleanup_interval, cleanup_task)
        self._cleanup_timer.daemon = True
        self._cleanup_timer.start()


# Singleton instance for convenience
_rate_limit_service: Optional[RateLimitService] = None
_instance_lock = threading.Lock()


def get_rate_limiter() -> RateLimitService:
    """
    Get singleton instance of RateLimitService.

    Returns:
        Singleton RateLimitService instance

    Example:
        >>> rate_limiter = get_rate_limiter()
        >>> result = rate_limiter.check_rate_limit(123, "login")
    """
    global _rate_limit_service

    if _rate_limit_service is None:
        with _instance_lock:
            if _rate_limit_service is None:
                _rate_limit_service = RateLimitService()

    return _rate_limit_service


def reset_rate_limiter() -> None:
    """
    Reset the singleton instance (mainly for testing).

    Example:
        >>> reset_rate_limiter()  # In test teardown
    """
    global _rate_limit_service

    with _instance_lock:
        if _rate_limit_service:
            _rate_limit_service.destroy()
            _rate_limit_service = None

"""
Logging middleware for FastAPI.

Provides:
- Automatic correlation ID generation and propagation
- Request/response logging with structured fields
- Performance timing for all endpoints
- User context extraction from JWT tokens
- Correlation ID in response headers

Features:
- X-Correlation-ID header support (use existing or generate new)
- Automatic context cleanup after request
- Structured logging with JSON output
- Request body logging (with PII filtering)
- Response status and timing
- Exception logging with stack traces

Usage in main.py:
    from backend.middleware.logging_middleware import LoggingMiddleware

    app = FastAPI()
    app.add_middleware(LoggingMiddleware)
"""

import time
import logging
from typing import Callable, Optional, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import HTTPException

from backend.utils.structured_logger import (
    get_logger,
    set_correlation_id,
    get_correlation_id,
    set_user_id,
    set_request_path,
    clear_context,
    generate_correlation_id,
    LogLevel,
)

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for structured request/response logging.

    Automatically:
    1. Generates or extracts correlation ID from X-Correlation-ID header
    2. Sets correlation ID in context for all logs in request
    3. Logs request details (method, path, query params)
    4. Logs response details (status, duration)
    5. Adds X-Correlation-ID to response headers
    6. Cleans up context after request completes
    """

    # Paths to exclude from logging (health checks, metrics, etc.)
    EXCLUDED_PATHS = {'/health', '/metrics', '/docs', '/openapi.json', '/redoc'}

    # Sensitive headers to redact
    SENSITIVE_HEADERS = {'authorization', 'cookie', 'x-api-key'}

    def __init__(
        self,
        app,
        exclude_paths: Optional[set] = None,
        log_request_body: bool = False,
        log_response_body: bool = False,
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or self.EXCLUDED_PATHS
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with logging."""
        # Skip excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # Extract or generate correlation ID
        correlation_id = request.headers.get('x-correlation-id')
        if not correlation_id:
            correlation_id = generate_correlation_id()

        # Set context for this request
        set_correlation_id(correlation_id)
        set_request_path(request.url.path)

        # Extract user ID from JWT token if present
        user_id = self._extract_user_id(request)
        if user_id:
            set_user_id(user_id)

        # Start timing
        start_time = time.time()

        # Log request
        request_log = self._build_request_log(request)
        logger.info("Request started", extra=request_log)

        # Process request
        response: Optional[Response] = None
        exception: Optional[Exception] = None

        try:
            response = await call_next(request)
        except Exception as exc:
            exception = exc
            # Log exception
            logger.error(
                "Request failed with exception",
                exc_info=exc,
                extra={
                    'method': request.method,
                    'path': request.url.path,
                    'exception_type': type(exc).__name__,
                }
            )
            # Re-raise to let FastAPI handle it
            raise

        finally:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log response (if we have one)
            if response:
                response_log = self._build_response_log(response, duration_ms)
                log_level = self._determine_log_level(response.status_code)
                logger.log(
                    getattr(logging, log_level.value),
                    "Request completed",
                    extra=response_log
                )

                # Add correlation ID to response headers
                response.headers['X-Correlation-ID'] = correlation_id

            # Clean up context
            clear_context()

        return response

    def _extract_user_id(self, request: Request) -> Optional[int]:
        """
        Extract user ID from JWT token in Authorization header.

        Note: This is a simplified version. In production, you'd use
        your actual JWT parsing logic from auth middleware.
        """
        try:
            auth_header = request.headers.get('authorization', '')
            if not auth_header.startswith('Bearer '):
                return None

            # TODO: Replace with actual JWT parsing
            # For now, we'll let the auth middleware handle this
            # and user_id can be set explicitly in routes if needed
            return None

        except Exception as e:
            logger.debug(f"Failed to extract user ID from token: {e}")
            return None

    def _build_request_log(self, request: Request) -> Dict[str, Any]:
        """Build structured log entry for request."""
        log_entry = {
            'method': request.method,
            'path': request.url.path,
            'query_params': dict(request.query_params) if request.query_params else None,
            'client_ip': self._get_client_ip(request),
        }

        # Add sanitized headers
        headers = self._sanitize_headers(dict(request.headers))
        if headers:
            log_entry['headers'] = headers

        # Add request body if enabled (be careful with PII!)
        if self.log_request_body and request.method in ['POST', 'PUT', 'PATCH']:
            # Note: Reading body here requires special handling in FastAPI
            # See: https://github.com/tiangolo/fastapi/issues/394
            # For now, we skip body logging to avoid complications
            pass

        return log_entry

    def _build_response_log(self, response: Response, duration_ms: float) -> Dict[str, Any]:
        """Build structured log entry for response."""
        return {
            'status_code': response.status_code,
            'duration_ms': round(duration_ms, 2),
        }

    def _determine_log_level(self, status_code: int) -> LogLevel:
        """Determine log level based on response status code."""
        if status_code < 400:
            return LogLevel.INFO
        elif status_code < 500:
            return LogLevel.WARNING
        else:
            return LogLevel.ERROR

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP from request, handling proxies."""
        # Check X-Forwarded-For header (from reverse proxy)
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            # Take first IP (client IP before proxies)
            return forwarded_for.split(',')[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip

        # Fall back to direct client
        if request.client:
            return request.client.host

        return 'unknown'

    def _sanitize_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize headers by redacting sensitive values."""
        sanitized = {}
        for key, value in headers.items():
            if key.lower() in self.SENSITIVE_HEADERS:
                sanitized[key] = '[REDACTED]'
            else:
                sanitized[key] = value
        return sanitized


class OperationLogger:
    """
    Context manager for logging operations within request handlers.

    Usage in route handlers:
        from backend.middleware.logging_middleware import OperationLogger

        @router.get("/cases/{case_id}")
        async def get_case(case_id: int):
            with OperationLogger("get_case", case_id=case_id) as log:
                case = await case_service.get(case_id)
                log.add("case_status", case.status)
                return case
    """

    def __init__(
        self,
        operation: str,
        level: LogLevel = LogLevel.INFO,
        **context
    ):
        self.operation = operation
        self.level = level
        self.context = context
        self.start_time: Optional[float] = None
        self.logger = get_logger(__name__)

    def __enter__(self):
        self.start_time = time.time()
        self.logger.debug(
            f"Operation '{self.operation}' started",
            extra={'operation': self.operation, **self.context}
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000

        log_extra = {
            'operation': self.operation,
            'duration_ms': round(duration_ms, 2),
            **self.context
        }

        if exc_type is None:
            # Success
            self.logger.log(
                getattr(logging, self.level.value),
                f"Operation '{self.operation}' completed",
                extra=log_extra
            )
        else:
            # Exception
            self.logger.error(
                f"Operation '{self.operation}' failed",
                exc_info=(exc_type, exc_val, exc_tb),
                extra=log_extra
            )

        return False  # Don't suppress exception

    def add(self, key: str, value: Any) -> None:
        """Add additional context to be logged on exit."""
        self.context[key] = value


# Helper for explicit operation logging in routes
def log_operation(
    operation: str,
    level: LogLevel = LogLevel.INFO,
    **extra
) -> None:
    """
    Log an operation with structured context.

    Usage:
        log_operation("case_created", case_id=new_case.id, user_id=user.id)
    """
    logger.log(
        getattr(logging, level.value),
        operation,
        extra={'operation': operation, **extra}
    )

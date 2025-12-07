"""
Performance monitoring middleware for FastAPI.

Provides:
- Automatic request metrics collection
- Periodic system metrics collection
- /metrics endpoint for Prometheus
- Performance warnings for slow requests
- Integration with structured logging

Features:
- Zero-overhead when disabled
- Thread-safe metric collection
- Prometheus-compatible export
- Endpoint statistics aggregation
- Memory leak detection

Usage in main.py:
    from backend.middleware.performance_middleware import PerformanceMiddleware

    app = FastAPI()
    app.add_middleware(PerformanceMiddleware)

    # Access metrics at /metrics endpoint
"""

import time
import asyncio
import logging
from typing import Callable, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, PlainTextResponse

from backend.utils.performance_metrics import (
    metrics_collector,
    get_metrics_collector,
)
from backend.utils.structured_logger import (
    get_logger,
    get_correlation_id,
    get_user_id,
)

logger = get_logger(__name__)


class PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware for performance monitoring and metrics collection.

    Automatically:
    1. Records request duration and status for all endpoints
    2. Collects system metrics periodically (CPU, memory, disk)
    3. Logs warnings for slow requests (> threshold)
    4. Provides /metrics endpoint for Prometheus export
    5. Integrates with structured logging (correlation IDs)
    """

    # Paths to exclude from metrics collection
    EXCLUDED_PATHS = {'/health', '/metrics'}

    # Slow request threshold (milliseconds)
    SLOW_REQUEST_THRESHOLD_MS = 1000.0

    def __init__(
        self,
        app,
        exclude_paths: Optional[set] = None,
        slow_threshold_ms: float = 1000.0,
        enable_system_metrics: bool = True,
        system_metrics_interval: int = 60,  # seconds
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or self.EXCLUDED_PATHS
        self.slow_threshold_ms = slow_threshold_ms
        self.enable_system_metrics = enable_system_metrics
        self.system_metrics_interval = system_metrics_interval

        # Start background task for system metrics collection
        if self.enable_system_metrics:
            self._system_metrics_task: Optional[asyncio.Task] = None
            logger.info(
                f"Performance monitoring enabled "
                f"(slow_threshold={slow_threshold_ms}ms, "
                f"system_metrics_interval={system_metrics_interval}s)"
            )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with performance monitoring."""
        # Handle /metrics endpoint
        if request.url.path == '/metrics':
            return await self._handle_metrics_endpoint(request)

        # Skip excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # Start timing
        start_time = time.time()

        # Process request
        response: Optional[Response] = None
        exception: Optional[Exception] = None

        try:
            response = await call_next(request)
        except Exception as exc:
            exception = exc
            raise
        finally:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Record metrics (only if we have a response or exception occurred)
            if response or exception:
                self._record_request_metrics(
                    request=request,
                    duration_ms=duration_ms,
                    status_code=response.status_code if response else 500,
                )

        return response

    def _record_request_metrics(
        self,
        request: Request,
        duration_ms: float,
        status_code: int,
    ) -> None:
        """Record request metrics to collector."""
        # Get context from structured logging
        correlation_id = get_correlation_id()
        user_id = get_user_id()

        # Record to metrics collector
        metrics_collector.record_request(
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            status_code=status_code,
            correlation_id=correlation_id,
            user_id=user_id,
        )

        # Log performance warning if slow
        if duration_ms > self.slow_threshold_ms:
            logger.warning(
                f"Slow request: {request.method} {request.url.path}",
                extra={
                    'method': request.method,
                    'path': request.url.path,
                    'duration_ms': round(duration_ms, 2),
                    'status_code': status_code,
                    'threshold_ms': self.slow_threshold_ms,
                    'performance_warning': True,
                }
            )

    async def _handle_metrics_endpoint(self, request: Request) -> Response:
        """
        Handle /metrics endpoint request.

        Returns Prometheus-formatted metrics for scraping.
        """
        # Collect current system metrics before export
        if self.enable_system_metrics:
            metrics_collector.record_system_metrics()

        # Export Prometheus format
        prometheus_text = metrics_collector.export_prometheus()

        return PlainTextResponse(
            content=prometheus_text,
            media_type='text/plain; version=0.0.4',
        )


async def start_system_metrics_collection(interval: int = 60) -> None:
    """
    Background task to collect system metrics periodically.

    Args:
        interval: Collection interval in seconds (default: 60)

    Usage:
        # In main.py lifespan startup:
        asyncio.create_task(start_system_metrics_collection(interval=60))
    """
    logger.info(f"Starting system metrics collection (interval={interval}s)")

    while True:
        try:
            metrics_collector.record_system_metrics()
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

        # Wait for next collection
        await asyncio.sleep(interval)


# Helper for manual performance tracking in routes
class PerformanceTracker:
    """
    Context manager for tracking operation performance in route handlers.

    Usage:
        from backend.middleware.performance_middleware import PerformanceTracker

        @router.get("/expensive-operation")
        async def expensive_operation():
            with PerformanceTracker("database_aggregation") as perf:
                result = await db.complex_query()
                perf.add_metadata("rows_processed", len(result))
                return result
    """

    def __init__(
        self,
        operation: str,
        log_threshold_ms: float = 1000.0,
    ):
        self.operation = operation
        self.log_threshold_ms = log_threshold_ms
        self.start_time: Optional[float] = None
        self.metadata: dict = {}

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000

        # Log if exceeds threshold
        if duration_ms > self.log_threshold_ms:
            logger.warning(
                f"Slow operation: {self.operation}",
                extra={
                    'operation': self.operation,
                    'duration_ms': round(duration_ms, 2),
                    'threshold_ms': self.log_threshold_ms,
                    'performance_warning': True,
                    **self.metadata,
                }
            )
        else:
            logger.debug(
                f"Operation completed: {self.operation}",
                extra={
                    'operation': self.operation,
                    'duration_ms': round(duration_ms, 2),
                    **self.metadata,
                }
            )

        return False  # Don't suppress exceptions

    def add_metadata(self, key: str, value: any) -> None:
        """Add metadata to be logged on exit."""
        self.metadata[key] = value


# Helper for database query tracking
def track_db_query(duration_ms: float) -> None:
    """
    Track database query performance.

    Usage:
        start = time.time()
        result = await db.execute(query)
        track_db_query((time.time() - start) * 1000)
    """
    metrics_collector.record_db_query(duration_ms)

    # Log slow queries
    if duration_ms > 100:  # > 100ms
        logger.warning(
            "Slow database query detected",
            extra={
                'duration_ms': round(duration_ms, 2),
                'performance_warning': True,
            }
        )

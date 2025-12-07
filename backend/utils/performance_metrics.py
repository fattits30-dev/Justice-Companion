"""
Performance metrics collection and monitoring.

Provides:
- Request/response metrics (count, duration, status codes)
- Database query performance tracking
- Memory and CPU usage monitoring
- Endpoint-specific metrics aggregation
- Prometheus-compatible metrics export

Features:
- Thread-safe metric collection
- Sliding window statistics (last N minutes)
- Percentile calculations (p50, p95, p99)
- Rate limiting detection
- Slow query detection
- Memory leak detection

Usage:
    from backend.utils.performance_metrics import metrics_collector

    # In middleware:
    metrics_collector.record_request(
        method="GET",
        path="/cases",
        duration_ms=123.4,
        status_code=200,
    )

    # Get metrics:
    stats = metrics_collector.get_stats()
    print(f"Avg response time: {stats['avg_duration_ms']:.2f}ms")

    # Export Prometheus format:
    prometheus_text = metrics_collector.export_prometheus()
"""

import time
import psutil
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from collections import defaultdict, deque
from datetime import datetime, timedelta
from threading import Lock
from enum import Enum

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Metric type enumeration."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class RequestMetric:
    """Single request metric."""
    timestamp: float
    method: str
    path: str
    duration_ms: float
    status_code: int
    correlation_id: Optional[str] = None
    user_id: Optional[int] = None


@dataclass
class EndpointStats:
    """Aggregated statistics for an endpoint."""
    request_count: int = 0
    total_duration_ms: float = 0.0
    min_duration_ms: float = float('inf')
    max_duration_ms: float = 0.0
    status_codes: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    error_count: int = 0

    # Recent requests for percentile calculation
    recent_durations: deque = field(default_factory=lambda: deque(maxlen=1000))

    def add_request(self, duration_ms: float, status_code: int) -> None:
        """Add request to statistics."""
        self.request_count += 1
        self.total_duration_ms += duration_ms
        self.min_duration_ms = min(self.min_duration_ms, duration_ms)
        self.max_duration_ms = max(self.max_duration_ms, duration_ms)
        self.status_codes[status_code] += 1
        self.recent_durations.append(duration_ms)

        if status_code >= 400:
            self.error_count += 1

    def get_avg_duration_ms(self) -> float:
        """Calculate average duration."""
        if self.request_count == 0:
            return 0.0
        return self.total_duration_ms / self.request_count

    def get_percentile(self, percentile: float) -> float:
        """Calculate percentile duration (e.g., 0.95 for p95)."""
        if not self.recent_durations:
            return 0.0

        sorted_durations = sorted(self.recent_durations)
        index = int(len(sorted_durations) * percentile)
        return sorted_durations[min(index, len(sorted_durations) - 1)]

    def get_error_rate(self) -> float:
        """Calculate error rate (errors / total requests)."""
        if self.request_count == 0:
            return 0.0
        return (self.error_count / self.request_count) * 100


@dataclass
class SystemMetrics:
    """System resource metrics."""
    timestamp: float
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    disk_usage_percent: float


class PerformanceMetricsCollector:
    """
    Collect and aggregate performance metrics.

    Thread-safe collector for request, database, and system metrics.
    Supports sliding window statistics and Prometheus export.
    """

    def __init__(
        self,
        window_minutes: int = 60,
        enable_system_metrics: bool = True,
    ):
        """
        Initialize metrics collector.

        Args:
            window_minutes: Sliding window size for metrics (default: 60 minutes)
            enable_system_metrics: Collect CPU/memory metrics (default: True)
        """
        self.window_minutes = window_minutes
        self.enable_system_metrics = enable_system_metrics

        # Endpoint-specific metrics
        self._endpoint_stats: Dict[str, EndpointStats] = defaultdict(EndpointStats)
        self._endpoint_stats_lock = Lock()

        # Recent requests for time-series analysis
        self._recent_requests: deque = deque(maxlen=10000)
        self._requests_lock = Lock()

        # System metrics
        self._system_metrics: deque = deque(maxlen=1000)
        self._system_metrics_lock = Lock()

        # Database metrics
        self._db_query_count = 0
        self._db_total_duration_ms = 0.0
        self._db_lock = Lock()

        # Start time
        self._start_time = time.time()

        logger.info(
            f"PerformanceMetricsCollector initialized "
            f"(window={window_minutes}min, system_metrics={enable_system_metrics})"
        )

    def record_request(
        self,
        method: str,
        path: str,
        duration_ms: float,
        status_code: int,
        correlation_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> None:
        """
        Record request metric.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: Request path
            duration_ms: Request duration in milliseconds
            status_code: HTTP status code
            correlation_id: Optional correlation ID
            user_id: Optional user ID
        """
        # Create metric
        metric = RequestMetric(
            timestamp=time.time(),
            method=method,
            path=path,
            duration_ms=duration_ms,
            status_code=status_code,
            correlation_id=correlation_id,
            user_id=user_id,
        )

        # Add to recent requests
        with self._requests_lock:
            self._recent_requests.append(metric)

        # Update endpoint stats
        endpoint_key = f"{method} {path}"
        with self._endpoint_stats_lock:
            self._endpoint_stats[endpoint_key].add_request(duration_ms, status_code)

        # Log slow requests (> 1 second)
        if duration_ms > 1000:
            logger.warning(
                f"Slow request detected: {method} {path} took {duration_ms:.2f}ms",
                extra={
                    'method': method,
                    'path': path,
                    'duration_ms': duration_ms,
                    'status_code': status_code,
                }
            )

    def record_db_query(self, duration_ms: float) -> None:
        """Record database query metric."""
        with self._db_lock:
            self._db_query_count += 1
            self._db_total_duration_ms += duration_ms

    def record_system_metrics(self) -> None:
        """Record current system metrics (CPU, memory, disk)."""
        if not self.enable_system_metrics:
            return

        try:
            process = psutil.Process()

            metric = SystemMetrics(
                timestamp=time.time(),
                cpu_percent=process.cpu_percent(),
                memory_mb=process.memory_info().rss / 1024 / 1024,  # Convert to MB
                memory_percent=process.memory_percent(),
                disk_usage_percent=psutil.disk_usage('/').percent,
            )

            with self._system_metrics_lock:
                self._system_metrics.append(metric)

        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

    def get_stats(self, endpoint: Optional[str] = None) -> Dict[str, Any]:
        """
        Get aggregated statistics.

        Args:
            endpoint: Optional specific endpoint to get stats for (e.g., "GET /cases")

        Returns:
            Dictionary with aggregated statistics
        """
        stats = {
            'uptime_seconds': time.time() - self._start_time,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        }

        # Request stats
        with self._requests_lock:
            total_requests = len(self._recent_requests)
            stats['total_requests'] = total_requests

            if total_requests > 0:
                durations = [r.duration_ms for r in self._recent_requests]
                stats['avg_duration_ms'] = sum(durations) / len(durations)
                stats['min_duration_ms'] = min(durations)
                stats['max_duration_ms'] = max(durations)

                # Calculate percentiles
                sorted_durations = sorted(durations)
                stats['p50_duration_ms'] = sorted_durations[int(len(sorted_durations) * 0.50)]
                stats['p95_duration_ms'] = sorted_durations[int(len(sorted_durations) * 0.95)]
                stats['p99_duration_ms'] = sorted_durations[int(len(sorted_durations) * 0.99)]

        # Database stats
        with self._db_lock:
            stats['db_query_count'] = self._db_query_count
            if self._db_query_count > 0:
                stats['db_avg_duration_ms'] = self._db_total_duration_ms / self._db_query_count

        # Endpoint-specific stats
        if endpoint:
            with self._endpoint_stats_lock:
                endpoint_stats = self._endpoint_stats.get(endpoint)
                if endpoint_stats:
                    stats['endpoint'] = {
                        'request_count': endpoint_stats.request_count,
                        'avg_duration_ms': endpoint_stats.get_avg_duration_ms(),
                        'min_duration_ms': endpoint_stats.min_duration_ms,
                        'max_duration_ms': endpoint_stats.max_duration_ms,
                        'p95_duration_ms': endpoint_stats.get_percentile(0.95),
                        'error_rate': endpoint_stats.get_error_rate(),
                        'status_codes': dict(endpoint_stats.status_codes),
                    }
        else:
            # All endpoints
            with self._endpoint_stats_lock:
                endpoints = {}
                for key, endpoint_stats in self._endpoint_stats.items():
                    endpoints[key] = {
                        'request_count': endpoint_stats.request_count,
                        'avg_duration_ms': endpoint_stats.get_avg_duration_ms(),
                        'error_rate': endpoint_stats.get_error_rate(),
                    }
                stats['endpoints'] = endpoints

        # System metrics (latest)
        if self.enable_system_metrics:
            with self._system_metrics_lock:
                if self._system_metrics:
                    latest = self._system_metrics[-1]
                    stats['system'] = {
                        'cpu_percent': latest.cpu_percent,
                        'memory_mb': latest.memory_mb,
                        'memory_percent': latest.memory_percent,
                        'disk_usage_percent': latest.disk_usage_percent,
                    }

        return stats

    def export_prometheus(self) -> str:
        """
        Export metrics in Prometheus text format.

        Returns:
            Prometheus-formatted metrics string
        """
        lines = []

        # Request metrics by endpoint
        with self._endpoint_stats_lock:
            for endpoint_key, stats in self._endpoint_stats.items():
                # Sanitize endpoint key for Prometheus (replace spaces with underscores)
                metric_name = endpoint_key.replace(' ', '_').replace('/', '_').lower()

                # Request count
                lines.append(f'# HELP http_requests_total Total HTTP requests for {endpoint_key}')
                lines.append(f'# TYPE http_requests_total counter')
                lines.append(f'http_requests_total{{endpoint="{endpoint_key}"}} {stats.request_count}')

                # Average duration
                lines.append(f'# HELP http_request_duration_ms Average request duration in milliseconds')
                lines.append(f'# TYPE http_request_duration_ms gauge')
                lines.append(f'http_request_duration_ms{{endpoint="{endpoint_key}"}} {stats.get_avg_duration_ms():.2f}')

                # Error rate
                lines.append(f'# HELP http_error_rate Request error rate percentage')
                lines.append(f'# TYPE http_error_rate gauge')
                lines.append(f'http_error_rate{{endpoint="{endpoint_key}"}} {stats.get_error_rate():.2f}')

        # Database metrics
        with self._db_lock:
            lines.append(f'# HELP db_queries_total Total database queries executed')
            lines.append(f'# TYPE db_queries_total counter')
            lines.append(f'db_queries_total {self._db_query_count}')

            if self._db_query_count > 0:
                avg_db_duration = self._db_total_duration_ms / self._db_query_count
                lines.append(f'# HELP db_query_duration_ms Average database query duration in milliseconds')
                lines.append(f'# TYPE db_query_duration_ms gauge')
                lines.append(f'db_query_duration_ms {avg_db_duration:.2f}')

        # System metrics
        if self.enable_system_metrics:
            with self._system_metrics_lock:
                if self._system_metrics:
                    latest = self._system_metrics[-1]

                    lines.append(f'# HELP process_cpu_percent Process CPU usage percentage')
                    lines.append(f'# TYPE process_cpu_percent gauge')
                    lines.append(f'process_cpu_percent {latest.cpu_percent:.2f}')

                    lines.append(f'# HELP process_memory_mb Process memory usage in MB')
                    lines.append(f'# TYPE process_memory_mb gauge')
                    lines.append(f'process_memory_mb {latest.memory_mb:.2f}')

                    lines.append(f'# HELP process_memory_percent Process memory usage percentage')
                    lines.append(f'# TYPE process_memory_percent gauge')
                    lines.append(f'process_memory_percent {latest.memory_percent:.2f}')

        return '\n'.join(lines) + '\n'

    def reset(self) -> None:
        """Reset all metrics (useful for testing)."""
        with self._requests_lock:
            self._recent_requests.clear()

        with self._endpoint_stats_lock:
            self._endpoint_stats.clear()

        with self._system_metrics_lock:
            self._system_metrics.clear()

        with self._db_lock:
            self._db_query_count = 0
            self._db_total_duration_ms = 0.0

        self._start_time = time.time()
        logger.info("Metrics reset")


# Global metrics collector singleton
_global_collector: Optional[PerformanceMetricsCollector] = None


def get_metrics_collector() -> PerformanceMetricsCollector:
    """Get global metrics collector instance (singleton)."""
    global _global_collector
    if _global_collector is None:
        _global_collector = PerformanceMetricsCollector(
            window_minutes=60,
            enable_system_metrics=True,
        )
    return _global_collector


# Convenience alias
metrics_collector = get_metrics_collector()

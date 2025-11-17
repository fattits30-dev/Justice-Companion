"""
EnhancedErrorTracker - Advanced Error Tracking and Management

Migrated from: src/services/EnhancedErrorTracker.ts

Features:
- Error grouping via fingerprinting (SHA-256 hash-based)
- Deduplication to reduce noise
- Rate limiting to prevent performance impact
- Sampling for non-critical errors
- Alert management for repeated errors
- Performance correlation tracking
- Memory usage monitoring
- Automatic cleanup of old error groups

This service provides comprehensive error tracking with intelligent grouping,
rate limiting, and alerting capabilities. It uses cryptographic fingerprinting
to group similar errors together and provides detailed metrics for monitoring.

Usage:
    from backend.services.enhanced_error_tracker import EnhancedErrorTracker

    tracker = EnhancedErrorTracker()
    await tracker.track_error({
        "name": "DatabaseError",
        "message": "Connection timeout",
        "level": "error",
        "context": {"component": "CaseService"}
    })

    metrics = await tracker.get_metrics(time_range="1h")
    print(f"Total errors: {metrics['total_errors']}")
"""

import hashlib
import logging
import random
import re
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Literal, Callable
from uuid import uuid4
from collections import defaultdict
from dataclasses import dataclass

from pydantic import BaseModel, Field, ConfigDict

# Configure logger
logger = logging.getLogger(__name__)


# Type Aliases
ErrorLevel = Literal["debug", "info", "warning", "error", "critical"]
AlertSeverity = Literal["info", "warning", "critical"]
TrendDirection = Literal["up", "down", "stable"]


# Pydantic Models
class ErrorContext(BaseModel):
    """Context information for an error"""

    model_config = ConfigDict(extra="allow")

    user_id: Optional[str] = None
    session_id: Optional[str] = None
    case_id: Optional[str] = None
    component: Optional[str] = None
    operation: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None


class ErrorData(BaseModel):
    """Complete error data structure"""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = "Error"
    message: str
    stack: Optional[str] = None
    level: ErrorLevel = "error"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    fingerprint: Optional[str] = None
    context: Optional[ErrorContext] = None
    tags: Dict[str, str] = Field(default_factory=dict)


class ErrorGroup(BaseModel):
    """Group of similar errors"""

    fingerprint: str
    first_seen: float
    last_seen: float
    count: int
    errors: List[ErrorData]
    pattern: str
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None


class Alert(BaseModel):
    """Alert triggered by error conditions"""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    severity: AlertSeverity
    message: str
    value: Any
    threshold: Any
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    active: bool = True
    acknowledged_at: Optional[str] = None
    acknowledged_by: Optional[str] = None


class AlertRule(BaseModel):
    """Configuration for alert rules"""

    name: str
    condition: str
    threshold: Any
    window: int  # milliseconds
    severity: AlertSeverity
    channels: List[Literal["console", "notification", "file", "email", "slack"]]
    cooldown: int  # milliseconds
    filter: Optional[Callable[[ErrorData], bool]] = None


class SamplingConfig(BaseModel):
    """Sampling rates for different error levels"""

    critical: float = 1.0  # 100% - Always log critical
    error: float = 1.0  # 100% - Always log errors
    warning: float = 0.5  # 50% - Sample warnings
    info: float = 0.1  # 10% - Sample info
    debug: float = 0.01  # 1% - Rarely log debug


class RateLimitConfig(BaseModel):
    """Rate limiting configuration"""

    max_errors_per_group: int = 100  # Max 100 errors/min per group
    max_total_errors: int = 1000  # Max 1000 errors/min total
    window_ms: int = 60 * 1000  # 1 minute window


class CircuitBreakerConfig(BaseModel):
    """Circuit breaker configuration"""

    timeout: int = 3000
    failure_threshold: int = 5
    reset_timeout: int = 30000
    success_threshold: int = 3


class ErrorTrackerConfig(BaseModel):
    """Complete error tracker configuration"""

    sampling: SamplingConfig = Field(default_factory=SamplingConfig)
    rate_limit: RateLimitConfig = Field(default_factory=RateLimitConfig)
    alert_rules: List[AlertRule] = Field(default_factory=list)
    circuit_breaker: CircuitBreakerConfig = Field(default_factory=CircuitBreakerConfig)
    enable_performance_monitoring: bool = True
    performance_monitoring_interval: int = 60000  # 1 minute


class ErrorTrackerStats(BaseModel):
    """Statistics for error tracker"""

    total_errors: int = 0
    total_groups: int = 0
    errors_sampled: int = 0
    errors_rate_limited: int = 0
    alerts_triggered: int = 0
    recoveries_attempted: int = 0
    recoveries_successful: int = 0
    avg_processing_time: float = 0.0
    memory_usage: float = 0.0


class ErrorDistribution(BaseModel):
    """Error distribution by type"""

    type: str
    count: int
    percentage: float


class TopError(BaseModel):
    """Top error by frequency"""

    fingerprint: str
    message: str
    count: int
    last_seen: str


class ErrorMetrics(BaseModel):
    """Complete error metrics for dashboard"""

    total_errors: int
    error_rate: float
    affected_users: int
    mttr: int  # Mean Time To Resolution (milliseconds)
    error_trend: List[Dict[str, Any]] = Field(default_factory=list)
    error_distribution: List[ErrorDistribution]
    top_errors: List[TopError]
    recent_errors: List[ErrorData]
    active_alerts: List[Alert] = Field(default_factory=list)
    error_heatmap: List[Dict[str, Any]] = Field(default_factory=list)
    error_rate_trend: TrendDirection = "stable"
    errors_trend: TrendDirection = "stable"
    users_trend: TrendDirection = "stable"
    mttr_trend: TrendDirection = "stable"


@dataclass
class RateLimiter:
    """Rate limiter for a specific error group"""

    count: int = 0
    reset_at: float = 0.0


class EnhancedErrorTracker:
    """
    Advanced error tracking system with grouping, sampling, and alerting.

    This tracker provides intelligent error management through:
    - Fingerprint-based grouping of similar errors
    - Sampling to reduce volume for non-critical errors
    - Rate limiting to prevent performance degradation
    - Alert triggers for repeated error patterns
    - Performance metrics and memory monitoring
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the enhanced error tracker.

        Args:
            config: Optional configuration dictionary (will be converted to ErrorTrackerConfig)
        """
        # Convert dict config to Pydantic model
        if config is None:
            config = {}
        self.config = ErrorTrackerConfig(**config)

        # Internal state
        self.error_groups: Dict[str, ErrorGroup] = {}
        self.rate_limiters: Dict[str, RateLimiter] = {}
        self.total_error_count: int = 0
        self.sampled_count: int = 0
        self.rate_limited_count: int = 0

        # Statistics
        self.stats = ErrorTrackerStats()

        # Start cleanup timer (would use asyncio in production)
        logger.info("EnhancedErrorTracker initialized")

    async def track_error(self, error_data: Dict[str, Any]) -> None:
        """
        Track an error through the complete pipeline.

        This method:
        1. Normalizes error data
        2. Generates a fingerprint for grouping
        3. Checks rate limiting
        4. Applies sampling rules
        5. Updates error groups
        6. Persists to disk (async)
        7. Evaluates alert rules

        Args:
            error_data: Partial error data dictionary
        """
        start_time = time.time()

        try:
            # Normalize error data
            normalized_error = self._normalize_error_data(error_data)

            # Generate fingerprint for grouping
            fingerprint = self._generate_fingerprint(normalized_error)
            normalized_error.fingerprint = fingerprint

            # Check rate limiting
            if self._is_rate_limited(fingerprint):
                self.rate_limited_count += 1
                self.stats.errors_rate_limited += 1
                return

            # Check sampling (for non-critical errors)
            if not self._should_sample(normalized_error.level):
                self.sampled_count += 1
                self.stats.errors_sampled += 1
                return

            # Update or create error group
            group = self._update_error_group(fingerprint, normalized_error)

            # Persist error to disk (async in production)
            self._persist_error(normalized_error)

            # Update counters
            self.total_error_count += 1
            self.stats.total_errors += 1

            # Check if alerts should be triggered
            self._evaluate_alerts(group)

            # Update processing time stats
            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            if self.stats.total_errors == 1:
                self.stats.avg_processing_time = processing_time
            else:
                self.stats.avg_processing_time = (
                    self.stats.avg_processing_time * (self.stats.total_errors - 1) + processing_time
                ) / self.stats.total_errors

        except Exception as e:
            # Error tracking should never crash the app
            logger.error(f"EnhancedErrorTracker: Failed to track error: {e}", exc_info=True)

    def _normalize_error_data(self, error_data: Dict[str, Any]) -> ErrorData:
        """
        Normalize error data to standard format.

        Args:
            error_data: Partial error data dictionary

        Returns:
            Complete ErrorData object with defaults applied
        """
        # Convert context dict to ErrorContext if present
        context = error_data.get("context")
        if context and not isinstance(context, ErrorContext):
            context = ErrorContext(**context)

        return ErrorData(
            id=error_data.get("id", str(uuid4())),
            name=error_data.get("name", "Error"),
            message=error_data.get("message", "Unknown error"),
            stack=error_data.get("stack"),
            level=error_data.get("level", "error"),
            timestamp=error_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            context=context,
            tags=error_data.get("tags", {}),
        )

    def _generate_fingerprint(self, error: ErrorData) -> str:
        """
        Generate unique fingerprint for error grouping.

        Uses SHA-256 hash of:
        - Error type/name
        - Normalized message (dynamic values removed)
        - Error location from stack trace
        - Component name

        Args:
            error: Error data object

        Returns:
            16-character hexadecimal fingerprint
        """
        # Normalize error message (remove dynamic values)
        normalized_message = self._normalize_message(error.message)

        # Extract error location from stack trace
        location = self._extract_location(error.stack)

        # Combine components for fingerprint
        components = [
            error.name,  # Error type
            normalized_message,  # Normalized message
            location,  # File:line
            error.context.component if error.context else None,  # Component name
        ]

        # Filter out None values
        components = [c for c in components if c is not None]

        # Generate SHA-256 hash (16-char fingerprint)
        fingerprint_input = "|".join(components)
        hash_obj = hashlib.sha256(fingerprint_input.encode("utf-8"))
        return hash_obj.hexdigest()[:16]

    def _normalize_message(self, message: str) -> str:
        """
        Normalize error message by removing dynamic values.

        Replaces:
        - UUIDs → <UUID>
        - URLs → <URL>
        - Timestamps → <TIME>
        - Memory addresses → <ADDR>
        - File paths → <PATH>
        - Numbers → <NUM>

        Args:
            message: Raw error message

        Returns:
            Normalized message with dynamic values replaced
        """
        # Remove UUIDs (before numbers to avoid partial replacement)
        message = re.sub(r"[a-f0-9-]{36}", "<UUID>", message, flags=re.IGNORECASE)

        # Remove URLs (before paths)
        message = re.sub(r"https?://[^\s]+", "<URL>", message)

        # Remove timestamps (before numbers to preserve timestamp pattern)
        message = re.sub(r"\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}", "<TIME>", message)

        # Remove memory addresses (before numbers)
        message = re.sub(r"0x[0-9a-fA-F]+", "<ADDR>", message)

        # Remove file paths (Windows and Unix)
        message = re.sub(r"[A-Z]:\\[\w\\]+", "<PATH>", message)
        message = re.sub(r"/[\w/]+", "<PATH>", message)

        # Remove numbers (last to avoid interfering with other patterns)
        message = re.sub(r"\b\d+\b", "<NUM>", message)

        return message.strip()

    def _extract_location(self, stack: Optional[str]) -> str:
        """
        Extract error location from stack trace.

        Parses stack trace to find the first file reference and extracts
        the file path and line number.

        Args:
            stack: Stack trace string

        Returns:
            Location string in format "file:line" or "unknown"
        """
        if not stack:
            return "unknown"

        # Try Node.js/Chrome stack format
        match = re.search(r"at\s+(.+?)\s*\((.+?):(\d+):(\d+)\)", stack)
        if match:
            file, line = match.group(2), match.group(3)
            # Normalize file path (keep src/ onwards)
            normalized_file = re.sub(r".*[\\/](src[\\/].+)$", r"\1", file)
            return f"{normalized_file}:{line}"

        # Try Firefox stack format
        alt_match = re.search(r"(.+?)@(.+?):(\d+):(\d+)", stack)
        if alt_match:
            file, line = alt_match.group(2), alt_match.group(3)
            normalized_file = re.sub(r".*[\\/](src[\\/].+)$", r"\1", file)
            return f"{normalized_file}:{line}"

        # Try Python stack format
        py_match = re.search(r'File "(.+?)", line (\d+)', stack)
        if py_match:
            file, line = py_match.group(1), py_match.group(2)
            normalized_file = re.sub(r".*[\\/](backend[\\/].+)$", r"\1", file)
            return f"{normalized_file}:{line}"

        return "unknown"

    def _is_rate_limited(self, fingerprint: str) -> bool:
        """
        Check if error should be rate limited.

        Rate limiting prevents the same error from overwhelming the system.
        Each error group has its own rate limiter that resets after the
        configured window.

        Args:
            fingerprint: Error fingerprint

        Returns:
            True if error should be rate limited, False otherwise
        """
        now = time.time() * 1000  # Convert to milliseconds
        limiter = self.rate_limiters.get(fingerprint)

        if not limiter or now > limiter.reset_at:
            # Reset rate limiter
            self.rate_limiters[fingerprint] = RateLimiter(
                count=1, reset_at=now + self.config.rate_limit.window_ms
            )
            return False

        if limiter.count >= self.config.rate_limit.max_errors_per_group:
            return True  # Rate limited

        limiter.count += 1
        return False

    def _should_sample(self, level: ErrorLevel) -> bool:
        """
        Check if error should be sampled based on level.

        Lower priority errors are sampled to reduce volume while still
        maintaining visibility into patterns.

        Args:
            level: Error severity level

        Returns:
            True if error should be logged, False if sampled out
        """
        rate = getattr(self.config.sampling, level)
        return random.random() < rate

    def _update_error_group(self, fingerprint: str, error: ErrorData) -> ErrorGroup:
        """
        Update or create error group.

        Groups similar errors together by fingerprint. Each group tracks:
        - First and last occurrence
        - Total count
        - Recent error instances (limited to last 10)

        Args:
            fingerprint: Error fingerprint
            error: Error data object

        Returns:
            Updated or new ErrorGroup
        """
        now = time.time() * 1000  # milliseconds

        if fingerprint in self.error_groups:
            # Update existing group
            group = self.error_groups[fingerprint]
            group.last_seen = now
            group.count += 1

            # Add error to group (limit to last 10 for memory)
            group.errors.insert(0, error)
            if len(group.errors) > 10:
                group.errors.pop()
        else:
            # Create new group
            group = ErrorGroup(
                fingerprint=fingerprint,
                first_seen=now,
                last_seen=now,
                count=1,
                errors=[error],
                pattern=self._normalize_message(error.message),
            )

            self.error_groups[fingerprint] = group
            self.stats.total_groups += 1

            logger.info(f"New error group created: {fingerprint}")

        return group

    def _persist_error(self, error: ErrorData) -> None:
        """
        Persist error to disk (async, non-blocking).

        In production, this would write to a structured log file or database.
        For now, we use Python's logging module.

        Args:
            error: Error data to persist
        """
        try:
            # Log error with structured data
            logger.error(
                f"Error tracked: {error.name}: {error.message}",
                extra={
                    "error_id": error.id,
                    "error_name": error.name,
                    "error_level": error.level,
                    "error_fingerprint": error.fingerprint,
                    "timestamp": error.timestamp,
                    "context": error.context.model_dump() if error.context else {},
                    "tags": error.tags,
                },
            )
        except Exception as e:
            # Silently fail - error logging should never crash app
            logger.warning(f"Failed to persist error: {e}")

    def _evaluate_alerts(self, group: ErrorGroup) -> None:
        """
        Evaluate alert rules for error group.

        Triggers alerts when error patterns exceed thresholds.
        Currently implements a simple alert for repeated errors.

        Args:
            group: Error group to evaluate
        """
        # Check if error count exceeds threshold
        if group.count >= 10 and group.count % 10 == 0:
            alert = Alert(
                name="Repeated Error Group",
                severity="warning",
                message=f"Error group {group.fingerprint} occurred {group.count} times",
                value=group.count,
                threshold=10,
            )

            self.stats.alerts_triggered += 1

            # Log alert
            logger.warning(f"Alert triggered: {alert.name}", extra={"alert": alert.model_dump()})

    async def get_metrics(self, time_range: str = "1h") -> ErrorMetrics:
        """
        Get error metrics for dashboard.

        Calculates comprehensive metrics including:
        - Total errors and error rate
        - Affected users
        - Mean Time To Resolution
        - Error distribution by type
        - Top errors by frequency
        - Recent errors

        Args:
            time_range: Time range for metrics (1h, 6h, 24h, 7d, 30d)

        Returns:
            ErrorMetrics object with complete metrics
        """
        now = time.time() * 1000  # milliseconds

        # Define time ranges in milliseconds
        ranges = {
            "1h": 60 * 60 * 1000,
            "6h": 6 * 60 * 60 * 1000,
            "24h": 24 * 60 * 60 * 1000,
            "7d": 7 * 24 * 60 * 60 * 1000,
            "30d": 30 * 24 * 60 * 60 * 1000,
        }

        range_ms = ranges.get(time_range, ranges["1h"])
        start_time = now - range_ms

        # Filter groups within time range
        recent_groups = [
            group for group in self.error_groups.values() if group.last_seen >= start_time
        ]

        # Calculate metrics
        total_errors = sum(group.count for group in recent_groups)

        # Calculate affected users
        affected_users_set = set()
        for group in recent_groups:
            for error in group.errors:
                if error.context and error.context.user_id:
                    affected_users_set.add(error.context.user_id)
        affected_users = len(affected_users_set)

        # Calculate error rate (simplified - would need total operations in real implementation)
        error_rate = 0.01 * min(total_errors / 100, 1) if total_errors > 0 else 0.0

        # Calculate MTTR (simplified - would track resolution times in real implementation)
        mttr = 15 * 60 * 1000  # 15 minutes placeholder

        # Error distribution by type
        distribution_map: Dict[str, int] = defaultdict(int)
        for group in recent_groups:
            error_name = group.errors[0].name if group.errors else "Unknown"
            distribution_map[error_name] += group.count

        error_distribution = [
            ErrorDistribution(
                type=error_type,
                count=count,
                percentage=(count / total_errors * 100) if total_errors > 0 else 0.0,
            )
            for error_type, count in distribution_map.items()
        ]
        error_distribution.sort(key=lambda x: x.count, reverse=True)

        # Top errors
        top_errors = [
            TopError(
                fingerprint=group.fingerprint,
                message=group.pattern,
                count=group.count,
                last_seen=datetime.fromtimestamp(
                    group.last_seen / 1000, tz=timezone.utc
                ).isoformat(),
            )
            for group in sorted(recent_groups, key=lambda g: g.count, reverse=True)[:10]
        ]

        # Recent errors
        all_recent_errors = []
        for group in recent_groups:
            all_recent_errors.extend(group.errors)
        all_recent_errors.sort(
            key=lambda e: datetime.fromisoformat(e.timestamp).timestamp(), reverse=True
        )
        recent_errors = all_recent_errors[:50]

        return ErrorMetrics(
            total_errors=total_errors,
            error_rate=error_rate,
            affected_users=affected_users,
            mttr=mttr,
            error_distribution=error_distribution,
            top_errors=top_errors,
            recent_errors=recent_errors,
        )

    def get_stats(self) -> ErrorTrackerStats:
        """
        Get error tracker statistics.

        Returns current statistics including total errors, groups,
        sampling/rate limiting counts, and memory usage.

        Returns:
            ErrorTrackerStats object
        """
        self.stats.memory_usage = self._calculate_memory_usage()
        return self.stats

    def _calculate_memory_usage(self) -> float:
        """
        Calculate memory usage of error tracker.

        Rough estimate based on number of errors in memory.
        Each error is estimated at 1KB.

        Returns:
            Memory usage in MB
        """
        error_count = sum(len(group.errors) for group in self.error_groups.values())
        return (error_count * 1024) / (1024 * 1024)  # Convert to MB

    def clear_groups(self) -> None:
        """
        Clear all error groups.

        Useful for testing and maintenance. Resets all tracking data.
        """
        self.error_groups.clear()
        self.stats.total_groups = 0
        logger.info("Error groups cleared")

    def cleanup(self) -> None:
        """
        Cleanup old error groups (older than 24 hours).

        Should be called periodically to prevent unbounded memory growth.
        In production, this would run on a timer.
        """
        now = time.time() * 1000  # milliseconds
        max_age = 24 * 60 * 60 * 1000  # 24 hours

        removed = 0
        to_remove = []

        for fingerprint, group in self.error_groups.items():
            if now - group.last_seen > max_age:
                to_remove.append(fingerprint)
                removed += 1

        for fingerprint in to_remove:
            del self.error_groups[fingerprint]

        if removed > 0:
            self.stats.total_groups -= removed
            logger.info(f"Cleaned up {removed} old error groups")


# Convenience function for quick error tracking
async def track_error(
    tracker: EnhancedErrorTracker,
    error: Exception,
    level: ErrorLevel = "error",
    context: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Convenience function to track a Python exception.

    Args:
        tracker: EnhancedErrorTracker instance
        error: Python exception to track
        level: Error severity level
        context: Additional context dictionary
    """
    import traceback

    await tracker.track_error(
        {
            "name": error.__class__.__name__,
            "message": str(error),
            "stack": traceback.format_exc(),
            "level": level,
            "context": context or {},
        }
    )

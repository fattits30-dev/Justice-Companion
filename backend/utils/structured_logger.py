"""
Structured logging with JSON formatting and correlation IDs.

Provides:
- JSON-formatted log output for machine parsing
- Correlation ID tracking across requests
- Contextual metadata (user_id, case_id, operation)
- Thread-safe context storage
- Integration with FastAPI middleware

Features:
- Structured fields (timestamp, level, message, context)
- Automatic correlation ID propagation
- Performance timing helpers
- GDPR-compliant PII filtering
- Log aggregation support (ELK, CloudWatch, etc.)

Usage:
    from backend.utils.structured_logger import get_logger, set_correlation_id

    logger = get_logger(__name__)

    # In middleware:
    set_correlation_id(str(uuid.uuid4()))

    # In application code:
    logger.info("User logged in", extra={"user_id": user_id})
    logger.error("Database query failed", extra={"query": query, "error": str(e)})
"""

import json
import logging
import time
import uuid
from typing import Optional, Dict, Any, List
from contextvars import ContextVar
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

# Context variables for request-scoped data (thread-safe)
correlation_id_var: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
user_id_var: ContextVar[Optional[int]] = ContextVar('user_id', default=None)
request_path_var: ContextVar[Optional[str]] = ContextVar('request_path', default=None)


class LogLevel(str, Enum):
    """Log level enumeration."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class LogContext:
    """Structured log context."""
    correlation_id: Optional[str] = None
    user_id: Optional[int] = None
    request_path: Optional[str] = None
    operation: Optional[str] = None
    case_id: Optional[int] = None
    evidence_id: Optional[int] = None
    duration_ms: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict, excluding None values."""
        return {k: v for k, v in asdict(self).items() if v is not None}


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.

    Outputs logs in JSON format with:
    - timestamp (ISO 8601)
    - level (INFO, ERROR, etc.)
    - logger (module name)
    - message (log message)
    - context (correlation_id, user_id, etc.)
    - extra (additional fields from extra parameter)
    """

    # PII fields to filter (GDPR compliance)
    PII_FIELDS = {'password', 'api_key', 'token', 'secret', 'auth', 'authorization'}

    def __init__(self, *args, include_trace: bool = True, **kwargs):
        super().__init__(*args, **kwargs)
        self.include_trace = include_trace

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Base log entry
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        # Add context from context vars
        context = LogContext(
            correlation_id=correlation_id_var.get(),
            user_id=user_id_var.get(),
            request_path=request_path_var.get(),
        )
        context_dict = context.to_dict()
        if context_dict:
            log_entry['context'] = context_dict

        # Add extra fields from record
        extra_fields = {}
        for key, value in record.__dict__.items():
            # Skip standard fields
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'message', 'pathname', 'process', 'processName', 'relativeCreated',
                'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info',
            ]:
                # Filter PII
                if key.lower() in self.PII_FIELDS:
                    extra_fields[key] = '[REDACTED]'
                else:
                    extra_fields[key] = value

        if extra_fields:
            log_entry['extra'] = extra_fields

        # Add exception info if present
        if record.exc_info and self.include_trace:
            log_entry['exception'] = self.formatException(record.exc_info)

        # Add source location (file:line)
        if self.include_trace:
            log_entry['source'] = f"{record.filename}:{record.lineno}"

        return json.dumps(log_entry)


def get_logger(
    name: str,
    level: LogLevel = LogLevel.INFO,
    structured: bool = True,
) -> logging.Logger:
    """
    Get configured logger instance.

    Args:
        name: Logger name (typically __name__)
        level: Minimum log level (default: INFO)
        structured: Use JSON formatting (default: True)

    Returns:
        Configured logger instance

    Usage:
        logger = get_logger(__name__)
        logger.info("Operation completed", extra={"duration_ms": 123})
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler()

        if structured:
            formatter = StructuredFormatter()
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )

        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(level.value)

    return logger


# Context management functions

def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for current request context."""
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> Optional[str]:
    """Get correlation ID from current request context."""
    return correlation_id_var.get()


def generate_correlation_id() -> str:
    """Generate new correlation ID."""
    return str(uuid.uuid4())


def set_user_id(user_id: int) -> None:
    """Set user ID for current request context."""
    user_id_var.set(user_id)


def get_user_id() -> Optional[int]:
    """Get user ID from current request context."""
    return user_id_var.get()


def set_request_path(path: str) -> None:
    """Set request path for current request context."""
    request_path_var.set(path)


def get_request_path() -> Optional[str]:
    """Get request path from current request context."""
    return request_path_var.get()


def clear_context() -> None:
    """Clear all context variables (called after request completes)."""
    correlation_id_var.set(None)
    user_id_var.set(None)
    request_path_var.set(None)


# Performance timing helper

class LogTimer:
    """
    Context manager for timing operations with automatic logging.

    Usage:
        with LogTimer(logger, "Database query", extra={"query_type": "SELECT"}):
            result = db.execute(query)
    """

    def __init__(
        self,
        logger: logging.Logger,
        operation: str,
        level: LogLevel = LogLevel.INFO,
        extra: Optional[Dict[str, Any]] = None,
    ):
        self.logger = logger
        self.operation = operation
        self.level = level
        self.extra = extra or {}
        self.start_time: Optional[float] = None

    def __enter__(self):
        self.start_time = time.time()
        self.logger.debug(
            f"{self.operation} started",
            extra={**self.extra, 'operation': self.operation}
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000

        log_extra = {
            **self.extra,
            'operation': self.operation,
            'duration_ms': round(duration_ms, 2),
        }

        if exc_type is None:
            # Success
            self.logger.log(
                getattr(logging, self.level.value),
                f"{self.operation} completed",
                extra=log_extra
            )
        else:
            # Exception occurred
            self.logger.error(
                f"{self.operation} failed",
                exc_info=(exc_type, exc_val, exc_tb),
                extra=log_extra
            )

        return False  # Don't suppress exception


# Batch logging helper

class BatchLogger:
    """
    Collect logs in batch and emit as single structured log.

    Useful for aggregating related operations (e.g., bulk insert results).

    Usage:
        batch = BatchLogger(logger, "Bulk evidence upload")
        for file in files:
            try:
                result = upload_file(file)
                batch.success(f"Uploaded {file.name}")
            except Exception as e:
                batch.error(f"Failed {file.name}", error=str(e))
        batch.emit()
    """

    def __init__(self, logger: logging.Logger, operation: str):
        self.logger = logger
        self.operation = operation
        self.successes: List[str] = []
        self.errors: List[Dict[str, Any]] = []
        self.start_time = time.time()

    def success(self, message: str, **kwargs) -> None:
        """Record successful operation."""
        self.successes.append(message)

    def error(self, message: str, **kwargs) -> None:
        """Record failed operation."""
        self.errors.append({'message': message, **kwargs})

    def emit(self, level: LogLevel = LogLevel.INFO) -> None:
        """Emit batch log summary."""
        duration_ms = (time.time() - self.start_time) * 1000

        total = len(self.successes) + len(self.errors)
        success_count = len(self.successes)
        error_count = len(self.errors)

        self.logger.log(
            getattr(logging, level.value),
            f"{self.operation} batch completed",
            extra={
                'operation': self.operation,
                'total': total,
                'success_count': success_count,
                'error_count': error_count,
                'duration_ms': round(duration_ms, 2),
                'errors': self.errors if self.errors else None,
            }
        )


# Default logger instance
default_logger = get_logger('backend')

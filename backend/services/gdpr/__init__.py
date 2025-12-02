"""
GDPR compliance services for Justice Companion.

This package provides services for GDPR Articles 17 and 20:
- Article 17: Right to Erasure (data deletion)
- Article 20: Data Portability (data export)

Main Service:
- GdprService: Orchestrates export and deletion with rate limiting and audit logging
"""

from .data_deleter import DataDeleter, GdprDeleteOptions, GdprDeleteResult
from .data_exporter import (
    DataExporter,
    TableExport,
    ExportMetadata,
    UserDataExport,
    GdprExportOptions,
)
from .gdpr_service import (
    GdprService,
    GdprExportResult,
    GdprDeleteResultExtended,
    RateLimitError,
    ConsentRequiredError,
    GdprOperationError,
    create_gdpr_service,
)

__all__ = [
    # Core Services
    "GdprService",
    "DataDeleter",
    "DataExporter",
    # Deletion Models
    "GdprDeleteOptions",
    "GdprDeleteResult",
    "GdprDeleteResultExtended",
    # Export Models
    "TableExport",
    "ExportMetadata",
    "UserDataExport",
    "GdprExportOptions",
    "GdprExportResult",
    # Exceptions
    "RateLimitError",
    "ConsentRequiredError",
    "GdprOperationError",
    # Utilities
    "create_gdpr_service",
]

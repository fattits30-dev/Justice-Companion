"""
Services module for Justice Companion backend.

Domain-organized services:
- ai/: AI and ML services (LAZY LOADED - imported on demand)
- auth/: Authentication and authorization
- security/: Encryption and secure storage
- export/: Document export (PDF, DOCX)
- gdpr/: GDPR compliance
- backup/: Backup management

Performance Note:
AI services (OpenAI, HuggingFace clients) are lazy-loaded to reduce startup time.
Import them directly when needed: from backend.services.ai import UnifiedAIService
"""

from typing import TYPE_CHECKING

# Core Services - loaded eagerly (fast, needed at startup)
from .audit_logger import AuditLogger

# Auth Services - loaded eagerly (fast, needed at startup)
from .auth import (
    AuthenticationError,
    AuthenticationService,
    AuthorizationService,
    AuthService,
    SessionManager,
    SessionPersistenceService,
)
from .consent_service import ConsentService
from .port_manager import (
    PortAllocation,
    PortConfig,
    PortManager,
    PortManagerConfig,
    PortStatus,
    get_port_manager,
)
from .process_manager import (
    ProcessInfo,
    get_process_manager,
    reset_process_manager,
)
from .process_manager import (
    ProcessManager as ProcessManagerClass,
)
from .process_manager import (
    ProcessStatus as ProcessManagerStatus,
)

# Security Services - loaded eagerly (fast, needed at startup)
from .security import (
    DecryptionCache,
    EncryptedData,
    EncryptionNotAvailableError,
    EncryptionService,
    KeyManager,
    SecureStorageError,
    SecureStorageService,
)

# Type hints for lazy-loaded AI services (for IDE support)
if TYPE_CHECKING:
    from .ai import (
        ActionPriority,
        AIProviderConfigService,
        AISDKService,
        AIServiceFactory,
        AIToolDefinitions,
        DocumentType,
        EvidenceImportance,
        IssueSeverity,
        LegalCaseType,
        ModelDownloadService,
        PythonAIClient,
        RAGService,
        StubAIService,
        UKJurisdiction,
        UnifiedAIService,
    )
    from .document_parser_service import DocumentParserService, ParsedDocument


def __getattr__(name: str):
    """
    Lazy import for AI services to reduce startup time.
    AI services import OpenAI/HuggingFace which add ~2 seconds to startup.
    """
    # AI Services - lazy loaded
    ai_exports = {
        "UnifiedAIService",
        "AIServiceFactory",
        "RAGService",
        "AIProviderConfigService",
        "AIToolDefinitions",
        "AISDKService",
        "StubAIService",
        "PythonAIClient",
        "ModelDownloadService",
        "UKJurisdiction",
        "LegalCaseType",
        "DocumentType",
        "ActionPriority",
        "IssueSeverity",
        "EvidenceImportance",
    }

    if name in ai_exports:
        from . import ai

        return getattr(ai, name)

    # Document parser - lazy loaded (imports PDF/OCR libraries)
    if name == "DocumentParserService":
        from .document_parser_service import DocumentParserService

        return DocumentParserService
    if name == "ParsedDocument":
        from .document_parser_service import ParsedDocument

        return ParsedDocument

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    # AI (lazy loaded - imported on demand for faster startup)
    "UnifiedAIService",
    "AIServiceFactory",
    "RAGService",
    "AIProviderConfigService",
    "AIToolDefinitions",
    "AISDKService",
    "StubAIService",
    "PythonAIClient",
    "ModelDownloadService",
    "UKJurisdiction",
    "LegalCaseType",
    "DocumentType",
    "ActionPriority",
    "IssueSeverity",
    "EvidenceImportance",
    # Auth (eager)
    "AuthenticationService",
    "AuthenticationError",
    "AuthService",
    "AuthorizationService",
    "SessionManager",
    "SessionPersistenceService",
    # Security (eager)
    "EncryptionService",
    "EncryptedData",
    "DecryptionCache",
    "KeyManager",
    "SecureStorageService",
    "SecureStorageError",
    "EncryptionNotAvailableError",
    # Core (eager, except DocumentParserService which is lazy)
    "AuditLogger",
    "ConsentService",
    "DocumentParserService",
    "ParsedDocument",
    "PortManager",
    "PortConfig",
    "PortAllocation",
    "PortStatus",
    "PortManagerConfig",
    "get_port_manager",
    "ProcessManagerClass",
    "ProcessInfo",
    "ProcessManagerStatus",
    "get_process_manager",
    "reset_process_manager",
]

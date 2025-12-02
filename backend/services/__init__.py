"""
Services module for Justice Companion backend.

Domain-organized services:
- ai/: AI and ML services
- auth/: Authentication and authorization
- security/: Encryption and secure storage
- export/: Document export (PDF, DOCX)
- gdpr/: GDPR compliance
- backup/: Backup management
"""

# AI Services
from .ai import (
    UnifiedAIService,
    AIServiceFactory,
    RAGService,
    AIProviderConfigService,
    AIToolDefinitions,
    AISDKService,
    StubAIService,
    PythonAIClient,
    ModelDownloadService,
    UKJurisdiction,
    LegalCaseType,
    DocumentType,
    ActionPriority,
    IssueSeverity,
    EvidenceImportance,
)

# Auth Services
from .auth import (
    AuthenticationService,
    AuthenticationError,
    AuthService,
    AuthorizationService,
    SessionManager,
    SessionPersistenceService,
)

# Security Services
from .security import (
    EncryptionService,
    EncryptedData,
    DecryptionCache,
    KeyManager,
    SecureStorageService,
    SecureStorageError,
    EncryptionNotAvailableError,
)

# Core Services (remaining in services/)
from .audit_logger import AuditLogger
from .consent_service import ConsentService
from .document_parser_service import DocumentParserService, ParsedDocument
from .port_manager import (
    PortManager,
    PortConfig,
    PortAllocation,
    PortStatus,
    PortManagerConfig,
    get_port_manager,
)
from .process_manager import (
    ProcessManager as ProcessManagerClass,
    ProcessInfo,
    ProcessStatus as ProcessManagerStatus,
    get_process_manager,
    reset_process_manager,
)

__all__ = [
    # AI
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
    # Auth
    "AuthenticationService",
    "AuthenticationError",
    "AuthService",
    "AuthorizationService",
    "SessionManager",
    "SessionPersistenceService",
    # Security
    "EncryptionService",
    "EncryptedData",
    "DecryptionCache",
    "KeyManager",
    "SecureStorageService",
    "SecureStorageError",
    "EncryptionNotAvailableError",
    # Core
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

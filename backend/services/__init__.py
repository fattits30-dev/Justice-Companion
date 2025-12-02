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
    AuthenticationService,
    AuthenticationError,
    AuthService,
    AuthorizationService,
    SessionManager,
    SessionPersistenceService,
)

# Security Services
    EncryptionService,
    EncryptedData,
    DecryptionCache,
    KeyManager,
    SecureStorageService,
    SecureStorageError,
    EncryptionNotAvailableError,
)

# Core Services (remaining in services/)
    PortManager,
    PortConfig,
    PortAllocation,
    PortStatus,
    PortManagerConfig,
    get_port_manager,
)
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

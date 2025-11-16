"""
Services module for Justice Companion backend.
"""

from .auth_service import AuthenticationService, AuthenticationError
from .encryption_service import EncryptionService, EncryptedData
from .audit_logger import AuditLogger
from .consent_service import ConsentService
from .document_parser_service import DocumentParserService, ParsedDocument
from .secure_storage_service import (
    SecureStorageService,
    SecureStorageError,
    EncryptionNotAvailableError,
    secure_storage,
)
from .ai_provider_config_service import (
    AIProviderConfigService,
    AIProviderType,
    AIProviderMetadata,
    AIProviderConfigInput,
    AIProviderConfigOutput,
    AIProviderConfigSummary,
    ValidationResult,
    TestResult,
    AI_PROVIDER_METADATA,
)
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
    "AuthenticationService",
    "AuthenticationError",
    "EncryptionService",
    "EncryptedData",
    "AuditLogger",
    "ConsentService",
    "DocumentParserService",
    "ParsedDocument",
    "SecureStorageService",
    "SecureStorageError",
    "EncryptionNotAvailableError",
    "secure_storage",
    "AIProviderConfigService",
    "AIProviderType",
    "AIProviderMetadata",
    "AIProviderConfigInput",
    "AIProviderConfigOutput",
    "AIProviderConfigSummary",
    "ValidationResult",
    "TestResult",
    "AI_PROVIDER_METADATA",
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

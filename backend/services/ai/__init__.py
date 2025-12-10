"""
AI Service Module - Multi-Provider AI Integration

This module provides:
- UnifiedAIService: Main AI service with 10 provider support (LAZY)
- AIServiceFactory: Provider factory and configuration (LAZY)
- RAGService: Retrieval-Augmented Generation with FAISS (LAZY)
- AIProviderConfigService: Provider configuration management (EAGER - fast)
- AIToolDefinitions: Tool definitions for AI assistants (LAZY)
- AISDKService: SDK-based AI integration (LAZY - imports OpenAI)
- PythonAIClient: Python AI client wrapper (LAZY)

Performance Note:
Heavy AI services (OpenAI, HuggingFace clients) are lazy-loaded.
Only AIProviderConfigService is loaded eagerly since it's needed for config.
"""

from typing import TYPE_CHECKING

# Eagerly load lightweight provider config service
from .providers import AIProviderConfigService

# Type hints for lazy-loaded services (for IDE support)
if TYPE_CHECKING:
    from .client import PythonAIClientService as PythonAIClient
    from .factory import AIServiceFactory
    from .model_download import ModelDownloadService
    from .rag import RAGService
    from .sdk import AISDKService
    from .service import (
        ActionPriority,
        DocumentType,
        EvidenceImportance,
        IssueSeverity,
        LegalCaseType,
        UKJurisdiction,
        UnifiedAIService,
    )
    from .stub import StubAIService
    from .tools import AIToolDefinitions


def __getattr__(name: str):
    """
    Lazy import for heavy AI services to reduce startup time.
    Services that import OpenAI/HuggingFace clients add ~1.5 seconds.
    """
    # Service module exports
    if name in {
        "UnifiedAIService",
        "UKJurisdiction",
        "LegalCaseType",
        "DocumentType",
        "ActionPriority",
        "IssueSeverity",
        "EvidenceImportance",
    }:
        from . import service

        return getattr(service, name)

    if name == "AIServiceFactory":
        from .factory import AIServiceFactory

        return AIServiceFactory

    if name == "RAGService":
        from .rag import RAGService

        return RAGService

    if name == "AIToolDefinitions":
        from .tools import AIToolDefinitions

        return AIToolDefinitions

    if name == "AISDKService":
        from .sdk import AISDKService

        return AISDKService

    if name == "StubAIService":
        from .stub import StubAIService

        return StubAIService

    if name in {"PythonAIClient", "PythonAIClientService"}:
        from .client import PythonAIClientService

        return PythonAIClientService

    if name == "ModelDownloadService":
        from .model_download import ModelDownloadService

        return ModelDownloadService

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    # Main services
    "UnifiedAIService",
    "AIServiceFactory",
    "RAGService",
    "AIProviderConfigService",
    "AIToolDefinitions",
    "AISDKService",
    "StubAIService",
    "PythonAIClient",
    "ModelDownloadService",
    # Enums
    "UKJurisdiction",
    "LegalCaseType",
    "DocumentType",
    "ActionPriority",
    "IssueSeverity",
    "EvidenceImportance",
]

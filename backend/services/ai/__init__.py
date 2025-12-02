"""
AI Service Module - Multi-Provider AI Integration

This module provides:
- UnifiedAIService: Main AI service with 10 provider support
- AIServiceFactory: Provider factory and configuration
- RAGService: Retrieval-Augmented Generation with FAISS
- AIProviderConfigService: Provider configuration management
- AIToolDefinitions: Tool definitions for AI assistants
"""

    UnifiedAIService,
    UKJurisdiction,
    LegalCaseType,
    DocumentType,
    ActionPriority,
    IssueSeverity,
    EvidenceImportance,
)

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

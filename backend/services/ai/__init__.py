"""
AI Service Module - Multi-Provider AI Integration

This module provides:
- UnifiedAIService: Main AI service with 10 provider support
- AIServiceFactory: Provider factory and configuration
- RAGService: Retrieval-Augmented Generation with FAISS
- AIProviderConfigService: Provider configuration management
- AIToolDefinitions: Tool definitions for AI assistants
"""

from .service import (
    UnifiedAIService,
    UKJurisdiction,
    LegalCaseType,
    DocumentType,
    ActionPriority,
    IssueSeverity,
    EvidenceImportance,
)
from .factory import AIServiceFactory
from .rag import RAGService
from .providers import AIProviderConfigService
from .tools import AIToolDefinitions
from .sdk import AISDKService
from .stub import StubAIService
from .client import PythonAIClientService as PythonAIClient
from .model_download import ModelDownloadService

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

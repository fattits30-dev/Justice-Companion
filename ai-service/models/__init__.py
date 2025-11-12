"""
Pydantic Models Module

Contains request and response models for all AI agents.
All models use Pydantic v2 for validation and serialization.

Author: Justice Companion Team
License: MIT
"""

from .requests import (
    DocumentAnalysisRequest,
    ParsedDocument,
    UserProfile,
)

from .responses import (
    DocumentAnalysisResponse,
    SuggestedCaseData,
    ConfidenceScores,
    ExtractionSource,
    ExtractedFields,
)

__all__ = [
    # Request models
    'DocumentAnalysisRequest',
    'ParsedDocument',
    'UserProfile',

    # Response models
    'DocumentAnalysisResponse',
    'SuggestedCaseData',
    'ConfidenceScores',
    'ExtractionSource',
    'ExtractedFields',
]

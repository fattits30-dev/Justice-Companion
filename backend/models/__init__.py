"""
SQLAlchemy database models for Justice Companion backend.
"""

from backend.models.base import Base
from backend.models.user import User
from backend.models.session import Session
from backend.models.case import Case
from backend.models.evidence import Evidence
from backend.models.profile import UserProfile
from backend.models.consent import Consent, ConsentType
from backend.models.ai_provider_config import AIProviderConfig

__all__ = [
    "Base",
    "User",
    "Session",
    "Case",
    "Evidence",
    "UserProfile",
    "Consent",
    "ConsentType",
    "AIProviderConfig",
]

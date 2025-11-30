"""
SQLAlchemy database models for Justice Companion backend.
"""

from backend.models.ai_provider_config import AIProviderConfig
from backend.models.backup import BackupSettings
from backend.models.base import Base
from backend.models.case import Case
from backend.models.chat import Conversation, Message
from backend.models.consent import Consent, ConsentType
from backend.models.deadline import Deadline
from backend.models.evidence import Evidence
from backend.models.notification import Notification, NotificationPreferences
from backend.models.password_reset import PasswordResetToken
from backend.models.profile import UserProfile
from backend.models.session import Session
from backend.models.tag import Tag
from backend.models.template import CaseTemplate, TemplateUsage
from backend.models.user import User

__all__ = [
    "Base",
    "User",
    "Session",
    "Case",
    "Evidence",
    "Deadline",
    "Tag",
    "CaseTemplate",
    "TemplateUsage",
    "ChatConversation",
    "ChatMessage",
    "UserProfile",
    "Consent",
    "ConsentType",
    "Notification",
    "NotificationPreferences",
    "BackupSettings",
    "AIProviderConfig",
    "PasswordResetToken",
]

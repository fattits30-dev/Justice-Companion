"""
Chat conversation and message models for Justice Companion.

Database schema (from migrations/002_chat_history_and_profile.sql and 011_add_user_ownership.sql):

chat_conversations:
  - id (INTEGER PRIMARY KEY)
  - user_id (INTEGER, FK to users.id)
  - case_id (INTEGER, nullable FK to cases.id)
  - title (TEXT)
  - created_at (TEXT)
  - updated_at (TEXT)
  - message_count (INTEGER)

chat_messages:
  - id (INTEGER PRIMARY KEY)
  - conversation_id (INTEGER, FK to chat_conversations.id)
  - role (TEXT: 'user' | 'assistant' | 'system')
  - content (TEXT)
  - thinking_content (TEXT, nullable)
  - timestamp (TEXT)
  - token_count (INTEGER, nullable)
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from backend.models.base import Base
from datetime import datetime
from typing import Dict, Any


class ChatConversation(Base):
    """Chat conversation model - represents a persistent chat session."""

    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True, index=True)
    title = Column(Text, nullable=False)
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(
        String, nullable=False, default=lambda: datetime.utcnow().isoformat(), index=True
    )
    message_count = Column(Integer, nullable=False, default=0)

    # Relationships
    messages = relationship(
        "ChatMessage", back_populates="conversation", cascade="all, delete-orphan"
    )

    def to_dict(self, include_messages: bool = False) -> Dict[str, Any]:
        """
        Convert conversation to dictionary for JSON serialization.

        Args:
            include_messages: If True, includes all messages in the response

        Returns:
            Dictionary with conversation data
        """
        result = {
            "id": self.id,
            "userId": self.user_id,
            "caseId": self.case_id,
            "title": self.title,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "messageCount": self.message_count,
        }

        if include_messages:
            result["messages"] = [msg.to_dict() for msg in self.messages]

        return result


class ChatMessage(Base):
    """Chat message model - individual messages within a conversation."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(
        Integer, ForeignKey("chat_conversations.id"), nullable=False, index=True
    )
    role = Column(
        String, CheckConstraint("role IN ('user', 'assistant', 'system')"), nullable=False
    )
    content = Column(Text, nullable=False)
    thinking_content = Column(Text, nullable=True)
    timestamp = Column(
        String, nullable=False, default=lambda: datetime.utcnow().isoformat(), index=True
    )
    token_count = Column(Integer, nullable=True)

    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert message to dictionary for JSON serialization.

        Returns:
            Dictionary with message data
        """
        return {
            "id": self.id,
            "conversationId": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "thinkingContent": self.thinking_content,
            "timestamp": self.timestamp,
            "tokenCount": self.token_count,
        }

"""Chat conversation and message models for Justice Companion."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base

class Conversation(Base):
    """Chat conversation model - represents a persistent chat session."""

    __tablename__ = "chat_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    case_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("cases.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(
        String, nullable=False, default=lambda: datetime.utcnow().isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=lambda: datetime.utcnow().isoformat(),
        index=True,
    )
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )

    def to_dict(self, include_messages: bool = False) -> Dict[str, Any]:
        """
        Convert conversation to dictionary for JSON serialization.

        Args:
            include_messages: If True, includes all messages in the response

        Returns:
            Dictionary with conversation data
        """
        result: Dict[str, Any] = {
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

class Message(Base):
    """Chat message model - individual messages within a conversation."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("chat_conversations.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        String,
        CheckConstraint("role IN ('user', 'assistant', 'system')"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    thinking_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=lambda: datetime.utcnow().isoformat(),
        index=True,
    )
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )

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

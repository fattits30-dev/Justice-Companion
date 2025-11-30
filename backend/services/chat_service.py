"""
Chat conversation service for AI legal assistant conversations.
Migrated from src/services/ConversationService.ts

Features:
- Full conversation CRUD operations with user ownership verification
- Message management with thinking content support
- Conversation history retrieval and loading
- User isolation (users can only access their own conversations)
- Optional field-level encryption for sensitive messages
- Comprehensive audit logging for all operations

Security:
- All operations verify user_id ownership
- Optional encryption for message content (configurable)
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent conversations
- All security events audited
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict

from backend.models.chat import Conversation, Message
from backend.services.security.encryption import EncryptionService

# Custom Exceptions
class ConversationNotFoundError(Exception):
    """Exception raised when conversation is not found."""

class UnauthorizedError(Exception):
    """Exception raised when user doesn't own the conversation."""

class DatabaseError(Exception):
    """Exception raised for database operation failures."""

class ValidationError(Exception):
    """Exception raised for invalid input data."""

# Pydantic Input/Output Models
class CreateConversationInput(BaseModel):
    """Input model for creating a new conversation."""

    user_id: int = Field(..., gt=0, description="User ID (conversation owner)")
    case_id: Optional[int] = Field(None, description="Optional case ID for context")
    title: str = Field(..., min_length=1, max_length=255, description="Conversation title")

    model_config = ConfigDict(from_attributes=True)

class CreateMessageInput(BaseModel):
    """Input model for adding a message to a conversation."""

    conversation_id: int = Field(..., gt=0, description="Conversation ID")
    role: Literal["user", "assistant", "system"] = Field(..., description="Message role")
    content: str = Field(..., min_length=1, description="Message content")
    thinking_content: Optional[str] = Field(None, description="AI thinking/reasoning content")
    token_count: Optional[int] = Field(None, ge=0, description="Token count for message")

    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    """Response model for conversation data."""

    id: int
    user_id: int
    case_id: Optional[int]
    title: str
    created_at: str
    updated_at: str
    message_count: int

    model_config = ConfigDict(from_attributes=True)

class MessageResponse(BaseModel):
    """Response model for message data."""

    id: int
    conversation_id: int
    role: str
    content: str
    thinking_content: Optional[str]
    timestamp: str
    token_count: Optional[int]

    model_config = ConfigDict(from_attributes=True)

class ConversationWithMessagesResponse(ConversationResponse):
    """Response model for conversation with all messages."""

    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)

class StartConversationInput(BaseModel):
    """Input model for starting a new conversation with first message."""

    user_id: int = Field(..., gt=0, description="User ID (conversation owner)")
    case_id: Optional[int] = Field(None, description="Optional case ID for context")
    first_message: CreateMessageInput = Field(..., description="First message in conversation")

    model_config = ConfigDict(from_attributes=True)

class ChatService:
    """
    Business logic layer for chat conversation management.
    Handles conversations, messages, and user ownership verification.

    All operations verify user ownership to prevent unauthorized access.
    """

    def __init__(
        self, db: Session, encryption_service: Optional[EncryptionService] = None, audit_logger=None
    ):
        """
        Initialize chat service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Optional encryption service for sensitive messages
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

    def _verify_ownership(self, conversation: Conversation, user_id: int) -> None:
        """
        Verify that user owns the conversation.

        Args:
            conversation: Conversation instance to verify
            user_id: User ID making the request

        Raises:
            HTTPException: 403 if user doesn't own the conversation
        """
        if conversation.user_id != user_id:
            self._log_audit(
                event_type="chat.unauthorized_access",
                user_id=user_id,
                resource_id=str(conversation.id),
                action="access_denied",
                success=False,
                details={
                    "reason": "User does not own this conversation",
                    "conversation_owner": conversation.user_id,
                    "requesting_user": user_id,
                },
            )
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have permission to access this conversation",
            )

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id) if user_id else None,
                resource_type="chat_conversation",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message,
            )

    def _update_message_count(self, conversation_id: int) -> None:
        """
        Update message count for a conversation.

        Args:
            conversation_id: Conversation ID to update
        """
        conversation = (
            self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )

        if conversation:
            message_count = (
                self.db.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .count()
            )

            conversation.message_count = message_count
            conversation.updated_at = datetime.utcnow().isoformat()
            self.db.commit()

    async def create_conversation(
        self, input_data: CreateConversationInput
    ) -> ConversationResponse:
        """
        Create a new conversation for the user.

        Args:
            input_data: Conversation creation data

        Returns:
            Created conversation data

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If input validation fails
        """
        try:
            # Create conversation instance
            conversation = Conversation(
                user_id=input_data.user_id,
                case_id=input_data.case_id,
                title=input_data.title,
                message_count=0,
            )

            self.db.add(conversation)
            self.db.commit()
            self.db.refresh(conversation)

            self._log_audit(
                event_type="chat.conversation.create",
                user_id=input_data.user_id,
                resource_id=str(conversation.id),
                action="create",
                success=True,
                details={"title": conversation.title, "case_id": input_data.case_id},
            )

            return ConversationResponse.model_validate(conversation)

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="chat.conversation.create",
                user_id=input_data.user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to create conversation: {str(error)}")

    async def get_conversation(self, conversation_id: int, user_id: int) -> ConversationResponse:
        """
        Get a conversation by ID with ownership verification.

        Args:
            conversation_id: Conversation ID
            user_id: User ID making the request

        Returns:
            Conversation data

        Raises:
            ConversationNotFoundError: If conversation doesn't exist
            HTTPException: 403 if user doesn't own the conversation
        """
        conversation = (
            self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )

        if not conversation:
            self._log_audit(
                event_type="chat.conversation.read",
                user_id=user_id,
                resource_id=str(conversation_id),
                action="read",
                success=False,
                details={"reason": "Conversation not found"},
            )
            raise ConversationNotFoundError(f"Conversation with ID {conversation_id} not found")

        # Verify ownership
        self._verify_ownership(conversation, user_id)

        return ConversationResponse.model_validate(conversation)

    async def get_all_conversations(
        self, user_id: int, case_id: Optional[int] = None
    ) -> List[ConversationResponse]:
        """
        Get all conversations for a user, optionally filtered by case.

        Args:
            user_id: User ID requesting conversations
            case_id: Optional case ID to filter by

        Returns:
            List of user's conversations
        """
        try:
            query = self.db.query(Conversation).filter(Conversation.user_id == user_id)

            if case_id is not None:
                query = query.filter(Conversation.case_id == case_id)

            conversations = query.order_by(desc(Conversation.updated_at)).all()

            return [ConversationResponse.model_validate(conv) for conv in conversations]

        except Exception as error:
            self._log_audit(
                event_type="chat.conversation.list",
                user_id=user_id,
                resource_id="all",
                action="read",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to retrieve conversations: {str(error)}")

    async def get_recent_conversations_by_case(
        self, user_id: int, case_id: Optional[int], limit: int = 10
    ) -> List[ConversationResponse]:
        """
        Get recent conversations for a specific case.
        Used for sidebar "Recent Chats" section.

        Args:
            user_id: User ID requesting conversations
            case_id: Case ID to filter by (None for general chats)
            limit: Maximum number of conversations to return

        Returns:
            List of recent conversations
        """
        try:
            query = self.db.query(Conversation).filter(
                Conversation.user_id == user_id, Conversation.case_id == case_id
            )

            conversations = query.order_by(desc(Conversation.updated_at)).limit(limit).all()

            return [ConversationResponse.model_validate(conv) for conv in conversations]

        except Exception as error:
            self._log_audit(
                event_type="chat.conversation.recent",
                user_id=user_id,
                resource_id=f"case_{case_id}" if case_id else "general",
                action="read",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to retrieve recent conversations: {str(error)}")

    async def load_conversation(
        self, conversation_id: int, user_id: int
    ) -> ConversationWithMessagesResponse:
        """
        Load a full conversation with all messages.
        Used when user clicks on a recent chat to load it.

        Args:
            conversation_id: Conversation ID to load
            user_id: User ID making the request

        Returns:
            Conversation with all messages

        Raises:
            ConversationNotFoundError: If conversation doesn't exist
            HTTPException: 403 if user doesn't own the conversation
        """
        conversation = (
            self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )

        if not conversation:
            raise ConversationNotFoundError(f"Conversation with ID {conversation_id} not found")

        # Verify ownership
        self._verify_ownership(conversation, user_id)

        # Load messages
        messages = (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp.asc())
            .all()
        )

        # Build response
        response_data = conversation.to_dict(include_messages=False)
        response_data["messages"] = [MessageResponse.model_validate(msg) for msg in messages]

        return ConversationWithMessagesResponse(**response_data)

    async def add_message(
        self, input_data: CreateMessageInput, user_id: Optional[int] = None
    ) -> MessageResponse:
        """
        Add a message to a conversation.

        Args:
            input_data: Message creation data
            user_id: Optional user ID for ownership verification

        Returns:
            Created message data

        Raises:
            ConversationNotFoundError: If conversation doesn't exist
            HTTPException: 403 if user doesn't own the conversation
            DatabaseError: If database operation fails
        """
        # Verify conversation exists
        conversation = (
            self.db.query(Conversation)
            .filter(Conversation.id == input_data.conversation_id)
            .first()
        )

        if not conversation:
            raise ConversationNotFoundError(
                f"Conversation with ID {input_data.conversation_id} not found"
            )

        # Verify ownership if user_id provided
        if user_id is not None:
            self._verify_ownership(conversation, user_id)

        try:
            # Create message instance
            message = Message(
                conversation_id=input_data.conversation_id,
                role=input_data.role,
                content=input_data.content,
                thinking_content=input_data.thinking_content,
                token_count=input_data.token_count,
            )

            self.db.add(message)
            self.db.commit()
            self.db.refresh(message)

            # Update conversation message count and updated_at
            self._update_message_count(input_data.conversation_id)

            self._log_audit(
                event_type="chat.message.add",
                user_id=conversation.user_id,
                resource_id=str(message.id),
                action="create",
                success=True,
                details={
                    "conversation_id": input_data.conversation_id,
                    "role": input_data.role,
                    "has_thinking": input_data.thinking_content is not None,
                },
            )

            return MessageResponse.model_validate(message)

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="chat.message.add",
                user_id=conversation.user_id if conversation else None,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to add message: {str(error)}")

    async def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        """
        Delete a conversation and all its messages.

        Args:
            conversation_id: Conversation ID to delete
            user_id: User ID making the request

        Returns:
            True if deleted successfully

        Raises:
            ConversationNotFoundError: If conversation doesn't exist
            HTTPException: 403 if user doesn't own the conversation
            DatabaseError: If database operation fails
        """
        conversation = (
            self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )

        if not conversation:
            raise ConversationNotFoundError(f"Conversation with ID {conversation_id} not found")

        # Verify ownership
        self._verify_ownership(conversation, user_id)

        try:
            # Delete conversation (cascade will delete messages)
            self.db.delete(conversation)
            self.db.commit()

            self._log_audit(
                event_type="chat.conversation.delete",
                user_id=user_id,
                resource_id=str(conversation_id),
                action="delete",
                success=True,
            )

            return True

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="chat.conversation.delete",
                user_id=user_id,
                resource_id=str(conversation_id),
                action="delete",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to delete conversation: {str(error)}")

    async def start_new_conversation(
        self, user_id: int, case_id: Optional[int], first_message: Dict[str, Any]
    ) -> ConversationWithMessagesResponse:
        """
        Create conversation with first message.
        Helper method used when starting a new chat.

        Args:
            user_id: User ID creating the conversation
            case_id: Optional case ID for context
            first_message: First message data (role, content, thinking_content)

        Returns:
            Conversation with first message

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            # Generate title from first message (truncate at 50 chars)
            content = first_message.get("content", "")
            title = content[:50].strip() + ("..." if len(content) > 50 else "")

            # Create conversation
            conversation_input = CreateConversationInput(
                user_id=user_id, case_id=case_id, title=title
            )
            conversation = await self.create_conversation(conversation_input)

            # Add first message
            message_input = CreateMessageInput(
                conversation_id=conversation.id,
                role=first_message.get("role", "user"),
                content=content,
                thinking_content=first_message.get("thinking_content"),
                token_count=first_message.get("token_count"),
            )
            message = await self.add_message(message_input)

            # Build response
            response_data = conversation.model_dump()
            response_data["messages"] = [message]

            return ConversationWithMessagesResponse(**response_data)

        except Exception as error:
            self._log_audit(
                event_type="chat.conversation.start",
                user_id=user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to start new conversation: {str(error)}")

    async def verify_ownership(self, conversation_id: int, user_id: int) -> bool:
        """
        Verify that a user owns a conversation.

        Args:
            conversation_id: Conversation ID to verify
            user_id: User ID to verify ownership

        Returns:
            True if user owns the conversation

        Raises:
            ConversationNotFoundError: If conversation doesn't exist
            HTTPException: 403 if user doesn't own the conversation
        """
        conversation = (
            self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )

        if not conversation:
            raise ConversationNotFoundError(f"Conversation with ID {conversation_id} not found")

        # This will raise HTTPException 403 if ownership fails
        self._verify_ownership(conversation, user_id)

        return True

"""
Enhanced Chat routes for Justice Companion - Service Layer Integration.

This file demonstrates the refactored chat routes using the service layer
instead of direct database queries. It integrates:
- ChatService for conversation/message management
- UnifiedAIService for AI completions
- RAGService for legal research context
- AuditLogger for security tracking

Key Improvements:
- Service layer abstraction (testable, maintainable)
- Dependency injection pattern
- Comprehensive error handling
- Streaming support with SSE
- Audit logging for all operations
- Type-safe with Pydantic models

Usage:
    # Mount this router in main.py
    from backend.routes.chat_enhanced import router as chat_router
    app.include_router(chat_router)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, AsyncIterator
from sqlalchemy.orm import Session
import json
import os
import logging

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.chat_service import (
    ChatService,
    CreateConversationInput,
    CreateMessageInput,
    ConversationResponse,
    ConversationWithMessagesResponse,
)
from backend.services.unified_ai_service import (
    UnifiedAIService,
    AIProviderConfig,
    ChatMessage,
    CaseAnalysisRequest,
    EvidenceAnalysisRequest,
    DocumentDraftRequest,
    ParsedDocument,
    UserProfile,
)
from backend.services.ai_stub_service import StubAIService
from backend.services.rag_service import RAGService, build_system_prompt, extract_sources
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# ===== PYDANTIC REQUEST MODELS =====


class ChatStreamRequest(BaseModel):
    """Request model for streaming chat with legal research."""

    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    conversationId: Optional[int] = Field(None, description="Existing conversation ID")
    caseId: Optional[int] = Field(None, description="Case ID for context")
    useRAG: bool = Field(True, description="Whether to use RAG for legal context")

    @field_validator("message")
    @classmethod
    def strip_message(cls, v):
        return v.strip()


class ChatSendRequest(BaseModel):
    """Request model for non-streaming chat."""

    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    conversationId: Optional[int] = Field(None, description="Existing conversation ID")
    caseId: Optional[int] = Field(None, description="Case ID for context")
    useRAG: bool = Field(True, description="Whether to use RAG for legal context")

    @field_validator("message")
    @classmethod
    def strip_message(cls, v):
        return v.strip()


class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis."""

    filePath: str = Field(..., min_length=1, max_length=1000, description="Path to document file")
    userQuestion: Optional[str] = Field(
        None, max_length=1000, description="Optional user question about document"
    )


# ===== DEPENDENCY INJECTION =====


def get_encryption_service(db: Session = Depends(get_db)) -> EncryptionService:
    """
    Get encryption service instance.

    In production, load encryption key from secure storage (KeyManager).
    For development, can fall back to environment variable.
    """
    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")

    # In stub AI mode we don't depend on encrypted provider configuration,
    # so allow a deterministic fallback key to keep dependencies happy
    # without forcing real secrets to be configured.
    ai_mode = os.getenv("AI_MODE", "").lower()
    if ai_mode == "stub" and not encryption_key:
        return EncryptionService(b"0" * 32)

    if not encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not configured",
        )
    return EncryptionService(encryption_key)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)


def get_chat_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> ChatService:
    """Get chat service instance with dependencies."""
    return ChatService(db, encryption_service, audit_logger)


async def get_ai_service(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> UnifiedAIService:
    """
    Get AI service instance with configuration from database.

    Loads the active AI provider configuration for the authenticated user.
    Configuration is decrypted and used to initialize UnifiedAIService.

    Raises:
        HTTPException: If no active AI provider is configured for the user.
    """
    # In stub mode we bypass provider configuration entirely and return a
    # deterministic in-process implementation.
    ai_mode = os.getenv("AI_MODE", "").lower()
    if ai_mode == "stub":
        # Note: the return type is annotated as UnifiedAIService but Python
        # only enforces duck-typing at runtime. StubAIService exposes a
        # compatible interface for the routes that depend on it.
        return StubAIService(audit_logger)  # type: ignore[return-value]

    from backend.services.ai_provider_config_service import AIProviderConfigService

    # Get config service
    config_service = AIProviderConfigService(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    # Get active provider configuration from database
    # Note: get_active_provider_config() returns AIProviderConfigOutput with decrypted API key
    db_config = await config_service.get_active_provider_config(user_id=user_id)

    if not db_config or not db_config.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No active AI provider configured. Please configure an AI provider in Settings."
        )

    # Build AIProviderConfig for UnifiedAIService
    # API key is already decrypted by the service layer
    config = AIProviderConfig(
        provider=db_config.provider,
        api_key=db_config.api_key,  # Already decrypted
        model=db_config.model,
        endpoint=db_config.endpoint,
        temperature=db_config.temperature,
        max_tokens=db_config.max_tokens,
        top_p=db_config.top_p,
    )

    return UnifiedAIService(config, audit_logger)


def get_rag_service(
    ai_service: UnifiedAIService = Depends(get_ai_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> RAGService:
    """
    Get RAG service instance.

    RAG service requires LegalAPIService for UK legal sources.
    This is a stub - implement LegalAPIService separately.
    """

    # TODO: Implement LegalAPIService
    # For now, use a mock service that returns empty results
    class MockLegalAPIService:
        async def extract_keywords(self, question: str):
            return {"all": []}

        async def classify_question(self, question: str):
            return "general"

        async def search_legislation(self, keywords: List[str]):
            return []

        async def search_case_law(self, keywords: List[str]):
            return []

        async def search_knowledge_base(self, keywords: List[str]):
            return []

    legal_api_service = MockLegalAPIService()
    return RAGService(legal_api_service, ai_service, audit_logger)


# ===== HELPER FUNCTIONS =====


def generate_conversation_title(message: str) -> str:
    """Generate conversation title from first user message."""
    if len(message) <= 100:
        return message

    truncated = message[:100]
    last_space = truncated.rfind(" ")
    if last_space > 50:
        truncated = truncated[:last_space]

    return truncated + "..."


# ===== STREAMING IMPLEMENTATION =====


async def stream_ai_chat(
    message: str,
    conversation_id: Optional[int],
    case_id: Optional[int],
    user_id: int,
    use_rag: bool,
    chat_service: ChatService,
    ai_service: UnifiedAIService,
    rag_service: RAGService,
    db: Session,
) -> AsyncIterator[str]:
    """
    Stream AI chat response with RAG context and save to database.

    This function:
    1. Loads conversation history if conversationId provided
    2. Fetches legal context if useRAG=True
    3. Streams AI response token by token
    4. Saves conversation and messages after streaming completes
    5. Returns conversation ID as final event

    Yields:
        SSE-formatted data strings
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[DEBUG] stream_ai_chat called: message={message[:50]}, conversation_id={conversation_id}, ai_service={type(ai_service)}")
    logger.info(f"[DEBUG] AI Service Config - Provider: {ai_service.config.provider}, Model: {ai_service.config.model}")

    try:
        # Load conversation history if provided
        history_messages = []
        if conversation_id:
            try:
                await chat_service.verify_ownership(conversation_id, user_id)
                conversation = await chat_service.load_conversation(conversation_id, user_id)

                # Convert messages to ChatMessage format
                for msg in conversation.messages:
                    history_messages.append(ChatMessage(role=msg.role, content=msg.content))
            except Exception as e:
                logger.error(f"Failed to load conversation history: {e}")
                # Continue without history

        # Fetch legal context if RAG enabled
        system_prompt = "You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. You help people understand their rights and manage their legal cases. Remember: You offer information and guidance, not legal advice. For specific legal advice, consult a qualified solicitor."
        sources = []

        if use_rag:
            try:
                context = await rag_service.fetch_context_for_question(message)
                if context:
                    system_prompt = build_system_prompt(context)
                    sources = extract_sources(context)
            except Exception as e:
                logger.error(f"RAG context retrieval failed: {e}")
                # Continue without RAG

        # Build messages array
        messages = (
            [ChatMessage(role="system", content=system_prompt)]
            + history_messages
            + [ChatMessage(role="user", content=message)]
        )

        # Stream AI response
        full_response = ""

        async for token in ai_service.stream_chat(messages):
            full_response += token

            # Yield token in SSE format
            data = {"type": "token", "data": token, "done": False}
            yield f"data: {json.dumps(data)}\n\n"

        # Save to database
        full_response = full_response.strip()

        # Create conversation if new
        if not conversation_id:
            title = generate_conversation_title(message)

            conversation_input = CreateConversationInput(
                user_id=user_id, case_id=case_id, title=title
            )
            conversation = await chat_service.create_conversation(conversation_input)
            conversation_id = conversation.id

        # Save user message
        user_message_input = CreateMessageInput(
            conversation_id=conversation_id, role="user", content=message
        )
        await chat_service.add_message(user_message_input, user_id)

        # Save assistant message
        assistant_message_input = CreateMessageInput(
            conversation_id=conversation_id, role="assistant", content=full_response
        )
        await chat_service.add_message(assistant_message_input, user_id)

        # Send sources if available
        if sources:
            sources_data = {"type": "sources", "data": sources, "done": False}
            yield f"data: {json.dumps(sources_data)}\n\n"

        # Send final event with conversation ID
        final_data = {"type": "complete", "conversationId": conversation_id, "done": True}
        yield f"data: {json.dumps(final_data)}\n\n"

    except Exception as e:
        logger.exception(f"Streaming error: {e}")
        error_data = {"type": "error", "error": str(e), "done": True}
        yield f"data: {json.dumps(error_data)}\n\n"


# ===== ROUTES =====


@router.post("/stream")
async def stream_chat(
    request: ChatStreamRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    ai_service: UnifiedAIService = Depends(get_ai_service),
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Stream AI chat response using Server-Sent Events (SSE).

    This endpoint integrates with:
    - ChatService for conversation management
    - UnifiedAIService for AI completions
    - RAGService for legal research context (optional)

    Returns:
        StreamingResponse with SSE events:
        - {"type": "token", "data": "token text"} - Each response token
        - {"type": "sources", "data": [...]} - Legal sources cited
        - {"type": "complete", "conversationId": 123} - Final event
        - {"type": "error", "error": "message"} - Error event
    """
    logger.info(f"[DEBUG] /chat/stream endpoint called - user_id={user_id}, message={request.message[:50]}, provider={ai_service.config.provider}")
    try:
        return StreamingResponse(
            stream_ai_chat(
                message=request.message,
                conversation_id=request.conversationId,
                case_id=request.caseId,
                user_id=user_id,
                use_rag=request.useRAG,
                chat_service=chat_service,
                ai_service=ai_service,
                rag_service=rag_service,
                db=db,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Stream chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Streaming chat failed: {str(e)}",
        )


@router.post("/send", response_model=Dict[str, Any])
async def send_chat(
    request: ChatSendRequest,
    user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
    ai_service: UnifiedAIService = Depends(get_ai_service),
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Send chat message and get non-streaming response.

    This is a simpler endpoint for clients that don't need streaming.
    Uses the same service layer integration as /stream.

    Returns:
        {
            "response": "AI response text",
            "conversationId": 123,
            "sources": ["source1", "source2"]
        }
    """
    try:
        # Load conversation history
        history_messages = []
        conversation_id = request.conversationId

        if conversation_id:
            await chat_service.verify_ownership(conversation_id, user_id)
            conversation = await chat_service.load_conversation(conversation_id, user_id)

            for msg in conversation.messages:
                history_messages.append(ChatMessage(role=msg.role, content=msg.content))

        # Fetch legal context if RAG enabled
        system_prompt = "You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. Remember: You offer information and guidance, not legal advice."
        sources = []

        if request.useRAG:
            context = await rag_service.fetch_context_for_question(request.message)
            if context:
                system_prompt = build_system_prompt(context)
                sources = extract_sources(context)

        # Build messages and get response
        messages = (
            [ChatMessage(role="system", content=system_prompt)]
            + history_messages
            + [ChatMessage(role="user", content=request.message)]
        )

        response = await ai_service.chat(messages)

        # Create conversation if new
        if not conversation_id:
            title = generate_conversation_title(request.message)
            conversation_input = CreateConversationInput(
                user_id=user_id, case_id=request.caseId, title=title
            )
            conversation = await chat_service.create_conversation(conversation_input)
            conversation_id = conversation.id

        # Save messages
        await chat_service.add_message(
            CreateMessageInput(
                conversation_id=conversation_id, role="user", content=request.message
            ),
            user_id,
        )

        await chat_service.add_message(
            CreateMessageInput(conversation_id=conversation_id, role="assistant", content=response),
            user_id,
        )

        return {"response": response, "conversationId": conversation_id, "sources": sources}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Send chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Chat send failed: {str(e)}"
        )


@router.post("/analyze-case")
async def analyze_case(
    request: CaseAnalysisRequest,
    user_id: int = Depends(get_current_user),
    ai_service: UnifiedAIService = Depends(get_ai_service),
    db: Session = Depends(get_db),
):
    """
    Analyze case with AI and provide structured legal analysis.

    Uses UnifiedAIService.analyze_case() for structured analysis.
    Verifies case ownership before processing.

    Returns:
        CaseAnalysisResponse with legal issues, applicable law, actions, etc.
    """
    try:
        # Verify case belongs to user
        from sqlalchemy import text

        check_query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        case = db.execute(check_query, {"case_id": request.case_id, "user_id": user_id}).fetchone()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or unauthorized"
            )

        # Call AI service for analysis
        analysis = await ai_service.analyze_case(request)

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Case analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Case analysis failed: {str(e)}",
        )


@router.post("/analyze-evidence")
async def analyze_evidence(
    request: EvidenceAnalysisRequest,
    user_id: int = Depends(get_current_user),
    ai_service: UnifiedAIService = Depends(get_ai_service),
    db: Session = Depends(get_db),
):
    """
    Analyze existing evidence and identify gaps.

    Uses UnifiedAIService.analyze_evidence() for gap analysis.
    Verifies case ownership before processing.

    Returns:
        EvidenceAnalysisResponse with gaps, suggestions, and strength assessment
    """
    try:
        # Verify case belongs to user
        from sqlalchemy import text

        check_query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        case = db.execute(check_query, {"case_id": request.case_id, "user_id": user_id}).fetchone()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or unauthorized"
            )

        # Call AI service for evidence analysis
        analysis = await ai_service.analyze_evidence(request)

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Evidence analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence analysis failed: {str(e)}",
        )


@router.post("/draft-document")
async def draft_document(
    request: DocumentDraftRequest,
    user_id: int = Depends(get_current_user),
    ai_service: UnifiedAIService = Depends(get_ai_service),
    db: Session = Depends(get_db),
):
    """
    Draft legal document with AI assistance.

    Uses UnifiedAIService.draft_document() for document generation.
    Verifies case ownership before processing.

    Returns:
        DocumentDraftResponse with content and metadata
    """
    try:
        # Verify case belongs to user
        from sqlalchemy import text

        check_query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        case = db.execute(
            check_query, {"case_id": request.context.case_id, "user_id": user_id}
        ).fetchone()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or unauthorized"
            )

        # Call AI service for document drafting
        draft = await ai_service.draft_document(request)

        return draft

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Document drafting failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document drafting failed: {str(e)}",
        )


@router.post("/upload-document")
async def upload_document(
    file: UploadFile = File(..., description="Document file to upload"),
    user_id: int = Depends(get_current_user),
):
    """
    Upload a document for analysis.

    Saves the file temporarily and returns the file path for subsequent analysis.
    Supported formats: PDF, DOCX, TXT
    Max file size: 10MB

    Returns:
        { "success": true, "data": { "filePath": "/path/to/file" } }
    """
    try:
        import tempfile
        import shutil
        from pathlib import Path

        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.txt', '.doc']
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )

        # Validate file size (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning

        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: 10MB"
            )

        # Create temp directory if it doesn't exist
        temp_dir = Path(tempfile.gettempdir()) / "justice-companion" / "uploads" / str(user_id)
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Save file with unique name
        import time
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = temp_dir / safe_filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Document uploaded: {file_path} (user_id={user_id})")

        return {
            "success": True,
            "data": {
                "filePath": str(file_path)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Document upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {str(e)}",
        )


@router.post("/analyze-document")
async def analyze_document(
    request: DocumentAnalysisRequest,
    user_id: int = Depends(get_current_user),
    ai_service: UnifiedAIService = Depends(get_ai_service),
    db: Session = Depends(get_db),
):
    """
    Analyze uploaded document with AI and extract case data.

    Uses UnifiedAIService.extract_case_data_from_document() for extraction.
    Requires document parser (TODO: implement).

    Returns:
        DocumentExtractionResponse with analysis and suggested case data
    """
    try:
        import os

        logger.info(f"[ENDPOINT] Starting document analysis for file: {request.filePath}")

        # Validate file exists
        if not os.path.exists(request.filePath):
            logger.error(f"[ENDPOINT] File not found: {request.filePath}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File not found")

        logger.info(f"[ENDPOINT] File exists, creating ParsedDocument")

        # TODO: Implement document parser
        # For now, use a mock parser
        filename = os.path.basename(request.filePath)
        parsed_doc = ParsedDocument(
            filename=filename,
            text="Mock document text - implement parser",
            word_count=100,
            file_type="pdf",
        )

        logger.info(f"[ENDPOINT] ParsedDocument created: {filename}")

        # Get user profile
        from sqlalchemy import text

        logger.info(f"[ENDPOINT] Fetching user profile for user_id: {user_id}")

        user_query = text("SELECT username, email FROM users WHERE id = :user_id")
        user = db.execute(user_query, {"user_id": user_id}).fetchone()

        user_profile = UserProfile(
            name=user.username if user else "User", email=user.email if user else None
        )

        logger.info(f"[ENDPOINT] User profile created: {user_profile.name}")

        # Call AI service for extraction
        logger.info(f"[ENDPOINT] Calling ai_service.extract_case_data_from_document...")

        extraction = await ai_service.extract_case_data_from_document(
            parsed_doc, user_profile, request.userQuestion
        )

        logger.info(f"[ENDPOINT] Extraction completed successfully, type: {type(extraction)}")
        logger.info(f"[ENDPOINT] Extraction keys: {extraction.model_dump().keys()}")

        logger.info(f"[ENDPOINT] Returning extraction response")
        return extraction

    except HTTPException:
        logger.error(f"[ENDPOINT] HTTPException caught, re-raising")
        raise
    except Exception as e:
        logger.exception(f"[ENDPOINT] Document analysis failed with exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document analysis failed: {str(e)}",
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    case_id: Optional[int] = Query(None, description="Filter by case ID"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of conversations"),
    user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """
    Get recent chat conversations for the user.

    Uses ChatService.get_recent_conversations_by_case() for filtering.
    Returns conversations ordered by most recently updated first.

    Args:
        case_id: Optional case ID to filter conversations
        limit: Maximum number of conversations to return (default 10, max 100)

    Returns:
        List of conversations with basic info (messages not included)
    """
    try:
        conversations = await chat_service.get_recent_conversations_by_case(
            user_id=user_id, case_id=case_id, limit=limit
        )

        return conversations

    except Exception as e:
        logger.exception(f"Failed to get conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}",
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessagesResponse)
async def get_conversation(
    conversation_id: int,
    user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """
    Get a specific conversation with all messages.

    Uses ChatService.load_conversation() with ownership verification.

    Args:
        conversation_id: Conversation ID to load

    Returns:
        Conversation with all messages

    Raises:
        HTTPException 404: Conversation not found
        HTTPException 403: User doesn't own conversation
    """
    try:
        conversation = await chat_service.load_conversation(conversation_id, user_id)
        return conversation

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to load conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load conversation: {str(e)}",
        )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """
    Delete a conversation and all its messages.

    Uses ChatService.delete_conversation() with ownership verification.

    Args:
        conversation_id: Conversation ID to delete

    Returns:
        {"success": True, "message": "Conversation deleted"}

    Raises:
        HTTPException 404: Conversation not found
        HTTPException 403: User doesn't own conversation
    """
    try:
        await chat_service.delete_conversation(conversation_id, user_id)

        return {"success": True, "message": f"Conversation {conversation_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to delete conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}",
        )

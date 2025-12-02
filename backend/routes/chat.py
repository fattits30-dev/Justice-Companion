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

import json
import logging
import os
import re
import secrets
import tempfile
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional

from fastapi import (APIRouter, Depends, File, HTTPException, Query,
                     UploadFile, status)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.ai.stub import StubAIService
from backend.services.audit_logger import AuditLogger
from backend.services.chat_service import (ChatService, ConversationResponse,
                                           ConversationWithMessagesResponse,
                                           CreateConversationInput,
                                           CreateMessageInput)
from backend.services.security.encryption import EncryptionService
from backend.services.ai.rag import (RAGService, build_system_prompt,
                                          extract_sources)
from backend.services.ai.service import (CaseAnalysisRequest,
                                                 ChatMessage,
                                                 DocumentDraftRequest,
                                                 EvidenceAnalysisRequest,
                                                 ParsedDocument,
                                                 UnifiedAIService, UserProfile)

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
    @classmethod
    def strip_message(cls, v):
        return v.strip()

class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis."""

    filePath: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description=(
            "Server-provided document identifier from /chat/upload-document"
        ),
    )
    userQuestion: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional user question about document",
    )

UPLOAD_ROOT = (
    Path(tempfile.gettempdir()) / "justice-companion" / "uploads"
).resolve()
_SANITIZE_FILENAME_PATTERN = re.compile(r"[^a-zA-Z0-9._-]")
FILE_ID_PATTERN = re.compile(r"^[a-f0-9]{32}(?:\.[a-z0-9]{1,8})?$")

def _get_user_upload_dir(user_id: int) -> Path:
    upload_dir = (UPLOAD_ROOT / str(user_id)).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir

def _sanitize_upload_filename(filename: Optional[str]) -> str:
    safe_name = Path(filename or "upload").name
    sanitized = _SANITIZE_FILENAME_PATTERN.sub("_", safe_name)
    return sanitized or "upload.txt"

def _ensure_within_directory(candidate: Path, base_dir: Path) -> Path:
    resolved_candidate = candidate.resolve()
    base_resolved = base_dir.resolve()
    if not resolved_candidate.is_relative_to(base_resolved):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path provided",
        )
    return resolved_candidate

def _resolve_document_path(file_id: str, user_id: int) -> Path:
    """Resolve a previously issued file identifier to a safe path."""
    user_dir = _get_user_upload_dir(user_id)
    if not file_id or not FILE_ID_PATTERN.fullmatch(file_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file reference provided",
        )

    candidate = user_dir / file_id
    return _ensure_within_directory(candidate, user_dir)

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
    Get AI service instance.

    Behavior controlled by AI_MODE environment variable:
    - "service": Use separate ai-service microservice (Hugging Face powered)
    - "stub": Use StubAIService for deterministic mock responses
    
    Default: "stub" for backward compatibility

    Returns:
        AI service instance with UnifiedAIService-compatible interface.
    """
    ai_mode = os.getenv("AI_MODE", "stub").lower()
    print(f"[DEBUG] AI_MODE from env: '{ai_mode}'")
    
    if ai_mode == "service":
        # Use separate ai-service microservice
        from backend.services.ai_service_adapter import AIServiceAdapter
        return AIServiceAdapter(audit_logger)  # type: ignore[return-value]
    else:
        # Use stub for mock responses (default, backward compatible)
        return StubAIService(audit_logger)  # type: ignore[return-value]

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
            except Exception as exc:
                logger.error(f"Failed to load conversation history: {exc}")
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
            except Exception as exc:
                logger.error(f"RAG context retrieval failed: {exc}")
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

    except Exception as exc:
        logger.exception(f"Streaming error: {exc}")
        error_data = {"type": "error", "error": str(exc), "done": True}
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
    except Exception as exc:
        logger.exception(f"Stream chat failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Streaming chat failed: {str(exc)}",
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
    except Exception as exc:
        logger.exception(f"Send chat failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Chat send failed: {str(exc)}"
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
    except Exception as exc:
        logger.exception(f"Case analysis failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Case analysis failed: {str(exc)}",
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
    except Exception as exc:
        logger.exception(f"Evidence analysis failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence analysis failed: {str(exc)}",
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
    except Exception as exc:
        logger.exception(f"Document drafting failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document drafting failed: {str(exc)}",
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
        { "success": true, "data": { "filePath": "<server-file-id>" } }
    """
    try:
        import shutil

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
                detail="File too large. Maximum size: 10MB"
            )

        # Create temp directory if it doesn't exist
        temp_dir = _get_user_upload_dir(user_id)

        safe_name = _sanitize_upload_filename(file.filename)
        file_ext = Path(safe_name).suffix.lower() or ".bin"

        # Use cryptographically strong identifier to prevent guessing or traversal
        stored_filename = f"{secrets.token_hex(16)}{file_ext}"
        while (temp_dir / stored_filename).exists():
            stored_filename = f"{secrets.token_hex(16)}{file_ext}"

        if not FILE_ID_PATTERN.fullmatch(stored_filename):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to allocate file slot",
            )

        file_path = _ensure_within_directory(temp_dir / stored_filename, temp_dir)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(
            "Document uploaded: stored=%s original=%s user_id=%s",
            stored_filename,
            safe_name,
            user_id,
        )

        return {
            "success": True,
            "data": {"filePath": stored_filename}
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Document upload failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {str(exc)}",
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
        logger.info("[ENDPOINT] Starting document analysis for file: %s", request.filePath)

        file_path = _resolve_document_path(request.filePath, user_id)
        if not file_path.exists():
            logger.error("[ENDPOINT] File not found: %s", request.filePath)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File not found")

        logger.info("[ENDPOINT] File exists, creating ParsedDocument")

        # Read document content based on file type
        filename = file_path.name
        file_ext = file_path.suffix.lower()

        document_text = ""
        if file_ext == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                document_text = f.read()
        elif file_ext == '.pdf':
            # TODO: Implement PDF parsing with PyPDF2
            document_text = f"[PDF document - parser not implemented: {filename}]"
        elif file_ext in ['.doc', '.docx']:
            # TODO: Implement DOCX parsing with python-docx
            document_text = f"[Word document - parser not implemented: {filename}]"
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                document_text = f.read()

        word_count = len(document_text.split())

        parsed_doc = ParsedDocument(
            filename=filename,
            text=document_text,
            word_count=word_count,
            file_type=file_ext.lstrip('.') or "txt",
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
        logger.info("[ENDPOINT] Calling ai_service.extract_case_data_from_document...")

        extraction = await ai_service.extract_case_data_from_document(
            parsed_doc, user_profile, request.userQuestion
        )

        logger.info(f"[ENDPOINT] Extraction completed successfully, type: {type(extraction)}")
        logger.info(f"[ENDPOINT] Extraction keys: {extraction.model_dump().keys()}")

        logger.info("[ENDPOINT] Returning extraction response with camelCase aliases")
        # Serialize with camelCase aliases for frontend compatibility
        return extraction.model_dump(mode="json", by_alias=True)

    except HTTPException:
        logger.error("[ENDPOINT] HTTPException caught, re-raising")
        raise
    except Exception as exc:
        logger.exception(f"[ENDPOINT] Document analysis failed with exception: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document analysis failed: {str(exc)}",
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

    except Exception as exc:
        logger.exception(f"Failed to get conversations: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(exc)}",
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
    except Exception as exc:
        logger.exception(f"Failed to load conversation: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load conversation: {str(exc)}",
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
    except Exception as exc:
        logger.exception(f"Failed to delete conversation: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(exc)}",
        )

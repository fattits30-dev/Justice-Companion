"""
Chat routes for Justice Companion.
Migrated from electron/ipc-handlers/chat.ts

Routes:
- POST /chat/stream - Stream AI chat response (SSE)
- POST /chat/send - Send chat message (non-streaming)
- POST /chat/analyze-case - Analyze case with AI
- POST /chat/analyze-evidence - Analyze evidence with AI
- POST /chat/draft-document - Draft document with AI
- POST /chat/analyze-document - Analyze uploaded document
- GET /chat/conversations - Get recent conversations
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, AsyncIterator
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import asyncio
import json

from backend.models.base import get_db
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


# ===== PYDANTIC REQUEST MODELS =====
class ChatStreamRequest(BaseModel):
    """Request model for streaming chat."""

    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    conversationId: Optional[int] = Field(None, description="Existing conversation ID")
    caseId: Optional[int] = Field(None, description="Case ID for context")

    @validator("message")
    def strip_message(cls, v):
        return v.strip()


class ChatSendRequest(BaseModel):
    """Request model for non-streaming chat."""

    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    conversationId: Optional[int] = Field(None, description="Existing conversation ID")

    @validator("message")
    def strip_message(cls, v):
        return v.strip()


class CaseAnalysisRequest(BaseModel):
    """Request model for case analysis."""

    caseId: int = Field(..., gt=0, description="Case ID")
    description: str = Field(..., min_length=1, max_length=10000, description="Case description")

    @validator("description")
    def strip_description(cls, v):
        return v.strip()


class EvidenceAnalysisRequest(BaseModel):
    """Request model for evidence analysis."""

    caseId: int = Field(..., gt=0, description="Case ID")
    existingEvidence: List[str] = Field(
        ..., min_items=1, description="List of existing evidence descriptions"
    )


class DocumentContext(BaseModel):
    """Document context for drafting."""

    caseId: int
    facts: str
    objectives: str


class DocumentDraftRequest(BaseModel):
    """Request model for document drafting."""

    documentType: str = Field(
        ..., min_length=1, max_length=100, description="Type of document to draft"
    )
    context: DocumentContext = Field(..., description="Context for document drafting")


class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis."""

    filePath: str = Field(..., min_length=1, max_length=1000, description="Path to document file")
    userQuestion: Optional[str] = Field(
        None, max_length=1000, description="Optional user question about document"
    )


# ===== PYDANTIC RESPONSE MODELS =====
class MessageResponse(BaseModel):
    """Response model for chat message."""

    id: int
    conversationId: int
    role: str
    content: str
    thinkingContent: Optional[str] = None
    timestamp: str
    tokenCount: Optional[int] = None

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Response model for chat conversation."""

    id: int
    userId: int
    caseId: Optional[int] = None
    title: str
    createdAt: str
    updatedAt: str
    messageCount: int
    messages: Optional[List[MessageResponse]] = None

    class Config:
        from_attributes = True


class CaseAnalysisResponse(BaseModel):
    """Response model for case analysis."""

    analysis: str
    suggestedActions: List[str]
    relevantLaw: Optional[str] = None


class EvidenceAnalysisResponse(BaseModel):
    """Response model for evidence analysis."""

    analysis: str
    gaps: List[str]
    recommendations: List[str]


class DocumentDraftResponse(BaseModel):
    """Response model for document draft."""

    documentType: str
    content: str
    metadata: Dict[str, Any]


class DocumentAnalysisResponse(BaseModel):
    """Response model for document analysis."""

    analysis: str
    suggestedCaseData: Optional[Dict[str, Any]] = None


# ===== HELPER FUNCTIONS =====
def verify_conversation_ownership(db: Session, conversation_id: int, user_id: int) -> bool:
    """
    Verify that a conversation belongs to the user.

    Args:
        db: Database session
        conversation_id: Conversation ID to check
        user_id: User ID to verify ownership

    Returns:
        True if user owns the conversation

    Raises:
        HTTPException: If conversation not found or unauthorized
    """
    query = text(
        """
        SELECT id FROM chat_conversations
        WHERE id = :conversation_id AND user_id = :user_id
    """
    )

    result = db.execute(query, {"conversation_id": conversation_id, "user_id": user_id}).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found or unauthorized",
        )

    return True


def load_conversation_history(db: Session, conversation_id: int) -> List[Dict[str, str]]:
    """
    Load conversation history for context.

    Args:
        db: Database session
        conversation_id: Conversation ID

    Returns:
        List of messages in format [{"role": "user", "content": "..."}]
    """
    query = text(
        """
        SELECT role, content
        FROM chat_messages
        WHERE conversation_id = :conversation_id
        ORDER BY timestamp ASC
    """
    )

    messages = db.execute(query, {"conversation_id": conversation_id}).fetchall()

    return [{"role": msg.role, "content": msg.content} for msg in messages]


def generate_conversation_title(message: str) -> str:
    """
    Generate a conversation title from the first user message.

    Args:
        message: First user message

    Returns:
        Title (truncated to 100 chars)
    """
    # Take first 100 chars, truncate at word boundary
    if len(message) <= 100:
        return message

    truncated = message[:100]
    last_space = truncated.rfind(" ")
    if last_space > 50:  # Only truncate at space if it's not too short
        truncated = truncated[:last_space]

    return truncated + "..."


# ===== SSE STREAMING IMPLEMENTATION =====
async def stream_ai_response(message: str, history: List[Dict[str, str]]) -> AsyncIterator[str]:
    """
    Stream AI response tokens using Server-Sent Events (SSE).

    This is a stub implementation that simulates streaming.
    TODO: Integrate with actual AI service (OpenAI, HuggingFace, etc.)

    Args:
        message: User message
        history: Conversation history

    Yields:
        SSE-formatted data strings
    """
    # Stub: Simulate streaming response token by token
    mock_response = "This is a streaming response token by token. I'm analyzing your message and providing a helpful legal assistant response. Remember, this is information only, not legal advice. For specific advice, consult a qualified solicitor."

    tokens = mock_response.split()

    for token in tokens:
        # Yield token in SSE format
        data = {"data": token + " ", "done": False}
        yield f"data: {json.dumps(data)}\n\n"
        await asyncio.sleep(0.05)  # Simulate network delay

    # Send final event
    data = {"data": "", "done": True}
    yield f"data: {json.dumps(data)}\n\n"


# ===== ROUTES =====
@router.post("/stream")
async def stream_chat(
    request: ChatStreamRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream AI chat response using Server-Sent Events (SSE).

    This endpoint:
    1. Loads conversation history if conversationId provided
    2. Verifies conversation ownership
    3. Streams AI response token by token
    4. Saves conversation and messages after streaming completes

    Returns:
        StreamingResponse with SSE events containing tokens
    """
    try:
        # Load conversation history if provided
        history = []
        conversation_id = request.conversationId

        if conversation_id:
            # Verify user owns this conversation
            verify_conversation_ownership(db, conversation_id, user_id)

            # Load history
            history = load_conversation_history(db, conversation_id)

        # Add system message
        system_message = {
            "role": "system",
            "content": "You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. You help people understand their rights and manage their legal cases. Remember: You offer information and guidance, not legal advice. For specific legal advice, consult a qualified solicitor.",
        }
        messages = [system_message] + history + [{"role": "user", "content": request.message}]

        # Create async generator for streaming
        async def event_stream():
            full_response = ""

            # Stream tokens
            async for sse_data in stream_ai_response(request.message, history):
                yield sse_data

                # Extract token from SSE data to accumulate response
                try:
                    if sse_data.startswith("data: "):
                        json_str = sse_data[6:].strip()
                        if json_str:
                            data = json.loads(json_str)
                            if not data.get("done"):
                                full_response += data.get("data", "")
                except Exception:
                    pass

            # After streaming completes, save to database
            nonlocal conversation_id
            full_response = full_response.strip()

            if not conversation_id:
                # Create new conversation
                title = generate_conversation_title(request.message)

                insert_conv = text(
                    """
                    INSERT INTO chat_conversations (user_id, case_id, title, created_at, updated_at, message_count)
                    VALUES (:user_id, :case_id, :title, :created_at, :updated_at, 0)
                """
                )

                now = datetime.utcnow().isoformat()
                result = db.execute(
                    insert_conv,
                    {
                        "user_id": user_id,
                        "case_id": request.caseId,
                        "title": title,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                db.commit()

                conversation_id = result.lastrowid

            # Save user message
            insert_msg = text(
                """
                INSERT INTO chat_messages (conversation_id, role, content, timestamp)
                VALUES (:conversation_id, :role, :content, :timestamp)
            """
            )

            db.execute(
                insert_msg,
                {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": request.message,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            # Save assistant message
            db.execute(
                insert_msg,
                {
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": full_response,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            db.commit()

            # Send conversation ID as final event
            conv_data = {"conversationId": conversation_id, "done": True}
            yield f"data: {json.dumps(conv_data)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Streaming chat failed: {str(e)}",
        )


@router.post("/send", response_model=str)
async def send_chat(
    request: ChatSendRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send chat message and get non-streaming response.

    This is a simpler endpoint for clients that don't need streaming.

    Returns:
        Plain text AI response
    """
    try:
        # Stub: Return mock response
        response = "This is a regular chat response. I've received your message and will provide helpful information about UK civil legal matters. Remember, this is information only, not legal advice."

        # TODO: Integrate with AI service
        # TODO: Save conversation to database

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Chat send failed: {str(e)}"
        )


@router.post("/analyze-case", response_model=CaseAnalysisResponse)
async def analyze_case(
    request: CaseAnalysisRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze case with AI and provide suggested actions.

    TODO: Integrate with AI service for real case analysis.

    Returns:
        Case analysis with suggested actions and relevant law
    """
    try:
        # Verify case belongs to user
        check_query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        case = db.execute(check_query, {"case_id": request.caseId, "user_id": user_id}).fetchone()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or unauthorized"
            )

        # Stub: Return mock analysis
        return CaseAnalysisResponse(
            analysis=f"Based on your case description, this appears to be a {request.description[:50]}... matter. I recommend gathering evidence and consulting with a solicitor.",
            suggestedActions=[
                "Gather all relevant documentation",
                "Document timeline of events",
                "Consult with a qualified solicitor",
                "Consider alternative dispute resolution",
            ],
            relevantLaw="This is a stub. Relevant UK civil law statutes would appear here.",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Case analysis failed: {str(e)}",
        )


@router.post("/analyze-evidence", response_model=EvidenceAnalysisResponse)
async def analyze_evidence(
    request: EvidenceAnalysisRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze existing evidence and identify gaps.

    TODO: Integrate with AI service for real evidence analysis.

    Returns:
        Evidence analysis with gaps and recommendations
    """
    try:
        # Verify case belongs to user
        check_query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        case = db.execute(check_query, {"case_id": request.caseId, "user_id": user_id}).fetchone()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or unauthorized"
            )

        # Stub: Return mock analysis
        return EvidenceAnalysisResponse(
            analysis=f"I've reviewed your {len(request.existingEvidence)} pieces of evidence. The evidence appears to support your position, but there are some gaps.",
            gaps=[
                "Missing witness statements",
                "Incomplete timeline documentation",
                "Need expert opinion on technical matters",
            ],
            recommendations=[
                "Obtain witness statements from all parties",
                "Create detailed timeline with supporting documents",
                "Consider expert witness for technical aspects",
                "Organize evidence chronologically",
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence analysis failed: {str(e)}",
        )


@router.post("/draft-document", response_model=DocumentDraftResponse)
async def draft_document(
    request: DocumentDraftRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Draft legal document with AI assistance.

    TODO: Integrate with AI service for real document drafting.

    Returns:
        Draft document content with metadata
    """
    try:
        # Verify case belongs to user
        check_query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        case = db.execute(
            check_query, {"case_id": request.context.caseId, "user_id": user_id}
        ).fetchone()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or unauthorized"
            )

        # Stub: Return mock draft
        return DocumentDraftResponse(
            documentType=request.documentType,
            content=f"""# {request.documentType.upper()}

## Case Facts
{request.context.facts}

## Objectives
{request.context.objectives}

## Draft Document
This is a mock draft document. In production, this would be generated by AI based on the case facts and objectives.

[PLACEHOLDER: Legal document content would appear here]

---
DISCLAIMER: This is a draft document for informational purposes only. It is not legal advice. Please consult a qualified solicitor before using any legal documents.
""",
            metadata={
                "documentType": request.documentType,
                "caseId": request.context.caseId,
                "generatedAt": datetime.utcnow().isoformat(),
                "version": "1.0",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
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

        return {
            "success": True,
            "data": {
                "filePath": str(file_path)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {str(e)}",
        )


@router.post("/analyze-document", response_model=DocumentAnalysisResponse)
async def analyze_document(
    request: DocumentAnalysisRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze uploaded document with AI.

    TODO: Integrate with document parser and AI service.

    Returns:
        Document analysis with optional suggested case data
    """
    try:
        import os

        # Validate file path
        if not os.path.exists(request.filePath):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File not found")

        # Stub: Return mock analysis
        filename = os.path.basename(request.filePath)

        analysis = f"I've analyzed the document '{filename}'. "
        if request.userQuestion:
            analysis += f"Regarding your question: {request.userQuestion} - "

        analysis += "This appears to be a legal document that could be relevant to your case. The document contains important information that should be preserved as evidence."

        return DocumentAnalysisResponse(
            analysis=analysis,
            suggestedCaseData={
                "documentType": "evidence",
                "filename": filename,
                "extractedDate": datetime.utcnow().isoformat(),
                "confidence": 0.85,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document analysis failed: {str(e)}",
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    case_id: Optional[int] = Query(None, description="Filter by case ID"),
    limit: int = Query(5, ge=1, le=100, description="Maximum number of conversations"),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get recent chat conversations for the user.

    Optionally filter by case ID.
    Returns conversations ordered by most recently updated first.

    Args:
        case_id: Optional case ID to filter conversations
        limit: Maximum number of conversations to return (default 5, max 100)

    Returns:
        List of conversations with basic info (messages not included)
    """
    try:
        # Build query with optional case_id filter
        if case_id is not None:
            query = text(
                """
                SELECT
                    id,
                    user_id as userId,
                    case_id as caseId,
                    title,
                    created_at as createdAt,
                    updated_at as updatedAt,
                    message_count as messageCount
                FROM chat_conversations
                WHERE user_id = :user_id AND case_id = :case_id
                ORDER BY updated_at DESC
                LIMIT :limit
            """
            )
            params = {"user_id": user_id, "case_id": case_id, "limit": limit}
        else:
            query = text(
                """
                SELECT
                    id,
                    user_id as userId,
                    case_id as caseId,
                    title,
                    created_at as createdAt,
                    updated_at as updatedAt,
                    message_count as messageCount
                FROM chat_conversations
                WHERE user_id = :user_id
                ORDER BY updated_at DESC
                LIMIT :limit
            """
            )
            params = {"user_id": user_id, "limit": limit}

        conversations = db.execute(query, params).fetchall()

        # Convert to list of dicts
        result = []
        for conv in conversations:
            conv_dict = dict(conv._mapping)
            result.append(conv_dict)

        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}",
        )

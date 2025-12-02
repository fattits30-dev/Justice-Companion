"""
Evidence management routes for Justice Companion.
Migrated from electron/ipc-handlers/evidence.ts

REFACTORED: Now uses service layer instead of direct database queries.

Routes:
- POST /evidence - Upload/create evidence (requires case ownership, with document parsing)
- GET /evidence - List all evidence for user's cases
- GET /evidence/{evidence_id} - Get specific evidence with metadata
- GET /evidence/case/{case_id} - List evidence for a case
- PUT /evidence/{evidence_id} - Update evidence metadata
- DELETE /evidence/{evidence_id} - Delete evidence
- POST /evidence/{evidence_id}/parse - Re-parse document and extract text
- GET /evidence/{evidence_id}/citations - Extract legal citations from document
- POST /evidence/upload - Upload file with automatic parsing

Services Integrated:
- DocumentParserService: PDF, DOCX, TXT parsing with metadata extraction
- CitationService: Extract legal citations using eyecite library
- EncryptionService: Field-level encryption for sensitive evidence data
- AuditLogger: Comprehensive audit trail for all operations
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
import base64
from pathlib import Path
import logging

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.document_parser_service import DocumentParserService
from backend.services.citation_service import CitationService
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.services.date_extraction_service import DateExtractionService

# Import schemas from consolidated schema file
from backend.schemas.evidence import (
    CreateEvidenceRequest,
    UpdateEvidenceRequest,
    EvidenceResponse,
    ParsedDocumentResponse,
    CitationResponse,
    CitationListResponse,
    DeleteEvidenceResponse,
    FileUploadResponse,
    VALID_EVIDENCE_TYPES,
    SUPPORTED_DOCUMENT_FORMATS,
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evidence", tags=["evidence"])

# ===== CONSTANTS =====
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIR = Path("uploads/evidence")  # Evidence file storage

# ===== DEPENDENCY INJECTION =====
def get_document_parser_service(db: Session = Depends(get_db)) -> DocumentParserService:
    """Get DocumentParserService instance with audit logger."""
    audit_logger = AuditLogger(db)
    return DocumentParserService(audit_logger=audit_logger, max_file_size=MAX_FILE_SIZE)

def get_citation_service() -> Optional[CitationService]:
    """Get CitationService instance. Returns None if eyecite not installed."""
    try:
        return CitationService()
    except ImportError:
        logger.warning("CitationService unavailable - eyecite not installed")
        return None

def get_date_extraction_service() -> DateExtractionService:
    """Get DateExtractionService instance for extracting dates from documents."""
    return DateExtractionService()

def get_encryption_service() -> EncryptionService:
    """
    Get encryption service instance with encryption key.

    Priority:
    1. ENCRYPTION_KEY_BASE64 environment variable
    2. Generate temporary key (WARNING: data will be lost on restart)
    """
    key_base64 = os.getenv("ENCRYPTION_KEY_BASE64")

    if not key_base64:
        # WARNING: Generating temporary key - data will be lost on restart
        key = EncryptionService.generate_key()
        key_base64 = base64.b64encode(key).decode("utf-8")
        logger.warning("No ENCRYPTION_KEY_BASE64 found. Using temporary key.")

    return EncryptionService(key_base64)

def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)

# ===== HELPER FUNCTIONS =====

def normalize_evidence_dict(evidence_dict: dict) -> dict:
    """
    Normalize evidence dictionary datetime fields.
    SQLite returns datetimes as strings, so we handle both cases.
    """
    for dt_field in ["createdAt", "updatedAt"]:
        if evidence_dict.get(dt_field):
            val = evidence_dict[dt_field]
            if hasattr(val, 'isoformat'):
                evidence_dict[dt_field] = val.isoformat()
            # else it's already a string, leave it
    evidence_dict["uploadedAt"] = evidence_dict.get("createdAt")
    return evidence_dict

def verify_case_ownership(db: Session, case_id: int, user_id: int) -> bool:
    """
    Verify that a case belongs to the authenticated user.

    Args:
        db: Database session
        case_id: Case ID to verify
        user_id: User ID to check ownership

    Returns:
        True if user owns the case

    Raises:
        HTTPException: If case not found or unauthorized
    """
    query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
    result = db.execute(query, {"case_id": case_id, "user_id": user_id}).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found or unauthorized",
        )

    return True

def verify_evidence_ownership(db: Session, evidence_id: int, user_id: int) -> bool:
    """
    Verify that evidence belongs to a case owned by the authenticated user.

    Args:
        db: Database session
        evidence_id: Evidence ID to verify
        user_id: User ID to check ownership

    Returns:
        True if user owns the evidence (via case ownership)

    Raises:
        HTTPException: If evidence not found or unauthorized
    """
    query = text(
        """
        SELECT e.id
        FROM evidence e
        INNER JOIN cases c ON e.case_id = c.id
        WHERE e.id = :evidence_id AND c.user_id = :user_id
    """
    )
    result = db.execute(query, {"evidence_id": evidence_id, "user_id": user_id}).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence with ID {evidence_id} not found or unauthorized",
        )

    return True

def validate_file_upload(file: UploadFile) -> None:
    """
    Validate uploaded file.

    Args:
        file: Uploaded file

    Raises:
        HTTPException: If validation fails
    """
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in SUPPORTED_DOCUMENT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file format. Supported formats: {', '.join(SUPPORTED_DOCUMENT_FORMATS)}",
        )

    # Check file size (if available in headers)
    # Note: file.size is not always available, so we'll check during read

async def save_uploaded_file(file: UploadFile, case_id: int) -> str:
    """
    Save uploaded file to disk.

    Args:
        file: Uploaded file
        case_id: Case ID for organizing files

    Returns:
        Absolute path to saved file

    Raises:
        HTTPException: If save fails or file too large
    """
    # Create upload directory
    case_dir = UPLOAD_DIR / str(case_id)
    case_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = case_dir / safe_filename

    # Read file content (with size check)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024:.1f}MB",
        )

    # Write to disk
    try:
        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(f"Saved uploaded file: {file_path} ({len(content)} bytes)")
        return str(file_path.absolute())

    except Exception as exc:
        logger.error(f"Failed to save uploaded file: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(exc)}",
        )

# ===== ROUTES =====

@router.get("", response_model=List[EvidenceResponse])
async def list_all_evidence(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    case_id: Optional[int] = None,
):
    """
    List all evidence for user's cases.

    Query Parameters:
    - case_id: Optional filter by specific case

    Returns evidence ordered by creation date (newest first).

    Example:
        GET /evidence
        GET /evidence?case_id=123
    """
    try:
        # Build query
        if case_id:
            # Verify case ownership first
            verify_case_ownership(db, case_id, user_id)

            query = text(
                """
                SELECT
                    id,
                    case_id as caseId,
                    title,
                    file_path as filePath,
                    content,
                    evidence_type as evidenceType,
                    obtained_date as obtainedDate,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM evidence
                WHERE case_id = :case_id
                ORDER BY created_at DESC
            """
            )
            evidence_items = db.execute(query, {"case_id": case_id}).fetchall()
        else:
            # Get all evidence for user's cases
            query = text(
                """
                SELECT
                    e.id,
                    e.case_id as caseId,
                    e.title,
                    e.file_path as filePath,
                    e.content,
                    e.evidence_type as evidenceType,
                    e.obtained_date as obtainedDate,
                    e.created_at as createdAt,
                    e.updated_at as updatedAt
                FROM evidence e
                INNER JOIN cases c ON e.case_id = c.id
                WHERE c.user_id = :user_id
                ORDER BY e.created_at DESC
            """
            )
            evidence_items = db.execute(query, {"user_id": user_id}).fetchall()

        # Convert to list of dicts
        result = []
        for item in evidence_items:
            evidence_dict = dict(item._mapping)
            normalize_evidence_dict(evidence_dict)
            result.append(evidence_dict)

        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to list evidence: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list evidence: {str(e)}",
        )

@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(
    evidence_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get specific evidence by ID.

    Validates that evidence belongs to user's case.
    Returns 404 if not found or unauthorized.

    Example:
        GET /evidence/123
    """
    try:
        # Verify ownership
        verify_evidence_ownership(db, evidence_id, user_id)

        # Fetch evidence
        query = text(
            """
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE id = :evidence_id
        """
        )

        evidence = db.execute(query, {"evidence_id": evidence_id}).fetchone()

        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence with ID {evidence_id} not found",
            )

        # Convert to dict
        evidence_dict = dict(evidence._mapping)
        normalize_evidence_dict(evidence_dict)

        return evidence_dict

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to get evidence: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evidence: {str(e)}",
        )

@router.post("", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence(
    request: CreateEvidenceRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Upload/create new evidence for a case.

    Validates:
    - User owns the case
    - Either filePath OR content is provided (mutually exclusive)
    - Evidence type is valid

    Logs audit event for successful uploads and failures.

    Example:
        POST /evidence
        {
            "caseId": 123,
            "evidenceType": "document",
            "title": "Employment Contract",
            "filePath": "/uploads/contract.pdf",
            "obtainedDate": "2025-01-13"
        }
    """
    try:
        # Verify user owns the case
        verify_case_ownership(db, request.caseId, user_id)

        # Insert evidence
        insert_query = text(
            """
            INSERT INTO evidence (
                case_id, title, file_path, content, evidence_type,
                obtained_date, created_at, updated_at
            )
            VALUES (
                :case_id, :title, :file_path, :content, :evidence_type,
                :obtained_date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """
        )

        result = db.execute(
            insert_query,
            {
                "case_id": request.caseId,
                "title": request.title,
                "file_path": request.filePath,
                "content": request.content,
                "evidence_type": request.evidenceType,
                "obtained_date": request.obtainedDate,
            },
        )
        db.commit()

        evidence_id = result.lastrowid

        # Fetch created evidence
        select_query = text(
            """
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE id = :evidence_id
        """
        )

        created_evidence = db.execute(select_query, {"evidence_id": evidence_id}).fetchone()

        # Log audit event
        audit_logger.log(
            event_type="evidence.uploaded",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id=str(evidence_id),
            action="upload",
            details={
                "caseId": request.caseId,
                "evidenceType": request.evidenceType,
                "title": request.title,
            },
            success=True,
        )

        # Convert to dict
        evidence_dict = dict(created_evidence._mapping)
        normalize_evidence_dict(evidence_dict)

        return evidence_dict

    except ValueError as e:
        # Validation error
        audit_logger.log(
            event_type="evidence.uploaded",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id="unknown",
            action="upload",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except HTTPException:
        # Re-raise HTTP exceptions (case not found, unauthorized)
        raise

    except Exception as exc:
        db.rollback()
        # Log failed upload
        audit_logger.log(
            event_type="evidence.uploaded",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id="unknown",
            action="upload",
            success=False,
            error_message=str(e),
        )

        logger.error(f"Failed to create evidence: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create evidence: {str(e)}",
        )

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence_file(
    case_id: int = Form(..., description="Case ID"),
    title: str = Form(..., description="Evidence title"),
    evidence_type: str = Form(..., description="Evidence type"),
    obtained_date: Optional[str] = Form(None, description="Date obtained (YYYY-MM-DD)"),
    file: UploadFile = File(..., description="Document file to upload"),
    parse_document: bool = Form(True, description="Parse document automatically"),
    extract_citations: bool = Form(True, description="Extract citations automatically"),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    parser_service: DocumentParserService = Depends(get_document_parser_service),
    citation_service: Optional[CitationService] = Depends(get_citation_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Upload evidence file with automatic document parsing and citation extraction.

    Features:
    - Saves file to disk
    - Parses PDF, DOCX, TXT documents
    - Extracts legal citations (optional)
    - Returns evidence record + parsed content + citations

    Supported formats: PDF, DOCX, TXT
    Max file size: 10MB

    Example:
        POST /evidence/upload
        Content-Type: multipart/form-data

        case_id=123
        title=Employment Contract
        evidence_type=document
        obtained_date=2025-01-13
        file=@contract.pdf
        parse_document=true
        extract_citations=true
    """
    try:
        # Validate file
        validate_file_upload(file)

        # Verify case ownership
        verify_case_ownership(db, case_id, user_id)

        # Save uploaded file
        file_path = await save_uploaded_file(file, case_id)

        # Create evidence record
        insert_query = text(
            """
            INSERT INTO evidence (
                case_id, title, file_path, evidence_type,
                obtained_date, created_at, updated_at
            )
            VALUES (
                :case_id, :title, :file_path, :evidence_type,
                :obtained_date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """
        )

        result = db.execute(
            insert_query,
            {
                "case_id": case_id,
                "title": title,
                "file_path": file_path,
                "evidence_type": evidence_type,
                "obtained_date": obtained_date,
            },
        )
        db.flush()  # Flush to get the ID before commit
        
        # Get last inserted ID using SQLite's last_insert_rowid()
        evidence_id = db.execute(text("SELECT last_insert_rowid()")).scalar()
        
        db.commit()

        # Fetch created evidence
        select_query = text(
            """
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE id = :evidence_id
        """
        )

        created_evidence = db.execute(select_query, {"evidence_id": evidence_id}).fetchone()
        evidence_dict = dict(created_evidence._mapping)
        normalize_evidence_dict(evidence_dict)

        # Parse document (if requested)
        parsed_doc = None
        citations_list = None

        logger.info(f"parse_document={parse_document}, file_path={file_path}")

        if parse_document:
            try:
                parsed = await parser_service.parse_document(file_path, user_id=str(user_id))
                logger.info(f"Parsed document, text length: {len(parsed.text) if parsed.text else 0}")
                parsed_doc = ParsedDocumentResponse(
                    text=parsed.text,
                    filename=parsed.filename,
                    file_type=parsed.file_type,
                    page_count=parsed.page_count,
                    word_count=parsed.word_count,
                    metadata=parsed.metadata.to_dict() if parsed.metadata else None,
                )

                # Extract citations (if requested and service available)
                if extract_citations and parsed.text and citation_service:
                    try:
                        citations = citation_service.extract_citations(parsed.text)
                        citations_list = [
                            CitationResponse(
                                text=citation.text,
                                type=citation.type,
                                span=list(citation.span),
                                metadata=citation.metadata.to_dict(),
                                court_listener_link=citation_service.get_court_listener_link(
                                    citation
                                ),
                            )
                            for citation in citations
                        ]

                        logger.info(
                            f"Extracted {len(citations_list)} citations from evidence {evidence_id}"
                        )

                    except Exception as exc:
                        logger.warning(f"Citation extraction failed (non-critical): {exc}")

                # Save parsed content to database
                if parsed.text:
                    logger.info(f"Saving content to DB for evidence {evidence_id}, text length: {len(parsed.text)}")
                    update_content_query = text(
                        "UPDATE evidence SET content = :content WHERE id = :evidence_id"
                    )
                    db.execute(update_content_query, {"content": parsed.text, "evidence_id": evidence_id})
                    db.commit()
                    evidence_dict["content"] = parsed.text
                    logger.info(f"Content saved successfully for evidence {evidence_id}")

            except Exception as exc:
                logger.warning(f"Document parsing failed (non-critical): {exc}")

        # Log audit event
        audit_logger.log(
            event_type="evidence.uploaded",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id=str(evidence_id),
            action="upload",
            details={
                "caseId": case_id,
                "evidenceType": evidence_type,
                "title": title,
                "filename": file.filename,
                "file_size": os.path.getsize(file_path),
                "parsed": parsed_doc is not None,
                "citations_extracted": len(citations_list) if citations_list else 0,
            },
            success=True,
        )

        return FileUploadResponse(
            evidence=evidence_dict, parsed_document=parsed_doc, citations=citations_list
        )

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to upload evidence file: {exc}", exc_info=True)

        # Log failed upload
        audit_logger.log(
            event_type="evidence.uploaded",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id="unknown",
            action="upload",
            success=False,
            error_message=str(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload evidence file: {str(exc)}",
        )

@router.post("/{evidence_id}/parse", response_model=ParsedDocumentResponse)
async def parse_evidence_document(
    evidence_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    parser_service: DocumentParserService = Depends(get_document_parser_service),
):
    """
    Re-parse evidence document and extract text/metadata.

    Supports PDF, DOCX, TXT formats.
    Requires evidence to have a file_path.

    Example:
        POST /evidence/123/parse
    """
    try:
        # Verify ownership
        verify_evidence_ownership(db, evidence_id, user_id)

        # Get evidence file path
        query = text("SELECT file_path FROM evidence WHERE id = :evidence_id")
        result = db.execute(query, {"evidence_id": evidence_id}).fetchone()

        if not result or not result[0]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Evidence does not have an associated file",
            )

        file_path = result[0]

        # Parse document
        parsed = await parser_service.parse_document(file_path, user_id=str(user_id))

        return ParsedDocumentResponse(
            text=parsed.text,
            filename=parsed.filename,
            file_type=parsed.file_type,
            page_count=parsed.page_count,
            word_count=parsed.word_count,
            metadata=parsed.metadata.to_dict() if parsed.metadata else None,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to parse evidence document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse document: {str(e)}",
        )

@router.get("/{evidence_id}/citations", response_model=CitationListResponse)
async def extract_evidence_citations(
    evidence_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    parser_service: DocumentParserService = Depends(get_document_parser_service),
    citation_service: Optional[CitationService] = Depends(get_citation_service),
):
    """
    Extract legal citations from evidence document.

    Parses document and extracts citations using eyecite library.
    Supports case citations, statute citations, and reference citations.

    Returns:
    - List of citations with metadata
    - Summary statistics (total, by type, categories)
    - CourtListener links for case citations

    Example:
        GET /evidence/123/citations
    """
    try:
        # Verify ownership
        verify_evidence_ownership(db, evidence_id, user_id)

        # Get evidence file path or content
        query = text("SELECT file_path, content FROM evidence WHERE id = :evidence_id")
        result = db.execute(query, {"evidence_id": evidence_id}).fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence with ID {evidence_id} not found",
            )

        file_path, content = result

        # Get text content
        text_content = None
        if file_path:
            # Parse document to get text
            parsed = await parser_service.parse_document(file_path, user_id=str(user_id))
            text_content = parsed.text
        elif content:
            text_content = content
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Evidence has no file or content to extract citations from",
            )

        # Extract citations
        citations = citation_service.extract_citations(text_content)

        # Convert to response format
        citations_list = [
            CitationResponse(
                text=citation.text,
                type=citation.type,
                span=list(citation.span),
                metadata=citation.metadata.to_dict(),
                court_listener_link=citation_service.get_court_listener_link(citation),
            )
            for citation in citations
        ]

        # Get summary
        summary = citation_service.get_citation_summary(citations)

        logger.info(f"Extracted {len(citations_list)} citations from evidence {evidence_id}")

        return CitationListResponse(citations=citations_list, summary=summary)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to extract citations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract citations: {str(e)}",
        )

@router.get("/case/{case_id}", response_model=List[EvidenceResponse])
async def list_case_evidence(
    case_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    List all evidence for a specific case.

    Validates that the case belongs to the authenticated user.
    Returns evidence items ordered by creation date (newest first).

    Example:
        GET /evidence/case/123
    """
    try:
        # Verify user owns the case
        verify_case_ownership(db, case_id, user_id)

        # Fetch evidence
        query = text(
            """
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE case_id = :case_id
            ORDER BY created_at DESC
        """
        )

        evidence_items = db.execute(query, {"case_id": case_id}).fetchall()

        # Convert to list of dicts
        result = []
        for item in evidence_items:
            evidence_dict = dict(item._mapping)
            normalize_evidence_dict(evidence_dict)
            result.append(evidence_dict)

        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to list case evidence: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list evidence: {str(e)}",
        )

@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(
    evidence_id: int,
    request: UpdateEvidenceRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Update evidence metadata.

    Only updates fields provided in the request body.
    Only allows updating evidence owned by the authenticated user.
    Returns 404 if evidence doesn't exist or user doesn't own it.

    Example:
        PUT /evidence/123
        {
            "title": "Updated Title",
            "description": "Updated description",
            "evidenceType": "document"
        }
    """
    try:
        # Verify ownership
        verify_evidence_ownership(db, evidence_id, user_id)

        # Ensure at least one field is provided
        if all(
            field is None
            for field in [
                request.title,
                request.description,
                request.evidenceType,
                request.obtainedDate,
            ]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field must be provided for update",
            )

        # Build dynamic update query
        update_fields = []
        params = {"evidence_id": evidence_id}

        if request.title is not None:
            update_fields.append("title = :title")
            params["title"] = request.title

        if request.description is not None:
            update_fields.append("content = :content")
            params["content"] = request.description

        if request.evidenceType is not None:
            update_fields.append("evidence_type = :evidence_type")
            params["evidence_type"] = request.evidenceType

        if request.obtainedDate is not None:
            update_fields.append("obtained_date = :obtained_date")
            params["obtained_date"] = request.obtainedDate

        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        update_query = text(
            f"""
            UPDATE evidence
            SET {', '.join(update_fields)}
            WHERE id = :evidence_id
        """
        )

        db.execute(update_query, params)
        db.commit()

        # Fetch updated evidence
        select_query = text(
            """
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE id = :evidence_id
        """
        )

        updated_evidence = db.execute(select_query, {"evidence_id": evidence_id}).fetchone()

        # Log audit event
        audit_logger.log(
            event_type="evidence.updated",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id=str(evidence_id),
            action="update",
            details={"fields_updated": list(params.keys())},
            success=True,
        )

        # Convert to dict
        evidence_dict = dict(updated_evidence._mapping)
        normalize_evidence_dict(evidence_dict)

        return evidence_dict

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to update evidence: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update evidence: {str(e)}",
        )

@router.delete(
    "/{evidence_id}", response_model=DeleteEvidenceResponse, status_code=status.HTTP_200_OK
)
async def delete_evidence(
    evidence_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Delete evidence by ID.

    Validates:
    - Evidence exists
    - User owns the case that contains this evidence

    Logs audit event for successful deletions and failures.

    Example:
        DELETE /evidence/123
    """
    try:
        # Verify user owns the evidence (via case ownership)
        verify_evidence_ownership(db, evidence_id, user_id)

        # Get file path before deletion (to delete file from disk)
        file_query = text("SELECT file_path FROM evidence WHERE id = :evidence_id")
        file_result = db.execute(file_query, {"evidence_id": evidence_id}).fetchone()
        file_path = file_result[0] if file_result else None

        # Delete evidence
        delete_query = text("DELETE FROM evidence WHERE id = :evidence_id")
        result = db.execute(delete_query, {"evidence_id": evidence_id})
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence with ID {evidence_id} not found",
            )

        # Delete file from disk (if exists)
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted evidence file: {file_path}")
            except Exception as exc:
                logger.warning(f"Failed to delete evidence file (non-critical): {exc}")

        # Log audit event
        audit_logger.log(
            event_type="evidence.deleted",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id=str(evidence_id),
            action="delete",
            success=True,
        )

        return {"success": True}

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        # Log failed deletion
        audit_logger.log(
            event_type="evidence.deleted",
            user_id=str(user_id),
            resource_type="evidence",
            resource_id=str(evidence_id),
            action="delete",
            success=False,
            error_message=str(exc),
        )

        logger.error(f"Failed to delete evidence: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete evidence: {str(exc)}",
        )


# ===== DATE EXTRACTION ENDPOINT =====

@router.get("/{evidence_id}/dates")
async def extract_evidence_dates(
    evidence_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    parser_service: DocumentParserService = Depends(get_document_parser_service),
    date_service: DateExtractionService = Depends(get_date_extraction_service),
):
    """
    Extract dates from evidence document.
    
    Returns all dates found in the document, with deadlines highlighted.
    Useful for creating timeline entries and deadline reminders.
    
    Example:
        GET /evidence/123/dates
        
    Returns:
        {
            "dates": [...],
            "deadlines": [...],
            "documentDate": {...},
            "totalDates": 5,
            "totalDeadlines": 2
        }
    """
    try:
        # Verify evidence ownership
        verify_evidence_ownership(db, evidence_id, user_id)
        
        # Get evidence file path
        query = text("SELECT file_path, content FROM evidence WHERE id = :evidence_id")
        evidence = db.execute(query, {"evidence_id": evidence_id}).fetchone()
        
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence with ID {evidence_id} not found",
            )
        
        file_path = evidence.file_path
        content = evidence.content
        
        # If we already have parsed content, use it
        if content:
            text_content = content
        elif file_path and os.path.exists(file_path):
            # Parse the document to get text
            parsed = await parser_service.parse_document(file_path, user_id=str(user_id))
            text_content = parsed.text
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No content available for date extraction",
            )
        
        # Extract dates
        result = date_service.extract_dates(text_content)
        
        logger.info(
            f"Extracted {len(result.dates)} dates from evidence {evidence_id}, "
            f"{len(result.deadlines)} are deadlines"
        )
        
        return date_service.result_to_dict(result)
    
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to extract dates from evidence {evidence_id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract dates: {str(exc)}",
        )

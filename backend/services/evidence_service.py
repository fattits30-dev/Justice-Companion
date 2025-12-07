"""
Evidence Service - Business logic layer for evidence management.

Separates business logic from routes/evidence.py, using EvidenceRepository
for all database operations.

Features:
- CRUD operations with business logic
- Ownership verification
- Document parsing integration
- Audit logging
- File management
"""

from typing import Optional, List, Dict, Any
from pathlib import Path
import logging

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.repositories.evidence_repository import EvidenceRepository
from backend.services.document_parser_service import DocumentParserService
from backend.services.citation_service import CitationService
from backend.services.date_extraction_service import DateExtractionService
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

logger = logging.getLogger(__name__)


class EvidenceService:
    """
    Service layer for evidence management.

    Handles business logic, validation, and orchestrates calls to:
    - EvidenceRepository (database operations)
    - DocumentParserService (document parsing)
    - CitationService (legal citation extraction)
    - DateExtractionService (date extraction)
    - AuditLogger (audit trail)
    """

    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger: Optional[AuditLogger] = None,
        document_parser: Optional[DocumentParserService] = None,
        citation_service: Optional[CitationService] = None,
        date_extraction_service: Optional[DateExtractionService] = None,
    ):
        """
        Initialize evidence service with dependencies.

        Args:
            db: SQLAlchemy session
            encryption_service: Optional encryption service
            audit_logger: Optional audit logger
            document_parser: Optional document parser service
            citation_service: Optional citation extraction service
            date_extraction_service: Optional date extraction service
        """
        self.repository = EvidenceRepository(
            db=db,
            encryption_service=encryption_service,
            audit_logger=audit_logger,
        )
        self.audit_logger = audit_logger
        self.document_parser = document_parser
        self.citation_service = citation_service
        self.date_extraction_service = date_extraction_service

    # ===== CREATE OPERATIONS =====

    def create_evidence(
        self,
        case_id: int,
        user_id: int,
        title: str,
        evidence_type: str,
        file_path: Optional[str] = None,
        content: Optional[str] = None,
        obtained_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create new evidence with ownership verification.

        Args:
            case_id: Case ID to attach evidence to
            user_id: User ID (for ownership verification and audit)
            title: Evidence title
            evidence_type: Type of evidence
            file_path: Optional file path
            content: Optional text content
            obtained_date: Optional date obtained (YYYY-MM-DD)

        Returns:
            Created evidence dictionary

        Raises:
            HTTPException: If validation fails or user doesn't own case
        """
        # Verify user owns the case
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Case {case_id} not found or access denied"
            )

        # Validate that either file_path OR content is provided (not both, not neither)
        if file_path and content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either filePath or content, not both"
            )

        if not file_path and not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either filePath or content must be provided"
            )

        # Create evidence via repository
        try:
            evidence = self.repository.create(
                case_id=case_id,
                title=title,
                evidence_type=evidence_type,
                user_id=user_id,
                file_path=file_path,
                content=content,
                obtained_date=obtained_date,
            )
            return evidence

        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    # ===== READ OPERATIONS =====

    def get_evidence_by_id(
        self,
        evidence_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        """
        Get evidence by ID with ownership verification.

        Args:
            evidence_id: Evidence ID
            user_id: User ID (for ownership verification)

        Returns:
            Evidence dictionary

        Raises:
            HTTPException: If not found or access denied
        """
        # Verify ownership
        if not self.repository.verify_evidence_ownership(evidence_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence {evidence_id} not found or access denied"
            )

        # Get evidence
        evidence = self.repository.get_by_id_raw(evidence_id)

        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence {evidence_id} not found"
            )

        return evidence

    def list_all_evidence_for_user(
        self,
        user_id: int,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        List all evidence for user's cases.

        Args:
            user_id: User ID
            limit: Optional pagination limit
            offset: Optional pagination offset

        Returns:
            List of evidence dictionaries
        """
        evidence_list = self.repository.get_all_for_user(user_id)

        # Apply pagination if specified
        if offset is not None:
            evidence_list = evidence_list[offset:]
        if limit is not None:
            evidence_list = evidence_list[:limit]

        return evidence_list

    def list_evidence_for_case(
        self,
        case_id: int,
        user_id: int,
    ) -> List[Dict[str, Any]]:
        """
        List all evidence for a specific case with ownership verification.

        Args:
            case_id: Case ID
            user_id: User ID (for ownership verification)

        Returns:
            List of evidence dictionaries

        Raises:
            HTTPException: If case not found or access denied
        """
        # Verify user owns the case
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Case {case_id} not found or access denied"
            )

        return self.repository.get_all_for_case(case_id)

    # ===== UPDATE OPERATIONS =====

    def update_evidence(
        self,
        evidence_id: int,
        user_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        evidence_type: Optional[str] = None,
        obtained_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update evidence metadata with ownership verification.

        Args:
            evidence_id: Evidence ID
            user_id: User ID (for ownership verification and audit)
            title: Optional new title
            description: Optional new description
            evidence_type: Optional new evidence type
            obtained_date: Optional new obtained date

        Returns:
            Updated evidence dictionary

        Raises:
            HTTPException: If not found, access denied, or no fields provided
        """
        # Verify ownership
        if not self.repository.verify_evidence_ownership(evidence_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence {evidence_id} not found or access denied"
            )

        # Validate at least one field provided
        if all(v is None for v in [title, description, evidence_type, obtained_date]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field must be provided for update"
            )

        # Update via repository
        try:
            evidence = self.repository.update_evidence(
                evidence_id=evidence_id,
                user_id=user_id,
                title=title,
                description=description,
                evidence_type=evidence_type,
                obtained_date=obtained_date,
            )

            if not evidence:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )

            return evidence

        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    # ===== DELETE OPERATIONS =====

    def delete_evidence(
        self,
        evidence_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        """
        Delete evidence with ownership verification and file cleanup.

        Args:
            evidence_id: Evidence ID
            user_id: User ID (for ownership verification and audit)

        Returns:
            Dictionary with success status and message

        Raises:
            HTTPException: If not found or access denied
        """
        # Verify ownership
        if not self.repository.verify_evidence_ownership(evidence_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence {evidence_id} not found or access denied"
            )

        # Get file path before deletion for cleanup
        file_path = self.repository.get_file_path(evidence_id)

        # Delete from database
        try:
            deleted = self.repository.delete_evidence(evidence_id, user_id)

            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Evidence {evidence_id} not found"
                )

            # Clean up file if it exists
            if file_path:
                self._cleanup_file(file_path)

            return {
                "success": True,
                "message": "Evidence deleted successfully",
                "id": evidence_id,
            }

        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    # ===== DOCUMENT OPERATIONS =====

    def parse_document(
        self,
        evidence_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        """
        Parse document and extract text/metadata.

        Args:
            evidence_id: Evidence ID
            user_id: User ID (for ownership verification)

        Returns:
            Parsed document data with text and metadata

        Raises:
            HTTPException: If not found, access denied, or parsing fails
        """
        # Verify ownership
        if not self.repository.verify_evidence_ownership(evidence_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence {evidence_id} not found or access denied"
            )

        if not self.document_parser:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Document parser service not available"
            )

        # Get file path
        result = self.repository.get_file_path_and_content(evidence_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence {evidence_id} not found"
            )

        file_path, content = result

        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file path associated with this evidence"
            )

        # Parse document
        try:
            parsed = self.document_parser.parse_document(Path(file_path))
            return {
                "content": parsed.get("content", ""),
                "metadata": parsed.get("metadata", {}),
            }
        except Exception as e:
            logger.error(f"Document parsing failed for evidence {evidence_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Document parsing failed: {str(e)}"
            )

    # ===== HELPER METHODS =====

    def _cleanup_file(self, file_path: str) -> None:
        """
        Clean up evidence file from filesystem.

        Args:
            file_path: Path to file to delete
        """
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                path.unlink()
                logger.info(f"Deleted evidence file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete evidence file {file_path}: {e}")

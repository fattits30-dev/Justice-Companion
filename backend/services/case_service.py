"""
Case service for legal case management.
Migrated from src/services/CaseService.ts

Features:
- Full case CRUD operations with user ownership verification
- Field-level encryption for sensitive data (description)
- Comprehensive audit logging for all operations
- Search functionality with filters
- User isolation (users can only access their own cases)
- Status management (active, closed, pending)

Security:
- All operations verify user_id ownership
- Encrypted description field (AES-256-GCM)
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent cases
- All security events audited
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException

from backend.models.case import Case, CaseType, CaseStatus
from backend.services.security.encryption import EncryptionService, EncryptedData


class CaseNotFoundError(Exception):
    """Exception raised when case is not found."""


class UnauthorizedError(Exception):
    """Exception raised when user doesn't own the case."""


class DatabaseError(Exception):
    """Exception raised for database operation failures."""


class ValidationError(Exception):
    """Exception raised for invalid input data."""


# Pydantic models for input/output
from pydantic import BaseModel, Field, ConfigDict


class CreateCaseInput(BaseModel):
    """Input model for creating a new case."""

    title: str = Field(..., min_length=1, max_length=255, description="Case title")
    description: Optional[str] = Field(None, description="Case description (optional)")
    case_type: CaseType = Field(..., description="Type of legal case")

    model_config = ConfigDict(use_enum_values=True)


class UpdateCaseInput(BaseModel):
    """Input model for updating an existing case."""

    title: Optional[str] = Field(
        None, min_length=1, max_length=255, description="Case title"
    )
    description: Optional[str] = Field(None, description="Case description")
    case_type: Optional[CaseType] = Field(None, description="Type of legal case")
    status: Optional[CaseStatus] = Field(None, description="Case status")

    model_config = ConfigDict(use_enum_values=True)


class CaseResponse(BaseModel):
    """Response model for case data."""

    id: int
    title: str
    description: Optional[str]
    case_type: str
    status: str
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SearchFilters(BaseModel):
    """Search filters for case queries."""

    case_status: Optional[List[CaseStatus]] = Field(
        None, description="Filter by status"
    )
    case_type: Optional[List[CaseType]] = Field(None, description="Filter by case type")
    date_from: Optional[datetime] = Field(
        None, description="Filter by creation date (from)"
    )
    date_to: Optional[datetime] = Field(
        None, description="Filter by creation date (to)"
    )

    model_config = ConfigDict(use_enum_values=True)


class CaseService:
    """
    Business logic layer for case management.
    Handles encryption, authorization, and audit logging.

    All operations verify user ownership to prevent unauthorized access.
    """

    def __init__(
        self, db: Session, encryption_service: EncryptionService, audit_logger=None
    ):
        """
        Initialize case service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Encryption service for sensitive fields
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

    def _verify_ownership(self, case: Case, user_id: int) -> None:
        """
        Verify that user owns the case.

        Args:
            case: Case instance to verify
            user_id: User ID making the request

        Raises:
            HTTPException: 403 if user doesn't own the case
        """
        if case.user_id != user_id:
            self._log_audit(
                event_type="case.unauthorized_access",
                user_id=user_id,
                resource_id=str(case.id),
                action="access_denied",
                success=False,
                details={
                    "reason": "User does not own this case",
                    "case_owner": case.user_id,
                    "requesting_user": user_id,
                },
            )
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have permission to access this case",
            )

    def _encrypt_description(self, description: Optional[str]) -> Optional[str]:
        """
        Encrypt case description field.

        Args:
            description: Plain text description

        Returns:
            JSON string of encrypted data or None
        """
        if not description:
            return None

        encrypted = self.encryption_service.encrypt(description)
        if encrypted:
            return str(encrypted.to_dict())  # Convert to JSON string
        return None

    def _decrypt_description(self, encrypted_str: Optional[str]) -> Optional[str]:
        """
        Decrypt case description field with backward compatibility.

        Args:
            encrypted_str: Encrypted JSON string or legacy plaintext

        Returns:
            Decrypted plaintext or None
        """
        if not encrypted_str:
            return None

        try:
            # Try to parse as encrypted data
            import json

            encrypted_dict = json.loads(encrypted_str)

            if self.encryption_service.is_encrypted(encrypted_dict):
                encrypted_data = EncryptedData.from_dict(encrypted_dict)
                return self.encryption_service.decrypt(encrypted_data)

            # Not encrypted format - return as-is (legacy plaintext)
            return encrypted_str
        except (json.JSONDecodeError, Exception):
            # JSON parse failed - likely legacy plaintext
            return encrypted_str

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
                resource_type="case",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message,
            )

    async def create_case(
        self, input_data: CreateCaseInput, user_id: int
    ) -> CaseResponse:
        """
        Create a new case for the user.

        Args:
            input_data: Case creation data
            user_id: ID of user creating the case

        Returns:
            Created case data

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If input validation fails
        """
        try:
            # Encrypt description if provided
            encrypted_description = self._encrypt_description(input_data.description)

            # Create case instance
            case = Case(
                title=input_data.title,
                description=encrypted_description,
                case_type=input_data.case_type,
                status=CaseStatus.ACTIVE,
                user_id=user_id,
            )

            self.db.add(case)
            self.db.commit()
            self.db.refresh(case)

            # Decrypt description for response
            case.description = self._decrypt_description(case.description)

            self._log_audit(
                event_type="case.create",
                user_id=user_id,
                resource_id=str(case.id),
                action="create",
                success=True,
                details={
                    "title": case.title,
                    "case_type": (
                        case.case_type.value
                        if isinstance(case.case_type, CaseType)
                        else case.case_type
                    ),
                },
            )

            return CaseResponse.model_validate(case)

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="case.create",
                user_id=user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to create case: {str(error)}")

    async def get_all_cases(self, user_id: int) -> List[CaseResponse]:
        """
        Get all cases belonging to the user.

        Args:
            user_id: ID of user requesting cases

        Returns:
            List of user's cases
        """
        try:
            cases = (
                self.db.query(Case)
                .filter(Case.user_id == user_id)
                .order_by(Case.created_at.desc())
                .all()
            )

            # Decrypt descriptions
            for case in cases:
                case.description = self._decrypt_description(case.description)

            return [CaseResponse.model_validate(case) for case in cases]

        except Exception as error:
            self._log_audit(
                event_type="case.list",
                user_id=user_id,
                resource_id="all",
                action="read",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to retrieve cases: {str(error)}")

    async def get_case_by_id(self, case_id: int, user_id: int) -> CaseResponse:
        """
        Get a specific case by ID with ownership verification.

        Args:
            case_id: Case ID
            user_id: ID of user requesting the case

        Returns:
            Case data

        Raises:
            CaseNotFoundError: If case doesn't exist
            HTTPException: 403 if user doesn't own the case
        """
        case = self.db.query(Case).filter(Case.id == case_id).first()

        if not case:
            self._log_audit(
                event_type="case.read",
                user_id=user_id,
                resource_id=str(case_id),
                action="read",
                success=False,
                details={"reason": "Case not found"},
            )
            raise CaseNotFoundError(f"Case with ID {case_id} not found")

        # Verify ownership
        self._verify_ownership(case, user_id)

        # Decrypt description
        original_description = case.description
        case.description = self._decrypt_description(case.description)

        # Audit PII access (encrypted description field)
        if original_description and case.description != original_description:
            self._log_audit(
                event_type="case.pii_access",
                user_id=user_id,
                resource_id=str(case_id),
                action="read",
                success=True,
                details={"field": "description", "encrypted": True},
            )

        return CaseResponse.model_validate(case)

    async def update_case(
        self, case_id: int, user_id: int, input_data: UpdateCaseInput
    ) -> CaseResponse:
        """
        Update a case with ownership verification.

        Args:
            case_id: Case ID to update
            user_id: ID of user updating the case
            input_data: Updated case data

        Returns:
            Updated case data

        Raises:
            CaseNotFoundError: If case doesn't exist
            HTTPException: 403 if user doesn't own the case
            DatabaseError: If database operation fails
        """
        case = self.db.query(Case).filter(Case.id == case_id).first()

        if not case:
            raise CaseNotFoundError(f"Case with ID {case_id} not found")

        # Verify ownership
        self._verify_ownership(case, user_id)

        try:
            fields_updated = []

            # Update fields if provided
            if input_data.title is not None:
                case.title = input_data.title
                fields_updated.append("title")

            if input_data.description is not None:
                case.description = self._encrypt_description(input_data.description)
                fields_updated.append("description")

            if input_data.case_type is not None:
                case.case_type = input_data.case_type
                fields_updated.append("case_type")

            if input_data.status is not None:
                case.status = input_data.status
                fields_updated.append("status")

            self.db.commit()
            self.db.refresh(case)

            # Decrypt description for response
            case.description = self._decrypt_description(case.description)

            self._log_audit(
                event_type="case.update",
                user_id=user_id,
                resource_id=str(case_id),
                action="update",
                success=True,
                details={"fields_updated": fields_updated},
            )

            return CaseResponse.model_validate(case)

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="case.update",
                user_id=user_id,
                resource_id=str(case_id),
                action="update",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to update case: {str(error)}")

    async def close_case(self, case_id: int, user_id: int) -> CaseResponse:
        """
        Close a case (set status to 'closed') with ownership verification.

        Args:
            case_id: Case ID to close
            user_id: ID of user closing the case

        Returns:
            Updated case data

        Raises:
            CaseNotFoundError: If case doesn't exist
            HTTPException: 403 if user doesn't own the case
        """
        return await self.update_case(
            case_id=case_id,
            user_id=user_id,
            input_data=UpdateCaseInput(status=CaseStatus.CLOSED),
        )

    async def delete_case(self, case_id: int, user_id: int) -> bool:
        """
        Delete a case with ownership verification.
        Cascades to related records via foreign key constraints.

        Args:
            case_id: Case ID to delete
            user_id: ID of user deleting the case

        Returns:
            True if deleted successfully

        Raises:
            CaseNotFoundError: If case doesn't exist
            HTTPException: 403 if user doesn't own the case
            DatabaseError: If database operation fails
        """
        case = self.db.query(Case).filter(Case.id == case_id).first()

        if not case:
            raise CaseNotFoundError(f"Case with ID {case_id} not found")

        # Verify ownership
        self._verify_ownership(case, user_id)

        try:
            self.db.delete(case)
            self.db.commit()

            self._log_audit(
                event_type="case.delete",
                user_id=user_id,
                resource_id=str(case_id),
                action="delete",
                success=True,
            )

            return True

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="case.delete",
                user_id=user_id,
                resource_id=str(case_id),
                action="delete",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to delete case: {str(error)}")

    async def search_cases(
        self,
        user_id: int,
        query: Optional[str] = None,
        filters: Optional[SearchFilters] = None,
    ) -> List[CaseResponse]:
        """
        Search user's cases by query string and filters.

        Args:
            user_id: ID of user searching cases
            query: Text search query (searches title and description)
            filters: Optional search filters (status, type, date range)

        Returns:
            List of matching cases

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            # Start with user filter (critical for security)
            conditions = [Case.user_id == user_id]

            # Text search (title and description)
            # Note: Description is encrypted, so search only works on plaintext titles
            if query:
                conditions.append(
                    or_(
                        Case.title.ilike(f"%{query}%"),
                        # Note: Can't search encrypted description efficiently
                        # Consider full-text search index on plaintext fields
                    )
                )

            # Apply filters
            if filters:
                if filters.case_status:
                    conditions.append(Case.status.in_(filters.case_status))

                if filters.case_type:
                    conditions.append(Case.case_type.in_(filters.case_type))

                if filters.date_from:
                    conditions.append(Case.created_at >= filters.date_from)

                if filters.date_to:
                    conditions.append(Case.created_at <= filters.date_to)

            # Execute query
            cases = (
                self.db.query(Case)
                .filter(and_(*conditions))
                .order_by(Case.created_at.desc())
                .all()
            )

            # Decrypt descriptions
            for case in cases:
                case.description = self._decrypt_description(case.description)

            return [CaseResponse.model_validate(case) for case in cases]

        except Exception as error:
            self._log_audit(
                event_type="case.search",
                user_id=user_id,
                resource_id="search",
                action="read",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to search cases: {str(error)}")

    async def get_case_statistics(self, user_id: int) -> Dict[str, Any]:
        """
        Get case statistics for the user.

        Args:
            user_id: ID of user requesting statistics

        Returns:
            Dictionary with total cases and status breakdown
        """
        try:
            cases = self.db.query(Case).filter(Case.user_id == user_id).all()

            status_counts = {"active": 0, "closed": 0, "pending": 0}

            for case in cases:
                status_key = (
                    case.status.value
                    if isinstance(case.status, CaseStatus)
                    else case.status
                )
                if status_key in status_counts:
                    status_counts[status_key] += 1

            return {"total_cases": len(cases), "status_counts": status_counts}

        except Exception as error:
            raise DatabaseError(f"Failed to get case statistics: {str(error)}")

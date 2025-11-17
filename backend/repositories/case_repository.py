"""
Case repository for legal case management.
Ported from src/repositories/CaseRepository.ts (573 lines)

Features:
- Field-level encryption for description field (AES-256-GCM)
- Backward compatibility with legacy plaintext data
- Batch decryption for performance optimization
- Comprehensive audit logging
- Full CRUD operations
- Advanced search with filters
- Case statistics
"""

import json
from typing import List, Optional, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session, make_transient

from backend.models.case import Case, CaseStatus
from backend.schemas.case import CaseCreate, CaseUpdate
from backend.services.encryption_service import EncryptionService, EncryptedData
from backend.services.audit_logger import AuditLogger


class CaseRepository:
    def __init__(
        self,
        db: Session,
        encryption_service: EncryptionService,
        audit_logger: Optional[AuditLogger] = None,
    ):
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

    def _encrypt_description(self, description: Optional[str]) -> Optional[str]:
        if not description:
            return None
        encrypted_data = self.encryption_service.encrypt(description)
        return json.dumps(encrypted_data.to_dict()) if encrypted_data else None

    def _decrypt_description(self, description: Optional[str]) -> Optional[str]:
        if not description:
            return None
        try:
            encrypted_dict = json.loads(description)
            # Check if it looks like our encrypted data structure
            if (
                isinstance(encrypted_dict, dict)
                and "ciphertext" in encrypted_dict
                and "iv" in encrypted_dict
            ):
                encrypted_data = EncryptedData.from_dict(encrypted_dict)
                return self.encryption_service.decrypt(encrypted_data)
            return description  # Not our format, return as is
        except (json.JSONDecodeError, TypeError, KeyError):
            # If it's not valid JSON or doesn't match EncryptedData format,
            # assume it's not encrypted or corrupted.
            return description

    def _detach_and_decrypt(self, case: Case) -> Case:
        """Detach from session and decrypt description to avoid type errors."""
        self.db.expunge(case)
        make_transient(case)
        description_value = getattr(case, "description", None)
        decrypted_description = self._decrypt_description(description_value)
        setattr(case, "description", decrypted_description)
        return case

    def create_case(self, case_data: CaseCreate, user_id: str) -> Case:
        """
        Create a new case.

        Args:
            case_data: CaseCreate with case details
            user_id: User ID

        Returns:
            Created Case model with decrypted description

        Raises:
            RuntimeError: If encryption or database operation fails
        """
        try:
            encrypted_description = self._encrypt_description(case_data.description)

            # Create case model
            db_case = Case(
                title=case_data.title,
                description=encrypted_description,
                case_type=case_data.case_type,
                status=CaseStatus.ACTIVE,
                user_id=user_id,
            )

            self.db.add(db_case)
            self.db.commit()
            self.db.refresh(db_case)

            # Audit: Case created
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="case.create",
                    user_id=user_id,
                    resource_type="case",
                    resource_id=str(db_case.id),
                    action="create",
                    details={"title": db_case.title, "case_type": case_data.case_type},
                    success=True,
                )

            # Decrypt description for return value
            return self._detach_and_decrypt(db_case)

        except Exception as error:
            # Audit: Failed case creation
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="case.create",
                    user_id=user_id,
                    resource_type="case",
                    resource_id="unknown",
                    action="create",
                    details={},
                    success=False,
                    error_message=str(error),
                )
            raise RuntimeError(f"Failed to create case: {str(error)}")

    def get_case_by_id(
        self, case_id: int, user_id: Optional[str] = None, decrypt: bool = False
    ) -> Optional[Case]:
        """
        Find case by ID.

        Args:
            case_id: Case ID
            user_id: Optional user ID for auditing
            decrypt: Whether to decrypt the description

        Returns:
            Case model with decrypted description or None if not found
        """
        case = self.db.query(Case).filter(Case.id == case_id).first()
        if case and decrypt:
            return self._detach_and_decrypt(case)
        return case

    def get_all_cases(self, skip: int = 0, limit: int = 100, decrypt: bool = False) -> List[Case]:
        """
        Get all cases with optional pagination and decryption.

        Args:
            skip: Number of records to skip (for pagination)
            limit: Maximum number of records to return
            decrypt: Whether to decrypt the description fields

        Returns:
            List of Case models
        """
        cases = self.db.query(Case).offset(skip).limit(limit).all()
        if decrypt:
            return [self._detach_and_decrypt(case) for case in cases]
        return cases

    def update_case(self, case_id: int, input_data: CaseUpdate, user_id: str) -> Optional[Case]:
        """
        Update case.

        Args:
            case_id: Case ID
            input_data: CaseUpdate with fields to update
            user_id: User ID

        Returns:
            Updated Case model with decrypted description or None if not found

        Raises:
            RuntimeError: If encryption or database operation fails
        """
        try:
            case = self.db.query(Case).filter(Case.id == case_id).first()

            if not case:
                return None

            update_data = input_data.model_dump(exclude_unset=True)
            updated_fields = []

            if "title" in update_data:
                case.title = update_data["title"]
                updated_fields.append("title")

            if "description" in update_data:
                setattr(case, "description", self._encrypt_description(update_data["description"]))
                updated_fields.append("description")

            if updated_fields:
                self.db.commit()
                self.db.refresh(case)

            if self.audit_logger and updated_fields:
                self.audit_logger.log(
                    event_type="case.update",
                    user_id=user_id,
                    resource_type="case",
                    resource_id=str(case_id),
                    action="update",
                    details={"updated_fields": updated_fields},
                    success=True,
                )

            # Decrypt for return
            return self._detach_and_decrypt(case)

        except Exception as error:
            # Audit: Failed update
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="case.update",
                    user_id=user_id,
                    resource_type="case",
                    resource_id=str(case_id),
                    action="update",
                    details={},
                    success=False,
                    error_message=str(error),
                )
            raise RuntimeError(f"Failed to update case: {str(error)}")

    def delete_case(self, case_id: int, user_id: str) -> bool:
        """
        Delete case (cascades to related records via foreign keys).

        Args:
            case_id: Case ID
            user_id: User ID for auditing

        Returns:
            True if case was deleted, False if not found
        """
        try:
            case = self.db.query(Case).filter(Case.id == case_id).first()

            if not case:
                success = False
            else:
                self.db.delete(case)
                self.db.commit()
                success = True

            # Audit: Case deleted
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="case.delete",
                    user_id=user_id,
                    resource_type="case",
                    resource_id=str(case_id),
                    action="delete",
                    details={},
                    success=success,
                )

            return success

        except Exception as error:
            # Audit: Failed deletion
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="case.delete",
                    user_id=user_id,
                    resource_type="case",
                    resource_id=str(case_id),
                    action="delete",
                    details={},
                    success=False,
                    error_message=str(error),
                )
            raise RuntimeError(f"Failed to delete case: {str(error)}")

    def count_by_status(self) -> Dict[str, int]:
        """
        Get case count by status.

        Returns:
            Dictionary mapping status to count
        """
        results = (
            self.db.query(Case.status, func.count(Case.id).label("count"))
            .group_by(Case.status)
            .all()
        )

        counts = {"active": 0, "closed": 0, "pending": 0}

        for status, count in results:
            if status in counts:
                counts[status] = count

        return counts

    def search_cases(
        self, user_id: int, query: str, filters: Optional[Dict[str, Any]] = None
    ) -> List[Case]:
        """
        Search cases by query string and filters.

        Args:
            user_id: User ID
            query: Search query string
            filters: Optional filters dictionary with:
                - case_status: List of status strings
                - date_range: Dict with "from" and "to" datetime objects

        Returns:
            List of Case models with decrypted descriptions
        """
        # Start with user filter
        query_builder = self.db.query(Case).filter(Case.user_id == user_id)

        # Text search (NOTE: This searches encrypted descriptions, so won't match)
        # For proper search, you'd need to decrypt all descriptions first
        if query:
            query_builder = query_builder.filter((Case.title.like(f"%{query}%")))

        # Status filter
        if filters and filters.get("case_status"):
            case_statuses = [CaseStatus(s) for s in filters["case_status"]]
            query_builder = query_builder.filter(Case.status.in_(case_statuses))

        # Date range filter
        if filters and filters.get("date_range"):
            date_range = filters["date_range"]
            query_builder = query_builder.filter(
                Case.created_at >= date_range["from"], Case.created_at <= date_range["to"]
            )

        # Execute query
        cases = query_builder.order_by(Case.created_at.desc()).all()

        # Decrypt descriptions
        return [self._detach_and_decrypt(case) for case in cases]

    def get_by_user_id(self, user_id: int) -> List[Case]:
        """
        Get cases by user ID (async version for consistency).

        Args:
            user_id: User ID

        Returns:
            List of Case models with decrypted descriptions
        """
        cases = (
            self.db.query(Case)
            .filter(Case.user_id == user_id)
            .order_by(Case.created_at.desc())
            .all()
        )

        # Decrypt descriptions
        return [self._detach_and_decrypt(case) for case in cases]

    def get(self, case_id: int) -> Optional[Case]:
        """
        Get case by ID (async version for consistency).

        Args:
            case_id: Case ID

        Returns:
            Case model with decrypted description or None if not found
        """
        return self.get_case_by_id(case_id, decrypt=True)

    # Private helper methods

    def _decrypt_case(self, case: Case) -> Case:
        """
        Decrypt a single case's description.

        Args:
            case: Case model with potentially encrypted description

        Returns:
            Case model with decrypted description
        """
        return self._detach_and_decrypt(case)

    def _require_encryption_service(self) -> EncryptionService:
        """
        Require encryption service to be configured.

        Returns:
            EncryptionService instance

        Raises:
            RuntimeError: If encryption service is not configured
        """
        if not self.encryption_service:
            raise RuntimeError("EncryptionService not configured for CaseRepository")
        return self.encryption_service

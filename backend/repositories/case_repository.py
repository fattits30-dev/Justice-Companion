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
import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.case import Case, CaseStatus, CaseType
from backend.services.encryption_service import EncryptionService, EncryptedData
from backend.services.audit_logger import AuditLogger


class CreateCaseInput:
    """Input for creating a new case."""
    def __init__(self, title: str, description: Optional[str], case_type: str, user_id: int):
        self.title = title
        self.description = description
        self.case_type = case_type
        self.user_id = user_id


class UpdateCaseInput:
    """Input for updating an existing case."""
    def __init__(
        self,
        title: Optional[str] = None,
        description: Optional[str] = None,
        case_type: Optional[str] = None,
        status: Optional[str] = None
    ):
        self.title = title
        self.description = description
        self.case_type = case_type
        self.status = status


class CaseRepository:
    """
    Case repository for legal case management.
    Ported from TypeScript CaseRepository with identical functionality.

    Security:
    - Encrypts description field before INSERT/UPDATE
    - Decrypts description after SELECT
    - Handles legacy plaintext data gracefully
    - Batch decryption for performance
    """

    def __init__(self, db: Session, encryption_service: EncryptionService, audit_logger: Optional[AuditLogger] = None):
        """
        Initialize case repository.

        Args:
            db: SQLAlchemy database session
            encryption_service: Encryption service for description field
            audit_logger: Optional audit logger for security events
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

    def create(self, input_data: CreateCaseInput) -> Case:
        """
        Create a new case.

        Args:
            input_data: CreateCaseInput with case details

        Returns:
            Created Case model with decrypted description

        Raises:
            RuntimeError: If encryption or database operation fails
        """
        try:
            encryption = self._require_encryption_service()

            # Encrypt description before INSERT
            description_to_store: Optional[str] = None
            if input_data.description:
                encrypted_description = encryption.encrypt(input_data.description)
                if encrypted_description:
                    description_to_store = json.dumps(encrypted_description.to_dict())

            # Create case model
            case = Case(
                title=input_data.title,
                description=description_to_store,
                case_type=CaseType(input_data.case_type),
                status=CaseStatus.active,
                user_id=input_data.user_id
            )

            self.db.add(case)
            self.db.commit()
            self.db.refresh(case)

            # Decrypt description for return value
            case.description = self._decrypt_description(case.description)

            # Audit: Case created
            if self.audit_logger:
                self.audit_logger.log({
                    "event_type": "case.create",
                    "resource_type": "case",
                    "resource_id": str(case.id),
                    "action": "create",
                    "user_id": input_data.user_id,
                    "details": {
                        "title": case.title,
                        "case_type": input_data.case_type
                    },
                    "success": True
                })

            return case

        except Exception as error:
            # Audit: Failed case creation
            if self.audit_logger:
                self.audit_logger.log({
                    "event_type": "case.create",
                    "resource_type": "case",
                    "resource_id": "unknown",
                    "action": "create",
                    "success": False,
                    "error_message": str(error)
                })
            raise RuntimeError(f"Failed to create case: {str(error)}")

    def find_by_id(self, case_id: int) -> Optional[Case]:
        """
        Find case by ID.

        Args:
            case_id: Case ID

        Returns:
            Case model with decrypted description or None if not found
        """
        case = self.db.query(Case).filter(Case.id == case_id).first()

        if case:
            # Decrypt description after SELECT
            original_description = case.description
            case.description = self._decrypt_description(case.description)

            # Audit: PII accessed (encrypted description field)
            if self.audit_logger and original_description and case.description != original_description:
                self.audit_logger.log({
                    "event_type": "case.pii_access",
                    "resource_type": "case",
                    "resource_id": str(case_id),
                    "action": "read",
                    "details": {"field": "description", "encrypted": True},
                    "success": True
                })

        return case

    def find_by_user_id(self, user_id: int) -> List[Case]:
        """
        Find all cases belonging to a specific user.

        Args:
            user_id: User ID

        Returns:
            List of Case models with decrypted descriptions
        """
        cases = self.db.query(Case).filter(Case.user_id == user_id).all()

        # Decrypt descriptions if encryption service is available
        return [self._decrypt_case(case) for case in cases]

    def find_all(self, status: Optional[str] = None) -> List[Case]:
        """
        Find all cases with optional status filter.

        Args:
            status: Optional status filter ("active", "closed", "pending")

        Returns:
            List of Case models with decrypted descriptions
        """
        query = self.db.query(Case)

        if status:
            query = query.filter(Case.status == CaseStatus(status))

        cases = query.all()

        # Use batch decryption if enabled and encryption service is available
        use_batch_encryption = os.getenv("ENABLE_BATCH_ENCRYPTION", "true").lower() != "false"

        if use_batch_encryption and self.encryption_service and len(cases) > 0:
            try:
                # Collect all encrypted descriptions for batch decryption
                encrypted_descriptions: List[Optional[EncryptedData]] = []

                for case in cases:
                    if not case.description:
                        encrypted_descriptions.append(None)
                        continue

                    try:
                        encrypted_dict = json.loads(case.description)
                        if self.encryption_service.is_encrypted(encrypted_dict):
                            encrypted_data = EncryptedData.from_dict(encrypted_dict)
                            encrypted_descriptions.append(encrypted_data)
                        else:
                            encrypted_descriptions.append(None)  # Legacy plaintext
                    except (json.JSONDecodeError, KeyError):
                        encrypted_descriptions.append(None)  # Legacy plaintext

                # Batch decrypt all encrypted descriptions
                decrypted_descriptions = self.encryption_service.batch_decrypt(encrypted_descriptions)

                # Map decrypted descriptions back to cases
                result = []
                for i, case in enumerate(cases):
                    # If we have a decrypted value from batch, use it
                    if encrypted_descriptions[i] is not None:
                        case.description = decrypted_descriptions[i]
                    elif case.description and encrypted_descriptions[i] is None:
                        # Legacy plaintext or failed parse - keep original
                        pass

                    result.append(case)

                return result

            except Exception as error:
                # Graceful fallback for legacy or corrupted entries
                if self.audit_logger:
                    self.audit_logger.log({
                        "event_type": "encryption.decrypt",
                        "resource_type": "case",
                        "resource_id": "batch",
                        "action": "decrypt",
                        "details": {
                            "count": len(cases),
                            "reason": "batch_decrypt_failed",
                            "strategy": "batch_fallback"
                        },
                        "success": False,
                        "error_message": str(error)
                    })

                # Fallback to individual decryption
                return [self._decrypt_case(case) for case in cases]

        # Fallback to individual decryption
        return [self._decrypt_case(case) for case in cases]

    def update(self, case_id: int, input_data: UpdateCaseInput) -> Optional[Case]:
        """
        Update case.

        Args:
            case_id: Case ID
            input_data: UpdateCaseInput with fields to update

        Returns:
            Updated Case model with decrypted description or None if not found

        Raises:
            RuntimeError: If encryption or database operation fails
        """
        try:
            case = self.db.query(Case).filter(Case.id == case_id).first()

            if not case:
                return None

            encryption = self._require_encryption_service()
            fields_updated = []

            # Update fields
            if input_data.title is not None:
                case.title = input_data.title
                fields_updated.append("title")

            if input_data.description is not None:
                # Encrypt description before UPDATE
                if input_data.description:
                    encrypted_description = encryption.encrypt(input_data.description)
                    case.description = json.dumps(encrypted_description.to_dict()) if encrypted_description else None
                else:
                    case.description = None
                fields_updated.append("description")

            if input_data.case_type is not None:
                case.case_type = CaseType(input_data.case_type)
                fields_updated.append("case_type")

            if input_data.status is not None:
                case.status = CaseStatus(input_data.status)
                fields_updated.append("status")

            if len(fields_updated) == 0:
                # No changes
                case.description = self._decrypt_description(case.description)
                return case

            # Update timestamp (SQLAlchemy handles this automatically with onupdate)
            self.db.commit()
            self.db.refresh(case)

            # Decrypt description for return value
            case.description = self._decrypt_description(case.description)

            # Audit: Case updated
            if self.audit_logger:
                self.audit_logger.log({
                    "event_type": "case.update",
                    "resource_type": "case",
                    "resource_id": str(case_id),
                    "action": "update",
                    "details": {"fields_updated": fields_updated},
                    "success": True
                })

            return case

        except Exception as error:
            # Audit: Failed update
            if self.audit_logger:
                self.audit_logger.log({
                    "event_type": "case.update",
                    "resource_type": "case",
                    "resource_id": str(case_id),
                    "action": "update",
                    "success": False,
                    "error_message": str(error)
                })
            raise RuntimeError(f"Failed to update case: {str(error)}")

    def delete(self, case_id: int) -> bool:
        """
        Delete case (cascades to related records via foreign keys).

        Args:
            case_id: Case ID

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
                self.audit_logger.log({
                    "event_type": "case.delete",
                    "resource_type": "case",
                    "resource_id": str(case_id),
                    "action": "delete",
                    "success": success
                })

            return success

        except Exception as error:
            # Audit: Failed deletion
            if self.audit_logger:
                self.audit_logger.log({
                    "event_type": "case.delete",
                    "resource_type": "case",
                    "resource_id": str(case_id),
                    "action": "delete",
                    "success": False,
                    "error_message": str(error)
                })
            raise RuntimeError(f"Failed to delete case: {str(error)}")

    def close(self, case_id: int) -> Optional[Case]:
        """
        Close a case.

        Args:
            case_id: Case ID

        Returns:
            Updated Case model or None if not found
        """
        return self.update(case_id, UpdateCaseInput(status="closed"))

    def count_by_status(self) -> Dict[str, int]:
        """
        Get case count by status.

        Returns:
            Dictionary mapping status to count
        """
        results = self.db.query(
            Case.status,
            func.count(Case.id).label('count')
        ).group_by(Case.status).all()

        counts = {
            "active": 0,
            "closed": 0,
            "pending": 0
        }

        for status, count in results:
            counts[status.value] = count

        return counts

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get case statistics (total count + status breakdown).

        Returns:
            Dictionary with totalCases and statusCounts
        """
        status_counts = self.count_by_status()
        total_cases = sum(status_counts.values())

        return {
            "totalCases": total_cases,
            "statusCounts": status_counts
        }

    def search_cases(
        self,
        user_id: int,
        query: str,
        filters: Optional[Dict[str, Any]] = None
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
            query_builder = query_builder.filter(
                (Case.title.like(f"%{query}%")) |
                (Case.description.like(f"%{query}%"))
            )

        # Status filter
        if filters and filters.get("case_status"):
            case_statuses = [CaseStatus(s) for s in filters["case_status"]]
            query_builder = query_builder.filter(Case.status.in_(case_statuses))

        # Date range filter
        if filters and filters.get("date_range"):
            date_range = filters["date_range"]
            query_builder = query_builder.filter(
                Case.created_at >= date_range["from"],
                Case.created_at <= date_range["to"]
            )

        # Execute query
        cases = query_builder.order_by(Case.created_at.desc()).all()

        # Decrypt descriptions
        return [self._decrypt_case(case) for case in cases]

    def get_by_user_id(self, user_id: int) -> List[Case]:
        """
        Get cases by user ID (async version for consistency).

        Args:
            user_id: User ID

        Returns:
            List of Case models with decrypted descriptions
        """
        cases = self.db.query(Case).filter(
            Case.user_id == user_id
        ).order_by(Case.created_at.desc()).all()

        # Decrypt descriptions
        return [self._decrypt_case(case) for case in cases]

    def get(self, case_id: int) -> Optional[Case]:
        """
        Get case by ID (async version for consistency).

        Args:
            case_id: Case ID

        Returns:
            Case model with decrypted description or None if not found
        """
        return self.find_by_id(case_id)

    # Private helper methods

    def _decrypt_description(self, stored_value: Optional[str]) -> Optional[str]:
        """
        Decrypt description field with backward compatibility.

        Args:
            stored_value: Encrypted JSON string or legacy plaintext

        Returns:
            Decrypted plaintext or None
        """
        if not stored_value:
            return None

        # If no encryption service, return as-is (backward compatibility)
        if not self.encryption_service:
            return stored_value

        try:
            # Try to parse as encrypted data
            encrypted_dict = json.loads(stored_value)

            # Verify it's actually encrypted data format
            if self.encryption_service.is_encrypted(encrypted_dict):
                encrypted_data = EncryptedData.from_dict(encrypted_dict)
                return self.encryption_service.decrypt(encrypted_data)

            # If it's not encrypted format, treat as legacy plaintext
            return stored_value
        except (json.JSONDecodeError, KeyError, RuntimeError):
            # JSON parse failed or decryption failed - likely legacy plaintext data
            return stored_value

    def _decrypt_case(self, case: Case) -> Case:
        """
        Decrypt a single case's description.

        Args:
            case: Case model with potentially encrypted description

        Returns:
            Case model with decrypted description
        """
        if not case.description:
            return case

        if not self.encryption_service:
            return case

        try:
            encrypted_dict = json.loads(case.description)
            if self.encryption_service.is_encrypted(encrypted_dict):
                encrypted_data = EncryptedData.from_dict(encrypted_dict)
                case.description = self.encryption_service.decrypt(encrypted_data)
        except (json.JSONDecodeError, KeyError, RuntimeError):
            # Legacy plaintext or decryption failure - keep as-is
            pass

        return case

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

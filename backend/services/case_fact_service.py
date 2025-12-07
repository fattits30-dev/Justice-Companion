"""
CaseFact service for managing case facts.

Features:
- Full CRUD operations for case facts with user ownership verification
- Optional field-level encryption for sensitive fact content
- Comprehensive audit logging for all operations
- User isolation (users can only access facts from their own cases)

Security:
- All operations verify user owns the parent case
- Encrypted fact content field (AES-256-GCM) when encryption enabled
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent facts/cases
- All operations audited
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.models.case_fact import CaseFact
from backend.repositories.case_fact_repository import CaseFactRepository
from backend.services.audit_logger import AuditLogger, log_audit_event
from backend.services.security.encryption import EncryptionService

# ===== EXCEPTIONS =====


class CaseFactNotFoundError(Exception):
    """Exception raised when case fact is not found."""


class CaseNotFoundError(Exception):
    """Exception raised when parent case is not found."""


class UnauthorizedError(Exception):
    """Exception raised when user doesn't own the case/fact."""


# ===== INPUT/OUTPUT MODELS =====


class CreateFactInput(BaseModel):
    """Input model for creating a case fact."""

    case_id: int = Field(..., gt=0, description="Case ID the fact belongs to")
    fact_content: str = Field(
        ..., min_length=1, max_length=10000, description="Fact content"
    )
    fact_category: str = Field(default="other", description="Fact category")
    importance: str = Field(default="medium", description="Importance level")

    model_config = ConfigDict(populate_by_name=True)


class UpdateFactInput(BaseModel):
    """Input model for updating a case fact."""

    fact_content: Optional[str] = Field(
        None, min_length=1, max_length=10000, description="Fact content"
    )
    fact_category: Optional[str] = Field(None, description="Fact category")
    importance: Optional[str] = Field(None, description="Importance level")

    model_config = ConfigDict(populate_by_name=True)


class FactResponse(BaseModel):
    """Response model for case fact data."""

    id: int
    caseId: int
    factContent: str
    factCategory: str
    importance: str
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ===== VALIDATION CONSTANTS =====

VALID_FACT_CATEGORIES = [
    "timeline",
    "evidence",
    "witness",
    "location",
    "communication",
    "other",
]

VALID_IMPORTANCE_LEVELS = ["low", "medium", "high", "critical"]


# ===== SERVICE CLASS =====


class CaseFactService:
    """
    Business logic layer for case fact management.

    Handles ownership verification, optional encryption, and audit logging.
    All operations verify user ownership through the parent case.
    """

    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger: Optional[AuditLogger] = None,
    ):
        """
        Initialize case fact service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Optional encryption service for sensitive fields
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger
        self.repository = CaseFactRepository(db, encryption_service, audit_logger)

    def _validate_category(self, category: str) -> str:
        """Validate and normalize fact category."""
        category = category.lower().strip()
        if category not in VALID_FACT_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {', '.join(VALID_FACT_CATEGORIES)}",
            )
        return category

    def _validate_importance(self, importance: str) -> str:
        """Validate and normalize importance level."""
        importance = importance.lower().strip()
        if importance not in VALID_IMPORTANCE_LEVELS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid importance. Must be one of: {', '.join(VALID_IMPORTANCE_LEVELS)}",
            )
        return importance

    def _log_audit(
        self,
        event_type: str,
        user_id: int,
        resource_id: str,
        action: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log an audit event."""
        log_audit_event(
            db=self.db,
            event_type=event_type,
            user_id=str(user_id),
            resource_type="case_fact",
            resource_id=resource_id,
            action=action,
            details=details or {},
            success=success,
        )

    def _fact_to_response(self, fact: CaseFact) -> FactResponse:
        """Convert CaseFact model to response model."""
        return FactResponse(
            id=fact.id,
            caseId=fact.case_id,
            factContent=fact.fact_content,
            factCategory=fact.fact_category,
            importance=fact.importance,
            createdAt=fact.created_at,
            updatedAt=fact.updated_at,
        )

    # ===== CREATE OPERATIONS =====

    async def create_fact(
        self,
        case_id: int,
        fact_content: str,
        fact_category: str,
        importance: str,
        user_id: int,
    ) -> FactResponse:
        """
        Create a new case fact.

        Args:
            case_id: Case ID the fact belongs to
            fact_content: Content of the fact
            fact_category: Category classification
            importance: Importance level
            user_id: User ID for ownership verification

        Returns:
            Created fact response

        Raises:
            HTTPException: 404 if case not found or unauthorized
            HTTPException: 400 for validation errors
        """
        # Verify case ownership
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=404, detail="Case not found or unauthorized"
            )

        # Validate inputs
        fact_category = self._validate_category(fact_category)
        importance = self._validate_importance(importance)
        fact_content = fact_content.strip()

        if not fact_content:
            raise HTTPException(status_code=400, detail="Fact content cannot be empty")

        # Create fact via repository
        fact = self.repository.create(
            case_id=case_id,
            fact_content=fact_content,
            fact_category=fact_category,
            importance=importance,
            user_id=user_id,
        )

        return self._fact_to_response(fact)

    # ===== READ OPERATIONS =====

    async def get_fact_by_id(self, fact_id: int, user_id: int) -> FactResponse:
        """
        Get a case fact by ID.

        Args:
            fact_id: Fact ID
            user_id: User ID for ownership verification

        Returns:
            Fact response

        Raises:
            HTTPException: 404 if fact not found or unauthorized
        """
        fact = self.repository.get_by_id(fact_id, user_id)

        if not fact:
            raise HTTPException(
                status_code=404, detail="Fact not found or unauthorized"
            )

        return self._fact_to_response(fact)

    async def get_facts_by_case_id(
        self,
        case_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FactResponse]:
        """
        Get all facts for a case.

        Args:
            case_id: Case ID
            user_id: User ID for ownership verification
            skip: Pagination offset
            limit: Maximum results

        Returns:
            List of fact responses

        Raises:
            HTTPException: 404 if case not found or unauthorized
        """
        # Verify case ownership
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=404, detail="Case not found or unauthorized"
            )

        facts = self.repository.get_facts_by_case_id(case_id, user_id, skip, limit)
        return [self._fact_to_response(fact) for fact in facts]

    async def count_facts_by_case_id(self, case_id: int, user_id: int) -> int:
        """
        Count facts for a case.

        Args:
            case_id: Case ID
            user_id: User ID for ownership verification

        Returns:
            Number of facts

        Raises:
            HTTPException: 404 if case not found or unauthorized
        """
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=404, detail="Case not found or unauthorized"
            )

        return self.repository.count_facts_by_case_id(case_id, user_id)

    # ===== UPDATE OPERATIONS =====

    async def update_fact(
        self,
        fact_id: int,
        user_id: int,
        fact_content: Optional[str] = None,
        fact_category: Optional[str] = None,
        importance: Optional[str] = None,
    ) -> FactResponse:
        """
        Update a case fact.

        Args:
            fact_id: Fact ID to update
            user_id: User ID for ownership verification
            fact_content: New content (optional)
            fact_category: New category (optional)
            importance: New importance (optional)

        Returns:
            Updated fact response

        Raises:
            HTTPException: 404 if fact not found or unauthorized
            HTTPException: 400 for validation errors
        """
        # Validate inputs if provided
        if fact_category is not None:
            fact_category = self._validate_category(fact_category)

        if importance is not None:
            importance = self._validate_importance(importance)

        if fact_content is not None:
            fact_content = fact_content.strip()
            if not fact_content:
                raise HTTPException(
                    status_code=400, detail="Fact content cannot be empty"
                )

        # Update via repository
        fact = self.repository.update(
            fact_id=fact_id,
            user_id=user_id,
            fact_content=fact_content,
            fact_category=fact_category,
            importance=importance,
        )

        if not fact:
            raise HTTPException(
                status_code=404, detail="Fact not found or unauthorized"
            )

        return self._fact_to_response(fact)

    # ===== DELETE OPERATIONS =====

    async def delete_fact(self, fact_id: int, user_id: int) -> bool:
        """
        Delete a case fact.

        Args:
            fact_id: Fact ID to delete
            user_id: User ID for ownership verification

        Returns:
            True if deleted

        Raises:
            HTTPException: 404 if fact not found or unauthorized
        """
        deleted = self.repository.delete(fact_id, user_id)

        if not deleted:
            raise HTTPException(
                status_code=404, detail="Fact not found or unauthorized"
            )

        return True

    async def delete_all_facts_for_case(self, case_id: int, user_id: int) -> int:
        """
        Delete all facts for a case.

        Args:
            case_id: Case ID
            user_id: User ID for ownership verification

        Returns:
            Number of facts deleted

        Raises:
            HTTPException: 404 if case not found or unauthorized
        """
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=404, detail="Case not found or unauthorized"
            )

        return self.repository.delete_all_by_case_id(case_id, user_id)

    # ===== BULK OPERATIONS =====

    async def bulk_create_facts(
        self,
        case_id: int,
        facts_data: List[Dict[str, Any]],
        user_id: int,
    ) -> List[FactResponse]:
        """
        Create multiple facts at once.

        Args:
            case_id: Case ID the facts belong to
            facts_data: List of fact data dicts
            user_id: User ID for ownership verification

        Returns:
            List of created fact responses

        Raises:
            HTTPException: 404 if case not found or unauthorized
        """
        if not self.repository.verify_case_ownership(case_id, user_id):
            raise HTTPException(
                status_code=404, detail="Case not found or unauthorized"
            )

        # Validate each fact
        validated_facts = []
        for data in facts_data:
            category = self._validate_category(
                data.get("fact_category", data.get("factCategory", "other"))
            )
            importance = self._validate_importance(data.get("importance", "medium"))
            content = data.get("fact_content", data.get("factContent", "")).strip()

            if not content:
                raise HTTPException(
                    status_code=400, detail="Fact content cannot be empty"
                )

            validated_facts.append(
                {
                    "fact_content": content,
                    "fact_category": category,
                    "importance": importance,
                }
            )

        # Create via repository
        facts = self.repository.bulk_create(case_id, validated_facts, user_id)
        return [self._fact_to_response(fact) for fact in facts]

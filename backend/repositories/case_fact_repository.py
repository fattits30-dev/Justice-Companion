"""
CaseFact repository for data access operations.

Handles all database operations for case facts including:
- CRUD operations for case fact records
- Case ownership verification
- Optional field encryption for sensitive fact content
- Audit logging for compliance
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models.case_fact import CaseFact
from backend.repositories.base import BaseRepository
from backend.services.audit_logger import AuditLogger
from backend.services.security.encryption import EncryptionService


class CaseFactRepository(BaseRepository[CaseFact]):
    """
    Repository for CaseFact entity data access.

    Handles all database operations for case fact records,
    including ownership verification through case relationships.
    """

    model = CaseFact

    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger: Optional[AuditLogger] = None,
    ):
        """
        Initialize case fact repository.

        Args:
            db: SQLAlchemy session
            encryption_service: Optional encryption for sensitive fields
            audit_logger: Optional audit logger for tracking operations
        """
        super().__init__(db, encryption_service, audit_logger)

    # ===== OWNERSHIP VERIFICATION =====

    def verify_case_ownership(self, case_id: int, user_id: int) -> bool:
        """
        Verify that a case belongs to the specified user.

        Args:
            case_id: Case ID to verify
            user_id: User ID to check ownership

        Returns:
            True if user owns the case, False otherwise
        """
        query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        result = self.db.execute(
            query, {"case_id": case_id, "user_id": user_id}
        ).fetchone()
        return result is not None

    def verify_fact_ownership(self, fact_id: int, user_id: int) -> bool:
        """
        Verify that a fact belongs to a case owned by the specified user.

        Args:
            fact_id: Fact ID to verify
            user_id: User ID to check ownership

        Returns:
            True if user owns the fact (via case), False otherwise
        """
        query = text(
            """
            SELECT f.id
            FROM case_facts f
            INNER JOIN cases c ON f.case_id = c.id
            WHERE f.id = :fact_id AND c.user_id = :user_id
        """
        )
        result = self.db.execute(
            query, {"fact_id": fact_id, "user_id": user_id}
        ).fetchone()
        return result is not None

    # ===== CREATE OPERATIONS =====

    def create(
        self,
        case_id: int,
        fact_content: str,
        fact_category: str,
        importance: str,
        user_id: int,
    ) -> CaseFact:
        """
        Create a new case fact.

        Args:
            case_id: Case ID the fact belongs to
            fact_content: The fact content text
            fact_category: Category (timeline, evidence, witness, etc.)
            importance: Importance level (low, medium, high, critical)
            user_id: User ID for audit logging

        Returns:
            Created CaseFact instance
        """
        # Optionally encrypt sensitive content
        content_to_store = fact_content
        if self.encryption_service:
            content_to_store = self.encryption_service.encrypt(fact_content)

        fact = CaseFact(
            case_id=case_id,
            fact_content=content_to_store,
            fact_category=fact_category,
            importance=importance,
        )

        self.db.add(fact)
        self.db.commit()
        self.db.refresh(fact)

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="case_fact.create",
                user_id=str(user_id),
                resource_type="case_fact",
                resource_id=str(fact.id),
                action="create",
                details={"case_id": case_id, "category": fact_category},
                success=True,
            )

        return fact

    # ===== READ OPERATIONS =====

    def get_by_id(
        self, fact_id: int, user_id: Optional[int] = None
    ) -> Optional[CaseFact]:
        """
        Get a case fact by ID.

        Args:
            fact_id: Fact primary key ID
            user_id: Optional user ID to verify ownership via case

        Returns:
            CaseFact if found and accessible, None otherwise
        """
        fact = self.db.query(CaseFact).filter(CaseFact.id == fact_id).first()

        if not fact:
            return None

        # If user_id provided, verify ownership
        if user_id is not None and not self.verify_fact_ownership(fact_id, user_id):
            return None

        # Decrypt content if encryption service is available
        if fact and self.encryption_service:
            try:
                fact.fact_content = self.encryption_service.decrypt(fact.fact_content)
            except Exception:
                # Content may not be encrypted (legacy data)
                pass

        return fact

    def get_facts_by_case_id(
        self,
        case_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CaseFact]:
        """
        Get all facts for a specific case.

        Args:
            case_id: Case ID to get facts for
            user_id: User ID for ownership verification
            skip: Pagination offset
            limit: Maximum results to return

        Returns:
            List of CaseFact instances
        """
        # Verify case ownership first
        if not self.verify_case_ownership(case_id, user_id):
            return []

        facts = (
            self.db.query(CaseFact)
            .filter(CaseFact.case_id == case_id)
            .order_by(CaseFact.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Decrypt content if encryption service is available
        if self.encryption_service:
            for fact in facts:
                try:
                    fact.fact_content = self.encryption_service.decrypt(
                        fact.fact_content
                    )
                except Exception:
                    # Content may not be encrypted (legacy data)
                    pass

        return facts

    def count_facts_by_case_id(self, case_id: int, user_id: int) -> int:
        """
        Count facts for a specific case.

        Args:
            case_id: Case ID to count facts for
            user_id: User ID for ownership verification

        Returns:
            Number of facts in the case
        """
        if not self.verify_case_ownership(case_id, user_id):
            return 0

        return self.db.query(CaseFact).filter(CaseFact.case_id == case_id).count()

    # ===== UPDATE OPERATIONS =====

    def update(
        self,
        fact_id: int,
        user_id: int,
        fact_content: Optional[str] = None,
        fact_category: Optional[str] = None,
        importance: Optional[str] = None,
    ) -> Optional[CaseFact]:
        """
        Update a case fact.

        Args:
            fact_id: Fact ID to update
            user_id: User ID for ownership verification
            fact_content: New fact content (optional)
            fact_category: New category (optional)
            importance: New importance level (optional)

        Returns:
            Updated CaseFact if found and updated, None otherwise
        """
        # Verify ownership
        if not self.verify_fact_ownership(fact_id, user_id):
            return None

        fact = self.db.query(CaseFact).filter(CaseFact.id == fact_id).first()

        if not fact:
            return None

        # Update fields if provided
        if fact_content is not None:
            content_to_store = fact_content
            if self.encryption_service:
                content_to_store = self.encryption_service.encrypt(fact_content)
            fact.fact_content = content_to_store

        if fact_category is not None:
            fact.fact_category = fact_category

        if importance is not None:
            fact.importance = importance

        self.db.commit()
        self.db.refresh(fact)

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="case_fact.update",
                user_id=str(user_id),
                resource_type="case_fact",
                resource_id=str(fact.id),
                action="update",
                details={
                    "updated_fields": [
                        f
                        for f in ["fact_content", "fact_category", "importance"]
                        if locals().get(f) is not None
                    ]
                },
                success=True,
            )

        # Decrypt for response
        if self.encryption_service:
            try:
                fact.fact_content = self.encryption_service.decrypt(fact.fact_content)
            except Exception:
                pass

        return fact

    # ===== DELETE OPERATIONS =====

    def delete(self, fact_id: int, user_id: int) -> bool:
        """
        Delete a case fact.

        Args:
            fact_id: Fact ID to delete
            user_id: User ID for ownership verification

        Returns:
            True if deleted, False if not found or unauthorized
        """
        # Verify ownership
        if not self.verify_fact_ownership(fact_id, user_id):
            return False

        fact = self.db.query(CaseFact).filter(CaseFact.id == fact_id).first()

        if not fact:
            return False

        case_id = fact.case_id
        self.db.delete(fact)
        self.db.commit()

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="case_fact.delete",
                user_id=str(user_id),
                resource_type="case_fact",
                resource_id=str(fact_id),
                action="delete",
                details={"case_id": case_id},
                success=True,
            )

        return True

    def delete_all_by_case_id(self, case_id: int, user_id: int) -> int:
        """
        Delete all facts for a case.

        Args:
            case_id: Case ID to delete facts for
            user_id: User ID for ownership verification

        Returns:
            Number of facts deleted
        """
        # Verify case ownership
        if not self.verify_case_ownership(case_id, user_id):
            return 0

        count = self.db.query(CaseFact).filter(CaseFact.case_id == case_id).count()
        self.db.query(CaseFact).filter(CaseFact.case_id == case_id).delete()
        self.db.commit()

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="case_fact.bulk_delete",
                user_id=str(user_id),
                resource_type="case_fact",
                resource_id=f"case:{case_id}",
                action="bulk_delete",
                details={"case_id": case_id, "count": count},
                success=True,
            )

        return count

    # ===== BULK OPERATIONS =====

    def bulk_create(
        self,
        case_id: int,
        facts_data: List[Dict[str, Any]],
        user_id: int,
    ) -> List[CaseFact]:
        """
        Create multiple facts at once.

        Args:
            case_id: Case ID the facts belong to
            facts_data: List of fact data dicts with fact_content, fact_category, importance
            user_id: User ID for ownership verification and audit logging

        Returns:
            List of created CaseFact instances
        """
        # Verify case ownership
        if not self.verify_case_ownership(case_id, user_id):
            return []

        created_facts = []
        for data in facts_data:
            content = data.get("fact_content", data.get("factContent", ""))
            category = data.get("fact_category", data.get("factCategory", "other"))
            importance = data.get("importance", "medium")

            # Optionally encrypt
            if self.encryption_service:
                content = self.encryption_service.encrypt(content)

            fact = CaseFact(
                case_id=case_id,
                fact_content=content,
                fact_category=category,
                importance=importance,
            )
            self.db.add(fact)
            created_facts.append(fact)

        self.db.commit()

        # Refresh all to get IDs
        for fact in created_facts:
            self.db.refresh(fact)

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="case_fact.bulk_create",
                user_id=str(user_id),
                resource_type="case_fact",
                resource_id=f"case:{case_id}",
                action="bulk_create",
                details={"case_id": case_id, "count": len(created_facts)},
                success=True,
            )

        return created_facts

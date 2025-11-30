"""
Deadline repository for data access operations.

Extracts all database queries from routes/deadlines.py into a clean repository layer.

Features:
- CRUD operations for deadline records
- Case ownership verification
- Deadline ownership verification (via case)
- Filtering by status, priority, date range
- Upcoming and overdue deadline queries
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from backend.models.case import Case
from backend.models.deadline import Deadline, DeadlinePriority, DeadlineStatus
from backend.repositories.base import BaseRepository
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger


class DeadlineRepository(BaseRepository[Deadline]):
    """
    Repository for Deadline entity data access.
    
    Handles all database operations for deadline records,
    including ownership verification through case relationships.
    """
    
    model = Deadline
    
    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger: Optional[AuditLogger] = None,
    ):
        """
        Initialize deadline repository.
        
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
        case = (
            self.db.query(Case)
            .filter(and_(Case.id == case_id, Case.user_id == user_id))
            .first()
        )
        return case is not None
    
    def verify_deadline_ownership(
        self, deadline_id: int, user_id: int
    ) -> Optional[Deadline]:
        """
        Verify that a deadline belongs to a case owned by the specified user.
        
        Args:
            deadline_id: Deadline ID to verify
            user_id: User ID to check ownership
            
        Returns:
            Deadline object if user owns it, None otherwise
        """
        deadline = (
            self.db.query(Deadline)
            .join(Deadline.case)
            .filter(
                and_(
                    Deadline.id == deadline_id,
                    Deadline.deleted_at.is_(None),
                    Deadline.case.has(user_id=user_id),
                )
            )
            .first()
        )
        return deadline
    
    # ===== CREATE OPERATIONS =====
    
    def create(
        self,
        case_id: int,
        user_id: int,
        title: str,
        deadline_date: Optional[str] = None,
        description: Optional[str] = None,
        priority: str = "medium",
    ) -> Deadline:
        """
        Create a new deadline.
        
        Args:
            case_id: Case ID to attach deadline to
            user_id: User ID creating the deadline
            title: Deadline title
            deadline_date: Due date (YYYY-MM-DD or ISO 8601)
            description: Optional description
            priority: Priority level (low, medium, high, critical)
            
        Returns:
            Created Deadline object
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            deadline = Deadline(
                case_id=case_id,
                user_id=user_id,
                title=title,
                description=description,
                deadline_date=deadline_date,
                priority=DeadlinePriority(priority),
                status=DeadlineStatus.UPCOMING,
            )
            
            self.db.add(deadline)
            self.db.commit()
            self.db.refresh(deadline)
            
            # Log audit event
            self._log_audit(
                event_type="deadline.create",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="create",
                details={
                    "case_id": case_id,
                    "title": title,
                    "priority": priority,
                },
                success=True,
            )
            
            return deadline
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="deadline.create",
                user_id=user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to create deadline: {str(e)}")
    
    # ===== READ OPERATIONS =====
    
    def get_all_for_user(
        self,
        user_id: int,
        case_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Deadline], int, int]:
        """
        Get all deadlines for a user with optional filters.
        
        Args:
            user_id: User ID
            case_id: Optional case ID filter
            status_filter: Optional status filter
            priority_filter: Optional priority filter
            limit: Maximum results to return
            offset: Pagination offset
            
        Returns:
            Tuple of (deadlines list, total count, overdue count)
        """
        # Build base query
        query = (
            self.db.query(Deadline)
            .join(Deadline.case)
            .filter(
                and_(
                    Deadline.case.has(user_id=user_id),
                    Deadline.deleted_at.is_(None),
                )
            )
        )
        
        # Apply optional filters
        if case_id is not None:
            query = query.filter(Deadline.case_id == case_id)
        
        if status_filter:
            status_enum = DeadlineStatus(status_filter)
            query = query.filter(Deadline.status == status_enum)
        
        if priority_filter:
            priority_enum = DeadlinePriority(priority_filter)
            query = query.filter(Deadline.priority == priority_enum)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Calculate overdue count
        today = datetime.now().strftime("%Y-%m-%d")
        overdue_count = query.filter(
            and_(
                Deadline.deadline_date < today,
                Deadline.status != DeadlineStatus.COMPLETED,
            )
        ).count()
        
        # Apply pagination and ordering
        deadlines = (
            query.order_by(Deadline.deadline_date.asc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        
        return deadlines, total_count, overdue_count
    
    def get_all_for_case(self, case_id: int) -> List[Deadline]:
        """
        Get all deadlines for a specific case.
        
        Args:
            case_id: Case ID
            
        Returns:
            List of Deadline objects ordered by date
        """
        return (
            self.db.query(Deadline)
            .filter(
                and_(
                    Deadline.case_id == case_id,
                    Deadline.deleted_at.is_(None),
                )
            )
            .order_by(Deadline.deadline_date.asc())
            .all()
        )
    
    def get_upcoming(self, user_id: int, days: int = 30) -> List[Deadline]:
        """
        Get upcoming deadlines for a user.
        
        Args:
            user_id: User ID
            days: Number of days to look ahead (default 30)
            
        Returns:
            List of upcoming Deadline objects
        """
        threshold_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        
        return (
            self.db.query(Deadline)
            .join(Deadline.case)
            .filter(
                and_(
                    Deadline.case.has(user_id=user_id),
                    Deadline.deleted_at.is_(None),
                    Deadline.status != DeadlineStatus.COMPLETED,
                    Deadline.deadline_date <= threshold_date,
                )
            )
            .order_by(Deadline.deadline_date.asc())
            .all()
        )
    
    def get_overdue(self, user_id: int) -> List[Deadline]:
        """
        Get overdue deadlines for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of overdue Deadline objects
        """
        today = datetime.now().strftime("%Y-%m-%d")
        
        return (
            self.db.query(Deadline)
            .join(Deadline.case)
            .filter(
                and_(
                    Deadline.case.has(user_id=user_id),
                    Deadline.deleted_at.is_(None),
                    Deadline.status != DeadlineStatus.COMPLETED,
                    Deadline.deadline_date < today,
                )
            )
            .order_by(Deadline.deadline_date.asc())
            .all()
        )
    
    # ===== UPDATE OPERATIONS =====
    
    def update_deadline(
        self,
        deadline: Deadline,
        user_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        deadline_date: Optional[str] = None,
        priority: Optional[str] = None,
        status_value: Optional[str] = None,
    ) -> Tuple[Deadline, List[str]]:
        """
        Update a deadline's fields.
        
        Args:
            deadline: Deadline object to update
            user_id: User ID (for audit logging)
            title: Optional new title
            description: Optional new description
            deadline_date: Optional new deadline date
            priority: Optional new priority
            status_value: Optional new status
            
        Returns:
            Tuple of (updated deadline, list of changed fields)
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            changed_fields = []
            
            if title is not None:
                deadline.title = title
                changed_fields.append("title")
            
            if description is not None:
                deadline.description = description
                changed_fields.append("description")
            
            if deadline_date is not None:
                deadline.deadline_date = deadline_date
                changed_fields.append("deadline_date")
            
            if priority is not None:
                deadline.priority = DeadlinePriority(priority)
                changed_fields.append("priority")
            
            if status_value is not None:
                deadline.status = DeadlineStatus(status_value)
                changed_fields.append("status")
                
                # If marking as completed, set completed_at
                if status_value == "completed":
                    deadline.completed_at = datetime.now()
            
            if changed_fields:
                self.db.commit()
                self.db.refresh(deadline)
                
                # Log audit event
                self._log_audit(
                    event_type="deadline.update",
                    user_id=user_id,
                    resource_id=str(deadline.id),
                    action="update",
                    details={"changed_fields": changed_fields},
                    success=True,
                )
            
            return deadline, changed_fields
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="deadline.update",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="update",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to update deadline: {str(e)}")
    
    def mark_as_overdue(self, deadlines: List[Deadline]) -> None:
        """
        Mark multiple deadlines as overdue.
        
        Args:
            deadlines: List of deadline objects to mark as overdue
        """
        for deadline in deadlines:
            if deadline.status != DeadlineStatus.OVERDUE:
                deadline.status = DeadlineStatus.OVERDUE
        
        self.db.commit()
    
    def complete_deadline(self, deadline: Deadline, user_id: int) -> Deadline:
        """
        Mark a deadline as complete.
        
        Args:
            deadline: Deadline object to complete
            user_id: User ID (for audit logging)
            
        Returns:
            Updated deadline
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            deadline.status = DeadlineStatus.COMPLETED
            deadline.completed_at = datetime.now()
            
            self.db.commit()
            self.db.refresh(deadline)
            
            # Log audit event
            self._log_audit(
                event_type="deadline.complete",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="complete",
                details={
                    "title": deadline.title,
                    "case_id": deadline.case_id,
                },
                success=True,
            )
            
            return deadline
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="deadline.complete",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="complete",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to complete deadline: {str(e)}")
    
    # ===== DELETE OPERATIONS =====
    
    def soft_delete(self, deadline: Deadline, user_id: int) -> bool:
        """
        Soft delete a deadline by setting deleted_at timestamp.
        
        Args:
            deadline: Deadline object to delete
            user_id: User ID (for audit logging)
            
        Returns:
            True if deleted successfully
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            deadline.deleted_at = datetime.now()
            self.db.commit()
            
            # Log audit event
            self._log_audit(
                event_type="deadline.delete",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="delete",
                details={
                    "title": deadline.title,
                    "case_id": deadline.case_id,
                },
                success=True,
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="deadline.delete",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="delete",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to delete deadline: {str(e)}")
    
    # ===== STATISTICS =====
    
    def count_for_case(self, case_id: int) -> int:
        """
        Count deadlines for a specific case.
        
        Args:
            case_id: Case ID
            
        Returns:
            Number of active (non-deleted) deadlines
        """
        return (
            self.db.query(func.count(Deadline.id))
            .filter(
                and_(
                    Deadline.case_id == case_id,
                    Deadline.deleted_at.is_(None),
                )
            )
            .scalar() or 0
        )
    
    def count_for_user(self, user_id: int) -> Dict[str, int]:
        """
        Count deadlines for a user by status.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with counts: total, upcoming, overdue, completed
        """
        base_query = (
            self.db.query(Deadline)
            .join(Deadline.case)
            .filter(
                and_(
                    Deadline.case.has(user_id=user_id),
                    Deadline.deleted_at.is_(None),
                )
            )
        )
        
        total = base_query.count()
        
        upcoming = base_query.filter(
            Deadline.status == DeadlineStatus.UPCOMING
        ).count()
        
        overdue = base_query.filter(
            Deadline.status == DeadlineStatus.OVERDUE
        ).count()
        
        completed = base_query.filter(
            Deadline.status == DeadlineStatus.COMPLETED
        ).count()
        
        return {
            "total": total,
            "upcoming": upcoming,
            "overdue": overdue,
            "completed": completed,
        }

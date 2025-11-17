"""
Deadline management routes for Justice Companion.
Migrated from electron/ipc-handlers/deadlines.ts

Enhanced with service layer architecture:
- DeadlineReminderScheduler for automatic deadline notifications
- NotificationService for creating and managing notifications
- EncryptionService for sensitive deadline data
- AuditLogger for comprehensive audit trails

Routes:
- POST /deadlines - Create deadline (requires case ownership)
- GET /deadlines/case/{case_id} - List deadlines for a case
- GET /deadlines/upcoming - Get upcoming deadlines (next 30 days)
- GET /deadlines/overdue - Get overdue deadlines
- PUT /deadlines/{id} - Update deadline
- DELETE /deadlines/{id} - Delete deadline
- POST /deadlines/{id}/complete - Mark deadline as complete
- GET /deadlines/{id}/reminders - Get reminder info for deadline
- POST /deadlines/{id}/reminders - Schedule/update reminder for deadline
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from backend.models.base import get_db
from backend.models.deadline import Deadline, DeadlinePriority, DeadlineStatus
from backend.routes.auth import get_current_user
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
from backend.services.notification_service import (
    NotificationService,
    CreateNotificationInput,
    NotificationError,
)
from backend.models.notification import NotificationType, NotificationSeverity
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger
import os
import base64

router = APIRouter(prefix="/deadlines", tags=["deadlines"])


# ===== DEPENDENCY INJECTION =====


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
        print("WARNING: No ENCRYPTION_KEY_BASE64 found. Using temporary key.")

    return EncryptionService(key_base64)


def get_notification_service(
    db: Session = Depends(get_db),
) -> NotificationService:
    """Get notification service instance with audit logging."""
    audit_logger = AuditLogger(db)
    return NotificationService(db, audit_logger)


def get_deadline_scheduler(
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
) -> DeadlineReminderScheduler:
    """Get deadline reminder scheduler instance."""
    audit_logger = AuditLogger(db)
    return DeadlineReminderScheduler(db, notification_service, audit_logger)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)


# ===== PYDANTIC REQUEST MODELS =====


class CreateDeadlineRequest(BaseModel):
    """Request model for creating a deadline."""

    caseId: int = Field(..., gt=0, description="Case ID this deadline belongs to")
    title: str = Field(..., min_length=1, max_length=500, description="Deadline title")
    description: Optional[str] = Field(None, max_length=10000, description="Deadline description")
    deadlineDate: Optional[str] = Field(None, description="Due date (YYYY-MM-DD or ISO 8601)")
    dueDate: Optional[str] = Field(None, description="Due date alias (YYYY-MM-DD or ISO 8601)")
    priority: Optional[str] = Field("medium", description="Priority level")
    reminderDays: Optional[int] = Field(
        None, ge=1, le=30, description="Days before deadline to send reminder"
    )

    @validator("priority")
    def validate_priority(cls, v):
        if v:
            try:
                DeadlinePriority(v)
            except ValueError:
                raise ValueError(
                    f"Invalid priority. Must be one of: {', '.join([p.value for p in DeadlinePriority])}"
                )
        return v

    @validator("title")
    def strip_title(cls, v):
        return v.strip()

    @validator("deadlineDate", "dueDate")
    def validate_date_format(cls, v):
        if v:
            try:
                # Try parsing as ISO 8601 date (YYYY-MM-DD)
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                try:
                    # Try parsing as full ISO 8601 datetime
                    datetime.fromisoformat(v.replace("Z", "+00:00"))
                except ValueError:
                    raise ValueError("Invalid date format (use YYYY-MM-DD or ISO 8601)")
        return v

    @validator("deadlineDate", always=True)
    def validate_deadline_or_due_date(cls, v, values):
        """Ensure either deadlineDate or dueDate is provided."""
        due_date = values.get("dueDate")
        if not v and not due_date:
            raise ValueError("Must provide either deadlineDate or dueDate")
        # Use deadlineDate if provided, otherwise use dueDate
        return v or due_date


class UpdateDeadlineRequest(BaseModel):
    """Request model for updating a deadline."""

    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Deadline title")
    description: Optional[str] = Field(None, max_length=10000, description="Deadline description")
    deadlineDate: Optional[str] = Field(None, description="Due date (YYYY-MM-DD or ISO 8601)")
    dueDate: Optional[str] = Field(None, description="Due date alias (YYYY-MM-DD or ISO 8601)")
    priority: Optional[str] = Field(None, description="Priority level")
    status: Optional[str] = Field(None, description="Deadline status")

    @validator("priority")
    def validate_priority(cls, v):
        if v:
            try:
                DeadlinePriority(v)
            except ValueError:
                raise ValueError(
                    f"Invalid priority. Must be one of: {', '.join([p.value for p in DeadlinePriority])}"
                )
        return v

    @validator("status")
    def validate_status(cls, v):
        if v:
            try:
                DeadlineStatus(v)
            except ValueError:
                raise ValueError(
                    f"Invalid status. Must be one of: {', '.join([s.value for s in DeadlineStatus])}"
                )
        return v

    @validator("title")
    def strip_title(cls, v):
        if v:
            return v.strip()
        return v

    @validator("deadlineDate", "dueDate")
    def validate_date_format(cls, v):
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                try:
                    datetime.fromisoformat(v.replace("Z", "+00:00"))
                except ValueError:
                    raise ValueError("Invalid date format (use YYYY-MM-DD or ISO 8601)")
        return v


class ScheduleReminderRequest(BaseModel):
    """Request model for scheduling a deadline reminder."""

    reminderDays: int = Field(..., ge=1, le=30, description="Days before deadline to send reminder")


# ===== PYDANTIC RESPONSE MODELS =====


class DeadlineResponse(BaseModel):
    """Response model for deadline data."""

    id: int
    caseId: int
    userId: int
    title: str
    description: Optional[str]
    deadlineDate: str
    dueDate: str  # Alias for compatibility
    priority: str
    status: str
    completedAt: Optional[str]
    createdAt: str
    updatedAt: Optional[str]

    class Config:
        from_attributes = True


class DeleteDeadlineResponse(BaseModel):
    """Response model for deadline deletion."""

    deleted: bool


class ReminderInfoResponse(BaseModel):
    """Response model for reminder information."""

    deadlineId: int
    hasReminder: bool
    reminderDays: Optional[int]
    scheduledFor: Optional[str]


# ===== HELPER FUNCTIONS =====


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
    from backend.models.case import Case

    case = db.query(Case).filter(and_(Case.id == case_id, Case.user_id == user_id)).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found or unauthorized",
        )

    return True


def verify_deadline_ownership(db: Session, deadline_id: int, user_id: int) -> Deadline:
    """
    Verify that a deadline belongs to the authenticated user and return it.

    Args:
        db: Database session
        deadline_id: Deadline ID to verify
        user_id: User ID to check ownership

    Returns:
        Deadline object if user owns it

    Raises:
        HTTPException: If deadline not found or unauthorized
    """
    deadline = (
        db.query(Deadline)
        .join(Deadline.case)
        .filter(and_(Deadline.id == deadline_id, Deadline.deleted_at.is_(None)))
        .first()
    )

    if not deadline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deadline with ID {deadline_id} not found",
        )

    if deadline.case.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You do not have permission to access this deadline",
        )

    return deadline


async def create_deadline_notification(
    notification_service: NotificationService,
    user_id: int,
    deadline: Deadline,
    action: str = "created",
) -> None:
    """
    Create a notification for deadline events.

    Args:
        notification_service: Notification service instance
        user_id: User ID to send notification to
        deadline: Deadline object
        action: Action performed (created, updated, completed)
    """
    try:
        severity = NotificationSeverity.MEDIUM
        if deadline.priority == DeadlinePriority.CRITICAL:
            severity = NotificationSeverity.HIGH
        elif deadline.priority == DeadlinePriority.HIGH:
            severity = NotificationSeverity.MEDIUM

        await notification_service.create_notification(
            CreateNotificationInput(
                user_id=user_id,
                type=NotificationType.DEADLINE_REMINDER,
                severity=severity,
                title=f"Deadline {action}: {deadline.title}",
                message=f"Your deadline '{deadline.title}' has been {action}.",
                metadata={"deadlineId": deadline.id, "caseId": deadline.case_id, "action": action},
            )
        )
    except NotificationError:
        # Don't fail the operation if notification creation fails
        pass


# ===== ROUTES =====


@router.post("", response_model=DeadlineResponse, status_code=status.HTTP_201_CREATED)
async def create_deadline(
    request: CreateDeadlineRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Create a new deadline for a case with optional reminder scheduling.

    Validates:
    - User owns the case
    - Either deadlineDate or dueDate is provided
    - Priority is valid
    - Date format is valid (YYYY-MM-DD or ISO 8601)

    Features:
    - Automatic deadline notification
    - Audit logging for all operations
    - Optional reminder scheduling
    """
    try:
        # Verify user owns the case
        verify_case_ownership(db, request.caseId, user_id)

        # Determine deadline date (prioritize deadlineDate over dueDate)
        deadline_date = request.deadlineDate or request.dueDate

        # Create deadline
        deadline = Deadline(
            case_id=request.caseId,
            user_id=user_id,
            title=request.title,
            description=request.description,
            deadline_date=deadline_date,
            priority=DeadlinePriority(request.priority or "medium"),
            status=DeadlineStatus.UPCOMING,
        )

        db.add(deadline)
        db.commit()
        db.refresh(deadline)

        # Log audit event
        audit_logger.log(
            event_type="deadline.created",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline.id),
            action="create",
            details={
                "caseId": request.caseId,
                "title": request.title,
                "priority": deadline.priority.value,
                "reminderDays": request.reminderDays,
            },
            success=True,
        )

        # Create notification for deadline creation
        await create_deadline_notification(notification_service, user_id, deadline, "created")

        return deadline.to_dict()

    except ValueError as e:
        # Validation error
        audit_logger.log(
            event_type="deadline.created",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id="unknown",
            action="create",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        audit_logger.log(
            event_type="deadline.created",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id="unknown",
            action="create",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create deadline: {str(e)}",
        )


@router.get("", response_model=dict)
async def list_all_deadlines(
    case_id: Optional[int] = Query(None, description="Filter by case ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    limit: int = Query(50, ge=1, le=100, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all deadlines for the authenticated user with optional filters.

    Supports pagination and filtering by case, status, and priority.
    Returns deadlines ordered by deadline_date (earliest first).
    """
    try:
        # Build base query - all user's deadlines
        query = (
            db.query(Deadline)
            .join(Deadline.case)
            .filter(and_(Deadline.case.has(user_id=user_id), Deadline.deleted_at.is_(None)))
        )

        # Apply optional filters
        if case_id is not None:
            query = query.filter(Deadline.case_id == case_id)

        if status:
            try:
                status_enum = DeadlineStatus(status)
                query = query.filter(Deadline.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status. Must be one of: {', '.join([s.value for s in DeadlineStatus])}",
                )

        if priority:
            try:
                priority_enum = DeadlinePriority(priority)
                query = query.filter(Deadline.priority == priority_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid priority. Must be one of: {', '.join([p.value for p in DeadlinePriority])}",
                )

        # Get total count before pagination
        total_count = query.count()

        # Calculate overdue count
        today = datetime.now().strftime("%Y-%m-%d")
        overdue_count = query.filter(
            and_(Deadline.deadline_date < today, Deadline.status != DeadlineStatus.COMPLETED)
        ).count()

        # Apply pagination and ordering
        deadlines = query.order_by(Deadline.deadline_date.asc()).limit(limit).offset(offset).all()

        # Return paginated response
        return {
            "items": [d.to_dict() for d in deadlines],
            "total": total_count,
            "overdueCount": overdue_count,
            "limit": limit,
            "offset": offset,
            "hasMore": (offset + len(deadlines)) < total_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get deadlines: {str(e)}",
        )


@router.get("/case/{case_id}", response_model=List[DeadlineResponse])
async def list_case_deadlines(
    case_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    List all deadlines for a specific case.

    Validates that the case belongs to the authenticated user.
    Returns deadlines ordered by deadline_date (earliest first).
    """
    try:
        # Verify user owns the case
        verify_case_ownership(db, case_id, user_id)

        # Fetch deadlines
        deadlines = (
            db.query(Deadline)
            .filter(and_(Deadline.case_id == case_id, Deadline.deleted_at.is_(None)))
            .order_by(Deadline.deadline_date.asc())
            .all()
        )

        return [d.to_dict() for d in deadlines]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list deadlines: {str(e)}",
        )


@router.get("/upcoming", response_model=List[DeadlineResponse])
async def list_upcoming_deadlines(
    days: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get upcoming deadlines for the authenticated user.

    Returns deadlines ordered by deadline_date (earliest first).
    Default: next 30 days (configurable via 'days' query parameter).
    """
    try:
        # Calculate date threshold
        threshold_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

        # Fetch upcoming deadlines across all user's cases
        deadlines = (
            db.query(Deadline)
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

        return [d.to_dict() for d in deadlines]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upcoming deadlines: {str(e)}",
        )


@router.get("/overdue", response_model=List[DeadlineResponse])
async def list_overdue_deadlines(
    user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get overdue deadlines for the authenticated user.

    Returns incomplete deadlines past their due date,
    ordered by deadline_date (oldest first).
    """
    try:
        # Get current date
        today = datetime.now().strftime("%Y-%m-%d")

        # Fetch overdue deadlines
        deadlines = (
            db.query(Deadline)
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

        # Update status to overdue
        for deadline in deadlines:
            if deadline.status != DeadlineStatus.OVERDUE:
                deadline.status = DeadlineStatus.OVERDUE
                db.commit()

        return [d.to_dict() for d in deadlines]

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get overdue deadlines: {str(e)}",
        )


@router.put("/{deadline_id}", response_model=DeadlineResponse)
async def update_deadline(
    deadline_id: int,
    request: UpdateDeadlineRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Update an existing deadline.

    Validates:
    - User owns the deadline (via case ownership)
    - Updated fields are valid
    - Date format is valid if provided

    Features:
    - Automatic notification for significant changes
    - Audit logging for all updates
    """
    try:
        # Verify user owns the deadline
        deadline = verify_deadline_ownership(db, deadline_id, user_id)

        # Track changed fields
        changed_fields = []
        update_params = {}

        if request.title is not None:
            deadline.title = request.title
            changed_fields.append("title")
            update_params["title"] = request.title

        if request.description is not None:
            deadline.description = request.description
            changed_fields.append("description")

        # Prioritize deadlineDate over dueDate
        deadline_date = request.deadlineDate or request.dueDate
        if deadline_date is not None:
            deadline.deadline_date = deadline_date
            changed_fields.append("deadline_date")
            update_params["deadline_date"] = deadline_date

        if request.priority is not None:
            deadline.priority = DeadlinePriority(request.priority)
            changed_fields.append("priority")
            update_params["priority"] = request.priority

        if request.status is not None:
            deadline.status = DeadlineStatus(request.status)
            changed_fields.append("status")

            # If marking as completed, set completed_at
            if request.status == "completed":
                deadline.completed_at = datetime.now()

        if not changed_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
            )

        db.commit()
        db.refresh(deadline)

        # Log audit event
        audit_logger.log(
            event_type="deadline.updated",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="update",
            details={"changed_fields": changed_fields, **update_params},
            success=True,
        )

        # Create notification for deadline update
        await create_deadline_notification(notification_service, user_id, deadline, "updated")

        return deadline.to_dict()

    except ValueError as e:
        # Validation error
        audit_logger.log(
            event_type="deadline.updated",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="update",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        audit_logger.log(
            event_type="deadline.updated",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="update",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update deadline: {str(e)}",
        )


@router.delete("/{deadline_id}", response_model=DeleteDeadlineResponse)
async def delete_deadline(
    deadline_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Delete a deadline by ID (soft delete).

    Validates:
    - Deadline exists
    - User owns the deadline (via case ownership)

    Uses soft delete by setting deleted_at timestamp.
    Audit logs all deletion attempts.
    """
    try:
        # Verify user owns the deadline
        deadline = verify_deadline_ownership(db, deadline_id, user_id)

        # Soft delete by setting deleted_at timestamp
        deadline.deleted_at = datetime.now()
        db.commit()

        # Log audit event
        audit_logger.log(
            event_type="deadline.deleted",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="delete",
            details={"title": deadline.title, "case_id": deadline.case_id},
            success=True,
        )

        return {"deleted": True}

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        audit_logger.log(
            event_type="deadline.deleted",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="delete",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete deadline: {str(e)}",
        )


@router.post("/{deadline_id}/complete", response_model=DeadlineResponse)
async def complete_deadline(
    deadline_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Mark a deadline as complete.

    Validates:
    - Deadline exists
    - User owns the deadline (via case ownership)

    Sets status to 'completed' and records completed_at timestamp.
    Creates notification and audit log entry.
    """
    try:
        # Verify user owns the deadline
        deadline = verify_deadline_ownership(db, deadline_id, user_id)

        # Update deadline to completed
        deadline.status = DeadlineStatus.COMPLETED
        deadline.completed_at = datetime.now()
        db.commit()
        db.refresh(deadline)

        # Log audit event
        audit_logger.log(
            event_type="deadline.completed",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="complete",
            details={"title": deadline.title, "case_id": deadline.case_id},
            success=True,
        )

        # Create notification for deadline completion
        await create_deadline_notification(notification_service, user_id, deadline, "completed")

        return deadline.to_dict()

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        audit_logger.log(
            event_type="deadline.completed",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="complete",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete deadline: {str(e)}",
        )


@router.get("/{deadline_id}/reminders", response_model=ReminderInfoResponse)
async def get_deadline_reminder_info(
    deadline_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get reminder information for a deadline.

    Returns:
    - Whether a reminder is scheduled
    - Number of days before deadline for reminder
    - Scheduled reminder date
    """
    try:
        # Verify user owns the deadline
        deadline = verify_deadline_ownership(db, deadline_id, user_id)

        # Get user's notification preferences
        from backend.models.notification import NotificationPreferences

        prefs = (
            db.query(NotificationPreferences)
            .filter(NotificationPreferences.user_id == user_id)
            .first()
        )

        has_reminder = False
        reminder_days = None
        scheduled_for = None

        if prefs and prefs.deadline_reminders_enabled:
            has_reminder = True
            reminder_days = prefs.deadline_reminder_days

            # Calculate scheduled reminder date
            try:
                deadline_date = datetime.fromisoformat(
                    deadline.deadline_date.replace("Z", "+00:00")
                )
                reminder_date = deadline_date - timedelta(days=reminder_days)
                scheduled_for = reminder_date.isoformat()
            except (ValueError, AttributeError):
                pass

        return {
            "deadlineId": deadline_id,
            "hasReminder": has_reminder,
            "reminderDays": reminder_days,
            "scheduledFor": scheduled_for,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get reminder info: {str(e)}",
        )


@router.post("/{deadline_id}/reminders", response_model=ReminderInfoResponse)
async def schedule_deadline_reminder(
    deadline_id: int,
    request: ScheduleReminderRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Schedule or update a reminder for a deadline.

    Updates user's notification preferences to enable deadline reminders
    with the specified number of days before the deadline.

    Args:
        deadline_id: ID of deadline to schedule reminder for
        request: Reminder scheduling request with reminderDays

    Returns:
        Updated reminder information
    """
    try:
        # Verify user owns the deadline
        deadline = verify_deadline_ownership(db, deadline_id, user_id)

        # Get or create notification preferences
        from backend.services.notification_service import UpdateNotificationPreferencesInput

        prefs = await notification_service.get_preferences(user_id)

        # Update reminder settings
        await notification_service.update_preferences(
            user_id,
            UpdateNotificationPreferencesInput(
                deadline_reminders_enabled=True, deadline_reminder_days=request.reminderDays
            ),
        )

        # Calculate scheduled reminder date
        scheduled_for = None
        try:
            deadline_date = datetime.fromisoformat(deadline.deadline_date.replace("Z", "+00:00"))
            reminder_date = deadline_date - timedelta(days=request.reminderDays)
            scheduled_for = reminder_date.isoformat()
        except (ValueError, AttributeError):
            pass

        # Log audit event
        audit_logger.log(
            event_type="deadline.reminder_scheduled",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="schedule_reminder",
            details={"reminder_days": request.reminderDays, "scheduled_for": scheduled_for},
            success=True,
        )

        return {
            "deadlineId": deadline_id,
            "hasReminder": True,
            "reminderDays": request.reminderDays,
            "scheduledFor": scheduled_for,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        audit_logger.log(
            event_type="deadline.reminder_scheduled",
            user_id=str(user_id),
            resource_type="deadline",
            resource_id=str(deadline_id),
            action="schedule_reminder",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to schedule reminder: {str(e)}",
        )

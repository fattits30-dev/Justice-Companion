"""
Deadline schemas - Pydantic models for deadline API operations.

Single source of truth for deadline-related request and response types.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.models.deadline import DeadlinePriority, DeadlineStatus


# ===== REQUEST SCHEMAS =====


class DeadlineCreate(BaseModel):
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

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                DeadlinePriority(v)
            except ValueError:
                raise ValueError(
                    f"Invalid priority. Must be one of: {', '.join([p.value for p in DeadlinePriority])}"
                )
        return v

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        return v.strip()

    @field_validator("deadlineDate", "dueDate")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
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


class DeadlineUpdate(BaseModel):
    """Request model for updating a deadline."""

    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Deadline title")
    description: Optional[str] = Field(None, max_length=10000, description="Deadline description")
    deadlineDate: Optional[str] = Field(None, description="Due date (YYYY-MM-DD or ISO 8601)")
    dueDate: Optional[str] = Field(None, description="Due date alias (YYYY-MM-DD or ISO 8601)")
    priority: Optional[str] = Field(None, description="Priority level")
    status: Optional[str] = Field(None, description="Deadline status")

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                DeadlinePriority(v)
            except ValueError:
                raise ValueError(
                    f"Invalid priority. Must be one of: {', '.join([p.value for p in DeadlinePriority])}"
                )
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                DeadlineStatus(v)
            except ValueError:
                raise ValueError(
                    f"Invalid status. Must be one of: {', '.join([s.value for s in DeadlineStatus])}"
                )
        return v

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return v

    @field_validator("deadlineDate", "dueDate")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
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


# ===== RESPONSE SCHEMAS =====


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

    model_config = ConfigDict(from_attributes=True)


class DeadlineDeleteResponse(BaseModel):
    """Response model for deadline deletion."""

    deleted: bool


class ReminderInfoResponse(BaseModel):
    """Response model for reminder information."""

    deadlineId: int
    hasReminder: bool
    reminderDays: Optional[int]
    scheduledFor: Optional[str]


# ===== ALIASES FOR BACKWARDS COMPATIBILITY =====
CreateDeadlineRequest = DeadlineCreate
UpdateDeadlineRequest = DeadlineUpdate
DeleteDeadlineResponse = DeadlineDeleteResponse

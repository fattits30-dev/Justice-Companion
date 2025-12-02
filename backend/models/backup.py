"""
Backup models for database backup management.

Models:
- BackupSettings: User backup preferences and scheduling
- BackupMetadata: Backup file information and metadata

All models follow SQLAlchemy ORM patterns with comprehensive validation.
"""

from typing import Optional
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, Field, ConfigDict

from backend.models.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:

class BackupFrequency(str, Enum):
    """Backup frequency options."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class BackupSettings(Base):
    """
    Backup settings model for user backup preferences.

    Stores automated backup configuration including frequency,
    time of day, and retention policy.

    Attributes:
        id: Primary key
        user_id: Foreign key to users table
        enabled: Whether automatic backups are enabled
        frequency: Backup frequency (daily, weekly, monthly)
        backup_time: Time of day for backup (HH:MM format)
        keep_count: Number of backups to retain (1-30)
        last_backup_at: Timestamp of last successful backup
        next_backup_at: Calculated timestamp of next backup
        created_at: Record creation timestamp
        updated_at: Record update timestamp
    """

    __tablename__ = "backup_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="daily")
    backup_time: Mapped[str] = mapped_column(String(5), nullable=False, default="03:00")
    keep_count: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    last_backup_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_backup_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "keep_count >= 1 AND keep_count <= 30", name="keep_count_range"
        ),
        CheckConstraint(
            "frequency IN ('daily', 'weekly', 'monthly')", name="valid_frequency"
        ),
    )

    # Relationship to user
    user: Mapped["User | None"] = relationship("User", backref="backup_settings")

    def __repr__(self) -> str:
        return (
            f"<BackupSettings(id={self.id}, user_id={self.user_id}, "
            f"enabled={self.enabled}, frequency={self.frequency})>"
        )

# Pydantic models for validation and serialization

class BackupSettingsCreate(BaseModel):
    """Input model for creating backup settings."""

    enabled: bool = Field(default=True, description="Enable automatic backups")
    frequency: BackupFrequency = Field(
        default=BackupFrequency.DAILY, description="Backup frequency"
    )
    backup_time: str = Field(
        default="03:00",
        pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
        description="Backup time (HH:MM)",
    )
    keep_count: int = Field(
        default=7, ge=1, le=30, description="Number of backups to retain"
    )

    model_config = ConfigDict(use_enum_values=True)

class BackupSettingsUpdate(BaseModel):
    """Input model for updating backup settings."""

    enabled: Optional[bool] = Field(None, description="Enable automatic backups")
    frequency: Optional[BackupFrequency] = Field(None, description="Backup frequency")
    backup_time: Optional[str] = Field(
        None,
        pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
        description="Backup time (HH:MM)",
    )
    keep_count: Optional[int] = Field(
        None, ge=1, le=30, description="Number of backups to retain"
    )

    model_config = ConfigDict(use_enum_values=True)

class BackupSettingsResponse(BaseModel):
    """Response model for backup settings."""

    id: int
    user_id: int
    enabled: bool
    frequency: str
    backup_time: str
    keep_count: int
    last_backup_at: Optional[datetime]
    next_backup_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BackupMetadataResponse(BaseModel):
    """Response model for backup file metadata."""

    filename: str = Field(..., description="Backup filename")
    filepath: str = Field(..., description="Full path to backup file")
    size: int = Field(..., description="File size in bytes")
    created_at: str = Field(..., description="Backup creation timestamp (ISO format)")
    is_protected: bool = Field(
        default=False, description="Whether backup is protected from retention policy"
    )

    model_config = ConfigDict(from_attributes=True)

class RetentionSummaryResponse(BaseModel):
    """Response model for retention policy summary."""

    total: int = Field(..., description="Total number of backups")
    protected: int = Field(..., description="Number of protected backups")
    to_keep: int = Field(..., description="Number of backups to keep")
    to_delete: int = Field(..., description="Number of backups to delete")

    model_config = ConfigDict(from_attributes=True)

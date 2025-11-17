"""
Database management routes for Justice Companion.
Migrated from electron/ipc-handlers/database.ts

ENHANCED WITH SERVICE LAYER INTEGRATION:
- Uses BackupService for file operations (replaces direct file I/O)
- Uses BackupScheduler for automated backups (replaces manual scheduling)
- Uses BackupRetentionPolicy for cleanup (replaces ad-hoc deletion)
- Uses AuditLogger for comprehensive audit trail (enhanced logging)

Routes:
- GET /database/stats - Get database statistics (table counts, size)
- POST /database/backup - Create database backup
- GET /database/backups - List available backups
- GET /database/backups/{backup_id} - Get specific backup details
- POST /database/restore - Restore from backup (admin only)
- DELETE /database/backups/{backup_filename} - Delete a backup (admin only)
- POST /database/optimize - Run VACUUM and ANALYZE to optimize (admin only)
- POST /database/backup/schedule - Configure automated backups
- GET /database/backup/schedule - Get backup schedule settings
- DELETE /database/backup/schedule - Disable automated backups
- POST /database/retention - Apply retention policy to cleanup old backups
- GET /database/scheduler/stats - Get scheduler statistics

Admin-only endpoints enforce role checks for system-critical operations.

Security:
- Session-based authorization for all endpoints
- Admin role required for restore, delete, optimize
- Rate limiting on backup creation (5 per hour)
- Path traversal prevention on all file operations
- Audit logging for all database operations
- Background tasks for long-running operations (backup, restore, optimize)
"""

import os
from datetime import datetime, timezone
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.models.backup import (
    BackupSettingsUpdate,
    BackupSettingsResponse,
    BackupMetadataResponse,
    RetentionSummaryResponse,
)
from backend.services.auth_service import AuthenticationService
from backend.services.backup.backup_service import BackupService
from backend.services.backup.backup_scheduler import BackupScheduler
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.audit_logger import AuditLogger

import logging

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/database", tags=["database"])


# ===== CONFIGURATION =====
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/justice.db")
BACKUP_DIR = os.getenv("BACKUP_DIR", "./data/backups")


# ===== RATE LIMITING =====
# In-memory rate limit tracker (userId:operation -> {count, resetAt})
# TODO: Move to Redis for production multi-instance deployments
_rate_limits: Dict[str, Dict[str, Any]] = {}


def check_rate_limit(user_id: int, operation: str, max_requests: int, window_hours: int) -> None:
    """
    Check rate limit for database operations to prevent abuse.

    Args:
        user_id: User ID
        operation: Operation name (backup, restore, etc.)
        max_requests: Maximum requests allowed
        window_hours: Time window in hours

    Raises:
        HTTPException: If rate limit exceeded
    """
    key = f"{user_id}:{operation}"
    now = datetime.now(timezone.utc)
    window_ms = window_hours * 60 * 60 * 1000

    limit_info = _rate_limits.get(key)

    if limit_info and now.timestamp() * 1000 < limit_info["resetAt"]:
        if limit_info["count"] >= max_requests:
            reset_date = datetime.fromtimestamp(limit_info["resetAt"] / 1000, tz=timezone.utc)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {operation}. Try again after {reset_date.isoformat()}",
            )
        limit_info["count"] += 1
    else:
        _rate_limits[key] = {"count": 1, "resetAt": now.timestamp() * 1000 + window_ms}


# ===== HELPER FUNCTIONS =====
def get_table_metadata(db: Session) -> Dict[str, Any]:
    """
    Get metadata about all tables in the database.

    Args:
        db: Database session

    Returns:
        Dictionary mapping table names to row counts
    """
    try:
        # Get all user tables (exclude SQLite internal tables)
        tables_query = text(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """
        )

        result = db.execute(tables_query)
        tables = [row[0] for row in result.fetchall()]

        # Count rows in each table
        table_counts = {}
        total_records = 0

        for table_name in tables:
            count_query = text(f"SELECT COUNT(*) FROM {table_name}")
            count_result = db.execute(count_query)
            count = count_result.fetchone()[0]
            table_counts[table_name] = count
            total_records += count

        return {"tables": table_counts, "table_count": len(tables), "total_records": total_records}
    except Exception as e:
        logger.error(f"Failed to get table metadata: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get table metadata: {str(e)}")


# ===== PYDANTIC MODELS =====
class DatabaseStatsResponse(BaseModel):
    """Response model for database statistics."""

    connected: bool
    database_path: str
    database_size_bytes: int
    database_size_mb: float
    table_count: int
    total_records: int
    tables: Dict[str, int] = Field(..., description="Map of table names to row counts")
    backups_count: int = Field(..., description="Number of backups")
    backups_size_bytes: int = Field(..., description="Total size of all backups")
    backups_size_mb: float = Field(..., description="Total size of all backups in MB")


class CreateBackupResponse(BaseModel):
    """Response model for backup creation."""

    filename: str
    path: str
    size_bytes: int
    size_mb: float
    created_at: str
    is_valid: bool
    is_protected: bool
    metadata: Dict[str, Any]


class ListBackupsResponse(BaseModel):
    """Response model for listing backups."""

    backups: List[BackupMetadataResponse]
    count: int


class RestoreBackupRequest(BaseModel):
    """Request model for restoring a backup."""

    backup_filename: str = Field(..., min_length=1, max_length=255)

    @field_validator("backup_filename")
    @classmethod
    def validate_filename(cls, v):
        """Validate filename doesn't contain path traversal characters."""
        if "/" in v or "\\" in v or ".." in v:
            raise ValueError("Invalid backup filename - path traversal not allowed")
        return v


class RestoreBackupResponse(BaseModel):
    """Response model for backup restoration."""

    restored: bool
    message: str
    pre_restore_backup: str


class OptimizeResponse(BaseModel):
    """Response model for database optimization (VACUUM + ANALYZE)."""

    success: bool
    message: str
    size_before_bytes: int
    size_after_bytes: int
    space_reclaimed_bytes: int
    space_reclaimed_mb: float
    analyze_completed: bool


class DeleteBackupResponse(BaseModel):
    """Response model for backup deletion."""

    deleted: bool
    message: str


class ApplyRetentionResponse(BaseModel):
    """Response model for applying retention policy."""

    deleted_count: int
    message: str
    summary: RetentionSummaryResponse


class SchedulerStatsResponse(BaseModel):
    """Response model for scheduler statistics."""

    is_running: bool
    check_interval_seconds: int
    enabled_backup_settings: int
    total_backup_settings: int


# ===== DEPENDENCIES =====
def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)


def get_backup_service(db: Session = Depends(get_db)) -> BackupService:
    """Get backup service instance."""
    return BackupService(db_path=DATABASE_PATH, backups_dir=BACKUP_DIR)


def get_retention_policy(
    backup_service: BackupService = Depends(get_backup_service), db: Session = Depends(get_db)
) -> BackupRetentionPolicy:
    """Get retention policy service instance."""
    audit_logger = AuditLogger(db)
    return BackupRetentionPolicy(backup_service=backup_service, audit_logger=audit_logger)


def get_backup_scheduler(
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    retention_policy: BackupRetentionPolicy = Depends(get_retention_policy),
) -> BackupScheduler:
    """Get backup scheduler service instance."""
    audit_logger = AuditLogger(db)
    return BackupScheduler(
        db=db,
        backup_service=backup_service,
        retention_policy=retention_policy,
        audit_logger=audit_logger,
    )


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)


async def require_admin_user(
    user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
) -> int:
    """
    Verify the authenticated user has admin privileges.

    Returns:
        User ID if admin, raises HTTPException otherwise
    """
    # Query user role from database
    user_query = text("SELECT role FROM users WHERE id = :user_id")
    result = db.execute(user_query, {"user_id": user_id})
    user = result.fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check if user has admin role
    if user[0] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for this operation",
        )

    return user_id


# ===== BACKGROUND TASKS =====
async def background_create_backup(
    backup_service: BackupService, audit_logger: AuditLogger, user_id: int, db: Session
) -> None:
    """Background task for creating backup."""
    try:
        backup = backup_service.create_backup()

        audit_logger.log(
            event_type="database.backup_created",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=backup.filename,
            action="create",
            details={"filename": backup.filename, "size_bytes": backup.size},
            success=True,
        )

        logger.info(f"Background backup created: {backup.filename}")

    except Exception as e:
        logger.error(f"Background backup failed: {str(e)}", exc_info=True)

        audit_logger.log(
            event_type="database.backup_created",
            user_id=str(user_id),
            resource_type="backup",
            resource_id="unknown",
            action="create",
            success=False,
            error_message=str(e),
        )


async def background_optimize_database(
    db_path: str, audit_logger: AuditLogger, user_id: int, db: Session
) -> None:
    """Background task for optimizing database."""
    try:
        # Get size before
        size_before = os.path.getsize(db_path) if os.path.exists(db_path) else 0

        # Run VACUUM
        db.execute(text("VACUUM"))
        db.commit()

        # Run ANALYZE
        db.execute(text("ANALYZE"))
        db.commit()

        # Get size after
        size_after = os.path.getsize(db_path) if os.path.exists(db_path) else 0

        space_reclaimed = size_before - size_after

        audit_logger.log(
            event_type="database.optimized",
            user_id=str(user_id),
            resource_type="database",
            resource_id="main",
            action="optimize",
            details={
                "size_before_bytes": size_before,
                "size_after_bytes": size_after,
                "space_reclaimed_bytes": space_reclaimed,
                "operations": ["VACUUM", "ANALYZE"],
            },
            success=True,
        )

        logger.info(f"Background optimization completed: reclaimed {space_reclaimed} bytes")

    except Exception as e:
        logger.error(f"Background optimization failed: {str(e)}", exc_info=True)

        audit_logger.log(
            event_type="database.optimized",
            user_id=str(user_id),
            resource_type="database",
            resource_id="main",
            action="optimize",
            success=False,
            error_message=str(e),
        )


# ===== ROUTES =====
@router.get("/stats", response_model=DatabaseStatsResponse)
async def get_database_stats(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get database statistics (table counts, size, backup info).

    Returns database metadata including:
    - Database file size
    - Number of tables
    - Total record count
    - Per-table row counts
    - Backup count and total size
    """
    try:
        db_size_bytes = backup_service.get_database_size()
        db_size_mb = round(db_size_bytes / (1024 * 1024), 2)

        # Get table metadata
        metadata = get_table_metadata(db)

        # Get backup information
        backups = backup_service.list_backups()
        backups_size_bytes = backup_service.get_backups_dir_size()
        backups_size_mb = round(backups_size_bytes / (1024 * 1024), 2)

        # Log audit event
        audit_logger.log(
            event_type="database.stats_viewed",
            user_id=str(user_id),
            resource_type="database",
            resource_id="main",
            action="view",
            success=True,
        )

        return {
            "connected": True,
            "database_path": DATABASE_PATH,
            "database_size_bytes": db_size_bytes,
            "database_size_mb": db_size_mb,
            "table_count": metadata["table_count"],
            "total_records": metadata["total_records"],
            "tables": metadata["tables"],
            "backups_count": len(backups),
            "backups_size_bytes": backups_size_bytes,
            "backups_size_mb": backups_size_mb,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get database stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")


@router.post("/backup", response_model=CreateBackupResponse, status_code=status.HTTP_201_CREATED)
async def create_backup(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Create a database backup.

    Creates a timestamped copy of the database file in the backup directory.
    Returns backup metadata including file size and table counts.

    Rate limited to 5 backups per hour per user.
    """
    try:
        # Rate limiting: 5 backups per hour
        check_rate_limit(user_id, "backup", 5, 1)

        # Create backup using service
        backup = backup_service.create_backup()

        # Get database metadata (table counts)
        metadata = get_table_metadata(db)
        backup_metadata = {
            "version": "1.0.0",
            "record_count": metadata["total_records"],
            "tables": list(metadata["tables"].keys()),
        }

        # Convert size to MB
        size_mb = round(backup.size / (1024 * 1024), 2)

        # Log audit event
        audit_logger.log(
            event_type="database.backup_created",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=backup.filename,
            action="create",
            details={"filename": backup.filename, "size_bytes": backup.size},
            success=True,
        )

        return {
            "filename": backup.filename,
            "path": backup.filepath,
            "size_bytes": backup.size,
            "size_mb": size_mb,
            "created_at": backup.created_at,
            "is_valid": True,
            "is_protected": backup.is_protected,
            "metadata": backup_metadata,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create backup: {str(e)}", exc_info=True)

        # Log failed backup creation
        audit_logger.log(
            event_type="database.backup_created",
            user_id=str(user_id),
            resource_type="backup",
            resource_id="unknown",
            action="create",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")


@router.get("/backups", response_model=ListBackupsResponse)
async def list_backups(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    List all available database backups.

    Returns metadata for each backup including:
    - Filename and path
    - File size
    - Creation timestamp
    - Protected status
    - Database metadata (if available)

    Backups are sorted by creation time (newest first).
    """
    try:
        # Get all backups from service
        backups = backup_service.list_backups()

        # Log audit event
        audit_logger.log(
            event_type="database.backups_listed",
            user_id=str(user_id),
            resource_type="backup",
            resource_id="all",
            action="list",
            details={"count": len(backups)},
            success=True,
        )

        return {"backups": backups, "count": len(backups)}

    except Exception as e:
        logger.error(f"Failed to list backups: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")


@router.get("/backups/{backup_filename}", response_model=BackupMetadataResponse)
async def get_backup_details(
    backup_filename: str,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get details for a specific backup file.

    Args:
        backup_filename: Name of backup file

    Returns:
        Backup metadata
    """
    try:
        # Validate filename (prevent path traversal)
        if "/" in backup_filename or "\\" in backup_filename or ".." in backup_filename:
            raise HTTPException(
                status_code=400, detail="Invalid backup filename - path traversal not allowed"
            )

        # Get backup metadata
        backup = backup_service.get_backup_by_filename(backup_filename)

        if not backup:
            raise HTTPException(status_code=404, detail="Backup file not found")

        # Log audit event
        audit_logger.log(
            event_type="database.backup_viewed",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=backup_filename,
            action="view",
            success=True,
        )

        return backup

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get backup details: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get backup details: {str(e)}")


@router.post("/restore", response_model=RestoreBackupResponse)
async def restore_backup(
    request: RestoreBackupRequest,
    user_id: int = Depends(require_admin_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Restore database from a backup (ADMIN ONLY).

    This is a destructive operation that:
    1. Creates a pre-restore backup of current database
    2. Replaces current database with the specified backup
    3. Reopens database connection

    Requires admin privileges for security.
    Rate limited to 1 restore per hour.
    """
    try:
        # Rate limiting: 1 restore per hour
        check_rate_limit(user_id, "restore", 1, 1)

        backup_filename = request.backup_filename

        # Restore using service (creates pre-restore backup automatically)
        backup_service.restore_backup(backup_filename)

        # Log audit event (using new connection after restore)
        audit_logger.log(
            event_type="database.backup_restored",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=backup_filename,
            action="restore",
            details={
                "backup_filename": backup_filename,
                "pre_restore_backup": "pre_restore_backup",
            },
            success=True,
        )

        return {
            "restored": True,
            "message": "Database restored successfully",
            "pre_restore_backup": "pre_restore_backup.db",
        }

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to restore backup: {str(e)}", exc_info=True)

        # Log failed restoration
        audit_logger.log(
            event_type="database.backup_restored",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=request.backup_filename,
            action="restore",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(status_code=500, detail=f"Failed to restore backup: {str(e)}")


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_database(
    background_tasks: BackgroundTasks,
    user_id: int = Depends(require_admin_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Optimize database with VACUUM and ANALYZE (ADMIN ONLY).

    The VACUUM command rebuilds the database file, repacking it into a minimal
    amount of disk space. ANALYZE updates query planner statistics.

    This operation:
    - Defragments the database
    - Reclaims unused space
    - Optimizes page layout
    - Updates query statistics

    Requires admin privileges as this is a system-wide operation.
    Rate limited to 1 optimization per hour.
    """
    try:
        # Rate limiting: 1 optimization per hour
        check_rate_limit(user_id, "optimize", 1, 1)

        # Get database size before VACUUM
        size_before = backup_service.get_database_size()

        # Run VACUUM command
        db.execute(text("VACUUM"))
        db.commit()

        # Run ANALYZE command
        db.execute(text("ANALYZE"))
        db.commit()

        # Get database size after VACUUM
        size_after = backup_service.get_database_size()

        # Calculate space reclaimed
        space_reclaimed = size_before - size_after
        space_reclaimed_mb = round(space_reclaimed / (1024 * 1024), 2)

        # Log audit event
        audit_logger.log(
            event_type="database.optimized",
            user_id=str(user_id),
            resource_type="database",
            resource_id="main",
            action="optimize",
            details={
                "size_before_bytes": size_before,
                "size_after_bytes": size_after,
                "space_reclaimed_bytes": space_reclaimed,
                "operations": ["VACUUM", "ANALYZE"],
            },
            success=True,
        )

        return {
            "success": True,
            "message": "Database optimized successfully",
            "size_before_bytes": size_before,
            "size_after_bytes": size_after,
            "space_reclaimed_bytes": space_reclaimed,
            "space_reclaimed_mb": space_reclaimed_mb,
            "analyze_completed": True,
        }

    except Exception as e:
        logger.error(f"Failed to optimize database: {str(e)}", exc_info=True)

        # Log failed optimization
        audit_logger.log(
            event_type="database.optimized",
            user_id=str(user_id),
            resource_type="database",
            resource_id="main",
            action="optimize",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(status_code=500, detail=f"Failed to optimize database: {str(e)}")


@router.delete("/backups/{backup_filename}", response_model=DeleteBackupResponse)
async def delete_backup(
    backup_filename: str,
    force: bool = Query(False, description="Force delete protected backups"),
    user_id: int = Depends(require_admin_user),
    db: Session = Depends(get_db),
    backup_service: BackupService = Depends(get_backup_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Delete a database backup (ADMIN ONLY).

    Permanently removes a backup file from the backup directory.
    Requires admin privileges for security.

    Protected backups (pre-migration, pre-restore) cannot be deleted
    unless force=True is specified.

    Args:
        backup_filename: Name of backup file to delete
        force: Force delete protected backups (default: False)
    """
    try:
        # Delete backup using service
        backup_service.delete_backup(backup_filename, force=force)

        # Log audit event
        audit_logger.log(
            event_type="database.backup_deleted",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=backup_filename,
            action="delete",
            details={"filename": backup_filename, "force": force},
            success=True,
        )

        return {"deleted": True, "message": "Backup deleted successfully"}

    except HTTPException:
        raise
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Backup file not found")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete backup: {str(e)}", exc_info=True)

        # Log failed deletion
        audit_logger.log(
            event_type="database.backup_deleted",
            user_id=str(user_id),
            resource_type="backup",
            resource_id=backup_filename,
            action="delete",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(status_code=500, detail=f"Failed to delete backup: {str(e)}")


# ===== BACKUP SCHEDULER ROUTES =====


@router.post("/backup/schedule", response_model=BackupSettingsResponse)
async def configure_backup_schedule(
    settings: BackupSettingsUpdate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    scheduler: BackupScheduler = Depends(get_backup_scheduler),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Configure automated backup schedule.

    Allows users to set up automated backups with:
    - Frequency (daily, weekly, monthly)
    - Time of day (HH:MM format)
    - Retention count (1-30 backups to keep)
    - Enable/disable flag

    Creates or updates backup settings for the authenticated user.
    """
    try:
        # Update or create backup settings
        result = scheduler.update_backup_settings(user_id, settings)

        # Log audit event
        audit_logger.log(
            event_type="database.backup_schedule_configured",
            user_id=str(user_id),
            resource_type="backup_schedule",
            resource_id=str(result.id),
            action="configure",
            details={
                "enabled": result.enabled,
                "frequency": result.frequency,
                "backup_time": result.backup_time,
                "keep_count": result.keep_count,
            },
            success=True,
        )

        return result

    except Exception as e:
        logger.error(f"Failed to configure backup schedule: {str(e)}", exc_info=True)

        audit_logger.log(
            event_type="database.backup_schedule_configured",
            user_id=str(user_id),
            resource_type="backup_schedule",
            resource_id="unknown",
            action="configure",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=500, detail=f"Failed to configure backup schedule: {str(e)}"
        )


@router.get("/backup/schedule", response_model=BackupSettingsResponse)
async def get_backup_schedule(
    user_id: int = Depends(get_current_user),
    scheduler: BackupScheduler = Depends(get_backup_scheduler),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get backup schedule settings for authenticated user.

    Returns current backup configuration including:
    - Enabled status
    - Frequency
    - Time of day
    - Retention count
    - Last backup timestamp
    - Next scheduled backup timestamp
    """
    try:
        settings = scheduler.get_backup_settings(user_id)

        if not settings:
            raise HTTPException(
                status_code=404, detail="No backup schedule configured for this user"
            )

        # Log audit event
        audit_logger.log(
            event_type="database.backup_schedule_viewed",
            user_id=str(user_id),
            resource_type="backup_schedule",
            resource_id=str(settings.id),
            action="view",
            success=True,
        )

        return settings

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get backup schedule: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get backup schedule: {str(e)}")


@router.delete("/backup/schedule", status_code=status.HTTP_204_NO_CONTENT)
async def disable_backup_schedule(
    user_id: int = Depends(get_current_user),
    scheduler: BackupScheduler = Depends(get_backup_scheduler),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Disable automated backup schedule for authenticated user.

    Sets enabled=False in backup settings, preventing automated backups
    from running. Does not delete backup configuration.
    """
    try:
        # Disable by updating with enabled=False
        settings_update = BackupSettingsUpdate(enabled=False)
        scheduler.update_backup_settings(user_id, settings_update)

        # Log audit event
        audit_logger.log(
            event_type="database.backup_schedule_disabled",
            user_id=str(user_id),
            resource_type="backup_schedule",
            resource_id=str(user_id),
            action="disable",
            success=True,
        )

        return None

    except Exception as e:
        logger.error(f"Failed to disable backup schedule: {str(e)}", exc_info=True)

        audit_logger.log(
            event_type="database.backup_schedule_disabled",
            user_id=str(user_id),
            resource_type="backup_schedule",
            resource_id=str(user_id),
            action="disable",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(status_code=500, detail=f"Failed to disable backup schedule: {str(e)}")


@router.post("/retention", response_model=ApplyRetentionResponse)
async def apply_retention_policy(
    keep_count: int = Query(..., ge=1, le=30, description="Number of backups to retain"),
    user_id: int = Depends(require_admin_user),
    retention_policy: BackupRetentionPolicy = Depends(get_retention_policy),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Apply retention policy to cleanup old backups (ADMIN ONLY).

    Keeps the most recent `keep_count` regular backups and deletes older ones.
    Protected backups (migration, restore) are never deleted.

    Args:
        keep_count: Number of backups to retain (1-30)

    Returns:
        Number of backups deleted and retention summary
    """
    try:
        # Get summary before applying
        summary = await retention_policy.get_retention_summary(keep_count)

        # Apply retention policy
        deleted_count = await retention_policy.apply_retention_policy(keep_count)

        # Log audit event
        audit_logger.log(
            event_type="database.retention_applied",
            user_id=str(user_id),
            resource_type="backup_retention",
            resource_id="policy",
            action="apply",
            details={
                "keep_count": keep_count,
                "deleted_count": deleted_count,
                "summary": summary.dict(),
            },
            success=True,
        )

        return {
            "deleted_count": deleted_count,
            "message": f"Retention policy applied: deleted {deleted_count} old backup(s)",
            "summary": summary,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to apply retention policy: {str(e)}", exc_info=True)

        audit_logger.log(
            event_type="database.retention_applied",
            user_id=str(user_id),
            resource_type="backup_retention",
            resource_id="policy",
            action="apply",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(status_code=500, detail=f"Failed to apply retention policy: {str(e)}")


@router.get("/scheduler/stats", response_model=SchedulerStatsResponse)
async def get_scheduler_stats(
    user_id: int = Depends(require_admin_user),
    scheduler: BackupScheduler = Depends(get_backup_scheduler),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get backup scheduler statistics (ADMIN ONLY).

    Returns information about the backup scheduler including:
    - Running status
    - Check interval
    - Number of enabled backup settings
    - Total number of backup settings

    Requires admin privileges to view system-wide scheduler status.
    """
    try:
        stats = scheduler.get_stats()

        # Log audit event
        audit_logger.log(
            event_type="database.scheduler_stats_viewed",
            user_id=str(user_id),
            resource_type="backup_scheduler",
            resource_id="stats",
            action="view",
            success=True,
        )

        return {
            "is_running": stats["is_running"],
            "check_interval_seconds": stats["check_interval_seconds"],
            "enabled_backup_settings": stats["enabled_backup_settings"],
            "total_backup_settings": stats["total_backup_settings"],
        }

    except Exception as e:
        logger.error(f"Failed to get scheduler stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get scheduler stats: {str(e)}")

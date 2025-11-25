"""
Backup service for database file operations.
Migrated from src/db/backup.ts

Features:
- Create database backups with custom or timestamped names
- Restore database from backup files
- List all available backups with metadata
- Delete backup files
- Pre-migration and pre-restore automatic backups
- Protection for critical backup files

Security:
- All operations use absolute paths
- Validates file existence before operations
- Creates backups directory if not exists
- Prevents accidental deletion of protected backups
"""

import shutil
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import logging

from backend.models.backup import BackupMetadataResponse

# Configure logging
logger = logging.getLogger(__name__)

class BackupService:
    """
    Service for database backup file operations.

    Provides low-level backup/restore operations with file system management.
    This service handles physical file operations and metadata extraction.

    Attributes:
        backups_dir: Directory path for storing backup files
        db_path: Path to the active database file
    """

    def __init__(self, db_path: str, backups_dir: Optional[str] = None):
        """
        Initialize backup service.

        Args:
            db_path: Path to the active database file
            backups_dir: Directory for backups (default: {db_dir}/backups)
        """
        self.db_path = Path(db_path)

        # Default backups directory is sibling to database
        if backups_dir:
            self.backups_dir = Path(backups_dir)
        else:
            self.backups_dir = self.db_path.parent / "backups"

        # Ensure backups directory exists
        self.backups_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            f"BackupService initialized with db_path={self.db_path}, backups_dir={self.backups_dir}"
        )

    def create_backup(self, custom_filename: Optional[str] = None) -> BackupMetadataResponse:
        """
        Create a backup of the database.

        Args:
            custom_filename: Optional custom filename (without extension)

        Returns:
            Backup metadata with file information

        Raises:
            FileNotFoundError: If database file doesn't exist
            IOError: If backup creation fails
        """
        try:
            if not self.db_path.exists():
                raise FileNotFoundError(f"Database file not found: {self.db_path}")

            # Generate filename
            if custom_filename:
                filename = f"{custom_filename}.db"
            else:
                timestamp = datetime.utcnow().isoformat().replace(":", "-").replace(".", "-")
                filename = f"justice_backup_{timestamp}.db"

            backup_path = self.backups_dir / filename

            # Copy database file
            shutil.copy2(self.db_path, backup_path)

            # Get file stats
            stats = backup_path.stat()
            is_protected = self._is_protected_backup(filename)

            metadata = BackupMetadataResponse(
                filename=filename,
                filepath=str(backup_path),
                size=stats.st_size,
                created_at=datetime.fromtimestamp(stats.st_ctime).isoformat(),
                is_protected=is_protected,
            )

            logger.info(f"Database backup created: {filename} ({stats.st_size} bytes)")

            return metadata

        except Exception as error:
            logger.error(f"Failed to create backup: {str(error)}", exc_info=True)
            raise IOError(f"Failed to create backup: {str(error)}")

    def restore_backup(self, filename: str) -> None:
        """
        Restore database from a backup file.

        Creates a pre-restore backup before overwriting the current database.

        Args:
            filename: Backup filename or full path

        Raises:
            FileNotFoundError: If backup file doesn't exist
            IOError: If restore operation fails
        """
        try:
            # Determine backup path
            backup_path = Path(filename)
            if not backup_path.is_absolute():
                backup_path = self.backups_dir / filename

            if not backup_path.exists():
                raise FileNotFoundError(f"Backup file not found: {backup_path}")

            # Create pre-restore backup of current database
            self.create_backup("pre_restore_backup")

            # Restore backup by copying over current database
            shutil.copy2(backup_path, self.db_path)

            logger.info(f"Database restored from: {filename}")

        except Exception as error:
            logger.error(f"Failed to restore backup: {str(error)}", exc_info=True)
            raise IOError(f"Failed to restore backup: {str(error)}")

    def list_backups(self) -> List[BackupMetadataResponse]:
        """
        List all available backup files.

        Returns:
            List of backup metadata sorted by creation date (most recent first)
        """
        try:
            backups = []

            for file_path in self.backups_dir.glob("*.db"):
                if file_path.is_file():
                    stats = file_path.stat()
                    is_protected = self._is_protected_backup(file_path.name)

                    metadata = BackupMetadataResponse(
                        filename=file_path.name,
                        filepath=str(file_path),
                        size=stats.st_size,
                        created_at=datetime.fromtimestamp(stats.st_ctime).isoformat(),
                        is_protected=is_protected,
                    )
                    backups.append(metadata)

            # Sort by creation date (most recent first)
            backups.sort(key=lambda b: b.created_at, reverse=True)

            return backups

        except Exception as error:
            logger.error(f"Failed to list backups: {str(error)}", exc_info=True)
            return []

    def delete_backup(self, filename: str, force: bool = False) -> None:
        """
        Delete a backup file.

        Args:
            filename: Backup filename
            force: If True, allow deletion of protected backups

        Raises:
            FileNotFoundError: If backup file doesn't exist
            PermissionError: If trying to delete protected backup without force
            IOError: If deletion fails
        """
        try:
            backup_path = self.backups_dir / filename

            if not backup_path.exists():
                raise FileNotFoundError(f"Backup file not found: {filename}")

            # Check if backup is protected
            if self._is_protected_backup(filename) and not force:
                raise PermissionError(
                    f"Cannot delete protected backup: {filename}. Use force=True to override."
                )

            # Delete file
            backup_path.unlink()

            logger.info(f"Backup deleted: {filename}")

        except Exception as error:
            logger.error(f"Failed to delete backup: {str(error)}", exc_info=True)
            raise IOError(f"Failed to delete backup: {str(error)}")

    def create_pre_migration_backup(self) -> BackupMetadataResponse:
        """
        Create a backup before database migration.

        Creates a timestamped backup with 'pre_migration_' prefix.
        These backups are protected from automatic retention policies.

        Returns:
            Backup metadata
        """
        timestamp = datetime.utcnow().isoformat().replace(":", "-").replace(".", "-")
        filename = f"pre_migration_{timestamp}"
        return self.create_backup(filename)

    def get_backup_by_filename(self, filename: str) -> Optional[BackupMetadataResponse]:
        """
        Get metadata for a specific backup file.

        Args:
            filename: Backup filename

        Returns:
            Backup metadata or None if not found
        """
        backup_path = self.backups_dir / filename

        if not backup_path.exists():
            return None

        stats = backup_path.stat()
        is_protected = self._is_protected_backup(filename)

        return BackupMetadataResponse(
            filename=filename,
            filepath=str(backup_path),
            size=stats.st_size,
            created_at=datetime.fromtimestamp(stats.st_ctime).isoformat(),
            is_protected=is_protected,
        )

    def _is_protected_backup(self, filename: str) -> bool:
        """
        Check if a backup is protected from retention policy.

        Protected backups:
        - Pre-migration backups (pre_migration_*)
        - Pre-restore backups (pre_restore_backup*)

        Args:
            filename: Backup filename

        Returns:
            True if backup is protected
        """
        protected_prefixes = ["pre_migration_", "pre_restore_backup"]
        return any(filename.startswith(prefix) for prefix in protected_prefixes)

    def get_backups_dir_size(self) -> int:
        """
        Calculate total size of all backup files.

        Returns:
            Total size in bytes
        """
        total_size = 0

        for file_path in self.backups_dir.glob("*.db"):
            if file_path.is_file():
                total_size += file_path.stat().st_size

        return total_size

    def get_database_size(self) -> int:
        """
        Get current database file size.

        Returns:
            Size in bytes

        Raises:
            FileNotFoundError: If database file doesn't exist
        """
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database file not found: {self.db_path}")

        return self.db_path.stat().st_size

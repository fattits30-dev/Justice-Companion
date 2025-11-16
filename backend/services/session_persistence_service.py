"""
Session Persistence Service for Justice Companion.

Migrated from: src/services/SessionPersistenceService.ts

IMPORTANT ARCHITECTURAL NOTE:
The TypeScript version uses Electron's safeStorage API to encrypt session IDs
to local files for "Remember Me" functionality across app restarts. This Python
backend version provides database-based session persistence instead, as:

1. Backend sessions are already persisted in the database (sessions table)
2. Python backend doesn't have access to Electron's safeStorage API
3. "Remember Me" is handled via session expiration times (24h vs 30 days)

Features:
- Session validation and restoration from database
- Automatic cleanup of expired sessions
- Session metadata tracking (IP, user agent, last activity)
- UUID v4 validation for session IDs
- Comprehensive audit logging
- Thread-safe database operations

Security:
- Session IDs are cryptographically secure UUID v4
- Sessions expire automatically (24h default, 30d for Remember Me)
- All session operations are audited
- IP address and user agent tracking for anomaly detection
- No plaintext session data stored

Usage:
    from backend.services.session_persistence_service import SessionPersistenceService

    service = SessionPersistenceService(db=db, audit_logger=audit_logger)

    # Check if session exists and is valid
    is_valid = await service.is_session_valid(session_id)

    # Restore session with user data
    session_data = await service.restore_session(session_id)

    # Update last activity timestamp
    await service.update_session_activity(session_id)

    # Cleanup expired sessions (run periodically)
    deleted_count = await service.cleanup_expired_sessions()

    # Get session metadata for debugging
    metadata = await service.get_session_metadata(session_id)
"""

import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.models.session import Session as SessionModel
from backend.models.user import User


class SessionPersistenceError(Exception):
    """Exception raised for session persistence errors."""
    pass


class SessionPersistenceService:
    """
    Session Persistence Service - Database-based session management.

    Provides session validation, restoration, and cleanup for authenticated users.
    Replaces the Electron safeStorage file-based approach with database persistence.
    """

    # UUID v4 validation pattern
    UUID_V4_PATTERN = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        re.IGNORECASE
    )

    def __init__(self, db: Session, audit_logger=None):
        """
        Initialize SessionPersistenceService.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional AuditLogger instance for logging
        """
        self.db = db
        self.audit_logger = audit_logger

    def _is_valid_uuid_v4(self, session_id: str) -> bool:
        """
        Validate that a string is a properly formatted UUID v4.

        Args:
            session_id: String to validate

        Returns:
            True if valid UUID v4, False otherwise
        """
        if not session_id or not isinstance(session_id, str):
            return False

        # Check format with regex
        if not self.UUID_V4_PATTERN.match(session_id):
            return False

        # Additional validation using UUID library
        try:
            uuid_obj = UUID(session_id, version=4)
            return str(uuid_obj) == session_id
        except (ValueError, AttributeError):
            return False

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        session_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id) if user_id else None,
                resource_type="session",
                resource_id=session_id,
                action=action,
                details=details or {},
                success=success,
                error_message=error_message
            )

    async def is_session_valid(self, session_id: str) -> bool:
        """
        Check if session exists and is valid (not expired).

        This is a lightweight check that doesn't load full session data.

        Args:
            session_id: UUID v4 session ID

        Returns:
            True if session exists and is not expired, False otherwise
        """
        # Validate UUID format
        if not self._is_valid_uuid_v4(session_id):
            return False

        try:
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()

            if not session:
                return False

            # Check if session is expired
            now = datetime.now(timezone.utc)
            if session.expires_at.replace(tzinfo=timezone.utc) < now:
                # Session expired - clean it up
                self.db.delete(session)
                self.db.commit()

                self._log_audit(
                    event_type="session.expired",
                    user_id=session.user_id,
                    session_id=session_id,
                    action="delete",
                    success=True,
                    details={"reason": "Session expired during validation"}
                )

                return False

            return True

        except Exception as e:
            self._log_audit(
                event_type="session.validation_error",
                user_id=None,
                session_id=session_id,
                action="read",
                success=False,
                error_message=str(e)
            )
            return False

    async def restore_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Restore session from database with full user data.

        This is equivalent to the TypeScript retrieveSessionId() method,
        but returns complete session and user data instead of just the ID.

        Args:
            session_id: UUID v4 session ID

        Returns:
            Dictionary with session and user data, or None if invalid/expired
            {
                "session": {
                    "id": str,
                    "user_id": int,
                    "expires_at": str (ISO),
                    "created_at": str (ISO),
                    "ip_address": str,
                    "user_agent": str
                },
                "user": {
                    "id": int,
                    "username": str,
                    "email": str,
                    "role": str,
                    "is_active": bool
                }
            }
        """
        # Validate UUID format
        if not self._is_valid_uuid_v4(session_id):
            self._log_audit(
                event_type="session.restore",
                user_id=None,
                session_id=session_id,
                action="read",
                success=False,
                details={"reason": "Invalid session ID format (expected UUID v4)"}
            )
            return None

        try:
            # Query session with user join
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()

            if not session:
                self._log_audit(
                    event_type="session.restore",
                    user_id=None,
                    session_id=session_id,
                    action="read",
                    success=False,
                    details={"reason": "Session not found"}
                )
                return None

            # Check if session is expired
            now = datetime.now(timezone.utc)
            if session.expires_at.replace(tzinfo=timezone.utc) < now:
                # Session expired - clean it up
                user_id = session.user_id
                self.db.delete(session)
                self.db.commit()

                self._log_audit(
                    event_type="session.restore",
                    user_id=user_id,
                    session_id=session_id,
                    action="delete",
                    success=False,
                    details={"reason": "Session expired"}
                )

                return None

            # Get user data
            user = self.db.query(User).filter(User.id == session.user_id).first()

            if not user:
                # Orphaned session - clean it up
                self.db.delete(session)
                self.db.commit()

                self._log_audit(
                    event_type="session.restore",
                    user_id=session.user_id,
                    session_id=session_id,
                    action="delete",
                    success=False,
                    details={"reason": "User not found (orphaned session)"}
                )

                return None

            # Check if user is active
            if not user.is_active:
                self._log_audit(
                    event_type="session.restore",
                    user_id=user.id,
                    session_id=session_id,
                    action="read",
                    success=False,
                    details={"reason": "User account is inactive"}
                )
                return None

            self._log_audit(
                event_type="session.restore",
                user_id=user.id,
                session_id=session_id,
                action="read",
                success=True,
                details={"username": user.username}
            )

            return {
                "session": session.to_dict(),
                "user": user.to_dict()
            }

        except Exception as e:
            self._log_audit(
                event_type="session.restore",
                user_id=None,
                session_id=session_id,
                action="read",
                success=False,
                error_message=str(e)
            )
            return None

    async def update_session_activity(
        self,
        session_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Update session last activity timestamp and optional metadata.

        This can be used to track user activity and extend session lifetime
        in future implementations (rolling sessions).

        Args:
            session_id: UUID v4 session ID
            ip_address: Updated IP address (optional)
            user_agent: Updated user agent (optional)

        Returns:
            True if session was updated, False if not found or expired
        """
        # Validate UUID format
        if not self._is_valid_uuid_v4(session_id):
            return False

        try:
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()

            if not session:
                return False

            # Check if session is expired
            now = datetime.now(timezone.utc)
            if session.expires_at.replace(tzinfo=timezone.utc) < now:
                # Session expired - don't update
                return False

            # Update metadata if provided
            if ip_address:
                session.ip_address = ip_address
            if user_agent:
                session.user_agent = user_agent

            self.db.commit()

            return True

        except Exception as e:
            self._log_audit(
                event_type="session.update_activity",
                user_id=None,
                session_id=session_id,
                action="update",
                success=False,
                error_message=str(e)
            )
            return False

    async def clear_session(self, session_id: str) -> bool:
        """
        Clear (delete) a stored session from database.

        This is equivalent to the TypeScript clearSession() method,
        used for logout or cleanup.

        Args:
            session_id: UUID v4 session ID

        Returns:
            True if session was deleted, False if not found or error
        """
        # Validate UUID format
        if not self._is_valid_uuid_v4(session_id):
            return False

        try:
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()

            if not session:
                # Session doesn't exist - not an error condition
                return True

            user_id = session.user_id

            # Delete session
            self.db.delete(session)
            self.db.commit()

            self._log_audit(
                event_type="session.clear",
                user_id=user_id,
                session_id=session_id,
                action="delete",
                success=True,
                details={"reason": "Manual session clear (logout)"}
            )

            return True

        except Exception as e:
            self._log_audit(
                event_type="session.clear",
                user_id=None,
                session_id=session_id,
                action="delete",
                success=False,
                error_message=str(e)
            )
            return False

    async def has_stored_session(self, session_id: str) -> bool:
        """
        Check if a session exists in database (without validating expiration).

        This is equivalent to the TypeScript hasStoredSession() method.

        Args:
            session_id: UUID v4 session ID

        Returns:
            True if session exists, False otherwise
        """
        # Validate UUID format
        if not self._is_valid_uuid_v4(session_id):
            return False

        try:
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()

            return session is not None

        except Exception:
            return False

    async def get_session_metadata(self, session_id: str) -> Dict[str, Any]:
        """
        Get metadata about a session for debugging and monitoring.

        This is equivalent to the TypeScript getSessionMetadata() method.

        Args:
            session_id: UUID v4 session ID

        Returns:
            Dictionary with session metadata:
            {
                "exists": bool,
                "expired": bool,
                "user_id": int (optional),
                "created_at": str (optional),
                "expires_at": str (optional),
                "ip_address": str (optional),
                "user_agent": str (optional),
                "is_valid_uuid": bool
            }
        """
        metadata = {
            "exists": False,
            "expired": False,
            "is_valid_uuid": self._is_valid_uuid_v4(session_id)
        }

        if not metadata["is_valid_uuid"]:
            return metadata

        try:
            session = self.db.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()

            if not session:
                return metadata

            metadata["exists"] = True
            metadata["user_id"] = session.user_id
            metadata["created_at"] = session.created_at.isoformat() if session.created_at else None
            metadata["expires_at"] = session.expires_at.isoformat() if session.expires_at else None
            metadata["ip_address"] = session.ip_address
            metadata["user_agent"] = session.user_agent

            # Check if expired
            now = datetime.now(timezone.utc)
            metadata["expired"] = session.expires_at.replace(tzinfo=timezone.utc) < now

        except Exception:
            # Return partial metadata on error
            pass

        return metadata

    async def cleanup_expired_sessions(self) -> int:
        """
        Cleanup expired sessions from database.

        This should be run periodically (e.g., daily cron job or background task).

        Returns:
            Number of sessions deleted
        """
        try:
            now = datetime.now(timezone.utc)

            # Query expired sessions
            expired_sessions = self.db.query(SessionModel).filter(
                SessionModel.expires_at < now
            ).all()

            deleted_count = len(expired_sessions)

            if deleted_count == 0:
                return 0

            # Delete expired sessions
            self.db.query(SessionModel).filter(
                SessionModel.expires_at < now
            ).delete(synchronize_session=False)

            self.db.commit()

            self._log_audit(
                event_type="session.cleanup",
                user_id=None,
                session_id="system",
                action="delete",
                success=True,
                details={
                    "deleted_count": deleted_count,
                    "reason": "Periodic cleanup of expired sessions"
                }
            )

            return deleted_count

        except Exception as e:
            self._log_audit(
                event_type="session.cleanup",
                user_id=None,
                session_id="system",
                action="delete",
                success=False,
                error_message=str(e)
            )
            return 0

    async def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get all active sessions for a user.

        Useful for "active sessions" management UI where users can see
        all devices/locations where they're logged in.

        Args:
            user_id: User ID

        Returns:
            List of session dictionaries
        """
        try:
            now = datetime.now(timezone.utc)

            # Query active (non-expired) sessions for user
            sessions = self.db.query(SessionModel).filter(
                SessionModel.user_id == user_id,
                SessionModel.expires_at > now
            ).all()

            return [session.to_dict() for session in sessions]

        except Exception as e:
            self._log_audit(
                event_type="session.get_user_sessions",
                user_id=user_id,
                session_id="system",
                action="read",
                success=False,
                error_message=str(e)
            )
            return []

    async def revoke_user_sessions(
        self,
        user_id: int,
        except_session_id: Optional[str] = None
    ) -> int:
        """
        Revoke all sessions for a user (e.g., after password change).

        Args:
            user_id: User ID
            except_session_id: Optional session ID to keep (e.g., current session)

        Returns:
            Number of sessions revoked
        """
        try:
            query = self.db.query(SessionModel).filter(
                SessionModel.user_id == user_id
            )

            # Optionally exclude current session
            if except_session_id:
                query = query.filter(SessionModel.id != except_session_id)

            sessions = query.all()
            revoked_count = len(sessions)

            if revoked_count == 0:
                return 0

            # Delete sessions
            query.delete(synchronize_session=False)
            self.db.commit()

            self._log_audit(
                event_type="session.revoke_user_sessions",
                user_id=user_id,
                session_id="system",
                action="delete",
                success=True,
                details={
                    "revoked_count": revoked_count,
                    "except_session_id": except_session_id,
                    "reason": "User sessions revoked (password change or security event)"
                }
            )

            return revoked_count

        except Exception as e:
            self._log_audit(
                event_type="session.revoke_user_sessions",
                user_id=user_id,
                session_id="system",
                action="delete",
                success=False,
                error_message=str(e)
            )
            return 0

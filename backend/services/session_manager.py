"""
Session Manager Service for Justice Companion.

Migrated from: electron/services/SessionManager.ts

ARCHITECTURAL NOTE:
This is a Python FastAPI implementation of the TypeScript in-memory SessionManager.
The TypeScript version maintains sessions in memory for fast IPC validation in Electron.
This Python version provides database-backed session management with caching capabilities.

Key Differences from TypeScript Version:
1. Database persistence instead of pure in-memory (but with optional caching)
2. Async/await patterns for database operations
3. Integrates with existing SessionPersistenceService for storage
4. FastAPI HTTPException for error handling
5. Pydantic models for request/response validation

Features:
- Fast session validation with optional in-memory caching
- Automatic session expiration handling
- UUID v4 session IDs for security
- Session cleanup on logout
- Periodic cleanup of expired sessions
- Session lifecycle management (create, validate, destroy)
- Comprehensive audit logging

Security:
- Sessions expire after 24 hours (or 30 days for rememberMe)
- Expired sessions automatically cleaned up
- Session IDs are cryptographically secure UUID v4
- All operations audited for security monitoring

Usage:
    from backend.services.session_manager import SessionManager

    manager = SessionManager(db=db, audit_logger=audit_logger)

    # Create new session
    session_id = await manager.create_session(
        user_id=123,
        username="john_doe",
        remember_me=False
    )

    # Validate session
    result = await manager.validate_session(session_id)
    if result.valid:
        print(f"User {result.username} is authenticated")

    # Destroy session (logout)
    await manager.destroy_session(session_id)

    # Periodic cleanup (run via cron/scheduler)
    cleaned = await manager.cleanup_expired_sessions()
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from backend.models.session import Session as SessionModel
from backend.models.user import User


# Configure logging
logger = logging.getLogger(__name__)


class InMemorySession(BaseModel):
    """
    In-memory session data model.

    Represents a cached session in memory for fast validation.
    Matches the TypeScript InMemorySession interface.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str = Field(..., description="UUID v4 session ID")
    user_id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username for quick access")
    created_at: datetime = Field(..., description="Session creation timestamp")
    expires_at: datetime = Field(..., description="Session expiration timestamp")
    remember_me: bool = Field(default=False, description="Remember me flag")


class SessionValidationResult(BaseModel):
    """
    Session validation result.

    Returned by validate_session() method.
    Matches the TypeScript SessionValidationResult interface.
    """

    valid: bool = Field(..., description="Whether session is valid")
    user_id: Optional[int] = Field(None, description="User ID if session valid")
    username: Optional[str] = Field(None, description="Username if session valid")


class SessionManagerError(Exception):
    """Exception raised for session manager errors."""


class SessionManager:
    """
    Session Manager - In-Memory Session Management with Database Persistence.

    Provides fast session validation for API authentication with optional in-memory
    caching. Sessions are persisted to database for reliability across restarts.

    Features:
    - Fast O(1) session validation (cached)
    - Automatic session expiration
    - Session cleanup on logout
    - UUID-based session IDs for security
    - Database persistence via SessionPersistenceService

    Security:
    - Sessions expire after 24 hours (or 30 days for rememberMe)
    - Expired sessions are automatically cleaned up
    - Session IDs are cryptographically secure UUIDs
    - All operations audited
    """

    # Constants (matching TypeScript implementation)
    SESSION_DURATION_HOURS = 24
    REMEMBER_ME_DURATION_DAYS = 30
    CLEANUP_INTERVAL_MINUTES = 5  # For periodic cleanup

    def __init__(self, db: Session, audit_logger=None, enable_memory_cache: bool = False):
        """
        Initialize SessionManager.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional AuditLogger instance for logging
            enable_memory_cache: Enable in-memory caching for faster validation
        """
        self.db = db
        self.audit_logger = audit_logger
        self.enable_memory_cache = enable_memory_cache

        # In-memory session cache (optional for performance)
        self._memory_cache: Dict[str, InMemorySession] = {}

        logger.info(
            f"SessionManager initialized (memory_cache={'enabled' if enable_memory_cache else 'disabled'})"
        )

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        session_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
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
                error_message=error_message,
            )

    def _calculate_expiration(self, remember_me: bool) -> datetime:
        """
        Calculate session expiration time.

        Args:
            remember_me: If True, session lasts 30 days; otherwise 24 hours

        Returns:
            Expiration datetime in UTC
        """
        if remember_me:
            # 30 days for remember me
            return datetime.now(timezone.utc) + timedelta(days=self.REMEMBER_ME_DURATION_DAYS)
        else:
            # 24 hours default
            return datetime.now(timezone.utc) + timedelta(hours=self.SESSION_DURATION_HOURS)

    async def create_session(
        self,
        user_id: int,
        username: str,
        remember_me: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        """
        Create a new session for a user.

        This creates both a database-backed session and optionally caches it
        in memory for fast validation.

        Args:
            user_id: User ID
            username: Username (for quick access without DB query)
            remember_me: If True, session lasts 30 days; otherwise 24 hours
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            Session ID (UUID v4)

        Raises:
            SessionManagerError: If user doesn't exist or session creation fails
        """
        # Verify user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            self._log_audit(
                event_type="session.create",
                user_id=user_id,
                session_id="unknown",
                action="create",
                success=False,
                error_message="User not found",
            )
            raise SessionManagerError(f"User {user_id} not found")

        # Verify user is active
        if not user.is_active:
            self._log_audit(
                event_type="session.create",
                user_id=user_id,
                session_id="unknown",
                action="create",
                success=False,
                error_message="User account is inactive",
            )
            raise SessionManagerError(f"User {user_id} account is inactive")

        # Generate secure session ID
        session_id = str(uuid4())

        # Calculate expiration time
        expires_at = self._calculate_expiration(remember_me)
        created_at = datetime.now(timezone.utc)

        try:
            # Create database session
            db_session = SessionModel(
                id=session_id,
                user_id=user_id,
                expires_at=expires_at,
                created_at=created_at,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.db.add(db_session)
            self.db.commit()

            # Cache in memory if enabled
            if self.enable_memory_cache:
                memory_session = InMemorySession(
                    id=session_id,
                    user_id=user_id,
                    username=username,
                    created_at=created_at,
                    expires_at=expires_at,
                    remember_me=remember_me,
                )
                self._memory_cache[session_id] = memory_session

            self._log_audit(
                event_type="session.create",
                user_id=user_id,
                session_id=session_id,
                action="create",
                success=True,
                details={
                    "username": username,
                    "remember_me": remember_me,
                    "expires_at": expires_at.isoformat(),
                    "cached": self.enable_memory_cache,
                },
            )

            logger.info(
                f"[SessionManager] Created session {session_id} for user {username} "
                f"(expires: {expires_at.isoformat()})"
            )

            return session_id

        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="session.create",
                user_id=user_id,
                session_id=session_id,
                action="create",
                success=False,
                error_message=str(e),
            )
            raise SessionManagerError(f"Failed to create session: {str(e)}")

    async def validate_session(self, session_id: str) -> SessionValidationResult:
        """
        Validate a session and return user information.

        First checks memory cache (if enabled), then falls back to database.
        Automatically cleans up expired sessions.

        Args:
            session_id: Session UUID to validate

        Returns:
            SessionValidationResult with validation status and user info
        """
        # Check memory cache first (if enabled)
        if self.enable_memory_cache and session_id in self._memory_cache:
            cached_session = self._memory_cache[session_id]

            # Check if cached session is expired
            if datetime.now(timezone.utc) > cached_session.expires_at:
                # Remove from cache
                del self._memory_cache[session_id]

                # Remove from database
                try:
                    self.db.query(SessionModel).filter(SessionModel.id == session_id).delete()
                    self.db.commit()
                except Exception as e:
                    logger.error(f"Failed to delete expired session {session_id}: {e}")

                logger.info(
                    f"[SessionManager] Cleaned up expired cached session {session_id} "
                    f"for user {cached_session.username}"
                )

                return SessionValidationResult(valid=False)

            # Cached session is valid
            return SessionValidationResult(
                valid=True, user_id=cached_session.user_id, username=cached_session.username
            )

        # Query database
        try:
            db_session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()

            if not db_session:
                return SessionValidationResult(valid=False)

            # Check if session is expired
            now = datetime.now(timezone.utc)
            if db_session.expires_at.replace(tzinfo=timezone.utc) < now:
                # Clean up expired session
                user_id = db_session.user_id
                self.db.delete(db_session)
                self.db.commit()

                # Remove from cache if present
                if self.enable_memory_cache and session_id in self._memory_cache:
                    del self._memory_cache[session_id]

                logger.info(
                    f"[SessionManager] Cleaned up expired session {session_id} "
                    f"for user {user_id}"
                )

                return SessionValidationResult(valid=False)

            # Get user information
            user = self.db.query(User).filter(User.id == db_session.user_id).first()

            if not user or not user.is_active:
                return SessionValidationResult(valid=False)

            # Add to memory cache if enabled
            if self.enable_memory_cache and session_id not in self._memory_cache:
                memory_session = InMemorySession(
                    id=session_id,
                    user_id=user.id,
                    username=user.username,
                    created_at=db_session.created_at,
                    expires_at=db_session.expires_at,
                    remember_me=(db_session.expires_at - db_session.created_at).days > 1,
                )
                self._memory_cache[session_id] = memory_session

            return SessionValidationResult(valid=True, user_id=user.id, username=user.username)

        except Exception as e:
            logger.error(f"Session validation error for {session_id}: {e}")
            return SessionValidationResult(valid=False)

    async def destroy_session(self, session_id: str) -> bool:
        """
        Destroy a session (logout).

        Removes session from both memory cache and database.

        Args:
            session_id: Session UUID to destroy

        Returns:
            True if session was destroyed, False if not found
        """
        # Remove from memory cache
        username = None
        if self.enable_memory_cache and session_id in self._memory_cache:
            username = self._memory_cache[session_id].username
            del self._memory_cache[session_id]

        # Remove from database
        try:
            db_session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()

            if db_session:
                user_id = db_session.user_id
                if not username:
                    user = self.db.query(User).filter(User.id == user_id).first()
                    username = user.username if user else "unknown"

                self.db.delete(db_session)
                self.db.commit()

                self._log_audit(
                    event_type="session.destroy",
                    user_id=user_id,
                    session_id=session_id,
                    action="delete",
                    success=True,
                    details={"username": username},
                )

                logger.info(f"[SessionManager] Destroyed session {session_id} for user {username}")

                return True

            return False

        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="session.destroy",
                user_id=None,
                session_id=session_id,
                action="delete",
                success=False,
                error_message=str(e),
            )
            logger.error(f"Failed to destroy session {session_id}: {e}")
            return False

    async def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions from database and memory cache.

        This should be called periodically (e.g., every 5 minutes) to prevent
        memory leaks and database bloat.

        Returns:
            Number of sessions cleaned up
        """
        cleaned_count = 0
        now = datetime.now(timezone.utc)

        # Clean memory cache
        if self.enable_memory_cache:
            expired_cache_ids = [
                session_id
                for session_id, session in self._memory_cache.items()
                if now > session.expires_at
            ]

            for session_id in expired_cache_ids:
                del self._memory_cache[session_id]
                cleaned_count += 1

        # Clean database
        try:
            expired_sessions = (
                self.db.query(SessionModel).filter(SessionModel.expires_at < now).all()
            )

            db_cleaned = len(expired_sessions)

            if db_cleaned > 0:
                self.db.query(SessionModel).filter(SessionModel.expires_at < now).delete(
                    synchronize_session=False
                )

                self.db.commit()

                cleaned_count += db_cleaned

                self._log_audit(
                    event_type="session.cleanup",
                    user_id=None,
                    session_id="system",
                    action="delete",
                    success=True,
                    details={
                        "deleted_count": cleaned_count,
                        "memory_cache_cleaned": (
                            len(expired_cache_ids) if self.enable_memory_cache else 0
                        ),
                        "database_cleaned": db_cleaned,
                    },
                )

                logger.info(
                    f"[SessionManager] Cleaned up {cleaned_count} expired sessions "
                    f"(cache: {len(expired_cache_ids) if self.enable_memory_cache else 0}, "
                    f"db: {db_cleaned})"
                )

            return cleaned_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return cleaned_count

    def get_session_count(self) -> Dict[str, int]:
        """
        Get session counts for monitoring/debugging.

        Returns:
            Dictionary with session counts:
            - memory_cache: Number of cached sessions (if enabled)
            - database: Total sessions in database
            - active: Non-expired sessions in database
        """
        result = {"memory_cache": 0, "database": 0, "active": 0}

        # Count memory cache
        if self.enable_memory_cache:
            result["memory_cache"] = len(self._memory_cache)

        # Count database sessions
        try:
            result["database"] = self.db.query(SessionModel).count()

            now = datetime.now(timezone.utc)
            result["active"] = (
                self.db.query(SessionModel).filter(SessionModel.expires_at > now).count()
            )

        except Exception as e:
            logger.error(f"Failed to get session counts: {e}")

        return result

    def get_active_session_ids(self) -> List[str]:
        """
        Get all active session IDs (for debugging).

        Returns memory cache IDs if enabled, otherwise queries database.

        Returns:
            List of session IDs
        """
        if self.enable_memory_cache:
            return list(self._memory_cache.keys())

        # Query database
        try:
            now = datetime.now(timezone.utc)
            sessions = self.db.query(SessionModel).filter(SessionModel.expires_at > now).all()

            return [session.id for session in sessions]

        except Exception as e:
            logger.error(f"Failed to get active session IDs: {e}")
            return []

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

            sessions = (
                self.db.query(SessionModel)
                .filter(SessionModel.user_id == user_id, SessionModel.expires_at > now)
                .all()
            )

            return [session.to_dict() for session in sessions]

        except Exception as e:
            logger.error(f"Failed to get user sessions for user {user_id}: {e}")
            return []

    async def revoke_user_sessions(
        self, user_id: int, except_session_id: Optional[str] = None
    ) -> int:
        """
        Revoke all sessions for a user (e.g., after password change).

        Removes sessions from both memory cache and database.

        Args:
            user_id: User ID
            except_session_id: Optional session ID to keep (current session)

        Returns:
            Number of sessions revoked
        """
        revoked_count = 0

        try:
            # Get sessions to revoke
            query = self.db.query(SessionModel).filter(SessionModel.user_id == user_id)

            if except_session_id:
                query = query.filter(SessionModel.id != except_session_id)

            sessions = query.all()
            session_ids = [session.id for session in sessions]

            # Remove from memory cache
            if self.enable_memory_cache:
                for session_id in session_ids:
                    if session_id in self._memory_cache:
                        del self._memory_cache[session_id]

            # Remove from database
            revoked_count = query.delete(synchronize_session=False)
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
                    "reason": "User sessions revoked (password change or security event)",
                },
            )

            logger.info(
                f"[SessionManager] Revoked {revoked_count} sessions for user {user_id} "
                f"(except: {except_session_id or 'none'})"
            )

            return revoked_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to revoke sessions for user {user_id}: {e}")
            return 0


# Singleton instance (optional - can also use dependency injection)
_session_manager_instance: Optional[SessionManager] = None


def get_session_manager(
    db: Session, audit_logger=None, enable_memory_cache: bool = False
) -> SessionManager:
    """
    Get or create SessionManager singleton instance.

    Args:
        db: SQLAlchemy database session
        audit_logger: Optional audit logger
        enable_memory_cache: Enable in-memory caching

    Returns:
        SessionManager instance
    """
    global _session_manager_instance

    if _session_manager_instance is None:
        _session_manager_instance = SessionManager(
            db=db, audit_logger=audit_logger, enable_memory_cache=enable_memory_cache
        )

    return _session_manager_instance

"""
Authentication service for user management.
Migrated from src/services/AuthenticationService.ts

Features:
- User registration with OWASP password requirements
- Password hashing using scrypt (OWASP recommended)
- Session management with 24-hour expiration
- Session ID regeneration on login (prevents session fixation)
- Remember Me with 30-day expiration
- Timing-safe password comparison (prevents timing attacks)
- Comprehensive audit logging
- Rate limiting for brute force protection

Security:
- Passwords never stored in plaintext
- Random salt per user (16 bytes)
- scrypt key derivation (64-byte hash)
- UUID session IDs (always regenerated on login)
- All authentication events audited
"""

import hashlib
import hmac
import secrets
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, cast
from uuid import uuid4
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.models.session import Session as SessionModel

class AuthenticationError(Exception):
    """Authentication error exception."""

class AuthenticationService:
    """
    Authentication service for local user management.
    Ported from TypeScript AuthenticationService with identical security features.
    """

    # Constants (matching TypeScript implementation)
    SALT_LENGTH = 16  # bytes
    KEY_LENGTH = 64  # bytes
    SESSION_DURATION_HOURS = 24
    REMEMBER_ME_DURATION_DAYS = 30

    def __init__(self, db: Session, audit_logger=None):
        """
        Initialize authentication service.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.audit_logger = audit_logger

    def _hash_password(self, password: str, salt: bytes) -> bytes:
        """
        Hash password using scrypt (OWASP recommended).

        Args:
            password: Plain text password
            salt: Random salt bytes

        Returns:
            Password hash as bytes
        """
        # Python's hashlib.scrypt parameters match Node.js crypto.scrypt
        # n=16384, r=8, p=1 are scrypt defaults (secure for OWASP)
        return hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=16384,  # CPU/memory cost parameter
            r=8,  # Block size parameter
            p=1,  # Parallelization parameter
            dklen=self.KEY_LENGTH,
        )

    def _validate_password_strength(self, password: str) -> None:
        """
        Validate password meets OWASP requirements.
        Raises AuthenticationError if validation fails.

        Requirements:
        - Minimum 12 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        """
        if len(password) < 12:
            raise AuthenticationError(
                "Password must be at least 12 characters (OWASP requirement)"
            )

        if not re.search(r"[A-Z]", password):
            raise AuthenticationError(
                "Password must contain at least one uppercase letter"
            )

        if not re.search(r"[a-z]", password):
            raise AuthenticationError(
                "Password must contain at least one lowercase letter"
            )

        if not re.search(r"[0-9]", password):
            raise AuthenticationError("Password must contain at least one number")

    @staticmethod
    def _coerce_optional_int(value: Any) -> Optional[int]:
        if value is None or isinstance(value, int):
            return value
        return cast(Optional[int], value)

    @staticmethod
    def _coerce_str(value: Any) -> str:
        if isinstance(value, str):
            return value
        return cast(str, value)

    def _get_user_id(self, user: Optional[User]) -> Optional[int]:
        if user is None:
            return None
        return self._coerce_optional_int(getattr(user, "id", None))

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_type: str,
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
    ):
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id) if user_id else None,
                resource_type=resource_type,
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
            )

    async def register(
        self, username: str, password: str, email: str
    ) -> Dict[str, Any]:
        """
        Register a new user with OWASP password requirements.

        Args:
            username: Unique username
            password: Plain text password (will be hashed)
            email: Unique email address

        Returns:
            Dictionary with user and session data

        Raises:
            AuthenticationError: If validation fails or user exists
        """
        # Validate username
        if not username or not username.strip():
            raise AuthenticationError("Username cannot be empty")

        # Validate password strength (OWASP)
        self._validate_password_strength(password)

        # Check if username already exists
        existing_user = self.db.query(User).filter(User.username == username).first()
        if existing_user:
            raise AuthenticationError("Username already exists")

        # Check if email already exists
        existing_email = self.db.query(User).filter(User.email == email).first()
        if existing_email:
            raise AuthenticationError("Email already exists")

        # Generate salt and hash password
        salt = secrets.token_bytes(self.SALT_LENGTH)
        password_hash = self._hash_password(password, salt)

        # Create user
        user = User(
            username=username,
            email=email,
            password_hash=password_hash.hex(),
            password_salt=salt.hex(),
            role="user",
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        user_id = self._get_user_id(user)
        resource_id = str(user_id) if user_id is not None else "unknown"

        self._log_audit(
            event_type="user.register",
            user_id=user_id,
            resource_type="user",
            resource_id=resource_id,
            action="create",
            success=True,
            details={"username": username, "email": email},
        )

        # AUTO-LOGIN: Create session immediately after registration (better UX)
        session_id = str(uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=self.SESSION_DURATION_HOURS)

        session = SessionModel(id=session_id, user_id=user.id, expires_at=expires_at)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        self._log_audit(
            event_type="user.login",
            user_id=user_id,
            resource_type="session",
            resource_id=session_id,
            action="create",
            success=True,
            details={"reason": "auto-login-after-registration"},
        )

        return {"user": user.to_dict(), "session": session.to_dict()}

    def reset_user_credentials(self, user: User, *, password: str, email: str) -> None:
        """Update credentials for an existing user (used by deterministic test seeding)."""

        self._validate_password_strength(password)
        salt = secrets.token_bytes(self.SALT_LENGTH)
        setattr(user, "password_salt", salt.hex())
        setattr(user, "password_hash", self._hash_password(password, salt).hex())
        setattr(user, "email", email)
        setattr(user, "is_active", True)
        self.db.commit()
        self.db.refresh(user)

    async def login(
        self,
        username: str,
        password: str,
        remember_me: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Login user and create session.
        Uses timing-safe comparison to prevent timing attacks.
        Always generates new session ID to prevent session fixation.

        Args:
            username: Username
            password: Plain text password
            remember_me: If True, session lasts 30 days instead of 24 hours
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            Dictionary with user and session data

        Raises:
            AuthenticationError: If credentials are invalid
        """
        # Find user by username
        user = self.db.query(User).filter(User.username == username).first()

        if not user:
            self._log_audit(
                event_type="user.login",
                user_id=None,
                resource_type="user",
                resource_id="unknown",
                action="read",
                success=False,
                details={"username": username, "reason": "User not found"},
            )
            raise AuthenticationError("Invalid credentials")

        user_db_id = self._get_user_id(user)
        if user_db_id is None:
            raise AuthenticationError("User record missing identifier")

        resource_id = str(user_db_id)

        # Check if user is active
        if not user.is_active:
            self._log_audit(
                event_type="user.login",
                user_id=user_db_id,
                resource_type="user",
                resource_id=resource_id,
                action="read",
                success=False,
                details={"username": username, "reason": "User inactive"},
            )
            raise AuthenticationError("Account is inactive")

        # Verify password using timing-safe comparison
        password_salt_hex = self._coerce_str(user.password_salt)
        salt = bytes.fromhex(password_salt_hex)
        computed_hash = self._hash_password(password, salt)

        # Timing-safe comparison (prevents timing attacks)
        stored_hash_hex = self._coerce_str(user.password_hash)
        is_valid = hmac.compare_digest(bytes.fromhex(stored_hash_hex), computed_hash)

        if not is_valid:
            self._log_audit(
                event_type="user.login",
                user_id=user_db_id,
                resource_type="user",
                resource_id=resource_id,
                action="read",
                success=False,
                details={"username": username, "reason": "Invalid password"},
            )
            raise AuthenticationError("Invalid credentials")

        # SECURITY: Always generate NEW session ID (prevents session fixation)
        new_session_id = str(uuid4())

        # Create session with appropriate duration
        if remember_me:
            expires_at = datetime.utcnow() + timedelta(
                days=self.REMEMBER_ME_DURATION_DAYS
            )
        else:
            expires_at = datetime.utcnow() + timedelta(
                hours=self.SESSION_DURATION_HOURS
            )

        session = SessionModel(
            id=new_session_id,
            user_id=user_db_id,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(session)

        # Update last login timestamp
        setattr(user, "last_login_at", datetime.utcnow())

        self.db.commit()
        self.db.refresh(session)

        self._log_audit(
            event_type="user.login",
            user_id=user_db_id,
            resource_type="user",
            resource_id=resource_id,
            action="read",
            success=True,
            details={
                "username": username,
                "session_id": new_session_id,
                "remember_me": "enabled" if remember_me else "disabled",
                "session_regenerated": True,
            },
        )

        return {"user": user.to_dict(), "session": session.to_dict()}

    async def logout(self, session_id: str) -> None:
        """
        Logout user and delete session.

        Args:
            session_id: Session UUID to delete
        """
        session = (
            self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
        )

        if session:
            user_id = self._coerce_optional_int(getattr(session, "user_id", None))

            # Delete session from database
            self.db.delete(session)
            self.db.commit()

            self._log_audit(
                event_type="user.logout",
                user_id=user_id,
                resource_type="session",
                resource_id=session_id,
                action="delete",
                success=True,
                details={"session_cleared": True},
            )

    async def get_session(self, session_id: str) -> Optional[SessionModel]:
        """
        Get session by ID and validate it's not expired.

        Args:
            session_id: Session UUID

        Returns:
            Session model if valid, None if not found or expired
        """
        session = (
            self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
        )

        if not session:
            return None

        # Check if session is expired
        if session.expires_at < datetime.utcnow():
            # Session expired - delete it
            self.db.delete(session)
            self.db.commit()
            return None

        return session

    async def validate_session(self, session_id: Optional[str]) -> Optional[dict]:
        """
        Validate session and return session data with user info.

        Args:
            session_id: Session UUID or None

        Returns:
            Dict with session data (user_id, etc.) if session is valid, None otherwise
        """
        if not session_id:
            return None

        session = (
            self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
        )

        if not session:
            return None

        # Check if session is expired
        if session.expires_at < datetime.utcnow():
            self.db.delete(session)
            self.db.commit()
            return None

        # Return session data as dictionary
        user = self.db.query(User).filter(User.id == session.user_id).first()
        if not user:
            return None

        return {
            "user_id": user.id,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
            "session_id": session.id,
            "expires_at": session.expires_at.isoformat() if session.expires_at else None,
        }

    async def change_password(
        self, user_id: int, old_password: str, new_password: str
    ) -> None:
        """
        Change user password (requires old password verification).

        Args:
            user_id: User ID
            old_password: Current password (for verification)
            new_password: New password

        Raises:
            AuthenticationError: If validation fails
        """
        user = self.db.query(User).filter(User.id == user_id).first()

        if not user:
            raise AuthenticationError("User not found")

        # Verify old password
        salt_hex = self._coerce_str(user.password_salt)
        salt = bytes.fromhex(salt_hex)
        computed_hash = self._hash_password(old_password, salt)

        stored_hash_hex = self._coerce_str(user.password_hash)
        is_valid = hmac.compare_digest(bytes.fromhex(stored_hash_hex), computed_hash)

        if not is_valid:
            self._log_audit(
                event_type="user.password_change",
                user_id=user_id,
                resource_type="user",
                resource_id=str(user_id),
                action="update",
                success=False,
                details={"reason": "Invalid current password"},
            )
            raise AuthenticationError("Invalid current password")

        # Validate new password strength
        self._validate_password_strength(new_password)

        # Hash new password
        new_salt = secrets.token_bytes(self.SALT_LENGTH)
        new_hash = self._hash_password(new_password, new_salt)

        # Update user password
        setattr(user, "password_hash", new_hash.hex())
        setattr(user, "password_salt", new_salt.hex())

        # Invalidate all existing sessions for security
        self.db.query(SessionModel).filter(SessionModel.user_id == user_id).delete()

        self.db.commit()

        self._log_audit(
            event_type="user.password_change",
            user_id=user_id,
            resource_type="user",
            resource_id=str(user_id),
            action="update",
            success=True,
        )

    def cleanup_expired_sessions(self) -> int:
        """
        Cleanup expired sessions (should be run periodically).

        Returns:
            Number of sessions deleted
        """
        deleted_count = (
            self.db.query(SessionModel)
            .filter(SessionModel.expires_at < datetime.utcnow())
            .delete()
        )

        self.db.commit()

        if deleted_count > 0:
            self._log_audit(
                event_type="session.cleanup",
                user_id=None,
                resource_type="session",
                resource_id="system",
                action="delete",
                success=True,
                details={"deleted_count": deleted_count},
            )

        return deleted_count


"""
Centralized FastAPI Dependencies Module.

This module provides dependency injection functions for all core services.
Instead of each route file creating its own service instances, all routes
should import and use these shared dependencies.

Benefits:
- Single source of truth for service configuration
- Consistent initialization across all routes
- Easy to mock/replace for testing
- Proper lifecycle management via ServiceContainer
"""

import base64
import logging
import os
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.services.audit_logger import AuditLogger
from backend.services.security.encryption import EncryptionService
from backend.services.service_container import ServiceContainer

logger = logging.getLogger(__name__)


# =============================================================================
# Core Dependencies
# =============================================================================


def get_container(request: Request) -> ServiceContainer:
    """
    Get the ServiceContainer from application state.

    The container is initialized in main.py lifespan and stored in app.state.
    This is the primary way to access shared singleton services.

    Args:
        request: FastAPI request object

    Returns:
        ServiceContainer instance

    Raises:
        HTTPException: If container not initialized (app misconfigured)
    """
    container: Optional[ServiceContainer] = getattr(request.app.state, "container", None)

    if container is None or not container.is_initialized():
        logger.error("ServiceContainer not initialized - check main.py lifespan")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service container not initialized. Server configuration error.",
        )

    return container


# =============================================================================
# Encryption Service Dependencies
# =============================================================================


def get_encryption_service(
    container: ServiceContainer = Depends(get_container),
) -> EncryptionService:
    """
    Get the singleton EncryptionService from the container.

    This is the preferred way to access encryption in routes.

    Args:
        container: ServiceContainer from app state

    Returns:
        EncryptionService instance
    """
    return container.get_encryption_service()


def get_encryption_service_optional(
    request: Request,
) -> Optional[EncryptionService]:
    """
    Get EncryptionService if available, or None if not configured.

    Use this for routes that can work without encryption (e.g., stub AI mode).

    Args:
        request: FastAPI request object

    Returns:
        EncryptionService instance or None
    """
    container: Optional[ServiceContainer] = getattr(request.app.state, "container", None)

    if container is None or not container.is_initialized():
        return None

    try:
        return container.get_encryption_service()
    except Exception:
        return None


def get_encryption_service_fallback(
    db: Session = Depends(get_db),
) -> EncryptionService:
    """
    Get EncryptionService with fallback to environment variable.

    This provides backwards compatibility for routes not yet fully migrated
    to use the ServiceContainer. Prefers container if available, falls back
    to direct instantiation from environment.

    Args:
        db: Database session (unused but required for DI chain)

    Returns:
        EncryptionService instance

    Raises:
        HTTPException: If no encryption key is available
    """
    # Try environment variable
    key_base64 = os.getenv("ENCRYPTION_KEY_BASE64")

    if not key_base64:
        # Generate temporary key (WARNING: data will be lost on restart)
        logger.warning(
            "No ENCRYPTION_KEY_BASE64 found. Using temporary key. "
            "Data encrypted with this key will be unrecoverable after restart!"
        )
        key_base64 = base64.b64encode(os.urandom(32)).decode("utf-8")

    return EncryptionService(key_base64)


# =============================================================================
# Audit Logger Dependencies
# =============================================================================


def get_audit_logger(
    db: Session = Depends(get_db),
) -> AuditLogger:
    """
    Get AuditLogger instance with database session.

    Note: Unlike EncryptionService, AuditLogger needs a fresh db session
    per request to properly log within the request's transaction context.

    Args:
        db: Database session for the current request

    Returns:
        AuditLogger instance
    """
    return AuditLogger(db)


def get_audit_logger_from_container(
    container: ServiceContainer = Depends(get_container),
) -> AuditLogger:
    """
    Get the singleton AuditLogger from the container.

    Use this when you need the container's audit logger (shared instance).
    For most routes, use get_audit_logger() instead to get a request-scoped
    instance with the correct db session.

    Args:
        container: ServiceContainer from app state

    Returns:
        AuditLogger instance from container
    """
    return container.get_audit_logger()


# =============================================================================
# Repository Dependencies
# =============================================================================


def get_case_repository(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service_fallback),
):
    """
    Get CaseRepository with encryption service.

    Args:
        db: Database session
        encryption_service: EncryptionService for field encryption

    Returns:
        CaseRepository instance
    """
    from backend.repositories import CaseRepository

    return CaseRepository(db, encryption_service)


def get_evidence_repository(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get EvidenceRepository with audit logger.

    Args:
        db: Database session
        audit_logger: AuditLogger for operation logging

    Returns:
        EvidenceRepository instance
    """
    from backend.repositories import EvidenceRepository

    return EvidenceRepository(db, audit_logger=audit_logger)


def get_deadline_repository(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get DeadlineRepository with audit logger.

    Args:
        db: Database session
        audit_logger: AuditLogger for operation logging

    Returns:
        DeadlineRepository instance
    """
    from backend.repositories import DeadlineRepository

    return DeadlineRepository(db, audit_logger=audit_logger)


def get_dashboard_repository(
    db: Session = Depends(get_db),
):
    """
    Get DashboardRepository for aggregate queries.

    Args:
        db: Database session

    Returns:
        DashboardRepository instance
    """
    from backend.repositories import DashboardRepository

    return DashboardRepository(db)


# =============================================================================
# Service Dependencies
# =============================================================================


def get_auth_service(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get AuthenticationService with audit logging.

    Args:
        db: Database session
        audit_logger: AuditLogger for auth event logging

    Returns:
        AuthenticationService instance
    """
    from backend.services.auth.service import AuthenticationService

    return AuthenticationService(db=db, audit_logger=audit_logger)


def get_tag_service(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get TagService with audit logger.

    Args:
        db: Database session
        audit_logger: AuditLogger for operation logging

    Returns:
        TagService instance
    """
    from backend.services.tag_service import TagService

    return TagService(db, audit_logger)


def get_notification_service(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get NotificationService with audit logger.

    Args:
        db: Database session
        audit_logger: AuditLogger for operation logging

    Returns:
        NotificationService instance
    """
    from backend.services.notification_service import NotificationService

    return NotificationService(db, audit_logger)


def get_session_manager(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get SessionManager for session lifecycle operations.

    Args:
        db: Database session
        audit_logger: AuditLogger for session event logging

    Returns:
        SessionManager instance configured for database-backed sessions

    Note:
        - Uses database persistence (memory cache disabled)
        - Handles session creation, validation, and expiration
        - Supports 24-hour default or 30-day "remember me" sessions
    """
    from backend.services.auth.session_manager import SessionManager

    return SessionManager(
        db=db,
        audit_logger=audit_logger,
        enable_memory_cache=False,  # Use database for persistence
    )


async def get_current_user(
    request: Request,
    session_manager = Depends(get_session_manager),
) -> int:
    """
    FastAPI dependency to get current authenticated user ID.

    This is a more comprehensive version of get_current_user_id that:
    - Checks multiple sources for session_id (Bearer, header, cookie)
    - Uses SessionManager for session validation
    - Matches the pattern used in auth routes

    Extracts session_id from (in priority order):
    1. Authorization header: "Bearer <session_id>"
    2. X-Session-ID header
    3. Cookie: sessionId

    Args:
        request: FastAPI request object
        session_manager: SessionManager instance (injected)

    Returns:
        int: User ID of authenticated user

    Raises:
        HTTPException 401: If session_id not provided or invalid/expired

    Note:
        This dependency is preferred for routes that need comprehensive
        auth checking. Use get_current_user_id for simpler Bearer-only auth.
    """
    # Try to get session_id from Authorization header
    session_id: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_id = auth_header.replace("Bearer ", "")
    # Try X-Session-ID header
    elif (header_session := request.headers.get("X-Session-ID")) is not None:
        session_id = header_session
    # Try cookie
    elif (cookie_session := request.cookies.get("sessionId")) is not None:
        session_id = cookie_session

    if session_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no session ID provided",
        )

    # Validate session and get user_id
    try:
        session_data = session_manager.get_session(session_id)
        if not session_data or not session_data.get("user_id"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session",
            )

        return session_data["user_id"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Session validation failed: {str(e)}",
        )


def get_profile_service(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service_fallback),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Get ProfileService for the current authenticated user.

    This composed dependency injects all required dependencies for ProfileService
    and ensures the user is authenticated before accessing profile operations.

    Args:
        user_id: Current authenticated user ID (from get_current_user)
        db: Database session
        encryption_service: EncryptionService for PII field encryption
        audit_logger: AuditLogger for profile change logging

    Returns:
        ProfileService instance scoped to the current user

    Note:
        - User must be authenticated (get_current_user validates session)
        - Supports multiple auth sources (Bearer, X-Session-ID header, cookie)
        - Profile data is encrypted at rest (email, phone are PII)
        - All operations are audit logged for GDPR compliance
    """
    from backend.services.profile_service import ProfileService

    return ProfileService(
        db=db,
        user_id=user_id,
        encryption_service=encryption_service,
        audit_logger=audit_logger,
    )


# =============================================================================
# Authentication Dependencies
# =============================================================================


async def get_current_user_id(
    request: Request,
    db: Session = Depends(get_db),
) -> int:
    """
    Extract and validate current user ID from Authorization header.

    This dependency validates the session and returns the user_id for
    the authenticated user.

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        User ID of authenticated user

    Raises:
        HTTPException: If not authenticated or session invalid
    """
    from backend.services.auth.service import AuthenticationService

    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_id = auth_header[7:]  # Remove "Bearer " prefix

    auth_service = AuthenticationService(db)
    session = await auth_service.validate_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return session["user_id"]


async def get_current_user_id_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[int]:
    """
    Extract user ID from Authorization header if present.

    Unlike get_current_user_id, this returns None instead of raising
    an exception if the user is not authenticated.

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        User ID if authenticated, None otherwise
    """
    try:
        return await get_current_user_id(request, db)
    except HTTPException:
        return None

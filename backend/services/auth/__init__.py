"""
Authentication & Authorization Module

This module provides:
- AuthenticationService: User authentication (login, register, tokens)
- AuthorizationService: Permission and role management
- SessionManager: Session lifecycle management
- SessionPersistenceService: Session storage and retrieval
"""

from .service import AuthenticationService

# Alias for backward compatibility
AuthService = AuthenticationService

__all__ = [
    "AuthenticationService",
    "AuthenticationError",
    "AuthService",
    "AuthorizationService",
    "SessionManager",
    "SessionPersistenceService",
]

"""
API routes for Justice Companion backend.
"""

from backend.routes.auth import router as auth_router
from backend.routes.gdpr import router as gdpr_router
from backend.routes.search import router as search_router

__all__ = ["auth_router", "gdpr_router", "search_router"]

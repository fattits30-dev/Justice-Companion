"""
Repositories for data access layer.

This module provides the repository pattern for database access,
separating data access logic from business logic in routes/services.

Available repositories:
- BaseRepository: Abstract base class with common CRUD operations
- CaseRepository: Case management with encryption support
- CaseFactRepository: Case facts with encryption support
- EvidenceRepository: Evidence records with file management
- DeadlineRepository: Deadline tracking with status management
- DashboardRepository: Aggregate queries for dashboard widgets
"""

from backend.repositories.base import BaseRepository
from backend.repositories.case_fact_repository import CaseFactRepository
from backend.repositories.case_repository import CaseRepository
from backend.repositories.dashboard_repository import DashboardRepository
from backend.repositories.deadline_repository import DeadlineRepository
from backend.repositories.evidence_repository import EvidenceRepository

__all__ = [
    "BaseRepository",
    "CaseRepository",
    "CaseFactRepository",
    "EvidenceRepository",
    "DeadlineRepository",
    "DashboardRepository",
]

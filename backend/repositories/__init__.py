"""
Repositories for data access layer.

This module provides the repository pattern for database access,
separating data access logic from business logic in routes/services.

Available repositories:
- BaseRepository: Abstract base class with common CRUD operations
- CaseRepository: Case management with encryption support
- EvidenceRepository: Evidence records with file management
- DeadlineRepository: Deadline tracking with status management
- DashboardRepository: Aggregate queries for dashboard widgets
"""


__all__ = [
    "BaseRepository",
    "CaseRepository",
    "EvidenceRepository",
    "DeadlineRepository",
    "DashboardRepository",
]

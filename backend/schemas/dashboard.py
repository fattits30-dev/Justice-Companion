"""
Dashboard schemas - Pydantic models for dashboard API operations.

Single source of truth for dashboard-related response types.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ===== WIDGET DATA MODELS =====


class RecentCaseInfo(BaseModel):
    """Information about a recently updated case."""

    id: int
    title: str
    status: str
    priority: Optional[str] = None
    lastUpdated: str  # ISO 8601 timestamp

    model_config = ConfigDict(from_attributes=True)


class UpcomingDeadline(BaseModel):
    """Upcoming deadline information."""

    id: int
    title: str
    deadlineDate: str
    priority: str
    daysUntil: int
    isOverdue: bool
    caseId: Optional[int] = None
    caseTitle: Optional[str] = None


class ActivityItem(BaseModel):
    """Activity item information."""

    id: int
    type: str  # "case", "evidence", "deadline", "notification"
    action: str  # "created", "updated", "deleted"
    title: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


class ChartDataPoint(BaseModel):
    """Single data point for charts."""

    label: str
    value: int
    color: Optional[str] = None


class TimelineChartDataPoint(BaseModel):
    """Timeline chart data point."""

    date: str  # YYYY-MM-DD
    count: int


# ===== RESPONSE SCHEMAS =====


class DashboardStatsResponse(BaseModel):
    """
    Dashboard statistics response model.

    Provides overview metrics for the authenticated user:
    - Total number of cases
    - Number of active cases
    - Number of closed cases
    - Total evidence items across all cases
    - Total deadlines count
    - Overdue deadlines count
    - Unread notifications count
    """

    totalCases: int = Field(..., description="Total number of cases for user")
    activeCases: int = Field(..., description="Number of active cases")
    closedCases: int = Field(..., description="Number of closed cases")
    totalEvidence: int = Field(..., description="Total evidence items across all cases")
    totalDeadlines: int = Field(..., description="Total deadlines")
    overdueDeadlines: int = Field(..., description="Overdue deadlines count")
    unreadNotifications: int = Field(..., description="Unread notifications count")

    model_config = ConfigDict(from_attributes=True)


class RecentCasesResponse(BaseModel):
    """Recent cases widget response."""

    cases: List[RecentCaseInfo] = Field(..., description="Recent cases")
    total: int = Field(..., description="Total cases count")


class NotificationWidgetResponse(BaseModel):
    """Notifications widget response."""

    unreadCount: int = Field(..., description="Unread notifications count")
    recentNotifications: List[Dict[str, Any]] = Field(..., description="Recent notifications")


class DeadlinesWidgetResponse(BaseModel):
    """Deadlines widget response."""

    upcomingDeadlines: List[UpcomingDeadline] = Field(..., description="Upcoming deadlines")
    totalDeadlines: int = Field(..., description="Total upcoming deadlines")
    overdueCount: int = Field(..., description="Overdue deadlines count")


class ActivityWidgetResponse(BaseModel):
    """Activity widget response."""

    activities: List[ActivityItem] = Field(..., description="Recent activities")
    total: int = Field(..., description="Total activities count")


class ChartResponse(BaseModel):
    """Generic chart response."""

    data: List[ChartDataPoint] = Field(..., description="Chart data points")
    total: int = Field(..., description="Total count")


class TimelineChartResponse(BaseModel):
    """Timeline chart response."""

    data: List[TimelineChartDataPoint] = Field(..., description="Timeline data points")
    startDate: str = Field(..., description="Start date (YYYY-MM-DD)")
    endDate: str = Field(..., description="End date (YYYY-MM-DD)")


class DashboardOverviewResponse(BaseModel):
    """Complete dashboard overview with all widgets."""

    stats: DashboardStatsResponse
    recentCases: RecentCasesResponse
    notifications: NotificationWidgetResponse
    deadlines: DeadlinesWidgetResponse
    activity: ActivityWidgetResponse

"""
Dashboard routes for Justice Companion.
Migrated from electron/ipc-handlers/dashboard.ts

REFACTORED: Now uses service layer instead of direct database queries.

Routes:
- GET /dashboard - Get complete dashboard overview (all widgets)
- GET /dashboard/stats - Get statistics widget
- GET /dashboard/recent-cases - Get recent cases widget
- GET /dashboard/notifications - Get notifications widget
- GET /dashboard/deadlines - Get upcoming deadlines widget
- GET /dashboard/activity - Get recent activity widget
- GET /dashboard/charts/cases-by-status - Case status distribution chart
- GET /dashboard/charts/cases-by-priority - Case priority distribution chart
- GET /dashboard/charts/cases-timeline - Cases created timeline (last 30 days)

Services Integrated:
- CaseService: Case management with statistics
- NotificationService: Notification counts and recent notifications
- DeadlineReminderScheduler: Upcoming deadlines tracking
- SearchService: Activity search (optional)

SECURITY: All queries are filtered by user_id to prevent horizontal privilege escalation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
import base64

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.auth.service import AuthenticationService
from backend.services.case_service import CaseService
from backend.services.notification_service import (
    NotificationService,
    NotificationFilters,
)
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

# Import schemas from consolidated schema file
from backend.schemas.dashboard import (
    RecentCaseInfo,
    DashboardStatsResponse,
    RecentCasesResponse,
    NotificationWidgetResponse,
    UpcomingDeadline,
    DeadlinesWidgetResponse,
    ActivityItem,
    ActivityWidgetResponse,
    ChartDataPoint,
    ChartResponse,
    TimelineChartDataPoint,
    TimelineChartResponse,
    DashboardOverviewResponse,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ===== DEPENDENCY INJECTION =====

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)

def get_encryption_service() -> EncryptionService:
    """
    Get encryption service instance with encryption key.

    Priority:
    1. ENCRYPTION_KEY_BASE64 environment variable
    2. Generate temporary key (WARNING: data will be lost on restart)
    """
    key_base64 = os.getenv("ENCRYPTION_KEY_BASE64")

    if not key_base64:
        # WARNING: Generating temporary key - data will be lost on restart
        key = EncryptionService.generate_key()
        key_base64 = base64.b64encode(key).decode("utf-8")
        print("WARNING: No ENCRYPTION_KEY_BASE64 found. Using temporary key.")

    return EncryptionService(key_base64)

def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)

async def get_case_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> CaseService:
    """Get case service instance with dependencies injected."""
    return CaseService(db, encryption_service, audit_logger)

async def get_notification_service(
    db: Session = Depends(get_db), audit_logger: AuditLogger = Depends(get_audit_logger)
) -> NotificationService:
    """Get notification service instance with dependencies injected."""
    return NotificationService(db, audit_logger)

# ===== DASHBOARD ROUTES =====

@router.get("", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    notification_service: NotificationService = Depends(get_notification_service),
    db: Session = Depends(get_db),
):
    """
    Get complete dashboard overview with all widgets.

    Returns:
    - Statistics widget data
    - Recent cases widget data
    - Notifications widget data
    - Deadlines widget data
    - Activity widget data

    SECURITY: All data filtered by user_id.
    """
    try:
        # Fetch all dashboard components in parallel
        stats = await get_dashboard_stats_internal(user_id, case_service, notification_service, db)
        recent_cases = await get_recent_cases_internal(user_id, case_service)
        notifications = await get_notifications_widget_internal(user_id, notification_service)
        deadlines = await get_deadlines_widget_internal(user_id, db)
        activity = await get_activity_widget_internal(user_id, db)

        return DashboardOverviewResponse(
            stats=stats,
            recentCases=recent_cases,
            notifications=notifications,
            deadlines=deadlines,
            activity=activity,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard overview: {str(e)}",
        )

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    notification_service: NotificationService = Depends(get_notification_service),
    db: Session = Depends(get_db),
):
    """
    Get dashboard statistics for the authenticated user.

    Returns:
    - Total cases count
    - Active cases count
    - Closed cases count
    - Total evidence count (across all user's cases)
    - Total deadlines count
    - Overdue deadlines count
    - Unread notifications count

    SECURITY: All queries are filtered by user_id to prevent data leakage.
    """
    return await get_dashboard_stats_internal(user_id, case_service, notification_service, db)

async def get_dashboard_stats_internal(
    user_id: int, case_service: CaseService, notification_service: NotificationService, db: Session
) -> DashboardStatsResponse:
    """Internal method to get dashboard statistics."""
    try:
        # Get case statistics from CaseService
        case_stats = await case_service.get_case_statistics(user_id)
        total_cases = case_stats.get("total_cases", 0)
        status_counts = case_stats.get("status_counts", {})
        active_cases = status_counts.get("active", 0)
        closed_cases = status_counts.get("closed", 0)

        # Get total evidence count (filtered by user's cases only)
        # SECURITY: Only count evidence from cases owned by this user
        evidence_query = text(
            """
            SELECT COUNT(*) as count
            FROM evidence
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """
        )
        evidence_result = db.execute(evidence_query, {"user_id": user_id}).fetchone()
        total_evidence = evidence_result.count if evidence_result else 0

        # Get total deadlines count
        deadlines_query = text(
            """
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id AND deleted_at IS NULL
        """
        )
        deadlines_result = db.execute(deadlines_query, {"user_id": user_id}).fetchone()
        total_deadlines = deadlines_result.count if deadlines_result else 0

        # Get overdue deadlines count
        now = datetime.utcnow().isoformat()
        overdue_query = text(
            """
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id
              AND deleted_at IS NULL
              AND status != 'completed'
              AND deadline_date < :now
        """
        )
        overdue_result = db.execute(overdue_query, {"user_id": user_id, "now": now}).fetchone()
        overdue_deadlines = overdue_result.count if overdue_result else 0

        # Get unread notifications count from NotificationService
        unread_notifications = await notification_service.get_unread_count(user_id)

        return DashboardStatsResponse(
            totalCases=total_cases,
            activeCases=active_cases,
            closedCases=closed_cases,
            totalEvidence=total_evidence,
            totalDeadlines=total_deadlines,
            overdueDeadlines=overdue_deadlines,
            unreadNotifications=unread_notifications,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard statistics: {str(e)}",
        )

@router.get("/recent-cases", response_model=RecentCasesResponse)
async def get_recent_cases(
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    limit: int = Query(5, ge=1, le=20, description="Number of recent cases to return"),
):
    """
    Get recently updated cases for the authenticated user.

    Query Parameters:
    - limit: Number of cases to return (default: 5, max: 20)

    Returns:
    - List of recent cases with basic information
    - Total cases count

    SECURITY: Only returns cases owned by the authenticated user.
    """
    return await get_recent_cases_internal(user_id, case_service, limit)

async def get_recent_cases_internal(
    user_id: int, case_service: CaseService, limit: int = 5
) -> RecentCasesResponse:
    """Internal method to get recent cases."""
    try:
        # Get all cases from CaseService
        all_cases = await case_service.get_all_cases(user_id)

        # Sort by updated_at descending
        sorted_cases = sorted(
            all_cases, key=lambda c: c.updated_at if c.updated_at else c.created_at, reverse=True
        )

        # Take the first 'limit' cases
        recent_cases = sorted_cases[:limit]

        # Convert to RecentCaseInfo
        case_infos = []
        for case in recent_cases:
            case_infos.append(
                RecentCaseInfo(
                    id=case.id,
                    title=case.title,
                    status=case.status,
                    priority=None,  # Priority not in case model
                    lastUpdated=case.updated_at if case.updated_at else case.created_at,
                )
            )

        return RecentCasesResponse(cases=case_infos, total=len(all_cases))

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load recent cases: {str(e)}",
        )

@router.get("/notifications", response_model=NotificationWidgetResponse)
async def get_notifications_widget(
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
    limit: int = Query(5, ge=1, le=20, description="Number of recent notifications to return"),
):
    """
    Get notifications widget data for the authenticated user.

    Query Parameters:
    - limit: Number of recent notifications to return (default: 5, max: 20)

    Returns:
    - Unread notifications count
    - Recent unread notifications (limited)

    SECURITY: Only returns notifications owned by the authenticated user.
    """
    return await get_notifications_widget_internal(user_id, notification_service, limit)

async def get_notifications_widget_internal(
    user_id: int, notification_service: NotificationService, limit: int = 5
) -> NotificationWidgetResponse:
    """Internal method to get notifications widget data."""
    try:
        # Get unread count
        unread_count = await notification_service.get_unread_count(user_id)

        # Get recent unread notifications
        filters = NotificationFilters(unread_only=True, limit=limit)
        notifications = await notification_service.get_notifications(user_id, filters)

        # Convert to dict format
        recent_notifications = []
        for notif in notifications:
            recent_notifications.append(
                {
                    "id": notif.id,
                    "type": notif.type,
                    "severity": notif.severity,
                    "title": notif.title,
                    "message": notif.message,
                    "createdAt": notif.created_at.isoformat() if notif.created_at else None,
                }
            )

        return NotificationWidgetResponse(
            unreadCount=unread_count, recentNotifications=recent_notifications
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load notifications widget: {str(e)}",
        )

@router.get("/deadlines", response_model=DeadlinesWidgetResponse)
async def get_deadlines_widget(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=20, description="Number of upcoming deadlines to return"),
):
    """
    Get upcoming deadlines widget data for the authenticated user.

    Query Parameters:
    - limit: Number of upcoming deadlines to return (default: 10, max: 20)

    Returns:
    - Upcoming deadlines (sorted by date)
    - Total upcoming deadlines count
    - Overdue deadlines count

    SECURITY: Only returns deadlines owned by the authenticated user.
    """
    return await get_deadlines_widget_internal(user_id, db, limit)

async def get_deadlines_widget_internal(
    user_id: int, db: Session, limit: int = 10
) -> DeadlinesWidgetResponse:
    """Internal method to get deadlines widget data."""
    try:
        now = datetime.utcnow()

        # Get upcoming deadlines (not completed, not deleted)
        deadlines_query = text(
            """
            SELECT
                d.id,
                d.title,
                d.deadline_date,
                d.priority,
                d.case_id,
                c.title as case_title
            FROM deadlines d
            LEFT JOIN cases c ON d.case_id = c.id
            WHERE d.user_id = :user_id
              AND d.status != 'completed'
              AND d.deleted_at IS NULL
            ORDER BY d.deadline_date ASC
            LIMIT :limit
        """
        )

        deadlines_results = db.execute(
            deadlines_query, {"user_id": user_id, "limit": limit}
        ).fetchall()

        upcoming_deadlines = []
        overdue_count = 0

        for row in deadlines_results:
            deadline_date_str = row.deadline_date
            try:
                deadline_date = datetime.fromisoformat(deadline_date_str.replace("Z", "+00:00"))
                days_until = (deadline_date - now).days
                is_overdue = deadline_date < now

                if is_overdue:
                    overdue_count += 1

                upcoming_deadlines.append(
                    UpcomingDeadline(
                        id=row.id,
                        title=row.title,
                        deadlineDate=deadline_date_str,
                        priority=row.priority,
                        daysUntil=days_until,
                        isOverdue=is_overdue,
                        caseId=row.case_id,
                        caseTitle=row.case_title,
                    )
                )
            except (ValueError, AttributeError):
                # Skip deadlines with invalid dates
                continue

        # Get total upcoming deadlines count
        total_query = text(
            """
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id
              AND status != 'completed'
              AND deleted_at IS NULL
        """
        )
        total_result = db.execute(total_query, {"user_id": user_id}).fetchone()
        total_deadlines = total_result.count if total_result else 0

        return DeadlinesWidgetResponse(
            upcomingDeadlines=upcoming_deadlines,
            totalDeadlines=total_deadlines,
            overdueCount=overdue_count,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load deadlines widget: {str(e)}",
        )

@router.get("/activity", response_model=ActivityWidgetResponse)
async def get_activity_widget(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50, description="Number of recent activities to return"),
):
    """
    Get recent activity widget data for the authenticated user.

    Query Parameters:
    - limit: Number of recent activities to return (default: 10, max: 50)

    Returns:
    - Recent activities across all entities (cases, evidence, deadlines)
    - Total activities count

    SECURITY: Only returns activities for resources owned by the authenticated user.
    """
    return await get_activity_widget_internal(user_id, db, limit)

async def get_activity_widget_internal(
    user_id: int, db: Session, limit: int = 10
) -> ActivityWidgetResponse:
    """Internal method to get activity widget data."""
    try:
        activities = []

        # Get recent case updates
        cases_query = text(
            """
            SELECT
                id,
                'case' as type,
                title,
                updated_at,
                status
            FROM cases
            WHERE user_id = :user_id
            ORDER BY updated_at DESC
            LIMIT 20
        """
        )
        case_results = db.execute(cases_query, {"user_id": user_id}).fetchall()

        for row in case_results:
            activities.append(
                {
                    "id": row.id,
                    "type": "case",
                    "action": "updated",
                    "title": row.title,
                    "timestamp": row.updated_at,
                    "metadata": {"status": row.status},
                }
            )

        # Get recent evidence uploads
        evidence_query = text(
            """
            SELECT
                e.id,
                'evidence' as type,
                e.title,
                e.created_at,
                e.evidence_type,
                e.case_id,
                c.title as case_title
            FROM evidence e
            LEFT JOIN cases c ON e.case_id = c.id
            WHERE e.user_id = :user_id
            ORDER BY e.created_at DESC
            LIMIT 20
        """
        )
        evidence_results = db.execute(evidence_query, {"user_id": user_id}).fetchall()

        for row in evidence_results:
            activities.append(
                {
                    "id": row.id,
                    "type": "evidence",
                    "action": "uploaded",
                    "title": row.title,
                    "timestamp": row.created_at,
                    "metadata": {
                        "evidenceType": row.evidence_type,
                        "caseId": row.case_id,
                        "caseTitle": row.case_title,
                    },
                }
            )

        # Get recent deadline changes
        deadlines_query = text(
            """
            SELECT
                d.id,
                'deadline' as type,
                d.title,
                d.updated_at,
                d.status,
                d.case_id,
                c.title as case_title
            FROM deadlines d
            LEFT JOIN cases c ON d.case_id = c.id
            WHERE d.user_id = :user_id
              AND d.deleted_at IS NULL
            ORDER BY d.updated_at DESC
            LIMIT 20
        """
        )
        deadline_results = db.execute(deadlines_query, {"user_id": user_id}).fetchall()

        for row in deadline_results:
            activities.append(
                {
                    "id": row.id,
                    "type": "deadline",
                    "action": "updated",
                    "title": row.title,
                    "timestamp": row.updated_at,
                    "metadata": {
                        "status": row.status,
                        "caseId": row.case_id,
                        "caseTitle": row.case_title,
                    },
                }
            )

        # Sort all activities by timestamp descending
        sorted_activities = sorted(
            activities, key=lambda a: a["timestamp"] if a["timestamp"] else "", reverse=True
        )

        # Take the first 'limit' activities
        recent_activities = sorted_activities[:limit]

        # Convert to ActivityItem
        activity_items = []
        for activity in recent_activities:
            activity_items.append(
                ActivityItem(
                    id=activity["id"],
                    type=activity["type"],
                    action=activity["action"],
                    title=activity["title"],
                    timestamp=activity["timestamp"],
                    metadata=activity.get("metadata"),
                )
            )

        return ActivityWidgetResponse(activities=activity_items, total=len(sorted_activities))

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load activity widget: {str(e)}",
        )

# ===== CHART ENDPOINTS =====

@router.get("/charts/cases-by-status", response_model=ChartResponse)
async def get_cases_by_status_chart(
    user_id: int = Depends(get_current_user), case_service: CaseService = Depends(get_case_service)
):
    """
    Get case distribution by status for pie chart.

    Returns:
    - Data points with label (status), value (count), and color

    SECURITY: Only counts cases owned by the authenticated user.
    """
    try:
        # Get case statistics from CaseService
        case_stats = await case_service.get_case_statistics(user_id)
        status_counts = case_stats.get("status_counts", {})

        # Define colors for each status
        status_colors = {
            "active": "#10b981",  # green
            "closed": "#6b7280",  # gray
            "pending": "#f59e0b",  # amber
        }

        data_points = []
        total = 0

        for case_status, count in status_counts.items():
            if count > 0:
                data_points.append(
                    ChartDataPoint(
                        label=case_status.capitalize(),
                        value=count,
                        color=status_colors.get(case_status, "#3b82f6"),
                    )
                )
                total += count

        return ChartResponse(data=data_points, total=total)

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load cases by status chart: {str(e)}",
        )

@router.get("/charts/cases-by-priority", response_model=ChartResponse)
async def get_cases_by_priority_chart(
    user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get case distribution by priority for bar chart.

    NOTE: Priority is not in the current case model, so this returns empty data.
    This endpoint is a placeholder for future implementation.

    Returns:
    - Data points with label (priority), value (count), and color

    SECURITY: Only counts cases owned by the authenticated user.
    """
    try:
        # Priority not implemented in current case model
        # Return empty data for now
        return ChartResponse(data=[], total=0)

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load cases by priority chart: {str(e)}",
        )

@router.get("/charts/cases-timeline", response_model=TimelineChartResponse)
async def get_cases_timeline_chart(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=365, description="Number of days to include in timeline"),
):
    """
    Get cases created timeline for the last N days.

    Query Parameters:
    - days: Number of days to include (default: 30, max: 365)

    Returns:
    - Timeline data points with date and count
    - Start and end dates

    SECURITY: Only counts cases owned by the authenticated user.
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Query cases created in the date range
        timeline_query = text(
            """
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count
            FROM cases
            WHERE user_id = :user_id
              AND created_at >= :start_date
              AND created_at <= :end_date
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """
        )

        results = db.execute(
            timeline_query,
            {
                "user_id": user_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        ).fetchall()

        # Create data points
        data_points = []
        for row in results:
            data_points.append(TimelineChartDataPoint(date=row.date, count=row.count))

        return TimelineChartResponse(
            data=data_points,
            startDate=start_date.date().isoformat(),
            endDate=end_date.date().isoformat(),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load cases timeline chart: {str(e)}",
        )

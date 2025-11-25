"""
Comprehensive test suite for dashboard routes.
Tests all dashboard widgets and chart endpoints with service layer integration.

Coverage:
- Dashboard overview endpoint
- Statistics widget
- Recent cases widget
- Notifications widget
- Deadlines widget
- Activity widget
- Chart endpoints (status, priority, timeline)
- Error handling
- Authentication/authorization
- Service integration
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import datetime, timedelta
from fastapi import HTTPException

from backend.routes.dashboard import (
    get_dashboard_stats_internal,
    get_recent_cases_internal,
    get_notifications_widget_internal,
    get_deadlines_widget_internal,
    get_activity_widget_internal,
    DashboardStatsResponse,
    RecentCasesResponse,
    NotificationWidgetResponse,
    DeadlinesWidgetResponse,
    ActivityWidgetResponse,
    ChartResponse,
    TimelineChartResponse
)
from backend.services.case_service import CaseResponse

# ===== TEST FIXTURES =====

@pytest.fixture
def mock_db():
    """Mock database session."""
    db = Mock()
    db.execute = Mock()
    return db

@pytest.fixture
def mock_case_service():
    """Mock CaseService with common methods."""
    service = Mock()
    service.get_case_statistics = AsyncMock()
    service.get_all_cases = AsyncMock()
    return service

@pytest.fixture
def mock_notification_service():
    """Mock NotificationService with common methods."""
    service = Mock()
    service.get_unread_count = AsyncMock()
    service.get_notifications = AsyncMock()
    return service

@pytest.fixture
def sample_case_stats():
    """Sample case statistics data."""
    return {
        "total_cases": 15,
        "status_counts": {
            "active": 10,
            "closed": 3,
            "pending": 2
        }
    }

@pytest.fixture
def sample_cases():
    """Sample case response list."""
    return [
        CaseResponse(
            id=1,
            title="Case 1",
            description="Description 1",
            case_type="employment",
            status="active",
            user_id=1,
            created_at=datetime.utcnow().isoformat(),
            updated_at=(datetime.utcnow() - timedelta(hours=1)).isoformat()
        ),
        CaseResponse(
            id=2,
            title="Case 2",
            description="Description 2",
            case_type="housing",
            status="active",
            user_id=1,
            created_at=datetime.utcnow().isoformat(),
            updated_at=(datetime.utcnow() - timedelta(hours=2)).isoformat()
        ),
        CaseResponse(
            id=3,
            title="Case 3",
            description="Description 3",
            case_type="consumer",
            status="closed",
            user_id=1,
            created_at=datetime.utcnow().isoformat(),
            updated_at=(datetime.utcnow() - timedelta(hours=3)).isoformat()
        )
    ]

@pytest.fixture
def sample_notifications():
    """Sample notification list."""
    now = datetime.utcnow()
    return [
        Mock(
            id=1,
            type="deadline_reminder",
            severity="high",
            title="Deadline approaching",
            message="Your deadline is due in 2 days",
            created_at=now - timedelta(hours=1)
        ),
        Mock(
            id=2,
            type="case_status_change",
            severity="medium",
            title="Case updated",
            message="Case status changed to active",
            created_at=now - timedelta(hours=2)
        )
    ]

# ===== DASHBOARD STATS TESTS =====

@pytest.mark.asyncio
async def test_get_dashboard_stats_success(
    mock_db,
    mock_case_service,
    mock_notification_service,
    sample_case_stats
):
    """Test successful dashboard statistics retrieval."""
    # Arrange
    user_id = 1
    mock_case_service.get_case_statistics.return_value = sample_case_stats
    mock_notification_service.get_unread_count.return_value = 5

    # Mock database queries
    evidence_result = Mock(count=25)
    deadlines_result = Mock(count=10)
    overdue_result = Mock(count=2)

    mock_db.execute.side_effect = [
        Mock(fetchone=lambda: evidence_result),
        Mock(fetchone=lambda: deadlines_result),
        Mock(fetchone=lambda: overdue_result)
    ]

    # Act
    result = await get_dashboard_stats_internal(
        user_id, mock_case_service, mock_notification_service, mock_db
    )

    # Assert
    assert isinstance(result, DashboardStatsResponse)
    assert result.totalCases == 15
    assert result.activeCases == 10
    assert result.closedCases == 3
    assert result.totalEvidence == 25
    assert result.totalDeadlines == 10
    assert result.overdueDeadlines == 2
    assert result.unreadNotifications == 5

    # Verify service calls
    mock_case_service.get_case_statistics.assert_called_once_with(user_id)
    mock_notification_service.get_unread_count.assert_called_once_with(user_id)

@pytest.mark.asyncio
async def test_get_dashboard_stats_empty_data(
    mock_db,
    mock_case_service,
    mock_notification_service
):
    """Test dashboard statistics with no data."""
    # Arrange
    user_id = 1
    mock_case_service.get_case_statistics.return_value = {
        "total_cases": 0,
        "status_counts": {}
    }
    mock_notification_service.get_unread_count.return_value = 0

    # Mock empty database results
    mock_db.execute.side_effect = [
        Mock(fetchone=lambda: Mock(count=0)),
        Mock(fetchone=lambda: Mock(count=0)),
        Mock(fetchone=lambda: Mock(count=0))
    ]

    # Act
    result = await get_dashboard_stats_internal(
        user_id, mock_case_service, mock_notification_service, mock_db
    )

    # Assert
    assert result.totalCases == 0
    assert result.activeCases == 0
    assert result.closedCases == 0
    assert result.totalEvidence == 0
    assert result.totalDeadlines == 0
    assert result.overdueDeadlines == 0
    assert result.unreadNotifications == 0

@pytest.mark.asyncio
async def test_get_dashboard_stats_service_error(
    mock_db,
    mock_case_service,
    mock_notification_service
):
    """Test dashboard statistics with service error."""
    # Arrange
    user_id = 1
    mock_case_service.get_case_statistics.side_effect = Exception("Service error")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_dashboard_stats_internal(
            user_id, mock_case_service, mock_notification_service, mock_db
        )

    assert exc_info.value.status_code == 500
    assert "Failed to load dashboard statistics" in str(exc_info.value.detail)

# ===== RECENT CASES TESTS =====

@pytest.mark.asyncio
async def test_get_recent_cases_success(mock_case_service, sample_cases):
    """Test successful recent cases retrieval."""
    # Arrange
    user_id = 1
    limit = 5
    mock_case_service.get_all_cases.return_value = sample_cases

    # Act
    result = await get_recent_cases_internal(user_id, mock_case_service, limit)

    # Assert
    assert isinstance(result, RecentCasesResponse)
    assert len(result.cases) == 3
    assert result.total == 3
    assert result.cases[0].id == 1  # Most recently updated
    assert result.cases[0].title == "Case 1"
    assert result.cases[0].status == "active"

    # Verify service call
    mock_case_service.get_all_cases.assert_called_once_with(user_id)

@pytest.mark.asyncio
async def test_get_recent_cases_with_limit(mock_case_service, sample_cases):
    """Test recent cases retrieval with limit."""
    # Arrange
    user_id = 1
    limit = 2
    mock_case_service.get_all_cases.return_value = sample_cases

    # Act
    result = await get_recent_cases_internal(user_id, mock_case_service, limit)

    # Assert
    assert len(result.cases) == 2
    assert result.total == 3

@pytest.mark.asyncio
async def test_get_recent_cases_empty(mock_case_service):
    """Test recent cases retrieval with no cases."""
    # Arrange
    user_id = 1
    limit = 5
    mock_case_service.get_all_cases.return_value = []

    # Act
    result = await get_recent_cases_internal(user_id, mock_case_service, limit)

    # Assert
    assert len(result.cases) == 0
    assert result.total == 0

@pytest.mark.asyncio
async def test_get_recent_cases_service_error(mock_case_service):
    """Test recent cases retrieval with service error."""
    # Arrange
    user_id = 1
    limit = 5
    mock_case_service.get_all_cases.side_effect = Exception("Service error")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_recent_cases_internal(user_id, mock_case_service, limit)

    assert exc_info.value.status_code == 500
    assert "Failed to load recent cases" in str(exc_info.value.detail)

# ===== NOTIFICATIONS WIDGET TESTS =====

@pytest.mark.asyncio
async def test_get_notifications_widget_success(
    mock_notification_service,
    sample_notifications
):
    """Test successful notifications widget retrieval."""
    # Arrange
    user_id = 1
    limit = 5
    mock_notification_service.get_unread_count.return_value = 2
    mock_notification_service.get_notifications.return_value = sample_notifications

    # Act
    result = await get_notifications_widget_internal(
        user_id, mock_notification_service, limit
    )

    # Assert
    assert isinstance(result, NotificationWidgetResponse)
    assert result.unreadCount == 2
    assert len(result.recentNotifications) == 2
    assert result.recentNotifications[0]["id"] == 1
    assert result.recentNotifications[0]["title"] == "Deadline approaching"

    # Verify service calls
    mock_notification_service.get_unread_count.assert_called_once_with(user_id)
    mock_notification_service.get_notifications.assert_called_once()

@pytest.mark.asyncio
async def test_get_notifications_widget_all_read(mock_notification_service):
    """Test notifications widget with all notifications read."""
    # Arrange
    user_id = 1
    limit = 5
    mock_notification_service.get_unread_count.return_value = 0
    mock_notification_service.get_notifications.return_value = []

    # Act
    result = await get_notifications_widget_internal(
        user_id, mock_notification_service, limit
    )

    # Assert
    assert result.unreadCount == 0
    assert len(result.recentNotifications) == 0

@pytest.mark.asyncio
async def test_get_notifications_widget_service_error(mock_notification_service):
    """Test notifications widget with service error."""
    # Arrange
    user_id = 1
    limit = 5
    mock_notification_service.get_unread_count.side_effect = Exception("Service error")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_notifications_widget_internal(
            user_id, mock_notification_service, limit
        )

    assert exc_info.value.status_code == 500
    assert "Failed to load notifications widget" in str(exc_info.value.detail)

# ===== DEADLINES WIDGET TESTS =====

@pytest.mark.asyncio
async def test_get_deadlines_widget_success(mock_db):
    """Test successful deadlines widget retrieval."""
    # Arrange
    user_id = 1
    limit = 10

    # Mock deadline query results
    deadline_results = [
        Mock(
            id=1,
            title="Deadline 1",
            deadline_date=(datetime.utcnow() + timedelta(days=5)).isoformat(),
            priority="high",
            case_id=1,
            case_title="Case 1"
        ),
        Mock(
            id=2,
            title="Deadline 2",
            deadline_date=(datetime.utcnow() - timedelta(days=2)).isoformat(),
            priority="medium",
            case_id=2,
            case_title="Case 2"
        )
    ]

    total_result = Mock(count=2)

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: deadline_results),
        Mock(fetchone=lambda: total_result)
    ]

    # Act
    result = await get_deadlines_widget_internal(user_id, mock_db, limit)

    # Assert
    assert isinstance(result, DeadlinesWidgetResponse)
    assert len(result.upcomingDeadlines) == 2
    assert result.totalDeadlines == 2
    assert result.overdueCount == 1  # One deadline is overdue
    assert result.upcomingDeadlines[0].title == "Deadline 1"
    assert result.upcomingDeadlines[0].priority == "high"

@pytest.mark.asyncio
async def test_get_deadlines_widget_no_deadlines(mock_db):
    """Test deadlines widget with no deadlines."""
    # Arrange
    user_id = 1
    limit = 10

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: []),
        Mock(fetchone=lambda: Mock(count=0))
    ]

    # Act
    result = await get_deadlines_widget_internal(user_id, mock_db, limit)

    # Assert
    assert len(result.upcomingDeadlines) == 0
    assert result.totalDeadlines == 0
    assert result.overdueCount == 0

@pytest.mark.asyncio
async def test_get_deadlines_widget_overdue_only(mock_db):
    """Test deadlines widget with only overdue deadlines."""
    # Arrange
    user_id = 1
    limit = 10

    deadline_results = [
        Mock(
            id=1,
            title="Overdue Deadline 1",
            deadline_date=(datetime.utcnow() - timedelta(days=5)).isoformat(),
            priority="critical",
            case_id=1,
            case_title="Case 1"
        )
    ]

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: deadline_results),
        Mock(fetchone=lambda: Mock(count=1))
    ]

    # Act
    result = await get_deadlines_widget_internal(user_id, mock_db, limit)

    # Assert
    assert len(result.upcomingDeadlines) == 1
    assert result.overdueCount == 1
    assert result.upcomingDeadlines[0].isOverdue is True

@pytest.mark.asyncio
async def test_get_deadlines_widget_invalid_date(mock_db):
    """Test deadlines widget with invalid deadline date."""
    # Arrange
    user_id = 1
    limit = 10

    deadline_results = [
        Mock(
            id=1,
            title="Invalid Deadline",
            deadline_date="invalid-date",
            priority="high",
            case_id=1,
            case_title="Case 1"
        )
    ]

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: deadline_results),
        Mock(fetchone=lambda: Mock(count=1))
    ]

    # Act
    result = await get_deadlines_widget_internal(user_id, mock_db, limit)

    # Assert - Invalid deadline should be skipped
    assert len(result.upcomingDeadlines) == 0

# ===== ACTIVITY WIDGET TESTS =====

@pytest.mark.asyncio
async def test_get_activity_widget_success(mock_db):
    """Test successful activity widget retrieval."""
    # Arrange
    user_id = 1
    limit = 10

    case_results = [
        Mock(id=1, title="Case 1", updated_at=datetime.utcnow().isoformat(), status="active")
    ]

    evidence_results = [
        Mock(
            id=1,
            title="Evidence 1",
            created_at=datetime.utcnow().isoformat(),
            evidence_type="document",
            case_id=1,
            case_title="Case 1"
        )
    ]

    deadline_results = [
        Mock(
            id=1,
            title="Deadline 1",
            updated_at=datetime.utcnow().isoformat(),
            status="upcoming",
            case_id=1,
            case_title="Case 1"
        )
    ]

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: case_results),
        Mock(fetchall=lambda: evidence_results),
        Mock(fetchall=lambda: deadline_results)
    ]

    # Act
    result = await get_activity_widget_internal(user_id, mock_db, limit)

    # Assert
    assert isinstance(result, ActivityWidgetResponse)
    assert len(result.activities) == 3
    assert result.total == 3

    # Verify activity types
    activity_types = [a.type for a in result.activities]
    assert "case" in activity_types
    assert "evidence" in activity_types
    assert "deadline" in activity_types

@pytest.mark.asyncio
async def test_get_activity_widget_no_activity(mock_db):
    """Test activity widget with no activity."""
    # Arrange
    user_id = 1
    limit = 10

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: []),
        Mock(fetchall=lambda: []),
        Mock(fetchall=lambda: [])
    ]

    # Act
    result = await get_activity_widget_internal(user_id, mock_db, limit)

    # Assert
    assert len(result.activities) == 0
    assert result.total == 0

@pytest.mark.asyncio
async def test_get_activity_widget_with_limit(mock_db):
    """Test activity widget respects limit."""
    # Arrange
    user_id = 1
    limit = 2

    # Create 10 case activities
    case_results = [
        Mock(id=i, title=f"Case {i}", updated_at=datetime.utcnow().isoformat(), status="active")
        for i in range(10)
    ]

    mock_db.execute.side_effect = [
        Mock(fetchall=lambda: case_results),
        Mock(fetchall=lambda: []),
        Mock(fetchall=lambda: [])
    ]

    # Act
    result = await get_activity_widget_internal(user_id, mock_db, limit)

    # Assert
    assert len(result.activities) == 2  # Limited to 2
    assert result.total == 10  # Total is 10

# ===== CHART TESTS =====

@pytest.mark.asyncio
async def test_get_cases_by_status_chart_success(
    mock_case_service,
    sample_case_stats
):
    """Test successful cases by status chart."""
    # Arrange
    user_id = 1
    mock_case_service.get_case_statistics.return_value = sample_case_stats

    # Mock the chart endpoint directly
    from backend.routes.dashboard import get_cases_by_status_chart

    # Act
    result = await get_cases_by_status_chart(user_id, mock_case_service)

    # Assert
    assert isinstance(result, ChartResponse)
    assert len(result.data) == 3  # active, closed, pending
    assert result.total == 15
    assert result.data[0].label in ["Active", "Closed", "Pending"]
    assert result.data[0].value > 0
    assert result.data[0].color is not None

@pytest.mark.asyncio
async def test_get_cases_by_status_chart_empty(mock_case_service):
    """Test cases by status chart with no cases."""
    # Arrange
    user_id = 1
    mock_case_service.get_case_statistics.return_value = {
        "total_cases": 0,
        "status_counts": {}
    }

    from backend.routes.dashboard import get_cases_by_status_chart

    # Act
    result = await get_cases_by_status_chart(user_id, mock_case_service)

    # Assert
    assert len(result.data) == 0
    assert result.total == 0

@pytest.mark.asyncio
async def test_get_cases_timeline_chart_success(mock_db):
    """Test successful cases timeline chart."""
    # Arrange
    user_id = 1
    days = 30

    timeline_results = [
        Mock(date="2025-01-01", count=3),
        Mock(date="2025-01-02", count=5),
        Mock(date="2025-01-03", count=2)
    ]

    mock_db.execute.return_value = Mock(fetchall=lambda: timeline_results)

    from backend.routes.dashboard import get_cases_timeline_chart

    # Act
    result = await get_cases_timeline_chart(user_id, mock_db, days)

    # Assert
    assert isinstance(result, TimelineChartResponse)
    assert len(result.data) == 3
    assert result.data[0].date == "2025-01-01"
    assert result.data[0].count == 3
    assert result.startDate is not None
    assert result.endDate is not None

@pytest.mark.asyncio
async def test_get_cases_timeline_chart_empty(mock_db):
    """Test cases timeline chart with no data."""
    # Arrange
    user_id = 1
    days = 30

    mock_db.execute.return_value = Mock(fetchall=lambda: [])

    from backend.routes.dashboard import get_cases_timeline_chart

    # Act
    result = await get_cases_timeline_chart(user_id, mock_db, days)

    # Assert
    assert len(result.data) == 0

# ===== ERROR HANDLING TESTS =====

@pytest.mark.asyncio
async def test_database_error_handling(mock_db, mock_case_service, mock_notification_service):
    """Test database error handling in stats endpoint."""
    # Arrange
    user_id = 1
    mock_case_service.get_case_statistics.return_value = {"total_cases": 0, "status_counts": {}}
    mock_db.execute.side_effect = Exception("Database connection failed")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_dashboard_stats_internal(
            user_id, mock_case_service, mock_notification_service, mock_db
        )

    assert exc_info.value.status_code == 500

@pytest.mark.asyncio
async def test_service_unavailable_error(mock_case_service):
    """Test service unavailable error handling."""
    # Arrange
    user_id = 1
    mock_case_service.get_all_cases.side_effect = HTTPException(
        status_code=503,
        detail="Service temporarily unavailable"
    )

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_recent_cases_internal(user_id, mock_case_service, 5)

    # Error should be propagated
    assert exc_info.value.status_code in [500, 503]

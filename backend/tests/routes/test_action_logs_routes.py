"""
Comprehensive test suite for action logs routes.

Tests the enhanced action_logs.py route with EnhancedErrorTracker service layer integration.

Coverage:
- Log listing (recent, failed, errors, warnings)
- Log retrieval by level
- Log filtering by service
- Log searching
- Statistics and metrics
- Clear logs operation
- Log creation
- Error handling
- Pagination

Run with: pytest backend/routes/test_action_logs_routes.py -v
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routes.action_logs import (
    router,
    get_error_tracker,
    get_audit_logger,
    _map_error_data_to_response,
    _get_recent_errors_from_tracker
)
from backend.services.enhanced_error_tracker import (
    EnhancedErrorTracker,
    ErrorData,
    ErrorContext,
    ErrorGroup,
    ErrorTrackerStats,
    ErrorMetrics,
    ErrorDistribution,
    TopError
)
from backend.services.audit_logger import AuditLogger

# ===== FIXTURES =====

@pytest.fixture
def app():
    """Create FastAPI app with action_logs router."""
    app = FastAPI()
    app.include_router(router)
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)

@pytest.fixture
def mock_error_tracker():
    """Create mock EnhancedErrorTracker."""
    tracker = MagicMock(spec=EnhancedErrorTracker)
    tracker.error_groups = {}
    tracker.stats = ErrorTrackerStats(
        total_errors=150,
        total_groups=12,
        errors_sampled=45,
        errors_rate_limited=3,
        alerts_triggered=2,
        avg_processing_time=2.5,
        memory_usage=0.5
    )
    return tracker

@pytest.fixture
def mock_audit_logger():
    """Create mock AuditLogger."""
    return MagicMock(spec=AuditLogger)

@pytest.fixture
def sample_error_data():
    """Create sample ErrorData objects."""
    errors = []

    # Error 1: INFO level, CaseService
    errors.append(ErrorData(
        id="error-1",
        name="CaseService.createCase",
        message="Case created successfully",
        level="info",
        timestamp="2025-11-13T12:00:00Z",
        context=ErrorContext(component="CaseService", operation="createCase")
    ))

    # Error 2: ERROR level, AuthService
    errors.append(ErrorData(
        id="error-2",
        name="AuthService.login",
        message="Invalid credentials",
        level="error",
        timestamp="2025-11-13T12:05:00Z",
        stack="Traceback (most recent call last)...",
        context=ErrorContext(component="AuthService", operation="login")
    ))

    # Error 3: WARNING level, ChatService
    errors.append(ErrorData(
        id="error-3",
        name="ChatService.sendMessage",
        message="Rate limit approaching",
        level="warning",
        timestamp="2025-11-13T12:10:00Z",
        context=ErrorContext(component="ChatService", operation="sendMessage")
    ))

    # Error 4: CRITICAL level, DatabaseService
    errors.append(ErrorData(
        id="error-4",
        name="DatabaseService.connect",
        message="Database connection failed",
        level="critical",
        timestamp="2025-11-13T12:15:00Z",
        stack="Traceback (most recent call last)...",
        context=ErrorContext(component="DatabaseService", operation="connect")
    ))

    # Error 5: DEBUG level, SearchService
    errors.append(ErrorData(
        id="error-5",
        name="SearchService.buildIndex",
        message="Indexing 1000 documents",
        level="debug",
        timestamp="2025-11-13T12:20:00Z",
        context=ErrorContext(component="SearchService", operation="buildIndex")
    ))

    return errors

@pytest.fixture
def mock_error_groups(sample_error_data):
    """Create mock error groups from sample data."""
    groups = {}

    for error in sample_error_data:
        fingerprint = f"fp-{error.id}"
        groups[fingerprint] = ErrorGroup(
            fingerprint=fingerprint,
            first_seen=1699880000000,
            last_seen=1699883600000,
            count=5,
            errors=[error],
            pattern=error.message
        )

    return groups

# ===== HELPER FUNCTION TESTS =====

def test_map_error_data_to_response(sample_error_data):
    """Test mapping ErrorData to ActionLogResponse."""
    error = sample_error_data[0]  # INFO level error

    response = _map_error_data_to_response(error)

    assert response.id == "error-1"
    assert response.timestamp == "2025-11-13T12:00:00Z"
    assert response.service == "CaseService"
    assert response.action == "createCase"
    assert response.level == "info"
    assert response.name == "CaseService.createCase"
    assert response.message == "Case created successfully"

def test_map_error_data_without_context():
    """Test mapping ErrorData without context."""
    error = ErrorData(
        id="error-no-context",
        name="UnknownError",
        message="Something went wrong",
        level="error",
        timestamp="2025-11-13T12:00:00Z"
    )

    response = _map_error_data_to_response(error)

    assert response.id == "error-no-context"
    assert response.service is None
    assert response.action is None
    assert response.context is None

def test_get_recent_errors_from_tracker(mock_error_groups):
    """Test getting recent errors from tracker."""
    tracker = MagicMock()
    tracker.error_groups = mock_error_groups

    errors = _get_recent_errors_from_tracker(tracker, limit=10)

    assert len(errors) == 5
    # Should be sorted by timestamp (most recent first)
    assert errors[0].id == "error-5"  # Latest
    assert errors[-1].id == "error-1"  # Oldest

def test_get_recent_errors_with_level_filter(mock_error_groups):
    """Test filtering errors by level."""
    tracker = MagicMock()
    tracker.error_groups = mock_error_groups

    errors = _get_recent_errors_from_tracker(tracker, limit=10, level_filter="error")

    assert len(errors) == 1
    assert errors[0].level == "error"
    assert errors[0].id == "error-2"

# ===== ROUTE TESTS: GET /action-logs/recent =====

def test_get_recent_actions_success(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/recent - success case."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/recent?limit=10&offset=0")

    assert response.status_code == 200
    data = response.json()

    assert "logs" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data

    assert data["limit"] == 10
    assert data["offset"] == 0
    assert len(data["logs"]) == 5

def test_get_recent_actions_empty(client, mock_error_tracker, app):
    """Test GET /action-logs/recent - empty logs."""
    mock_error_tracker.error_groups = {}

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/recent")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 0
    assert data["total"] == 0

def test_get_recent_actions_pagination(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/recent - pagination."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/recent?limit=2&offset=1")

    assert response.status_code == 200
    data = response.json()

    assert data["limit"] == 2
    assert data["offset"] == 1
    assert len(data["logs"]) == 2

def test_get_recent_actions_invalid_params(client, app):
    """Test GET /action-logs/recent - invalid parameters."""
    response = client.get("/action-logs/recent?limit=0")
    assert response.status_code == 422  # Validation error

    response = client.get("/action-logs/recent?limit=5000")
    assert response.status_code == 422

    response = client.get("/action-logs/recent?offset=-1")
    assert response.status_code == 422

# ===== ROUTE TESTS: GET /action-logs/failed =====

def test_get_failed_actions_success(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/failed - success case."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/failed")

    assert response.status_code == 200
    data = response.json()

    # Should only return ERROR and CRITICAL levels
    assert len(data["logs"]) == 2
    levels = {log["level"] for log in data["logs"]}
    assert levels.issubset({"error", "critical"})

def test_get_failed_actions_empty(client, mock_error_tracker, app):
    """Test GET /action-logs/failed - no failed actions."""
    # Create groups with only INFO logs
    groups = {
        "fp-1": ErrorGroup(
            fingerprint="fp-1",
            first_seen=1699880000000,
            last_seen=1699883600000,
            count=1,
            errors=[ErrorData(
                id="info-1",
                name="Test",
                message="Success",
                level="info",
                timestamp="2025-11-13T12:00:00Z"
            )],
            pattern="Success"
        )
    }
    mock_error_tracker.error_groups = groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/failed")

    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 0

# ===== ROUTE TESTS: GET /action-logs/errors =====

def test_get_error_logs(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/errors."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/errors")

    assert response.status_code == 200
    data = response.json()

    # Should return same as /failed endpoint
    assert len(data["logs"]) == 2

# ===== ROUTE TESTS: GET /action-logs/warnings =====

def test_get_warning_logs_success(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/warnings - success case."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/warnings")

    assert response.status_code == 200
    data = response.json()

    # Should only return WARNING level
    assert len(data["logs"]) == 1
    assert data["logs"][0]["level"] == "warning"
    assert data["logs"][0]["id"] == "error-3"

# ===== ROUTE TESTS: GET /action-logs/by-level/{level} =====

def test_get_logs_by_level_debug(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/by-level/debug."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/by-level/debug")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 1
    assert data["logs"][0]["level"] == "debug"

def test_get_logs_by_level_info(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/by-level/info."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/by-level/info")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 1
    assert data["logs"][0]["level"] == "info"

def test_get_logs_by_level_invalid(client, app):
    """Test GET /action-logs/by-level/{level} - invalid level."""
    response = client.get("/action-logs/by-level/invalid")
    assert response.status_code == 422

# ===== ROUTE TESTS: GET /action-logs/service/{service} =====

def test_get_actions_by_service_success(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/service/{service} - success case."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/service/CaseService")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 1
    assert data["logs"][0]["service"] == "CaseService"

def test_get_actions_by_service_not_found(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/service/{service} - service not found."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/service/NonExistentService")

    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 0

def test_get_actions_by_service_multiple_results(client, mock_error_tracker, app):
    """Test GET /action-logs/service/{service} - multiple results."""
    # Create multiple errors for same service
    groups = {}
    for i in range(3):
        error = ErrorData(
            id=f"error-{i}",
            name="CaseService.action",
            message=f"Action {i}",
            level="info",
            timestamp="2025-11-13T12:00:00Z",
            context=ErrorContext(component="CaseService")
        )
        groups[f"fp-{i}"] = ErrorGroup(
            fingerprint=f"fp-{i}",
            first_seen=1699880000000,
            last_seen=1699883600000,
            count=1,
            errors=[error],
            pattern=error.message
        )

    mock_error_tracker.error_groups = groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/service/CaseService")

    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 3

# ===== ROUTE TESTS: GET /action-logs/stats =====

def test_get_action_stats_success(client, mock_error_tracker, app):
    """Test GET /action-logs/stats - success case."""
    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker
    mock_error_tracker.get_stats.return_value = mock_error_tracker.stats

    response = client.get("/action-logs/stats")

    assert response.status_code == 200
    data = response.json()

    assert data["total_errors"] == 150
    assert data["total_groups"] == 12
    assert data["errors_sampled"] == 45
    assert data["errors_rate_limited"] == 3
    assert data["alerts_triggered"] == 2
    assert data["avg_processing_time"] == 2.5
    assert data["memory_usage"] == 0.5

def test_get_action_stats_empty(client, mock_error_tracker, app):
    """Test GET /action-logs/stats - empty tracker."""
    empty_stats = ErrorTrackerStats(
        total_errors=0,
        total_groups=0,
        errors_sampled=0,
        errors_rate_limited=0,
        alerts_triggered=0,
        avg_processing_time=0.0,
        memory_usage=0.0
    )
    mock_error_tracker.get_stats.return_value = empty_stats

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["total_errors"] == 0

# ===== ROUTE TESTS: GET /action-logs/metrics =====

@pytest.mark.asyncio
async def test_get_action_metrics_success(client, mock_error_tracker, sample_error_data, app):
    """Test GET /action-logs/metrics - success case."""
    metrics = ErrorMetrics(
        total_errors=150,
        error_rate=0.05,
        affected_users=12,
        mttr=900000,
        error_distribution=[
            ErrorDistribution(type="DatabaseError", count=50, percentage=33.3),
            ErrorDistribution(type="ValidationError", count=100, percentage=66.7)
        ],
        top_errors=[
            TopError(
                fingerprint="fp-1",
                message="Database connection failed",
                count=50,
                last_seen="2025-11-13T12:00:00Z"
            )
        ],
        recent_errors=sample_error_data[:3]
    )

    mock_error_tracker.get_metrics = AsyncMock(return_value=metrics)

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/metrics?time_range=1h")

    assert response.status_code == 200
    data = response.json()

    assert data["total_errors"] == 150
    assert data["error_rate"] == 0.05
    assert data["affected_users"] == 12
    assert data["mttr"] == 900000
    assert len(data["error_distribution"]) == 2
    assert len(data["top_errors"]) == 1
    assert len(data["recent_errors"]) == 3

def test_get_action_metrics_invalid_time_range(client, app):
    """Test GET /action-logs/metrics - invalid time range."""
    response = client.get("/action-logs/metrics?time_range=invalid")
    assert response.status_code == 422

# ===== ROUTE TESTS: GET /action-logs/search =====

def test_search_logs_by_keyword_success(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/search - success case."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/search?keyword=created")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 1
    assert "created" in data["logs"][0]["message"].lower()

def test_search_logs_with_level_filter(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/search - with level filter."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/search?keyword=failed&level=critical")

    assert response.status_code == 200
    data = response.json()

    # Should find the CRITICAL "Database connection failed" log
    assert len(data["logs"]) == 1
    assert data["logs"][0]["level"] == "critical"

def test_search_logs_with_service_filter(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/search - with service filter."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/search?keyword=Service&service=CaseService")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 1
    assert data["logs"][0]["service"] == "CaseService"

def test_search_logs_no_results(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/search - no matching results."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/search?keyword=nonexistent")

    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 0

def test_search_logs_case_insensitive(client, mock_error_tracker, mock_error_groups, app):
    """Test GET /action-logs/search - case insensitive search."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/search?keyword=CREATED")

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 1

def test_search_logs_missing_keyword(client, app):
    """Test GET /action-logs/search - missing keyword."""
    response = client.get("/action-logs/search")
    assert response.status_code == 422

# ===== ROUTE TESTS: POST /action-logs/clear =====

def test_clear_action_logs_success(client, mock_error_tracker, mock_error_groups, app):
    """Test POST /action-logs/clear - success case."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.post("/action-logs/clear")

    assert response.status_code == 200
    data = response.json()

    assert data["message"] == "Action logs cleared successfully"
    assert data["cleared_groups"] == 5

    mock_error_tracker.clear_groups.assert_called_once()

def test_clear_action_logs_empty(client, mock_error_tracker, app):
    """Test POST /action-logs/clear - empty logs."""
    mock_error_tracker.error_groups = {}

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.post("/action-logs/clear")

    assert response.status_code == 200
    data = response.json()
    assert data["cleared_groups"] == 0

# ===== ROUTE TESTS: POST /action-logs/log =====

@pytest.mark.asyncio
async def test_log_action_success(client, mock_error_tracker, mock_audit_logger, app):
    """Test POST /action-logs/log - success case."""
    mock_error_tracker.track_error = AsyncMock()

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker
    app.dependency_overrides[get_audit_logger] = lambda: mock_audit_logger

    payload = {
        "service": "CaseService",
        "action": "createCase",
        "status": "success",
        "duration": 45,
        "level": "info"
    }

    response = client.post("/action-logs/log", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Action logged successfully"

@pytest.mark.asyncio
async def test_log_action_failed(client, mock_error_tracker, mock_audit_logger, app):
    """Test POST /action-logs/log - failed action."""
    mock_error_tracker.track_error = AsyncMock()

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker
    app.dependency_overrides[get_audit_logger] = lambda: mock_audit_logger

    payload = {
        "service": "AuthService",
        "action": "login",
        "status": "failed",
        "duration": 120,
        "level": "error",
        "error": "Invalid credentials",
        "stack": "Traceback (most recent call last)..."
    }

    response = client.post("/action-logs/log", json=payload)

    assert response.status_code == 201

    # Verify audit logger was called for failed action
    mock_audit_logger.log.assert_called_once()
    call_args = mock_audit_logger.log.call_args
    assert call_args.kwargs["event_type"] == "action.failed"
    assert call_args.kwargs["success"] is False

def test_log_action_invalid_status(client, app):
    """Test POST /action-logs/log - invalid status."""
    payload = {
        "service": "CaseService",
        "action": "createCase",
        "status": "invalid",
        "duration": 45
    }

    response = client.post("/action-logs/log", json=payload)
    assert response.status_code == 422

def test_log_action_missing_fields(client, app):
    """Test POST /action-logs/log - missing required fields."""
    payload = {
        "service": "CaseService"
        # Missing action, status, duration
    }

    response = client.post("/action-logs/log", json=payload)
    assert response.status_code == 422

def test_log_action_invalid_duration(client, app):
    """Test POST /action-logs/log - invalid duration."""
    payload = {
        "service": "CaseService",
        "action": "createCase",
        "status": "success",
        "duration": -1  # Invalid: negative
    }

    response = client.post("/action-logs/log", json=payload)
    assert response.status_code == 422

# ===== ERROR HANDLING TESTS =====

def test_get_recent_actions_exception(client, mock_error_tracker, app):
    """Test GET /action-logs/recent - handles exceptions."""
    mock_error_tracker.error_groups = None  # Will cause error

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/recent")

    assert response.status_code == 500
    assert "Failed to get recent actions" in response.json()["detail"]

def test_get_action_stats_exception(client, mock_error_tracker, app):
    """Test GET /action-logs/stats - handles exceptions."""
    mock_error_tracker.get_stats.side_effect = RuntimeError("Test error")

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/stats")

    assert response.status_code == 500
    assert "Failed to get action stats" in response.json()["detail"]

# ===== PAGINATION EDGE CASES =====

def test_pagination_offset_beyond_total(client, mock_error_tracker, mock_error_groups, app):
    """Test pagination with offset beyond total results."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/recent?limit=10&offset=100")

    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 0  # No logs beyond total

def test_pagination_large_limit(client, mock_error_tracker, mock_error_groups, app):
    """Test pagination with large limit."""
    mock_error_tracker.error_groups = mock_error_groups

    app.dependency_overrides[get_error_tracker] = lambda: mock_error_tracker

    response = client.get("/action-logs/recent?limit=1000")

    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 5  # All available logs

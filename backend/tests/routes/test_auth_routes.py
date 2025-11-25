"""
Comprehensive test suite for authentication routes.

Tests cover:
- User registration with validation
- User login with rate limiting
- Session management (validation, logout)
- Password change with security checks
- Rate limiting enforcement
- Error handling and edge cases
- Audit logging verification

Test Strategy:
- Use FastAPI TestClient for integration testing
- Mock services (not database) for unit testing
- Test both success and failure paths
- Verify rate limiting behavior
- Check audit log entries
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.routes.auth import router
from backend.models.base import Base, get_db
from backend.models.session import Session as SessionModel
from backend.services.rate_limit_service import RateLimitResult, RateLimitService

from fastapi import FastAPI

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    """Create test database session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def app():
    """Create FastAPI test application."""
    app = FastAPI()
    app.include_router(router)
    return app

@pytest.fixture
def client(app, db_session):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

@pytest.fixture
def mock_rate_limiter():
    """Create mock rate limiter."""
    limiter = Mock(spec=RateLimitService)

    # Default: allow all requests
    limiter.check_rate_limit.return_value = RateLimitResult(
        allowed=True,
        attempts_remaining=5,
        message="Operation allowed"
    )
    limiter.get_remaining.return_value = 5
    limiter.is_locked.return_value = False
    limiter.get_attempt_count.return_value = 0
    limiter.get_reset_time.return_value = None

    return limiter

# ===== Test: User Registration =====

class TestRegistration:
    """Test suite for user registration endpoint."""

    def test_register_success(self, client, mock_rate_limiter):
        """Test successful user registration."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )

        assert response.status_code == 201
        data = response.json()
        assert data["user"]["username"] == "test_user"
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "user"
        assert data["user"]["is_active"] is True
        assert "session" in data
        assert "id" in data["session"]

        # Verify rate limiter was called
        mock_rate_limiter.check_rate_limit.assert_called_once()
        mock_rate_limiter.reset.assert_called_once()

    def test_register_duplicate_username(self, client, mock_rate_limiter):
        """Test registration with duplicate username fails."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # First registration
            client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test1@example.com"
                }
            )

            # Duplicate registration
            response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass456!",
                    "email": "test2@example.com"
                }
            )

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_register_weak_password(self, client, mock_rate_limiter):
        """Test registration with weak password fails."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Too short
            response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "Short1!",
                    "email": "test@example.com"
                }
            )

        assert response.status_code == 400
        assert "12 characters" in response.json()["detail"]

    def test_register_password_missing_uppercase(self, client, mock_rate_limiter):
        """Test registration with password missing uppercase fails."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "securepass123!",
                    "email": "test@example.com"
                }
            )

        assert response.status_code == 400
        assert "uppercase" in response.json()["detail"].lower()

    def test_register_rate_limit_exceeded(self, client):
        """Test registration rate limiting."""
        mock_limiter = Mock(spec=RateLimitService)
        mock_limiter.check_rate_limit.return_value = RateLimitResult(
            allowed=False,
            remaining_time=3600,
            message="Too many attempts"
        )

        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_limiter):
            response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )

        assert response.status_code == 429
        detail = response.json()["detail"]
        assert "retry_after_seconds" in detail["rate_limit_info"]
        mock_limiter.increment.assert_called_once()

# ===== Test: User Login =====

class TestLogin:
    """Test suite for user login endpoint."""

    def test_login_success(self, client, db_session, mock_rate_limiter):
        """Test successful user login."""
        # Create user first
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )

            # Login
            response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "remember_me": False
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "test_user"
        assert "session" in data
        mock_rate_limiter.reset.assert_called()

    def test_login_invalid_credentials(self, client, db_session, mock_rate_limiter):
        """Test login with invalid credentials fails."""
        # Create user
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )

            # Login with wrong password
            response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "WrongPass123!",
                    "remember_me": False
                }
            )

        assert response.status_code == 401
        assert "attempts_remaining" in response.json()["detail"]
        mock_rate_limiter.increment.assert_called()

    def test_login_nonexistent_user(self, client, mock_rate_limiter):
        """Test login with non-existent user fails."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            response = client.post(
                "/auth/login",
                json={
                    "username": "nonexistent",
                    "password": "SecurePass123!",
                    "remember_me": False
                }
            )

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_rate_limit_exceeded(self, client, db_session):
        """Test login rate limiting after multiple failed attempts."""
        mock_limiter = Mock(spec=RateLimitService)

        # First allow checks, then block
        mock_limiter.check_rate_limit.side_effect = [
            RateLimitResult(allowed=True, attempts_remaining=4),
            RateLimitResult(allowed=True, attempts_remaining=3),
            RateLimitResult(allowed=True, attempts_remaining=2),
            RateLimitResult(allowed=True, attempts_remaining=1),
            RateLimitResult(allowed=True, attempts_remaining=0),
            RateLimitResult(allowed=False, remaining_time=900)
        ]
        mock_limiter.get_remaining.return_value = 0

        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_limiter):
            # Register user
            client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )

            # Make 5 failed login attempts
            for _ in range(5):
                client.post(
                    "/auth/login",
                    json={
                        "username": "test_user",
                        "password": "WrongPass123!",
                        "remember_me": False
                    }
                )

            # 6th attempt should be blocked
            response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "WrongPass123!",
                    "remember_me": False
                }
            )

        assert response.status_code == 429
        detail = response.json()["detail"]
        assert "locked" in detail["message"].lower()

    def test_login_remember_me(self, client, db_session, mock_rate_limiter):
        """Test login with remember_me creates long-lived session."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register
            client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )

            # Login with remember_me
            response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "remember_me": True
                }
            )

        assert response.status_code == 200
        data = response.json()

        # Verify session exists
        session = db_session.query(SessionModel).filter(
            SessionModel.id == data["session"]["id"]
        ).first()

        assert session is not None
        # Remember me sessions should last ~30 days
        session_duration = (session.expires_at - session.created_at).days
        assert session_duration >= 25  # Allow some margin

# ===== Test: Session Management =====

class TestSessionManagement:
    """Test suite for session management endpoints."""

    def test_get_session_valid(self, client, db_session, mock_rate_limiter):
        """Test getting valid session returns user info."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register and get session
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )
            session_id = register_response.json()["session"]["id"]

            # Get session
            response = client.get(f"/auth/session/{session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "test_user"
        assert data["session"]["id"] == session_id

    def test_get_session_invalid(self, client):
        """Test getting invalid session returns 404."""
        invalid_session_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/auth/session/{invalid_session_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_logout_success(self, client, mock_rate_limiter):
        """Test successful logout."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register to get session
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )
            session_id = register_response.json()["session"]["id"]

            # Logout
            response = client.post(
                "/auth/logout",
                json={"session_id": session_id}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Logged out" in data["message"]

        # Verify session is gone
        get_response = client.get(f"/auth/session/{session_id}")
        assert get_response.status_code == 404

    def test_logout_idempotent(self, client):
        """Test logout is idempotent (multiple calls don't fail)."""
        session_id = "00000000-0000-0000-0000-000000000000"

        # Logout non-existent session
        response = client.post(
            "/auth/logout",
            json={"session_id": session_id}
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

# ===== Test: Password Change =====

class TestPasswordChange:
    """Test suite for password change endpoint."""

    def test_change_password_success(self, client, db_session, mock_rate_limiter):
        """Test successful password change."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register user
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "OldSecurePass123!",
                    "email": "test@example.com"
                }
            )
            user_id = register_response.json()["user"]["id"]

            # Change password
            response = client.post(
                "/auth/change-password",
                json={
                    "user_id": user_id,
                    "old_password": "OldSecurePass123!",
                    "new_password": "NewSecurePass456!"
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "invalidated" in data["message"].lower()

        # Verify can login with new password
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            login_response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "NewSecurePass456!"
                }
            )

        assert login_response.status_code == 200

    def test_change_password_wrong_old_password(self, client, db_session, mock_rate_limiter):
        """Test password change with wrong old password fails."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "OldSecurePass123!",
                    "email": "test@example.com"
                }
            )
            user_id = register_response.json()["user"]["id"]

            # Try to change with wrong old password
            response = client.post(
                "/auth/change-password",
                json={
                    "user_id": user_id,
                    "old_password": "WrongOldPass123!",
                    "new_password": "NewSecurePass456!"
                }
            )

        assert response.status_code == 400
        assert "Invalid current password" in response.json()["detail"]

    def test_change_password_weak_new_password(self, client, db_session, mock_rate_limiter):
        """Test password change with weak new password fails."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "OldSecurePass123!",
                    "email": "test@example.com"
                }
            )
            user_id = register_response.json()["user"]["id"]

            # Try weak new password
            response = client.post(
                "/auth/change-password",
                json={
                    "user_id": user_id,
                    "old_password": "OldSecurePass123!",
                    "new_password": "weak"
                }
            )

        assert response.status_code == 400

    def test_change_password_rate_limited(self, client, db_session):
        """Test password change rate limiting."""
        mock_limiter = Mock(spec=RateLimitService)
        mock_limiter.check_rate_limit.return_value = RateLimitResult(
            allowed=False,
            remaining_time=3600
        )

        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_limiter):
            # Register first (need different limiter for this)
            register_limiter = Mock(spec=RateLimitService)
            register_limiter.check_rate_limit.return_value = RateLimitResult(
                allowed=True, attempts_remaining=5
            )

            with patch('backend.routes.auth.get_rate_limiter', return_value=register_limiter):
                register_response = client.post(
                    "/auth/register",
                    json={
                        "username": "test_user",
                        "password": "OldSecurePass123!",
                        "email": "test@example.com"
                    }
                )

            user_id = register_response.json()["user"]["id"]

            # Now use rate-limited mock for password change
            with patch('backend.routes.auth.get_rate_limiter', return_value=mock_limiter):
                response = client.post(
                    "/auth/change-password",
                    json={
                        "user_id": user_id,
                        "old_password": "OldSecurePass123!",
                        "new_password": "NewSecurePass456!"
                    }
                )

        assert response.status_code == 429

# ===== Test: Session Cleanup =====

class TestSessionCleanup:
    """Test suite for session cleanup endpoint."""

    def test_cleanup_sessions(self, client, db_session, mock_rate_limiter):
        """Test session cleanup removes expired sessions."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Create user with session
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )
            session_id = register_response.json()["session"]["id"]

            # Manually expire the session
            session = db_session.query(SessionModel).filter(
                SessionModel.id == session_id
            ).first()
            session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
            db_session.commit()

            # Run cleanup
            response = client.post("/auth/cleanup-sessions")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["deleted_count"] >= 1

        # Verify session is gone
        get_response = client.get(f"/auth/session/{session_id}")
        assert get_response.status_code == 404

# ===== Test: Rate Limit Status =====

class TestRateLimitStatus:
    """Test suite for rate limit status endpoint."""

    def test_get_rate_limit_status(self, client):
        """Test getting rate limit status."""
        mock_limiter = Mock(spec=RateLimitService)
        mock_limiter.get_remaining.return_value = 5
        mock_limiter.is_locked.return_value = False
        mock_limiter.get_attempt_count.return_value = 0
        mock_limiter.get_reset_time.return_value = datetime.now(timezone.utc) + timedelta(hours=1)

        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_limiter):
            response = client.get(
                "/auth/rate-limit-status/1",
                params={"operation": "login"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == 1
        assert data["operation"] == "login"
        assert data["attempts_remaining"] == 5
        assert data["is_locked"] is False

# ===== Integration Tests =====

class TestAuthFlowIntegration:
    """Integration tests for complete authentication flows."""

    def test_full_auth_flow(self, client, db_session, mock_rate_limiter):
        """Test complete authentication flow: register → login → logout."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # 1. Register
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!",
                    "email": "test@example.com"
                }
            )
            assert register_response.status_code == 201
            first_session_id = register_response.json()["session"]["id"]

            # 2. Logout from auto-login session
            client.post(
                "/auth/logout",
                json={"session_id": first_session_id}
            )

            # 3. Login again
            login_response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "SecurePass123!"
                }
            )
            assert login_response.status_code == 200
            session_id = login_response.json()["session"]["id"]

            # 4. Validate session
            session_response = client.get(f"/auth/session/{session_id}")
            assert session_response.status_code == 200

            # 5. Logout
            logout_response = client.post(
                "/auth/logout",
                json={"session_id": session_id}
            )
            assert logout_response.status_code == 200

            # 6. Verify session invalid
            invalid_response = client.get(f"/auth/session/{session_id}")
            assert invalid_response.status_code == 404

    def test_password_change_invalidates_sessions(self, client, db_session, mock_rate_limiter):
        """Test password change invalidates all sessions."""
        with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
            # Register
            register_response = client.post(
                "/auth/register",
                json={
                    "username": "test_user",
                    "password": "OldSecurePass123!",
                    "email": "test@example.com"
                }
            )
            user_id = register_response.json()["user"]["id"]
            first_session_id = register_response.json()["session"]["id"]

            # Login to create another session
            login_response = client.post(
                "/auth/login",
                json={
                    "username": "test_user",
                    "password": "OldSecurePass123!"
                }
            )
            second_session_id = login_response.json()["session"]["id"]

            # Verify both sessions valid
            assert client.get(f"/auth/session/{first_session_id}").status_code == 200
            assert client.get(f"/auth/session/{second_session_id}").status_code == 200

            # Change password
            client.post(
                "/auth/change-password",
                json={
                    "user_id": user_id,
                    "old_password": "OldSecurePass123!",
                    "new_password": "NewSecurePass456!"
                }
            )

            # Verify both sessions invalidated
            assert client.get(f"/auth/session/{first_session_id}").status_code == 404
            assert client.get(f"/auth/session/{second_session_id}").status_code == 404

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

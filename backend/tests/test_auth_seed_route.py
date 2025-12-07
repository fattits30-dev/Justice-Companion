"""Tests for the /auth/test/seed-user endpoint."""

from types import SimpleNamespace
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import backend.routes.auth as auth_routes
from backend.services.auth.service import AuthenticationError
from backend.tests.utils.test_credentials import build_password

DETERMINISTIC_PASSWORD = build_password("seed-user")


def _build_response_payload() -> Dict[str, Any]:
    return {
        "user": {
            "id": 1,
            "username": "e2e-test",
            "email": "e2e-test@example.com",
            "role": "user",
            "is_active": True,
        },
        "session": {"id": "session-123", "user_id": 1, "expires_at": "2099-01-01"},
    }


def _create_client(auth_service: Any) -> TestClient:
    app = FastAPI()
    app.include_router(auth_routes.router)
    app.dependency_overrides[auth_routes.get_auth_service] = lambda: auth_service
    return TestClient(app)


def test_seed_user_returns_404_when_disabled(monkeypatch: pytest.MonkeyPatch):
    """Returns 404 when test routes are disabled."""
    auth_service = MagicMock()
    client = _create_client(auth_service)
    monkeypatch.setattr(auth_routes, "_are_test_routes_enabled", lambda: False)

    response = client.post(
        "/auth/test/seed-user",
        json={
            "username": "demo",
            "email": "demo@example.com",
            "password": build_password("seed-user-disabled"),
        },
    )

    assert response.status_code == 404
    auth_service.register.assert_not_called()


def test_seed_user_registers_when_enabled(monkeypatch: pytest.MonkeyPatch):
    """Registers and logs in the seeded user when route is enabled."""
    payload = _build_response_payload()
    auth_service = MagicMock()
    auth_service.register = AsyncMock(return_value=payload)
    client = _create_client(auth_service)
    monkeypatch.setattr(auth_routes, "_are_test_routes_enabled", lambda: True)

    response = client.post(
        "/auth/test/seed-user",
        json={
            "username": "e2e-test",
            "email": "e2e-test@example.com",
            "password": DETERMINISTIC_PASSWORD,
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "e2e-test"
    auth_service.register.assert_awaited_once()


def test_seed_user_updates_existing_user_on_conflict(monkeypatch: pytest.MonkeyPatch):
    """Updates credentials when the deterministic user already exists."""
    payload = _build_response_payload()
    auth_service = MagicMock()
    auth_service.register = AsyncMock(
        side_effect=AuthenticationError("Username already exists")
    )
    auth_service.reset_user_credentials = MagicMock()
    auth_service.login = AsyncMock(return_value=payload)

    # Stub database interactions
    existing_user = SimpleNamespace(
        id=1,
        username="e2e-test",
        email="old@example.com",
        password_hash="",
        password_salt="",
        is_active=False,
    )

    def query_side_effect(model):
        query_mock = MagicMock()
        if model is auth_routes.User:
            filter_mock = MagicMock()
            filter_mock.first.return_value = existing_user
            query_mock.filter.return_value = filter_mock
            return query_mock
        # Session cleanup branch
        filter_mock = MagicMock()
        filter_mock.delete.return_value = None
        query_mock.filter.return_value = filter_mock
        return query_mock

    auth_service.db = MagicMock()
    auth_service.db.query.side_effect = query_side_effect
    auth_service.db.commit = MagicMock()
    auth_service.db.refresh = MagicMock()

    client = _create_client(auth_service)
    monkeypatch.setattr(auth_routes, "_are_test_routes_enabled", lambda: True)

    response = client.post(
        "/auth/test/seed-user",
        json={
            "username": "e2e-test",
            "email": "e2e-test@example.com",
            "password": DETERMINISTIC_PASSWORD,
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "e2e-test@example.com"
    auth_service.login.assert_awaited_once_with(
        username="e2e-test",
        password=DETERMINISTIC_PASSWORD,
        remember_me=False,
        ip_address="testclient",
        user_agent="testclient",
    )
    auth_service.reset_user_credentials.assert_called_once_with(
        existing_user, password=DETERMINISTIC_PASSWORD, email="e2e-test@example.com"
    )
    auth_service.db.commit.assert_called()

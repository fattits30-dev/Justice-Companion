"""Tests for the global error handling middleware."""

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from backend.middleware.error_handler import ErrorHandlingMiddleware


def _create_test_app() -> TestClient:
    app = FastAPI()
    app.add_middleware(ErrorHandlingMiddleware)

    class Payload(BaseModel):
        name: str

    @app.get("/value-error")
    def value_error_route():  # pragma: no cover - exercised via TestClient
        raise ValueError("Bad value provided")

    @app.get("/http-error")
    def http_error_route():  # pragma: no cover - exercised via TestClient
        raise HTTPException(
            status_code=418, detail={"message": "teapot", "code": "teapot_error"}
        )

    @app.post("/validate")
    def validation_route(_: Payload):  # pragma: no cover - exercised via TestClient
        return {"ok": True}

    return TestClient(app)


def test_value_error_is_standardized():
    client = _create_test_app()

    response = client.get("/value-error")

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Bad value provided"


def test_http_exception_preserves_status_and_message():
    client = _create_test_app()

    response = client.get("/http-error")

    assert response.status_code == 418
    body = response.json()
    assert body == {
        "success": False,
        "error": {
            "message": "teapot",
            "code": "teapot_error",
            "details": {"message": "teapot", "code": "teapot_error"},
        },
    }


def test_request_validation_error_is_supported():
    client = _create_test_app()

    response = client.post("/validate", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "request_validation_error"
    assert isinstance(body["error"]["details"], list)
    assert body["success"] is False

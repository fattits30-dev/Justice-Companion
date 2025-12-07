"""Middleware for consistent error handling across the FastAPI backend."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Iterable, Tuple, Type

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("backend.error_handler")


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and normalize the error response shape."""

    _EXCEPTION_STATUS_MAP: Dict[Type[BaseException], Tuple[int, str]] = {
        ValueError: (400, "validation_error"),
        ValidationError: (400, "validation_error"),
        PermissionError: (403, "permission_denied"),
        FileNotFoundError: (404, "not_found"),
        TimeoutError: (504, "timeout"),
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            response = await call_next(request)
        except HTTPException as exc:
            return self._handle_http_exception(request, exc)
        except RequestValidationError as exc:
            return self._handle_request_validation(request, exc)
        except Exception as exc:  # pylint: disable=broad-except
            return self._handle_generic_exception(request, exc)

        if response.status_code >= 400:
            return await self._normalize_error_response(request, response)

        return response

    def _handle_http_exception(
        self, request: Request, exc: HTTPException
    ) -> JSONResponse:
        message = self._extract_message(
            exc.detail, default=str(exc.detail) or "HTTP error"
        )
        details = self._extract_details(exc.detail)
        error_code = getattr(exc, "error_code", "http_error")
        self._log_error(request, exc.status_code, error_code, message, exc)
        return self._build_response(exc.status_code, message, error_code, details)

    def _handle_request_validation(
        self, request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        status_code = 422
        error_code = "request_validation_error"
        message = "Request validation failed"
        details = exc.errors()
        self._log_error(request, status_code, error_code, message, exc)
        return self._build_response(status_code, message, error_code, details)

    def _handle_generic_exception(
        self, request: Request, exc: Exception
    ) -> JSONResponse:
        status_code, error_code = self._status_from_exception(exc)
        message = str(exc) or "Internal server error"
        details: Any = None

        if isinstance(exc, SQLAlchemyError):
            message = "Database operation failed"
            error_code = "database_error"
        elif isinstance(exc, ValidationError):
            details = exc.errors()
        elif isinstance(exc, ValueError):
            details = str(exc)

        self._log_error(request, status_code, error_code, message, exc)
        return self._build_response(status_code, message, error_code, details)

    def _status_from_exception(self, exc: Exception) -> Tuple[int, str]:
        for exc_type, (status_code, error_code) in self._EXCEPTION_STATUS_MAP.items():
            if isinstance(exc, exc_type):
                return status_code, error_code
        if isinstance(exc, SQLAlchemyError):
            return 500, "database_error"
        return 500, "internal_server_error"

    def _build_response(
        self,
        status_code: int,
        message: str,
        error_code: str,
        details: Any,
    ) -> JSONResponse:
        body = {
            "success": False,
            "error": {
                "message": message,
                "code": error_code,
                "details": details,
            },
        }
        return JSONResponse(status_code=status_code, content=body)

    def _log_error(
        self,
        request: Request,
        status_code: int,
        error_code: str,
        message: str,
        exc: Exception | None = None,
    ) -> None:
        extra = {
            "path": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "error_code": error_code,
        }
        if status_code >= 500:
            if exc is not None:
                logger.exception(
                    "Unhandled server error: %s", message, extra=extra, exc_info=exc
                )
            else:
                logger.error("Unhandled server error: %s", message, extra=extra)
        else:
            if exc is not None:
                logger.warning("Request failed: %s", message, extra=extra, exc_info=exc)
            else:
                logger.warning("Request failed: %s", message, extra=extra)

    @staticmethod
    def _extract_message(detail: Any, default: str) -> str:
        if isinstance(detail, str):
            return detail
        if isinstance(detail, dict):
            return (
                detail.get("message")
                or detail.get("detail")
                or detail.get("msg")
                or default
            )
        if isinstance(detail, Iterable) and not isinstance(
            detail, (str, bytes, bytearray)
        ):
            for item in detail:
                if isinstance(item, dict):
                    candidate = (
                        item.get("message")
                        or item.get("detail")
                        or item.get("msg")
                        or item.get("loc")
                    )
                    if candidate:
                        return str(candidate)
                elif isinstance(item, str):
                    return item
        return default

    @staticmethod
    def _extract_details(detail: Any) -> Any:
        if isinstance(detail, (dict, list)):
            return detail
        return None

    async def _normalize_error_response(
        self, request: Request, response: Response
    ) -> Response:
        body, headers = await self._consume_response_body(response)

        parsed_body: Any = None
        if body:
            try:
                parsed_body = json.loads(body.decode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                parsed_body = None

        if (
            isinstance(parsed_body, dict)
            and parsed_body.get("success") is False
            and isinstance(parsed_body.get("error"), dict)
        ):
            return Response(
                content=body,
                status_code=response.status_code,
                media_type=response.media_type or "application/json",
                headers=headers,
            )

        message = "Request failed"
        error_code = "http_error"
        details: Any = None

        if isinstance(parsed_body, dict):
            detail_section = parsed_body.get("detail")
            error_section = parsed_body.get("error")
            if isinstance(error_section, dict):
                message = error_section.get("message", message)
                error_code = error_section.get("code", error_code)
                details = error_section.get("details", detail_section)
            elif detail_section is not None:
                message = self._extract_message(detail_section, default=message)
                details = detail_section
                if isinstance(detail_section, dict):
                    error_code = detail_section.get("code", error_code)
            else:
                message = self._extract_message(parsed_body, default=message)
                details = parsed_body
        elif isinstance(parsed_body, list):
            message = self._extract_message(parsed_body, default=message)
            details = parsed_body
            if response.status_code == 422:
                error_code = "request_validation_error"
        elif body:
            message = body.decode(errors="ignore") or message

        if response.status_code == 422 and error_code == "http_error":
            error_code = "request_validation_error"

        self._log_error(request, response.status_code, error_code, message)

        normalized = {
            "success": False,
            "error": {
                "message": message,
                "code": error_code,
                "details": details,
            },
        }

        return JSONResponse(
            status_code=response.status_code, content=normalized, headers=headers
        )

    @staticmethod
    async def _consume_response_body(
        response: Response,
    ) -> tuple[bytes, Dict[str, str]]:
        body_chunks: list[bytes] = []
        body_iterator = getattr(response, "body_iterator", None)

        if body_iterator is not None:
            async for chunk in body_iterator:
                body_chunks.append(chunk)
        else:
            raw_body = getattr(response, "body", b"")
            if isinstance(raw_body, (bytes, bytearray)):
                body_chunks.append(bytes(raw_body))
            elif raw_body:
                body_chunks.append(str(raw_body).encode())

        body = b"".join(body_chunks)
        headers = dict(response.headers)
        headers.pop("content-length", None)
        return body, headers

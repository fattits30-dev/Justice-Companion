"""
Justice Companion FastAPI Backend
Main application entry point.

This backend replaces the Node.js Electron IPC handlers with HTTP REST API.
The Electron frontend will make HTTP requests to this backend instead of using IPC.
"""

import json
import logging
import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.models.base import init_db
from backend.routes import auth_router
from backend.routes.action_logs import router as action_logs_router
from backend.routes.ai_config import router as ai_config_router
from backend.routes.ai_status import router as ai_status_router
from backend.routes.cases import router as cases_router
from backend.routes.chat import router as chat_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.database import router as database_router
from backend.routes.deadlines import router as deadlines_router
from backend.routes.evidence import router as evidence_router
from backend.routes.export import router as export_router
from backend.routes.gdpr import router as gdpr_router
from backend.routes.port_status import router as port_status_router
from backend.routes.profile import router as profile_router
from backend.routes.search import router as search_router
from backend.routes.tags import router as tags_router
from backend.routes.templates import router as templates_router
from backend.routes.ui import router as ui_router

# Load environment variables from .env file
load_dotenv()

# Configure logging BEFORE any imports that create loggers
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    Application lifecycle manager.
    Initializes database on startup, cleanup on shutdown.
    """
    # Startup: Initialize database
    print("Initializing database...")
    init_db()
    print("Database initialized successfully")

    yield  # Application runs here

    # Shutdown: Cleanup
    print("Shutting down backend...")


# Create FastAPI application
app = FastAPI(
    title="Justice Companion API",
    description="REST API backend for Justice Companion desktop application",
    version="1.0.0",
    lifespan=lifespan,
)


# Response wrapper middleware to match frontend expectations
class ResponseWrapperMiddleware(BaseHTTPMiddleware):
    """
    Wraps all API responses in {success: true, data: {...}} format
    to match frontend apiClient expectations.

    Excludes: /health, /docs, /redoc, /openapi.json
    """

    async def dispatch(self, request: Request, call_next):
        print(f"[ResponseWrapperMiddleware] Intercepting request: {request.url.path}")

        # Skip wrapping for special endpoints
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            print(f"[ResponseWrapperMiddleware] Skipping {request.url.path}")
            return await call_next(request)

        response = await call_next(request)
        print(f"[ResponseWrapperMiddleware] Response status: {response.status_code}")

        # Only wrap successful JSON responses (all 2xx status codes)
        if 200 <= response.status_code < 300:
            # Read the original response body without assuming streaming attributes
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

            # Try to parse as JSON
            try:
                data = json.loads(bytes(body).decode())

                # If response is already wrapped with success field, don't wrap again
                if isinstance(data, dict) and "success" in data:
                    # Remove Content-Length - Response will recalculate it
                    headers = dict(response.headers)
                    headers.pop("content-length", None)

                    return Response(
                        content=body,
                        status_code=response.status_code,
                        media_type="application/json",
                        headers=headers,
                    )

                # Wrap the response
                wrapped = {"success": True, "data": data}

                # Remove Content-Length from headers - JSONResponse will recalculate it
                headers = dict(response.headers)
                headers.pop("content-length", None)

                return JSONResponse(
                    content=wrapped,
                    status_code=response.status_code,
                    headers=headers,
                )
            except json.JSONDecodeError:
                # Not a JSON response, return as is
                # Remove Content-Length - Response will recalculate it
                headers = dict(response.headers)
                headers.pop("content-length", None)

                return Response(
                    content=body,
                    status_code=response.status_code,
                    media_type=response.media_type,
                    headers=headers,
                )

        # For non-200 responses, return as is
        return response


# Add response wrapper middleware - wraps all 200 OK JSON responses for frontend
app.add_middleware(ResponseWrapperMiddleware)


# CORS configuration for frontend (Electron + PWA)
# Cloud-ready: Supports both local development and production PWA
def get_allowed_origins() -> list:
    """
    Get allowed CORS origins from environment.

    Development: Allow localhost for Electron app
    Production: Allow specific PWA domain
    """
    allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")

    if allowed_origins_env:
        # Production: Parse comma-separated origins from env var
        # Example: ALLOWED_ORIGINS=https://app.justicecompanion.com,https://justicecompanion.netlify.app
        origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
    else:
        # Development: Default to localhost for Electron app + Docker testing
        origins = [
            "http://localhost:5176",  # Vite dev server
            "http://localhost:5173",  # Vite dev server (alternate port)
            "http://127.0.0.1:5176",  # Localhost IPv4
            "http://127.0.0.1:5173",  # Localhost IPv4 (alternate)
        ]

        # Add Docker host IP origins for local testing (ports 5176-5180)
        docker_host_ip = "172.26.160.1"
        for docker_port in range(5176, 5181):
            origins.append(f"http://{docker_host_ip}:{docker_port}")

    print(f"CORS allowed origins: {origins}")
    return origins


# Add CORS middleware with environment-based origins
allowed_origins = get_allowed_origins()

# TEMPORARY: Force wildcard CORS for local testing
force_wildcard_cors = os.getenv("FORCE_WILDCARD_CORS", "false").lower() == "true"

if force_wildcard_cors:
    # Allow all origins (development/testing only)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",  # Allow all origins
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
else:
    # Production: Specific origins only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,  # Cache preflight requests for 1 hour
    )

# Register API routes
app.include_router(auth_router)  # Authentication routes at /auth/*
app.include_router(cases_router)  # Case management routes at /cases/*
app.include_router(dashboard_router)  # Dashboard routes at /dashboard/*
app.include_router(profile_router)  # Profile routes at /profile/*
app.include_router(evidence_router)  # Evidence routes at /evidence/*
app.include_router(chat_router)  # Chat routes at /chat/*
app.include_router(database_router)  # Database management routes at /database/*
app.include_router(deadlines_router)  # Deadline routes at /deadlines/*
app.include_router(export_router)  # Export routes at /export/*
app.include_router(gdpr_router)  # GDPR compliance routes at /gdpr/*
app.include_router(tags_router)  # Tag management routes at /tags/*
app.include_router(templates_router)  # Template management routes at /templates/*
app.include_router(search_router)  # Full-text search routes at /search/*
app.include_router(port_status_router)  # Port management routes at /port/*
app.include_router(action_logs_router)  # Action log monitoring routes at /action-logs/*
app.include_router(
    ui_router
)  # UI dialog routes at /dialog/* (501 Not Implemented - see route docs)
app.include_router(ai_status_router)  # AI service status routes at /ai/*
app.include_router(ai_config_router)  # AI configuration routes at /ai/*


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    Returns 200 OK if backend is running.
    """
    return {"status": "healthy", "service": "Justice Companion Backend", "version": "1.0.0"}


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint - basic API information.
    """
    return {
        "message": "Justice Companion API",
        "version": "1.0.0",
        "docs": "/docs",  # Swagger UI
        "redoc": "/redoc",  # ReDoc documentation
    }


if __name__ == "__main__":
    import uvicorn

    # Get configuration from environment
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "127.0.0.1")  # Cloud platforms use 0.0.0.0, local uses 127.0.0.1
    reload = os.getenv("RELOAD", "true").lower() == "true"  # Auto-reload in development only

    print(f"Starting Justice Companion Backend on {host}:{port}")
    print(f"Environment: {'Development' if reload else 'Production'}")
    print(f"Database: {os.getenv('DATABASE_URL', 'SQLite (local)')}")

    # Run with uvicorn
    uvicorn.run(
        "backend.main:app",
        host=host,  # Cloud-ready: 0.0.0.0 for cloud, 127.0.0.1 for local
        port=port,
        reload=reload,  # Auto-reload on code changes (development only)
        log_level="info",
    )

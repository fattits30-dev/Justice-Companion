"""
FastAPI integration example for AutoUpdater service.

Demonstrates how to integrate the AutoUpdater service with FastAPI
to provide update checking and downloading capabilities via REST API.

Features:
- REST endpoints for update operations
- Server-Sent Events (SSE) for real-time progress
- WebSocket support for live progress updates
- Background task scheduling for periodic checks
- Proper error handling and logging
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.services.auto_updater import (
    AutoUpdater,
    AutoUpdaterConfig,
    UpdateChannel,
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================


class UpdateCheckResponse(BaseModel):
    """Response model for update check."""

    update_available: bool
    current_version: str
    latest_version: Optional[str] = None
    update_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class UpdateDownloadRequest(BaseModel):
    """Request model for update download."""

    output_path: Optional[str] = None


class UpdateDownloadResponse(BaseModel):
    """Response model for update download."""

    success: bool
    file_path: Optional[str] = None
    error: Optional[str] = None
    checksum_verified: bool = False


class UpdateStatusResponse(BaseModel):
    """Response model for update status."""

    current_version: str
    latest_version: Optional[str] = None
    checking: bool = False
    update_available: bool = False
    downloading: bool = False
    update_downloaded: bool = False
    download_progress: Optional[float] = None
    error: Optional[str] = None


class UpdateConfigRequest(BaseModel):
    """Request model for update configuration."""

    check_on_startup: bool = True
    channel: str = "stable"
    timeout_seconds: int = 30


# ============================================================================
# GLOBAL STATE
# ============================================================================


# Global updater instance
updater: Optional[AutoUpdater] = None

# Background check scheduler
check_interval_hours = 6
last_check_time: Optional[datetime] = None

# WebSocket connections for progress updates
active_connections: list[WebSocket] = []


# ============================================================================
# LIFESPAN MANAGEMENT
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan (startup/shutdown)."""
    global updater

    # Startup
    logger.info("Starting AutoUpdater service...")

    config = AutoUpdaterConfig(
        check_on_startup=True, channel=UpdateChannel.STABLE, timeout_seconds=30, max_retries=3
    )

    updater = AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",  # TODO: Get from package/config
        config=config,
    )

    # Initialize and check for updates
    await updater.initialize()

    logger.info("AutoUpdater service started")

    yield

    # Shutdown
    logger.info("Shutting down AutoUpdater service...")
    if updater:
        await updater.close()
    logger.info("AutoUpdater service stopped")


# ============================================================================
# FASTAPI APPLICATION
# ============================================================================


app = FastAPI(
    title="Justice Companion - Auto Updater API",
    description="REST API for application update management",
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================================
# BACKGROUND TASKS
# ============================================================================


async def periodic_update_check():
    """Background task to periodically check for updates."""
    global last_check_time

    while True:
        try:
            # Check if enough time has passed
            now = datetime.now()

            if last_check_time:
                elapsed = now - last_check_time
                if elapsed < timedelta(hours=check_interval_hours):
                    # Wait until next check time
                    wait_seconds = (timedelta(hours=check_interval_hours) - elapsed).total_seconds()
                    await asyncio.sleep(wait_seconds)
                    continue

            # Perform update check
            logger.info("Performing periodic update check...")
            result = await updater.check_for_updates()

            if result.update_available:
                logger.info(f"Update available: {result.latest_version}")
                # TODO: Send notification to connected clients
            else:
                logger.info("No updates available")

            last_check_time = now

        except Exception as e:
            logger.error(f"Error in periodic update check: {e}")

        # Wait for next check
        await asyncio.sleep(check_interval_hours * 3600)


# ============================================================================
# REST ENDPOINTS
# ============================================================================


@app.get("/api/updates/check", response_model=UpdateCheckResponse)
async def check_updates():
    """
    Check for application updates.

    Returns:
        UpdateCheckResponse with update information
    """
    if not updater:
        raise HTTPException(status_code=503, detail="Updater service not available")

    try:
        result = await updater.check_for_updates()

        return UpdateCheckResponse(
            update_available=result.update_available,
            current_version=result.current_version,
            latest_version=result.latest_version,
            update_info=result.update_info.to_dict() if result.update_info else None,
            error=result.error,
        )

    except Exception as e:
        logger.exception("Error checking for updates")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/updates/download", response_model=UpdateDownloadResponse)
async def download_update(request: UpdateDownloadRequest):
    """
    Download the latest update.

    Args:
        request: Download request with optional output path

    Returns:
        UpdateDownloadResponse with download status
    """
    if not updater:
        raise HTTPException(status_code=503, detail="Updater service not available")

    try:
        # First check for updates
        check_result = await updater.check_for_updates()

        if not check_result.update_available or not check_result.update_info:
            raise HTTPException(status_code=404, detail="No update available")

        # Download update
        download_result = await updater.download_update(
            check_result.update_info, request.output_path
        )

        return UpdateDownloadResponse(
            success=download_result.success,
            file_path=download_result.file_path,
            error=download_result.error,
            checksum_verified=download_result.checksum_verified,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error downloading update")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/updates/status", response_model=UpdateStatusResponse)
async def get_update_status():
    """
    Get current update status.

    Returns:
        UpdateStatusResponse with current status
    """
    if not updater:
        raise HTTPException(status_code=503, detail="Updater service not available")

    try:
        status = updater.get_status()

        return UpdateStatusResponse(
            current_version=status.current_version,
            latest_version=status.latest_version,
            checking=status.checking,
            update_available=status.update_available,
            downloading=status.downloading,
            update_downloaded=status.update_downloaded,
            download_progress=status.download_progress,
            error=status.error,
        )

    except Exception as e:
        logger.exception("Error getting update status")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/updates/info")
async def get_update_info():
    """
    Get information about the updater configuration.

    Returns:
        Dictionary with updater information
    """
    if not updater:
        raise HTTPException(status_code=503, detail="Updater service not available")

    return {
        "current_version": updater.current_version,
        "update_source": updater.get_update_source(),
        "channel": updater.config.channel.value,
        "enabled": updater.is_enabled(),
        "last_check": last_check_time.isoformat() if last_check_time else None,
    }


# ============================================================================
# SERVER-SENT EVENTS (SSE) FOR PROGRESS
# ============================================================================


@app.get("/api/updates/download/stream")
async def download_update_stream():
    """
    Download update with Server-Sent Events for real-time progress.

    Returns:
        StreamingResponse with progress updates
    """
    if not updater:
        raise HTTPException(status_code=503, detail="Updater service not available")

    async def event_generator():
        """Generate SSE events for download progress."""
        try:
            # Check for updates
            yield f"data: {{'status': 'checking'}}\n\n"

            check_result = await updater.check_for_updates()

            if not check_result.update_available or not check_result.update_info:
                yield f"data: {{'status': 'no_update'}}\n\n"
                return

            # Send update info
            update_info = check_result.update_info
            yield f"data: {{'status': 'update_found', 'version': '{update_info.version}'}}\n\n"

            # Register progress callback
            progress_queue = asyncio.Queue()

            def on_progress(percent: float):
                asyncio.create_task(progress_queue.put(percent))

            updater.on_download_progress(on_progress)

            # Start download in background
            download_task = asyncio.create_task(updater.download_update(update_info))

            # Stream progress updates
            while not download_task.done():
                try:
                    percent = await asyncio.wait_for(progress_queue.get(), timeout=0.5)
                    yield f"data: {{'status': 'downloading', 'progress': {percent}}}\n\n"
                except asyncio.TimeoutError:
                    continue

            # Get download result
            download_result = await download_task

            if download_result.success:
                yield f"data: {{'status': 'complete', 'file_path': '{download_result.file_path}'}}\n\n"
            else:
                yield f"data: {{'status': 'error', 'error': '{download_result.error}'}}\n\n"

        except Exception as e:
            logger.exception("Error in download stream")
            yield f"data: {{'status': 'error', 'error': '{str(e)}'}}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ============================================================================
# WEBSOCKET FOR REAL-TIME PROGRESS
# ============================================================================


@app.websocket("/api/updates/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time update progress.

    Supports bidirectional communication for update operations.
    """
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            command = data.get("command")

            if command == "check":
                # Check for updates
                result = await updater.check_for_updates()
                await websocket.send_json({"type": "check_result", "data": result.to_dict()})

            elif command == "download":
                # Download update with progress
                check_result = await updater.check_for_updates()

                if check_result.update_available and check_result.update_info:
                    # Register progress callback
                    async def send_progress(percent: float):
                        await websocket.send_json({"type": "progress", "progress": percent})

                    # Note: Need to handle async callback differently
                    def on_progress(percent: float):
                        asyncio.create_task(send_progress(percent))

                    updater.on_download_progress(on_progress)

                    # Download
                    download_result = await updater.download_update(check_result.update_info)

                    await websocket.send_json(
                        {"type": "download_result", "data": download_result.to_dict()}
                    )
                else:
                    await websocket.send_json({"type": "error", "error": "No update available"})

            elif command == "status":
                # Get status
                status = updater.get_status()
                await websocket.send_json({"type": "status", "data": status.to_dict()})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("WebSocket error")
    finally:
        active_connections.remove(websocket)


# ============================================================================
# BACKGROUND TASK STARTUP
# ============================================================================


@app.on_event("startup")
async def start_background_tasks():
    """Start background tasks on application startup."""
    # Start periodic update check
    asyncio.create_task(periodic_update_check())
    logger.info("Background update checker started")


# ============================================================================
# HEALTH CHECK
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "updater_enabled": updater is not None and updater.is_enabled(),
        "timestamp": datetime.now().isoformat(),
    }


# ============================================================================
# RUN APPLICATION
# ============================================================================


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

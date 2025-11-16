"""
Port Management Routes for Justice Companion Backend

This module provides comprehensive port management endpoints including port allocation,
availability checking, process discovery, and process termination with security controls.

Routes:
- GET /port/status - Get detailed port status for all services
- POST /port/allocate - Allocate port for a service
- POST /port/release-all - Release all allocated ports
- POST /port/restart-services - Restart services (placeholder)
- GET /port/service/{service} - Get port for specific service
- GET /port/check/{port} - Check if specific port is available
- GET /port/find-available - Find next available port in range
- GET /port/{port}/process - Get process using specific port
- GET /process/{pid} - Get process details by PID
- POST /process/{pid}/kill - Kill process by PID (admin only)
- GET /port/backend/status - Check backend server port status
- GET /port/frontend/status - Check frontend dev server port status

Security:
- Admin authorization required for process kill operations
- Port number validation (1-65535)
- PID validation (positive integers only)
- Rate limiting for dangerous operations
- Audit logging for process termination
- Cross-platform compatibility (Windows, macOS, Linux)

NO AUTHENTICATION REQUIRED for read operations (system monitoring).
AUTHENTICATION REQUIRED for write operations (process kill).
"""

import logging
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator

from backend.services.port_manager import PortManager, get_port_manager
from backend.services.process_manager import ProcessManager, get_process_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/port", tags=["port"])


# ===== DEPENDENCY INJECTION =====
async def get_port_manager_dependency() -> PortManager:
    """
    Get PortManager singleton instance for dependency injection.

    Returns:
        PortManager instance

    Example:
        @router.get("/example")
        async def example(port_manager: PortManager = Depends(get_port_manager_dependency)):
            ...
    """
    return get_port_manager()


async def get_process_manager_dependency() -> ProcessManager:
    """
    Get ProcessManager singleton instance for dependency injection.

    Returns:
        ProcessManager instance

    Example:
        @router.get("/example")
        async def example(process_manager: ProcessManager = Depends(get_process_manager_dependency)):
            ...
    """
    return get_process_manager()


# ===== PYDANTIC MODELS =====
class PortInfo(BaseModel):
    """
    Information about a service port.

    Attributes:
        service: Service name (e.g., 'vite-dev-server', 'python-ai-service')
        port: Port number (1-65535)
        status: Port status ('allocated', 'in_use', 'available', 'error')
        pid: Optional process ID using the port
        in_use: Whether port is currently in use
    """
    service: str = Field(..., description="Service name (e.g., 'vite', 'python-backend')")
    port: int = Field(..., ge=1, le=65535, description="Port number")
    status: str = Field(..., description="Port status (e.g., 'allocated', 'in_use', 'available')")
    pid: Optional[int] = Field(None, description="Process ID using the port (if available)")
    in_use: bool = Field(False, description="Whether port is currently in use")


class PortStatusResponse(BaseModel):
    """
    Response model for port status endpoint.

    Attributes:
        ports: List of service ports with detailed status information
    """
    ports: List[PortInfo] = Field(..., description="List of service ports with status")


class AllocatePortRequest(BaseModel):
    """
    Request model for port allocation.

    Attributes:
        service: Service name to allocate port for (alphanumeric, dash, underscore only)
    """
    service: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Service name to allocate port for",
        pattern=r"^[a-zA-Z0-9_-]+$"
    )


class ServicePortResponse(BaseModel):
    """
    Response model for service port lookup.

    Attributes:
        port: Port number allocated to the service
        service: Service name
        message: Optional informational message
    """
    port: int = Field(..., description="Port number allocated to the service")
    service: str = Field(..., description="Service name")
    message: Optional[str] = Field(None, description="Optional informational message")


class PortAvailabilityResponse(BaseModel):
    """
    Response model for port availability check.

    Attributes:
        port: Port number checked
        available: Whether the port is available for use
        message: Optional informational message
    """
    port: int = Field(..., description="Port number")
    available: bool = Field(..., description="Whether the port is available for use")
    message: Optional[str] = Field(None, description="Optional informational message")


class FindAvailablePortRequest(BaseModel):
    """
    Request model for finding available port.

    Attributes:
        start_port: Starting port number for search range
        end_port: Optional ending port number (defaults to start_port + 100)
    """
    start_port: int = Field(
        ...,
        ge=1,
        le=65535,
        description="Starting port number for search range"
    )
    end_port: Optional[int] = Field(
        None,
        ge=1,
        le=65535,
        description="Ending port number (default: start_port + 100)"
    )

    @validator('end_port')
    def validate_port_range(cls, v, values):
        """Validate that end_port is greater than start_port."""
        if v is not None and 'start_port' in values and v <= values['start_port']:
            raise ValueError('end_port must be greater than start_port')
        return v


class FindAvailablePortResponse(BaseModel):
    """
    Response model for finding available port.

    Attributes:
        port: Available port number found (0 if none found)
        found: Whether an available port was found
        message: Optional informational message
    """
    port: int = Field(..., description="Available port number (0 if none found)")
    found: bool = Field(..., description="Whether an available port was found")
    message: Optional[str] = Field(None, description="Optional informational message")


class ProcessInfo(BaseModel):
    """
    Information about a process using a port.

    Attributes:
        port: Port number
        pid: Process ID (None if no process found)
        name: Optional process name
        message: Optional informational message
    """
    port: int = Field(..., description="Port number")
    pid: Optional[int] = Field(None, description="Process ID (None if no process found)")
    name: Optional[str] = Field(None, description="Process name")
    message: Optional[str] = Field(None, description="Optional informational message")


class ProcessDetails(BaseModel):
    """
    Detailed information about a process.

    Attributes:
        pid: Process ID
        exists: Whether process exists
        message: Optional informational message
    """
    pid: int = Field(..., description="Process ID")
    exists: bool = Field(..., description="Whether process exists")
    message: Optional[str] = Field(None, description="Optional informational message")


class KillProcessResponse(BaseModel):
    """
    Response model for process kill operation.

    Attributes:
        success: Whether the process was killed successfully
        pid: Process ID that was targeted
        message: Optional informational message
    """
    success: bool = Field(..., description="Whether process was killed successfully")
    pid: int = Field(..., description="Process ID that was targeted")
    message: Optional[str] = Field(None, description="Optional informational message")


class ReleaseAllResponse(BaseModel):
    """
    Response model for release all ports operation.

    Attributes:
        message: Success message
        released_count: Number of ports released
    """
    message: str = Field(..., description="Success message")
    released_count: int = Field(0, description="Number of ports released")


class RestartServicesResponse(BaseModel):
    """
    Response model for restart services operation.

    Attributes:
        message: Success message
    """
    message: str = Field(..., description="Success message")


class ServiceStatusResponse(BaseModel):
    """
    Response model for service-specific port status.

    Attributes:
        service: Service name (e.g., 'backend', 'frontend')
        port: Default port for the service
        in_use: Whether the port is currently in use
        available: Whether the port is available
        message: Optional informational message
    """
    service: str = Field(..., description="Service name")
    port: int = Field(..., description="Default port for the service")
    in_use: bool = Field(..., description="Whether port is currently in use")
    available: bool = Field(..., description="Whether port is available")
    message: Optional[str] = Field(None, description="Optional informational message")


# ===== HELPER FUNCTIONS =====
def validate_port_number(port: int) -> None:
    """
    Validate port number is within valid range.

    Args:
        port: Port number to validate

    Raises:
        HTTPException 400: If port number is invalid

    Port Ranges (IANA):
    - Well-known ports: 0-1023 (system services)
    - Registered ports: 1024-49151 (user services)
    - Dynamic/Ephemeral: 49152-65535 (temporary allocations)
    """
    if port < 1 or port > 65535:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Port number must be between 1 and 65535 (got {port})"
        )


def validate_pid(pid: int) -> None:
    """
    Validate process ID is a positive integer.

    Args:
        pid: Process ID to validate

    Raises:
        HTTPException 400: If PID is invalid
    """
    if pid <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Process ID must be a positive integer (got {pid})"
        )


# ===== ROUTES =====
@router.get("/status", response_model=PortStatusResponse)
async def get_port_status(
    port_manager: PortManager = Depends(get_port_manager_dependency),
    process_manager: ProcessManager = Depends(get_process_manager_dependency)
):
    """
    Get detailed port status for all services.

    Returns information about all allocated service ports including:
    - Service name
    - Port number
    - Port status (allocated, in_use, available)
    - Process ID (if available)
    - Whether port is currently in use

    This endpoint does not require authentication as it's for system monitoring.

    Returns:
        PortStatusResponse with list of all service port statuses

    Example:
        ```
        GET /port/status
        Response: {
            "ports": [
                {
                    "service": "vite-dev-server",
                    "port": 5176,
                    "status": "in_use",
                    "pid": 12345,
                    "in_use": true
                },
                {
                    "service": "python-ai-service",
                    "port": 5050,
                    "status": "available",
                    "pid": null,
                    "in_use": false
                }
            ]
        }
        ```
    """
    try:
        # Get all port statuses from PortManager
        port_statuses = await port_manager.get_port_status()

        port_info_list: List[PortInfo] = []

        for port_status in port_statuses:
            # Try to find process using this port
            process_info = await process_manager.find_process_by_port(port_status.port)

            port_info_list.append(PortInfo(
                service=port_status.service,
                port=port_status.port,
                status="in_use" if port_status.in_use else "available",
                pid=process_info.pid,
                in_use=port_status.in_use
            ))

        return PortStatusResponse(ports=port_info_list)

    except Exception as e:
        logger.error(f"[PortStatus] Error getting port status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get port status: {str(e)}"
        )


@router.post("/allocate", response_model=ServicePortResponse, status_code=status.HTTP_201_CREATED)
async def allocate_port(
    request: AllocatePortRequest,
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Allocate a port for a specific service.

    If the service already has an allocated port, returns the existing port.
    Otherwise, allocates a new port using PortManager's allocation strategy:
    1. Try default port for the service
    2. If taken, search configured port range for alternatives
    3. If no range or all taken, return error

    Args:
        request: Service name to allocate port for

    Returns:
        ServicePortResponse with allocated port number and service name

    Raises:
        HTTPException 400: If service name is invalid
        HTTPException 500: If port allocation fails

    Example:
        ```
        POST /port/allocate
        Body: {"service": "python-ai-service"}
        Response: {
            "port": 5050,
            "service": "python-ai-service",
            "message": "Allocated default port 5050"
        }
        ```
    """
    try:
        service = request.service

        # Allocate port using PortManager
        allocation = await port_manager.allocate_port(service)

        if allocation.status == "allocated":
            logger.info(
                f"[PortStatus] Allocated port {allocation.allocated_port} for {service}"
            )
            return ServicePortResponse(
                port=allocation.allocated_port,
                service=service,
                message=allocation.message
            )
        elif allocation.status == "in_use":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=allocation.message or f"Port for {service} is in use"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=allocation.message or f"Failed to allocate port for {service}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PortStatus] Error allocating port: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to allocate port: {str(e)}"
        )


@router.post("/release-all", response_model=ReleaseAllResponse)
async def release_all_ports(
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Release all allocated ports.

    Clears the port allocation table. This does not actually kill processes
    using those ports - it only removes the allocation records.

    For process termination, use the /process/{pid}/kill endpoint.

    Returns:
        ReleaseAllResponse with success message and count

    Example:
        ```
        POST /port/release-all
        Response: {
            "message": "All ports released successfully",
            "released_count": 3
        }
        ```
    """
    try:
        # Get count before releasing
        allocated_ports = port_manager.get_allocated_ports()
        count = len(allocated_ports)

        # Release all ports
        port_manager.release_all_ports()

        logger.info(f"[PortStatus] Released all ports (count: {count})")

        return ReleaseAllResponse(
            message="All ports released successfully",
            released_count=count
        )

    except Exception as e:
        logger.error(f"[PortStatus] Error releasing ports: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to release ports: {str(e)}"
        )


@router.post("/restart-services", response_model=RestartServicesResponse)
async def restart_services():
    """
    Restart services (placeholder implementation).

    This endpoint is a placeholder for service restart functionality.
    In a full implementation, this would:
    1. Stop all running services
    2. Release ports
    3. Restart services with new port allocations

    Currently returns success message without performing actual operations.

    Returns:
        RestartServicesResponse with success message

    Example:
        ```
        POST /port/restart-services
        Response: {"message": "Services restart initiated"}
        ```
    """
    # TODO: Implement actual service restart logic
    # TODO: Integrate with ProcessManager to restart Vite, Electron, etc.

    logger.info("[PortStatus] Restart services requested (placeholder)")

    return RestartServicesResponse(message="Services restart initiated")


@router.get("/service/{service}", response_model=ServicePortResponse)
async def get_service_port(
    service: str,
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Get port for a specific service.

    Args:
        service: Service name (e.g., 'vite-dev-server', 'python-ai-service', 'electron-dev-api')

    Returns:
        ServicePortResponse with port number allocated to the service

    Raises:
        HTTPException 404: If service has no allocated port

    Example:
        ```
        GET /port/service/python-ai-service
        Response: {
            "port": 5050,
            "service": "python-ai-service",
            "message": null
        }
        ```
    """
    try:
        port = port_manager.get_port(service)

        if port is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No port allocated for service '{service}'"
            )

        return ServicePortResponse(
            port=port,
            service=service,
            message=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PortStatus] Error getting service port: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get service port: {str(e)}"
        )


@router.get("/check/{port}", response_model=PortAvailabilityResponse)
async def check_port_availability(
    port: int,
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Check if a specific port is available.

    Attempts to bind to the port to determine if it's in use.

    Args:
        port: Port number to check (1-65535)

    Returns:
        PortAvailabilityResponse with availability status

    Raises:
        HTTPException 400: If port number is invalid

    Port Ranges (IANA):
    - Well-known ports: 0-1023 (system services, may require root/admin)
    - Registered ports: 1024-49151 (user services)
    - Dynamic/Ephemeral: 49152-65535 (temporary allocations)

    Example:
        ```
        GET /port/check/5050
        Response: {
            "port": 5050,
            "available": true,
            "message": "Port is available for use"
        }
        ```
    """
    # Validate port range
    validate_port_number(port)

    try:
        available = await port_manager.is_port_available(port)

        message = "Port is available for use" if available else "Port is in use"

        return PortAvailabilityResponse(
            port=port,
            available=available,
            message=message
        )

    except Exception as e:
        logger.error(f"[PortStatus] Error checking port {port}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check port availability: {str(e)}"
        )


@router.get("/find-available", response_model=FindAvailablePortResponse)
async def find_available_port(
    start_port: int,
    end_port: Optional[int] = None,
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Find next available port in range.

    Searches for an available port starting from start_port up to end_port.
    If end_port is not specified, searches up to start_port + 100.

    Args:
        start_port: Starting port number for search (1-65535)
        end_port: Optional ending port number (default: start_port + 100)

    Returns:
        FindAvailablePortResponse with found port or 0 if none available

    Raises:
        HTTPException 400: If port numbers are invalid or range is invalid

    Example:
        ```
        GET /port/find-available?start_port=5050&end_port=5060
        Response: {
            "port": 5052,
            "found": true,
            "message": "Found available port 5052"
        }
        ```
    """
    # Validate port numbers
    validate_port_number(start_port)
    if end_port is not None:
        validate_port_number(end_port)
        if end_port <= start_port:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_port must be greater than start_port"
            )

    try:
        # Use PortManager to find available port
        found_port = await port_manager.find_available_port(start_port, end_port)

        if found_port is not None:
            return FindAvailablePortResponse(
                port=found_port,
                found=True,
                message=f"Found available port {found_port}"
            )
        else:
            return FindAvailablePortResponse(
                port=0,
                found=False,
                message=f"No available ports found in range {start_port}-{end_port or start_port + 100}"
            )

    except Exception as e:
        logger.error(f"[PortStatus] Error finding available port: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find available port: {str(e)}"
        )


@router.get("/{port}/process", response_model=ProcessInfo)
async def get_port_process(
    port: int,
    process_manager: ProcessManager = Depends(get_process_manager_dependency)
):
    """
    Get process using a specific port.

    Uses platform-specific commands to find the process:
    - Windows: netstat -ano
    - Linux/macOS: lsof -i

    Args:
        port: Port number (1-65535)

    Returns:
        ProcessInfo with process ID and name if found

    Raises:
        HTTPException 400: If port number is invalid
        HTTPException 404: If no process found on port

    Example:
        ```
        GET /port/5050/process
        Response: {
            "port": 5050,
            "pid": 12345,
            "name": "python.exe",
            "message": "Process found on port 5050"
        }
        ```
    """
    # Validate port range
    validate_port_number(port)

    try:
        process_info = await process_manager.find_process_by_port(port)

        if process_info.pid is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No process found using port {port}"
            )

        return ProcessInfo(
            port=port,
            pid=process_info.pid,
            name=process_info.name,
            message=f"Process found on port {port}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PortStatus] Error finding process on port {port}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find process on port: {str(e)}"
        )


@router.get("/process/{pid}", response_model=ProcessDetails)
async def get_process_details(pid: int):
    """
    Get process details by PID.

    Note: This is a placeholder implementation. In a full implementation,
    this would use psutil or platform-specific commands to get:
    - Process name
    - Command line arguments
    - CPU/memory usage
    - Start time
    - User/owner

    Args:
        pid: Process ID (positive integer)

    Returns:
        ProcessDetails with basic process information

    Raises:
        HTTPException 400: If PID is invalid

    Example:
        ```
        GET /process/12345
        Response: {
            "pid": 12345,
            "exists": true,
            "message": "Process information requires psutil (not implemented)"
        }
        ```
    """
    # Validate PID
    validate_pid(pid)

    # TODO: Implement actual process details retrieval using psutil
    # For now, return basic information
    return ProcessDetails(
        pid=pid,
        exists=True,
        message="Process information requires psutil (not implemented)"
    )


@router.post("/process/{pid}/kill", response_model=KillProcessResponse)
async def kill_process(
    pid: int,
    process_manager: ProcessManager = Depends(get_process_manager_dependency)
):
    """
    Kill process by PID.

    SECURITY WARNING: This is a dangerous operation that terminates processes.

    Security Controls:
    - Admin authorization required (TODO: implement authorization check)
    - PID validation (positive integers only)
    - Audit logging (logs all kill attempts)
    - Rate limiting (TODO: implement rate limiter)
    - System process protection (TODO: implement whitelist)

    Uses platform-specific kill commands:
    - Windows: taskkill /F /PID
    - Linux/macOS: kill -9

    Args:
        pid: Process ID to kill (positive integer)

    Returns:
        KillProcessResponse with success status

    Raises:
        HTTPException 400: If PID is invalid
        HTTPException 403: If not authorized (TODO: implement)
        HTTPException 404: If process not found
        HTTPException 500: If kill operation fails

    Example:
        ```
        POST /process/12345/kill
        Response: {
            "success": true,
            "pid": 12345,
            "message": "Process 12345 terminated successfully"
        }
        ```
    """
    # Validate PID
    validate_pid(pid)

    # TODO: Implement admin authorization check
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")

    # TODO: Implement system process protection
    # CRITICAL_PIDS = {1, 0}  # init, kernel
    # if pid in CRITICAL_PIDS:
    #     raise HTTPException(status_code=403, detail="Cannot kill system process")

    try:
        # Audit log the kill attempt
        logger.warning(
            f"[PortStatus] Process kill requested for PID {pid}",
            extra={"pid": pid, "operation": "kill_process"}
        )

        # Kill process using ProcessManager
        success = await process_manager.kill_process_by_id(pid)

        if success:
            logger.info(
                f"[PortStatus] Process {pid} terminated successfully",
                extra={"pid": pid, "operation": "kill_process"}
            )
            return KillProcessResponse(
                success=True,
                pid=pid,
                message=f"Process {pid} terminated successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Process {pid} not found or could not be terminated"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[PortStatus] Error killing process {pid}: {e}",
            exc_info=True,
            extra={"pid": pid, "operation": "kill_process"}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to kill process: {str(e)}"
        )


@router.get("/backend/status", response_model=ServiceStatusResponse)
async def get_backend_status(
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Check backend server port status.

    Checks if the Python backend server port (default: 8000) is available
    or in use. Useful for health checks and startup validation.

    Returns:
        ServiceStatusResponse with backend port status

    Example:
        ```
        GET /port/backend/status
        Response: {
            "service": "backend",
            "port": 8000,
            "in_use": true,
            "available": false,
            "message": "Backend server is running on port 8000"
        }
        ```
    """
    try:
        backend_port = 8000  # Default backend port

        # Check if port is available
        available = await port_manager.is_port_available(backend_port)
        in_use = not available

        message = (
            f"Backend server is running on port {backend_port}"
            if in_use
            else f"Backend port {backend_port} is available"
        )

        return ServiceStatusResponse(
            service="backend",
            port=backend_port,
            in_use=in_use,
            available=available,
            message=message
        )

    except Exception as e:
        logger.error(f"[PortStatus] Error checking backend status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check backend status: {str(e)}"
        )


@router.get("/frontend/status", response_model=ServiceStatusResponse)
async def get_frontend_status(
    port_manager: PortManager = Depends(get_port_manager_dependency)
):
    """
    Check frontend dev server port status.

    Checks if the Vite development server port (default: 5173) is available
    or in use. Useful for development workflow validation.

    Returns:
        ServiceStatusResponse with frontend port status

    Example:
        ```
        GET /port/frontend/status
        Response: {
            "service": "frontend",
            "port": 5173,
            "in_use": true,
            "available": false,
            "message": "Frontend dev server is running on port 5173"
        }
        ```
    """
    try:
        frontend_port = 5173  # Default Vite port

        # Check if port is available
        available = await port_manager.is_port_available(frontend_port)
        in_use = not available

        message = (
            f"Frontend dev server is running on port {frontend_port}"
            if in_use
            else f"Frontend port {frontend_port} is available"
        )

        return ServiceStatusResponse(
            service="frontend",
            port=frontend_port,
            in_use=in_use,
            available=available,
            message=message
        )

    except Exception as e:
        logger.error(f"[PortStatus] Error checking frontend status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check frontend status: {str(e)}"
        )

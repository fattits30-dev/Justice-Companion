"""
Process Management Service for Justice Companion Backend

Migrated from: src/services/ProcessManager.ts

This module provides centralized process lifecycle management for the Justice Companion
backend, including process spawning, monitoring, termination, and single-instance enforcement.

Key Features:
- Single instance lock enforcement
- Port-based process discovery and management
- Process monitoring and health checks
- Graceful shutdown handling
- Cross-platform process operations (Windows, Linux, macOS)
- Automatic cleanup on startup
- Managed port tracking
- Shutdown handler registration

Example:
    ```python
    from backend.services.process_manager import ProcessManager, get_process_manager

    # Get singleton instance
    process_manager = get_process_manager()

    # Check if port is in use
    if await process_manager.is_port_in_use(5050):
        print("Port 5050 is in use")

    # Find process using a port
    process_info = await process_manager.find_process_by_port(5050)
    if process_info.pid:
        print(f"Process {process_info.pid} is using port 5050")

    # Kill process on port
    success = await process_manager.kill_process_on_port(5050)

    # Register shutdown handler
    async def cleanup():
        print("Shutting down...")

    process_manager.add_shutdown_handler(cleanup)
    ```
"""

import asyncio
import logging
import platform
import threading
import signal
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Callable, Awaitable, Union

logger = logging.getLogger(__name__)

@dataclass
class ProcessInfo:
    """
    Information about a process.

    Attributes:
        pid: Process ID (None if not found)
        name: Optional process name
    """

    pid: Optional[int] = None
    name: Optional[str] = None

@dataclass
class PortStatus:
    """
    Status of a managed port.

    Attributes:
        port: Port number
        name: Service name using this port
        in_use: Whether the port is currently in use
    """

    port: int
    name: str
    in_use: bool

@dataclass
class ProcessStatus:
    """
    Overall process status information.

    Attributes:
        is_running: Whether the main process is running
        start_time: When the process manager was initialized
        ports: List of managed port statuses
    """

    is_running: bool
    start_time: datetime
    ports: List[PortStatus] = field(default_factory=list)

class ProcessManager:
    """
    Centralized process lifecycle management for Justice Companion backend.

    Handles process discovery, monitoring, termination, and single-instance enforcement.
    Thread-safe implementation with graceful shutdown handling.

    Example:
        >>> process_manager = ProcessManager()
        >>> await process_manager.cleanup_on_startup()
        >>> process_manager.register_managed_port(5050, "python-ai-service")
        >>> status = await process_manager.get_process_status()
        >>> print(f"Running: {status.is_running}")
    """

    def __init__(self):
        """Initialize ProcessManager."""
        self.start_time: datetime = datetime.now()
        self.managed_ports: Dict[int, str] = {}
        self.shutdown_handlers: List[Callable[[], Union[None, Awaitable[None]]]] = []
        self._lock = threading.RLock()
        self._shutdown_in_progress = False
        self._single_instance_lock = False

    def enforce_single_instance(self) -> bool:
        """
        Enforce single instance lock.

        In Python backend context, this is a logical lock since we don't have
        Electron's app.requestSingleInstanceLock(). This can be used with
        file locks or other mechanisms if needed.

        Returns:
            True if lock acquired, False if another instance is running

        Example:
            >>> if not process_manager.enforce_single_instance():
            ...     sys.exit(1)
        """
        with self._lock:
            if self._single_instance_lock:
                logger.error(
                    "[ProcessManager] Another instance is already running",
                    extra={"service": "ProcessManager", "operation": "enforce_single_instance"},
                )
                return False

            self._single_instance_lock = True
            logger.info(
                "[ProcessManager] Single instance lock acquired",
                extra={"service": "ProcessManager"},
            )
            return True

    def on_second_instance(self, callback: Callable[[], None]) -> None:
        """
        Register callback for when a second instance is launched.

        Note: In Python context, this would require external implementation
        (e.g., socket-based IPC or file-based signaling).

        Args:
            callback: Function to call when second instance detected

        Example:
            >>> def handle_second_instance():
            ...     print("Second instance detected")
            >>> process_manager.on_second_instance(handle_second_instance)
        """
        logger.warning(
            "[ProcessManager] Second instance callback registered (requires external implementation)",
            extra={"service": "ProcessManager"},
        )
        # Store callback for potential future use
        if not hasattr(self, "_second_instance_callbacks"):
            self._second_instance_callbacks: List[Callable[[], None]] = []
        self._second_instance_callbacks.append(callback)

    async def is_port_in_use(self, port: int, host: str = "127.0.0.1") -> bool:
        """
        Check if a port is currently in use.

        Args:
            port: Port number to check
            host: Host address (default: '127.0.0.1')

        Returns:
            True if port is in use, False if available

        Example:
            >>> in_use = await process_manager.is_port_in_use(5050)
            >>> if in_use:
            ...     print("Port 5050 is in use")
        """
        import socket

        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(0.5)
                result = sock.connect_ex((host, port))
                # Result 0 means connection successful (port in use)
                return result == 0
        except socket.error as e:
            logger.debug(
                f"[ProcessManager] Error checking port {port}: {e}",
                extra={"service": "ProcessManager", "port": port},
            )
            return False
        except Exception as exc:
            logger.error(
                f"[ProcessManager] Unexpected error checking port {port}: {e}",
                exc_info=True,
                extra={"service": "ProcessManager", "port": port},
            )
            return False

    async def find_process_by_port(self, port: int) -> ProcessInfo:
        """
        Find process using a specific port.

        Uses platform-specific commands:
        - Windows: netstat -ano
        - Linux/macOS: lsof -i

        Args:
            port: Port number to search for

        Returns:
            ProcessInfo with PID if found, otherwise pid=None

        Example:
            >>> process_info = await process_manager.find_process_by_port(5050)
            >>> if process_info.pid:
            ...     print(f"Process {process_info.pid} is using port 5050")
        """
        try:
            system = platform.system().lower()

            if system == "windows":
                # Windows: Use netstat -ano
                result = await asyncio.create_subprocess_shell(
                    f"netstat -ano | findstr :{port}",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await result.communicate()
                output = stdout.decode("utf-8", errors="ignore").strip()

                if output:
                    lines = output.split("\n")
                    for line in lines:
                        if "LISTENING" in line:
                            # Extract PID from end of line
                            parts = line.split()
                            if parts:
                                try:
                                    pid = int(parts[-1])
                                    return ProcessInfo(pid=pid)
                                except (ValueError, IndexError):
                                    continue

            elif system in ["linux", "darwin"]:
                # Linux/macOS: Use lsof
                result = await asyncio.create_subprocess_shell(
                    f"lsof -i :{port} -t",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await result.communicate()
                output = stdout.decode("utf-8", errors="ignore").strip()

                if output:
                    try:
                        pid = int(output.split()[0])
                        return ProcessInfo(pid=pid)
                    except (ValueError, IndexError):
                        pass

            return ProcessInfo(pid=None)

        except Exception as exc:
            logger.debug(
                f"[ProcessManager] Error finding process on port {port}: {e}",
                extra={"service": "ProcessManager", "port": port},
            )
            return ProcessInfo(pid=None)

    async def get_process_status(self) -> ProcessStatus:
        """
        Get overall process status information.

        Returns:
            ProcessStatus with current state and port information

        Example:
            >>> status = await process_manager.get_process_status()
            >>> print(f"Running: {status.is_running}, Ports: {len(status.ports)}")
        """
        ports: List[PortStatus] = []

        with self._lock:
            for port, name in self.managed_ports.items():
                in_use = await self.is_port_in_use(port)
                ports.append(PortStatus(port=port, name=name, in_use=in_use))

        return ProcessStatus(is_running=True, start_time=self.start_time, ports=ports)

    def register_managed_port(self, port: int, name: str) -> None:
        """
        Register a port to be managed by this process.

        Args:
            port: Port number
            name: Service name using this port

        Example:
            >>> process_manager.register_managed_port(5050, "python-ai-service")
        """
        with self._lock:
            self.managed_ports[port] = name
            logger.info(
                f"[ProcessManager] Registered managed port {port} ({name})",
                extra={"service": "ProcessManager", "port": port, "name": name},
            )

    def add_shutdown_handler(self, handler: Callable[[], Union[None, Awaitable[None]]]) -> None:
        """
        Add shutdown handler to be called on cleanup.

        Handlers can be sync or async functions.

        Args:
            handler: Function to call during shutdown

        Example:
            >>> async def cleanup():
            ...     print("Cleaning up...")
            >>> process_manager.add_shutdown_handler(cleanup)
        """
        with self._lock:
            self.shutdown_handlers.append(handler)
            logger.debug(
                "[ProcessManager] Added shutdown handler",
                extra={"service": "ProcessManager", "handler_count": len(self.shutdown_handlers)},
            )

    async def kill_process_on_port(self, port: int) -> bool:
        """
        Kill process running on a specific port.

        Uses platform-specific kill commands:
        - Windows: taskkill /F /PID
        - Linux/macOS: kill -9

        Args:
            port: Port number

        Returns:
            True if process killed successfully, False otherwise

        Example:
            >>> success = await process_manager.kill_process_on_port(5050)
            >>> if success:
            ...     print("Process terminated")
        """
        try:
            process_info = await self.find_process_by_port(port)

            if not process_info.pid:
                logger.debug(
                    f"[ProcessManager] No process found on port {port}",
                    extra={"service": "ProcessManager", "port": port},
                )
                return False

            success = await self.kill_process_by_id(process_info.pid)

            if success:
                logger.info(
                    f"[ProcessManager] Killed process {process_info.pid} on port {port}",
                    extra={"service": "ProcessManager", "port": port, "pid": process_info.pid},
                )

            return success

        except Exception as exc:
            logger.error(
                f"[ProcessManager] Error killing process on port {port}: {e}",
                exc_info=True,
                extra={"service": "ProcessManager", "port": port},
            )
            return False

    async def cleanup_on_startup(self) -> None:
        """
        Clean up processes on startup.

        Kills any lingering processes from previous runs on managed ports.

        Example:
            >>> await process_manager.cleanup_on_startup()
        """
        logger.info(
            "[ProcessManager] Starting cleanup on startup", extra={"service": "ProcessManager"}
        )

        with self._lock:
            managed_ports_copy = dict(self.managed_ports)

        for port, name in managed_ports_copy.items():
            try:
                in_use = await self.is_port_in_use(port)
                if in_use:
                    logger.info(
                        f"[ProcessManager] Port {port} ({name}) is in use, attempting cleanup...",
                        extra={"service": "ProcessManager", "port": port, "name": name},
                    )
                    await self.kill_process_on_port(port)
            except Exception as exc:
                # Log error but don't throw - cleanup should continue
                self.log_error(
                    e if isinstance(e, Exception) else Exception(str(e)),
                    {"operation": "cleanup_on_startup", "port": port, "name": name},
                )

        logger.info(
            "[ProcessManager] Cleanup on startup completed", extra={"service": "ProcessManager"}
        )

    def register_shutdown_handlers(self) -> None:
        """
        Register shutdown handlers for graceful cleanup.

        Sets up signal handlers for SIGTERM and SIGINT.

        Example:
            >>> process_manager.register_shutdown_handlers()
        """

        def signal_handler(signum, frame):
            logger.info(
                f"[ProcessManager] Received signal {signum}, initiating shutdown",
                extra={"service": "ProcessManager", "signal": signum},
            )
            # Run shutdown handlers synchronously
            asyncio.run(self.execute_shutdown_handlers())

        # Register signal handlers
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)

        logger.info(
            "[ProcessManager] Registered shutdown signal handlers",
            extra={"service": "ProcessManager"},
        )

    def on_shutdown(self, callback: Callable[[], Union[None, Awaitable[None]]]) -> None:
        """
        Register shutdown callback (alias for add_shutdown_handler).

        Args:
            callback: Function to call during shutdown

        Example:
            >>> process_manager.on_shutdown(lambda: print("Shutting down"))
        """
        self.add_shutdown_handler(callback)

    async def get_status(self) -> ProcessStatus:
        """
        Get status (alias for get_process_status).

        Returns:
            ProcessStatus with current state

        Example:
            >>> status = await process_manager.get_status()
        """
        return await self.get_process_status()

    def track_port(self, port: int, name: str) -> None:
        """
        Track port (alias for register_managed_port).

        Args:
            port: Port number
            name: Service name

        Example:
            >>> process_manager.track_port(5050, "ai-service")
        """
        self.register_managed_port(port, name)

    async def ensure_port_available(self, port: int, max_retries: int = 1) -> bool:
        """
        Ensure port is available.

        Attempts to free the port by killing processes if necessary.

        Args:
            port: Port number to ensure is available
            max_retries: Maximum number of retry attempts (default: 1)

        Returns:
            True if port is available, False otherwise

        Example:
            >>> if await process_manager.ensure_port_available(5050, max_retries=3):
            ...     print("Port 5050 is now available")
        """
        for attempt in range(max_retries):
            in_use = await self.is_port_in_use(port)
            if not in_use:
                return True

            logger.info(
                f"[ProcessManager] Port {port} in use, attempting to free (attempt {attempt + 1}/{max_retries})",
                extra={"service": "ProcessManager", "port": port, "attempt": attempt + 1},
            )

            await self.kill_process_on_port(port)

            # Wait a bit for process to terminate
            await asyncio.sleep(0.5)

        return False

    def log_error(self, error: Exception, context: Optional[Dict] = None) -> None:
        """
        Log error with context.

        Args:
            error: Exception to log
            context: Additional context information

        Example:
            >>> process_manager.log_error(
            ...     Exception("Failed to kill process"),
            ...     {"port": 5050, "pid": 1234}
            ... )
        """
        error_context = {"service": "ProcessManager"}
        if context:
            error_context.update(context)

        logger.error(f"[ProcessManager] {error}", exc_info=True, extra=error_context)

    async def kill_process_by_id(self, pid: int) -> bool:
        """
        Kill process by ID.

        Uses platform-specific kill commands:
        - Windows: taskkill /F /PID
        - Linux/macOS: kill -9

        Args:
            pid: Process ID to kill

        Returns:
            True if process killed successfully, False otherwise

        Example:
            >>> success = await process_manager.kill_process_by_id(1234)
            >>> if success:
            ...     print("Process 1234 terminated")
        """
        try:
            system = platform.system().lower()

            if system == "windows":
                # Windows: Use taskkill
                result = await asyncio.create_subprocess_shell(
                    f"taskkill /PID {pid} /F",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await result.communicate()

            else:
                # Linux/macOS: Use kill
                result = await asyncio.create_subprocess_shell(
                    f"kill -9 {pid}", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                await result.communicate()

            logger.info(
                f"[ProcessManager] Killed process {pid}",
                extra={"service": "ProcessManager", "pid": pid},
            )
            return True

        except Exception as exc:
            logger.error(
                f"[ProcessManager] Error killing process {pid}: {e}",
                exc_info=True,
                extra={"service": "ProcessManager", "pid": pid},
            )
            return False

    async def execute_shutdown_handlers(self) -> None:
        """
        Execute all shutdown handlers.

        Runs all registered shutdown handlers in order. Handles both
        sync and async handlers. Continues executing even if some fail.

        Example:
            >>> await process_manager.execute_shutdown_handlers()
        """
        if self._shutdown_in_progress:
            logger.warning(
                "[ProcessManager] Shutdown already in progress", extra={"service": "ProcessManager"}
            )
            return

        self._shutdown_in_progress = True

        logger.info(
            f"[ProcessManager] Executing {len(self.shutdown_handlers)} shutdown handlers",
            extra={"service": "ProcessManager"},
        )

        with self._lock:
            handlers = list(self.shutdown_handlers)

        for i, handler in enumerate(handlers):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()

                logger.debug(
                    f"[ProcessManager] Executed shutdown handler {i + 1}/{len(handlers)}",
                    extra={"service": "ProcessManager"},
                )

            except Exception as exc:
                logger.error(
                    f"[ProcessManager] Error in shutdown handler {i + 1}: {e}",
                    exc_info=True,
                    extra={"service": "ProcessManager", "handler_index": i},
                )

        logger.info(
            "[ProcessManager] All shutdown handlers executed", extra={"service": "ProcessManager"}
        )

# Singleton instance
_process_manager_instance: Optional[ProcessManager] = None
_process_manager_lock = threading.Lock()

def get_process_manager() -> ProcessManager:
    """
    Get singleton ProcessManager instance.

    Returns:
        ProcessManager singleton instance

    Example:
        >>> process_manager = get_process_manager()
        >>> await process_manager.cleanup_on_startup()
    """
    global _process_manager_instance

    if _process_manager_instance is None:
        with _process_manager_lock:
            if _process_manager_instance is None:
                _process_manager_instance = ProcessManager()

    return _process_manager_instance

def reset_process_manager() -> None:
    """
    Reset singleton instance (useful for testing).

    Example:
        >>> reset_process_manager()
        >>> process_manager = get_process_manager()
    """
    global _process_manager_instance

    with _process_manager_lock:
        _process_manager_instance = None

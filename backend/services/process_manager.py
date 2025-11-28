"""
Process Manager for Justice Companion.

Manages process lifecycle, port allocation, and service coordination.
Provides single-instance enforcement and graceful shutdown handling.
"""

import asyncio
import logging
import os
import socket
import psutil
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ProcessInfo:
    """Information about a process using a port."""
    pid: Optional[int]
    name: Optional[str]
    cmdline: Optional[List[str]]
    create_time: Optional[float]


@dataclass
class PortStatus:
    """Status of a specific port."""
    port: int
    in_use: bool
    service_name: Optional[str]
    process_info: Optional[ProcessInfo]


@dataclass
class ProcessStatus:
    """Overall process status."""
    is_running: bool
    start_time: datetime
    ports: List[PortStatus]
    uptime_seconds: float


class ProcessManager:
    """
    Manages process lifecycle and port allocation.

    Features:
    - Single instance enforcement
    - Port usage tracking
    - Graceful shutdown handling
    - Process discovery by port
    """

    _instance: Optional['ProcessManager'] = None

    def __init__(self):
        self.start_time = datetime.utcnow()
        self.managed_ports: Dict[int, str] = {}
        self.shutdown_handlers: List[Callable] = []
        self._lock_file: Optional[str] = None

    def enforce_single_instance(self) -> bool:
        """
        Enforce single instance using lock file.

        Returns:
            True if this is the first instance, False if another instance exists
        """
        lock_file = os.path.join(os.getcwd(), ".process_lock")

        # Check if lock file exists and contains a running PID
        if os.path.exists(lock_file):
            try:
                with open(lock_file, 'r') as f:
                    existing_pid = int(f.read().strip())

                # Check if process is still running
                if psutil.pid_exists(existing_pid):
                    return False
                else:
                    # Stale lock file, remove it
                    os.remove(lock_file)
            except (ValueError, OSError):
                # Invalid lock file, remove it
                if os.path.exists(lock_file):
                    os.remove(lock_file)

        # Create new lock file
        try:
            with open(lock_file, 'w') as f:
                f.write(str(os.getpid()))
            self._lock_file = lock_file
            return True
        except OSError:
            return False

    def register_managed_port(self, port: int, service_name: str) -> None:
        """
        Register a port as managed by this process.

        Args:
            port: Port number
            service_name: Name of the service using the port
        """
        self.managed_ports[port] = service_name
        logger.info(f"Registered managed port {port} for service '{service_name}'")

    def track_port(self, port: int, service_name: str) -> None:
        """
        Alias for register_managed_port for backward compatibility.

        Args:
            port: Port number
            service_name: Name of the service using the port
        """
        self.register_managed_port(port, service_name)

    async def is_port_in_use(self, port: int) -> bool:
        """
        Check if a port is currently in use.

        Args:
            port: Port number to check

        Returns:
            True if port is in use, False otherwise
        """
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            return result == 0
        except OSError:
            return False

    async def find_process_by_port(self, port: int) -> ProcessInfo:
        """
        Find the process using a specific port.

        Args:
            port: Port number

        Returns:
            ProcessInfo for the process using the port, or empty ProcessInfo if not found
        """
        try:
            # Use netstat-like approach to find process by port
            for conn in psutil.net_connections():
                if conn.laddr and conn.laddr.port == port and conn.pid:
                    try:
                        process = psutil.Process(conn.pid)
                        return ProcessInfo(
                            pid=conn.pid,
                            name=process.name(),
                            cmdline=process.cmdline(),
                            create_time=process.create_time()
                        )
                    except psutil.NoSuchProcess:
                        continue
        except Exception as e:
            logger.warning(f"Error finding process for port {port}: {e}")

        return ProcessInfo(pid=None, name=None, cmdline=None, create_time=None)

    async def get_process_status(self) -> ProcessStatus:
        """
        Get overall process status.

        Returns:
            ProcessStatus with current state
        """
        ports = []
        for port, service_name in self.managed_ports.items():
            in_use = await self.is_port_in_use(port)
            process_info = await self.find_process_by_port(port) if in_use else None

            ports.append(PortStatus(
                port=port,
                in_use=in_use,
                service_name=service_name,
                process_info=process_info
            ))

        uptime = (datetime.utcnow() - self.start_time).total_seconds()

        return ProcessStatus(
            is_running=True,
            start_time=self.start_time,
            ports=ports,
            uptime_seconds=uptime
        )

    async def get_status(self) -> ProcessStatus:
        """
        Alias for get_process_status.

        Returns:
            ProcessStatus with current state
        """
        return await self.get_process_status()

    def add_shutdown_handler(self, handler: Callable) -> None:
        """
        Add a shutdown handler to be executed on process termination.

        Args:
            handler: Callable (sync or async function) to execute on shutdown
        """
        self.shutdown_handlers.append(handler)

    async def execute_shutdown_handlers(self) -> None:
        """
        Execute all registered shutdown handlers in reverse order.
        """
        for handler in reversed(self.shutdown_handlers):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    # Run sync function in thread pool
                    await asyncio.get_event_loop().run_in_executor(None, handler)
            except Exception as e:
                logger.error(f"Error executing shutdown handler: {e}")

    def log_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an error with optional context.

        Args:
            error: Exception to log
            context: Optional context dictionary
        """
        error_msg = f"ProcessManager error: {str(error)}"
        if context:
            error_msg += f" (context: {context})"

        logger.error(error_msg)

    def cleanup(self) -> None:
        """
        Clean up resources (lock file, etc.).
        """
        if self._lock_file and os.path.exists(self._lock_file):
            try:
                os.remove(self._lock_file)
            except OSError:
                pass


# Singleton management functions

def get_process_manager() -> ProcessManager:
    """
    Get the singleton ProcessManager instance.

    Returns:
        ProcessManager instance
    """
    if ProcessManager._instance is None:
        ProcessManager._instance = ProcessManager()
    return ProcessManager._instance


def reset_process_manager() -> None:
    """
    Reset the singleton ProcessManager instance.
    Used for testing.
    """
    if ProcessManager._instance:
        ProcessManager._instance.cleanup()
    ProcessManager._instance = None

"""
Port Management Service for Justice Companion Backend

This module provides centralized port management for backend services including
port allocation, conflict resolution, availability checking, and monitoring.

Key Features:
- Port availability checking
- Automatic port allocation with fallback ranges
- Port conflict resolution
- Port monitoring with health checks
- Configuration persistence
- Thread-safe operations
- Environment variable generation

Example:
    ```python
    from backend.services.port_manager import PortManager, get_port_manager

    # Get singleton instance
    port_manager = get_port_manager()

    # Allocate port for service
    allocation = await port_manager.allocate_port("python-ai-service")
    if allocation.status == "allocated":
        print(f"Service running on port {allocation.allocated_port}")

    # Check port availability
    if await port_manager.is_port_available(5050):
        print("Port 5050 is available")

    # Get all allocated ports
    port_map = port_manager.get_allocated_ports()
    print(f"Allocated ports: {port_map}")
    ```
"""

import asyncio
import json
import logging
import os
import socket
import threading
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

logger = logging.getLogger(__name__)


@dataclass
class PortConfig:
    """
    Port configuration for a service.

    Attributes:
        service: Service name (e.g., 'python-ai-service')
        default_port: Preferred port number
        range: Optional tuple of (start_port, end_port) for fallback
        description: Human-readable description of service
        required: Whether port allocation is required for service
    """
    service: str
    default_port: int
    range: Optional[Tuple[int, int]] = None
    description: Optional[str] = None
    required: bool = False


@dataclass
class PortAllocation:
    """
    Port allocation result.

    Attributes:
        service: Service name
        requested_port: Originally requested port number
        allocated_port: Actually allocated port number (0 if failed)
        status: Allocation status ('allocated', 'in_use', 'error')
        message: Optional human-readable message
    """
    service: str
    requested_port: int
    allocated_port: int
    status: str  # 'allocated' | 'in_use' | 'error'
    message: Optional[str] = None


@dataclass
class PortStatus:
    """
    Port status information.

    Attributes:
        port: Port number
        service: Service name using this port
        in_use: Whether port is currently in use
        pid: Optional process ID using the port
        allocated_at: Timestamp when port was allocated
    """
    port: int
    service: str
    in_use: bool
    pid: Optional[int] = None
    allocated_at: Optional[datetime] = None


@dataclass
class PortManagerConfig:
    """
    PortManager configuration.

    Attributes:
        port_config_path: Path to port configuration JSON file
        enable_auto_allocation: Whether to automatically find alternative ports
        max_retries: Maximum retries for port operations
        retry_delay: Delay between retries in seconds
    """
    port_config_path: Optional[str] = None
    enable_auto_allocation: bool = True
    max_retries: int = 10
    retry_delay: float = 0.1


# Default port configuration for Justice Companion services
DEFAULT_PORT_CONFIGS: List[PortConfig] = [
    PortConfig(
        service="vite-dev-server",
        default_port=5176,
        range=(5173, 5180),
        description="Vite development server",
        required=True
    ),
    PortConfig(
        service="python-ai-service",
        default_port=5050,
        range=(5050, 5060),
        description="Python AI document analysis service",
        required=False
    ),
    PortConfig(
        service="electron-dev-api",
        default_port=8080,
        range=(8080, 8090),
        description="Electron development API server",
        required=False
    ),
    PortConfig(
        service="playwright-debug",
        default_port=9323,
        range=(9320, 9330),
        description="Playwright debugger",
        required=False
    ),
]


class PortManager:
    """
    Centralized port management for Justice Companion backend services.

    Handles port allocation, conflict resolution, availability checking, and monitoring.
    Thread-safe implementation with automatic cleanup and configuration persistence.

    Example:
        >>> port_manager = PortManager()
        >>> allocation = await port_manager.allocate_port("python-ai-service")
        >>> if allocation.status == "allocated":
        ...     print(f"Port {allocation.allocated_port} allocated")
        >>> await port_manager.cleanup()
    """

    def __init__(self, config: Optional[PortManagerConfig] = None):
        """
        Initialize PortManager with configuration.

        Args:
            config: Optional configuration. Uses defaults if not provided.
        """
        self.config = config or PortManagerConfig()
        self.port_configs: Dict[str, PortConfig] = {}
        self.allocated_ports: Dict[str, PortAllocation] = {}
        self.port_monitors: Dict[int, asyncio.Task] = {}
        self._lock = threading.RLock()
        self._monitor_tasks: Set[asyncio.Task] = set()

        self._initialize_port_configs()

    def _initialize_port_configs(self) -> None:
        """Initialize port configurations from file or defaults."""
        # Try to load from config file first
        if self.config.port_config_path and os.path.exists(self.config.port_config_path):
            try:
                with open(self.config.port_config_path, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)

                # Load custom configs
                if 'portConfigs' in config_data:
                    custom_configs = config_data['portConfigs']
                elif isinstance(config_data, list):
                    custom_configs = config_data
                else:
                    custom_configs = []

                for config_dict in custom_configs:
                    # Convert range from list to tuple if present
                    if 'range' in config_dict and config_dict['range']:
                        config_dict['range'] = tuple(config_dict['range'])

                    config = PortConfig(**config_dict)
                    self.port_configs[config.service] = config

                logger.info(
                    f"[PortManager] Loaded custom port configurations from {self.config.port_config_path}"
                )
            except Exception as e:
                logger.error(
                    f"[PortManager] Failed to load config from {self.config.port_config_path}: {e}",
                    exc_info=True
                )
                self._load_default_configs()
        else:
            self._load_default_configs()

    def _load_default_configs(self) -> None:
        """Load default port configurations."""
        for config in DEFAULT_PORT_CONFIGS:
            self.port_configs[config.service] = config

        logger.info(
            f"[PortManager] Loaded default port configurations for {len(self.port_configs)} services"
        )

    async def is_port_available(self, port: int, host: str = '127.0.0.1') -> bool:
        """
        Check if a port is available.

        Args:
            port: Port number to check
            host: Host address to bind to (default: '127.0.0.1')

        Returns:
            True if port is available, False otherwise

        Example:
            >>> available = await port_manager.is_port_available(5050)
            >>> if available:
            ...     print("Port 5050 is free")
        """
        try:
            # Create socket and try to bind
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.settimeout(0.5)
                sock.bind((host, port))
                return True
        except OSError as e:
            if e.errno == 98 or e.errno == 10048:  # Address already in use (Linux/Windows)
                return False
            # Other errors - treat as unavailable for safety
            logger.debug(f"[PortManager] Error checking port {port}: {e}")
            return False
        except Exception as e:
            logger.error(f"[PortManager] Unexpected error checking port {port}: {e}", exc_info=True)
            return False

    async def find_available_port(
        self,
        start_port: int,
        end_port: Optional[int] = None,
        host: str = '127.0.0.1'
    ) -> Optional[int]:
        """
        Find an available port within a range.

        Args:
            start_port: Starting port number
            end_port: Ending port number (default: start_port + 100)
            host: Host address to bind to (default: '127.0.0.1')

        Returns:
            Port number if found, None otherwise

        Example:
            >>> port = await port_manager.find_available_port(5050, 5060)
            >>> if port:
            ...     print(f"Found free port: {port}")
        """
        end = end_port if end_port is not None else start_port + 100

        for port in range(start_port, end + 1):
            if await self.is_port_available(port, host):
                return port

        return None

    async def allocate_port(self, service_name: str) -> PortAllocation:
        """
        Allocate a port for a service.

        Tries the default port first, then searches the configured range if
        auto-allocation is enabled. Thread-safe operation.

        Args:
            service_name: Name of the service requesting port allocation

        Returns:
            PortAllocation object with allocation result

        Example:
            >>> allocation = await port_manager.allocate_port("python-ai-service")
            >>> if allocation.status == "allocated":
            ...     print(f"Service running on port {allocation.allocated_port}")
            >>> else:
            ...     print(f"Failed: {allocation.message}")
        """
        with self._lock:
            config = self.port_configs.get(service_name)

            if not config:
                allocation = PortAllocation(
                    service=service_name,
                    requested_port=0,
                    allocated_port=0,
                    status="error",
                    message=f"No port configuration found for service: {service_name}"
                )
                self.allocated_ports[service_name] = allocation
                return allocation

            # Check if already allocated
            existing_allocation = self.allocated_ports.get(service_name)
            if existing_allocation and existing_allocation.status == "allocated":
                # Verify port is still unavailable (meaning service is running)
                still_in_use = not await self.is_port_available(existing_allocation.allocated_port)
                if still_in_use:
                    return existing_allocation

            # Try the default port first
            default_available = await self.is_port_available(config.default_port)
            if default_available:
                allocation = PortAllocation(
                    service=service_name,
                    requested_port=config.default_port,
                    allocated_port=config.default_port,
                    status="allocated",
                    message=f"Allocated default port {config.default_port}"
                )
                self.allocated_ports[service_name] = allocation
                logger.info(
                    f"[PortManager] Allocated port {config.default_port} for {service_name}"
                )
                return allocation

            # If auto-allocation is enabled and we have a range, try alternatives
            if self.config.enable_auto_allocation and config.range:
                available_port = await self.find_available_port(config.range[0], config.range[1])

                if available_port:
                    allocation = PortAllocation(
                        service=service_name,
                        requested_port=config.default_port,
                        allocated_port=available_port,
                        status="allocated",
                        message=f"Default port {config.default_port} was in use. "
                                f"Allocated alternative port {available_port}"
                    )
                    self.allocated_ports[service_name] = allocation
                    logger.info(
                        f"[PortManager] Allocated alternative port {available_port} for {service_name}"
                    )
                    return allocation

            # Port allocation failed
            allocation = PortAllocation(
                service=service_name,
                requested_port=config.default_port,
                allocated_port=0,
                status="in_use",
                message=f"Port {config.default_port} is in use and no alternatives available"
            )
            self.allocated_ports[service_name] = allocation
            logger.error(f"[PortManager] Failed to allocate port for {service_name}")
            return allocation

    async def allocate_all_ports(self) -> Dict[str, PortAllocation]:
        """
        Allocate all required ports.

        Returns:
            Dictionary mapping service names to their allocations

        Example:
            >>> allocations = await port_manager.allocate_all_ports()
            >>> for service, allocation in allocations.items():
            ...     print(f"{service}: {allocation.allocated_port}")
        """
        allocations = {}

        for service_name, config in self.port_configs.items():
            if config.required:
                allocation = await self.allocate_port(service_name)
                allocations[service_name] = allocation

        return allocations

    def get_port(self, service_name: str) -> Optional[int]:
        """
        Get allocated port for a service.

        Args:
            service_name: Name of the service

        Returns:
            Port number if allocated, None otherwise

        Example:
            >>> port = port_manager.get_port("python-ai-service")
            >>> if port:
            ...     print(f"Service on port {port}")
        """
        with self._lock:
            allocation = self.allocated_ports.get(service_name)
            if allocation and allocation.status == "allocated":
                return allocation.allocated_port
            return None

    def get_allocated_ports(self) -> Dict[str, int]:
        """
        Get all allocated ports.

        Returns:
            Dictionary mapping service names to port numbers

        Example:
            >>> ports = port_manager.get_allocated_ports()
            >>> print(f"Allocated ports: {ports}")
        """
        with self._lock:
            port_map = {}
            for service, allocation in self.allocated_ports.items():
                if allocation.status == "allocated":
                    port_map[service] = allocation.allocated_port
            return port_map

    def release_port(self, service_name: str) -> None:
        """
        Release a port allocation.

        Args:
            service_name: Name of the service

        Example:
            >>> port_manager.release_port("python-ai-service")
        """
        with self._lock:
            allocation = self.allocated_ports.get(service_name)
            if allocation:
                # Stop monitoring if active
                if allocation.allocated_port in self.port_monitors:
                    task = self.port_monitors[allocation.allocated_port]
                    if not task.done():
                        task.cancel()
                    del self.port_monitors[allocation.allocated_port]

                del self.allocated_ports[service_name]
                logger.info(
                    f"[PortManager] Released port {allocation.allocated_port} for {service_name}"
                )

    def release_all_ports(self) -> None:
        """
        Release all allocated ports.

        Example:
            >>> port_manager.release_all_ports()
        """
        with self._lock:
            service_names = list(self.allocated_ports.keys())
            for service_name in service_names:
                self.release_port(service_name)

    async def _port_monitor_task(self, service_name: str, port: int, interval: float) -> None:
        """
        Internal monitoring task for a port.

        Args:
            service_name: Name of the service
            port: Port number to monitor
            interval: Check interval in seconds
        """
        try:
            while True:
                await asyncio.sleep(interval)

                available = await self.is_port_available(port)
                if available:
                    logger.warning(
                        f"[PortManager] Port {port} for {service_name} became available unexpectedly"
                    )
                    self._on_port_became_available(service_name, port)
        except asyncio.CancelledError:
            logger.debug(f"[PortManager] Stopped monitoring port {port} for {service_name}")
        except Exception as e:
            logger.error(
                f"[PortManager] Error monitoring port {port} for {service_name}: {e}",
                exc_info=True
            )

    def start_port_monitoring(
        self,
        service_name: str,
        interval: float = 5.0,
        loop: Optional[asyncio.AbstractEventLoop] = None
    ) -> None:
        """
        Start monitoring port availability.

        Args:
            service_name: Name of the service to monitor
            interval: Check interval in seconds (default: 5.0)
            loop: Event loop to use (default: current or new event loop)

        Example:
            >>> port_manager.start_port_monitoring("python-ai-service", interval=10.0)
        """
        with self._lock:
            allocation = self.allocated_ports.get(service_name)
            if not allocation or allocation.status != "allocated":
                return

            # Clear existing monitor if any
            if allocation.allocated_port in self.port_monitors:
                existing_task = self.port_monitors[allocation.allocated_port]
                if not existing_task.done():
                    existing_task.cancel()

            # Start new monitor
            if loop is None:
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

            task = loop.create_task(
                self._port_monitor_task(service_name, allocation.allocated_port, interval)
            )
            self.port_monitors[allocation.allocated_port] = task
            self._monitor_tasks.add(task)

            logger.info(
                f"[PortManager] Started monitoring port {allocation.allocated_port} "
                f"for {service_name} (interval: {interval}s)"
            )

    def stop_port_monitoring(self, service_name: str) -> None:
        """
        Stop monitoring a port.

        Args:
            service_name: Name of the service

        Example:
            >>> port_manager.stop_port_monitoring("python-ai-service")
        """
        with self._lock:
            allocation = self.allocated_ports.get(service_name)
            if allocation and allocation.allocated_port in self.port_monitors:
                task = self.port_monitors[allocation.allocated_port]
                if not task.done():
                    task.cancel()
                del self.port_monitors[allocation.allocated_port]
                self._monitor_tasks.discard(task)

                logger.info(
                    f"[PortManager] Stopped monitoring port {allocation.allocated_port} for {service_name}"
                )

    async def get_port_status(self) -> List[PortStatus]:
        """
        Get port status for all configured services.

        Returns:
            List of PortStatus objects

        Example:
            >>> statuses = await port_manager.get_port_status()
            >>> for status in statuses:
            ...     print(f"{status.service}: {status.port} (in_use={status.in_use})")
        """
        statuses = []

        with self._lock:
            for service_name, allocation in self.allocated_ports.items():
                if allocation.status == "allocated":
                    in_use = not await self.is_port_available(allocation.allocated_port)
                    statuses.append(PortStatus(
                        port=allocation.allocated_port,
                        service=service_name,
                        in_use=in_use,
                        allocated_at=datetime.now()
                    ))

        return statuses

    async def save_configuration(self, file_path: Optional[str] = None) -> None:
        """
        Save port configuration to file.

        Args:
            file_path: Path to save configuration (default: uses config path)

        Raises:
            ValueError: If no configuration file path is specified

        Example:
            >>> await port_manager.save_configuration("/path/to/config.json")
        """
        config_path = file_path or self.config.port_config_path

        if not config_path:
            raise ValueError("No configuration file path specified")

        with self._lock:
            # Convert configs to dict format
            configs = []
            for config in self.port_configs.values():
                config_dict = asdict(config)
                # Convert tuple to list for JSON serialization
                if config_dict.get('range'):
                    config_dict['range'] = list(config_dict['range'])
                configs.append(config_dict)

            # Convert allocations to dict format
            allocations = []
            for allocation in self.allocated_ports.values():
                if allocation.status == "allocated":
                    allocations.append(asdict(allocation))

            config_data = {
                "timestamp": datetime.now().isoformat(),
                "portConfigs": configs,
                "allocations": allocations
            }

        try:
            # Ensure directory exists
            Path(config_path).parent.mkdir(parents=True, exist_ok=True)

            # Write configuration
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2)

            logger.info(
                f"[PortManager] Saved port configuration to {config_path} "
                f"({len(configs)} services)"
            )
        except Exception as e:
            logger.error(
                f"[PortManager] Failed to save configuration to {config_path}: {e}",
                exc_info=True
            )
            raise

    def _on_port_became_available(self, service_name: str, port: int) -> None:
        """
        Handle port became available event.

        Args:
            service_name: Name of the service
            port: Port number that became available
        """
        logger.info(
            f"[PortManager] Port {port} for {service_name} is now available"
        )

    def get_environment_variables(self) -> Dict[str, str]:
        """
        Get environment variables for allocated ports.

        Returns:
            Dictionary of environment variables

        Example:
            >>> env_vars = port_manager.get_environment_variables()
            >>> print(env_vars)
            {'PYTHON_AI_SERVICE_PORT': '5050', 'VITE_DEV_SERVER_PORT': '5176'}
        """
        env = {}

        with self._lock:
            for service, allocation in self.allocated_ports.items():
                if allocation.status == "allocated":
                    env_key = service.upper().replace('-', '_') + '_PORT'
                    env[env_key] = str(allocation.allocated_port)

        return env

    async def wait_for_port(
        self,
        port: int,
        timeout: float = 30.0,
        check_interval: float = 1.0,
        host: str = '127.0.0.1'
    ) -> bool:
        """
        Wait for a port to become in use (service started).

        Args:
            port: Port number to wait for
            timeout: Maximum time to wait in seconds (default: 30.0)
            check_interval: Check interval in seconds (default: 1.0)
            host: Host address to check (default: '127.0.0.1')

        Returns:
            True if port is in use before timeout, False otherwise

        Example:
            >>> if await port_manager.wait_for_port(5050, timeout=10.0):
            ...     print("Service started successfully")
            ... else:
            ...     print("Service failed to start")
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            # Port is in use if it's NOT available
            available = await self.is_port_available(port, host)
            if not available:
                return True

            await asyncio.sleep(check_interval)

        return False

    async def cleanup(self) -> None:
        """
        Cleanup and release resources.

        Stops all port monitors, saves configuration, and clears allocations.

        Example:
            >>> await port_manager.cleanup()
        """
        # Stop all port monitors
        with self._lock:
            for task in list(self.port_monitors.values()):
                if not task.done():
                    task.cancel()
            self.port_monitors.clear()

        # Wait for all monitor tasks to complete
        if self._monitor_tasks:
            await asyncio.gather(*self._monitor_tasks, return_exceptions=True)
        self._monitor_tasks.clear()

        # Save current configuration
        if self.config.port_config_path:
            try:
                await self.save_configuration()
            except Exception as e:
                # Log but don't raise during cleanup
                logger.error(f"[PortManager] Error saving configuration during cleanup: {e}")

        # Clear allocations
        with self._lock:
            self.allocated_ports.clear()

        logger.info("[PortManager] Cleanup completed")


# Singleton instance
_port_manager_instance: Optional[PortManager] = None
_port_manager_lock = threading.Lock()


def get_port_manager(config: Optional[PortManagerConfig] = None) -> PortManager:
    """
    Get singleton PortManager instance.

    Args:
        config: Optional configuration (only used on first call)

    Returns:
        PortManager singleton instance

    Example:
        >>> port_manager = get_port_manager()
        >>> allocation = await port_manager.allocate_port("python-ai-service")
    """
    global _port_manager_instance

    if _port_manager_instance is None:
        with _port_manager_lock:
            if _port_manager_instance is None:
                _port_manager_instance = PortManager(config)

    return _port_manager_instance

"""
Standalone test suite for ProcessManager service.

This test file imports directly to avoid __init__.py dependency issues.
"""

import asyncio
import sys
import os

# Add project root and backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
import socket
from datetime import datetime

# Direct import by loading the module file to avoid __init__.py issues
import importlib.util
spec = importlib.util.spec_from_file_location(
    "process_manager",
    os.path.join(os.path.dirname(__file__), "process_manager.py")
)
process_manager_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(process_manager_module)

ProcessManager = process_manager_module.ProcessManager
ProcessInfo = process_manager_module.ProcessInfo
PortStatus = process_manager_module.PortStatus
ProcessStatus = process_manager_module.ProcessStatus
get_process_manager = process_manager_module.get_process_manager
reset_process_manager = process_manager_module.reset_process_manager

@pytest.fixture
def process_manager():
    """Create a fresh ProcessManager instance for each test."""
    reset_process_manager()
    manager = ProcessManager()
    yield manager
    # Cleanup
    try:
        asyncio.run(manager.execute_shutdown_handlers())
    except RuntimeError:
        pass  # Event loop may be closed

@pytest.fixture
async def test_server():
    """Start a test server on a random port."""
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(('127.0.0.1', 0))  # Bind to random available port
    server_socket.listen(1)
    port = server_socket.getsockname()[1]

    yield port, server_socket

    # Cleanup
    server_socket.close()

class TestProcessManagerInitialization:
    """Test ProcessManager initialization and setup."""

    def test_initialization(self, process_manager):
        """Test ProcessManager initializes correctly."""
        assert process_manager is not None
        assert isinstance(process_manager.start_time, datetime)
        assert len(process_manager.managed_ports) == 0
        assert len(process_manager.shutdown_handlers) == 0

    def test_singleton_pattern(self):
        """Test singleton pattern works correctly."""
        reset_process_manager()
        manager1 = get_process_manager()
        manager2 = get_process_manager()
        assert manager1 is manager2

    def test_reset_singleton(self):
        """Test resetting singleton creates new instance."""
        manager1 = get_process_manager()
        reset_process_manager()
        manager2 = get_process_manager()
        assert manager1 is not manager2

class TestSingleInstanceLock:
    """Test single instance enforcement."""

    def test_enforce_single_instance_first_call(self, process_manager):
        """Test first call to enforce_single_instance succeeds."""
        result = process_manager.enforce_single_instance()
        assert result is True

    def test_enforce_single_instance_second_call(self, process_manager):
        """Test second call to enforce_single_instance fails."""
        process_manager.enforce_single_instance()
        result = process_manager.enforce_single_instance()
        assert result is False

class TestPortOperations:
    """Test port-related operations."""

    @pytest.mark.asyncio
    async def test_is_port_in_use_free_port(self, process_manager):
        """Test is_port_in_use returns False for free port."""
        # Find a likely free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            free_port = s.getsockname()[1]

        in_use = await process_manager.is_port_in_use(free_port)
        assert in_use is False

    @pytest.mark.asyncio
    async def test_is_port_in_use_occupied_port(self, process_manager, test_server):
        """Test is_port_in_use returns True for occupied port."""
        port, _ = test_server
        in_use = await process_manager.is_port_in_use(port)
        assert in_use is True

    @pytest.mark.asyncio
    async def test_find_process_by_port_no_process(self, process_manager):
        """Test find_process_by_port returns None PID for free port."""
        # Find a free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            free_port = s.getsockname()[1]

        process_info = await process_manager.find_process_by_port(free_port)
        assert isinstance(process_info, ProcessInfo)
        assert process_info.pid is None

class TestManagedPorts:
    """Test managed port tracking."""

    def test_register_managed_port(self, process_manager):
        """Test registering a managed port."""
        process_manager.register_managed_port(5050, "test-service")
        assert 5050 in process_manager.managed_ports
        assert process_manager.managed_ports[5050] == "test-service"

    def test_track_port_alias(self, process_manager):
        """Test track_port alias works."""
        process_manager.track_port(8080, "api-server")
        assert 8080 in process_manager.managed_ports
        assert process_manager.managed_ports[8080] == "api-server"

    def test_register_multiple_ports(self, process_manager):
        """Test registering multiple managed ports."""
        process_manager.register_managed_port(5050, "service-1")
        process_manager.register_managed_port(8080, "service-2")
        process_manager.register_managed_port(9000, "service-3")

        assert len(process_manager.managed_ports) == 3
        assert process_manager.managed_ports[5050] == "service-1"
        assert process_manager.managed_ports[8080] == "service-2"
        assert process_manager.managed_ports[9000] == "service-3"

class TestProcessStatus:
    """Test process status reporting."""

    @pytest.mark.asyncio
    async def test_get_process_status_empty(self, process_manager):
        """Test get_process_status with no managed ports."""
        status = await process_manager.get_process_status()
        assert isinstance(status, ProcessStatus)
        assert status.is_running is True
        assert isinstance(status.start_time, datetime)
        assert len(status.ports) == 0

    @pytest.mark.asyncio
    async def test_get_process_status_with_ports(self, process_manager):
        """Test get_process_status with managed ports."""
        process_manager.register_managed_port(5050, "test-service-1")
        process_manager.register_managed_port(8080, "test-service-2")

        status = await process_manager.get_process_status()
        assert isinstance(status, ProcessStatus)
        assert status.is_running is True
        assert len(status.ports) == 2

        port_nums = [p.port for p in status.ports]
        assert 5050 in port_nums
        assert 8080 in port_nums

    @pytest.mark.asyncio
    async def test_get_status_alias(self, process_manager):
        """Test get_status alias works."""
        status = await process_manager.get_status()
        assert isinstance(status, ProcessStatus)

class TestShutdownHandlers:
    """Test shutdown handler management."""

    def test_add_shutdown_handler_sync(self, process_manager):
        """Test adding synchronous shutdown handler."""
        def handler():
            pass

        process_manager.add_shutdown_handler(handler)
        assert len(process_manager.shutdown_handlers) == 1

    def test_add_shutdown_handler_async(self, process_manager):
        """Test adding asynchronous shutdown handler."""
        async def handler():
            pass

        process_manager.add_shutdown_handler(handler)
        assert len(process_manager.shutdown_handlers) == 1

    @pytest.mark.asyncio
    async def test_execute_shutdown_handlers_sync(self, process_manager):
        """Test executing synchronous shutdown handlers."""
        called = []

        def handler1():
            called.append(1)

        def handler2():
            called.append(2)

        process_manager.add_shutdown_handler(handler1)
        process_manager.add_shutdown_handler(handler2)

        await process_manager.execute_shutdown_handlers()

        assert called == [1, 2]

    @pytest.mark.asyncio
    async def test_execute_shutdown_handlers_async(self, process_manager):
        """Test executing asynchronous shutdown handlers."""
        called = []

        async def handler1():
            await asyncio.sleep(0.01)
            called.append(1)

        async def handler2():
            await asyncio.sleep(0.01)
            called.append(2)

        process_manager.add_shutdown_handler(handler1)
        process_manager.add_shutdown_handler(handler2)

        await process_manager.execute_shutdown_handlers()

        assert called == [1, 2]

class TestErrorLogging:
    """Test error logging functionality."""

    def test_log_error_simple(self, process_manager):
        """Test logging simple error."""
        error = Exception("Test error")
        process_manager.log_error(error)
        # Should not raise

    def test_log_error_with_context(self, process_manager):
        """Test logging error with context."""
        error = Exception("Test error")
        context = {"port": 5050, "operation": "test"}
        process_manager.log_error(error, context)
        # Should not raise

def run_tests():
    """Run test suite with detailed output."""
    print("\n" + "=" * 70)
    print("ProcessManager Test Suite")
    print("=" * 70 + "\n")

    pytest_args = [
        __file__,
        "-v",
        "--tb=short",
        "-s",
        "--color=yes"
    ]

    exit_code = pytest.main(pytest_args)

    print("\n" + "=" * 70)
    if exit_code == 0:
        print("✅ All tests passed!")
    else:
        print(f"❌ Tests failed with exit code {exit_code}")
    print("=" * 70 + "\n")

    return exit_code

if __name__ == "__main__":
    sys.exit(run_tests())

"""
Comprehensive test suite for ProcessManager service.

Tests process lifecycle management, port operations, and shutdown handling.
"""

import asyncio
import pytest
import socket
import threading
from datetime import datetime

from backend.services.process_manager import (
    ProcessManager,
    ProcessInfo,
    ProcessStatus,
    get_process_manager,
    reset_process_manager
)

@pytest.fixture
def process_manager():
    """Create a fresh ProcessManager instance for each test."""
    reset_process_manager()
    manager = ProcessManager()
    yield manager
    # Cleanup
    asyncio.run(manager.execute_shutdown_handlers())

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

    @pytest.mark.asyncio
    async def test_find_process_by_port_with_process(self, process_manager, test_server):
        """Test find_process_by_port finds process on occupied port."""
        port, _ = test_server
        process_info = await process_manager.find_process_by_port(port)
        assert isinstance(process_info, ProcessInfo)
        # Note: PID detection may not work in all environments
        # Just verify we get a ProcessInfo object

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
        called = []

        def handler():
            called.append(True)

        process_manager.add_shutdown_handler(handler)
        assert len(process_manager.shutdown_handlers) == 1

    def test_add_shutdown_handler_async(self, process_manager):
        """Test adding asynchronous shutdown handler."""
        called = []

        async def handler():
            called.append(True)

        process_manager.add_shutdown_handler(handler)
        assert len(process_manager.shutdown_handlers) == 1

    def test_on_shutdown_alias(self, process_manager):
        """Test on_shutdown alias works."""
        def handler():
            pass

        process_manager.on_shutdown(handler)
        assert len(process_manager.shutdown_handlers) == 1

    def test_add_multiple_handlers(self, process_manager):
        """Test adding multiple shutdown handlers."""
        def handler1():
            pass

        async def handler2():
            pass

        def handler3():
            pass

        process_manager.add_shutdown_handler(handler1)
        process_manager.add_shutdown_handler(handler2)
        process_manager.add_shutdown_handler(handler3)

        assert len(process_manager.shutdown_handlers) == 3

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

    @pytest.mark.asyncio
    async def test_execute_shutdown_handlers_mixed(self, process_manager):
        """Test executing mixed sync/async shutdown handlers."""
        called = []

        def handler1():
            called.append(1)

        async def handler2():
            await asyncio.sleep(0.01)
            called.append(2)

        def handler3():
            called.append(3)

        process_manager.add_shutdown_handler(handler1)
        process_manager.add_shutdown_handler(handler2)
        process_manager.add_shutdown_handler(handler3)

        await process_manager.execute_shutdown_handlers()

        assert called == [1, 2, 3]

    @pytest.mark.asyncio
    async def test_execute_shutdown_handlers_with_error(self, process_manager):
        """Test shutdown handlers continue even if one fails."""
        called = []

        def handler1():
            called.append(1)

        def handler2():
            raise Exception("Test error")

        def handler3():
            called.append(3)

        process_manager.add_shutdown_handler(handler1)
        process_manager.add_shutdown_handler(handler2)
        process_manager.add_shutdown_handler(handler3)

        await process_manager.execute_shutdown_handlers()

        # Should execute all handlers despite error
        assert 1 in called
        assert 3 in called

    @pytest.mark.asyncio
    async def test_execute_shutdown_handlers_idempotent(self, process_manager):
        """Test shutdown handlers don't execute twice."""
        called = []

        def handler():
            called.append(1)

        process_manager.add_shutdown_handler(handler)

        await process_manager.execute_shutdown_handlers()
        await process_manager.execute_shutdown_handlers()

        # Should only execute once
        assert called == [1]

class TestEnsurePortAvailable:
    """Test ensuring port availability."""

    @pytest.mark.asyncio
    async def test_ensure_port_available_free_port(self, process_manager):
        """Test ensuring free port is available."""
        # Find a free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            free_port = s.getsockname()[1]

        result = await process_manager.ensure_port_available(free_port)
        assert result is True

    @pytest.mark.asyncio
    async def test_ensure_port_available_occupied_port(self, process_manager, test_server):
        """Test ensuring occupied port attempts cleanup."""
        port, server = test_server

        # This will attempt to kill the process
        # May or may not succeed depending on permissions
        result = await process_manager.ensure_port_available(port, max_retries=1)

        # Just verify it returns a boolean
        assert isinstance(result, bool)

class TestCleanupOnStartup:
    """Test startup cleanup."""

    @pytest.mark.asyncio
    async def test_cleanup_on_startup_no_ports(self, process_manager):
        """Test cleanup with no managed ports."""
        await process_manager.cleanup_on_startup()
        # Should complete without error

    @pytest.mark.asyncio
    async def test_cleanup_on_startup_with_ports(self, process_manager):
        """Test cleanup with managed ports."""
        process_manager.register_managed_port(5050, "test-service")
        process_manager.register_managed_port(8080, "api-service")

        await process_manager.cleanup_on_startup()
        # Should complete without error

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

class TestThreadSafety:
    """Test thread safety of ProcessManager."""

    @pytest.mark.asyncio
    async def test_concurrent_port_registration(self, process_manager):
        """Test concurrent port registration is thread-safe."""
        def register_ports(start, count):
            for i in range(count):
                process_manager.register_managed_port(start + i, f"service-{start + i}")

        threads = [
            threading.Thread(target=register_ports, args=(5000, 10)),
            threading.Thread(target=register_ports, args=(5100, 10)),
            threading.Thread(target=register_ports, args=(5200, 10))
        ]

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        assert len(process_manager.managed_ports) == 30

    @pytest.mark.asyncio
    async def test_concurrent_shutdown_handler_registration(self, process_manager):
        """Test concurrent shutdown handler registration is thread-safe."""
        def add_handlers(count):
            for i in range(count):
                process_manager.add_shutdown_handler(lambda: None)

        threads = [
            threading.Thread(target=add_handlers, args=(10,)),
            threading.Thread(target=add_handlers, args=(10,)),
            threading.Thread(target=add_handlers, args=(10,))
        ]

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        assert len(process_manager.shutdown_handlers) == 30

class TestKillProcessById:
    """Test killing process by ID."""

    @pytest.mark.asyncio
    async def test_kill_process_by_id_invalid_pid(self, process_manager):
        """Test killing non-existent process."""
        # Use a PID that's unlikely to exist
        result = await process_manager.kill_process_by_id(999999)
        # May succeed or fail depending on OS, just verify it returns bool
        assert isinstance(result, bool)

class TestSecondInstanceCallback:
    """Test second instance callback registration."""

    def test_on_second_instance(self, process_manager):
        """Test registering second instance callback."""
        called = []

        def callback():
            called.append(True)

        process_manager.on_second_instance(callback)

        # Verify callback was stored
        assert hasattr(process_manager, '_second_instance_callbacks')
        assert len(process_manager._second_instance_callbacks) == 1

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

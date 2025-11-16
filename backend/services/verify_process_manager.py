"""
Simple verification script for ProcessManager.

Tests basic functionality without pytest to avoid __init__.py dependency issues.
"""

import asyncio
import socket
import sys
import os
from datetime import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Direct import by loading the module file
import importlib.util
spec = importlib.util.spec_from_file_location(
    "process_manager",
    os.path.join(os.path.dirname(__file__), "process_manager.py")
)
process_manager_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(process_manager_module)

ProcessManager = process_manager_module.ProcessManager
get_process_manager = process_manager_module.get_process_manager
reset_process_manager = process_manager_module.reset_process_manager


def test_initialization():
    """Test ProcessManager initialization."""
    print("Testing initialization...")
    reset_process_manager()
    pm = ProcessManager()
    assert pm is not None
    assert isinstance(pm.start_time, datetime)
    assert len(pm.managed_ports) == 0
    assert len(pm.shutdown_handlers) == 0
    print("✓ Initialization passed")


def test_singleton():
    """Test singleton pattern."""
    print("Testing singleton pattern...")
    reset_process_manager()
    pm1 = get_process_manager()
    pm2 = get_process_manager()
    assert pm1 is pm2
    print("✓ Singleton pattern passed")


def test_single_instance_lock():
    """Test single instance lock."""
    print("Testing single instance lock...")
    reset_process_manager()
    pm = ProcessManager()
    result1 = pm.enforce_single_instance()
    result2 = pm.enforce_single_instance()
    assert result1 is True
    assert result2 is False
    print("✓ Single instance lock passed")


async def test_port_operations():
    """Test port operations."""
    print("Testing port operations...")
    reset_process_manager()
    pm = ProcessManager()

    # Test with a free port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        free_port = s.getsockname()[1]

    in_use = await pm.is_port_in_use(free_port)
    assert in_use is False

    # Test with an occupied port
    test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    test_socket.bind(('127.0.0.1', 0))
    test_socket.listen(1)
    occupied_port = test_socket.getsockname()[1]

    in_use = await pm.is_port_in_use(occupied_port)
    assert in_use is True

    test_socket.close()
    print("✓ Port operations passed")


def test_managed_ports():
    """Test managed port tracking."""
    print("Testing managed port tracking...")
    reset_process_manager()
    pm = ProcessManager()

    pm.register_managed_port(5050, "test-service")
    assert 5050 in pm.managed_ports
    assert pm.managed_ports[5050] == "test-service"

    pm.track_port(8080, "api-server")
    assert 8080 in pm.managed_ports
    assert pm.managed_ports[8080] == "api-server"

    assert len(pm.managed_ports) == 2
    print("✓ Managed port tracking passed")


async def test_process_status():
    """Test process status reporting."""
    print("Testing process status reporting...")
    reset_process_manager()
    pm = ProcessManager()

    status = await pm.get_process_status()
    assert status.is_running is True
    assert isinstance(status.start_time, datetime)
    assert len(status.ports) == 0

    pm.register_managed_port(5050, "service-1")
    pm.register_managed_port(8080, "service-2")

    status = await pm.get_status()
    assert len(status.ports) == 2
    port_nums = [p.port for p in status.ports]
    assert 5050 in port_nums
    assert 8080 in port_nums
    print("✓ Process status reporting passed")


async def test_shutdown_handlers():
    """Test shutdown handler management."""
    print("Testing shutdown handlers...")
    reset_process_manager()
    pm = ProcessManager()

    # Test sync handler
    called_sync = []

    def sync_handler():
        called_sync.append(1)

    pm.add_shutdown_handler(sync_handler)
    assert len(pm.shutdown_handlers) == 1

    # Test async handler
    called_async = []

    async def async_handler():
        await asyncio.sleep(0.01)
        called_async.append(2)

    pm.on_shutdown(async_handler)
    assert len(pm.shutdown_handlers) == 2

    # Execute handlers
    await pm.execute_shutdown_handlers()
    assert called_sync == [1]
    assert called_async == [2]

    print("✓ Shutdown handlers passed")


async def test_error_logging():
    """Test error logging."""
    print("Testing error logging...")
    reset_process_manager()
    pm = ProcessManager()

    error = Exception("Test error")
    pm.log_error(error)  # Should not raise

    context = {"port": 5050, "operation": "test"}
    pm.log_error(error, context)  # Should not raise

    print("✓ Error logging passed")


async def test_cleanup_on_startup():
    """Test startup cleanup."""
    print("Testing startup cleanup...")
    reset_process_manager()
    pm = ProcessManager()

    pm.register_managed_port(5050, "test-service")
    pm.register_managed_port(8080, "api-service")

    await pm.cleanup_on_startup()  # Should complete without error

    print("✓ Startup cleanup passed")


async def run_async_tests():
    """Run all async tests."""
    await test_port_operations()
    await test_process_status()
    await test_shutdown_handlers()
    await test_error_logging()
    await test_cleanup_on_startup()


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("ProcessManager Verification Script")
    print("=" * 70 + "\n")

    try:
        # Run sync tests
        test_initialization()
        test_singleton()
        test_single_instance_lock()
        test_managed_ports()

        # Run async tests
        asyncio.run(run_async_tests())

        print("\n" + "=" * 70)
        print("✓ All tests passed!")
        print("=" * 70 + "\n")
        return 0

    except Exception as e:
        print("\n" + "=" * 70)
        print(f"X Test failed: {e}")
        print("=" * 70 + "\n")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

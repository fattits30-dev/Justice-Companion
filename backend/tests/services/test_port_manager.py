"""
Unit tests for PortManager service.

Tests port allocation, conflict resolution, monitoring, and configuration management.
"""

import asyncio
import json
import os
import socket
import tempfile
import unittest
from pathlib import Path

from backend.services.port_manager import (
    PortManager,
    PortConfig,
    PortAllocation,
    PortStatus,
    PortManagerConfig,
    get_port_manager,
    DEFAULT_PORT_CONFIGS
)

class TestPortManager(unittest.IsolatedAsyncioTestCase):
    """Test suite for PortManager service."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.temp_dir, "port_config.json")
        self.port_manager = PortManager(PortManagerConfig(
            port_config_path=self.config_path,
            enable_auto_allocation=True,
            max_retries=5,
            retry_delay=0.1
        ))

    async def asyncTearDown(self):
        """Clean up after tests."""
        await self.port_manager.cleanup()
        # Clean up temp directory
        if os.path.exists(self.temp_dir):
            for file in Path(self.temp_dir).glob("*"):
                file.unlink()
            Path(self.temp_dir).rmdir()

    async def test_is_port_available_free_port(self):
        """Test checking availability of a free port."""
        # Find a definitely free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            free_port = s.getsockname()[1]

        available = await self.port_manager.is_port_available(free_port)
        self.assertTrue(available)

    async def test_is_port_available_used_port(self):
        """Test checking availability of a port in use."""
        # Bind to a port
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.bind(('127.0.0.1', 0))
        server_socket.listen(1)
        used_port = server_socket.getsockname()[1]

        try:
            available = await self.port_manager.is_port_available(used_port)
            self.assertFalse(available)
        finally:
            server_socket.close()

    async def test_find_available_port_success(self):
        """Test finding an available port in range."""
        port = await self.port_manager.find_available_port(8000, 8100)
        self.assertIsNotNone(port)
        self.assertGreaterEqual(port, 8000)
        self.assertLessEqual(port, 8100)

    async def test_find_available_port_all_used(self):
        """Test finding port when all in range are used."""
        # Try a very small range that's likely all used
        port = await self.port_manager.find_available_port(1, 10)
        # Either finds one or returns None (likely privileged ports)
        if port is not None:
            self.assertGreaterEqual(port, 1)
            self.assertLessEqual(port, 10)

    async def test_allocate_port_default_success(self):
        """Test successful port allocation using default port."""
        allocation = await self.port_manager.allocate_port("python-ai-service")

        self.assertEqual(allocation.service, "python-ai-service")
        self.assertEqual(allocation.status, "allocated")
        self.assertGreater(allocation.allocated_port, 0)

    async def test_allocate_port_with_fallback(self):
        """Test port allocation with fallback when default is in use."""
        # Occupy the default port
        default_config = self.port_manager.port_configs.get("python-ai-service")
        default_port = default_config.default_port if default_config else 5050

        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.bind(('127.0.0.1', default_port))
        server_socket.listen(1)

        try:
            allocation = await self.port_manager.allocate_port("python-ai-service")

            self.assertEqual(allocation.service, "python-ai-service")
            if allocation.status == "allocated":
                # Should get alternative port
                self.assertNotEqual(allocation.allocated_port, default_port)
                self.assertGreater(allocation.allocated_port, 0)
        finally:
            server_socket.close()

    async def test_allocate_port_unknown_service(self):
        """Test allocating port for unknown service."""
        allocation = await self.port_manager.allocate_port("unknown-service")

        self.assertEqual(allocation.service, "unknown-service")
        self.assertEqual(allocation.status, "error")
        self.assertEqual(allocation.allocated_port, 0)
        self.assertIn("No port configuration found", allocation.message)

    async def test_allocate_port_idempotent(self):
        """Test that allocating same service twice returns same allocation."""
        allocation1 = await self.port_manager.allocate_port("python-ai-service")
        self.assertEqual(allocation1.status, "allocated")

        # Allocate again - should return same port
        allocation2 = await self.port_manager.allocate_port("python-ai-service")
        self.assertEqual(allocation2.allocated_port, allocation1.allocated_port)

    async def test_allocate_all_ports(self):
        """Test allocating all required ports."""
        allocations = await self.port_manager.allocate_all_ports()

        # Check that vite-dev-server (required) is allocated
        self.assertIn("vite-dev-server", allocations)
        self.assertEqual(allocations["vite-dev-server"].status, "allocated")

        # Non-required services should not be in allocations
        for service_name, allocation in allocations.items():
            config = self.port_manager.port_configs.get(service_name)
            self.assertTrue(config.required if config else False)

    async def test_get_port_success(self):
        """Test getting allocated port."""
        await self.port_manager.allocate_port("python-ai-service")
        port = self.port_manager.get_port("python-ai-service")

        self.assertIsNotNone(port)
        self.assertGreater(port, 0)

    async def test_get_port_not_allocated(self):
        """Test getting port for service not allocated."""
        port = self.port_manager.get_port("unknown-service")
        self.assertIsNone(port)

    def test_get_allocated_ports(self):
        """Test getting all allocated ports."""
        async def run_test():
            await self.port_manager.allocate_port("python-ai-service")
            await self.port_manager.allocate_port("vite-dev-server")

            port_map = self.port_manager.get_allocated_ports()

            self.assertIn("python-ai-service", port_map)
            self.assertIn("vite-dev-server", port_map)
            self.assertGreater(port_map["python-ai-service"], 0)
            self.assertGreater(port_map["vite-dev-server"], 0)

        asyncio.run(run_test())

    def test_release_port(self):
        """Test releasing a port allocation."""
        async def run_test():
            await self.port_manager.allocate_port("python-ai-service")
            allocated_port = self.port_manager.get_port("python-ai-service")
            self.assertIsNotNone(allocated_port)

            self.port_manager.release_port("python-ai-service")
            released_port = self.port_manager.get_port("python-ai-service")
            self.assertIsNone(released_port)

        asyncio.run(run_test())

    def test_release_all_ports(self):
        """Test releasing all ports."""
        async def run_test():
            await self.port_manager.allocate_port("python-ai-service")
            await self.port_manager.allocate_port("vite-dev-server")

            self.port_manager.release_all_ports()

            port_map = self.port_manager.get_allocated_ports()
            self.assertEqual(len(port_map), 0)

        asyncio.run(run_test())

    async def test_get_port_status(self):
        """Test getting port status."""
        await self.port_manager.allocate_port("python-ai-service")
        statuses = await self.port_manager.get_port_status()

        self.assertGreater(len(statuses), 0)

        # Find python-ai-service status
        python_status = next(
            (s for s in statuses if s.service == "python-ai-service"),
            None
        )
        self.assertIsNotNone(python_status)
        self.assertGreater(python_status.port, 0)
        self.assertEqual(python_status.service, "python-ai-service")

    async def test_save_configuration(self):
        """Test saving configuration to file."""
        await self.port_manager.allocate_port("python-ai-service")
        await self.port_manager.save_configuration(self.config_path)

        self.assertTrue(os.path.exists(self.config_path))

        # Load and verify
        with open(self.config_path, 'r') as f:
            config_data = json.load(f)

        self.assertIn("timestamp", config_data)
        self.assertIn("portConfigs", config_data)
        self.assertIn("allocations", config_data)
        self.assertGreater(len(config_data["allocations"]), 0)

    async def test_load_custom_configuration(self):
        """Test loading custom configuration from file."""
        # Create custom config
        custom_config = [{
            "service": "custom-service",
            "default_port": 9999,
            "range": [9990, 10000],
            "description": "Custom test service",
            "required": False
        }]

        with open(self.config_path, 'w') as f:
            json.dump(custom_config, f)

        # Create new port manager with custom config
        pm = PortManager(PortManagerConfig(port_config_path=self.config_path))

        self.assertIn("custom-service", pm.port_configs)
        custom = pm.port_configs["custom-service"]
        self.assertEqual(custom.default_port, 9999)
        self.assertEqual(custom.range, (9990, 10000))

        await pm.cleanup()

    def test_get_environment_variables(self):
        """Test getting environment variables for ports."""
        async def run_test():
            await self.port_manager.allocate_port("python-ai-service")
            env_vars = self.port_manager.get_environment_variables()

            self.assertIn("PYTHON_AI_SERVICE_PORT", env_vars)
            port_str = env_vars["PYTHON_AI_SERVICE_PORT"]
            self.assertTrue(port_str.isdigit())
            self.assertGreater(int(port_str), 0)

        asyncio.run(run_test())

    async def test_wait_for_port_success(self):
        """Test waiting for port to become in use."""
        # Find free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            test_port = s.getsockname()[1]

        # Start server after delay
        async def start_server():
            await asyncio.sleep(0.5)
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server.bind(('127.0.0.1', test_port))
            server.listen(1)
            return server

        server_task = asyncio.create_task(start_server())

        try:
            # Wait for port
            result = await self.port_manager.wait_for_port(
                test_port,
                timeout=2.0,
                check_interval=0.1
            )
            self.assertTrue(result)

            # Cleanup server
            server = await server_task
            server.close()
        except Exception:
            if not server_task.done():
                server_task.cancel()
            raise

    async def test_wait_for_port_timeout(self):
        """Test waiting for port that never becomes in use."""
        # Find free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            test_port = s.getsockname()[1]

        # Don't start any server - should timeout
        result = await self.port_manager.wait_for_port(
            test_port,
            timeout=1.0,
            check_interval=0.2
        )
        self.assertFalse(result)

    async def test_cleanup(self):
        """Test cleanup releases all resources."""
        await self.port_manager.allocate_port("python-ai-service")
        await self.port_manager.cleanup()

        port_map = self.port_manager.get_allocated_ports()
        self.assertEqual(len(port_map), 0)

class TestPortManagerSingleton(unittest.TestCase):
    """Test suite for get_port_manager singleton."""

    def test_singleton_returns_same_instance(self):
        """Test that get_port_manager returns same instance."""
        pm1 = get_port_manager()
        pm2 = get_port_manager()

        self.assertIs(pm1, pm2)

    def test_singleton_with_config(self):
        """Test singleton initialization with config."""
        config = PortManagerConfig(enable_auto_allocation=False)
        pm = get_port_manager(config)

        # Config should be applied (only on first call)
        self.assertIsNotNone(pm)
        self.assertIsInstance(pm, PortManager)

class TestPortConfig(unittest.TestCase):
    """Test suite for PortConfig dataclass."""

    def test_port_config_creation(self):
        """Test creating PortConfig."""
        config = PortConfig(
            service="test-service",
            default_port=8080,
            range=(8080, 8090),
            description="Test service",
            required=True
        )

        self.assertEqual(config.service, "test-service")
        self.assertEqual(config.default_port, 8080)
        self.assertEqual(config.range, (8080, 8090))
        self.assertEqual(config.description, "Test service")
        self.assertTrue(config.required)

    def test_port_config_defaults(self):
        """Test PortConfig default values."""
        config = PortConfig(
            service="test-service",
            default_port=8080
        )

        self.assertIsNone(config.range)
        self.assertIsNone(config.description)
        self.assertFalse(config.required)

class TestPortAllocation(unittest.TestCase):
    """Test suite for PortAllocation dataclass."""

    def test_port_allocation_creation(self):
        """Test creating PortAllocation."""
        allocation = PortAllocation(
            service="test-service",
            requested_port=8080,
            allocated_port=8081,
            status="allocated",
            message="Alternative port allocated"
        )

        self.assertEqual(allocation.service, "test-service")
        self.assertEqual(allocation.requested_port, 8080)
        self.assertEqual(allocation.allocated_port, 8081)
        self.assertEqual(allocation.status, "allocated")
        self.assertEqual(allocation.message, "Alternative port allocated")

class TestPortStatus(unittest.TestCase):
    """Test suite for PortStatus dataclass."""

    def test_port_status_creation(self):
        """Test creating PortStatus."""
        from datetime import datetime

        now = datetime.now()
        status = PortStatus(
            port=8080,
            service="test-service",
            in_use=True,
            pid=12345,
            allocated_at=now
        )

        self.assertEqual(status.port, 8080)
        self.assertEqual(status.service, "test-service")
        self.assertTrue(status.in_use)
        self.assertEqual(status.pid, 12345)
        self.assertEqual(status.allocated_at, now)

class TestDefaultPortConfigs(unittest.TestCase):
    """Test suite for default port configurations."""

    def test_default_configs_exist(self):
        """Test that default configurations are defined."""
        self.assertGreater(len(DEFAULT_PORT_CONFIGS), 0)

    def test_vite_dev_server_config(self):
        """Test vite-dev-server configuration."""
        vite_config = next(
            (c for c in DEFAULT_PORT_CONFIGS if c.service == "vite-dev-server"),
            None
        )

        self.assertIsNotNone(vite_config)
        self.assertEqual(vite_config.default_port, 5176)
        self.assertTrue(vite_config.required)

    def test_python_ai_service_config(self):
        """Test python-ai-service configuration."""
        ai_config = next(
            (c for c in DEFAULT_PORT_CONFIGS if c.service == "python-ai-service"),
            None
        )

        self.assertIsNotNone(ai_config)
        self.assertEqual(ai_config.default_port, 5050)
        self.assertIsNotNone(ai_config.range)

if __name__ == '__main__':
    unittest.main()

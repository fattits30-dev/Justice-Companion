"""
Example usage of PortManager service.

Demonstrates port allocation, monitoring, and configuration management.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to path for direct execution
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.port_manager import PortManager, PortManagerConfig, get_port_manager

# Configure UTF-8 encoding for Windows console
import os

if sys.platform == "win32":
    os.system("chcp 65001 >nul 2>&1")  # Set UTF-8 code page

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Use ASCII-safe check marks
CHECK = "[OK]"
CROSS = "[FAIL]"


async def example_basic_usage():
    """Example 1: Basic port allocation."""
    print("\n" + "=" * 70)
    print("Example 1: Basic Port Allocation")
    print("=" * 70)

    # Get singleton instance
    port_manager = get_port_manager()

    # Allocate port for Python AI service
    allocation = await port_manager.allocate_port("python-ai-service")

    if allocation.status == "allocated":
        print(f"{CHECK} Allocated port {allocation.allocated_port} for {allocation.service}")
        print(f"  Message: {allocation.message}")
    else:
        print(f"{CROSS} Failed to allocate port: {allocation.message}")

    # Get allocated port
    port = port_manager.get_port("python-ai-service")
    print(f"{CHECK} Service running on port: {port}")

    # Cleanup
    await port_manager.cleanup()


async def example_allocate_all_required():
    """Example 2: Allocate all required ports."""
    print("\n" + "=" * 70)
    print("Example 2: Allocate All Required Ports")
    print("=" * 70)

    port_manager = get_port_manager()

    # Allocate all required ports
    allocations = await port_manager.allocate_all_ports()

    print(f"\nAllocated {len(allocations)} required ports:")
    for service, allocation in allocations.items():
        if allocation.status == "allocated":
            print(f"  {CHECK} {service:25s} -> port {allocation.allocated_port}")
        else:
            print(f"  {CROSS} {service:25s} -> {allocation.status} ({allocation.message})")

    # Get all allocated ports as dict
    port_map = port_manager.get_allocated_ports()
    print(f"\nPort mapping: {port_map}")

    await port_manager.cleanup()


async def example_port_availability():
    """Example 3: Check port availability."""
    print("\n" + "=" * 70)
    print("Example 3: Check Port Availability")
    print("=" * 70)

    port_manager = get_port_manager()

    # Check specific ports
    ports_to_check = [5050, 5051, 5052, 8080, 9000]

    print("\nChecking port availability:")
    for port in ports_to_check:
        available = await port_manager.is_port_available(port)
        status = "{CHECK} Available" if available else "{CROSS} In Use"
        print(f"  Port {port:5d}: {status}")

    # Find available port in range
    print("\nFinding available port in range 5050-5060:")
    free_port = await port_manager.find_available_port(5050, 5060)
    if free_port:
        print(f"  {CHECK} Found free port: {free_port}")
    else:
        print(f"  {CROSS} No free ports in range")

    await port_manager.cleanup()


async def example_fallback_allocation():
    """Example 4: Port allocation with fallback."""
    print("\n" + "=" * 70)
    print("Example 4: Port Allocation with Fallback")
    print("=" * 70)

    # Enable auto-allocation with fallback
    config = PortManagerConfig(enable_auto_allocation=True, max_retries=10)
    port_manager = PortManager(config)

    # Allocate port - will use fallback if default is busy
    allocation = await port_manager.allocate_port("python-ai-service")

    print(f"\nRequested port: {allocation.requested_port}")
    print(f"Allocated port: {allocation.allocated_port}")
    print(f"Status: {allocation.status}")
    print(f"Message: {allocation.message}")

    if allocation.allocated_port != allocation.requested_port:
        print(f"\n{CHECK} Fallback port allocation successful!")
        print(f"  Default port {allocation.requested_port} was in use")
        print(f"  Found alternative port {allocation.allocated_port}")

    await port_manager.cleanup()


async def example_port_status():
    """Example 5: Get port status."""
    print("\n" + "=" * 70)
    print("Example 5: Get Port Status")
    print("=" * 70)

    port_manager = get_port_manager()

    # Allocate some ports
    await port_manager.allocate_port("python-ai-service")
    await port_manager.allocate_port("vite-dev-server")

    # Get status
    statuses = await port_manager.get_port_status()

    print(f"\nPort Status ({len(statuses)} services):")
    print(f"{'Service':<25} {'Port':<8} {'In Use':<10}")
    print("-" * 50)
    for status in statuses:
        in_use_str = "Yes" if status.in_use else "No"
        print(f"{status.service:<25} {status.port:<8} {in_use_str:<10}")

    await port_manager.cleanup()


async def example_environment_variables():
    """Example 6: Generate environment variables."""
    print("\n" + "=" * 70)
    print("Example 6: Generate Environment Variables")
    print("=" * 70)

    port_manager = get_port_manager()

    # Allocate ports
    await port_manager.allocate_port("python-ai-service")
    await port_manager.allocate_port("vite-dev-server")
    await port_manager.allocate_port("electron-dev-api")

    # Get environment variables
    env_vars = port_manager.get_environment_variables()

    print("\nGenerated environment variables:")
    for key, value in sorted(env_vars.items()):
        print(f"  {key}={value}")

    print("\nYou can use these in your .env file or pass to subprocess:")
    print("  import os")
    print("  os.environ.update(env_vars)")

    await port_manager.cleanup()


async def example_wait_for_port():
    """Example 7: Wait for service to start."""
    print("\n" + "=" * 70)
    print("Example 7: Wait for Service to Start")
    print("=" * 70)

    port_manager = get_port_manager()

    # Simulate waiting for a service to start on port 5050
    print("\nWaiting for service on port 5050 (timeout: 5 seconds)...")

    # In real usage, another process would be starting the service
    # For demo, we'll just show the timeout case
    started = await port_manager.wait_for_port(port=5050, timeout=2.0, check_interval=0.5)

    if started:
        print(f"{CHECK} Service started successfully!")
    else:
        print(f"{CROSS} Service did not start within timeout")

    await port_manager.cleanup()


async def example_release_ports():
    """Example 8: Release port allocations."""
    print("\n" + "=" * 70)
    print("Example 8: Release Port Allocations")
    print("=" * 70)

    port_manager = get_port_manager()

    # Allocate some ports
    print("\nAllocating ports...")
    await port_manager.allocate_port("python-ai-service")
    await port_manager.allocate_port("vite-dev-server")
    await port_manager.allocate_port("electron-dev-api")

    port_map = port_manager.get_allocated_ports()
    print(f"Allocated: {list(port_map.keys())}")

    # Release specific port
    print("\nReleasing python-ai-service...")
    port_manager.release_port("python-ai-service")
    port_map = port_manager.get_allocated_ports()
    print(f"Remaining: {list(port_map.keys())}")

    # Release all ports
    print("\nReleasing all ports...")
    port_manager.release_all_ports()
    port_map = port_manager.get_allocated_ports()
    print(f"Remaining: {list(port_map.keys()) if port_map else 'None'}")

    await port_manager.cleanup()


async def example_configuration_persistence():
    """Example 9: Save and load configuration."""
    print("\n" + "=" * 70)
    print("Example 9: Configuration Persistence")
    print("=" * 70)

    import tempfile
    import os

    # Create temp config file
    temp_dir = tempfile.gettempdir()
    config_path = os.path.join(temp_dir, "port_manager_config.json")

    config = PortManagerConfig(port_config_path=config_path, enable_auto_allocation=True)
    port_manager = PortManager(config)

    # Allocate ports
    print("\nAllocating ports...")
    await port_manager.allocate_port("python-ai-service")
    await port_manager.allocate_port("vite-dev-server")

    # Save configuration
    print(f"\nSaving configuration to {config_path}...")
    await port_manager.save_configuration()
    print(f"{CHECK} Configuration saved")

    # Verify file exists
    if os.path.exists(config_path):
        print(f"{CHECK} Configuration file exists")

        # Show file size
        size = os.path.getsize(config_path)
        print(f"  File size: {size} bytes")

        # Clean up
        os.remove(config_path)
        print(f"{CHECK} Cleaned up temp file")

    await port_manager.cleanup()


async def example_error_handling():
    """Example 10: Error handling."""
    print("\n" + "=" * 70)
    print("Example 10: Error Handling")
    print("=" * 70)

    port_manager = get_port_manager()

    # Try to allocate port for unknown service
    print("\nAttempting to allocate port for unknown service...")
    allocation = await port_manager.allocate_port("unknown-service")

    if allocation.status == "error":
        print(f"{CHECK} Error handled gracefully:")
        print(f"  Status: {allocation.status}")
        print(f"  Message: {allocation.message}")

    # Try to get port for non-allocated service
    print("\nAttempting to get port for non-allocated service...")
    port = port_manager.get_port("non-existent-service")

    if port is None:
        print(f"{CHECK} Returns None for non-existent service")

    # Try to release non-existent port
    print("\nAttempting to release non-existent port...")
    port_manager.release_port("non-existent-service")
    print(f"{CHECK} No error thrown - safe operation")

    await port_manager.cleanup()


async def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("PortManager Service - Example Usage")
    print("=" * 70)

    examples = [
        ("Basic Usage", example_basic_usage),
        ("Allocate All Required", example_allocate_all_required),
        ("Port Availability", example_port_availability),
        ("Fallback Allocation", example_fallback_allocation),
        ("Port Status", example_port_status),
        ("Environment Variables", example_environment_variables),
        ("Wait for Port", example_wait_for_port),
        ("Release Ports", example_release_ports),
        ("Configuration Persistence", example_configuration_persistence),
        ("Error Handling", example_error_handling),
    ]

    for i, (name, example_func) in enumerate(examples, 1):
        try:
            await example_func()
        except Exception as e:
            print(f"\n{CROSS} Example {i} ({name}) failed: {e}")
            import traceback

            traceback.print_exc()

        # Small delay between examples
        await asyncio.sleep(0.5)

    print("\n" + "=" * 70)
    print("All examples completed!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

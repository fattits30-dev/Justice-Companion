"""
Example usage of ProcessManager service.

Demonstrates common patterns for process lifecycle management.
"""

import asyncio
import sys
import os

# Direct import to avoid dependency issues
import importlib.util
spec = importlib.util.spec_from_file_location(
    "process_manager",
    os.path.join(os.path.dirname(__file__), "process_manager.py")
)
process_manager_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(process_manager_module)

get_process_manager = process_manager_module.get_process_manager


async def example_basic_usage():
    """Example 1: Basic ProcessManager usage."""
    print("\n" + "=" * 70)
    print("Example 1: Basic Usage")
    print("=" * 70)

    # Get singleton instance
    pm = get_process_manager()

    # Enforce single instance
    if not pm.enforce_single_instance():
        print("ERROR: Another instance is already running!")
        return

    print("✓ Single instance lock acquired")

    # Register managed ports
    pm.register_managed_port(5050, "python-ai-service")
    pm.register_managed_port(8080, "fastapi-server")
    print("✓ Registered 2 managed ports")

    # Get status
    status = await pm.get_process_status()
    print(f"\nProcess Status:")
    print(f"  Running: {status.is_running}")
    print(f"  Started: {status.start_time}")
    print(f"  Managed ports: {len(status.ports)}")

    for port_status in status.ports:
        status_str = "IN USE" if port_status.in_use else "FREE"
        print(f"    - Port {port_status.port} ({port_status.name}): {status_str}")


async def example_port_management():
    """Example 2: Port Management."""
    print("\n" + "=" * 70)
    print("Example 2: Port Management")
    print("=" * 70)

    pm = get_process_manager()

    # Check if port is in use
    port = 5050
    in_use = await pm.is_port_in_use(port)
    print(f"Port {port} is {'IN USE' if in_use else 'FREE'}")

    # Find process by port
    if in_use:
        process_info = await pm.find_process_by_port(port)
        if process_info.pid:
            print(f"Process {process_info.pid} is using port {port}")
        else:
            print(f"Could not identify process on port {port}")

    # Ensure port is available
    available = await pm.ensure_port_available(5051, max_retries=3)
    if available:
        print(f"✓ Port 5051 is now available")
    else:
        print(f"✗ Could not free port 5051")


async def example_shutdown_handlers():
    """Example 3: Shutdown Handlers."""
    print("\n" + "=" * 70)
    print("Example 3: Shutdown Handlers")
    print("=" * 70)

    pm = get_process_manager()

    # Register synchronous shutdown handler
    def cleanup_resources():
        print("  - Cleaning up resources...")

    pm.add_shutdown_handler(cleanup_resources)

    # Register asynchronous shutdown handler
    async def stop_services():
        print("  - Stopping services...")
        await asyncio.sleep(0.1)  # Simulate async work
        print("  - Services stopped")

    pm.on_shutdown(stop_services)  # Alias for add_shutdown_handler

    # Register another handler
    def save_state():
        print("  - Saving state...")

    pm.add_shutdown_handler(save_state)

    print(f"✓ Registered {len(pm.shutdown_handlers)} shutdown handlers")

    # Execute shutdown handlers
    print("\nExecuting shutdown handlers:")
    await pm.execute_shutdown_handlers()
    print("✓ All shutdown handlers executed")


async def example_startup_workflow():
    """Example 4: Complete Startup Workflow."""
    print("\n" + "=" * 70)
    print("Example 4: Complete Startup Workflow")
    print("=" * 70)

    pm = get_process_manager()

    # Step 1: Enforce single instance
    print("\n1. Enforcing single instance...")
    if not pm.enforce_single_instance():
        print("   ERROR: Another instance is running")
        return False

    print("   ✓ Single instance lock acquired")

    # Step 2: Register managed ports
    print("\n2. Registering managed ports...")
    pm.register_managed_port(5050, "python-ai-service")
    pm.register_managed_port(8080, "fastapi-api")
    pm.register_managed_port(8081, "websocket-server")
    print(f"   ✓ Registered {len(pm.managed_ports)} ports")

    # Step 3: Clean up from previous runs
    print("\n3. Cleaning up from previous runs...")
    await pm.cleanup_on_startup()
    print("   ✓ Cleanup completed")

    # Step 4: Ensure required ports are available
    print("\n4. Ensuring ports are available...")
    for port in [5050, 8080, 8081]:
        available = await pm.ensure_port_available(port, max_retries=2)
        status = "✓" if available else "✗"
        print(f"   {status} Port {port}: {'available' if available else 'unavailable'}")

    # Step 5: Register shutdown handlers
    print("\n5. Registering shutdown handlers...")

    async def cleanup():
        print("   - Shutting down services...")
        # Add cleanup logic here

    pm.add_shutdown_handler(cleanup)
    pm.register_shutdown_handlers()  # Register signal handlers
    print(f"   ✓ Registered {len(pm.shutdown_handlers)} handlers")

    # Step 6: Get final status
    print("\n6. Final status check...")
    status = await pm.get_process_status()
    print(f"   Running: {status.is_running}")
    print(f"   Managed ports: {len(status.ports)}")

    print("\n✓ Startup workflow completed successfully!")
    return True


async def example_error_handling():
    """Example 5: Error Handling."""
    print("\n" + "=" * 70)
    print("Example 5: Error Handling")
    print("=" * 70)

    pm = get_process_manager()

    # ProcessManager methods don't throw - they return status/None
    print("\n1. Testing port operations with invalid data:")

    # Invalid port - won't throw
    in_use = await pm.is_port_in_use(99999)
    print(f"   Port 99999 in use: {in_use}")

    # Find process on free port - returns None PID
    process_info = await pm.find_process_by_port(65535)
    print(f"   Process on port 65535: PID={process_info.pid}")

    # Kill non-existent process - returns False
    success = await pm.kill_process_by_id(999999)
    print(f"   Kill PID 999999: {success}")

    print("\n2. Testing error logging:")
    # Log errors safely
    error = Exception("Test error")
    pm.log_error(error)
    print("   ✓ Error logged (check logs)")

    context = {"operation": "test", "port": 5050}
    pm.log_error(error, context)
    print("   ✓ Error with context logged")

    print("\n✓ Error handling demonstration complete")


async def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("ProcessManager Usage Examples")
    print("=" * 70)

    try:
        await example_basic_usage()
        await example_port_management()
        await example_shutdown_handlers()
        await example_startup_workflow()
        await example_error_handling()

        print("\n" + "=" * 70)
        print("✓ All examples completed successfully!")
        print("=" * 70 + "\n")

    except Exception as e:
        print(f"\n✗ Example failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Fix Windows console encoding
    if sys.platform == 'win32':
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

    asyncio.run(main())

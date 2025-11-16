# ProcessManager Service

**Migrated from:** `src/services/ProcessManager.ts`

## Overview

The `ProcessManager` service provides centralized process lifecycle management for Justice Companion backend services. It handles process discovery, monitoring, termination, port management, and graceful shutdown coordination.

## Key Features

- **Single Instance Lock**: Enforce single application instance (logical lock)
- **Port Management**: Track and manage ports used by services
- **Process Discovery**: Find processes by port number (cross-platform)
- **Process Termination**: Kill processes by PID or port (Windows/Linux/macOS)
- **Shutdown Handling**: Register and execute cleanup handlers
- **Startup Cleanup**: Automatically clean up lingering processes from previous runs
- **Thread-Safe**: All operations are thread-safe with RLock
- **Cross-Platform**: Supports Windows, Linux, and macOS

## Architecture

### Data Models

```python
@dataclass
class ProcessInfo:
    """Information about a process."""
    pid: Optional[int] = None
    name: Optional[str] = None

@dataclass
class PortStatus:
    """Status of a managed port."""
    port: int
    name: str
    in_use: bool

@dataclass
class ProcessStatus:
    """Overall process status."""
    is_running: bool
    start_time: datetime
    ports: List[PortStatus]
```

### Main Class

```python
class ProcessManager:
    """Centralized process lifecycle management."""

    def __init__(self):
        self.start_time: datetime
        self.managed_ports: Dict[int, str]
        self.shutdown_handlers: List[Callable]
```

## Usage Examples

### Basic Initialization

```python
from backend.services.process_manager import get_process_manager

# Get singleton instance
process_manager = get_process_manager()
```

### Single Instance Lock

```python
# Enforce single instance (prevents multiple app instances)
if not process_manager.enforce_single_instance():
    print("Another instance is already running")
    sys.exit(1)
```

### Port Management

```python
# Register managed ports
process_manager.register_managed_port(5050, "python-ai-service")
process_manager.track_port(8080, "api-server")  # Alias

# Check if port is in use
if await process_manager.is_port_in_use(5050):
    print("Port 5050 is occupied")

# Ensure port is available (kills process if needed)
available = await process_manager.ensure_port_available(5050, max_retries=3)
if not available:
    print("Could not free port 5050")
```

### Process Discovery

```python
# Find process using a port
process_info = await process_manager.find_process_by_port(5050)
if process_info.pid:
    print(f"Process {process_info.pid} is using port 5050")
else:
    print("No process found on port 5050")
```

### Process Termination

```python
# Kill process by port
success = await process_manager.kill_process_on_port(5050)
if success:
    print("Process on port 5050 terminated")

# Kill process by PID
success = await process_manager.kill_process_by_id(1234)
if success:
    print("Process 1234 terminated")
```

### Shutdown Handlers

```python
# Register synchronous shutdown handler
def cleanup_resources():
    print("Cleaning up resources...")

process_manager.add_shutdown_handler(cleanup_resources)

# Register asynchronous shutdown handler
async def async_cleanup():
    await some_async_operation()
    print("Async cleanup complete")

process_manager.on_shutdown(async_cleanup)  # Alias

# Execute all shutdown handlers
await process_manager.execute_shutdown_handlers()
```

### Startup Cleanup

```python
# Clean up lingering processes from previous runs
await process_manager.cleanup_on_startup()
```

### Process Status

```python
# Get overall process status
status = await process_manager.get_process_status()
print(f"Running: {status.is_running}")
print(f"Started: {status.start_time}")
print(f"Managed ports: {len(status.ports)}")

for port_status in status.ports:
    print(f"  Port {port_status.port} ({port_status.name}): "
          f"{'IN USE' if port_status.in_use else 'FREE'}")
```

### Complete Startup Workflow

```python
from backend.services.process_manager import get_process_manager

async def startup():
    # Get process manager
    pm = get_process_manager()

    # Enforce single instance
    if not pm.enforce_single_instance():
        print("Another instance is running")
        sys.exit(1)

    # Register managed ports
    pm.register_managed_port(5050, "python-ai-service")
    pm.register_managed_port(8080, "api-server")

    # Clean up from previous runs
    await pm.cleanup_on_startup()

    # Register shutdown handlers
    async def cleanup():
        print("Shutting down services...")

    pm.add_shutdown_handler(cleanup)
    pm.register_shutdown_handlers()  # Register signal handlers

    # Ensure ports are available
    if not await pm.ensure_port_available(5050):
        print("Could not free port 5050")
        return False

    print("Process manager initialized successfully")
    return True

# Run startup
asyncio.run(startup())
```

## Platform-Specific Behavior

### Windows
- **Process Discovery**: Uses `netstat -ano | findstr :PORT`
- **Process Termination**: Uses `taskkill /F /PID`
- **Port Binding**: Standard Windows socket operations

### Linux/macOS
- **Process Discovery**: Uses `lsof -i :PORT -t`
- **Process Termination**: Uses `kill -9 PID`
- **Port Binding**: Standard POSIX socket operations

## API Reference

### Core Methods

#### `enforce_single_instance() -> bool`
Enforce single instance lock. Returns `True` if lock acquired, `False` if another instance is running.

#### `async is_port_in_use(port: int, host: str = '127.0.0.1') -> bool`
Check if a port is currently in use.

#### `async find_process_by_port(port: int) -> ProcessInfo`
Find process using a specific port. Returns `ProcessInfo` with PID if found.

#### `async kill_process_on_port(port: int) -> bool`
Kill process running on a port. Returns `True` if successful.

#### `async kill_process_by_id(pid: int) -> bool`
Kill process by PID. Returns `True` if successful.

#### `register_managed_port(port: int, name: str) -> None`
Register a port to be managed by process manager.

#### `add_shutdown_handler(handler: Callable) -> None`
Add shutdown handler (sync or async function).

#### `async execute_shutdown_handlers() -> None`
Execute all registered shutdown handlers.

#### `async cleanup_on_startup() -> None`
Clean up lingering processes on managed ports.

#### `async get_process_status() -> ProcessStatus`
Get overall process status including port information.

#### `async ensure_port_available(port: int, max_retries: int = 1) -> bool`
Ensure port is available, killing process if necessary.

### Aliases

- `track_port(port, name)` → `register_managed_port(port, name)`
- `on_shutdown(handler)` → `add_shutdown_handler(handler)`
- `get_status()` → `get_process_status()`

### Utility Methods

#### `register_shutdown_handlers() -> None`
Register signal handlers (SIGTERM, SIGINT) for graceful shutdown.

#### `on_second_instance(callback: Callable) -> None`
Register callback for second instance detection (requires external implementation).

#### `log_error(error: Exception, context: Optional[Dict] = None) -> None`
Log error with context.

## Singleton Pattern

The ProcessManager uses a thread-safe singleton pattern:

```python
from backend.services.process_manager import get_process_manager, reset_process_manager

# Get singleton instance
pm = get_process_manager()

# Reset singleton (useful for testing)
reset_process_manager()
```

## Thread Safety

All public methods are thread-safe using `threading.RLock`:

```python
# Safe to call from multiple threads
def worker_thread():
    pm = get_process_manager()
    pm.register_managed_port(5000 + thread_id, f"worker-{thread_id}")
```

## Error Handling

The ProcessManager follows a **non-throwing** pattern for critical operations:

- Port operations return `False` on failure
- Process discovery returns `ProcessInfo(pid=None)` if not found
- Errors are logged but don't raise exceptions
- Shutdown handlers continue executing even if one fails

```python
# Safe - won't throw
success = await pm.kill_process_on_port(5050)
if not success:
    print("Failed to kill process")
```

## Testing

Comprehensive test suite included in `test_process_manager.py`:

```bash
# Run tests
pytest backend/services/test_process_manager.py -v

# Run specific test class
pytest backend/services/test_process_manager.py::TestPortOperations -v

# Run with coverage
pytest backend/services/test_process_manager.py --cov=backend.services.process_manager
```

### Test Coverage

- ✅ Initialization and singleton pattern
- ✅ Single instance lock enforcement
- ✅ Port availability checking
- ✅ Process discovery by port
- ✅ Managed port tracking
- ✅ Process status reporting
- ✅ Shutdown handler management (sync/async/mixed)
- ✅ Shutdown handler error handling
- ✅ Startup cleanup
- ✅ Thread safety
- ✅ Error logging
- ✅ Aliases and utility methods

## Integration with Other Services

### With PortManager

```python
from backend.services.port_manager import get_port_manager
from backend.services.process_manager import get_process_manager

# Allocate port
port_manager = get_port_manager()
allocation = await port_manager.allocate_port("python-ai-service")

# Register with process manager
process_manager = get_process_manager()
if allocation.status == "allocated":
    process_manager.register_managed_port(
        allocation.allocated_port,
        "python-ai-service"
    )
```

### With Service Startup

```python
async def start_service():
    pm = get_process_manager()

    # Ensure port is available
    if not await pm.ensure_port_available(5050):
        raise RuntimeError("Port 5050 is not available")

    # Start service
    server = await start_fastapi_server(port=5050)

    # Register shutdown handler
    async def stop_server():
        await server.shutdown()

    pm.add_shutdown_handler(stop_server)
```

## Migration Notes

**From TypeScript (`src/services/ProcessManager.ts`):**

1. **Electron API Removal**: `app.requestSingleInstanceLock()` replaced with logical lock
2. **Async/Await**: All I/O operations are async
3. **Type Hints**: Comprehensive type annotations using Python 3.9+ syntax
4. **Dataclasses**: Used for structured data (ProcessInfo, PortStatus, ProcessStatus)
5. **Logging**: Uses Python `logging` module instead of custom logger
6. **Cross-Platform**: Platform detection with `platform.system()`
7. **Signal Handling**: Added `register_shutdown_handlers()` for SIGTERM/SIGINT

## Best Practices

1. **Always use singleton**: Call `get_process_manager()` instead of `ProcessManager()`
2. **Register ports early**: Call `register_managed_port()` during initialization
3. **Clean up on startup**: Always call `cleanup_on_startup()` to handle stale processes
4. **Register shutdown handlers**: Use `add_shutdown_handler()` for graceful cleanup
5. **Handle failures gracefully**: Check return values, don't assume success
6. **Use ensure_port_available**: Instead of manually checking and killing
7. **Register signal handlers**: Call `register_shutdown_handlers()` for SIGTERM/SIGINT

## Known Limitations

1. **Single instance lock**: Logical lock only, not OS-level (unlike Electron)
2. **Process discovery**: May not work with all network configurations
3. **Permission requirements**: Killing processes may require elevated privileges
4. **Platform differences**: Command availability varies by OS
5. **Second instance detection**: Requires external implementation (file locks, sockets)

## Future Enhancements

- [ ] OS-level file lock for single instance enforcement
- [ ] Process monitoring with health checks
- [ ] Automatic restart on crash
- [ ] Process memory and CPU usage tracking
- [ ] Docker container detection and management
- [ ] Systemd/Windows Service integration
- [ ] Process group management
- [ ] Socket-based IPC for second instance detection

## License

Part of Justice Companion - Privacy-first legal case management application.

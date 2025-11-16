# AutoUpdater Service

Python implementation of the AutoUpdater service for checking and downloading application updates from GitHub releases.

**Migrated from:** `src/services/AutoUpdater.ts`

## Features

- ✅ Check for updates from GitHub releases
- ✅ Download updates with progress tracking
- ✅ Semantic version comparison
- ✅ Update channel support (stable, beta, alpha)
- ✅ Configurable update server URL
- ✅ SHA256 checksum verification
- ✅ Progress callbacks for download tracking
- ✅ Retry logic with exponential backoff
- ✅ Comprehensive error handling and logging
- ✅ Async operations for non-blocking updates
- ✅ Context manager support

## Installation

### Required Dependencies

```bash
pip install httpx packaging
```

### Optional Dependencies

For testing:
```bash
pip install pytest pytest-asyncio
```

## Quick Start

### Basic Usage

```python
from backend.services.auto_updater import (
    AutoUpdater,
    AutoUpdaterConfig,
    UpdateChannel
)

# Create configuration
config = AutoUpdaterConfig(
    check_on_startup=True,
    channel=UpdateChannel.STABLE
)

# Create updater
async with AutoUpdater(
    repo="owner/repository",
    current_version="1.0.0",
    config=config
) as updater:
    # Check for updates
    result = await updater.check_for_updates()

    if result.update_available:
        print(f"Update available: {result.latest_version}")

        # Download update
        download_result = await updater.download_update(result.update_info)

        if download_result.success:
            print(f"Downloaded to: {download_result.file_path}")
```

### With Progress Tracking

```python
async with AutoUpdater(
    repo="owner/repo",
    current_version="1.0.0"
) as updater:
    # Register progress callback
    def on_progress(percent: float):
        print(f"Download progress: {percent:.1f}%")

    updater.on_download_progress(on_progress)

    # Check and download
    result = await updater.check_for_updates()
    if result.update_available:
        await updater.download_update(result.update_info)
```

## Configuration

### AutoUpdaterConfig

```python
@dataclass
class AutoUpdaterConfig:
    check_on_startup: bool = True          # Check for updates on startup
    update_server_url: Optional[str] = None  # Custom update server URL
    channel: UpdateChannel = UpdateChannel.STABLE  # Update channel
    github_token: Optional[str] = None     # GitHub token (private repos)
    timeout_seconds: int = 30              # HTTP request timeout
    max_retries: int = 3                   # Maximum retry attempts
```

### Update Channels

```python
class UpdateChannel(str, Enum):
    STABLE = "stable"  # Only stable releases (no pre-releases)
    BETA = "beta"      # Stable + beta releases
    ALPHA = "alpha"    # All releases (including alpha)
```

**Channel Behavior:**

- **STABLE**: Only matches releases without pre-release tags (e.g., `1.0.0`, `2.1.3`)
- **BETA**: Matches stable releases and beta pre-releases (e.g., `1.0.0-beta.1`)
- **ALPHA**: Matches all releases including alpha versions (e.g., `1.0.0-alpha.1`)

## API Reference

### AutoUpdater

Main class for managing application updates.

#### Constructor

```python
def __init__(
    repo: str,                              # GitHub repo (owner/name)
    current_version: str,                   # Current app version (semver)
    config: Optional[AutoUpdaterConfig],    # Configuration
    audit_logger: Optional[Any]             # Audit logger instance
)
```

#### Methods

##### check_for_updates()

Check for available updates from GitHub releases.

```python
async def check_for_updates() -> UpdateCheckResult
```

**Returns:** `UpdateCheckResult` with update information

**Example:**
```python
result = await updater.check_for_updates()
if result.update_available:
    print(f"Latest version: {result.latest_version}")
```

##### download_update()

Download update file with progress tracking.

```python
async def download_update(
    update_info: UpdateInfo,
    output_path: Optional[str] = None
) -> UpdateDownloadResult
```

**Parameters:**
- `update_info`: Update information from check_for_updates()
- `output_path`: Optional output path (default: temp directory)

**Returns:** `UpdateDownloadResult` with download status

**Example:**
```python
result = await updater.download_update(update_info)
if result.success:
    print(f"Downloaded to: {result.file_path}")
```

##### compare_versions()

Compare two semantic version strings.

```python
def compare_versions(v1: str, v2: str) -> int
```

**Returns:**
- `-1` if v1 < v2
- `0` if v1 == v2
- `1` if v1 > v2

**Example:**
```python
result = updater.compare_versions("1.0.0", "1.1.0")
# Returns -1 (1.0.0 < 1.1.0)
```

##### on_download_progress()

Register callback for download progress updates.

```python
def on_download_progress(callback: Callable[[float], None])
```

**Parameters:**
- `callback`: Function called with progress percentage (0-100)

**Example:**
```python
def progress_handler(percent: float):
    print(f"Progress: {percent:.1f}%")

updater.on_download_progress(progress_handler)
```

##### get_status()

Get current updater status.

```python
def get_status() -> UpdateStatus
```

**Returns:** Copy of current `UpdateStatus`

**Example:**
```python
status = updater.get_status()
print(f"Current: {status.current_version}")
print(f"Latest: {status.latest_version}")
print(f"Available: {status.update_available}")
```

##### initialize()

Initialize updater and optionally check for updates on startup.

```python
async def initialize()
```

**Example:**
```python
await updater.initialize()  # Checks if config.check_on_startup=True
```

##### get_update_source()

Get the update source being used.

```python
def get_update_source() -> str
```

**Returns:** Update source string (e.g., "github:owner/repo" or custom URL)

##### is_enabled()

Check if auto-updates are enabled.

```python
def is_enabled() -> bool
```

**Returns:** True if updates are enabled (not disabled via env var)

## Data Models

### UpdateInfo

Information about an available update.

```python
@dataclass
class UpdateInfo:
    version: str                         # Version string (semver)
    download_url: str                    # Direct download URL
    release_notes: str                   # Release notes/changelog
    published_at: str                    # Publication timestamp (ISO 8601)
    size_bytes: Optional[int]            # Download size in bytes
    checksum_sha256: Optional[str]       # SHA256 checksum
    is_prerelease: bool                  # True if pre-release
    tag_name: str                        # Git tag name
```

### UpdateCheckResult

Result of checking for updates.

```python
@dataclass
class UpdateCheckResult:
    update_available: bool               # True if update is available
    current_version: str                 # Current application version
    latest_version: Optional[str]        # Latest available version
    update_info: Optional[UpdateInfo]    # Update information
    error: Optional[str]                 # Error message (if any)
```

### UpdateDownloadResult

Result of downloading an update.

```python
@dataclass
class UpdateDownloadResult:
    success: bool                        # True if download succeeded
    file_path: Optional[str]             # Path to downloaded file
    error: Optional[str]                 # Error message (if any)
    checksum_verified: bool              # True if checksum verified
```

### UpdateStatus

Current status of the updater.

```python
@dataclass
class UpdateStatus:
    current_version: str                 # Current version
    latest_version: Optional[str]        # Latest version (if known)
    checking: bool                       # True while checking for updates
    update_available: bool               # True if update is available
    downloading: bool                    # True while downloading
    update_downloaded: bool              # True if update is downloaded
    download_progress: Optional[float]   # Download progress (0-100)
    error: Optional[str]                 # Error message (if any)
```

### ProgressInfo

Download progress information.

```python
@dataclass
class ProgressInfo:
    transferred: int                     # Bytes transferred
    total: int                           # Total bytes
    percent: float                       # Progress percentage
    bytes_per_second: float              # Download speed
```

## Examples

See `example_auto_updater.py` for comprehensive examples including:

1. Basic update check
2. Download with progress tracking
3. Version comparison
4. Beta channel updates
5. Status monitoring
6. Custom update server
7. Startup update check
8. File size formatting

### Run Examples

```bash
python backend/services/example_auto_updater.py
```

## Testing

### Run Tests

```bash
# Run all tests
pytest backend/services/test_auto_updater.py -v

# Run specific test
pytest backend/services/test_auto_updater.py::test_compare_versions_less_than -v

# Run with coverage
pytest backend/services/test_auto_updater.py --cov=backend.services.auto_updater
```

### Test Coverage

The test suite includes:

- ✅ Version comparison (standard and pre-release)
- ✅ Initialization validation
- ✅ Channel compatibility (stable, beta, alpha)
- ✅ Update checking (available, not available, errors)
- ✅ Download with progress tracking
- ✅ Checksum verification
- ✅ Network error handling
- ✅ GitHub API rate limiting
- ✅ Status management
- ✅ Configuration options
- ✅ Helper functions

**Total: 30+ tests**

## Version Comparison

The service uses Python's `packaging.version.Version` for semantic version comparison, which follows [PEP 440](https://www.python.org/dev/peps/pep-0440/).

### Examples

```python
updater.compare_versions("1.0.0", "1.1.0")      # -1 (less than)
updater.compare_versions("2.0.0", "1.9.9")      # 1  (greater than)
updater.compare_versions("1.0.0", "1.0.0")      # 0  (equal)
updater.compare_versions("1.0.0-beta.1", "1.0.0")  # -1 (pre-release < release)
```

### Pre-release Versions

- `1.0.0-alpha.1` - Alpha release
- `1.0.0-beta.1` - Beta release
- `1.0.0-rc.1` - Release candidate
- `1.0.0` - Stable release

Pre-releases are always considered less than the corresponding stable release.

## Security Features

### HTTPS Only

All connections use HTTPS to prevent man-in-the-middle attacks.

### Checksum Verification

If `checksum_sha256` is provided in the release, the downloaded file is verified:

```python
if update_info.checksum_sha256:
    calculated = hashlib.sha256(file_content).hexdigest()
    if calculated != update_info.checksum_sha256:
        raise AutoUpdaterError("Checksum mismatch")
```

If the checksum doesn't match, the file is automatically deleted.

### Version Validation

All versions are validated using semantic versioning to prevent:
- Invalid version strings
- Downgrade attacks

### GitHub Token Support

For private repositories, provide a GitHub token:

```python
config = AutoUpdaterConfig(
    github_token=os.getenv("GITHUB_TOKEN")
)
```

**Token permissions required:** `repo:read` (read access to releases)

## Error Handling

### Common Errors

#### Repository Not Found (404)

```python
AutoUpdaterError: Repository not found: owner/repo
```

**Solution:** Verify repository name and ensure it's public (or token is provided for private repos).

#### Rate Limit Exceeded (403)

```python
AutoUpdaterError: GitHub API rate limit exceeded
```

**Solution:** Wait for rate limit reset or provide GitHub token for higher limits.

#### Network Errors

```python
AutoUpdaterError: Network error: Connection timeout
```

**Solution:** Check internet connection and retry. The service automatically retries with exponential backoff.

#### Invalid Version Format

```python
AutoUpdaterError: Invalid version format: not-a-version
```

**Solution:** Ensure version strings follow semantic versioning (e.g., `1.0.0`, `2.1.3-beta.1`).

#### Checksum Mismatch

```python
AutoUpdaterError: Checksum mismatch: expected abc123..., got def456...
```

**Solution:** Retry download. File may have been corrupted during transfer.

## Integration with Justice Companion

### Backend API Endpoint

```python
from fastapi import APIRouter
from backend.services.auto_updater import AutoUpdater, AutoUpdaterConfig

router = APIRouter()

# Create global updater instance
updater = AutoUpdater(
    repo="justice-companion/justice-companion",
    current_version="1.0.0",
    config=AutoUpdaterConfig(check_on_startup=True)
)

@router.get("/updates/check")
async def check_updates():
    """Check for application updates."""
    result = await updater.check_for_updates()
    return result.to_dict()

@router.post("/updates/download")
async def download_update():
    """Download latest update."""
    result = await updater.check_for_updates()

    if result.update_available and result.update_info:
        download_result = await updater.download_update(result.update_info)
        return download_result.to_dict()

    return {"error": "No update available"}

@router.get("/updates/status")
async def get_update_status():
    """Get current update status."""
    status = updater.get_status()
    return status.to_dict()
```

### Frontend Integration

```typescript
// Check for updates
const checkUpdates = async () => {
  const response = await fetch('/api/updates/check');
  const result = await response.json();

  if (result.update_available) {
    console.log(`Update available: ${result.latest_version}`);
  }
};

// Download update
const downloadUpdate = async () => {
  const response = await fetch('/api/updates/download', {
    method: 'POST'
  });
  const result = await response.json();

  if (result.success) {
    console.log(`Downloaded to: ${result.file_path}`);
  }
};
```

## Performance Considerations

### Caching

GitHub API responses are not cached by default. For production, consider:

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedAutoUpdater(AutoUpdater):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._cache = {}
        self._cache_ttl = timedelta(hours=1)

    async def check_for_updates(self):
        now = datetime.now()

        # Check cache
        if 'last_check' in self._cache:
            last_check, last_result = self._cache['last_check']
            if now - last_check < self._cache_ttl:
                return last_result

        # Fetch fresh data
        result = await super().check_for_updates()

        # Update cache
        self._cache['last_check'] = (now, result)

        return result
```

### Download Speed

- Default chunk size: 8192 bytes
- Configurable via `aiter_bytes(chunk_size=...)`
- Progress callbacks are called per chunk

### Memory Usage

- Downloads stream to disk (no in-memory buffering of entire file)
- Suitable for large update files (100+ MB)

## Troubleshooting

### Issue: "Invalid repository format"

**Error:** `AutoUpdaterError: Invalid repository format: repo-name`

**Solution:** Repository must be in format `owner/repo` (e.g., `microsoft/vscode`).

### Issue: "No updates available" but release exists

**Possible causes:**
1. Release version is not greater than current version
2. Release channel doesn't match (e.g., stable channel won't see beta releases)
3. Release has no assets (installers)

**Solution:** Check channel configuration and ensure release has assets.

### Issue: Progress callback not called

**Possible causes:**
1. Callback registered after download started
2. Content-Length header missing (progress percent will be 0)

**Solution:** Register callback before calling `download_update()`.

### Issue: Download fails with timeout

**Solution:** Increase timeout in configuration:

```python
config = AutoUpdaterConfig(timeout_seconds=60)
```

## Migration Notes

### TypeScript → Python Differences

1. **Version Comparison:**
   - TS: Uses `semver` library
   - Python: Uses `packaging.version`
   - Both follow semantic versioning

2. **HTTP Client:**
   - TS: Uses `electron-updater` internally
   - Python: Uses `httpx` for async HTTP

3. **Event System:**
   - TS: EventEmitter for events
   - Python: Callback list for progress

4. **Context Manager:**
   - Python adds `async with` support for resource cleanup

5. **Type Safety:**
   - TS: TypeScript interfaces
   - Python: dataclasses with type hints

## Best Practices

1. **Always use context manager** for automatic cleanup:
   ```python
   async with AutoUpdater(...) as updater:
       # Use updater
   # Automatically closed
   ```

2. **Handle errors gracefully**:
   ```python
   result = await updater.check_for_updates()
   if result.error:
       logger.error(f"Update check failed: {result.error}")
   ```

3. **Verify checksums** when available:
   ```python
   if not download_result.checksum_verified:
       logger.warning("Checksum not verified")
   ```

4. **Use appropriate channel** for environment:
   - Production: `UpdateChannel.STABLE`
   - Testing: `UpdateChannel.BETA`
   - Development: `UpdateChannel.ALPHA`

5. **Implement retry logic** for critical operations:
   ```python
   for attempt in range(3):
       result = await updater.check_for_updates()
       if not result.error:
           break
       await asyncio.sleep(2 ** attempt)
   ```

## License

This service is part of Justice Companion and follows the same license as the main project.

## Support

For issues or questions:
- GitHub Issues: https://github.com/justice-companion/justice-companion/issues
- Documentation: See main project README

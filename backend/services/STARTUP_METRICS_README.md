# StartupMetrics Service

**Migrated from:** `src/services/StartupMetrics.ts`

## Overview

The StartupMetrics service provides comprehensive tracking and analysis of application startup performance. It monitors critical initialization phases, calculates timing metrics, and provides detailed performance reports with visual indicators and recommendations.

## Features

- **Phase Tracking**: Record timestamps for all critical startup phases
- **Performance Analysis**: Calculate phase deltas and total startup times
- **Visual Indicators**: Emoji-based performance indicators (✅ excellent, ⚠️ warning, ❌ needs improvement)
- **Performance Ratings**: Automatic classification (excellent, good, needs improvement)
- **Detailed Reports**: Formatted console output with complete metrics breakdown
- **JSON Export**: Export metrics for programmatic analysis
- **Recommendations**: Automatic performance recommendations for slow startups
- **Singleton Pattern**: Global instance for easy access across the application

## Architecture

### Data Models

**StartupTimestamps** - Raw timestamp data:
```python
@dataclass
class StartupTimestamps:
    module_load: float                      # When main module is first loaded
    app_ready: float                        # When application becomes ready
    loading_window_shown: float             # When loading window becomes visible
    critical_services_ready: float          # Database, encryption, auth ready
    critical_handlers_registered: float     # Essential API handlers ready
    main_window_created: float              # Main window instantiated
    main_window_shown: float                # Main window visible to user
    non_critical_services_ready: float      # AI, secondary services ready
    all_handlers_registered: float          # All API handlers ready
```

**StartupPhaseMetrics** - Calculated metrics:
```python
@dataclass
class StartupPhaseMetrics:
    # Times relative to app_ready (ms)
    time_to_loading_window: float
    time_to_critical_services: float
    time_to_critical_handlers: float
    time_to_main_window_created: float
    time_to_main_window_shown: float
    time_to_non_critical_services: float
    time_to_all_handlers: float

    # Phase deltas (ms)
    loading_to_services: float
    services_to_handlers: float
    handlers_to_main_window: float
    main_window_to_non_critical: float
    non_critical_to_complete: float

    # Total times (ms)
    total_startup_time: float
    perceived_startup_time: float  # Time to main window shown
```

**PerformanceThreshold** - Performance benchmarks:
```python
@dataclass
class PerformanceThreshold:
    good: float      # Green checkmark if <= this value (ms)
    warning: float   # Yellow warning if <= this value (ms), red X otherwise
```

## Usage

### Basic Usage

```python
from backend.services.startup_metrics import startup_metrics

# Record startup phases as they occur
startup_metrics.record_phase("app_ready")
startup_metrics.record_phase("loading_window_shown")
startup_metrics.record_phase("critical_services_ready")
startup_metrics.record_phase("critical_handlers_registered")
startup_metrics.record_phase("main_window_created")
startup_metrics.record_phase("main_window_shown")
startup_metrics.record_phase("non_critical_services_ready")
startup_metrics.record_phase("all_handlers_registered")

# Log detailed performance report
startup_metrics.log_startup_metrics()
```

### Export Metrics

```python
from backend.services.startup_metrics import export_startup_metrics

# Export as JSON string
json_data = export_startup_metrics()
print(json_data)

# Parse JSON
import json
data = json.loads(json_data)
print(f"Perceived startup time: {data['summary']['perceived_startup_time']}ms")
print(f"Performance rating: {data['summary']['performance']}")
```

### Get Metrics Programmatically

```python
from backend.services.startup_metrics import startup_metrics

# Get metrics as dictionary
metrics_dict = startup_metrics.get_metrics_dict()

perceived_time = metrics_dict["summary"]["perceived_startup_time"]
performance = metrics_dict["summary"]["performance"]

if performance == "excellent":
    print(f"Excellent startup performance: {perceived_time}ms")
elif performance == "good":
    print(f"Good startup performance: {perceived_time}ms")
else:
    print(f"Startup needs improvement: {perceived_time}ms")
```

### Custom Instance

```python
from backend.services.startup_metrics import StartupMetrics

# Create a custom instance for testing
test_metrics = StartupMetrics()
test_metrics.record_phase("app_ready")
test_metrics.record_phase("main_window_shown")
test_metrics.log_startup_metrics()
```

## Performance Thresholds

The service uses the following performance thresholds (in milliseconds):

| Phase | Good (✅) | Warning (⚠️) | Error (❌) |
|-------|----------|--------------|-----------|
| Loading window shown | ≤ 50ms | ≤ 100ms | > 100ms |
| Critical services ready | ≤ 150ms | ≤ 250ms | > 250ms |
| Critical handlers registered | ≤ 160ms | ≤ 260ms | > 260ms |
| Main window created | ≤ 200ms | ≤ 300ms | > 300ms |
| Main window shown | ≤ 250ms | ≤ 400ms | > 400ms |
| **Perceived startup time** | **≤ 400ms** | **≤ 600ms** | **> 600ms** |
| **Total startup time** | **≤ 500ms** | **≤ 800ms** | **> 800ms** |

## Performance Ratings

The service automatically classifies startup performance:

- **Excellent**: Perceived startup time ≤ 400ms
- **Good**: Perceived startup time ≤ 600ms
- **Needs Improvement**: Perceived startup time > 600ms

## Sample Output

```
╔════════════════════════════════════════════════════════════╗
║              STARTUP PERFORMANCE METRICS                    ║
╠════════════════════════════════════════════════════════════╣
║                                                              ║
║  Phase Timing (from app ready)                              ║
║  ─────────────────────────────────                          ║
║  Loading window shown:         ✅ 50ms             ║
║  Critical services ready:      ✅ 150ms            ║
║  Critical handlers registered: ✅ 160ms            ║
║  Main window created:          ✅ 200ms            ║
║  Main window shown:            ✅ 250ms            ║
║  Non-critical services ready:  500ms               ║
║  All handlers registered:      600ms               ║
║                                                              ║
║  Phase Deltas                                                ║
║  ─────────────────                                           ║
║  Loading → Services:           100ms               ║
║  Services → Handlers:          10ms                ║
║  Handlers → Main Window:       90ms                ║
║  Main Window → Non-Critical:   250ms               ║
║  Non-Critical → Complete:      100ms               ║
║                                                              ║
║  Summary                                                     ║
║  ──────────                                                  ║
║  Perceived startup time:       ✅ 250ms            ║
║  Total startup time:           ✅ 600ms            ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝

Excellent startup performance! Target achieved.
```

## Performance Recommendations

When perceived startup time exceeds 600ms, the service automatically provides recommendations:

- **Loading window slow to show** (> 100ms)
  - Recommendation: Check app startup early operations

- **Critical services slow to initialize** (> 250ms)
  - Recommendation: Consider parallelizing initialization

- **Main window slow to show** (> 400ms)
  - Recommendation: Check application bundle size

## JSON Export Format

```json
{
  "timestamps": {
    "module_load": 1000.0,
    "app_ready": 1100.0,
    "loading_window_shown": 1150.0,
    "critical_services_ready": 1250.0,
    "critical_handlers_registered": 1260.0,
    "main_window_created": 1300.0,
    "main_window_shown": 1350.0,
    "non_critical_services_ready": 1500.0,
    "all_handlers_registered": 1600.0
  },
  "metrics": {
    "time_to_loading_window": 50.0,
    "time_to_critical_services": 150.0,
    "time_to_critical_handlers": 160.0,
    "time_to_main_window_created": 200.0,
    "time_to_main_window_shown": 250.0,
    "time_to_non_critical_services": 400.0,
    "time_to_all_handlers": 500.0,
    "loading_to_services": 100.0,
    "services_to_handlers": 10.0,
    "handlers_to_main_window": 90.0,
    "main_window_to_non_critical": 150.0,
    "non_critical_to_complete": 100.0,
    "total_startup_time": 600.0,
    "perceived_startup_time": 350.0
  },
  "summary": {
    "perceived_startup_time": 350.0,
    "total_startup_time": 600.0,
    "performance": "excellent"
  }
}
```

## Integration with FastAPI

```python
from fastapi import FastAPI
from backend.services.startup_metrics import startup_metrics

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    """Record application startup."""
    startup_metrics.record_phase("app_ready")

    # Initialize services
    await initialize_database()
    startup_metrics.record_phase("critical_services_ready")

    # Register handlers
    register_api_routes()
    startup_metrics.record_phase("critical_handlers_registered")

    # Log final metrics
    startup_metrics.log_startup_metrics()

@app.get("/metrics/startup")
async def get_startup_metrics():
    """Get startup metrics as JSON."""
    return startup_metrics.get_metrics_dict()
```

## Testing

Comprehensive test suite with 25+ tests covering:

- Timestamp tracking
- Phase recording
- Metrics calculation
- Duration formatting
- Performance indicators
- JSON export
- Performance recommendations
- Integration workflows

Run tests:
```bash
pytest backend/services/test_startup_metrics.py -v
```

## Migration Notes

### Changes from TypeScript Version

1. **Type System**: Uses Python dataclasses instead of TypeScript interfaces
2. **Naming Conventions**: snake_case instead of camelCase
3. **Time Handling**: Uses `time.time()` instead of `Date.now()`
4. **Logging**: Uses Python `logging` module instead of custom logger
5. **Enums**: Added `StartupPhase` enum for type safety
6. **Type Hints**: Comprehensive Python 3.9+ type hints throughout

### Key Improvements

1. **Dataclasses**: Cleaner data models with automatic methods
2. **Type Safety**: Strong typing with Python 3.9+ type hints
3. **Enum Support**: StartupPhase enum for phase names
4. **Better Logging**: Integration with Python logging module
5. **Dict Access**: Added `get_metrics_dict()` for easier programmatic access
6. **Convenience Functions**: Module-level functions for common operations

## Dependencies

- **Python 3.9+**: For modern type hints and dataclasses
- **logging**: For structured logging (stdlib)
- **time**: For timestamp tracking (stdlib)
- **json**: For metrics export (stdlib)
- **dataclasses**: For data models (stdlib)
- **typing**: For type hints (stdlib)
- **enum**: For StartupPhase enum (stdlib)

No external dependencies required - uses only Python standard library.

## Best Practices

1. **Record phases immediately**: Call `record_phase()` as soon as each phase completes
2. **Use singleton instance**: Access via `startup_metrics` for consistency
3. **Log at completion**: Call `log_startup_metrics()` when all phases are done
4. **Export for analysis**: Use `export_metrics()` to save performance data
5. **Monitor trends**: Track metrics over time to detect performance regressions
6. **Set thresholds**: Customize `PerformanceThreshold` values for your application

## Troubleshooting

### Timestamps show as 0 or N/A
- **Cause**: Phase not recorded or recorded with wrong name
- **Solution**: Verify `record_phase()` is called with correct phase name

### Performance rating always "needs improvement"
- **Cause**: Slow initialization or missing optimization
- **Solution**: Check recommendations in console output, profile slow phases

### Negative duration values
- **Cause**: Phases recorded out of order
- **Solution**: Ensure phases are recorded in chronological order

### Missing metrics in export
- **Cause**: Exporting before all phases are recorded
- **Solution**: Call `export_metrics()` after all phases complete

## References

- **Original TypeScript**: `src/services/StartupMetrics.ts`
- **Test Suite**: `backend/services/test_startup_metrics.py`
- **Python Logging**: https://docs.python.org/3/library/logging.html
- **Dataclasses**: https://docs.python.org/3/library/dataclasses.html
- **Type Hints**: https://docs.python.org/3/library/typing.html

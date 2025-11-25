"""
Startup Performance Metrics Tracking System.

Monitors and logs critical startup phases for Justice Companion backend.

Migrated from: src/services/StartupMetrics.ts

Features:
- Track application startup time and initialization phases
- Performance benchmarking and analysis
- Generate detailed startup reports with visual indicators
- Calculate phase deltas and total startup time
- Provide performance recommendations
- Export metrics as JSON for analysis

Usage:
    from backend.services.startup_metrics import startup_metrics

    # Record startup phases
    startup_metrics.record_phase("app_ready")
    startup_metrics.record_phase("critical_services_ready")
    startup_metrics.record_phase("main_window_shown")

    # Log performance metrics
    startup_metrics.log_startup_metrics()

    # Export metrics to JSON
    json_data = startup_metrics.export_metrics()
"""

import time
import json
import logging
from typing import Dict
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logger
logger = logging.getLogger(__name__)

class StartupPhase(str, Enum):
    """Enumeration of all startup phases."""

    MODULE_LOAD = "module_load"
    APP_READY = "app_ready"
    LOADING_WINDOW_SHOWN = "loading_window_shown"
    CRITICAL_SERVICES_READY = "critical_services_ready"
    CRITICAL_HANDLERS_REGISTERED = "critical_handlers_registered"
    MAIN_WINDOW_CREATED = "main_window_created"
    MAIN_WINDOW_SHOWN = "main_window_shown"
    NON_CRITICAL_SERVICES_READY = "non_critical_services_ready"
    ALL_HANDLERS_REGISTERED = "all_handlers_registered"

@dataclass
class StartupTimestamps:
    """Timestamps for all startup phases (in milliseconds since epoch)."""

    module_load: float  # When main module is first loaded
    app_ready: float = 0  # When application becomes ready
    loading_window_shown: float = 0  # When loading window becomes visible
    critical_services_ready: float = 0  # Database, encryption, auth ready
    critical_handlers_registered: float = 0  # Essential API handlers ready
    main_window_created: float = 0  # Main window instantiated
    main_window_shown: float = 0  # Main window visible to user
    non_critical_services_ready: float = 0  # AI, secondary services ready
    all_handlers_registered: float = 0  # All API handlers ready

@dataclass
class StartupPhaseMetrics:
    """Calculated metrics for startup phases."""

    # Time relative to app_ready (in milliseconds)
    time_to_loading_window: float = 0
    time_to_critical_services: float = 0
    time_to_critical_handlers: float = 0
    time_to_main_window_created: float = 0
    time_to_main_window_shown: float = 0
    time_to_non_critical_services: float = 0
    time_to_all_handlers: float = 0

    # Phase deltas (time between phases in milliseconds)
    loading_to_services: float = 0
    services_to_handlers: float = 0
    handlers_to_main_window: float = 0
    main_window_to_non_critical: float = 0
    non_critical_to_complete: float = 0

    # Total times (in milliseconds)
    total_startup_time: float = 0
    perceived_startup_time: float = 0  # Time to main window shown

@dataclass
class PerformanceThreshold:
    """Performance thresholds for visual indicators."""

    good: float  # Green checkmark if <= this value (ms)
    warning: float  # Yellow warning if <= this value (ms), red X otherwise

class StartupMetrics:
    """
    StartupMetrics - Track and analyze application startup performance.

    Monitors critical phases of application initialization and provides
    detailed performance analysis with visual indicators and recommendations.
    """

    def __init__(self) -> None:
        """
        Initialize StartupMetrics.

        Sets the module_load timestamp to the current time.
        """
        self.timestamps = StartupTimestamps(module_load=self._get_current_time_ms())

    @staticmethod
    def _get_current_time_ms() -> float:
        """
        Get current time in milliseconds since epoch.

        Returns:
            Current timestamp in milliseconds
        """
        return time.time() * 1000

    def record_phase(self, phase: str) -> None:
        """
        Record a timestamp for a specific startup phase.

        Args:
            phase: Name of the startup phase (snake_case string)

        Examples:
            >>> startup_metrics.record_phase("app_ready")
            >>> startup_metrics.record_phase("critical_services_ready")
        """
        # Map phase name to attribute
        if hasattr(self.timestamps, phase):
            setattr(self.timestamps, phase, self._get_current_time_ms())
            logger.debug(f"Recorded startup phase: {phase}")
        else:
            logger.warning(f"Unknown startup phase: {phase}")

    def get_timestamps(self) -> Dict[str, float]:
        """
        Get all recorded timestamps.

        Returns:
            Dictionary of phase names to timestamps (in milliseconds)
        """
        return asdict(self.timestamps)

    def _calculate_metrics(self) -> StartupPhaseMetrics:
        """
        Calculate time metrics relative to app ready.

        Returns:
            StartupPhaseMetrics with all calculated timings
        """
        ts = self.timestamps
        app_ready = ts.app_ready if ts.app_ready > 0 else ts.module_load

        # Times relative to app_ready
        time_to_loading_window = (
            ts.loading_window_shown - app_ready if ts.loading_window_shown > 0 else 0
        )
        time_to_critical_services = (
            ts.critical_services_ready - app_ready if ts.critical_services_ready > 0 else 0
        )
        time_to_critical_handlers = (
            ts.critical_handlers_registered - app_ready
            if ts.critical_handlers_registered > 0
            else 0
        )
        time_to_main_window_created = (
            ts.main_window_created - app_ready if ts.main_window_created > 0 else 0
        )
        time_to_main_window_shown = (
            ts.main_window_shown - app_ready if ts.main_window_shown > 0 else 0
        )
        time_to_non_critical_services = (
            ts.non_critical_services_ready - app_ready if ts.non_critical_services_ready > 0 else 0
        )
        time_to_all_handlers = (
            ts.all_handlers_registered - app_ready if ts.all_handlers_registered > 0 else 0
        )

        # Phase deltas
        loading_to_services = time_to_critical_services - time_to_loading_window
        services_to_handlers = time_to_critical_handlers - time_to_critical_services
        handlers_to_main_window = time_to_main_window_shown - time_to_critical_handlers
        main_window_to_non_critical = time_to_non_critical_services - time_to_main_window_shown
        non_critical_to_complete = time_to_all_handlers - time_to_non_critical_services

        # Total times
        total_startup_time = self._get_current_time_ms() - ts.module_load
        perceived_startup_time = (
            ts.main_window_shown - ts.module_load if ts.main_window_shown > 0 else 0
        )

        return StartupPhaseMetrics(
            time_to_loading_window=time_to_loading_window,
            time_to_critical_services=time_to_critical_services,
            time_to_critical_handlers=time_to_critical_handlers,
            time_to_main_window_created=time_to_main_window_created,
            time_to_main_window_shown=time_to_main_window_shown,
            time_to_non_critical_services=time_to_non_critical_services,
            time_to_all_handlers=time_to_all_handlers,
            loading_to_services=loading_to_services,
            services_to_handlers=services_to_handlers,
            handlers_to_main_window=handlers_to_main_window,
            main_window_to_non_critical=main_window_to_non_critical,
            non_critical_to_complete=non_critical_to_complete,
            total_startup_time=total_startup_time,
            perceived_startup_time=perceived_startup_time,
        )

    @staticmethod
    def _format_duration(ms: float) -> str:
        """
        Format a duration with appropriate units.

        Args:
            ms: Duration in milliseconds

        Returns:
            Formatted duration string (e.g., "150ms", "1.2s", "2.5m")
        """
        if ms == 0:
            return "N/A"
        if ms < 0:
            return "Error"

        if ms < 1000:
            return f"{int(ms)}ms"
        if ms < 60000:
            return f"{ms / 1000:.1f}s"
        return f"{ms / 60000:.1f}m"

    def _format_with_indicator(self, ms: float, threshold: PerformanceThreshold) -> str:
        """
        Format a duration with visual performance indicator.

        Args:
            ms: Duration in milliseconds
            threshold: Performance thresholds for good/warning/error

        Returns:
            Formatted string with emoji indicator and duration
        """
        formatted = self._format_duration(ms)
        if ms == 0:
            return formatted

        if ms <= threshold.good:
            return f"✅ {formatted}"
        if ms <= threshold.warning:
            return f"⚠️  {formatted}"
        return f"❌ {formatted}"

    def log_startup_metrics(self) -> None:
        """
        Log startup metrics to console in a formatted table.

        Displays:
        - Phase timing relative to app ready
        - Phase deltas (time between phases)
        - Summary with perceived and total startup time
        - Performance recommendations if needed
        """
        metrics = self._calculate_metrics()

        logger.info("\n╔════════════════════════════════════════════════════════════╗")
        logger.info("║              STARTUP PERFORMANCE METRICS                    ║")
        logger.info("╠════════════════════════════════════════════════════════════╣")
        logger.info("║                                                              ║")
        logger.info("║  Phase Timing (from app ready)                              ║")
        logger.info("║  ─────────────────────────────────                          ║")
        logger.info(
            f"║  Loading window shown:         "
            f"{self._format_with_indicator(metrics.time_to_loading_window, PerformanceThreshold(good=50, warning=100)).ljust(20)} ║"
        )
        logger.info(
            f"║  Critical services ready:      "
            f"{self._format_with_indicator(metrics.time_to_critical_services, PerformanceThreshold(good=150, warning=250)).ljust(20)} ║"
        )
        logger.info(
            f"║  Critical handlers registered: "
            f"{self._format_with_indicator(metrics.time_to_critical_handlers, PerformanceThreshold(good=160, warning=260)).ljust(20)} ║"
        )
        logger.info(
            f"║  Main window created:          "
            f"{self._format_with_indicator(metrics.time_to_main_window_created, PerformanceThreshold(good=200, warning=300)).ljust(20)} ║"
        )
        logger.info(
            f"║  Main window shown:            "
            f"{self._format_with_indicator(metrics.time_to_main_window_shown, PerformanceThreshold(good=250, warning=400)).ljust(20)} ║"
        )
        logger.info(
            f"║  Non-critical services ready:  "
            f"{self._format_duration(metrics.time_to_non_critical_services).ljust(20)} ║"
        )
        logger.info(
            f"║  All handlers registered:      "
            f"{self._format_duration(metrics.time_to_all_handlers).ljust(20)} ║"
        )
        logger.info("║                                                              ║")
        logger.info("║  Phase Deltas                                                ║")
        logger.info("║  ─────────────────                                           ║")
        logger.info(
            f"║  Loading → Services:           "
            f"{self._format_duration(metrics.loading_to_services).ljust(20)} ║"
        )
        logger.info(
            f"║  Services → Handlers:          "
            f"{self._format_duration(metrics.services_to_handlers).ljust(20)} ║"
        )
        logger.info(
            f"║  Handlers → Main Window:       "
            f"{self._format_duration(metrics.handlers_to_main_window).ljust(20)} ║"
        )
        logger.info(
            f"║  Main Window → Non-Critical:   "
            f"{self._format_duration(metrics.main_window_to_non_critical).ljust(20)} ║"
        )
        logger.info(
            f"║  Non-Critical → Complete:      "
            f"{self._format_duration(metrics.non_critical_to_complete).ljust(20)} ║"
        )
        logger.info("║                                                              ║")
        logger.info("║  Summary                                                     ║")
        logger.info("║  ──────────                                                  ║")
        logger.info(
            f"║  Perceived startup time:       "
            f"{self._format_with_indicator(metrics.perceived_startup_time, PerformanceThreshold(good=400, warning=600)).ljust(20)} ║"
        )
        logger.info(
            f"║  Total startup time:           "
            f"{self._format_with_indicator(metrics.total_startup_time, PerformanceThreshold(good=500, warning=800)).ljust(20)} ║"
        )
        logger.info("║                                                              ║")
        logger.info("╚════════════════════════════════════════════════════════════╝")

        # Additional performance recommendations
        if metrics.perceived_startup_time > 600:
            logger.warning("\nPerformance Recommendations:")
            if metrics.time_to_loading_window > 100:
                logger.warning(
                    "  • Loading window is slow to show - check app startup early operations"
                )
            if metrics.time_to_critical_services > 250:
                logger.warning(
                    "  • Critical services initialization is slow - consider parallelizing"
                )
            if metrics.time_to_main_window_shown > 400:
                logger.warning("  • Main window taking too long - check application bundle size")
        elif metrics.perceived_startup_time < 400:
            logger.info("\nExcellent startup performance! Target achieved.")

    def export_metrics(self) -> str:
        """
        Export metrics as JSON for analysis.

        Returns:
            JSON string containing timestamps, metrics, and performance summary
        """
        timestamps = self.get_timestamps()
        metrics = self._calculate_metrics()

        # Determine performance rating
        if metrics.perceived_startup_time <= 400:
            performance = "excellent"
        elif metrics.perceived_startup_time <= 600:
            performance = "good"
        else:
            performance = "needs improvement"

        export_data = {
            "timestamps": timestamps,
            "metrics": asdict(metrics),
            "summary": {
                "perceived_startup_time": metrics.perceived_startup_time,
                "total_startup_time": metrics.total_startup_time,
                "performance": performance,
            },
        }

        return json.dumps(export_data, indent=2)

    def get_metrics_dict(self) -> Dict[str, any]:
        """
        Get metrics as a dictionary for programmatic access.

        Returns:
            Dictionary containing all metrics data
        """
        timestamps = self.get_timestamps()
        metrics = self._calculate_metrics()

        # Determine performance rating
        if metrics.perceived_startup_time <= 400:
            performance = "excellent"
        elif metrics.perceived_startup_time <= 600:
            performance = "good"
        else:
            performance = "needs improvement"

        return {
            "timestamps": timestamps,
            "metrics": asdict(metrics),
            "summary": {
                "perceived_startup_time": metrics.perceived_startup_time,
                "total_startup_time": metrics.total_startup_time,
                "performance": performance,
            },
        }

# Singleton instance for global access
startup_metrics = StartupMetrics()

# Convenience function for logging
def log_startup_metrics() -> None:
    """
    Convenience function to log startup metrics using singleton instance.

    Example:
        >>> from backend.services.startup_metrics import log_startup_metrics
        >>> log_startup_metrics()
    """
    startup_metrics.log_startup_metrics()

# Convenience function for exporting
def export_startup_metrics() -> str:
    """
    Convenience function to export startup metrics as JSON.

    Returns:
        JSON string containing all metrics data

    Example:
        >>> from backend.services.startup_metrics import export_startup_metrics
        >>> json_data = export_startup_metrics()
        >>> print(json_data)
    """
    return startup_metrics.export_metrics()

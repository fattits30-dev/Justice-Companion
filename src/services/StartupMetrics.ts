/**
 * Startup Performance Metrics Tracking System
 * Monitors and logs critical startup phases for Justice Companion
 */

export interface StartupTimestamps {
  moduleLoad: number; // When main.ts is first loaded
  appReady: number; // When Electron app.whenReady fires
  loadingWindowShown: number; // When loading window becomes visible
  criticalServicesReady: number; // Database, encryption, auth ready
  criticalHandlersRegistered: number; // Essential IPC handlers ready
  mainWindowCreated: number; // Main window instantiated
  mainWindowShown: number; // Main window visible to user
  nonCriticalServicesReady: number; // AI, secondary services ready
  allHandlersRegistered: number; // All IPC handlers ready
}

export interface StartupPhases {
  // Time relative to appReady
  timeToLoadingWindow: number;
  timeToCriticalServices: number;
  timeToCriticalHandlers: number;
  timeToMainWindowCreated: number;
  timeToMainWindowShown: number;
  timeToNonCriticalServices: number;
  timeToAllHandlers: number;

  // Phase deltas (time between phases)
  loadingToServices: number;
  servicesToHandlers: number;
  handlersToMainWindow: number;
  mainWindowToNonCritical: number;
  nonCriticalToComplete: number;

  // Total times
  totalStartupTime: number;
  perceivedStartupTime: number; // Time to main window shown
}

export class StartupMetrics {
  private timestamps: StartupTimestamps;

  constructor() {
    this.timestamps = {
      moduleLoad: Date.now(),
      appReady: 0,
      loadingWindowShown: 0,
      criticalServicesReady: 0,
      criticalHandlersRegistered: 0,
      mainWindowCreated: 0,
      mainWindowShown: 0,
      nonCriticalServicesReady: 0,
      allHandlersRegistered: 0,
    };
  }

  /**
   * Record a timestamp for a specific startup phase
   */
  recordPhase(phase: keyof Omit<StartupTimestamps, 'moduleLoad'>): void {
    this.timestamps[phase] = Date.now();
  }

  /**
   * Get all recorded timestamps
   */
  getTimestamps(): Readonly<StartupTimestamps> {
    return { ...this.timestamps };
  }

  /**
   * Calculate time metrics relative to app ready
   */
  private calculateMetrics(): StartupPhases {
    const ts = this.timestamps;
    const appReady = ts.appReady || ts.moduleLoad;

    // Times relative to appReady
    const timeToLoadingWindow = ts.loadingWindowShown ? ts.loadingWindowShown - appReady : 0;
    const timeToCriticalServices = ts.criticalServicesReady
      ? ts.criticalServicesReady - appReady
      : 0;
    const timeToCriticalHandlers = ts.criticalHandlersRegistered
      ? ts.criticalHandlersRegistered - appReady
      : 0;
    const timeToMainWindowCreated = ts.mainWindowCreated ? ts.mainWindowCreated - appReady : 0;
    const timeToMainWindowShown = ts.mainWindowShown ? ts.mainWindowShown - appReady : 0;
    const timeToNonCriticalServices = ts.nonCriticalServicesReady
      ? ts.nonCriticalServicesReady - appReady
      : 0;
    const timeToAllHandlers = ts.allHandlersRegistered ? ts.allHandlersRegistered - appReady : 0;

    // Phase deltas
    const loadingToServices = timeToCriticalServices - timeToLoadingWindow;
    const servicesToHandlers = timeToCriticalHandlers - timeToCriticalServices;
    const handlersToMainWindow = timeToMainWindowShown - timeToCriticalHandlers;
    const mainWindowToNonCritical = timeToNonCriticalServices - timeToMainWindowShown;
    const nonCriticalToComplete = timeToAllHandlers - timeToNonCriticalServices;

    // Total times
    const totalStartupTime = Date.now() - ts.moduleLoad;
    const perceivedStartupTime = ts.mainWindowShown ? ts.mainWindowShown - ts.moduleLoad : 0;

    return {
      timeToLoadingWindow,
      timeToCriticalServices,
      timeToCriticalHandlers,
      timeToMainWindowCreated,
      timeToMainWindowShown,
      timeToNonCriticalServices,
      timeToAllHandlers,
      loadingToServices,
      servicesToHandlers,
      handlersToMainWindow,
      mainWindowToNonCritical,
      nonCriticalToComplete,
      totalStartupTime,
      perceivedStartupTime,
    };
  }

  /**
   * Format a duration with appropriate units
   */
  private formatDuration(ms: number): string {
    if (ms === 0) {
      return 'N/A';
    }
    if (ms < 0) {
      return 'Error';
    }

    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Format a duration with visual indicator
   */
  private formatWithIndicator(ms: number, threshold: { good: number; warning: number }): string {
    const formatted = this.formatDuration(ms);
    if (ms === 0) {
      return formatted;
    }

    if (ms <= threshold.good) {
      return `✅ ${formatted}`;
    }
    if (ms <= threshold.warning) {
      return `⚠️  ${formatted}`;
    }
    return `❌ ${formatted}`;
  }

  /**
   * Log startup metrics to console in a formatted table
   */
  logStartupMetrics(): void {
    const metrics = this.calculateMetrics();

    /* eslint-disable no-console */
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              STARTUP PERFORMANCE METRICS                    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                                                              ║');
    console.log('║  📊 Phase Timing (from app ready)                           ║');
    console.log('║  ─────────────────────────────────                         ║');
    console.log(
      `║  Loading window shown:         ${this.formatWithIndicator(metrics.timeToLoadingWindow, {
        good: 50,
        warning: 100,
      }).padEnd(20)} ║`,
    );
    console.log(
      `║  Critical services ready:      ${this.formatWithIndicator(metrics.timeToCriticalServices, {
        good: 150,
        warning: 250,
      }).padEnd(20)} ║`,
    );
    console.log(
      `║  Critical handlers registered: ${this.formatWithIndicator(metrics.timeToCriticalHandlers, {
        good: 160,
        warning: 260,
      }).padEnd(20)} ║`,
    );
    console.log(
      `║  Main window created:          ${this.formatWithIndicator(
        metrics.timeToMainWindowCreated,
        { good: 200, warning: 300 },
      ).padEnd(20)} ║`,
    );
    console.log(
      `║  Main window shown:            ${this.formatWithIndicator(metrics.timeToMainWindowShown, {
        good: 250,
        warning: 400,
      }).padEnd(20)} ║`,
    );
    console.log(
      `║  Non-critical services ready:  ${this.formatDuration(
        metrics.timeToNonCriticalServices,
      ).padEnd(20)} ║`,
    );
    console.log(
      `║  All handlers registered:      ${this.formatDuration(metrics.timeToAllHandlers).padEnd(
        20,
      )} ║`,
    );
    console.log('║                                                              ║');
    console.log('║  ⏱️  Phase Deltas                                           ║');
    console.log('║  ─────────────────                                         ║');
    console.log(
      `║  Loading → Services:           ${this.formatDuration(metrics.loadingToServices).padEnd(
        20,
      )} ║`,
    );
    console.log(
      `║  Services → Handlers:          ${this.formatDuration(metrics.servicesToHandlers).padEnd(
        20,
      )} ║`,
    );
    console.log(
      `║  Handlers → Main Window:       ${this.formatDuration(metrics.handlersToMainWindow).padEnd(
        20,
      )} ║`,
    );
    console.log(
      `║  Main Window → Non-Critical:   ${this.formatDuration(
        metrics.mainWindowToNonCritical,
      ).padEnd(20)} ║`,
    );
    console.log(
      `║  Non-Critical → Complete:      ${this.formatDuration(metrics.nonCriticalToComplete).padEnd(
        20,
      )} ║`,
    );
    console.log('║                                                              ║');
    console.log('║  🎯 Summary                                                 ║');
    console.log('║  ──────────                                                ║');
    console.log(
      `║  Perceived startup time:       ${this.formatWithIndicator(metrics.perceivedStartupTime, {
        good: 400,
        warning: 600,
      }).padEnd(20)} ║`,
    );
    console.log(
      `║  Total startup time:           ${this.formatWithIndicator(metrics.totalStartupTime, {
        good: 500,
        warning: 800,
      }).padEnd(20)} ║`,
    );
    console.log('║                                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Additional performance recommendations
    if (metrics.perceivedStartupTime > 600) {
      console.log('\n⚠️  Performance Recommendations:');
      if (metrics.timeToLoadingWindow > 100) {
        console.log('  • Loading window is slow to show - check app.whenReady() early operations');
      }
      if (metrics.timeToCriticalServices > 250) {
        console.log('  • Critical services initialization is slow - consider parallelizing');
      }
      if (metrics.timeToMainWindowShown > 400) {
        console.log('  • Main window taking too long - check renderer bundle size');
      }
    } else if (metrics.perceivedStartupTime < 400) {
      console.log('\n✅ Excellent startup performance! Target achieved.');
    }
    /* eslint-enable no-console */
  }

  /**
   * Export metrics as JSON for analysis
   */
  exportMetrics(): string {
    const timestamps = this.getTimestamps();
    const metrics = this.calculateMetrics();

    return JSON.stringify(
      {
        timestamps,
        metrics,
        summary: {
          perceivedStartupTime: metrics.perceivedStartupTime,
          totalStartupTime: metrics.totalStartupTime,
          performance:
            metrics.perceivedStartupTime <= 400
              ? 'excellent'
              : metrics.perceivedStartupTime <= 600
                ? 'good'
                : 'needs improvement',
        },
      },
      null,
      2,
    );
  }
}

// Singleton instance for global access
export const startupMetrics = new StartupMetrics();

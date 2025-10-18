import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StartupMetrics } from './StartupMetrics';

describe('StartupMetrics', () => {
  let metrics: StartupMetrics;
  let consoleSpy: any;

  beforeEach(() => {
    metrics = new StartupMetrics();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('recordPhase', () => {
    it('should record timestamps for each phase', () => {
      const now = Date.now();

      metrics.recordPhase('appReady');
      metrics.recordPhase('loadingWindowShown');
      metrics.recordPhase('criticalServicesReady');

      const timestamps = metrics.getTimestamps();

      expect(timestamps.appReady).toBeGreaterThanOrEqual(now);
      expect(timestamps.loadingWindowShown).toBeGreaterThanOrEqual(timestamps.appReady);
      expect(timestamps.criticalServicesReady).toBeGreaterThanOrEqual(
        timestamps.loadingWindowShown
      );
    });

    it('should handle phases recorded out of order', () => {
      metrics.recordPhase('mainWindowShown');
      metrics.recordPhase('appReady');
      metrics.recordPhase('criticalServicesReady');

      const timestamps = metrics.getTimestamps();

      expect(timestamps.mainWindowShown).toBeDefined();
      expect(timestamps.appReady).toBeDefined();
      expect(timestamps.criticalServicesReady).toBeDefined();
    });
  });

  describe('getTimestamps', () => {
    it('should return a copy of timestamps', () => {
      metrics.recordPhase('appReady');

      const timestamps1 = metrics.getTimestamps();
      const timestamps2 = metrics.getTimestamps();

      expect(timestamps1).not.toBe(timestamps2);
      expect(timestamps1).toEqual(timestamps2);
    });

    it('should include moduleLoad timestamp by default', () => {
      const timestamps = metrics.getTimestamps();
      expect(timestamps.moduleLoad).toBeGreaterThan(0);
    });
  });

  describe('logStartupMetrics', () => {
    it('should log formatted metrics to console', () => {
      // Record some phases
      metrics.recordPhase('appReady');

      // Add small delays to ensure measurable differences
      setTimeout(() => metrics.recordPhase('loadingWindowShown'), 10);
      setTimeout(() => metrics.recordPhase('criticalServicesReady'), 20);
      setTimeout(() => metrics.recordPhase('mainWindowShown'), 30);

      // Wait for all phases to complete
      setTimeout(() => {
        metrics.logStartupMetrics();

        expect(consoleSpy).toHaveBeenCalled();

        // Check for key output strings
        const output = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
        expect(output).toContain('STARTUP PERFORMANCE METRICS');
        expect(output).toContain('Phase Timing');
        expect(output).toContain('Loading window shown:');
        expect(output).toContain('Critical services ready:');
        expect(output).toContain('Main window shown:');
        expect(output).toContain('Perceived startup time:');
        expect(output).toContain('Total startup time:');
      }, 40);
    });

    it('should show N/A for unrecorded phases', () => {
      metrics.recordPhase('appReady');
      metrics.logStartupMetrics();

      const output = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('N/A');
    });

    it('should show performance indicators', () => {
      metrics.recordPhase('appReady');

      // Simulate fast startup
      setTimeout(() => {
        metrics.recordPhase('loadingWindowShown');
      }, 30);

      setTimeout(() => {
        metrics.recordPhase('mainWindowShown');
        metrics.logStartupMetrics();

        const output = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n');

        // Should contain indicator symbols (checkmark, warning, or cross)
        expect(output).toMatch(/\u2705|\u26A0|\u274C/);
      }, 50);
    });

    it('should show recommendations for slow startup', () => {
      metrics.recordPhase('appReady');

      // Simulate slow startup
      const slowTime = 700;
      setTimeout(() => {
        metrics.recordPhase('mainWindowShown');
        metrics.logStartupMetrics();

        const output = consoleSpy.mock.calls.map((call: any[]) => call[0]).join('\n');

        // Should show recommendations
        expect(output).toContain('Performance Recommendations');
      }, slowTime);
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics as JSON', () => {
      metrics.recordPhase('appReady');
      metrics.recordPhase('loadingWindowShown');
      metrics.recordPhase('criticalServicesReady');
      metrics.recordPhase('mainWindowShown');

      const json = metrics.exportMetrics();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('timestamps');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('summary');

      expect(parsed.timestamps).toHaveProperty('appReady');
      expect(parsed.timestamps).toHaveProperty('loadingWindowShown');

      expect(parsed.metrics).toHaveProperty('perceivedStartupTime');
      expect(parsed.metrics).toHaveProperty('totalStartupTime');

      expect(parsed.summary).toHaveProperty('performance');
    });

    it('should categorize performance correctly', () => {
      metrics.recordPhase('appReady');

      // Test excellent performance (<400ms)
      setTimeout(() => {
        metrics.recordPhase('mainWindowShown');
        const json = metrics.exportMetrics();
        const parsed = JSON.parse(json);
        expect(parsed.summary.performance).toBe('excellent');
      }, 100);

      // Reset and test good performance (400-600ms)
      const metrics2 = new StartupMetrics();
      metrics2.recordPhase('appReady');
      setTimeout(() => {
        metrics2.recordPhase('mainWindowShown');
        const json = metrics2.exportMetrics();
        const parsed = JSON.parse(json);
        expect(parsed.summary.performance).toBe('good');
      }, 500);

      // Reset and test needs improvement (>600ms)
      const metrics3 = new StartupMetrics();
      metrics3.recordPhase('appReady');
      setTimeout(() => {
        metrics3.recordPhase('mainWindowShown');
        const json = metrics3.exportMetrics();
        const parsed = JSON.parse(json);
        expect(parsed.summary.performance).toBe('needs improvement');
      }, 700);
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      // We need to test the private formatDuration method indirectly
      metrics.recordPhase('appReady');

      // Test milliseconds formatting
      setTimeout(() => {
        metrics.recordPhase('loadingWindowShown');
      }, 50);

      // Test seconds formatting
      setTimeout(() => {
        metrics.recordPhase('criticalServicesReady');
      }, 1500);

      setTimeout(() => {
        const json = metrics.exportMetrics();
        const parsed = JSON.parse(json);

        // Check that times are recorded correctly
        expect(parsed.metrics.timeToLoadingWindow).toBeGreaterThanOrEqual(0);
        expect(parsed.metrics.timeToCriticalServices).toBeGreaterThanOrEqual(0);
      }, 2000);
    });
  });

  describe('phase deltas', () => {
    it('should calculate phase deltas correctly', () => {
      return new Promise<void>((resolve) => {
        const delays = {
          appReady: 0,
          loadingWindowShown: 50,
          criticalServicesReady: 100,
          criticalHandlersRegistered: 110,
          mainWindowShown: 200,
          nonCriticalServicesReady: 250,
          allHandlersRegistered: 300,
        };

        metrics.recordPhase('appReady');

        setTimeout(() => metrics.recordPhase('loadingWindowShown'), delays.loadingWindowShown);
        setTimeout(() => metrics.recordPhase('criticalServicesReady'), delays.criticalServicesReady);
        setTimeout(
          () => metrics.recordPhase('criticalHandlersRegistered'),
          delays.criticalHandlersRegistered
        );
        setTimeout(() => metrics.recordPhase('mainWindowShown'), delays.mainWindowShown);
        setTimeout(
          () => metrics.recordPhase('nonCriticalServicesReady'),
          delays.nonCriticalServicesReady
        );
        setTimeout(() => {
          metrics.recordPhase('allHandlersRegistered');

          const json = metrics.exportMetrics();
          const parsed = JSON.parse(json);
          const m = parsed.metrics;

          // Check phase deltas
          expect(m.loadingToServices).toBeGreaterThanOrEqual(40); // ~50ms
          expect(m.servicesToHandlers).toBeGreaterThanOrEqual(5); // ~10ms
          expect(m.handlersToMainWindow).toBeGreaterThanOrEqual(80); // ~90ms
          expect(m.mainWindowToNonCritical).toBeGreaterThanOrEqual(40); // ~50ms
          expect(m.nonCriticalToComplete).toBeGreaterThanOrEqual(40); // ~50ms

          resolve();
        }, delays.allHandlersRegistered);
      });
    });
  });
});

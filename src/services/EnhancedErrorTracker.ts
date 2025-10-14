/**
 * EnhancedErrorTracker - Advanced Error Tracking and Management
 *
 * Features:
 * - Error grouping via fingerprinting
 * - Deduplication to reduce noise
 * - Rate limiting to prevent performance impact
 * - Sampling for non-critical errors
 * - Alert management
 * - Performance correlation
 * - Automatic recovery strategies
 *
 * This service runs in the main process and receives errors from both
 * main and renderer processes.
 */

import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
  ErrorData,
  ErrorGroup,
  ErrorLevel,
  ErrorMetrics,
  ErrorTrackerConfig,
  ErrorTrackerStats,
} from '../types/error-tracking.js';
import { errorLogger } from '../utils/error-logger.js';

export class EnhancedErrorTracker extends EventEmitter {
  private errorGroups: Map<string, ErrorGroup> = new Map();
  private rateLimiters: Map<string, { count: number; resetAt: number }> = new Map();
  private totalErrorCount: number = 0;
  private sampledCount: number = 0;
  private rateLimitedCount: number = 0;
  private config: ErrorTrackerConfig;
  private stats: ErrorTrackerStats;

  constructor(config: Partial<ErrorTrackerConfig> = {}) {
    super();

    // Default configuration
    this.config = {
      sampling: {
        critical: 1.0, // 100% - Always log critical
        error: 1.0, // 100% - Always log errors
        warning: 0.5, // 50% - Sample warnings
        info: 0.1, // 10% - Sample info
        debug: 0.01, // 1% - Rarely log debug
      },
      rateLimit: {
        maxErrorsPerGroup: 100, // Max 100 errors/min per group
        maxTotalErrors: 1000, // Max 1000 errors/min total
        windowMs: 60 * 1000, // 1 minute window
      },
      alertRules: [],
      recoveryStrategies: [],
      circuitBreaker: {
        timeout: 3000,
        failureThreshold: 5,
        resetTimeout: 30000,
        successThreshold: 3,
      },
      enablePerformanceMonitoring: true,
      performanceMonitoringInterval: 60000, // 1 minute
      ...config,
    };

    this.stats = {
      totalErrors: 0,
      totalGroups: 0,
      errorsSampled: 0,
      errorsRateLimited: 0,
      alertsTriggered: 0,
      recoveriesAttempted: 0,
      recoveriesSuccessful: 0,
      avgProcessingTime: 0,
      memoryUsage: 0,
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Track an error through the complete pipeline
   */
  async trackError(errorData: Partial<ErrorData>): Promise<void> {
    const startTime = Date.now();

    try {
      // Normalize error data
      const normalizedError = this.normalizeErrorData(errorData);

      // Generate fingerprint for grouping
      const fingerprint = this.generateFingerprint(normalizedError);
      normalizedError.fingerprint = fingerprint;

      // Check rate limiting
      if (this.isRateLimited(fingerprint)) {
        this.rateLimitedCount++;
        this.stats.errorsRateLimited++;
        return;
      }

      // Check sampling (for non-critical errors)
      if (!this.shouldSample(normalizedError.level)) {
        this.sampledCount++;
        this.stats.errorsSampled++;
        return;
      }

      // Update or create error group
      const group = this.updateErrorGroup(fingerprint, normalizedError);

      // Persist error to disk (async)
      this.persistError(normalizedError);

      // Update counters
      this.totalErrorCount++;
      this.stats.totalErrors++;

      // Emit event for real-time updates
      this.emit('error:tracked', { error: normalizedError, group });

      // Check if alerts should be triggered
      this.evaluateAlerts(group);

      // Update processing time stats
      const processingTime = Date.now() - startTime;
      this.stats.avgProcessingTime =
        (this.stats.avgProcessingTime * (this.stats.totalErrors - 1) + processingTime) /
        this.stats.totalErrors;
    } catch (error) {
      // Error tracking should never crash the app
      console.error('EnhancedErrorTracker: Failed to track error', error);
    }
  }

  /**
   * Normalize error data to standard format
   */
  private normalizeErrorData(errorData: Partial<ErrorData>): ErrorData {
    return {
      id: errorData.id ?? randomUUID(),
      name: errorData.name ?? 'Error',
      message: errorData.message ?? 'Unknown error',
      stack: errorData.stack,
      level: errorData.level ?? 'error',
      timestamp: errorData.timestamp ?? new Date().toISOString(),
      context: errorData.context ?? {},
      tags: errorData.tags ?? {},
    };
  }

  /**
   * Generate unique fingerprint for error grouping
   */
  private generateFingerprint(error: ErrorData): string {
    // Normalize error message (remove dynamic values)
    const normalizedMessage = this.normalizeMessage(error.message);

    // Extract error location from stack trace
    const location = this.extractLocation(error.stack);

    // Combine components for fingerprint
    const components = [
      error.name, // Error type
      normalizedMessage, // Normalized message
      location, // File:line
      error.context?.component, // Component name
    ].filter(Boolean);

    // Generate SHA-256 hash (16-char fingerprint)
    return createHash('sha256').update(components.join('|')).digest('hex').substring(0, 16);
  }

  /**
   * Normalize error message by removing dynamic values
   */
  private normalizeMessage(message: string): string {
    return (
      message
        // Remove UUIDs
        .replace(/[a-f0-9-]{36}/gi, '<UUID>')
        // Remove numbers
        .replace(/\b\d+\b/g, '<NUM>')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, '<URL>')
        // Remove file paths
        .replace(/[A-Z]:\\[\w\\]+/g, '<PATH>')
        .replace(/\/[\w/]+/g, '<PATH>')
        // Remove timestamps
        .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/g, '<TIME>')
        // Remove memory addresses
        .replace(/0x[0-9a-fA-F]+/g, '<ADDR>')
        .trim()
    );
  }

  /**
   * Extract error location from stack trace
   */
  private extractLocation(stack?: string): string {
    if (!stack) {
      return 'unknown';
    }

    // Find first line with file reference
    const match = stack.match(/at\s+(.+?)\s*\((.+?):(\d+):(\d+)\)/);
    if (match) {
      const [, , file, line] = match;
      // Normalize file path (remove absolute paths, keep src/ onwards)
      const normalizedFile = file.replace(/.*[\\/](src[\\/].+)$/, '$1');
      return `${normalizedFile}:${line}`;
    }

    // Try alternate format (Firefox, etc.)
    const altMatch = stack.match(/(.+?)@(.+?):(\d+):(\d+)/);
    if (altMatch) {
      const [, , file, line] = altMatch;
      const normalizedFile = file.replace(/.*[\\/](src[\\/].+)$/, '$1');
      return `${normalizedFile}:${line}`;
    }

    return 'unknown';
  }

  /**
   * Check if error should be rate limited
   */
  private isRateLimited(fingerprint: string): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(fingerprint);

    if (!limiter || now > limiter.resetAt) {
      // Reset rate limiter
      this.rateLimiters.set(fingerprint, {
        count: 1,
        resetAt: now + this.config.rateLimit.windowMs,
      });
      return false;
    }

    if (limiter.count >= this.config.rateLimit.maxErrorsPerGroup) {
      return true; // Rate limited
    }

    limiter.count++;
    return false;
  }

  /**
   * Check if error should be sampled based on level
   */
  private shouldSample(level: ErrorLevel): boolean {
    const rate = this.config.sampling[level];
    return Math.random() < rate;
  }

  /**
   * Update or create error group
   */
  private updateErrorGroup(fingerprint: string, error: ErrorData): ErrorGroup {
    let group = this.errorGroups.get(fingerprint);

    if (group) {
      // Update existing group
      group.lastSeen = Date.now();
      group.count++;

      // Add error to group (limit to last 10 for memory)
      group.errors.unshift(error);
      if (group.errors.length > 10) {
        group.errors.pop();
      }
    } else {
      // Create new group
      group = {
        fingerprint,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        count: 1,
        errors: [error],
        pattern: this.normalizeMessage(error.message),
      };

      this.errorGroups.set(fingerprint, group);
      this.stats.totalGroups++;

      // Emit new group event
      this.emit('group:created', group);
    }

    return group;
  }

  /**
   * Persist error to disk (async, non-blocking)
   */
  private persistError(error: ErrorData): void {
    try {
      errorLogger.logError(error.message, {
        id: error.id,
        name: error.name,
        level: error.level,
        timestamp: error.timestamp,
        fingerprint: error.fingerprint,
        stack: error.stack,
        context: error.context,
        tags: error.tags,
      });
    } catch (error) {
      // Silently fail - error logging should never crash app
      console.error('Failed to persist error', error);
    }
  }

  /**
   * Evaluate alert rules for error group
   */
  private evaluateAlerts(group: ErrorGroup): void {
    // Check if error count exceeds threshold
    if (group.count >= 10 && group.count % 10 === 0) {
      this.emit('alert', {
        id: randomUUID(),
        name: 'Repeated Error Group',
        severity: 'warning',
        message: `Error group ${group.fingerprint} occurred ${group.count} times`,
        value: group.count,
        threshold: 10,
        timestamp: new Date().toISOString(),
        active: true,
      });

      this.stats.alertsTriggered++;
    }

    // Additional alert rules can be added here based on config
  }

  /**
   * Get error metrics for dashboard
   */
  async getMetrics(timeRange: string = '1h'): Promise<ErrorMetrics> {
    const now = Date.now();
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const rangeMs = ranges[timeRange] ?? ranges['1h'];
    const startTime = now - rangeMs;

    // Filter groups within time range
    const recentGroups = Array.from(this.errorGroups.values()).filter(
      (group) => group.lastSeen >= startTime,
    );

    // Calculate metrics
    const totalErrors = recentGroups.reduce((sum, group) => sum + group.count, 0);
    const affectedUsers = new Set(
      recentGroups.flatMap((group) =>
        group.errors.map((error) => error.context?.userId).filter(Boolean),
      ),
    ).size;

    // Calculate error rate (simplified - would need total operations in real implementation)
    const errorRate = totalErrors > 0 ? 0.01 * Math.min(totalErrors / 100, 1) : 0;

    // Calculate MTTR (simplified - would track resolution times in real implementation)
    const mttr = 15 * 60 * 1000; // 15 minutes placeholder

    // Error distribution by type
    const distributionMap = new Map<string, number>();
    recentGroups.forEach((group) => {
      const errorName = group.errors[0]?.name ?? 'Unknown';
      distributionMap.set(errorName, (distributionMap.get(errorName) ?? 0) + group.count);
    });

    const errorDistribution = Array.from(distributionMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalErrors) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Top errors
    const topErrors = recentGroups
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((group) => ({
        fingerprint: group.fingerprint,
        message: group.pattern,
        count: group.count,
        lastSeen: new Date(group.lastSeen).toISOString(),
      }));

    // Recent errors
    const recentErrors = recentGroups
      .flatMap((group) => group.errors)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    return {
      totalErrors,
      errorRate,
      affectedUsers,
      mttr,
      errorTrend: [], // Would be populated from historical data
      errorDistribution,
      topErrors,
      recentErrors,
      activeAlerts: [], // Would be populated from alert manager
      errorHeatmap: [], // Would be populated from time-bucketed data
      errorRateTrend: 'stable',
      errorsTrend: 'stable',
      usersTrend: 'stable',
      mttrTrend: 'stable',
    };
  }

  /**
   * Get error tracker statistics
   */
  getStats(): ErrorTrackerStats {
    this.stats.memoryUsage = this.calculateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Calculate memory usage of error tracker
   */
  private calculateMemoryUsage(): number {
    // Rough estimate: 1KB per error * number of errors in memory
    const errorCount = Array.from(this.errorGroups.values()).reduce(
      (sum, group) => sum + group.errors.length,
      0,
    );
    return (errorCount * 1024) / (1024 * 1024); // Convert to MB
  }

  /**
   * Clear error groups (for testing/maintenance)
   */
  clearGroups(): void {
    this.errorGroups.clear();
    this.stats.totalGroups = 0;
    this.emit('groups:cleared');
  }

  /**
   * Start cleanup timer to remove old error groups
   */
  private startCleanupTimer(): void {
    setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    ); // Cleanup every 5 minutes
  }

  /**
   * Cleanup old error groups (older than 24 hours)
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    let removed = 0;
    for (const [fingerprint, group] of this.errorGroups.entries()) {
      if (now - group.lastSeen > maxAge) {
        this.errorGroups.delete(fingerprint);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.totalGroups -= removed;
      this.emit('groups:cleanup', { removed });
    }
  }
}

/**
 * Error Tracking Type Definitions
 *
 * Comprehensive types for the enhanced error tracking system.
 */

export type ErrorLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  /** User ID if authenticated */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Case ID if error related to case */
  caseId?: string;
  /** Component name where error occurred */
  component?: string;
  /** Operation that failed */
  operation?: string;
  /** Request URL (renderer only) */
  url?: string;
  /** User agent string */
  userAgent?: string;
  /** Additional custom context */
  [key: string]: unknown;
}

export interface ErrorData {
  /** Error ID (UUID) */
  id: string;
  /** Error name/type */
  name: string;
  /** Error message */
  message: string;
  /** Stack trace */
  stack?: string;
  /** Error level/severity */
  level: ErrorLevel;
  /** ISO timestamp */
  timestamp: string;
  /** Error fingerprint for grouping */
  fingerprint?: string;
  /** Contextual information */
  context?: ErrorContext;
  /** Tags for categorization */
  tags?: Record<string, string>;
}

export interface ErrorGroup {
  /** Unique fingerprint identifying this group */
  fingerprint: string;
  /** First time this error was seen (timestamp) */
  firstSeen: number;
  /** Last time this error was seen (timestamp) */
  lastSeen: number;
  /** Number of times this error occurred */
  count: number;
  /** Individual error instances */
  errors: ErrorData[];
  /** Normalized error pattern */
  pattern: string;
  /** Whether this group has been resolved */
  resolved?: boolean;
  /** User who resolved it */
  resolvedBy?: string;
  /** Resolution timestamp */
  resolvedAt?: string;
}

export interface ErrorMetrics {
  /** Total number of errors */
  totalErrors: number;
  /** Error rate (errors / total operations) */
  errorRate: number;
  /** Number of unique users affected by errors */
  affectedUsers: number;
  /** Mean Time To Resolution (milliseconds) */
  mttr: number;
  /** Error trend over time */
  errorTrend: Array<{
    timestamp: string;
    errors: number;
    warnings: number;
  }>;
  /** Error distribution by type */
  errorDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  /** Top errors by frequency */
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastSeen: string;
  }>;
  /** Recent errors */
  recentErrors: ErrorData[];
  /** Active alerts */
  activeAlerts: Alert[];
  /** Error heatmap (hourly buckets) */
  errorHeatmap: Array<{
    hour: string;
    count: number;
  }>;
  /** Trend indicators */
  errorRateTrend: 'up' | 'down' | 'stable';
  errorsTrend: 'up' | 'down' | 'stable';
  usersTrend: 'up' | 'down' | 'stable';
  mttrTrend: 'up' | 'down' | 'stable';
}

export interface Alert {
  /** Alert ID */
  id: string;
  /** Alert rule name */
  name: string;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Alert message */
  message: string;
  /** Current value that triggered alert */
  value: number | string;
  /** Threshold that was exceeded */
  threshold: number | string;
  /** Alert timestamp */
  timestamp: string;
  /** Whether alert is active */
  active: boolean;
  /** When alert was acknowledged */
  acknowledgedAt?: string;
  /** Who acknowledged the alert */
  acknowledgedBy?: string;
}

export interface AlertRule {
  /** Rule name */
  name: string;
  /** Condition to evaluate */
  condition: string;
  /** Threshold value */
  threshold: number | string;
  /** Time window for evaluation (milliseconds) */
  window: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Alert channels (console, notification, file, email, slack) */
  channels: Array<'console' | 'notification' | 'file' | 'email' | 'slack'>;
  /** Cooldown period between alerts (milliseconds) */
  cooldown: number;
  /** Optional filter function */
  filter?: (error: ErrorData) => boolean;
}

export interface SamplingConfig {
  /** Critical error sampling rate (0-1) */
  critical: number;
  /** Error sampling rate (0-1) */
  error: number;
  /** Warning sampling rate (0-1) */
  warning: number;
  /** Info sampling rate (0-1) */
  info: number;
  /** Debug sampling rate (0-1) */
  debug: number;
}

export interface RateLimitConfig {
  /** Maximum errors per group per window */
  maxErrorsPerGroup: number;
  /** Maximum total errors per window */
  maxTotalErrors: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface CircuitBreakerConfig {
  /** Timeout for operations (milliseconds) */
  timeout: number;
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time to wait before trying half-open (milliseconds) */
  resetTimeout: number;
  /** Number of successes needed to close circuit */
  successThreshold: number;
}

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries (milliseconds) */
  baseDelay: number;
  /** Maximum delay between retries (milliseconds) */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

export interface PerformanceMetrics {
  /** Timestamp */
  timestamp: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Throughput (operations per second) */
  throughput: number;
  /** Apdex score (0-1) */
  apdex: number;
  /** Resource usage */
  resourceUsage: {
    /** CPU usage percentage (0-100) */
    cpu: number;
    /** Memory usage in MB */
    memory: number;
    /** Memory usage percentage (0-100) */
    memoryPercent: number;
    /** Disk usage in GB */
    disk: number;
    /** Disk usage percentage (0-100) */
    diskPercent: number;
  };
}

export interface Anomaly {
  /** Anomaly type */
  type: 'response_time_spike' | 'error_rate_increase' | 'apdex_degradation' | 'resource_usage_high';
  /** Anomaly severity */
  severity: 'info' | 'warning' | 'critical';
  /** Current value */
  current: number;
  /** Baseline value */
  baseline: number;
  /** Percentage change from baseline */
  change: number;
  /** Timestamp */
  timestamp: number;
}

export interface RecoveryStrategy {
  /** Strategy name */
  name: string;
  /** Error types this strategy applies to */
  errorTypes: string[];
  /** Strategy function */
  execute: (error: Error, context: ErrorContext) => Promise<unknown>;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Whether to use circuit breaker */
  useCircuitBreaker?: boolean;
}

export interface ErrorTrackerConfig {
  /** Sampling configuration */
  sampling: SamplingConfig;
  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;
  /** Alert rules */
  alertRules: AlertRule[];
  /** Recovery strategies */
  recoveryStrategies: RecoveryStrategy[];
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Performance monitoring interval (milliseconds) */
  performanceMonitoringInterval: number;
}

export interface ErrorTrackerStats {
  /** Total errors tracked */
  totalErrors: number;
  /** Total error groups */
  totalGroups: number;
  /** Errors sampled (not persisted) */
  errorsSampled: number;
  /** Errors rate limited */
  errorsRateLimited: number;
  /** Alerts triggered */
  alertsTriggered: number;
  /** Recoveries attempted */
  recoveriesAttempted: number;
  /** Recoveries successful */
  recoveriesSuccessful: number;
  /** Average error processing time (ms) */
  avgProcessingTime: number;
  /** Memory usage (MB) */
  memoryUsage: number;
}

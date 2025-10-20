import { getCacheService, type CacheStats } from '../services/CacheService.ts';

/**
 * Detailed cache metrics for monitoring and analysis
 */
export interface DetailedCacheMetrics {
  timestamp: number;
  uptime: number;
  enabled: boolean;
  caches: CacheStats[];
  overall: {
    totalHits: number;
    totalMisses: number;
    totalEvictions: number;
    averageHitRate: number;
    totalSize: number;
    totalMaxSize: number;
    memoryUtilization: number;
  };
  performance: {
    estimatedMemoryMB: number;
    cacheEfficiency: number;
    recommendedActions: string[];
  };
}

/**
 * Time series data point for cache metrics
 */
export interface CacheMetricsDataPoint {
  timestamp: number;
  hitRate: number;
  size: number;
  evictions: number;
}

/**
 * Cache metrics tracking and analysis utility
 *
 * Features:
 * - Real-time cache statistics collection
 * - Time series data for trend analysis
 * - Memory usage estimation
 * - Performance recommendations
 * - IPC-ready metric exports
 */
export class CacheMetrics {
  private startTime: number;
  private timeSeriesData: Map<string, CacheMetricsDataPoint[]>;
  private readonly maxDataPoints = 100; // Keep last 100 data points per cache

  constructor() {
    this.startTime = Date.now();
    this.timeSeriesData = new Map();
  }

  /**
   * Collect current metrics snapshot
   */
  collect(): DetailedCacheMetrics {
    const cacheService = getCacheService();
    const stats = cacheService.getStats();
    const enabled = cacheService.isEnabled();

    // Calculate overall metrics
    let totalHits = 0;
    let totalMisses = 0;
    let totalEvictions = 0;
    let totalSize = 0;
    let totalMaxSize = 0;

    for (const cache of stats) {
      totalHits += cache.hits;
      totalMisses += cache.misses;
      totalEvictions += cache.evictions;
      totalSize += cache.size;
      totalMaxSize += cache.maxSize;

      // Update time series data
      this.updateTimeSeries(cache);
    }

    const totalRequests = totalHits + totalMisses;
    const averageHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const memoryUtilization = totalMaxSize > 0 ? (totalSize / totalMaxSize) * 100 : 0;

    // Estimate memory usage (rough approximation)
    // Assume average entry size of 1KB (conservative estimate)
    const estimatedMemoryMB = (totalSize * 1024) / (1024 * 1024);

    // Calculate cache efficiency
    const cacheEfficiency = this.calculateEfficiency(averageHitRate, memoryUtilization);

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(
      averageHitRate,
      memoryUtilization,
      stats
    );

    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      enabled,
      caches: stats,
      overall: {
        totalHits,
        totalMisses,
        totalEvictions,
        averageHitRate: Math.round(averageHitRate * 100) / 100,
        totalSize,
        totalMaxSize,
        memoryUtilization: Math.round(memoryUtilization * 100) / 100,
      },
      performance: {
        estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100,
        cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
        recommendedActions,
      },
    };
  }

  /**
   * Update time series data for a cache
   */
  private updateTimeSeries(cache: CacheStats): void {
    const key = cache.name;
    if (!this.timeSeriesData.has(key)) {
      this.timeSeriesData.set(key, []);
    }

    const series = this.timeSeriesData.get(key)!;
    series.push({
      timestamp: Date.now(),
      hitRate: cache.hitRate,
      size: cache.size,
      evictions: cache.evictions,
    });

    // Keep only last N data points
    if (series.length > this.maxDataPoints) {
      series.shift();
    }
  }

  /**
   * Get time series data for a specific cache
   */
  getTimeSeries(cacheName: string): CacheMetricsDataPoint[] {
    return this.timeSeriesData.get(cacheName) || [];
  }

  /**
   * Calculate cache efficiency score (0-100)
   */
  private calculateEfficiency(hitRate: number, utilization: number): number {
    // Weight factors
    const hitRateWeight = 0.7; // Hit rate is more important
    const utilizationWeight = 0.3;

    // Ideal utilization is around 70-80%
    const utilizationScore = utilization > 80
      ? 100 - (utilization - 80) // Penalty for over-utilization
      : utilization * 1.25; // Boost for good utilization

    return hitRateWeight * hitRate + utilizationWeight * utilizationScore;
  }

  /**
   * Generate performance recommendations based on metrics
   */
  private generateRecommendations(
    hitRate: number,
    utilization: number,
    caches: CacheStats[]
  ): string[] {
    const recommendations: string[] = [];

    // Overall hit rate recommendations
    if (hitRate < 50) {
      recommendations.push('Low hit rate detected. Consider increasing TTL or cache size.');
    } else if (hitRate > 90) {
      recommendations.push('Excellent hit rate! Cache is performing optimally.');
    }

    // Memory utilization recommendations
    if (utilization > 90) {
      recommendations.push('High memory utilization. Consider increasing cache size to prevent evictions.');
    } else if (utilization < 20) {
      recommendations.push('Low memory utilization. Consider reducing cache size to save memory.');
    }

    // Per-cache recommendations
    for (const cache of caches) {
      if (cache.evictions > cache.size * 0.1) {
        recommendations.push(
          `High eviction rate in "${cache.name}" cache. Consider increasing its size.`
        );
      }

      if (cache.hitRate < 30 && cache.misses > 100) {
        recommendations.push(
          `Poor performance in "${cache.name}" cache. Review access patterns or TTL settings.`
        );
      }
    }

    // Session cache specific recommendations
    const sessionCache = caches.find(c => c.name === 'sessions');
    if (sessionCache && sessionCache.hitRate < 70) {
      recommendations.push('Session cache hit rate is low. This may impact authentication performance.');
    }

    return recommendations;
  }

  /**
   * Export metrics in a format suitable for IPC transmission
   */
  export(): string {
    const metrics = this.collect();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Get a human-readable summary of cache performance
   */
  getSummary(): string {
    const metrics = this.collect();
    const { overall, performance } = metrics;

    const lines = [
      '=== Cache Performance Summary ===',
      `Status: ${metrics.enabled ? 'Enabled' : 'Disabled'}`,
      `Uptime: ${Math.round(metrics.uptime / 1000)}s`,
      '',
      '--- Overall Statistics ---',
      `Hit Rate: ${overall.averageHitRate}%`,
      `Total Hits: ${overall.totalHits}`,
      `Total Misses: ${overall.totalMisses}`,
      `Total Evictions: ${overall.totalEvictions}`,
      `Memory Usage: ${performance.estimatedMemoryMB}MB`,
      `Memory Utilization: ${overall.memoryUtilization}%`,
      `Efficiency Score: ${performance.cacheEfficiency}/100`,
      '',
      '--- Per-Cache Statistics ---',
    ];

    for (const cache of metrics.caches) {
      lines.push(
        `${cache.name}: ${cache.hitRate}% hit rate, ${cache.size}/${cache.maxSize} entries, ${cache.evictions} evictions`
      );
    }

    if (performance.recommendedActions.length > 0) {
      lines.push('', '--- Recommendations ---');
      performance.recommendedActions.forEach(action => {
        lines.push(`• ${action}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.startTime = Date.now();
    this.timeSeriesData.clear();
    getCacheService().resetStats();
  }
}

// Singleton instance
let metricsInstance: CacheMetrics | null = null;

/**
 * Get or create the global cache metrics instance
 */
export function getCacheMetrics(): CacheMetrics {
  if (!metricsInstance) {
    metricsInstance = new CacheMetrics();
  }
  return metricsInstance;
}

/**
 * Log cache metrics to console (for debugging)
 */
export function logCacheMetrics(): void {
  const metrics = getCacheMetrics();
  console.log(metrics.getSummary());
}

/**
 * Start periodic metrics logging (for development)
 */
export function startMetricsLogging(intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    logCacheMetrics();
  }, intervalMs);
}
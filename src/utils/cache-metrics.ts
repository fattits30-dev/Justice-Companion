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

    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      enabled,
      caches: stats,
      overall: {
        totalHits,
        totalMisses,
        totalEvictions,
        averageHitRate,
        totalSize,
        totalMaxSize,
        memoryUtilization
      },
      performance: {
        estimatedMemoryMB,
        cacheEfficiency,
        recommendedActions: this.generateRecommendations(averageHitRate, memoryUtilization)
      }
    };
  }

  private updateTimeSeries(cache: CacheStats): void {
    const cacheKey = cache.name || 'default';
    const now = Date.now();
    
    if (!this.timeSeriesData.has(cacheKey)) {
      this.timeSeriesData.set(cacheKey, []);
    }
    
    const dataPoints = this.timeSeriesData.get(cacheKey)!;
    
    // Remove oldest data point if we've reached the limit
    if (dataPoints.length >= this.maxDataPoints) {
      dataPoints.shift();
    }
    
    // Add new data point
    dataPoints.push({
      timestamp: now,
      hitRate: cache.hits + cache.misses > 0 ? (cache.hits / (cache.hits + cache.misses)) * 100 : 0,
      size: cache.size,
      evictions: cache.evictions
    });
  }

  private calculateEfficiency(hitRate: number, memoryUtilization: number): number {
    // Simple efficiency calculation based on hit rate and memory utilization
    // This is a placeholder implementation - actual logic may vary
    const normalizedHitRate = hitRate / 100;
    const normalizedMemory = 1 - (memoryUtilization / 100);
    
    // Weighted average (adjust weights as needed)
    return (normalizedHitRate * 0.7 + normalizedMemory * 0.3) * 100;
  }

  private generateRecommendations(hitRate: number, memoryUtilization: number): string[] {
    const recommendations: string[] = [];
    
    if (hitRate < 50) {
      recommendations.push('Consider increasing cache size or improving cache warming strategy');
    }
    
    if (memoryUtilization > 80) {
      recommendations.push('Consider increasing max cache size or implementing more aggressive eviction policies');
    }
    
    if (hitRate > 90 && memoryUtilization < 30) {
      recommendations.push('Consider reducing cache size to save memory resources');
    }
    
    return recommendations;
  }
}
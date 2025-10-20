/**
 * Comprehensive Performance Profiling Suite for Justice Companion
 * Measures and analyzes performance across all application layers
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import v8 from 'v8';
import { EventEmitter } from 'events';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  duration: number;
  category: 'database' | 'encryption' | 'ipc' | 'react' | 'api' | 'cpu' | 'memory';
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  statistics: {
    average: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    count: number;
  };
  memorySnapshot: NodeJS.MemoryUsage;
  heapStatistics: v8.HeapInfo;
}

export class PerformanceProfiler extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private marks: Map<string, number> = new Map();
  private observer: PerformanceObserver;
  private memoryInterval: NodeJS.Timeout | null = null;
  private cpuInterval: NodeJS.Timeout | null = null;
  private lastCpuUsage: NodeJS.CpuUsage;

  constructor() {
    super();
    this.lastCpuUsage = process.cpuUsage();
    this.setupObserver();
  }

  private setupObserver(): void {
    this.observer = new PerformanceObserver((items) => {
      items.getEntries().forEach((entry) => {
        this.recordMetric({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          category: this.categorizeEntry(entry.name),
          metadata: { entryType: entry.entryType }
        });
      });
    });
    this.observer.observe({ entryTypes: ['measure', 'function', 'gc'] });
  }

  private categorizeEntry(name: string): PerformanceMetric['category'] {
    if (name.includes('database') || name.includes('sql') || name.includes('query')) {
      return 'database';
    }
    if (name.includes('encrypt') || name.includes('decrypt') || name.includes('hash')) {
      return 'encryption';
    }
    if (name.includes('ipc') || name.includes('invoke')) {
      return 'ipc';
    }
    if (name.includes('render') || name.includes('component') || name.includes('react')) {
      return 'react';
    }
    if (name.includes('api') || name.includes('openai') || name.includes('http')) {
      return 'api';
    }
    return 'cpu';
  }

  /**
   * Start measuring a performance metric
   */
  mark(name: string): void {
    const markName = `${name}_start`;
    performance.mark(markName);
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring and record the metric
   */
  measure(name: string, metadata?: Record<string, any>): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      throw new Error(`No start mark found for ${name}`);
    }

    const endMarkName = `${name}_end`;
    performance.mark(endMarkName);

    const duration = performance.now() - startTime;
    performance.measure(name, `${name}_start`, endMarkName);

    this.recordMetric({
      name,
      startTime,
      duration,
      category: this.categorizeEntry(name),
      metadata
    });

    this.marks.delete(name);
    return duration;
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    const categoryMetrics = this.metrics.get(metric.category) || [];
    categoryMetrics.push(metric);
    this.metrics.set(metric.category, categoryMetrics);

    this.emit('metric', metric);
  }

  /**
   * Profile a function execution
   */
  async profile<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.mark(name);
    try {
      const result = await fn();
      const duration = this.measure(name, metadata);

      // Emit slow operation warning
      if (duration > 100) {
        this.emit('slow-operation', { name, duration, metadata });
      }

      return result;
    } catch (error) {
      this.measure(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Start monitoring memory usage
   */
  startMemoryMonitoring(interval: number = 1000): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }

    this.memoryInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();

      this.emit('memory-snapshot', {
        timestamp: Date.now(),
        memory: memUsage,
        heap: heapStats,
        heapUsagePercent: (heapStats.used_heap_size / heapStats.heap_size_limit) * 100
      });

      // Detect potential memory leak
      if (heapStats.used_heap_size > heapStats.heap_size_limit * 0.9) {
        this.emit('memory-warning', {
          usedHeap: heapStats.used_heap_size,
          heapLimit: heapStats.heap_size_limit,
          message: 'Heap usage exceeds 90% of limit'
        });
      }
    }, interval);
  }

  /**
   * Start monitoring CPU usage
   */
  startCpuMonitoring(interval: number = 1000): void {
    if (this.cpuInterval) {
      clearInterval(this.cpuInterval);
    }

    this.cpuInterval = setInterval(() => {
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      const totalTime = currentCpuUsage.user + currentCpuUsage.system;
      const cpuPercent = (totalTime / (interval * 1000)) * 100;

      this.emit('cpu-snapshot', {
        timestamp: Date.now(),
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        percent: cpuPercent
      });

      if (cpuPercent > 80) {
        this.emit('cpu-warning', {
          percent: cpuPercent,
          message: 'CPU usage exceeds 80%'
        });
      }

      this.lastCpuUsage = process.cpuUsage();
    }, interval);
  }

  /**
   * Generate performance statistics for a category
   */
  getStatistics(category?: PerformanceMetric['category']): PerformanceReport['statistics'] {
    let metrics: PerformanceMetric[] = [];

    if (category) {
      metrics = this.metrics.get(category) || [];
    } else {
      this.metrics.forEach(categoryMetrics => {
        metrics.push(...categoryMetrics);
      });
    }

    if (metrics.length === 0) {
      return {
        average: 0,
        p50: 0,
        p75: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        count: 0
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, val) => acc + val, 0);

    return {
      average: sum / durations.length,
      p50: this.percentile(durations, 50),
      p75: this.percentile(durations, 75),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      min: durations[0],
      max: durations[durations.length - 1],
      count: durations.length
    };
  }

  private percentile(values: number[], p: number): number {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const allMetrics: PerformanceMetric[] = [];
    this.metrics.forEach(categoryMetrics => {
      allMetrics.push(...categoryMetrics);
    });

    return {
      timestamp: Date.now(),
      metrics: allMetrics,
      statistics: this.getStatistics(),
      memorySnapshot: process.memoryUsage(),
      heapStatistics: v8.getHeapStatistics()
    };
  }

  /**
   * Generate category-specific reports
   */
  getCategoryReport(category: PerformanceMetric['category']): {
    category: string;
    metrics: PerformanceMetric[];
    statistics: PerformanceReport['statistics'];
    slowOperations: PerformanceMetric[];
  } {
    const metrics = this.metrics.get(category) || [];
    const slowOperations = metrics.filter(m => m.duration > 100);

    return {
      category,
      metrics,
      statistics: this.getStatistics(category),
      slowOperations
    };
  }

  /**
   * Clear all collected metrics
   */
  reset(): void {
    this.metrics.clear();
    this.marks.clear();
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    if (this.cpuInterval) {
      clearInterval(this.cpuInterval);
      this.cpuInterval = null;
    }
    this.observer.disconnect();
  }

  /**
   * Get flame graph data for visualization
   */
  getFlameGraphData(): Array<{
    name: string;
    value: number;
    children?: Array<any>;
  }> {
    const data: Array<any> = [];

    this.metrics.forEach((categoryMetrics, category) => {
      const categoryNode = {
        name: category,
        value: categoryMetrics.reduce((sum, m) => sum + m.duration, 0),
        children: categoryMetrics.map(m => ({
          name: m.name,
          value: m.duration,
          metadata: m.metadata
        }))
      };
      data.push(categoryNode);
    });

    return data;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }
}

// Singleton instance
export const profiler = new PerformanceProfiler();

// Decorator for automatic profiling
export function Profile(category?: PerformanceMetric['category']) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = `${target.constructor.name}.${propertyKey}`;
      return profiler.profile(name, () => originalMethod.apply(this, args), {
        category: category || 'cpu',
        args: args.length
      });
    };

    return descriptor;
  };
}

// Export performance utilities
export const measurePerformance = {
  start: (name: string) => profiler.mark(name),
  end: (name: string, metadata?: Record<string, any>) => profiler.measure(name, metadata),
  profile: <T>(name: string, fn: () => T | Promise<T>, metadata?: Record<string, any>) =>
    profiler.profile(name, fn, metadata)
};
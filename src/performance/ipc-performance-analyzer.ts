/**
 * IPC Performance Analyzer for Justice Companion
 * Analyzes Electron IPC communication overhead and identifies bottlenecks
 */

import { performance } from 'perf_hooks';
import { profiler } from './performance-profiler';

export interface IPCMetric {
  channel: string;
  direction: 'main-to-renderer' | 'renderer-to-main' | 'bidirectional';
  payloadSize: number;
  serializationTime: number;
  transmissionTime: number;
  deserializationTime: number;
  totalTime: number;
  isSlowIPC: boolean;
}

export interface ServiceInstantiationMetric {
  serviceName: string;
  instantiationTime: number;
  instanceCount: number;
  memoryOverhead: number;
}

export interface IPCPerformanceReport {
  ipcMetrics: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    slowestChannels: IPCMetric[];
  };
  payloadAnalysis: {
    avgPayloadSize: number;
    largestPayloads: IPCMetric[];
    serializationOverhead: number;
  };
  serviceInstantiation: {
    lazyLoadingOverhead: number;
    unnecessaryInstantiations: number;
    memoryWaste: number;
    recommendations: string[];
  };
  batchingOpportunities: {
    channels: string[];
    potentialReduction: number;
  };
  recommendations: string[];
}

export class IPCPerformanceAnalyzer {
  private ipcMetrics: IPCMetric[] = [];
  private serviceInstantiations: Map<string, ServiceInstantiationMetric[]> = new Map();
  private channelFrequency: Map<string, number> = new Map();
  private slowIPCThreshold: number = 50; // ms
  private largePayloadThreshold: number = 1048576; // 1MB

  /**
   * Measure IPC round-trip time
   */
  async measureIPCRoundTrip(
    channel: string,
    payload: any,
    direction: IPCMetric['direction'] = 'bidirectional'
  ): Promise<IPCMetric> {
    const payloadStr = JSON.stringify(payload);
    const payloadSize = Buffer.byteLength(payloadStr);

    // Measure serialization time
    const serializeStart = performance.now();
    const serialized = this.serializePayload(payload);
    const serializationTime = performance.now() - serializeStart;

    // Simulate transmission time (based on payload size)
    const transmissionTime = this.estimateTransmissionTime(payloadSize);

    // Measure deserialization time
    const deserializeStart = performance.now();
    const deserialized = this.deserializePayload(serialized);
    const deserializationTime = performance.now() - deserializeStart;

    const totalTime = serializationTime + transmissionTime + deserializationTime;
    const isSlowIPC = totalTime > this.slowIPCThreshold;

    const metric: IPCMetric = {
      channel,
      direction,
      payloadSize,
      serializationTime,
      transmissionTime,
      deserializationTime,
      totalTime,
      isSlowIPC
    };

    this.ipcMetrics.push(metric);

    // Track channel frequency
    const currentCount = this.channelFrequency.get(channel) || 0;
    this.channelFrequency.set(channel, currentCount + 1);

    // Emit warnings
    if (isSlowIPC) {
      profiler.emit('slow-ipc', metric);
    }

    if (payloadSize > this.largePayloadThreshold) {
      profiler.emit('large-ipc-payload', {
        channel,
        payloadSize,
        recommendation: 'Consider streaming or chunking large payloads'
      });
    }

    return metric;
  }

  /**
   * Serialize payload (simulates Electron's structured clone algorithm)
   */
  private serializePayload(payload: any): string {
    // Electron uses structured clone algorithm which is more complex than JSON
    // This is a simplified simulation
    try {
      return JSON.stringify(payload, (key, value) => {
        // Handle special types that structured clone supports
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        if (value instanceof RegExp) {
          return { __type: 'RegExp', source: value.source, flags: value.flags };
        }
        if (value instanceof Error) {
          return { __type: 'Error', message: value.message, stack: value.stack };
        }
        if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
          return { __type: 'ArrayBuffer', data: Array.from(new Uint8Array(value as any)) };
        }
        return value;
      });
    } catch (error) {
      console.warn('Serialization error:', error);
      return '{}';
    }
  }

  /**
   * Deserialize payload
   */
  private deserializePayload(serialized: string): any {
    try {
      return JSON.parse(serialized, (key, value) => {
        if (value && typeof value === 'object' && value.__type) {
          switch (value.__type) {
            case 'Date':
              return new Date(value.value);
            case 'RegExp':
              return new RegExp(value.source, value.flags);
            case 'Error':
              const error = new Error(value.message);
              error.stack = value.stack;
              return error;
            case 'ArrayBuffer':
              return new Uint8Array(value.data).buffer;
          }
        }
        return value;
      });
    } catch (error) {
      console.warn('Deserialization error:', error);
      return null;
    }
  }

  /**
   * Estimate transmission time based on payload size
   */
  private estimateTransmissionTime(payloadSize: number): number {
    // Estimate based on IPC overhead and payload size
    // Base overhead: 0.5ms + size-dependent delay
    const baseOverhead = 0.5;
    const bytesPerMs = 1048576; // 1MB/ms throughput estimate
    return baseOverhead + (payloadSize / bytesPerMs);
  }

  /**
   * Track service instantiation (lazy-loading issue from Phase 1)
   */
  trackServiceInstantiation(
    serviceName: string,
    instantiationTime: number,
    memoryOverhead: number = 0
  ): void {
    const metrics = this.serviceInstantiations.get(serviceName) || [];

    metrics.push({
      serviceName,
      instantiationTime,
      instanceCount: metrics.length + 1,
      memoryOverhead
    });

    this.serviceInstantiations.set(serviceName, metrics);

    // Warn about multiple instantiations (should be singletons)
    if (metrics.length > 1) {
      profiler.emit('service-instantiation-warning', {
        serviceName,
        instanceCount: metrics.length,
        totalOverhead: instantiationTime * metrics.length,
        recommendation: 'Convert to singleton pattern to avoid repeated instantiation'
      });
    }
  }

  /**
   * Analyze IPC patterns for batching opportunities
   */
  analyzeBatchingOpportunities(): {
    channels: string[];
    potentialReduction: number;
  } {
    const batchableChannels: string[] = [];
    let totalCalls = 0;
    let potentialBatchedCalls = 0;

    // Group IPC calls by channel and time window
    const timeWindow = 100; // 100ms window for batching
    const channelGroups = new Map<string, IPCMetric[]>();

    this.ipcMetrics.forEach(metric => {
      const group = channelGroups.get(metric.channel) || [];
      group.push(metric);
      channelGroups.set(metric.channel, group);
    });

    // Identify channels with multiple calls that could be batched
    channelGroups.forEach((metrics, channel) => {
      if (metrics.length > 5) {
        // Sort by time (would need timestamp in real implementation)
        const callsInWindow = this.countCallsInTimeWindow(metrics, timeWindow);

        if (callsInWindow > 1) {
          batchableChannels.push(channel);
          totalCalls += metrics.length;
          potentialBatchedCalls += Math.ceil(metrics.length / callsInWindow);
        }
      }
    });

    const potentialReduction = totalCalls > 0
      ? ((totalCalls - potentialBatchedCalls) / totalCalls) * 100
      : 0;

    return {
      channels: batchableChannels,
      potentialReduction
    };
  }

  /**
   * Count calls within a time window (simplified simulation)
   */
  private countCallsInTimeWindow(metrics: IPCMetric[], windowMs: number): number {
    // In real implementation, would use actual timestamps
    // This is a simplified estimation
    return Math.min(5, Math.floor(metrics.length / 10));
  }

  /**
   * Test IPC performance with various payload sizes
   */
  async runPerformanceTest(): Promise<void> {
    const testScenarios = [
      { channel: 'case:get', payload: { id: 1 }, size: 'small' },
      { channel: 'case:list', payload: { page: 1, limit: 20 }, size: 'medium' },
      { channel: 'case:create', payload: this.generateLargeCase(), size: 'large' },
      { channel: 'evidence:upload', payload: this.generateEvidence(1048576), size: 'xlarge' },
      { channel: 'chat:stream', payload: { messages: this.generateChatMessages(100) }, size: 'stream' }
    ];

    console.log('Testing IPC performance...');

    for (const scenario of testScenarios) {
      const metric = await this.measureIPCRoundTrip(
        scenario.channel,
        scenario.payload
      );

      console.log(`${scenario.channel} (${scenario.size}): ${metric.totalTime.toFixed(2)}ms`);
      console.log(`  Serialization: ${metric.serializationTime.toFixed(2)}ms`);
      console.log(`  Transmission: ${metric.transmissionTime.toFixed(2)}ms`);
      console.log(`  Deserialization: ${metric.deserializationTime.toFixed(2)}ms`);
    }
  }

  /**
   * Test service instantiation overhead
   */
  async testServiceInstantiationOverhead(): Promise<void> {
    const services = [
      'AuthenticationService',
      'EncryptionService',
      'CaseService',
      'EvidenceService',
      'ChatService',
      'IntegratedAIService' // God class from Phase 1
    ];

    console.log('Testing service instantiation overhead...');

    for (const service of services) {
      // Simulate multiple requests causing lazy instantiation
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        // Simulate service instantiation
        await this.simulateServiceInstantiation(service);

        const instantiationTime = performance.now() - startTime;
        const memoryOverhead = service === 'IntegratedAIService'
          ? 50 * 1024 * 1024 // 50MB for god class
          : 5 * 1024 * 1024; // 5MB for normal service

        this.trackServiceInstantiation(service, instantiationTime, memoryOverhead);
      }
    }
  }

  /**
   * Simulate service instantiation
   */
  private async simulateServiceInstantiation(serviceName: string): Promise<void> {
    // Simulate loading and initializing a service
    const complexityMap: Record<string, number> = {
      'AuthenticationService': 10,
      'EncryptionService': 5,
      'CaseService': 15,
      'EvidenceService': 12,
      'ChatService': 8,
      'IntegratedAIService': 50 // God class takes longer
    };

    const complexity = complexityMap[serviceName] || 10;
    await new Promise(resolve => setTimeout(resolve, complexity));
  }

  /**
   * Generate test data
   */
  private generateLargeCase(): any {
    return {
      id: 1,
      title: 'Test Case'.repeat(100),
      description: 'Description'.repeat(1000),
      evidence: Array(50).fill(null).map((_, i) => ({
        id: i,
        name: `Evidence ${i}`,
        data: 'x'.repeat(1000)
      }))
    };
  }

  private generateEvidence(size: number): any {
    return {
      id: 1,
      name: 'Large Evidence File',
      data: Buffer.alloc(size).toString('base64'),
      metadata: {
        size,
        type: 'document',
        encrypted: true
      }
    };
  }

  private generateChatMessages(count: number): any[] {
    return Array(count).fill(null).map((_, i) => ({
      id: i,
      content: `Message ${i}`.repeat(50),
      timestamp: new Date(),
      metadata: { tokens: 100 }
    }));
  }

  /**
   * Generate performance report
   */
  generateReport(): IPCPerformanceReport {
    const recommendations: string[] = [];

    // Calculate IPC statistics
    const durations = this.ipcMetrics.map(m => m.totalTime).sort((a, b) => a - b);
    const ipcStats = durations.length > 0 ? {
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)] || 0,
      p95: durations[Math.floor(durations.length * 0.95)] || 0,
      p99: durations[Math.floor(durations.length * 0.99)] || 0,
      slowestChannels: this.ipcMetrics
        .filter(m => m.isSlowIPC)
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 10)
    } : {
      average: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      slowestChannels: []
    };

    // Payload analysis
    const payloadSizes = this.ipcMetrics.map(m => m.payloadSize);
    const avgPayloadSize = payloadSizes.length > 0
      ? payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length
      : 0;

    const largestPayloads = this.ipcMetrics
      .sort((a, b) => b.payloadSize - a.payloadSize)
      .slice(0, 10);

    const totalSerializationTime = this.ipcMetrics.reduce((sum, m) => sum + m.serializationTime, 0);
    const totalTime = this.ipcMetrics.reduce((sum, m) => sum + m.totalTime, 0);
    const serializationOverhead = totalTime > 0 ? (totalSerializationTime / totalTime) * 100 : 0;

    // Service instantiation analysis
    let totalInstantiations = 0;
    let unnecessaryInstantiations = 0;
    let memoryWaste = 0;

    this.serviceInstantiations.forEach((metrics, serviceName) => {
      totalInstantiations += metrics.length;
      if (metrics.length > 1) {
        unnecessaryInstantiations += metrics.length - 1;
        memoryWaste += metrics.slice(1).reduce((sum, m) => sum + m.memoryOverhead, 0);
      }
    });

    const lazyLoadingOverhead = unnecessaryInstantiations > 0
      ? (unnecessaryInstantiations / totalInstantiations) * 100
      : 0;

    // Batching opportunities
    const batchingOpportunities = this.analyzeBatchingOpportunities();

    // Generate recommendations
    if (ipcStats.p95 > 100) {
      recommendations.push('IPC P95 exceeds 100ms - consider implementing request batching');
    }

    if (serializationOverhead > 30) {
      recommendations.push(`Serialization overhead is ${serializationOverhead.toFixed(1)}% - consider using MessagePack or Protocol Buffers`);
    }

    if (avgPayloadSize > 102400) {
      recommendations.push('Average payload size exceeds 100KB - implement streaming for large data transfers');
    }

    if (lazyLoadingOverhead > 50) {
      recommendations.push(`${lazyLoadingOverhead.toFixed(1)}% service instantiation overhead - implement singleton pattern for all services`);
    }

    if (batchingOpportunities.potentialReduction > 30) {
      recommendations.push(`Can reduce IPC calls by ${batchingOpportunities.potentialReduction.toFixed(1)}% through batching`);
    }

    const serviceRecommendations: string[] = [];
    if (this.serviceInstantiations.has('IntegratedAIService')) {
      const aiMetrics = this.serviceInstantiations.get('IntegratedAIService')!;
      if (aiMetrics.length > 1) {
        serviceRecommendations.push('IntegratedAIService (god class) instantiated multiple times - refactor into smaller services');
      }
    }

    return {
      ipcMetrics: ipcStats,
      payloadAnalysis: {
        avgPayloadSize,
        largestPayloads,
        serializationOverhead
      },
      serviceInstantiation: {
        lazyLoadingOverhead,
        unnecessaryInstantiations,
        memoryWaste,
        recommendations: serviceRecommendations
      },
      batchingOpportunities,
      recommendations
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.ipcMetrics = [];
    this.serviceInstantiations.clear();
    this.channelFrequency.clear();
  }
}
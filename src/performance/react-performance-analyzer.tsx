/**
 * React Performance Analyzer for Justice Companion
 * Tracks component renders, re-renders, and performance metrics
 */

import React, { useEffect, useRef, useState, Profiler, ProfilerOnRenderCallback, memo, useCallback, useMemo } from 'react';

export interface RenderMetric {
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
  unnecessary?: boolean;
}

export interface ComponentPerformance {
  name: string;
  renderCount: number;
  avgRenderTime: number;
  maxRenderTime: number;
  unnecessaryRenders: number;
  lastRenderReason?: string;
}

export interface ReactPerformanceReport {
  totalRenders: number;
  unnecessaryRenders: number;
  slowComponents: ComponentPerformance[];
  frequentRenders: ComponentPerformance[];
  renderWaterfall: RenderMetric[];
  recommendations: string[];
}

/**
 * Performance tracking context
 */
const PerformanceContext = React.createContext<{
  trackRender: (metric: RenderMetric) => void;
  getReport: () => ReactPerformanceReport;
}>({
  trackRender: () => {},
  getReport: () => ({
    totalRenders: 0,
    unnecessaryRenders: 0,
    slowComponents: [],
    frequentRenders: [],
    renderWaterfall: [],
    recommendations: []
  })
});

/**
 * Performance Provider Component
 */
export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const renderMetrics = useRef<Map<string, RenderMetric[]>>(new Map());
  const renderWaterfall = useRef<RenderMetric[]>([]);

  const trackRender = useCallback((metric: RenderMetric) => {
    const componentMetrics = renderMetrics.current.get(metric.componentName) || [];
    componentMetrics.push(metric);
    renderMetrics.current.set(metric.componentName, componentMetrics);
    renderWaterfall.current.push(metric);

    // Detect unnecessary renders
    if (metric.phase === 'update' && metric.actualDuration < 1) {
      metric.unnecessary = true;
    }
  }, []);

  const getReport = useCallback((): ReactPerformanceReport => {
    const componentStats = new Map<string, ComponentPerformance>();

    // Calculate statistics per component
    renderMetrics.current.forEach((metrics, componentName) => {
      const renderTimes = metrics.map(m => m.actualDuration);
      const unnecessaryCount = metrics.filter(m => m.unnecessary).length;

      componentStats.set(componentName, {
        name: componentName,
        renderCount: metrics.length,
        avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
        maxRenderTime: Math.max(...renderTimes),
        unnecessaryRenders: unnecessaryCount
      });
    });

    // Find slow components (avg render > 16ms)
    const slowComponents = Array.from(componentStats.values())
      .filter(stat => stat.avgRenderTime > 16)
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime);

    // Find frequently re-rendering components
    const frequentRenders = Array.from(componentStats.values())
      .filter(stat => stat.renderCount > 10)
      .sort((a, b) => b.renderCount - a.renderCount);

    // Generate recommendations
    const recommendations: string[] = [];

    slowComponents.forEach(component => {
      recommendations.push(`Optimize ${component.name}: avg render time ${component.avgRenderTime.toFixed(2)}ms`);
    });

    frequentRenders.forEach(component => {
      if (component.unnecessaryRenders > component.renderCount * 0.3) {
        recommendations.push(`Add memoization to ${component.name}: ${component.unnecessaryRenders} unnecessary renders`);
      }
    });

    const totalRenders = renderWaterfall.current.length;
    const unnecessaryRenders = renderWaterfall.current.filter(m => m.unnecessary).length;

    if (unnecessaryRenders > totalRenders * 0.2) {
      recommendations.push('High unnecessary render rate - consider using React.memo, useMemo, and useCallback');
    }

    return {
      totalRenders,
      unnecessaryRenders,
      slowComponents: slowComponents.slice(0, 10),
      frequentRenders: frequentRenders.slice(0, 10),
      renderWaterfall: renderWaterfall.current.slice(-100), // Last 100 renders
      recommendations
    };
  }, []);

  return (
    <PerformanceContext.Provider value={{ trackRender, getReport }}>
      {children}
    </PerformanceContext.Provider>
  );
};

/**
 * HOC to track component performance
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || Component.displayName || Component.name || 'Unknown';

  const WrappedComponent: React.FC<P> = (props) => {
    const context = React.useContext(PerformanceContext);

    const onRender: ProfilerOnRenderCallback = (
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions
    ) => {
      context.trackRender({
        componentName: id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions
      });
    };

    return (
      <Profiler id={displayName} onRender={onRender}>
        <Component {...props} />
      </Profiler>
    );
  };

  WrappedComponent.displayName = `withPerformanceTracking(${displayName})`;
  return WrappedComponent;
}

/**
 * Hook to track why component re-rendered
 */
export function useWhyDidYouRender(componentName: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current) {
      const changedProps = Object.entries(props).filter(([key, val]) =>
        previousProps.current![key] !== val
      );

      if (changedProps.length > 0) {
        console.log(`[${componentName}] Re-rendered due to prop changes:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Performance Dashboard Component
 */
export const PerformanceDashboard: React.FC = memo(() => {
  const context = React.useContext(PerformanceContext);
  const [report, setReport] = useState<ReactPerformanceReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update report every 2 seconds
    const interval = setInterval(() => {
      setReport(context.getReport());
    }, 2000);

    return () => clearInterval(interval);
  }, [context]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        Show Performance
      </button>
    );
  }

  if (!report) {
    return null;
  }

  const renderRate = report.totalRenders > 0
    ? ((report.unnecessaryRenders / report.totalRenders) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 400,
      maxHeight: 600,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: 20,
      borderRadius: 10,
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: 12,
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: 20
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div>Total Renders: {report.totalRenders}</div>
        <div>Unnecessary: {report.unnecessaryRenders} ({renderRate}%)</div>
      </div>

      {report.slowComponents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4>Slow Components</h4>
          {report.slowComponents.map(comp => (
            <div key={comp.name} style={{ marginBottom: 5 }}>
              {comp.name}: {comp.avgRenderTime.toFixed(2)}ms avg
            </div>
          ))}
        </div>
      )}

      {report.frequentRenders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4>Frequent Renders</h4>
          {report.frequentRenders.map(comp => (
            <div key={comp.name} style={{ marginBottom: 5 }}>
              {comp.name}: {comp.renderCount} renders
              {comp.unnecessaryRenders > 0 && ` (${comp.unnecessaryRenders} unnecessary)`}
            </div>
          ))}
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div>
          <h4>Recommendations</h4>
          {report.recommendations.map((rec, i) => (
            <div key={i} style={{ marginBottom: 5 }}>
              • {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

/**
 * Virtual list component for large datasets
 */
export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => setScrollTop(container.scrollTop);
    const handleResize = () => setContainerHeight(container.clientHeight);

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  const visibleItems = useMemo(
    () => items.slice(visibleRange.startIndex, visibleRange.endIndex),
    [items, visibleRange]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Export performance utilities
 */
export const ReactPerformance = {
  Provider: PerformanceProvider,
  withTracking: withPerformanceTracking,
  useWhyRender: useWhyDidYouRender,
  Dashboard: PerformanceDashboard,
  VirtualList
};
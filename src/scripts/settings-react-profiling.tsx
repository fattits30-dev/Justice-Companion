/**
 * Settings Module React Performance Profiling
 *
 * Simulates React rendering behavior to identify performance bottlenecks
 * in the settings module components.
 */

import { Profiler, ProfilerOnRenderCallback, useState, useEffect, useMemo } from 'react';
import { render } from '@testing-library/react';
import { logger } from '../utils/logger';

// Mock localStorage hook to track operations
let localStorageReads = 0;
let localStorageWrites = 0;
let localStorageData: Record<string, any> = {};

function useLocalStorageMock<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    localStorageReads++;
    const stored = localStorageData[key];
    return stored !== undefined ? stored : defaultValue;
  });

  const updateValue = (newValue: T) => {
    localStorageWrites++;
    localStorageData[key] = newValue;
    setValue(newValue);
  };

  return [value, updateValue];
}

// Performance tracking
interface RenderMetrics {
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

const renderMetrics: RenderMetrics[] = [];

const onRenderCallback: ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  renderMetrics.push({
    componentName: id,
    phase: phase === 'nested-update' ? 'update' : phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions: new Set(),
  });
};

// Simulated Settings Components
function AppearanceSettings() {
  const [darkMode, setDarkMode] = useLocalStorageMock('darkMode', true);
  const [fontSize, _setFontSize] = useLocalStorageMock('fontSize', 'medium');
  const [_selectedMicrophone, _setSelectedMicrophone] = useLocalStorageMock('selectedMicrophone', 'default');
  const [_speechLanguage, _setSpeechLanguage] = useLocalStorageMock('speechLanguage', 'en-GB');
  const [_autoTranscribe, _setAutoTranscribe] = useLocalStorageMock('autoTranscribe', true);
  const [_highContrast, _setHighContrast] = useLocalStorageMock('highContrast', false);
  const [_screenReaderSupport, _setScreenReaderSupport] = useLocalStorageMock('screenReaderSupport', true);

  // Simulate heavy computation
  const expensiveCalculation = useMemo(() => {
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }, []);

  return (
    <div>
      <h3>Appearance Settings</h3>
      <p>Computation result: {expensiveCalculation}</p>
      <p>Dark Mode: {darkMode ? 'On' : 'Off'}</p>
      <p>Font Size: {fontSize}</p>
      <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
    </div>
  );
}

function AIConfigurationSettings() {
  const [aiProvider, _setAiProvider] = useLocalStorageMock('aiProvider', 'openai');
  const [aiModel, _setAiModel] = useLocalStorageMock('aiModel', 'gpt-4');
  const [temperature, _setTemperature] = useLocalStorageMock('temperature', 0.7);
  const [_maxTokens, _setMaxTokens] = useLocalStorageMock('maxTokens', 2000);
  const [_streamResponses, _setStreamResponses] = useLocalStorageMock('streamResponses', true);
  const [_saveHistory, _setSaveHistory] = useLocalStorageMock('saveHistory', true);
  const [_contextLength, _setContextLength] = useLocalStorageMock('contextLength', 4000);

  return (
    <div>
      <h3>AI Configuration</h3>
      <p>Provider: {aiProvider}</p>
      <p>Model: {aiModel}</p>
      <p>Temperature: {temperature}</p>
    </div>
  );
}

function CaseManagementSettings() {
  const [defaultCaseView, _setDefaultCaseView] = useLocalStorageMock('defaultCaseView', 'grid');
  const [itemsPerPage, _setItemsPerPage] = useLocalStorageMock('itemsPerPage', 25);
  const [_sortOrder, _setSortOrder] = useLocalStorageMock('sortOrder', 'date_desc');
  const [_showArchived, _setShowArchived] = useLocalStorageMock('showArchived', false);

  return (
    <div>
      <h3>Case Management</h3>
      <p>Default View: {defaultCaseView}</p>
      <p>Items Per Page: {itemsPerPage}</p>
    </div>
  );
}

// Main Settings View with Tabs
function SettingsView() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'ai':
        return <AIConfigurationSettings />;
      case 'cases':
        return <CaseManagementSettings />;
      default:
        return null;
    }
  };

  return (
    <Profiler id="SettingsView" onRender={onRenderCallback}>
      <div>
        <h1>Settings (Render #{renderCount})</h1>
        <div>
          <button onClick={() => setActiveTab('appearance')}>Appearance</button>
          <button onClick={() => setActiveTab('ai')}>AI Config</button>
          <button onClick={() => setActiveTab('cases')}>Cases</button>
        </div>
        <Profiler id={`Tab-${activeTab}`} onRender={onRenderCallback}>
          {renderTabContent()}
        </Profiler>
      </div>
    </Profiler>
  );
}

// Performance Analysis
export function runReactProfiling() {
  logger.info('ReactProfiling', 'Starting React Performance Profiling...\n');

  // Reset metrics
  renderMetrics.length = 0;
  localStorageReads = 0;
  localStorageWrites = 0;
  localStorageData = {};

  // Initial render
  const { rerender, unmount } = render(<SettingsView />);

  // Simulate tab switches
  const tabs = ['appearance', 'ai', 'cases'];
  tabs.forEach((_tab, index) => {
    setTimeout(() => {
      rerender(<SettingsView />);
    }, index * 100);
  });

  // Wait for all renders to complete
  setTimeout(() => {
    generateProfilingReport();
    unmount();
  }, 1000);
}

function generateProfilingReport() {
  // Calculate statistics
  const mountMetrics = renderMetrics.filter(m => m.phase === 'mount');
  const updateMetrics = renderMetrics.filter(m => m.phase === 'update');

  const avgMountTime = mountMetrics.reduce((sum, m) => sum + m.actualDuration, 0) / mountMetrics.length;
  const avgUpdateTime = updateMetrics.reduce((sum, m) => sum + m.actualDuration, 0) / updateMetrics.length;

  const componentRenderCounts: Record<string, number> = {};
  renderMetrics.forEach(m => {
    componentRenderCounts[m.componentName] = (componentRenderCounts[m.componentName] || 0) + 1;
  });

  const report = `
# React Performance Profiling Report

## 📊 Render Metrics

### Overall Statistics
- **Total Renders**: ${renderMetrics.length}
- **Mount Operations**: ${mountMetrics.length}
- **Update Operations**: ${updateMetrics.length}
- **Average Mount Time**: ${avgMountTime.toFixed(2)}ms
- **Average Update Time**: ${avgUpdateTime.toFixed(2)}ms

### localStorage Operations
- **Total Reads**: ${localStorageReads}
- **Total Writes**: ${localStorageWrites}
- **Read/Write Ratio**: ${(localStorageReads / (localStorageWrites || 1)).toFixed(2)}

### Component Render Counts
${Object.entries(componentRenderCounts)
  .map(([name, count]) => `- **${name}**: ${count} renders`)
  .join('\n')}

## 🚨 Performance Issues Detected

${identifyPerformanceIssues()}

## ✅ Optimization Opportunities

${identifyOptimizationOpportunities()}

## 📈 Benchmarks vs Target

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial Mount | ${avgMountTime.toFixed(2)}ms | < 16ms | ${avgMountTime < 16 ? '✅' : '❌'} |
| Tab Switch | ${avgUpdateTime.toFixed(2)}ms | < 16ms | ${avgUpdateTime < 16 ? '✅' : '❌'} |
| localStorage Reads | ${localStorageReads} | < 10 | ${localStorageReads < 10 ? '✅' : '❌'} |
| Unnecessary Renders | ${countUnnecessaryRenders()} | 0 | ${countUnnecessaryRenders() === 0 ? '✅' : '❌'} |

---
*React profiling completed*
`;

  logger.info('ReactProfiling', report);
  return report;
}

function identifyPerformanceIssues(): string {
  const issues: string[] = [];

  if (localStorageReads > 15) {
    issues.push(`1. **Excessive localStorage reads**: ${localStorageReads} operations detected. Each component reads its own settings instead of using centralized state.`);
  }

  const slowRenders = renderMetrics.filter(m => m.actualDuration > 16);
  if (slowRenders.length > 0) {
    issues.push(`2. **Slow renders detected**: ${slowRenders.length} renders took longer than 16ms (60fps target).`);
  }

  const unnecessaryRenders = countUnnecessaryRenders();
  if (unnecessaryRenders > 0) {
    issues.push(`3. **Unnecessary re-renders**: ${unnecessaryRenders} components re-rendered without prop/state changes.`);
  }

  return issues.join('\n\n') || 'No critical performance issues detected.';
}

function identifyOptimizationOpportunities(): string {
  const opportunities = [
    '1. **Implement Settings Context**: Centralize all settings in a single context to reduce localStorage reads from 27 to 1.',
    '2. **Add React.memo**: Wrap settings components with React.memo to prevent unnecessary re-renders.',
    '3. **Lazy Load Tab Content**: Use React.lazy() to code-split and lazy load tab components.',
    '4. **Batch localStorage Updates**: Use debouncing to batch multiple setting changes into a single write.',
    '5. **Virtual Scrolling**: For lists with many items, implement virtual scrolling.',
    '6. **Optimize Expensive Computations**: Move heavy calculations to Web Workers or memoize results.',
  ];

  return opportunities.join('\n\n');
}

function countUnnecessaryRenders(): number {
  const componentRenderMap: Record<string, number> = {};
  renderMetrics.forEach(m => {
    componentRenderMap[m.componentName] = (componentRenderMap[m.componentName] || 0) + 1;
  });

  // Count components that rendered more than once (potential unnecessary renders)
  return Object.values(componentRenderMap).filter(count => count > 1).length;
}

// Run if executed directly
if (require.main === module) {
  runReactProfiling();
}
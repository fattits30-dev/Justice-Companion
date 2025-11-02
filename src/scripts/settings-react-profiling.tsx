/**
 * Settings Module React Performance Profiling
 *
 * Simulates React rendering behavior to identify performance bottlenecks
 * in the settings module components.
 */

import { ProfilerOnRenderCallback, useState, useMemo } from 'react';
import type React from 'react';

// Mock localStorage hook to track operations
const localStorageData: Record<string, any> = {};

function useLocalStorageMock<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorageData[key];
    return stored !== undefined ? stored : defaultValue;
  });

  const updateValue = (newValue: T) => {
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
  const [_fontSize, _setFontSize] = useLocalStorageMock('fontSize', 'medium');
  const [_selectedMicrophone, _setSelectedMicrophone] = useLocalStorageMock('selectedMicrophone', 'default');
  const [_speechLanguage, _setSpeechLanguage] = useLocalStorageMock('speechLanguage', 'en-GB');
  const [_autoTranscribe, _setAutoTranscribe] = useLocalStorageMock('autoTranscribe', true);
  const [_highContrast, _setHighContrast] = useLocalStorageMock('highContrast', false);
  const [_screenReaderSupport, _setScreenReaderSupport] = useLocalStorageMock('screenReaderSupport', true);

  // Simulate heavy computation
  const expensiveCalculation = useMemo(() => {
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      result += i;
    }
    return result;
  }, []);

  return (
    <div>
      <h2>Appearance Settings</h2>
      <label>
        Dark Mode:
        <input
          type="checkbox"
          checked={darkMode}
          onChange={(e) => setDarkMode(e.target.checked)}
        />
      </label>
      <p>Expensive calculation result: {expensiveCalculation}</p>
    </div>
  );
}

// Mock Profiler component for testing
function MockProfiler({ children }: { children: React.ReactNode; id: string; onRender: ProfilerOnRenderCallback }) {
  return <>{children}</>;
}

// Mock render function for testing
function mockRender(_component: React.ReactElement) {
  return { container: document.createElement('div') };
}

export { AppearanceSettings, MockProfiler as Profiler, mockRender as render, onRenderCallback, renderMetrics };
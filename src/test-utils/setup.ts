/**
 * Vitest Setup File
 *
 * This file runs before all test files.
 * Used to configure testing environment and add custom matchers.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress console errors in tests (optional - remove if you want to see them)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = jest.fn();
// });
// afterAll(() => {
//   console.error = originalError;
// });

// Mock window.matchMedia (used by some components for responsive behavior)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (used by some UI libraries)
class IntersectionObserverMock {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(_callback: unknown, _options?: unknown) {}

  disconnect(): void {}

  observe(): void {}

  takeRecords(): unknown[] {
    return [];
  }

  unobserve(): void {}
}

global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Mock ResizeObserver (used by some UI libraries)
class ResizeObserverMock {
  constructor(_callback: unknown) {}

  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

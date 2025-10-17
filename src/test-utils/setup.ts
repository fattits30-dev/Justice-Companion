/**
 * Vitest Setup File
 *
 * This file runs before all test files.
 * Used to configure testing environment and add custom matchers.
 */

import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Suppress console errors in tests (optional - remove if you want to see them)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = jest.fn();
// });
// afterAll(() => {
//   console.error = originalError;
// });

// Mock window.matchMedia (used by some components for responsive behavior and framer-motion)
// Using beforeEach to ensure mock persists after Vitest's mockReset between tests
beforeEach(() => {
  // Only mock in jsdom environment (not in node environment)
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: false, // Default to no reduced motion and no media query matches
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated but required by framer-motion
        removeListener: vi.fn(), // Deprecated but required by framer-motion
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
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

/**
 * Test Utilities for Component Testing
 *
 * This file provides custom render functions and utilities
 * for testing React components with React Testing Library.
 *
 * Key Features:
 * - Custom render function with providers
 * - Re-export all RTL utilities for convenience
 * - Mock IPC API for testing Electron interactions
 *
 * Usage:
 * import { render, screen, userEvent } from '@/test-utils/test-utils';
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

/**
 * All Providers Component
 *
 * Wraps components with necessary providers for testing:
 * - BrowserRouter (for components using react-router hooks)
 * - Add other providers here as needed (ThemeProvider, QueryClientProvider, etc.)
 */
function AllTheProviders({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Custom Render Function
 *
 * Renders a React component with all necessary providers.
 *
 * @param ui - React element to render
 * @param options - Additional render options
 * @returns RTL render result
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override render method with custom render
export { customRender as render };

/**
 * Mock Electron IPC API
 *
 * Use this in tests that need to mock IPC communication.
 *
 * Example:
 * beforeEach(() => {
 *   window.justiceAPI = createMockJusticeAPI({
 *     getCases: vi.fn().mockResolvedValue([{ id: 1, title: 'Test Case' }]),
 *   });
 * });
 */
export function createMockJusticeAPI(overrides: Partial<any> = {}) {
  return {
    // Case operations
    createCase: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    getCases: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getCase: vi.fn().mockResolvedValue({ success: true, data: null }),
    updateCase: vi.fn().mockResolvedValue({ success: true }),
    deleteCase: vi.fn().mockResolvedValue({ success: true }),

    // Evidence operations
    createEvidence: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    getEvidence: vi.fn().mockResolvedValue({ success: true, data: [] }),
    updateEvidence: vi.fn().mockResolvedValue({ success: true }),
    deleteEvidence: vi.fn().mockResolvedValue({ success: true }),

    // AI operations
    askQuestion: vi.fn().mockResolvedValue({ success: true, data: { answer: 'Test answer' } }),

    // Override with custom implementations
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 *
 * Useful for waiting for async state updates.
 *
 * @param callback - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 3000)
 * @returns Promise that resolves when condition is met
 */
export async function waitFor(callback: () => boolean, timeout = 3000): Promise<void> {
  const startTime = Date.now();
  while (!callback()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Create a mock file for file upload testing
 *
 * @param name - File name
 * @param content - File content
 * @param type - MIME type
 * @returns File object
 */
export function createMockFile(name: string, content: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

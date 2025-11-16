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

import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import type { JusticeCompanionAPI } from "@/types/ipc";
import { AuthProvider } from "@/contexts/AuthContext";

/**
 * All Providers Component
 *
 * Wraps components with necessary providers for testing:
 * - BrowserRouter (for components using react-router hooks)
 * - AuthProvider (for components using useAuth hook) - conditionally included
 * - Add other providers here as needed (ThemeProvider, QueryClientProvider, etc.)
 *
 * Note: Tests should mock window.justiceAPI.getSession in their beforeEach
 */
function AllTheProviders({
  children,
  includeAuth = true,
}: {
  children: ReactNode;
  includeAuth?: boolean;
}) {
  const content = includeAuth ? (
    <AuthProvider>{children}</AuthProvider>
  ) : (
    <>{children}</>
  );

  return <BrowserRouter>{content}</BrowserRouter>;
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
const customRender = (
  ui: ReactElement<any>,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export specific items from React Testing Library (excluding render to avoid conflict)
export {
  screen,
  waitFor, // RTL's waitFor (keep this, remove custom one below)
  within,
  fireEvent,
  act,
  renderHook,
  cleanup,
  getByRole,
  getByLabelText,
  getByPlaceholderText,
  getByText,
  getByDisplayValue,
  getByAltText,
  getByTitle,
  getByTestId,
  queryByRole,
  queryByLabelText,
  queryByPlaceholderText,
  queryByText,
  queryByDisplayValue,
  queryByAltText,
  queryByTitle,
  queryByTestId,
} from "@testing-library/react";

export { default as userEvent } from "@testing-library/user-event";

// Export custom render as render (replaces RTL's render)
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
export function createMockJusticeAPI(
  overrides: Partial<JusticeCompanionAPI> = {},
): JusticeCompanionAPI {
  const baseApi: Partial<JusticeCompanionAPI> = {
    // Case operations
    createCase: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    getAllCases: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getCaseById: vi.fn().mockResolvedValue({ success: true, data: null }),
    updateCase: vi.fn().mockResolvedValue({ success: true }),
    deleteCase: vi.fn().mockResolvedValue({ success: true }),

    // Evidence operations
    createEvidence: vi
      .fn()
      .mockResolvedValue({ success: true, data: { id: 1 } }),
    getAllEvidence: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getEvidenceById: vi.fn().mockResolvedValue({ success: true, data: null }),
    getEvidenceByCaseId: vi.fn().mockResolvedValue({ success: true, data: [] }),
    updateEvidence: vi.fn().mockResolvedValue({ success: true }),
    deleteEvidence: vi.fn().mockResolvedValue({ success: true }),

    // AI operations
    checkAIStatus: vi
      .fn()
      .mockResolvedValue({ success: true, connected: true }),
    aiChat: vi.fn().mockResolvedValue({
      success: true,
      message: { role: "assistant", content: "Test response" },
    }),

    // Override with custom implementations
  };

  return {
    ...baseApi,
    ...overrides,
  } as JusticeCompanionAPI;
}

/**
 * Wait for a condition to be true
 *
 * Useful for waiting for async state updates.
 * Renamed to avoid conflict with RTL's waitFor
 *
 * @param callback - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 3000)
 * @returns Promise that resolves when condition is met
 */
export async function waitForCondition(
  callback: () => boolean,
  timeout = 3000,
): Promise<void> {
  const startTime = Date.now();
  while (!callback()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
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
export function createMockFile(
  name: string,
  content: string,
  type: string,
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

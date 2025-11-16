/**
 * Vitest setup file
 * Configures testing environment and imports testing library extensions
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Extend Vitest matchers with Testing Library matchers
// This provides matchers like toBeInTheDocument(), toHaveTextContent(), etc.

// Mock window.matchMedia (not implemented in JSDOM)
// Only mock if window exists (some tests run in Node.js environment without DOM)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

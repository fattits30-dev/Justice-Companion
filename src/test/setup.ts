// Vitest test setup file
import * as matchers from "@testing-library/jest-dom/matchers";
import { vi } from "vitest";

// Extend the global expect with jest-dom matchers
expect.extend(matchers);

// Note: React Testing Library 16+ automatically cleans up after each test
// No manual afterEach cleanup needed!

// Mock localStorage if not available
if (typeof localStorage === "undefined") {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  (globalThis as any).localStorage = localStorageMock;
}

// Mock sessionStorage if not available
if (typeof sessionStorage === "undefined") {
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  (globalThis as any).sessionStorage = sessionStorageMock;
}

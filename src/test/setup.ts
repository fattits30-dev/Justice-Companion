/**
 * Vitest setup file
 * Configures testing environment and imports testing library extensions
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Extend Vitest matchers with Testing Library matchers
// This provides matchers like toBeInTheDocument(), toHaveTextContent(), etc.

// PERFORMANCE OPTIMIZATION: Mock heavy AI services to avoid real API calls in tests
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Mocked AI response" }],
      }),
    },
  })),
  Anthropic: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Mocked AI response" }],
      }),
    },
  })),
}));

vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: { role: "assistant", content: "Mocked AI response" },
            },
          ],
        }),
      },
    },
  })),
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: { role: "assistant", content: "Mocked AI response" },
            },
          ],
        }),
      },
    },
  })),
}));

vi.mock("@huggingface/inference", () => ({
  HfInference: vi.fn(() => ({
    textGeneration: vi.fn().mockResolvedValue({
      generated_text: "Mocked AI response",
    }),
  })),
}));

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

  // Mock localStorage if it doesn't exist
  if (!window.localStorage) {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
    });
  }
}

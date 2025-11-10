/**
 * Test Setup - Global Test Configuration
 *
 * This file runs before all tests to:
 * - Configure Vitest + React Testing Library
 * - Mock window.justiceAPI (Electron IPC bridge)
 * - Setup global test utilities
 */

import { beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { createRequire } from "module";
import path from "path";
import { existsSync } from "fs";
import { execFileSync } from "child_process";

const require = createRequire(import.meta.url);

const PNPM_COMMAND = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const getBetterSqlite3BindingPath = (): string | null => {
  try {
    const packageRoot = path.dirname(
      require.resolve("better-sqlite3/package.json")
    );
    return path.join(packageRoot, "build", "Release", "better_sqlite3.node");
  } catch {
    return null;
  }
};

const hasBetterSqlite3Binding = (): boolean => {
  const bindingPath = getBetterSqlite3BindingPath();
  return Boolean(bindingPath && existsSync(bindingPath));
};

const rebuildBetterSqlite3 = (): void => {
  try {
    execFileSync(PNPM_COMMAND, ["rebuild:node"], { stdio: "inherit" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to rebuild better-sqlite3 native module: ${message}`
    );
  }
};

const attemptLoadBetterSqlite3 = (): void => {
  try {
    require("better-sqlite3");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Could not locate the bindings file")
    ) {
      rebuildBetterSqlite3();
      return;
    }

    throw error;
  }
};

const ensureBetterSqlite3Binding = (): void => {
  if (hasBetterSqlite3Binding()) {
    return;
  }

  attemptLoadBetterSqlite3();

  if (hasBetterSqlite3Binding()) {
    return;
  }

  rebuildBetterSqlite3();

  if (!hasBetterSqlite3Binding()) {
    const bindingPath = getBetterSqlite3BindingPath() ?? "<unresolved>";
    throw new Error(
      `better-sqlite3 native module is not available for the test environment (path: ${bindingPath})`
    );
  }
};

ensureBetterSqlite3Binding();

type ViMock = ReturnType<typeof vi.fn>;
type WindowJusticeAPI = Window extends { justiceAPI: infer T }
  ? T
  : Record<string, unknown>;

interface LocalStorageMock {
  getItem: ViMock;
  setItem: ViMock;
  removeItem: ViMock;
  clear: ViMock;
  length: number;
  key: ViMock;
}

interface ClipboardMock {
  writeText: ReturnType<typeof vi.fn>;
  readText: ReturnType<typeof vi.fn>;
}

const createLocalStorageMock = (): LocalStorageMock => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
};

const createClipboardMock = (): ClipboardMock => ({
  writeText: vi.fn(() => Promise.resolve()),
  readText: vi.fn(() => Promise.resolve("")),
});

const createJusticeAPIMock = (): Record<string, unknown> => ({
  // Auth
  login: vi.fn().mockResolvedValue({
    success: true,
    data: {
      user: { id: "1", username: "testuser", email: "test@example.com" },
      session: {
        sessionId: "test-session-id",
        expiresAt: new Date(Date.now() + 86400000),
      },
    },
  }),
  register: vi.fn().mockResolvedValue({
    success: true,
    data: {
      user: { id: "1", username: "testuser", email: "test@example.com" },
    },
  }),
  logout: vi.fn().mockResolvedValue({ success: true }),
  getSession: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 1,
      sessionId: "test-session-id",
      user: { id: "1", username: "testuser", email: "test@example.com" },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  }),

  // Cases
  createCase: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "1", title: "Test Case", status: "open" },
  }),
  getAllCases: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  getCases: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  getCase: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "1", title: "Test Case", status: "open" },
  }),
  updateCase: vi.fn().mockResolvedValue({ success: true }),
  deleteCase: vi.fn().mockResolvedValue({ success: true }),
  getAllEvidence: vi.fn().mockResolvedValue({ success: true, data: [] }),
  uploadFile: vi.fn().mockResolvedValue({ success: true, data: { id: "1" } }),
  deleteEvidence: vi.fn().mockResolvedValue({ success: true }),

  // Deadlines
  getDeadlines: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createDeadline: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 1 },
  }),
  updateDeadline: vi.fn().mockResolvedValue({ success: true }),
  deleteDeadline: vi.fn().mockResolvedValue({ success: true }),

  // Chat
  chatSend: vi.fn().mockResolvedValue({
    success: true,
    data: { response: "AI response text" },
  }),
  onAIStreamToken: vi.fn().mockReturnValue(() => {}),
  onAIStreamThinkToken: vi.fn().mockReturnValue(() => {}),
  onAIStreamSources: vi.fn().mockReturnValue(() => {}),

  // AI Configuration
  configureAI: vi.fn().mockResolvedValue({ success: true }),
  testAIConnection: vi.fn().mockResolvedValue({
    success: true,
    connected: true,
    message: "Connected successfully",
  }),

  // Evidence/Documents
  createEvidence: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "1", fileName: "test.pdf" },
  }),
  getEvidenceById: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "1", fileName: "test.pdf" },
  }),

  // Notes
  createNote: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "1", content: "Test note" },
  }),

  // GDPR
  exportUserData: vi.fn().mockResolvedValue({
    success: true,
    data: { exportPath: "/path/to/export.json" },
  }),
  deleteUserData: vi.fn().mockResolvedValue({ success: true }),

  // Consent
  grantConsent: vi.fn().mockResolvedValue({ success: true }),
  getUserConsents: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),

  // SecureStorage (flat helpers used by SettingsView)
  secureStorageSet: vi.fn().mockResolvedValue({ success: true }),
  secureStorageGet: vi.fn().mockResolvedValue({ success: true, data: null }),
  secureStorageDelete: vi.fn().mockResolvedValue({ success: true }),
  secureStorageHas: vi.fn().mockResolvedValue({ success: true, data: false }),
  // SecureStorage (nested)
  secureStorage: {
    isEncryptionAvailable: vi.fn().mockResolvedValue(true),
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue("encrypted-value"),
    delete: vi.fn().mockResolvedValue(true),
    clearAll: vi.fn().mockResolvedValue(true),
  },

  // UI
  logUIError: vi.fn().mockResolvedValue({ success: true }),

  // Database
  runMigrations: vi.fn().mockResolvedValue({ success: true }),
  backupDatabase: vi.fn().mockResolvedValue({ success: true }),
  getDatabaseStatus: vi.fn().mockResolvedValue({
    success: true,
    data: { connected: true, version: "1.0.0" },
  }),

  // Placeholder methods (return not implemented)
  changePassword: vi.fn().mockRejectedValue(new Error("Not implemented")),
  checkAIStatus: vi.fn().mockResolvedValue({
    success: true,
    connected: false,
    data: { message: "AI service integration pending" },
  }),
  deleteConversation: vi.fn().mockRejectedValue(new Error("Not implemented")),
  downloadFile: vi.fn().mockRejectedValue(new Error("Not implemented")),
  getAllConversations: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  getCaseFacts: vi.fn().mockRejectedValue(new Error("Not implemented")),
  getCasesByStatusPaginated: vi
    .fn()
    .mockRejectedValue(new Error("Not implemented")),
  getCasesByUserPaginated: vi
    .fn()
    .mockRejectedValue(new Error("Not implemented")),
  getCaseStatistics: vi.fn().mockRejectedValue(new Error("Not implemented")),
  getFacts: vi.fn().mockRejectedValue(new Error("Not implemented")),
  getRecentConversations: vi
    .fn()
    .mockRejectedValue(new Error("Not implemented")),
  getUserProfile: vi.fn().mockResolvedValue({
    success: true,
    data: null,
  }),
  onAIStatusUpdate: vi.fn().mockReturnValue(() => {}),
  printFile: vi.fn().mockRejectedValue(new Error("Not implemented")),
  revokeConsent: vi.fn().mockRejectedValue(new Error("Not implemented")),
});

// CRITICAL: DO NOT replace window/navigator - jsdom provides DOM constructors (HTMLElement, etc.)
// Instead, EXTEND the existing window object with our mocks

// Extend jsdom window with our mocks (only if window exists - service tests don't need DOM)
if (typeof window !== 'undefined') {
  Object.assign(window, {
    localStorage: createLocalStorageMock(),
    justiceAPI: createJusticeAPIMock() as unknown as WindowJusticeAPI,
  });

  // Extend jsdom navigator with clipboard mock (clipboard is read-only getter, use defineProperty)
  // Only if navigator exists (jsdom provides it, Node doesn't)
  if (typeof window.navigator !== 'undefined' && window.navigator) {
    Object.defineProperty(window.navigator, "clipboard", {
      value: createClipboardMock(),
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Cleanup after each test - React 18 concurrent rendering support
 *
 * NOTE: @testing-library/react@16.3+ automatically cleans up after each test.
 * No manual cleanup or afterEach hooks are needed.
 * Any interference with React's cleanup causes "Should not already be working" errors.
 */

/**
 * Mock window.justiceAPI (Electron IPC bridge)
 * All methods return resolved promises by default
 */
beforeEach(() => {
  // Save original console.error before mocking to prevent infinite recursion
  const originalConsoleError = console.error;

  // Mock console methods to avoid test output pollution
  vi.spyOn(console, "error").mockImplementation((message, ...args) => {
    // Only suppress React's internal concurrent work messages
    if (
      message.includes("ReactDOM.render") ||
      message.includes("performConcurrentWorkOnRoot")
    ) {
      return;
    }
    // Use original console.error to avoid infinite recursion
    originalConsoleError(message, ...args);
  });

  // CRITICAL: EXTEND jsdom window, don't replace it (preserves HTMLElement, Document, etc.)
  // Only if window exists - service tests don't need DOM
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      localStorage: createLocalStorageMock(),
      justiceAPI: createJusticeAPIMock() as unknown as WindowJusticeAPI,
    });

    // CRITICAL: EXTEND jsdom navigator with clipboard mock (clipboard is read-only getter, use defineProperty)
    // Only if navigator exists (jsdom provides it, Node doesn't)
    if (typeof window.navigator !== 'undefined' && window.navigator) {
      Object.defineProperty(window.navigator, "clipboard", {
        value: createClipboardMock(),
        writable: true,
        configurable: true,
      });
    }
  }
});

/**
 * Global test utilities
 */
export const mockUser = {
  id: "1",
  username: "testuser",
  email: "test@example.com",
};

export const mockSession = {
  sessionId: "test-session-id",
  userId: "1",
  expiresAt: new Date(Date.now() + 86400000),
};

export const mockCase = {
  id: "1",
  userId: "1",
  title: "Test Case",
  type: "criminal",
  status: "open" as const,
  description: "Test case description",
  createdAt: new Date(),
  updatedAt: new Date(),
};

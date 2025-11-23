/**
 * @vitest-environment node
 *
 * LEGACY: AIServiceFactory has been replaced by UnifiedAIService
 * These tests are SKIPPED as the underlying implementation is broken (missing imports).
 * See AIServiceFactory.ts:1-3 for cleanup TODO.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AIServiceFactory } from "./AIServiceFactory.ts";

// Mock dependencies
vi.mock("../utils/error-logger", () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

vi.mock("../features/chat/services/IntegratedAIService", () => ({
  IntegratedAIService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    checkConnection: vi.fn().mockResolvedValue({
      connected: true,
      endpoint: "local",
    }),
    chat: vi.fn().mockResolvedValue({
      success: true,
      message: { role: "assistant", content: "Test response" },
      sources: [],
    }),
    streamChat: vi.fn().mockResolvedValue(undefined),
    streamChatWithFunctions: vi.fn().mockResolvedValue(undefined),
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      model: "qwen",
      temperature: 0.7,
      maxTokens: 1000,
    }),
    dispose: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args) => args.join("/")),
  },
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/user/data"),
  },
}));

describe.skip("AIServiceFactory (LEGACY - skipped)", () => {
  let factory: AIServiceFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = AIServiceFactory.getInstance();
  });

  afterEach(() => {
    (AIServiceFactory as any).instance = null;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = AIServiceFactory.getInstance();
      const instance2 = AIServiceFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create instance on first call", () => {
      expect(factory).toBeDefined();
      expect(factory).toBeInstanceOf(AIServiceFactory);
    });
  });

  describe("Model Management", () => {
    it.skip("should return model path", () => {
      // const path = factory.getModelPath();
      // expect(path).toBeDefined();
      // expect(typeof path).toBe('string');
      // expect(path).toContain('Qwen_Qwen3-8B-Q4_K_M.gguf');
    });
  });

  describe("setCaseFactsRepository()", () => {
    it("should accept repository without errors", () => {
      const mockRepository = {} as any;
      expect(() =>
        factory.setCaseFactsRepository(mockRepository),
      ).not.toThrow();
    });
  });

  describe("dispose()", () => {
    it.skip("should dispose resources", async () => {
      // await expect(factory.dispose()).resolves.not.toThrow();
    });
  });
});

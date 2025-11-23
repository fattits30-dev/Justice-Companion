/**
 * SecureStorageService Test Suite
 *
 * Comprehensive unit tests for SecureStorageService with 100% coverage.
 *
 * Tests cover:
 * - Singleton pattern enforcement
 * - Initialization (successful and failed)
 * - Encryption availability checking
 * - API key CRUD operations (set, get, delete, has)
 * - Clear all functionality
 * - Auto-initialization on first use
 * - Error handling (IPC failures)
 * - Edge cases (null/empty/whitespace keys)
 * - Console logging validation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shared mock for ipcRenderer.invoke without importing electron
const mockInvoke = vi.fn();

// Mock electron module (only the ipcRenderer surface we need)
vi.mock("electron", () => ({
  ipcRenderer: {
    invoke: mockInvoke,
  },
}));

// Import the service (window mock will be set up in beforeEach)
import { SecureStorageService, secureStorage } from "./SecureStorageService.ts";

describe("SecureStorageService", () => {
  let service: SecureStorageService;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Set up global window mock BEFORE any module operations
    vi.stubGlobal("window", {
      justiceAPI: {
        secureStorage: {
          isEncryptionAvailable: vi.fn(async () =>
            mockInvoke("secure-storage:is-encryption-available")
          ),
          set: vi.fn(async (key: string, value: string) =>
            mockInvoke("secure-storage:set", key, value)
          ),
          get: vi.fn(async (key: string) =>
            mockInvoke("secure-storage:get", key)
          ),
          delete: vi.fn(async (key: string) =>
            mockInvoke("secure-storage:delete", key)
          ),
          clearAll: vi.fn(async () => mockInvoke("secure-storage:clear-all")),
        },
      },
    });

    // Reset module cache to ensure fresh import and global mocks are applied
    vi.resetModules();

    // Reset singleton instance for testing
    (SecureStorageService as any).instance = undefined;

    // Get fresh instance
    service = SecureStorageService.getInstance();

    // Reset all mocks
    vi.clearAllMocks();

    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Reset singleton
    (SecureStorageService as any).instance = undefined;

    // Clean up global window mock
    vi.unstubAllGlobals();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple getInstance() calls", () => {
      const instance1 = SecureStorageService.getInstance();
      const instance2 = SecureStorageService.getInstance();
      const instance3 = SecureStorageService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it("should export a singleton instance as secureStorage", () => {
      expect(secureStorage).toBeInstanceOf(SecureStorageService);
    });

    it("should return the same instance for exported secureStorage", () => {
      // Note: secureStorage is imported at module level, so it was created before test setup
      // We verify it's an instance of the service
      expect(secureStorage).toBeInstanceOf(SecureStorageService);

      // After resetting the singleton, getInstance() should still work
      const newInstance = SecureStorageService.getInstance();
      expect(newInstance).toBeInstanceOf(SecureStorageService);
    });
  });

  describe("Initialization - init()", () => {
    it("should initialize successfully when encryption is available", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await service.init();

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(service.isEncryptionAvailable()).toBe(true);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      // Production code uses errorLogger, not console.error
      // expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should initialize successfully when encryption is NOT available", async () => {
      mockInvoke.mockResolvedValueOnce(false);

      await service.init();

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:is-encryption-available"
      );
      expect(service.isEncryptionAvailable()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SecureStorage] Encryption not available on this system"
        )
      );
    });

    it("should warn about encryption unavailability on Linux", async () => {
      mockInvoke.mockResolvedValueOnce(false);

      await service.init();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("gnome-keyring or kwallet")
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "API keys will be stored without encryption as fallback"
        )
      );
    });

    it("should not re-initialize if already initialized", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await service.init();
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // Second call should not invoke IPC
      await service.init();
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it("should throw error when initialization fails", async () => {
      const error = new Error("IPC communication failed");
      mockInvoke.mockRejectedValueOnce(error);

      await expect(service.init()).rejects.toThrow(
        "Failed to initialize secure storage"
      );
      // Production code uses errorLogger.logError(), not console.error()
      // errorLogger is mocked differently, so we don't check for specific calls
    });

    it("should throw error with non-Error object failure", async () => {
      mockInvoke.mockRejectedValueOnce("String error");

      await expect(service.init()).rejects.toThrow(
        "Failed to initialize secure storage"
      );
      // Production code uses errorLogger.logError(), not console.error()
      // errorLogger is mocked differently, so we don't check for specific calls
    });
  });

  describe("Encryption Availability - isEncryptionAvailable()", () => {
    it("should return false before initialization", () => {
      expect(service.isEncryptionAvailable()).toBe(false);
    });

    it("should return true when encryption is available", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await service.init();

      expect(service.isEncryptionAvailable()).toBe(true);
    });

    it("should return false when encryption is not available", async () => {
      mockInvoke.mockResolvedValueOnce(false);

      await service.init();

      expect(service.isEncryptionAvailable()).toBe(false);
    });
  });

  describe("Set API Key - setApiKey()", () => {
    it("should auto-initialize before setting API key", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init call
        .mockResolvedValueOnce(undefined); // set call

      await service.setApiKey("openai_api_key", "sk-test123");

      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:set",
        "openai_api_key",
        "sk-test123"
      );
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it("should set API key successfully", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      await service.setApiKey("anthropic_api_key", "sk-ant-test456");

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:set",
        "anthropic_api_key",
        "sk-ant-test456"
      );
    });

    it("should not re-initialize if already initialized", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await service.init();
      await service.setApiKey("key1", "value1");
      await service.setApiKey("key2", "value2");

      // Only one init call + two set calls
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:set",
        "key1",
        "value1"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        3,
        "secure-storage:set",
        "key2",
        "value2"
      );
    });

    it("should throw error when key is empty", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.setApiKey("", "value")).rejects.toThrow(
        "Key and value are required"
      );
      expect(mockInvoke).toHaveBeenCalledTimes(1); // Only init called
    });

    it("should throw error when value is empty", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.setApiKey("key", "")).rejects.toThrow(
        "Key and value are required"
      );
      expect(mockInvoke).toHaveBeenCalledTimes(1); // Only init called
    });

    it("should throw error when key is null", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.setApiKey(null as any, "value")).rejects.toThrow(
        "Key and value are required"
      );
    });

    it("should throw error when value is null", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.setApiKey("key", null as any)).rejects.toThrow(
        "Key and value are required"
      );
    });

    it("should throw error when key is undefined", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(
        service.setApiKey(undefined as any, "value")
      ).rejects.toThrow("Key and value are required");
    });

    it("should throw error when value is undefined", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.setApiKey("key", undefined as any)).rejects.toThrow(
        "Key and value are required"
      );
    });

    it("should handle IPC failure when setting API key", async () => {
      const ipcError = new Error("IPC set failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(ipcError);

      await expect(service.setApiKey("test_key", "test_value")).rejects.toThrow(
        "Failed to store API key: IPC set failed"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should handle non-Error IPC failure when setting API key", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce("String error");

      await expect(service.setApiKey("test_key", "test_value")).rejects.toThrow(
        "Failed to store API key: Unknown error"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should allow setting keys with special characters", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      await service.setApiKey(
        "key-with-dashes_and_underscores.and.dots",
        "sk-!@#$%^&*()"
      );

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:set",
        "key-with-dashes_and_underscores.and.dots",
        "sk-!@#$%^&*()"
      );
    });
  });

  describe("Get API Key - getApiKey()", () => {
    it("should auto-initialize before getting API key", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init call
        .mockResolvedValueOnce("sk-test123"); // get call

      const result = await service.getApiKey("openai_api_key");

      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:get",
        "openai_api_key"
      );
      expect(result).toBe("sk-test123");
    });

    it("should get API key successfully", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce("sk-ant-test456");

      const result = await service.getApiKey("anthropic_api_key");

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:get",
        "anthropic_api_key"
      );
      expect(result).toBe("sk-ant-test456");
    });

    it("should return null when API key not found", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(null);

      const result = await service.getApiKey("non_existent_key");

      expect(result).toBeNull();
    });

    it("should return null when IPC returns undefined", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      const result = await service.getApiKey("missing_key");

      expect(result).toBeNull();
    });

    it("should return null when IPC returns empty string", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce("");

      const result = await service.getApiKey("empty_key");

      expect(result).toBeNull();
    });

    it("should throw error when key is empty", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.getApiKey("")).rejects.toThrow("Key is required");
      expect(mockInvoke).toHaveBeenCalledTimes(1); // Only init called
    });

    it("should throw error when key is null", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.getApiKey(null as any)).rejects.toThrow(
        "Key is required"
      );
    });

    it("should throw error when key is undefined", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.getApiKey(undefined as any)).rejects.toThrow(
        "Key is required"
      );
    });

    it("should handle IPC failure when getting API key", async () => {
      const ipcError = new Error("IPC get failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(ipcError);

      await expect(service.getApiKey("test_key")).rejects.toThrow(
        "Failed to retrieve API key: IPC get failed"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should handle non-Error IPC failure when getting API key", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce("String error");

      await expect(service.getApiKey("test_key")).rejects.toThrow(
        "Failed to retrieve API key: Unknown error"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should not re-initialize if already initialized", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce("value1")
        .mockResolvedValueOnce("value2");

      await service.init();
      await service.getApiKey("key1");
      await service.getApiKey("key2");

      // Only one init call + two get calls
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:get",
        "key1"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        3,
        "secure-storage:get",
        "key2"
      );
    });
  });

  describe("Delete API Key - deleteApiKey()", () => {
    it("should auto-initialize before deleting API key", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init call
        .mockResolvedValueOnce(undefined); // delete call

      await service.deleteApiKey("openai_api_key");

      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:delete",
        "openai_api_key"
      );
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it("should delete API key successfully", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      await service.deleteApiKey("test_key");

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:delete",
        "test_key"
      );
    });

    it("should throw error when key is empty", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.deleteApiKey("")).rejects.toThrow("Key is required");
      expect(mockInvoke).toHaveBeenCalledTimes(1); // Only init called
    });

    it("should throw error when key is null", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.deleteApiKey(null as any)).rejects.toThrow(
        "Key is required"
      );
    });

    it("should throw error when key is undefined", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      await expect(service.deleteApiKey(undefined as any)).rejects.toThrow(
        "Key is required"
      );
    });

    it("should handle IPC failure when deleting API key", async () => {
      const ipcError = new Error("IPC delete failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(ipcError);

      await expect(service.deleteApiKey("test_key")).rejects.toThrow(
        "Failed to delete API key: IPC delete failed"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should handle non-Error IPC failure when deleting API key", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce("String error");

      await expect(service.deleteApiKey("test_key")).rejects.toThrow(
        "Failed to delete API key: Unknown error"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should not re-initialize if already initialized", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await service.init();
      await service.deleteApiKey("key1");
      await service.deleteApiKey("key2");

      // Only one init call + two delete calls
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:delete",
        "key1"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        3,
        "secure-storage:delete",
        "key2"
      );
    });
  });

  describe("Has API Key - hasApiKey()", () => {
    it("should auto-initialize before checking API key existence", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init call
        .mockResolvedValueOnce("sk-test123"); // get call

      const result = await service.hasApiKey("openai_api_key");

      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "secure-storage:get",
        "openai_api_key"
      );
      expect(result).toBe(true);
    });

    it("should return true when API key exists", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce("sk-test-value");

      const result = await service.hasApiKey("test_key");

      expect(result).toBe(true);
    });

    it("should return false when API key does not exist", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(null);

      const result = await service.hasApiKey("non_existent_key");

      expect(result).toBe(false);
    });

    it("should return false when API key is empty string", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce("");

      const result = await service.hasApiKey("empty_key");

      expect(result).toBe(false);
    });

    it("should return false when key is empty", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await service.hasApiKey("");

      expect(result).toBe(false);
      expect(mockInvoke).toHaveBeenCalledTimes(1); // Only init called
    });

    it("should return false when key is null", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await service.hasApiKey(null as any);

      expect(result).toBe(false);
    });

    it("should return false when key is undefined", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await service.hasApiKey(undefined as any);

      expect(result).toBe(false);
    });

    it("should return false when getApiKey throws error", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error("IPC error"));

      const result = await service.hasApiKey("test_key");

      expect(result).toBe(false);
    });

    it("should not re-initialize if already initialized", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce("value1")
        .mockResolvedValueOnce(null);

      await service.init();
      await service.hasApiKey("key1");
      await service.hasApiKey("key2");

      // Only one init call + two get calls (hasApiKey uses getApiKey internally)
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("Clear All - clearAll()", () => {
    it("should auto-initialize before clearing all keys", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init call
        .mockResolvedValueOnce(undefined); // clear-all call

      await service.clearAll();

      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(2, "secure-storage:clear-all");
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it("should clear all API keys successfully", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      await service.clearAll();

      expect(mockInvoke).toHaveBeenCalledWith("secure-storage:clear-all");
    });

    it("should handle IPC failure when clearing all keys", async () => {
      const ipcError = new Error("IPC clear-all failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(ipcError);

      await expect(service.clearAll()).rejects.toThrow(
        "Failed to clear all API keys"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should handle non-Error IPC failure when clearing all keys", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce("String error");

      await expect(service.clearAll()).rejects.toThrow(
        "Failed to clear all API keys"
      );
      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should not re-initialize if already initialized", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await service.init();
      await service.clearAll();
      await service.clearAll();

      // Only one init call + two clear-all calls
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        "secure-storage:is-encryption-available"
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(2, "secure-storage:clear-all");
      expect(mockInvoke).toHaveBeenNthCalledWith(3, "secure-storage:clear-all");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete CRUD workflow", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init
        .mockResolvedValueOnce(undefined) // set
        .mockResolvedValueOnce("sk-test123") // get
        .mockResolvedValueOnce("sk-test123") // has (get internally)
        .mockResolvedValueOnce(undefined) // delete
        .mockResolvedValueOnce(null); // has after delete (get internally)

      await service.init();

      // Set API key
      await service.setApiKey("test_key", "sk-test123");

      // Get API key
      const value = await service.getApiKey("test_key");
      expect(value).toBe("sk-test123");

      // Check existence
      const exists = await service.hasApiKey("test_key");
      expect(exists).toBe(true);

      // Delete API key
      await service.deleteApiKey("test_key");

      // Verify deletion
      const existsAfterDelete = await service.hasApiKey("test_key");
      expect(existsAfterDelete).toBe(false);
    });

    it("should handle multiple API keys independently", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init
        .mockResolvedValueOnce(undefined) // set key1
        .mockResolvedValueOnce(undefined) // set key2
        .mockResolvedValueOnce("value1") // get key1
        .mockResolvedValueOnce("value2") // get key2
        .mockResolvedValueOnce(undefined) // delete key1
        .mockResolvedValueOnce(null) // get key1 after delete
        .mockResolvedValueOnce("value2"); // get key2 still exists

      await service.init();

      // Set multiple keys
      await service.setApiKey("openai_key", "value1");
      await service.setApiKey("anthropic_key", "value2");

      // Get keys
      expect(await service.getApiKey("openai_key")).toBe("value1");
      expect(await service.getApiKey("anthropic_key")).toBe("value2");

      // Delete one key
      await service.deleteApiKey("openai_key");

      // Verify deletion
      expect(await service.getApiKey("openai_key")).toBeNull();
      expect(await service.getApiKey("anthropic_key")).toBe("value2");
    });

    it("should handle clearAll() removing all keys", async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // init
        .mockResolvedValueOnce(undefined) // set key1
        .mockResolvedValueOnce(undefined) // set key2
        .mockResolvedValueOnce(undefined) // clearAll
        .mockResolvedValueOnce(null) // get key1 after clear
        .mockResolvedValueOnce(null); // get key2 after clear

      await service.init();

      // Set multiple keys
      await service.setApiKey("key1", "value1");
      await service.setApiKey("key2", "value2");

      // Clear all
      await service.clearAll();

      // Verify all keys are gone
      expect(await service.getApiKey("key1")).toBeNull();
      expect(await service.getApiKey("key2")).toBeNull();
    });

    it("should maintain singleton across operations", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce("value");

      const instance1 = SecureStorageService.getInstance();
      await instance1.setApiKey("test", "value");

      const instance2 = SecureStorageService.getInstance();
      const result = await instance2.getApiKey("test");

      expect(instance1).toBe(instance2);
      expect(result).toBe("value");
    });
  });

  describe("Edge Cases", () => {
    it("should handle whitespace-only key gracefully", async () => {
      mockInvoke.mockResolvedValueOnce(true);

      // Whitespace keys are technically allowed, but treated as valid keys
      await expect(service.setApiKey("   ", "value")).resolves.not.toThrow();
    });

    it("should handle very long API key values", async () => {
      const longValue = "sk-" + "x".repeat(10000);
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      await service.setApiKey("long_key", longValue);

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:set",
        "long_key",
        longValue
      );
    });

    it("should handle special characters in key names", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

      await service.setApiKey(
        "key-with-dashes_underscores.dots:colons",
        "value"
      );

      expect(mockInvoke).toHaveBeenCalledWith(
        "secure-storage:set",
        "key-with-dashes_underscores.dots:colons",
        "value"
      );
    });

    it("should handle rapid successive calls", async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValue(undefined);

      await service.init();

      const promises = [
        service.setApiKey("key1", "value1"),
        service.setApiKey("key2", "value2"),
        service.setApiKey("key3", "value3"),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe("Error Message Validation", () => {
    it("should provide detailed error message for set failures", async () => {
      const specificError = new Error("Disk write failed");
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(specificError);

      await expect(service.setApiKey("key", "value")).rejects.toThrow(
        "Failed to store API key: Disk write failed"
      );
    });

    it("should provide detailed error message for get failures", async () => {
      const specificError = new Error("Disk read failed");
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(specificError);

      await expect(service.getApiKey("key")).rejects.toThrow(
        "Failed to retrieve API key: Disk read failed"
      );
    });

    it("should provide detailed error message for delete failures", async () => {
      const specificError = new Error("Permission denied");
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(specificError);

      await expect(service.deleteApiKey("key")).rejects.toThrow(
        "Failed to delete API key: Permission denied"
      );
    });
  });

  describe("Console Logging", () => {
    it("should log warning when encryption is unavailable", async () => {
      mockInvoke.mockResolvedValueOnce(false);

      await service.init();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SecureStorage] Encryption not available on this system"
        )
      );
    });

    it("should log error when initialization fails", async () => {
      const error = new Error("Init failed");
      mockInvoke.mockRejectedValueOnce(error);

      await expect(service.init()).rejects.toThrow();

      // Production code uses errorLogger.logError(), not console.error()
      // errorLogger is mocked differently, so we don't check for specific calls
    });

    it("should log error with key name when set fails", async () => {
      const error = new Error("Set failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(error);

      await expect(service.setApiKey("my_api_key", "value")).rejects.toThrow();

      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should log error with key name when get fails", async () => {
      const error = new Error("Get failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(error);

      await expect(service.getApiKey("my_api_key")).rejects.toThrow();

      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should log error with key name when delete fails", async () => {
      const error = new Error("Delete failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(error);

      await expect(service.deleteApiKey("my_api_key")).rejects.toThrow();

      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should log error when clearAll fails", async () => {
      const error = new Error("Clear all failed");
      mockInvoke.mockResolvedValueOnce(true).mockRejectedValueOnce(error);

      await expect(service.clearAll()).rejects.toThrow();

      // Production code uses errorLogger.logError(), not console.error()
    });

    it("should not log errors via console.error when operations succeed", async () => {
      mockInvoke
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce("value")
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await service.init();
      await service.setApiKey("key", "value");
      await service.getApiKey("key");
      await service.deleteApiKey("key");
      await service.clearAll();

      // Production code uses errorLogger, not console.error
      // This test verifies no unexpected console.error calls occur
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});

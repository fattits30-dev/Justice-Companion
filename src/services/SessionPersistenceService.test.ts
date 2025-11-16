import path from "path";
import { v4 as uuidv4 } from "uuid";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Mock Electron before importing the service (hoisted to top)
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from("encrypted-" + str)),
    decryptString: vi.fn(() => "decrypted"),
  },
  app: {
    getPath: vi.fn(() => "/mock/user/data"),
  },
}));

// Mock fs/promises (hoisted to top)
vi.mock("fs/promises", () => {
  const mockFns = {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
  };
  return {
    default: mockFns, // Default export for: import fs from 'fs/promises'
    ...mockFns, // Named exports for: import { access } from 'fs/promises'
  };
});

describe("SessionPersistenceService", () => {
  // Import after mocks are set up
  let SessionPersistenceService: any;
  let service: any;
  let mockSafeStorage: any;
  let mockApp: any;
  let fs: any;

  // Use path.join for Windows compatibility
  const mockUserDataPath = path.join(path.sep, "mock", "user", "data");
  const mockSessionFilePath = path.join(mockUserDataPath, "session.enc");
  const validSessionId = uuidv4();

  beforeEach(async () => {
    // Reset modules to get fresh instances
    vi.resetModules();
    vi.clearAllMocks();

    // Import modules after reset
    const electron = await import("electron");
    const fsModule = await import("fs/promises");
    const serviceModule = await import("./SessionPersistenceService");

    SessionPersistenceService = serviceModule.SessionPersistenceService;
    mockSafeStorage = electron.safeStorage;
    mockApp = electron.app;

    // Get fs from default export (how the service imports it)
    fs = fsModule.default || fsModule;

    // Setup default mock behaviors
    mockApp.getPath.mockReturnValue(mockUserDataPath);
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);

    // Get service instance
    service = SessionPersistenceService.getInstance();
  });

  describe("isAvailable", () => {
    it("should return true when encryption is available", async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);

      const result = await service.isAvailable();

      expect(result).toBe(true);
      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalled();
    });

    it("should return false when encryption is not available", async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      mockSafeStorage.isEncryptionAvailable.mockImplementation(() => {
        throw new Error("Keychain error");
      });

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });

    it("should return false when safeStorage API is not available", async () => {
      // Temporarily remove the function to simulate unavailable API
      const originalFn = mockSafeStorage.isEncryptionAvailable;
      delete (mockSafeStorage as any).isEncryptionAvailable;

      const result = await service.isAvailable();

      expect(result).toBe(false);

      // Restore
      mockSafeStorage.isEncryptionAvailable = originalFn;
    });
  });

  describe("storeSessionId", () => {
    const encryptedData = Buffer.from("encrypted-session-data");

    beforeEach(() => {
      mockSafeStorage.encryptString.mockReturnValue(encryptedData);
      (fs.access as Mock).mockRejectedValue(new Error("Not found"));
      (fs.mkdir as Mock).mockResolvedValue(undefined);
      (fs.writeFile as Mock).mockResolvedValue(undefined);
    });

    it("should store a valid session ID", async () => {
      await service.storeSessionId(validSessionId);

      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith(
        validSessionId,
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSessionFilePath,
        encryptedData,
      );
    });

    it("should create userData directory if it does not exist", async () => {
      await service.storeSessionId(validSessionId);

      expect(fs.mkdir).toHaveBeenCalledWith(mockUserDataPath, {
        recursive: true,
      });
    });

    it("should not create directory if it already exists", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);

      await service.storeSessionId(validSessionId);

      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it("should reject invalid session ID format", async () => {
      const invalidIds = [
        "",
        "not-a-uuid",
        "12345",
        null as any,
        undefined as any,
        123 as any,
        "invalid-uuid-format",
      ];

      for (const invalidId of invalidIds) {
        await expect(service.storeSessionId(invalidId)).rejects.toThrow(
          "Invalid session ID format",
        );
      }

      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled();
    });

    it("should throw error when encryption is not available", async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      await expect(service.storeSessionId(validSessionId)).rejects.toThrow(
        "Encryption not available",
      );
    });

    it("should clean up file on write error", async () => {
      (fs.writeFile as Mock).mockRejectedValue(new Error("Disk full"));
      (fs.unlink as Mock).mockResolvedValue(undefined);

      await expect(service.storeSessionId(validSessionId)).rejects.toThrow(
        "Disk full",
      );

      expect(fs.unlink).toHaveBeenCalledWith(mockSessionFilePath);
    });

    it("should handle cleanup errors gracefully", async () => {
      (fs.writeFile as Mock).mockRejectedValue(new Error("Write failed"));
      (fs.unlink as Mock).mockRejectedValue(new Error("Cleanup failed"));

      await expect(service.storeSessionId(validSessionId)).rejects.toThrow(
        "Write failed",
      );
    });
  });

  describe("retrieveSessionId", () => {
    const encryptedData = Buffer.from("encrypted-session-data");

    beforeEach(() => {
      mockSafeStorage.decryptString.mockReturnValue(validSessionId);
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.readFile as Mock).mockResolvedValue(encryptedData);
    });

    it("should retrieve and decrypt stored session ID", async () => {
      const result = await service.retrieveSessionId();

      expect(result).toBe(validSessionId);
      expect(fs.readFile).toHaveBeenCalledWith(mockSessionFilePath);
      expect(mockSafeStorage.decryptString).toHaveBeenCalledWith(encryptedData);
    });

    it("should return null when file does not exist", async () => {
      (fs.access as Mock).mockRejectedValue(new Error("File not found"));

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should return null when encryption is not available", async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
    });

    it("should return null and clean up when file is empty", async () => {
      (fs.readFile as Mock).mockResolvedValue(Buffer.from(""));
      (fs.unlink as Mock).mockResolvedValue(undefined);

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
      expect(fs.unlink).toHaveBeenCalledWith(mockSessionFilePath);
    });

    it("should return null and clean up when decrypted ID is invalid", async () => {
      mockSafeStorage.decryptString.mockReturnValue("invalid-uuid");
      (fs.unlink as Mock).mockResolvedValue(undefined);

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
      expect(fs.unlink).toHaveBeenCalledWith(mockSessionFilePath);
    });

    it("should handle corrupted files gracefully", async () => {
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error("Failed to decrypt data");
      });
      (fs.unlink as Mock).mockResolvedValue(undefined);

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
      expect(fs.unlink).toHaveBeenCalledWith(mockSessionFilePath);
    });

    it("should handle read errors gracefully", async () => {
      (fs.readFile as Mock).mockRejectedValue(new Error("Read error"));

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
    });
  });

  describe("clearSession", () => {
    it("should delete the session file if it exists", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.unlink as Mock).mockResolvedValue(undefined);

      await service.clearSession();

      expect(fs.unlink).toHaveBeenCalledWith(mockSessionFilePath);
    });

    it("should handle non-existent file gracefully", async () => {
      (fs.access as Mock).mockRejectedValue(new Error("File not found"));

      await expect(service.clearSession()).resolves.not.toThrow();
    });

    it("should handle deletion errors gracefully", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.unlink as Mock).mockRejectedValue(new Error("Permission denied"));

      await expect(service.clearSession()).resolves.not.toThrow();
    });
  });

  describe("hasStoredSession", () => {
    it("should return true when session file exists and is not empty", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.stat as Mock).mockResolvedValue({ size: 100 });

      const result = await service.hasStoredSession();

      expect(result).toBe(true);
    });

    it("should return false when session file does not exist", async () => {
      (fs.access as Mock).mockRejectedValue(new Error("File not found"));

      const result = await service.hasStoredSession();

      expect(result).toBe(false);
    });

    it("should return false when session file is empty", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.stat as Mock).mockResolvedValue({ size: 0 });

      const result = await service.hasStoredSession();

      expect(result).toBe(false);
    });

    it("should handle stat errors gracefully", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.stat as Mock).mockRejectedValue(new Error("Stat error"));

      const result = await service.hasStoredSession();

      expect(result).toBe(false);
    });
  });

  describe("getSessionMetadata", () => {
    it("should return metadata when session file exists", async () => {
      const mockDate = new Date("2025-01-12T10:00:00Z");
      (fs.stat as Mock).mockResolvedValue({
        size: 256,
        mtime: mockDate,
      });

      const result = await service.getSessionMetadata();

      expect(result).toEqual({
        exists: true,
        size: 256,
        modified: mockDate,
        encryptionAvailable: true,
      });
    });

    it("should return minimal metadata when file does not exist", async () => {
      (fs.stat as Mock).mockRejectedValue(new Error("File not found"));

      const result = await service.getSessionMetadata();

      expect(result).toEqual({
        exists: false,
        encryptionAvailable: true,
      });
    });

    it("should include encryption availability status", async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      (fs.stat as Mock).mockRejectedValue(new Error("File not found"));

      const result = await service.getSessionMetadata();

      expect(result.encryptionAvailable).toBe(false);
    });
  });

  describe("Singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = SessionPersistenceService.getInstance();
      const instance2 = SessionPersistenceService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Security tests", () => {
    it("should never log decrypted session IDs", async () => {
      const consoleLogSpy = vi.spyOn(console, "log");
      const consoleErrorSpy = vi.spyOn(console, "error");
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // Set up mocks for this test
      (fs.access as Mock).mockRejectedValue(new Error("Not found"));
      (fs.mkdir as Mock).mockResolvedValue(undefined);
      (fs.writeFile as Mock).mockResolvedValue(undefined);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from("encrypted"));

      await service.storeSessionId(validSessionId);

      // Reset for retrieval
      (fs.access as Mock).mockResolvedValue(undefined);
      (fs.readFile as Mock).mockResolvedValue(Buffer.from("encrypted"));
      mockSafeStorage.decryptString.mockReturnValue(validSessionId);

      await service.retrieveSessionId();

      // Check that the session ID never appears in any console output
      const allLogs = [
        ...consoleLogSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat(),
      ].map((arg) => String(arg));

      expect(allLogs.some((log) => log.includes(validSessionId))).toBe(false);

      // Restore spies
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it("should validate UUID v4 format strictly", async () => {
      const invalidUUIDs = [
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // Not valid hex
        "550e8400-e29b-11d4-a716-446655440000", // UUID v1
        "6ba7b810-9dad-31d1-80b4-00c04fd430c8", // UUID v3
        "00000000000000000000000000000000", // All zeros (no dashes)
      ];

      for (const invalidId of invalidUUIDs) {
        await expect(service.storeSessionId(invalidId)).rejects.toThrow(
          "Invalid session ID format",
        );
      }
    });
  });
});

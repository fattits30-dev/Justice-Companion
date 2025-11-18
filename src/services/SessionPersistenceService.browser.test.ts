import { v4 as uuidv4 } from "uuid";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionPersistenceService } from "./SessionPersistenceService";

const STORAGE_KEY = "justice-companion.session.id";

describe("SessionPersistenceService (browser storage)", () => {
  const service = SessionPersistenceService.getInstance();

  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("isAvailable", () => {
    it("returns true when localStorage is available", async () => {
      const result = await service.isAvailable();

      expect(result).toBe(true);
    });
  });

  describe("storeSessionId & retrieveSessionId", () => {
    it("stores and retrieves a valid UUID v4 session ID", async () => {
      const sessionId = uuidv4();

      await service.storeSessionId(sessionId);
      const retrieved = await service.retrieveSessionId();

      expect(retrieved).toBe(sessionId);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(sessionId);
    });

    it("rejects invalid session IDs", async () => {
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
          "Invalid session ID format"
        );
      }

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears storage for invalid stored value", async () => {
      window.localStorage.setItem(STORAGE_KEY, "not-a-uuid");

      const result = await service.retrieveSessionId();

      expect(result).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("clearSession", () => {
    it("removes any stored session ID", async () => {
      const sessionId = uuidv4();
      window.localStorage.setItem(STORAGE_KEY, sessionId);

      await service.clearSession();

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("hasStoredSession", () => {
    it("returns true when a session ID is stored", async () => {
      const sessionId = uuidv4();
      window.localStorage.setItem(STORAGE_KEY, sessionId);

      const result = await service.hasStoredSession();

      expect(result).toBe(true);
    });

    it("returns false when no session ID is stored", async () => {
      const result = await service.hasStoredSession();

      expect(result).toBe(false);
    });
  });

  describe("getSessionMetadata", () => {
    it("returns metadata when a session is stored", async () => {
      const sessionId = uuidv4();
      window.localStorage.setItem(STORAGE_KEY, sessionId);

      const metadata = await service.getSessionMetadata();

      expect(metadata.exists).toBe(true);
      expect(metadata.size).toBe(sessionId.length);
      expect(metadata.encryptionAvailable).toBe(true);
    });

    it("returns exists=false when no session is stored", async () => {
      const metadata = await service.getSessionMetadata();

      expect(metadata.exists).toBe(false);
      expect(metadata.encryptionAvailable).toBe(true);
    });
  });

  describe("Singleton pattern", () => {
    it("always returns the same instance", () => {
      const instance1 = SessionPersistenceService.getInstance();
      const instance2 = SessionPersistenceService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Security", () => {
    it("never logs the raw session ID", async () => {
      const sessionId = uuidv4();

      const consoleLogSpy = vi.spyOn(console, "log");
      const consoleErrorSpy = vi.spyOn(console, "error");
      const consoleWarnSpy = vi.spyOn(console, "warn");

      await service.storeSessionId(sessionId);
      await service.retrieveSessionId();

      const allLogs = [
        ...consoleLogSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat(),
      ].map((arg) => String(arg));

      expect(allLogs.some((log) => log.includes(sessionId))).toBe(false);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});

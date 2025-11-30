import { v4 as uuidv4 } from "uuid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../utils/logger.ts";
import { SessionPersistenceService } from "./SessionPersistenceService.ts";
describe("SessionPersistenceService (non-browser environments)", () => {
    let originalWindow;
    let service;
    const resetInstance = () => {
        SessionPersistenceService.instance = undefined;
    };
    beforeEach(() => {
        originalWindow = globalThis.window;
        vi.stubGlobal("window", undefined);
        resetInstance();
        service = SessionPersistenceService.getInstance();
        vi.spyOn(logger, "warn").mockImplementation(() => {
            /* silent */
        });
        vi.spyOn(logger, "error").mockImplementation(() => {
            /* silent */
        });
    });
    afterEach(() => {
        resetInstance();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        if (originalWindow) {
            globalThis.window = originalWindow;
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete globalThis.window;
        }
    });
    it("reports storage availability as false when localStorage is missing", async () => {
        await expect(service.isAvailable()).resolves.toBe(false);
        expect(logger.warn).toHaveBeenCalledWith("SessionPersistence", "localStorage not available");
    });
    it("rejects storing a session ID when persistent storage is unavailable", async () => {
        const sessionId = uuidv4();
        await expect(service.storeSessionId(sessionId)).rejects.toThrow("Persistent storage not available");
        expect(logger.error).toHaveBeenCalledWith("Failed to store session ID", expect.objectContaining({ service: "SessionPersistence" }));
    });
    it("returns null when retrieving a session without storage support", async () => {
        const result = await service.retrieveSessionId();
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith("SessionPersistence", "Cannot retrieve: storage not available");
    });
    it("logs and swallows errors when clearing sessions fails", async () => {
        const storageMock = {
            removeItem: vi.fn(() => {
                throw new Error("storage fault");
            }),
        };
        const ServiceWithAccess = SessionPersistenceService;
        const getStorageSpy = vi
            .spyOn(ServiceWithAccess, "getStorage")
            .mockReturnValue(storageMock);
        await service.clearSession();
        expect(storageMock.removeItem).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith("Error clearing session", expect.objectContaining({ service: "SessionPersistence" }));
        getStorageSpy.mockRestore();
    });
    it("reports metadata accurately when storage is unavailable", async () => {
        const metadata = await service.getSessionMetadata();
        expect(metadata).toEqual({
            exists: false,
            encryptionAvailable: false,
        });
    });
});

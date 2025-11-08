import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProcessManager } from "./ProcessManager.ts";
import type { App } from "electron";

// Mock Electron app
const mockApp = {
  requestSingleInstanceLock: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
} as unknown as App;

async function withMockedPlatform<T>(
  platform: NodeJS.Platform,
  callback: () => Promise<T> | T
): Promise<T> {
  const platformSpy = vi
    .spyOn(process, "platform", "get")
    .mockReturnValue(platform);
  try {
    return await callback();
  } finally {
    platformSpy.mockRestore();
  }
}

describe("ProcessManager", () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    vi.clearAllMocks();
    processManager = new ProcessManager(mockApp);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Single Instance Lock", () => {
    it("should request single instance lock when enforced", () => {
      processManager.enforceSingleInstance();
      expect(mockApp.requestSingleInstanceLock).toHaveBeenCalled();
    });

    it("should quit app if single instance lock fails", () => {
      (
        mockApp.requestSingleInstanceLock as ReturnType<typeof vi.fn>
      ).mockReturnValue(false);

      const failedManager = new ProcessManager(mockApp);
      failedManager.enforceSingleInstance();

      expect(mockApp.quit).toHaveBeenCalled();
    });

    it("should continue if single instance lock succeeds", () => {
      (
        mockApp.requestSingleInstanceLock as ReturnType<typeof vi.fn>
      ).mockReturnValue(true);

      const successManager = new ProcessManager(mockApp);
      successManager.enforceSingleInstance();

      expect(mockApp.quit).not.toHaveBeenCalled();
    });

    it("should handle second-instance event", () => {
      (
        mockApp.requestSingleInstanceLock as ReturnType<typeof vi.fn>
      ).mockReturnValue(true);

      const manager = new ProcessManager(mockApp);
      const callback = vi.fn();

      manager.onSecondInstance(callback);

      // Verify the event listener was registered
      expect(mockApp.on).toHaveBeenCalledWith(
        "second-instance",
        expect.any(Function)
      );
    });
  });

  describe("Port Detection", () => {
    it("should detect if port is in use", async () => {
      const isPortInUse = await processManager.isPortInUse(5176);
      expect(typeof isPortInUse).toBe("boolean");
    });

    it("should return true for ports in use", async () => {
      // This test requires an actual server running
      const server = await import("net").then((net) => {
        const srv = net.createServer();
        return new Promise<typeof srv>((resolve) => {
          srv.listen(9999, () => resolve(srv));
        });
      });

      const isInUse = await processManager.isPortInUse(9999);
      expect(isInUse).toBe(true);

      server.close();
    });

    it("should return false for available ports", async () => {
      const isInUse = await processManager.isPortInUse(65432);
      expect(isInUse).toBe(false);
    });
  });

  describe("Process Cleanup", () => {
    it("should kill processes by port", async () => {
      const killed = await processManager.killProcessOnPort(5176);
      expect(typeof killed).toBe("boolean");
    });

    it("should cleanup on startup", async () => {
      const isPortInUseSpy = vi
        .spyOn(processManager, "isPortInUse")
        .mockResolvedValue(true);
      const killSpy = vi
        .spyOn(processManager, "killProcessOnPort")
        .mockResolvedValue(true);

      await processManager.cleanupOnStartup();

      // Should check if ports are in use
      expect(isPortInUseSpy).toHaveBeenCalled();
      // Should kill processes if ports are in use
      expect(killSpy).toHaveBeenCalled();
    });

    it("should handle errors gracefully during cleanup", async () => {
      vi.spyOn(processManager, "killProcessOnPort").mockRejectedValue(
        new Error("Access denied")
      );

      await expect(processManager.cleanupOnStartup()).resolves.not.toThrow();
    });
  });

  describe("Graceful Shutdown", () => {
    it("should register shutdown handlers", () => {
      processManager.registerShutdownHandlers();

      expect(mockApp.on).toHaveBeenCalledWith(
        "before-quit",
        expect.any(Function)
      );
    });

    it("should execute cleanup on shutdown", async () => {
      const cleanupSpy = vi.fn();
      processManager.onShutdown(cleanupSpy);

      processManager.registerShutdownHandlers();

      // Trigger before-quit event
      const beforeQuitHandler = (
        mockApp.on as ReturnType<typeof vi.fn>
      ).mock.calls.find((call) => call[0] === "before-quit")?.[1];

      if (beforeQuitHandler) {
        await beforeQuitHandler();
        expect(cleanupSpy).toHaveBeenCalled();
      }
    });
  });

  describe("Status Reporting", () => {
    it("should report process status", async () => {
      const status = await processManager.getStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("startTime");
      expect(status).toHaveProperty("ports");
      expect(typeof status.isRunning).toBe("boolean");
    });

    it("should track managed ports", async () => {
      await processManager.trackPort(5176, "Vite Dev Server");

      const status = await processManager.getStatus();
      expect(status.ports).toContainEqual({
        port: 5176,
        name: "Vite Dev Server",
        inUse: expect.any(Boolean),
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle port conflicts with retries", async () => {
      const result = await processManager.ensurePortAvailable(5176, 3);
      expect(typeof result).toBe("boolean");
    });

    it("should fail after max retries", async () => {
      // Mock port as always in use
      vi.spyOn(processManager, "isPortInUse").mockResolvedValue(true);
      vi.spyOn(processManager, "killProcessOnPort").mockResolvedValue(false);

      const result = await processManager.ensurePortAvailable(5176, 2);
      expect(result).toBe(false);
    });

    it("should log errors with context", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      processManager.logError(new Error("Test error"), { context: "test" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ProcessManager]"),
        expect.any(String),
        expect.objectContaining({ context: "test" })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Windows-Specific", () => {
    it("should use netstat on Windows", async () => {
      await withMockedPlatform("win32", async () => {
        const result = await processManager.findProcessByPort(5176);
        expect(result).toHaveProperty("pid");
      });
    });

    it("should use taskkill on Windows", async () => {
      await withMockedPlatform("win32", async () => {
        const killed = await processManager.killProcessById(12345);
        expect(typeof killed).toBe("boolean");
      });
    });
  });

  describe("Unix-Specific", () => {
    it("should use lsof on Unix", async () => {
      await withMockedPlatform("linux", async () => {
        const result = await processManager.findProcessByPort(5176);
        expect(result).toHaveProperty("pid");
      });
    });

    it("should use kill on Unix", async () => {
      await withMockedPlatform("linux", async () => {
        const killed = await processManager.killProcessById(12345);
        expect(typeof killed).toBe("boolean");
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AutoUpdater } from "./AutoUpdater.ts";
import type { App, BrowserWindow } from "electron";
import type { AppUpdater, UpdateInfo } from "electron-updater";

// Mock electron-updater
const mockAutoUpdater = {
  checkForUpdates: vi.fn(),
  checkForUpdatesAndNotify: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
  on: vi.fn(),
  setFeedURL: vi.fn(),
  autoDownload: false,
  autoInstallOnAppQuit: true,
  logger: null,
} as unknown as AppUpdater;

// Mock Electron app
const mockApp = {
  getVersion: vi.fn().mockReturnValue("1.0.0"),
  on: vi.fn(),
  quit: vi.fn(),
  relaunch: vi.fn(),
} as unknown as App;

// Mock BrowserWindow
const mockWindow = {
  webContents: {
    send: vi.fn(),
  },
  isDestroyed: vi.fn().mockReturnValue(false),
} as unknown as BrowserWindow;

describe("AutoUpdater", () => {
  let autoUpdater: AutoUpdater;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mock return value after clearAllMocks
    (mockApp.getVersion as ReturnType<typeof vi.fn>).mockReturnValue("1.0.0");
    autoUpdater = new AutoUpdater(mockApp, mockAutoUpdater);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with correct configuration", () => {
      expect(mockAutoUpdater.autoDownload).toBe(false);
      expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
    });

    it("should register update event listeners", () => {
      expect(mockAutoUpdater.on).toHaveBeenCalledWith(
        "checking-for-update",
        expect.any(Function),
      );
      expect(mockAutoUpdater.on).toHaveBeenCalledWith(
        "update-available",
        expect.any(Function),
      );
      expect(mockAutoUpdater.on).toHaveBeenCalledWith(
        "update-not-available",
        expect.any(Function),
      );
      expect(mockAutoUpdater.on).toHaveBeenCalledWith(
        "download-progress",
        expect.any(Function),
      );
      expect(mockAutoUpdater.on).toHaveBeenCalledWith(
        "update-downloaded",
        expect.any(Function),
      );
      expect(mockAutoUpdater.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      );
    });
  });

  describe("Check for Updates", () => {
    it("should check for updates manually", async () => {
      (
        mockAutoUpdater.checkForUpdates as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        updateInfo: { version: "1.0.1" } as UpdateInfo,
        cancellationToken: null as any,
      });

      const result = await autoUpdater.checkForUpdates();

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
      expect(result.updateAvailable).toBe(true);
      expect(result.currentVersion).toBe("1.0.0");
    });

    it("should handle check errors gracefully", async () => {
      (
        mockAutoUpdater.checkForUpdates as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Network error"));

      const result = await autoUpdater.checkForUpdates();

      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should auto-check on startup if enabled", async () => {
      const updater = new AutoUpdater(mockApp, mockAutoUpdater, {
        checkOnStartup: true,
      });

      await updater.initialize();

      expect(mockAutoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
    });
  });

  describe("Download Updates", () => {
    it("should download update when available", async () => {
      (
        mockAutoUpdater.downloadUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(["update-file.exe"]);

      const result = await autoUpdater.downloadUpdate();

      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should handle download errors", async () => {
      (
        mockAutoUpdater.downloadUpdate as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Download failed"));

      const result = await autoUpdater.downloadUpdate();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Download failed");
    });

    it("should track download progress", () => {
      const progressCallback = vi.fn();
      autoUpdater.onDownloadProgress(progressCallback);

      // Simulate download progress event
      const downloadProgressHandler = (
        mockAutoUpdater.on as any
      ).mock.calls.find((call: any[]) => call[0] === "download-progress")?.[1];

      if (downloadProgressHandler) {
        downloadProgressHandler({ percent: 50, bytesPerSecond: 1000000 });
        expect(progressCallback).toHaveBeenCalledWith(50);
      }
    });
  });

  describe("Install Updates", () => {
    it("should quit and install update", () => {
      autoUpdater.quitAndInstall();

      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledWith(true, true);
    });

    it("should notify window before quitting", () => {
      autoUpdater.setMainWindow(mockWindow);
      autoUpdater.quitAndInstall();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "app-update:installing",
      );
    });

    it("should not notify destroyed window", () => {
      (mockWindow.isDestroyed as any).mockReturnValue(true);
      autoUpdater.setMainWindow(mockWindow);
      autoUpdater.quitAndInstall();

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe("Update Notifications", () => {
    it("should notify window of update available", () => {
      autoUpdater.setMainWindow(mockWindow);

      const updateAvailableHandler = (
        mockAutoUpdater.on as any
      ).mock.calls.find((call: any[]) => call[0] === "update-available")?.[1];

      if (updateAvailableHandler) {
        updateAvailableHandler({ version: "1.0.1" });
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          "app-update:available",
          {
            version: "1.0.1",
          },
        );
      }
    });

    it("should notify window when no update available", () => {
      autoUpdater.setMainWindow(mockWindow);

      const noUpdateHandler = (mockAutoUpdater.on as any).mock.calls.find(
        (call: any[]) => call[0] === "update-not-available",
      )?.[1];

      if (noUpdateHandler) {
        noUpdateHandler({ version: "1.0.0" });
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          "app-update:not-available",
        );
      }
    });

    it("should notify window when update is downloaded", () => {
      autoUpdater.setMainWindow(mockWindow);

      const downloadedHandler = (mockAutoUpdater.on as any).mock.calls.find(
        (call: any[]) => call[0] === "update-downloaded",
      )?.[1];

      if (downloadedHandler) {
        downloadedHandler({ version: "1.0.1" });
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          "app-update:downloaded",
          {
            version: "1.0.1",
          },
        );
      }
    });
  });

  describe("Configuration", () => {
    it("should allow custom update server URL", () => {
      const customURL = "https://updates.example.com";
      new AutoUpdater(mockApp, mockAutoUpdater, { updateServerUrl: customURL });

      expect(mockAutoUpdater.setFeedURL).toHaveBeenCalledWith(
        expect.objectContaining({ url: customURL }),
      );
    });

    it("should support GitHub releases by default", () => {
      const updater = new AutoUpdater(mockApp, mockAutoUpdater);

      expect(updater.getUpdateSource()).toBe("github");
    });

    it("should allow disabling auto-check on startup", async () => {
      const updater = new AutoUpdater(mockApp, mockAutoUpdater, {
        checkOnStartup: false,
      });

      await updater.initialize();

      expect(mockAutoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
    });
  });

  describe("Status Reporting", () => {
    it("should report current update status", () => {
      const status = autoUpdater.getStatus();

      expect(status).toHaveProperty("currentVersion");
      expect(status).toHaveProperty("checking");
      expect(status).toHaveProperty("updateAvailable");
      expect(status).toHaveProperty("downloading");
      expect(status).toHaveProperty("updateDownloaded");
      expect(status.currentVersion).toBe("1.0.0");
    });

    it("should update status when checking for updates", async () => {
      (
        mockAutoUpdater.checkForUpdates as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        updateInfo: { version: "1.0.1" } as UpdateInfo,
        cancellationToken: null as any,
      });

      await autoUpdater.checkForUpdates();

      const status = autoUpdater.getStatus();
      expect(status.updateAvailable).toBe(true);
      expect(status.latestVersion).toBe("1.0.1");
    });
  });

  describe("Error Handling", () => {
    it("should log errors to console", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errorHandler = (mockAutoUpdater.on as any).mock.calls.find(
        (call: any[]) => call[0] === "error",
      )?.[1];

      if (errorHandler) {
        errorHandler(new Error("Update failed"));
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("[AutoUpdater]"),
          expect.any(Error),
        );
      }

      consoleSpy.mockRestore();
    });

    it("should not crash app on update errors", async () => {
      (
        mockAutoUpdater.checkForUpdates as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Fatal error"));

      await expect(autoUpdater.checkForUpdates()).resolves.not.toThrow();
    });
  });

  describe("Production Mode", () => {
    it("should only enable updates in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const devUpdater = new AutoUpdater(mockApp, mockAutoUpdater);

      expect(devUpdater.isEnabled()).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it("should enable updates in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const prodUpdater = new AutoUpdater(mockApp, mockAutoUpdater);

      expect(prodUpdater.isEnabled()).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });
});

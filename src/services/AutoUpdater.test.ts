import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AutoUpdater,
  type AppLike,
  type UpdateNotificationCallback,
} from "./AutoUpdater.ts";

// Mock fetch for GitHub API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Electron app (web-compatible)
const mockApp: AppLike = {
  getVersion: vi.fn().mockReturnValue("1.0.0"),
};

// Mock notification callback
const mockNotificationCallback: UpdateNotificationCallback = vi.fn();

describe("AutoUpdater", () => {
  let autoUpdater: AutoUpdater;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Re-setup mock return value after clearAllMocks
    (mockApp.getVersion as ReturnType<typeof vi.fn>).mockReturnValue("1.0.0");
    autoUpdater = new AutoUpdater(mockApp, { githubRepo: "test/repo" });
    autoUpdater.setNotificationCallback(mockNotificationCallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      expect(autoUpdater.getStatus().currentVersion).toBe("1.0.0");
      expect(autoUpdater.getStatus().checking).toBe(false);
      expect(autoUpdater.isEnabled()).toBe(true);
    });

    it("should configure GitHub repository", () => {
      const updater = new AutoUpdater(mockApp, {
        githubRepo: "owner/repo",
      });
      expect(updater.getUpdateSource()).toBe("GitHub: owner/repo");
    });
  });

  describe("GitHub API Integration", () => {
    it("should fetch latest release from GitHub", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v1.0.1",
        name: "Version 1.0.1",
        body: "New features added",
        published_at: "2023-01-01T00:00:00Z",
        html_url: "https://github.com/test/repo/releases/tag/v1.0.1",
        prerelease: false,
        assets: [
          {
            id: 1,
            name: "update.zip",
            browser_download_url:
              "https://github.com/test/repo/releases/download/v1.0.1/update.zip",
            size: 1000000,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      const result = await autoUpdater.checkForUpdates();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/test/repo/releases/latest"
      );
      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe("v1.0.1");
      expect(result.releaseNotes).toBe("New features added");
    });

    it("should handle GitHub API errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await autoUpdater.checkForUpdates();

      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBe("Network error");
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        "app-update:error",
        expect.any(Error)
      );
    });

    it("should handle no updates available", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v1.0.0", // Same version as current
        name: "Current Version",
        body: "",
        published_at: "2023-01-01T00:00:00Z",
        html_url: "https://github.com/test/repo/releases/tag/v1.0.0",
        prerelease: false,
        assets: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      const result = await autoUpdater.checkForUpdates();

      expect(result.updateAvailable).toBe(false);
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        "app-update:not-available"
      );
    });
  });

  describe("Update Notifications", () => {
    it("should notify via callback when update is available", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v2.0.0",
        name: "Major Update",
        body: "Breaking changes included",
        published_at: "2023-01-01T00:00:00Z",
        html_url: "https://github.com/test/repo/releases/tag/v2.0.0",
        prerelease: false,
        assets: [
          {
            id: 1,
            name: "update.zip",
            browser_download_url:
              "https://github.com/test/repo/releases/download/v2.0.0/update.zip",
            size: 1000000,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      await autoUpdater.checkForUpdates();

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        "app-update:available",
        {
          version: "v2.0.0",
          releaseNotes: "Breaking changes included",
          publishedAt: "2023-01-01T00:00:00Z",
          downloadUrl:
            "https://github.com/test/repo/releases/download/v2.0.0/update.zip",
          prerelease: false,
        }
      );
    });

    it("should notify when checking for updates", async () => {
      mockFetch.mockRejectedValue(new Error("API down"));

      await autoUpdater.checkForUpdates();

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        "app-update:checking"
      );
    });
  });

  describe("Download and Installation", () => {
    it("should redirect to download URL for web app", async () => {
      const result = await autoUpdater.downloadUpdate();

      expect(result.success).toBe(true);
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        "app-update:download-ready",
        {
          downloadUrl: "https://github.com/test/repo/releases/latest",
        }
      );
    });

    it("should refresh page for installation in web app", () => {
      const originalLocation = window.location;
      // Mock reload function
      const mockReload = vi.fn();
      delete (window as any).location;
      // @ts-expect-error - assigning to readonly property for testing
      window.location = { reload: mockReload } as Location;

      autoUpdater.quitAndInstall();

      expect(mockReload).toHaveBeenCalled();

      // Restore original location
      // @ts-expect-error - restoring original window.location for cleanup
      window.location = originalLocation;
    });
  });

  describe("Configuration and Startup", () => {
    it("should check for updates on startup if configured", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v1.0.1",
        name: "",
        body: "",
        published_at: "",
        html_url: "",
        prerelease: false,
        assets: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      const updater = new AutoUpdater(mockApp, {
        githubRepo: "test/repo",
        checkOnStartup: true,
      });
      updater.setNotificationCallback(mockNotificationCallback);

      await updater.initialize();

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        "app-update:checking"
      );
    });

    it("should not check on startup if disabled", async () => {
      const updater = new AutoUpdater(mockApp, {
        githubRepo: "test/repo",
        checkOnStartup: false,
      });

      await updater.initialize();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should set up periodic checks if interval configured", () => {
      vi.useFakeTimers();

      new AutoUpdater(mockApp, {
        githubRepo: "test/repo",
        updateCheckInterval: 3600000, // 1 hour
      });

      expect(vi.getTimerCount()).toBe(1);

      vi.useRealTimers();
    });
  });

  describe("Version Comparison", () => {
    // Test the internal version comparison method indirectly
    it("should correctly identify newer versions", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v2.0.0",
        name: "",
        body: "",
        published_at: "",
        html_url: "",
        prerelease: false,
        assets: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      const result = await autoUpdater.checkForUpdates();

      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe("v2.0.0");
    });

    it("should handle equal versions correctly", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v1.0.0", // Same as current
        name: "",
        body: "",
        published_at: "",
        html_url: "",
        prerelease: false,
        assets: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      const result = await autoUpdater.checkForUpdates();

      expect(result.updateAvailable).toBe(false);
    });
  });

  describe("Status Management", () => {
    it("should track update status correctly", async () => {
      const mockRelease = {
        id: 1,
        tag_name: "v1.1.0",
        name: "",
        body: "",
        published_at: "",
        html_url: "",
        prerelease: false,
        assets: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease),
      } as Response);

      let status = autoUpdater.getStatus();
      expect(status.checking).toBe(false);

      const checkPromise = autoUpdater.checkForUpdates();

      status = autoUpdater.getStatus();
      expect(status.checking).toBe(true);

      await checkPromise;

      status = autoUpdater.getStatus();
      expect(status.checking).toBe(false);
      expect(status.updateAvailable).toBe(true);
      expect(status.latestVersion).toBe("v1.1.0");
    });
  });

  describe("Resource Cleanup", () => {
    it("should clean up periodic check timers", () => {
      const updater = new AutoUpdater(mockApp, {
        githubRepo: "test/repo",
        updateCheckInterval: 1000,
      });

      updater.dispose();

      // Timer should be cleared
      expect(vi.getTimerCount()).toBe(0); // No timers left from this test
    });
  });
});

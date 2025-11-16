import type { App, BrowserWindow } from "electron";
import type { AppUpdater, UpdateInfo, ProgressInfo } from "electron-updater";
import { errorLogger } from "../utils/error-logger.ts";
import { logger } from "../utils/logger";

export interface AutoUpdaterConfig {
  checkOnStartup?: boolean;
  updateServerUrl?: string;
  channel?: "stable" | "beta" | "alpha";
}

export interface UpdateStatus {
  currentVersion: string;
  latestVersion?: string;
  checking: boolean;
  updateAvailable: boolean;
  downloading: boolean;
  updateDownloaded: boolean;
  downloadProgress?: number;
  error?: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  error?: string;
}

export interface UpdateDownloadResult {
  success: boolean;
  error?: string;
}

export class AutoUpdater {
  private updater: AppUpdater;
  private config: AutoUpdaterConfig;
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus;
  private downloadProgressCallbacks: Array<(percent: number) => void> = [];

  constructor(app: App, updater: AppUpdater, config: AutoUpdaterConfig = {}) {
    this.updater = updater;
    this.config = {
      checkOnStartup: true,
      channel: "stable",
      ...config,
    };

    this.status = {
      currentVersion: app.getVersion(),
      checking: false,
      updateAvailable: false,
      downloading: false,
      updateDownloaded: false,
    };

    this.configure();
    this.registerListeners();
  }

  /**
   * Configure electron-updater
   */
  private configure(): void {
    // Disable auto-download - we want manual control
    this.updater.autoDownload = false;

    // Auto-install on app quit
    this.updater.autoInstallOnAppQuit = true;

    // Set custom update server if provided
    if (this.config.updateServerUrl) {
      this.updater.setFeedURL({
        provider: "generic",
        url: this.config.updateServerUrl,
      });
    }

    // Configure logging (electron-updater's Logger type doesn't expose transports)
    // Just log that we're configured
    this.updater.logger = this.updater.logger || console;

    const source = this.config.updateServerUrl
      ? `custom server ${this.config.updateServerUrl}`
      : "GitHub releases";
    logger.warn("[AutoUpdater] Configured for", source);
  }

  /**
   * Register event listeners for update events
   */
  private registerListeners(): void {
    this.updater.on("checking-for-update", () => {
      logger.warn("[AutoUpdater] Checking for updates...");
      this.status.checking = true;
      this.notifyWindow("app-update:checking");
    });

    this.updater.on("update-available", (info: UpdateInfo) => {
      logger.warn("[AutoUpdater] Update available:", info.version);
      this.status.updateAvailable = true;
      this.status.latestVersion = info.version;
      this.notifyWindow("app-update:available", info);
    });

    this.updater.on("update-not-available", (info: UpdateInfo) => {
      logger.warn("[AutoUpdater] No update available:", info.version);
      this.status.checking = false;
      this.notifyWindow("app-update:not-available");
    });

    this.updater.on("download-progress", (progress: ProgressInfo) => {
      // Calculate percent from available data (electron-updater provides 'percent' property)
      const percent =
        typeof progress.percent === "number"
          ? Math.round(progress.percent)
          : Math.round((progress.transferred / progress.total) * 100);
      this.status.downloadProgress = percent;
      this.status.downloading = true;
      this.notifyWindow("app-update:download-progress", progress);

      // Notify any registered callbacks
      this.downloadProgressCallbacks.forEach((callback) => callback(percent));
    });

    this.updater.on("update-downloaded", (info: UpdateInfo) => {
      logger.warn("[AutoUpdater] Update downloaded:", info.version);
      this.status.downloading = false;
      this.status.updateDownloaded = true;
      this.status.latestVersion = info.version;
      this.notifyWindow("app-update:downloaded", info);
    });

    this.updater.on("error", (error: Error) => {
      logger.error("[AutoUpdater] Error:", error);
      errorLogger.logError(error, {
        service: "AutoUpdater",
        operation: "update",
        currentVersion: this.status.currentVersion,
      });
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = error.message;
      this.notifyWindow("app-update:error", error);
    });
  }

  /**
   * Notify the main window of update events
   */
  private notifyWindow(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (data !== undefined) {
        this.mainWindow.webContents.send(channel, data);
      } else {
        this.mainWindow.webContents.send(channel);
      }
    }
  }

  /**
   * Check for updates manually
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      this.status.checking = true;
      this.status.error = undefined;

      const result = await this.updater.checkForUpdates();

      if (result && result.updateInfo) {
        this.status.updateAvailable = true;
        this.status.latestVersion = result.updateInfo.version;
      } else {
        this.status.updateAvailable = false;
      }

      this.status.checking = false;

      return {
        updateAvailable: this.status.updateAvailable,
        currentVersion: this.status.currentVersion,
        latestVersion: this.status.latestVersion,
      };
    } catch (error) {
      this.status.checking = false;
      this.status.error = (error as Error).message;

      return {
        updateAvailable: false,
        currentVersion: this.status.currentVersion,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Download the update
   */
  public async downloadUpdate(): Promise<UpdateDownloadResult> {
    try {
      this.status.downloading = true;
      this.status.error = undefined;

      await this.updater.downloadUpdate();

      this.status.downloading = false;
      return { success: true };
    } catch (error) {
      this.status.downloading = false;
      this.status.error = (error as Error).message;

      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Quit and install the update
   */
  public quitAndInstall(): void {
    // Notify window that we're installing
    this.notifyWindow("app-update:installing");

    // Quit and install (with silent=true, forceRunAfter=true)
    this.updater.quitAndInstall(true, true);
  }

  /**
   * Subscribe to download progress updates
   */
  public onDownloadProgress(callback: (percent: number) => void): void {
    this.downloadProgressCallbacks.push(callback);
  }

  /**
   * Get current update status
   */
  public getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Initialize the updater (check for updates on startup if configured)
   */
  public async initialize(): Promise<void> {
    if (this.config.checkOnStartup) {
      try {
        await this.updater.checkForUpdatesAndNotify();
      } catch (error) {
        errorLogger.logError(error as Error, {
          service: "AutoUpdater",
          operation: "initialize",
        });
      }
    }
  }

  /**
   * Set the main window for update notifications
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Get the update source being used
   */
  public getUpdateSource(): string {
    if (this.config.updateServerUrl) {
      return this.config.updateServerUrl;
    }
    return "github";
  }

  /**
   * Check if auto-updates are enabled (only in production)
   */
  public isEnabled(): boolean {
    return process.env.NODE_ENV === "production";
  }
}

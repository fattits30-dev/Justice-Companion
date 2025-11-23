import { errorLogger } from "../utils/error-logger.ts";
import { logger } from "../utils/logger.ts";

// Web-compatible interfaces for PWA/desktop app updates
export interface AppLike {
  getVersion(): string;
}

export interface UpdateNotificationCallback {
  (channel: string, data?: any): void;
}

export interface AutoUpdaterConfig {
  checkOnStartup?: boolean;
  githubRepo?: string; // e.g., "owner/repo"
  updateCheckInterval?: number; // in milliseconds
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

export interface GitHubAsset {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  assets: GitHubAsset[];
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  error?: string;
}

export interface UpdateDownloadResult {
  success: boolean;
  error?: string;
}

export class AutoUpdater {
  private config: AutoUpdaterConfig;
  private notificationCallback: UpdateNotificationCallback | null = null;
  private status: UpdateStatus;
  private updateCheckTimer: NodeJS.Timeout | null = null;
  private downloadProgressCallbacks: Array<(percent: number) => void> = [];

  constructor(app: AppLike, config: AutoUpdaterConfig = {}) {
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
    this.setupPeriodicChecks();
  }

  /**
   * Configure the updater for web-based checking
   */
  private configure(): void {
    const source = this.config.githubRepo
      ? `GitHub releases for ${this.config.githubRepo}`
      : "GitHub releases (no repo configured)";
    logger.info("[AutoUpdater] Configured for", source);
  }

  /**
   * Set up periodic update checks
   */
  private setupPeriodicChecks(): void {
    if (
      this.config.updateCheckInterval &&
      this.config.updateCheckInterval > 0
    ) {
      this.updateCheckTimer = setInterval(() => {
        this.checkForUpdates().catch((error) => {
          logger.error("[AutoUpdater] Periodic check failed:", error);
        });
      }, this.config.updateCheckInterval);
    }
  }

  /**
   * Notify via callback of update events
   */
  private notifyCallback(channel: string, data?: any): void {
    if (this.notificationCallback) {
      this.notificationCallback(channel, data);
    }
  }

  /**
   * Fetch latest release from GitHub
   */
  private async fetchLatestRelease(): Promise<GitHubRelease | null> {
    if (!this.config.githubRepo) {
      throw new Error("GitHub repository not configured");
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.githubRepo}/releases/latest`,
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      return release;
    } catch (error) {
      logger.error("[AutoUpdater] Failed to fetch release:", error);
      throw error;
    }
  }

  /**
   * Check for updates by comparing versions
   */
  private compareVersions(
    currentVersion: string,
    latestVersion: string,
  ): boolean {
    // Simple semantic version comparison (basic implementation)
    const current = currentVersion.replace(/^v/, "").split(".").map(Number);
    const latest = latestVersion.replace(/^v/, "").split(".").map(Number);

    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
      const currentPart = current[i] || 0;
      const latestPart = latest[i] || 0;

      if (latestPart > currentPart) {
        return true; // Update available
      } else if (latestPart < currentPart) {
        return false; // Current is newer
      }
    }

    return false; // Versions are equal
  }

  /**
   * Check for updates manually
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      this.status.checking = true;
      this.status.error = undefined;

      this.notifyCallback("app-update:checking");

      const release = await this.fetchLatestRelease();

      if (release) {
        const updateAvailable = this.compareVersions(
          this.status.currentVersion,
          release.tag_name,
        );

        if (updateAvailable) {
          this.status.updateAvailable = true;
          this.status.latestVersion = release.tag_name;

          // Filter assets for web downloads (prefer .zip, .tar.gz, or installers)
          const downloadAsset = release.assets.find(
            (asset) =>
              asset.name.includes(".zip") ||
              asset.name.includes(".tar.gz") ||
              asset.name.includes("installer") ||
              asset.name.includes("setup"),
          );

          this.notifyCallback("app-update:available", {
            version: release.tag_name,
            releaseNotes: release.body,
            publishedAt: release.published_at,
            downloadUrl:
              downloadAsset?.browser_download_url || release.html_url,
            prerelease: release.prerelease,
          });
        } else {
          this.status.updateAvailable = false;
          this.notifyCallback("app-update:not-available");
        }
      }

      this.status.checking = false;

      return {
        updateAvailable: this.status.updateAvailable,
        currentVersion: this.status.currentVersion,
        latestVersion: this.status.latestVersion,
        releaseNotes: release?.body,
        downloadUrl: release?.html_url,
      };
    } catch (error) {
      this.status.checking = false;
      this.status.error = (error as Error).message;

      errorLogger.logError(error as Error, {
        service: "AutoUpdater",
        operation: "checkForUpdates",
        currentVersion: this.status.currentVersion,
      });

      this.notifyCallback("app-update:error", error);

      return {
        updateAvailable: false,
        currentVersion: this.status.currentVersion,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Download the update (redirect to download URL)
   */
  public async downloadUpdate(): Promise<UpdateDownloadResult> {
    try {
      this.status.downloading = true;
      this.status.error = undefined;

      // For web apps, we redirect to the download URL rather than downloading automatically
      // The UI should prompt the user to download manually
      this.notifyCallback("app-update:download-ready", {
        downloadUrl: `https://github.com/${this.config.githubRepo}/releases/latest`,
      });

      this.status.downloading = false;
      this.status.updateDownloaded = true;

      return { success: true };
    } catch (error) {
      this.status.downloading = false;
      this.status.error = (error as Error).message;

      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * For web apps, this redirects to the installation instructions
   */
  public quitAndInstall(): void {
    // In a web app, "installation" means refreshing or navigating to the new version
    window.location.reload();
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
        await this.checkForUpdates();
      } catch (error) {
        errorLogger.logError(error as Error, {
          service: "AutoUpdater",
          operation: "initialize",
        });
      }
    }
  }

  /**
   * Set a callback for update notifications
   */
  public setNotificationCallback(callback: UpdateNotificationCallback): void {
    this.notificationCallback = callback;
  }

  /**
   * Get the update source being used
   */
  public getUpdateSource(): string {
    if (this.config.githubRepo) {
      return `GitHub: ${this.config.githubRepo}`;
    }
    return "github";
  }

  /**
   * Check if auto-updates are enabled
   */
  public isEnabled(): boolean {
    // Web apps can always check for updates, but installation is manual
    return true;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = null;
    }
  }
}

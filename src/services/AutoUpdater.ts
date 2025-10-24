import type { App, BrowserWindow } from 'electron';
import type { AppUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

export interface AutoUpdaterConfig {
  checkOnStartup?: boolean;
  updateServerUrl?: string;
  channel?: 'stable' | 'beta' | 'alpha';
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
      channel: 'stable',
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
        provider: 'generic',
        url: this.config.updateServerUrl,
      });
    }

    // Configure logging (electron-updater's Logger type doesn't expose transports)
    // Just log that we're configured
    this.updater.logger = this.updater.logger || console;

    console.log('[AutoUpdater] Configured for', this.getUpdateSource());
  }

  /**
   * Register event listeners for update events
   */
  private registerListeners(): void {
    this.updater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      this.status.checking = true;
      this.notifyWindow('app-update:checking');
    });

    this.updater.on('update-available', (info: UpdateInfo) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.status.checking = false;
      this.status.updateAvailable = true;
      this.status.latestVersion = info.version;
      this.notifyWindow('app-update:available', { version: info.version });
    });

    this.updater.on('update-not-available', (info: UpdateInfo) => {
      console.log('[AutoUpdater] No update available. Current version:', info.version);
      this.status.checking = false;
      this.status.updateAvailable = false;
      this.notifyWindow('app-update:not-available');
    });

    this.updater.on('download-progress', (progress: ProgressInfo) => {
      this.status.downloading = true;
      this.status.downloadProgress = progress.percent;

      console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(2)}%`);

      // Notify callbacks
      for (const callback of this.downloadProgressCallbacks) {
        callback(progress.percent);
      }

      // Notify window
      this.notifyWindow('app-update:download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    this.updater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.status.downloading = false;
      this.status.updateDownloaded = true;
      this.notifyWindow('app-update:downloaded', { version: info.version });
    });

    this.updater.on('error', (error: Error) => {
      console.error('[AutoUpdater] Error:', error);
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = error.message;
      this.notifyWindow('app-update:error', { error: error.message });
    });
  }

  /**
   * Initialize the auto-updater
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled()) {
      console.log('[AutoUpdater] Disabled in development mode');
      return;
    }

    if (this.config.checkOnStartup) {
      // Check for updates on startup (but don't auto-download)
      await this.updater.checkForUpdatesAndNotify();
    }
  }

  /**
   * Manually check for updates
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      console.log('[AutoUpdater] Manual update check requested');

      const result = await this.updater.checkForUpdates();

      if (result && result.updateInfo) {
        // Update internal status
        this.status.updateAvailable = true;
        this.status.latestVersion = result.updateInfo.version;

        return {
          updateAvailable: true,
          currentVersion: this.status.currentVersion,
          latestVersion: result.updateInfo.version,
        };
      }

      return {
        updateAvailable: false,
        currentVersion: this.status.currentVersion,
      };
    } catch (error) {
      console.error('[AutoUpdater] Check failed:', error);
      return {
        updateAvailable: false,
        currentVersion: this.status.currentVersion,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Download the available update
   */
  public async downloadUpdate(): Promise<UpdateDownloadResult> {
    try {
      console.log('[AutoUpdater] Starting update download...');
      await this.updater.downloadUpdate();

      return { success: true };
    } catch (error) {
      console.error('[AutoUpdater] Download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Quit and install the downloaded update
   */
  public quitAndInstall(): void {
    console.log('[AutoUpdater] Quitting and installing update...');

    // Notify window before quitting
    this.notifyWindow('app-update:installing');

    // Quit and install (silent, force restart)
    this.updater.quitAndInstall(true, true);
  }

  /**
   * Set the main window for notifications
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Register callback for download progress
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
   * Get update source (github, custom, etc.)
   */
  public getUpdateSource(): string {
    return this.config.updateServerUrl ? 'custom' : 'github';
  }

  /**
   * Check if auto-updater is enabled (only in production)
   */
  public isEnabled(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Notify main window of update events
   */
  private notifyWindow(channel: string, data?: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // Only send data if provided
      if (data !== undefined) {
        this.mainWindow.webContents.send(channel, data);
      } else {
        this.mainWindow.webContents.send(channel);
      }
    }
  }
}

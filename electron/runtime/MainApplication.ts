import type { App, BrowserWindow } from 'electron';

export interface ProcessManagerContract {
  enforceSingleInstance(): boolean;
  cleanupOnStartup(): Promise<void>;
  trackPort(port: number, label: string): Promise<void>;
  registerShutdownHandlers(): void;
  onShutdown(handler: () => Promise<void> | void): void;
}

export interface AutoUpdaterContract {
  initialize(): Promise<void> | void;
  setMainWindow(window: BrowserWindow): void;
}

export interface LoggerContract {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface MainApplicationDependencies {
  env: { NODE_ENV?: string };
  app: Pick<App, 'whenReady' | 'on' | 'quit'>;
  createMainWindow: () => BrowserWindow;
  setupIpcHandlers: () => void;
  initializeDatabase: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  initializeKeyManager: () => Promise<unknown>;
  processManager: ProcessManagerContract;
  createAutoUpdater: () => AutoUpdaterContract;
  logger: LoggerContract;
}

export class MainApplication {
  private deps: MainApplicationDependencies;
  private mainWindow: BrowserWindow | null = null;

  constructor(deps: MainApplicationDependencies) {
    this.deps = deps;
  }

  public async start(): Promise<void> {
    const { processManager, env } = this.deps;

    if (!processManager.enforceSingleInstance()) {
      throw new Error('Another instance is already running');
    }

    await this.deps.app.whenReady();

    if (env.NODE_ENV !== 'test') {
      await processManager.cleanupOnStartup();
    }

    await this.deps.initializeKeyManager();

    await this.deps.initializeDatabase();

    this.mainWindow = this.deps.createMainWindow();
    this.deps.setupIpcHandlers();

    if (env.NODE_ENV === 'production') {
      const autoUpdater = this.deps.createAutoUpdater();
      autoUpdater.setMainWindow(this.mainWindow);
      await autoUpdater.initialize();
    }

    await processManager.trackPort(5176, 'Vite Dev Server');

    processManager.registerShutdownHandlers();
    processManager.onShutdown(async () => {
      try {
        await this.deps.closeDatabase();
      } catch (error) {
        this.deps.logger.error('Failed to close database during shutdown', {
          error: error instanceof Error ? error.message : error,
        });
      }
    });
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

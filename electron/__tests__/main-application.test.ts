import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import { MainApplication, type MainApplicationDependencies } from '../runtime/MainApplication.ts';

function createDeps(overrides: Partial<MainApplicationDependencies> = {}): {
  deps: MainApplicationDependencies;
  windowStub: BrowserWindow;
  autoUpdaterMock: {
    initialize: ReturnType<typeof vi.fn>;
    setMainWindow: ReturnType<typeof vi.fn>;
  };
} {
  const windowStub = {
    on: vi.fn(),
    once: vi.fn(),
    webContents: {
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      loadURL: vi.fn(),
      openDevTools: vi.fn(),
    },
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
  } as unknown as BrowserWindow;

  const autoUpdaterMock = {
    initialize: vi.fn(),
    setMainWindow: vi.fn(),
  };

  const deps: MainApplicationDependencies = {
    env: { NODE_ENV: 'development' },
    app: {
      whenReady: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      quit: vi.fn(),
    } as any,
    createMainWindow: vi.fn().mockReturnValue(windowStub),
    setupIpcHandlers: vi.fn(),
    initializeDatabase: vi.fn().mockResolvedValue(undefined),
    closeDatabase: vi.fn().mockResolvedValue(undefined),
    initializeKeyManager: vi.fn().mockResolvedValue({}),
    processManager: {
      enforceSingleInstance: vi.fn().mockReturnValue(true),
      cleanupOnStartup: vi.fn().mockResolvedValue(undefined),
      trackPort: vi.fn().mockResolvedValue(undefined),
      registerShutdownHandlers: vi.fn(),
      onShutdown: vi.fn(),
    } as any,
    createAutoUpdater: vi.fn().mockReturnValue(autoUpdaterMock as any),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };

  return {
    deps: { ...deps, ...overrides },
    windowStub,
    autoUpdaterMock,
  };
}

describe('MainApplication.start', () => {
  let base: ReturnType<typeof createDeps>;

  beforeEach(() => {
    vi.useRealTimers();
    base = createDeps();
  });

  it('initializes core services and IPC after app is ready', async () => {
    const app = new MainApplication(base.deps);

    await app.start();

    expect(base.deps.app.whenReady).toHaveBeenCalled();
    expect(base.deps.initializeDatabase).toHaveBeenCalled();
    expect(base.deps.initializeKeyManager).toHaveBeenCalled();
    expect(base.deps.setupIpcHandlers).toHaveBeenCalled();
    expect(base.deps.createMainWindow).toHaveBeenCalled();
    expect(base.deps.processManager.trackPort).toHaveBeenCalledWith(5176, 'Vite Dev Server');
  });

  it('skips auto updater outside production', async () => {
    const { deps } = base;
    deps.env.NODE_ENV = 'development';
    const app = new MainApplication(deps);

    await app.start();

    expect(deps.createAutoUpdater).not.toHaveBeenCalled();
  });

  it('configures auto updater in production', async () => {
    const { deps, autoUpdaterMock, windowStub } = base;
    deps.env.NODE_ENV = 'production';
    const app = new MainApplication(deps);

    await app.start();

    expect(deps.createAutoUpdater).toHaveBeenCalled();
    expect(autoUpdaterMock.setMainWindow).toHaveBeenCalledWith(windowStub);
    expect(autoUpdaterMock.initialize).toHaveBeenCalled();
  });

  it('runs process cleanup on startup when not in test mode', async () => {
    const { deps } = base;
    deps.env.NODE_ENV = 'production';
    const app = new MainApplication(deps);

    await app.start();

    expect(deps.processManager.cleanupOnStartup).toHaveBeenCalled();
  });

  it('skips process cleanup in test mode', async () => {
    const { deps } = base;
    deps.env.NODE_ENV = 'test';
    const app = new MainApplication(deps);

    await app.start();

    expect(deps.processManager.cleanupOnStartup).not.toHaveBeenCalled();
  });

  it('registers shutdown handlers that close the database', async () => {
    const { deps } = base;
    const onShutdownCallbacks: Array<() => Promise<void> | void> = [];
    deps.processManager.onShutdown = vi.fn().mockImplementation((cb) => onShutdownCallbacks.push(cb));
    const app = new MainApplication(deps);

    await app.start();

    expect(deps.processManager.registerShutdownHandlers).toHaveBeenCalled();
    expect(onShutdownCallbacks).toHaveLength(1);

    await onShutdownCallbacks[0]();

    expect(deps.closeDatabase).toHaveBeenCalled();
  });

  it('throws when single instance lock is not acquired', async () => {
    const { deps } = base;
    deps.processManager.enforceSingleInstance = vi.fn().mockReturnValue(false);
    const app = new MainApplication(deps);

    await expect(app.start()).rejects.toThrow('Another instance is already running');
  });
});

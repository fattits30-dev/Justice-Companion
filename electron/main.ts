import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { initializeDatabase, closeDatabase } from './database-init';

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  /**
   * Create the main application window with security settings
   */
  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 768,
      show: false, // Show after ready-to-show event
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true, // ✅ CRITICAL: Isolate renderer context
        nodeIntegration: false, // ✅ CRITICAL: Disable Node.js in renderer
        sandbox: true, // ✅ CRITICAL: Enable sandbox
        webSecurity: true, // ✅ CRITICAL: Enable web security
        allowRunningInsecureContent: false
      },
      backgroundColor: '#0B1120' // Match app dark theme
    });

    // Load app (dev server or production build)
    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools(); // Open DevTools in development
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready (prevents flash)
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    // Handle window close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Security: Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
      const allowedOrigins = [
        'http://localhost:5173', // Dev server
        'file://' // Production build
      ];

      const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin));
      if (!isAllowed) {
        event.preventDefault();
        console.warn(`[Security] Blocked navigation to: ${url}`);
      }
    });

    // Security: Prevent opening new windows
    mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
  }

  /**
   * App ready event - initialize database, create window, setup IPC
   */
  app.on('ready', async () => {
    try {
      console.log('[Main] App ready');

      // Initialize database first
      await initializeDatabase();

      // Create window and setup IPC
      createWindow();
      setupIpcHandlers();
    } catch (error) {
      console.error('[Main] Startup failed:', error);
      app.quit();
    }
  });

  /**
   * All windows closed - quit app (Windows/Linux)
   */
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  /**
   * Activate event - recreate window (macOS)
   */
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  /**
   * Second instance attempted - focus existing window
   */
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  /**
   * Before quit - cleanup
   */
  app.on('before-quit', () => {
    console.log('[Main] App shutting down...');

    // Close database connections
    closeDatabase();

    // TODO: Save window state
  });

  /**
   * Handle uncaught exceptions
   */
  process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception:', error);
    // TODO: Log to audit trail
  });

  /**
   * Handle unhandled promise rejections
   */
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
    // TODO: Log to audit trail
  });
}

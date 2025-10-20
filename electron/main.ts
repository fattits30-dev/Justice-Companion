// Load environment variables BEFORE everything else
import 'dotenv/config';

import { app, BrowserWindow, safeStorage } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { setupIpcHandlers } from './ipc-handlers.ts';
import { initializeDatabase, closeDatabase } from './database-init.ts';
import { KeyManager } from '../src/services/KeyManager.ts';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-reload Electron in development when files change
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: false, // Vite handles renderer HMR
      ignore: [
        'node_modules',
        'dist',
        'release',
        'src/**/*', // Renderer code handled by Vite
      ],
    });
    console.log('[Main] 🔥 Auto-reload enabled for Electron main process');
  } catch (err) {
    console.log('[Main] electron-reloader not available:', err);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

// Global KeyManager instance (initialized in app.ready)
let keyManager: KeyManager | null = null;

/**
 * Get KeyManager instance (throws if not initialized)
 */
export function getKeyManager(): KeyManager {
  if (!keyManager) {
    throw new Error('KeyManager not initialized. Call only after app.ready.');
  }
  return keyManager;
}

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  /**
   * Create the main application window with security settings
   */
  function createWindow(): void {
    console.log('[Main] Creating window...');
    const preloadPath = path.join(__dirname, '../dist/electron/preload.js');
    console.log('[Main] Preload path:', preloadPath);

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 768,
      show: false, // Show after ready-to-show event
      webPreferences: {
        preload: preloadPath,
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
      mainWindow.loadURL('http://localhost:5176');
      mainWindow.webContents.openDevTools(); // Open DevTools in development
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready (prevents flash)
    mainWindow.once('ready-to-show', () => {
      console.log('[Main] Window ready-to-show event fired');
      mainWindow?.show();
      console.log('[Main] Window shown');
    });

    // Debug: Log when page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Main] Page finished loading');
    });

    // Debug: Log preload errors
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
      console.error('[Main] Preload error:', preloadPath, error);
    });

    // Handle window close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Security: Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
      const allowedOrigins = [
        'http://localhost:5176', // Dev server
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
   * Initialize KeyManager with automatic .env migration
   */
  async function initializeKeyManager(): Promise<void> {
    try {
      // Create KeyManager instance
      keyManager = new KeyManager(safeStorage, app.getPath('userData'));

      // Check if key exists in safeStorage
      if (!keyManager.hasKey()) {
        console.warn('[Main] No key in safeStorage, checking .env...');

        // Try to migrate from .env
        const envKey = process.env.ENCRYPTION_KEY_BASE64;
        if (envKey) {
          console.warn('[Main] Migrating key from .env to safeStorage...');
          keyManager.migrateFromEnv(envKey);
          console.warn('[Main] ✅ Key migrated successfully');
          console.warn('[Main] ⚠️  IMPORTANT: Remove ENCRYPTION_KEY_BASE64 from .env file');
        } else {
          throw new Error(
            'No encryption key found in safeStorage or .env. ' +
            'Generate one with: node scripts/generate-encryption-key.js'
          );
        }
      } else {
        console.warn('[Main] ✅ Encryption key loaded from safeStorage');
      }

      // Validate key can be loaded
      const key = keyManager.getKey();
      if (key.length !== 32) {
        throw new Error(`Invalid key length: ${key.length} bytes`);
      }
    } catch (error) {
      console.error('[Main] KeyManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * App ready event - initialize database, KeyManager, create window, setup IPC
   */
  app.on('ready', async () => {
    try {
      console.warn('[Main] App ready');

      // Initialize KeyManager (must be after app.ready for safeStorage)
      await initializeKeyManager();

      // Initialize database
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
    console.warn('[Main] App shutting down...');

    // Close database connections (fire-and-forget - app is quitting anyway)
    closeDatabase().catch((err) => console.error('[Main] Error during cleanup:', err));

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

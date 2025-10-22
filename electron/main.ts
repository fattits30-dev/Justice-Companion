// Load environment variables BEFORE everything else
import 'dotenv/config';

import { app, BrowserWindow, safeStorage, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { setupIpcHandlers } from './ipc-handlers.ts';
import { initializeDatabase, closeDatabase } from './database-init.ts';
import { KeyManager } from '../src/services/KeyManager.ts';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-reload Electron in development when files change
// NOTE: electron-reloader is not compatible with ES modules
// Developers must manually restart Electron when making main process changes
if (process.env.NODE_ENV !== 'production') {
  console.log('[Main] Running in development mode (manual restart required for main process changes)');
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
   * Initialize KeyManager with comprehensive health checks and user-friendly error dialogs
   */
  async function initializeKeyManager(): Promise<void> {
    try {
      console.log('[Main] 🔍 Starting KeyManager health check...');

      // ======================================================================
      // Health Check 1: safeStorage availability
      // ======================================================================
      if (!safeStorage.isEncryptionAvailable()) {
        const error = new Error('Encryption not available on this system');
        console.error('[Main] ❌ safeStorage.isEncryptionAvailable() = false');

        dialog.showErrorBox(
          'Encryption Unavailable',
          'Justice Companion cannot start because OS-level encryption is unavailable.\n\n' +
          'This usually means:\n' +
          '• Windows: DPAPI is not available\n' +
          '• macOS: Keychain is not accessible\n' +
          '• Linux: libsecret is not installed\n\n' +
          'Please ensure your operating system\'s secure storage is available.'
        );
        throw error;
      }
      console.log('[Main] ✓ safeStorage is available');

      // ======================================================================
      // Health Check 2: KeyManager initialization
      // ======================================================================
      try {
        keyManager = new KeyManager(safeStorage, app.getPath('userData'));
      } catch (error) {
        console.error('[Main] ❌ KeyManager construction failed:', error);

        dialog.showErrorBox(
          'KeyManager Initialization Failed',
          'Failed to initialize encryption key manager.\n\n' +
          `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
          'This is a critical error. The application cannot continue.'
        );
        throw error;
      }
      console.log('[Main] ✓ KeyManager created');

      // ======================================================================
      // Health Check 3: Encryption key availability
      // ======================================================================
      if (!keyManager.hasKey()) {
        console.warn('[Main] ⚠️  No key in safeStorage, checking .env...');

        // Try to migrate from .env
        const envKey = process.env.ENCRYPTION_KEY_BASE64;
        if (envKey) {
          console.warn('[Main] 📦 Migrating key from .env to safeStorage...');

          try {
            keyManager.migrateFromEnv(envKey);
            console.warn('[Main] ✅ Key migrated successfully');

            // Show success dialog with warning
            dialog.showMessageBox({
              type: 'warning',
              title: 'Encryption Key Migrated',
              message: 'Your encryption key has been migrated to secure storage.',
              detail:
                'The key was moved from .env to OS-level encrypted storage.\n\n' +
                '⚠️ IMPORTANT: For security, you should delete ENCRYPTION_KEY_BASE64 ' +
                'from your .env file. The app no longer needs it.',
              buttons: ['OK']
            });
          } catch (error) {
            console.error('[Main] ❌ Key migration failed:', error);

            dialog.showErrorBox(
              'Key Migration Failed',
              'Failed to migrate encryption key from .env to secure storage.\n\n' +
              `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
              'Please check your .env file and ensure ENCRYPTION_KEY_BASE64 is a valid base64-encoded 32-byte key.'
            );
            throw error;
          }
        } else {
          const error = new Error('No encryption key found');
          console.error('[Main] ❌ No key in safeStorage or .env');

          dialog.showErrorBox(
            'No Encryption Key Found',
            'Justice Companion cannot start because no encryption key was found.\n\n' +
            'This is a critical security component. To fix:\n\n' +
            '1. Generate a new key:\n' +
            '   node scripts/generate-encryption-key.js\n\n' +
            '2. Add to .env file:\n' +
            '   ENCRYPTION_KEY_BASE64=<generated-key>\n\n' +
            '3. Restart the application\n\n' +
            'The key will be automatically migrated to secure storage on first run.'
          );
          throw error;
        }
      } else {
        console.log('[Main] ✓ Encryption key found in safeStorage');
      }

      // ======================================================================
      // Health Check 4: Key integrity validation
      // ======================================================================
      let key: Buffer;
      try {
        key = keyManager.getKey();
      } catch (error) {
        console.error('[Main] ❌ Failed to load encryption key:', error);

        dialog.showErrorBox(
          'Encryption Key Load Failed',
          'Failed to load the encryption key from secure storage.\n\n' +
          `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
          'This usually means:\n' +
          '• The key file is corrupted\n' +
          '• Insufficient file permissions\n' +
          '• OS-level encryption service failure\n\n' +
          'You may need to regenerate the encryption key.'
        );
        throw error;
      }

      // Validate key length
      if (key.length !== 32) {
        const error = new Error(`Invalid key length: ${key.length} bytes (expected 32)`);
        console.error('[Main] ❌', error.message);

        dialog.showErrorBox(
          'Invalid Encryption Key',
          `The encryption key has an invalid length: ${key.length} bytes (expected 32).\n\n` +
          'This key cannot be used for AES-256-GCM encryption.\n\n' +
          'Please regenerate the key:\n' +
          '  node scripts/generate-encryption-key.js'
        );
        throw error;
      }
      console.log('[Main] ✓ Encryption key valid (32 bytes)');

      // ======================================================================
      // Health Check 5: Test encryption/decryption
      // ======================================================================
      try {
        const testData = 'health-check-test-data';
        const encrypted = safeStorage.encryptString(testData);
        const decrypted = safeStorage.decryptString(encrypted);

        if (decrypted !== testData) {
          throw new Error('Encryption round-trip failed: data mismatch');
        }
        console.log('[Main] ✓ Encryption round-trip test passed');
      } catch (error) {
        console.error('[Main] ❌ Encryption test failed:', error);

        dialog.showErrorBox(
          'Encryption Test Failed',
          'The encryption system failed a basic round-trip test.\n\n' +
          `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
          'This indicates a problem with the OS-level encryption service.\n' +
          'Your data may not be secure. The application cannot continue.'
        );
        throw error;
      }

      console.log('[Main] ✅ All KeyManager health checks passed');
    } catch (error) {
      console.error('[Main] ❌ KeyManager health check failed:', error);
      throw error;
    }
  }

  /**
   * App ready event - initialize database, KeyManager, create window, setup IPC
   */
  app.on('ready', async () => {
    try {
      console.warn('[Main] App ready - starting initialization...');

      // Initialize KeyManager with health checks (must be after app.ready for safeStorage)
      await initializeKeyManager();

      // Initialize database
      await initializeDatabase();

      // Create window and setup IPC
      createWindow();
      setupIpcHandlers();

      console.warn('[Main] ✅ Application startup complete');
    } catch (error) {
      console.error('[Main] ❌ Startup failed:', error);

      // Show error dialog if not already shown by health check
      if (error instanceof Error && !error.message.includes('Encryption') && !error.message.includes('KeyManager')) {
        dialog.showErrorBox(
          'Application Startup Failed',
          'Justice Companion failed to start.\n\n' +
          `Error: ${error.message}\n\n` +
          'Please check the logs for more details.\n' +
          'The application will now exit.'
        );
      }

      // Quit application
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

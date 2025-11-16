import "dotenv/config";

import { app, BrowserWindow, safeStorage } from "electron";
import path from "path";

// IPC handlers removed - using Python FastAPI backend instead
import { initializeDatabase } from './database-init';
import { KeyManager } from '../src/services/KeyManager';
import { BackupScheduler } from '../src/services/backup/BackupScheduler';
import { databaseManager } from '../src/db/database';
import { setKeyManager } from './services/KeyManagerService';
import { PythonProcessManager } from './services/PythonProcessManager';
import { BackendProcessManager } from './services/BackendProcessManager';
import { logger } from '../src/utils/logger';

const env = { NODE_ENV: process.env.NODE_ENV };

let keyManager: KeyManager | null = null;
let backupScheduler: BackupScheduler | null = null;
let pythonServiceManager: PythonProcessManager | null = null;
let backendProcessManager: BackendProcessManager | null = null;

export function getKeyManager(): KeyManager {
  if (!keyManager) {
    throw new Error("KeyManager not initialized. Call only after app.ready.");
  }
  return keyManager;
}

function createMainWindow(): BrowserWindow {
  logger.info("Creating main window", { service: "Main" });

  // In bundled code, main.js and preload.js are in the same directory (dist/electron)
  const preloadPath = path.join(__dirname, "preload.js");
  logger.info("Preload path", { service: "Main", path: preloadPath });

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    backgroundColor: "#0B1120",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Disable autofill to prevent DevTools errors
      disableBlinkFeatures: "Autofill",
    },
  });

  if (env.NODE_ENV === "development") {
    window.loadURL("http://localhost:5176");
    window.webContents.openDevTools();
  } else if (env.NODE_ENV === "test") {
    // In test mode, load the built files (dist/electron/../renderer = dist/renderer)
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  window.once("ready-to-show", () => {
    logger.info("Window ready-to-show", { service: "Main" });
    window.show();
  });

  window.webContents.on("did-finish-load", () => {
    logger.info("Renderer finished loading", { service: "Main" });
  });

  window.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  return window;
}

app.whenReady().then(async () => {
  logger.info("App is ready", { service: "Main" });

  try {
    // Initialize KeyManager BEFORE database (database needs it for decryption)
    keyManager = new KeyManager(safeStorage, app.getPath("userData"));

    // Set key manager in service to break circular dependencies
    setKeyManager(keyManager);

    // Auto-migrate encryption key from .env to safeStorage if needed
    if (!keyManager.hasKey()) {
      const envKey = process.env.ENCRYPTION_KEY_BASE64;
      if (envKey) {
        logger.info("Migrating encryption key from .env to safeStorage...", { service: "Main", operation: "KeyMigration" });
        keyManager.migrateFromEnv(envKey);
        logger.info("✓ Key migrated successfully", { service: "Main", operation: "KeyMigration" });
        logger.warn(
          "IMPORTANT: Remove ENCRYPTION_KEY_BASE64 from .env file for security", { service: "Main", security: true }
        );
      } else {
        throw new Error(
          "No encryption key found. Either:\n" +
            "1. Set ENCRYPTION_KEY_BASE64 in .env file, OR\n" +
            "2. Run key generation script"
        );
      }
    }

    try {
      await initializeDatabase();
      logger.info("Database initialized", { service: "Main" });
    } catch (dbError) {
      if (env.NODE_ENV === "test") {
        logger.warn(
          "Database initialization failed in test mode, continuing anyway", { service: "Main", error: dbError }
        );
      } else {
        logger.error("Failed to initialize database", { service: "Main", error: dbError });
        throw dbError;
      }
    }

    // Skip MainApplication for now to get basic functionality working
    // const _mainApp = new MainApplication(deps);

    // Start Python FastAPI backend (HTTP REST API on port 8000)
    try {
      backendProcessManager = new BackendProcessManager({
        port: 8000,
        host: '127.0.0.1',
        autoRestart: true,
        healthCheckInterval: 30000, // Check health every 30 seconds
        maxRestarts: 5,
      });
      await backendProcessManager.start();
      logger.info("Python FastAPI backend started successfully", { service: "Main", port: 8000 });
    } catch (error) {
      logger.error("Failed to start Python FastAPI backend", { service: "Main", error });
      // This is critical - app won't work without backend
      if (env.NODE_ENV !== "test") {
        throw error;
      }
    }

    // Start Python AI service
    try {
      pythonServiceManager = new PythonProcessManager({ port: 5051 });
      await pythonServiceManager.start();
      logger.info("Python AI service started successfully", { service: "Main", port: 5051 });
    } catch (error) {
      logger.error("Failed to start Python AI service, will use TypeScript fallback", { service: "Main", error });
      // Don't crash the app - TypeScript AI service can be used as fallback
    }

    // Initialize backup scheduler
    try {
      backupScheduler = BackupScheduler.getInstance(
        databaseManager.getDatabase()
      );
      await backupScheduler.start();
      logger.info("Backup scheduler started", { service: "Main" });
    } catch (error) {
      logger.error("Failed to start backup scheduler", { service: "Main", error });
      // Don't crash the app if scheduler fails to start
    }

    createMainWindow();
  } catch (error) {
    if (env.NODE_ENV === "test") {
      logger.error("Failed to initialize app in test mode, continuing anyway", { service: "Main", error });
      // In test mode, don't quit - let the window try to load anyway
      createMainWindow();
    } else {
      logger.error("Failed to initialize app", { service: "Main", error });
      app.quit();
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("before-quit", async () => {
  // Gracefully stop Python FastAPI backend
  if (backendProcessManager) {
    try {
      await backendProcessManager.stop();
      logger.info("Python FastAPI backend stopped", { service: "Main" });
    } catch (error) {
      logger.error("Error stopping Python FastAPI backend", { service: "Main", error });
    }
  }

  // Gracefully stop Python AI service
  if (pythonServiceManager) {
    try {
      await pythonServiceManager.stop();
      logger.info("Python AI service stopped", { service: "Main" });
    } catch (error) {
      logger.error("Error stopping Python AI service", { service: "Main", error });
    }
  }

  // Gracefully stop backup scheduler
  if (backupScheduler) {
    try {
      await backupScheduler.stop();
      logger.info("Backup scheduler stopped", { service: "Main" });
    } catch (error) {
      logger.error("Error stopping backup scheduler", { service: "Main", error });
    }
  }
});

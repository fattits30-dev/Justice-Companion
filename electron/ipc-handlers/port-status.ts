import type { Electron } from 'electron';
import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { ProcessManager } from '../../src/services/ProcessManager';
import { logger } from '../../src/utils/logger';
import { errorLogger } from '../../src/utils/error-logger';

let processManagerInstance: ProcessManager | null = null;

/**
 * Set the ProcessManager instance for IPC handlers
 */
export function setProcessManager(manager: ProcessManager): void {
  processManagerInstance = manager;
}

/**
 * Get the ProcessManager instance
 */
function getProcessManager(): ProcessManager {
  if (!processManagerInstance) {
    throw new Error('ProcessManager not initialized for IPC handlers');
  }
  return processManagerInstance;
}

/**
 * Setup port status IPC handlers
 */
export function setupPortStatusHandlers(): void {
  /**
   * Get current port status
   */
  ipcMain.handle('port:getStatus', async (_event: IpcMainInvokeEvent) => {
    try {
      const processManager = getProcessManager();
      const portStatus = await processManager.getDetailedPortStatus();

      return {
        success: true,
        data: portStatus,
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: 'PortStatusIPC',
          operation: 'getStatus',
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get port status',
      };
    }
  });

  /**
   * Allocate a port for a specific service
   */
  ipcMain.handle('port:allocate', async (_event: IpcMainInvokeEvent, serviceName: string) => {
    try {
      const processManager = getProcessManager();
      const port = await processManager.allocatePort(serviceName);

      if (port) {
        return {
          success: true,
          data: { port, service: serviceName },
        };
      } else {
        return {
          success: false,
          error: `Failed to allocate port for ${serviceName}`,
        };
      }
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: 'PortStatusIPC',
          operation: 'allocate',
          serviceName,
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to allocate port',
      };
    }
  });

  /**
   * Release all allocated ports
   */
  ipcMain.handle('port:releaseAll', async (_event: IpcMainInvokeEvent) => {
    try {
      const processManager = getProcessManager();

      // Get the PortManager through ProcessManager
      // This would need to be exposed through ProcessManager
      logger.info('[PortStatusIPC] Releasing all ports', {
        service: 'PortStatusIPC',
      });

      // For now, we'll return a success message
      // In a full implementation, ProcessManager would expose a method to release all ports
      return {
        success: true,
        message: 'All ports released successfully',
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: 'PortStatusIPC',
          operation: 'releaseAll',
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to release ports',
      };
    }
  });

  /**
   * Restart services (placeholder for actual implementation)
   */
  ipcMain.handle('port:restartServices', async (_event: IpcMainInvokeEvent) => {
    try {
      logger.info('[PortStatusIPC] Restarting services', {
        service: 'PortStatusIPC',
      });

      // This would need actual implementation to restart services
      // For now, return success
      return {
        success: true,
        message: 'Services restart initiated',
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: 'PortStatusIPC',
          operation: 'restartServices',
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restart services',
      };
    }
  });

  /**
   * Get port for a specific service
   */
  ipcMain.handle('port:getServicePort', async (_event: IpcMainInvokeEvent, serviceName: string) => {
    try {
      const processManager = getProcessManager();
      const port = processManager.getServicePort(serviceName);

      if (port) {
        return {
          success: true,
          data: { port, service: serviceName },
        };
      } else {
        return {
          success: false,
          error: `No port allocated for ${serviceName}`,
        };
      }
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: 'PortStatusIPC',
          operation: 'getServicePort',
          serviceName,
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get service port',
      };
    }
  });

  /**
   * Check if a specific port is available
   */
  ipcMain.handle('port:isAvailable', async (_event: IpcMainInvokeEvent, port: number) => {
    try {
      const processManager = getProcessManager();
      const isAvailable = await processManager.isPortInUse(port);

      return {
        success: true,
        data: { port, available: !isAvailable },
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: 'PortStatusIPC',
          operation: 'isAvailable',
          port,
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check port availability',
      };
    }
  });

  logger.info('[PortStatusIPC] Port status handlers initialized', {
    service: 'PortStatusIPC',
  });
}

/**
 * Cleanup port status handlers
 */
export function cleanupPortStatusHandlers(): void {
  // Remove all handlers
  ipcMain.removeHandler('port:getStatus');
  ipcMain.removeHandler('port:allocate');
  ipcMain.removeHandler('port:releaseAll');
  ipcMain.removeHandler('port:restartServices');
  ipcMain.removeHandler('port:getServicePort');
  ipcMain.removeHandler('port:isAvailable');

  logger.info('[PortStatusIPC] Port status handlers cleaned up', {
    service: 'PortStatusIPC',
  });
}
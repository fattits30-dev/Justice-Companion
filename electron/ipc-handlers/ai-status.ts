/**
 * AI Service Status IPC Handlers
 * 
 * Provides IPC endpoints for checking Python AI service status,
 * model availability, and configuration.
 */

import { ipcMain } from 'electron';
import { getPythonProcessManager } from '../services/PythonProcessManager';
import { createPythonAIClient } from '../../src/services/PythonAIClient';
import { logger } from '../../src/utils/logger';

export function setupAIStatusHandlers(): void {
  /**
   * Get AI service status
   */
  ipcMain.handle('ai:getStatus', async () => {
    try {
      const pythonManager = getPythonProcessManager();
      
      if (!pythonManager) {
        return {
          running: false,
          healthy: false,
          port: 5051,
          host: '127.0.0.1',
          modelProvider: 'Not initialized',
          modelReady: false,
          error: 'Python process manager not initialized'
        };
      }

      const status = pythonManager.getStatus();
      const healthy = await pythonManager.checkHealth();
      
      // If service is healthy, get model info
      let modelInfo = {
        modelProvider: 'Unknown',
        modelReady: false
      };
      
      if (healthy) {
        try {
          const client = createPythonAIClient();
          const info = await client.getInfo();
          modelInfo = {
            modelProvider: info.model_provider,
            modelReady: info.model_ready
          };
        } catch (error) {
          logger.warn('[AI Status] Failed to get model info', { error });
        }
      }

      return {
        ...status,
        healthy,
        ...modelInfo,
        error: null
      };
    } catch (error) {
      logger.error('[AI Status] Error getting status', { error });
      return {
        running: false,
        healthy: false,
        port: 5051,
        host: '127.0.0.1',
        modelProvider: 'Error',
        modelReady: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Restart AI service
   */
  ipcMain.handle('ai:restart', async () => {
    try {
      const pythonManager = getPythonProcessManager();
      
      if (!pythonManager) {
        throw new Error('Python process manager not initialized');
      }

      await pythonManager.restart();
      
      // Wait a bit for service to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const healthy = await pythonManager.checkHealth();
      
      return {
        success: healthy,
        error: healthy ? null : 'Service restarted but health check failed'
      };
    } catch (error) {
      logger.error('[AI Status] Error restarting service', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Check if AI service is available
   */
  ipcMain.handle('ai:isAvailable', async () => {
    try {
      const pythonManager = getPythonProcessManager();
      
      if (!pythonManager || !pythonManager.isRunning()) {
        return false;
      }

      const client = createPythonAIClient();
      return await client.isAvailable();
    } catch (error) {
      logger.error('[AI Status] Error checking availability', { error });
      return false;
    }
  });

  /**
   * Get AI service configuration
   */
  ipcMain.handle('ai:getConfig', async () => {
    try {
      const hasHFToken = !!process.env.HF_TOKEN || !!process.env.HUGGINGFACE_TOKEN;
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
      const useLocalModels = process.env.USE_LOCAL_MODELS === 'true';
      
      return {
        hasHFToken,
        hasOpenAIKey,
        useLocalModels,
        configured: hasHFToken || hasOpenAIKey || useLocalModels,
        preferredProvider: useLocalModels ? 'local' : (hasHFToken ? 'huggingface' : (hasOpenAIKey ? 'openai' : 'none'))
      };
    } catch (error) {
      logger.error('[AI Status] Error getting config', { error });
      return {
        hasHFToken: false,
        hasOpenAIKey: false,
        useLocalModels: false,
        configured: false,
        preferredProvider: 'none'
      };
    }
  });

  logger.info('[AI Status] IPC handlers registered');
}
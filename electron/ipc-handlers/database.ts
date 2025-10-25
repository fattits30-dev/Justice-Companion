import { ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import {
  successResponse,
  errorResponse,
  formatError,
  IPCErrorCode,
  type IPCResponse,
} from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { getDb } from '../../src/db/database.ts';
import { CaseRepository } from '../../src/repositories/CaseRepository.ts';
import { EvidenceRepository } from '../../src/repositories/EvidenceRepository.ts';

/**
 * ===== DATABASE HANDLERS =====
 * Channels: db:migrate, db:backup, db:status
 *           dashboard:stats
 *           secure-storage:* (5 channels)
 *           ui:logError
 *           ai:configure, ai:testConnection
 * Total: 13 channels
 */
export function setupDatabaseHandlers(): void {
  // Run database migrations
  ipcMain.handle('db:migrate', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:migrate called');

      // TODO: Create backup before migration
      // TODO: Call runMigrations() from migrate.ts
      // TODO: Return detailed migration results

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_MIGRATED,
        userId: null, // System operation
        resourceType: 'database',
        resourceId: 'main',
        action: 'migrate',
        success: true,
      });

      console.warn('[IPC] Migrations placeholder - full implementation pending');
      return successResponse({
        migrationsRun: 0,
        message: 'Migration system integration pending',
      });
    } catch (error) {
      console.error('[IPC] db:migrate error:', error);
      return formatError(error);
    }
  });

  // Create database backup
  ipcMain.handle('db:backup', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:backup called');

      // TODO: Implement backup functionality
      // TODO: Copy database file with timestamp
      // TODO: Return backup file path

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_CREATED,
        userId: null, // TODO: Extract from session
        resourceType: 'database',
        resourceId: 'main',
        action: 'backup',
        success: true,
      });

      console.warn('[IPC] Backup placeholder - full implementation pending');
      return successResponse({
        backupPath: null,
        message: 'Backup system integration pending',
      });
    } catch (error) {
      console.error('[IPC] db:backup error:', error);
      return formatError(error);
    }
  });

  // Get migration status
  ipcMain.handle('db:status', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:status called');

      // TODO: Query migrations table
      // TODO: Check for pending migrations
      // TODO: Return current schema version

      console.warn('[IPC] Status check placeholder - full implementation pending');
      return successResponse({
        currentVersion: 0,
        pendingMigrations: [],
        message: 'Migration status integration pending',
      });
    } catch (error) {
      console.error('[IPC] db:status error:', error);
      return formatError(error);
    }
  });
}

/**
 * ===== DASHBOARD HANDLERS =====
 */
export function setupDashboardHandlers(): void {
  // Get dashboard stats (case counts, evidence counts, recent activity)
  ipcMain.handle(
    'dashboard:stats',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] dashboard:stats called by user:', userId);

          const db = getDb();
          const caseRepo = new CaseRepository(db);
          const evidenceRepo = new EvidenceRepository(db);

          // Get all cases for user
          const allCases = caseRepo.findByUserId(userId);

          // Count active cases (status = 'active')
          const activeCases = allCases.filter(c => c.status === 'active').length;

          // Get evidence count for user
          const allEvidence = evidenceRepo.findByUserId(userId);

          // Calculate recent activity (cases updated in last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentActivity = allCases.filter(c =>
            new Date(c.updatedAt) > sevenDaysAgo
          ).length;

          // Get recent 5 cases (sorted by updatedAt descending)
          const recentCases = allCases
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5)
            .map(c => ({
              id: String(c.id),
              title: c.caseTitle,
              status: c.status,
              lastUpdated: c.updatedAt
            }));

          const stats = {
            totalCases: allCases.length,
            activeCases,
            totalEvidence: allEvidence.length,
            recentActivity,
            recentCases
          };

          console.warn('[IPC] Dashboard stats:', stats);
          return successResponse(stats);
        } catch (error) {
          console.error('[IPC] dashboard:stats error:', error);
          return formatError(error);
        }
      });
    }
  );
}

/**
 * Setup secure storage IPC handlers
 * Uses Electron safeStorage API for OS-native encryption
 */
export function setupSecureStorageHandlers(): void {
  // Check if encryption is available
  ipcMain.handle(
    'secure-storage:isEncryptionAvailable',
    async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
      try {
        const available = safeStorage.isEncryptionAvailable();
        return successResponse({ available });
      } catch (error) {
        console.error('[IPC] secure-storage:isEncryptionAvailable error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Securely store a value
  ipcMain.handle(
    'secure-storage:set',
    async (_event: IpcMainInvokeEvent, key: string, value: string): Promise<IPCResponse> => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          return errorResponse('Encryption not available on this system', IPCErrorCode.INTERNAL_ERROR);
        }

        // Encrypt the value
        const encrypted = safeStorage.encryptString(value);

        // Store in a Map (in-memory for now, could be persisted to file)
        if (!global.secureStorageMap) {
          global.secureStorageMap = new Map<string, Buffer>();
        }
        global.secureStorageMap.set(key, encrypted);

        console.log(`[IPC] Securely stored key: ${key}`);
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] secure-storage:set error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Retrieve a securely stored value
  ipcMain.handle(
    'secure-storage:get',
    async (_event: IpcMainInvokeEvent, key: string): Promise<IPCResponse> => {
      try {
        if (!global.secureStorageMap || !global.secureStorageMap.has(key)) {
          return successResponse({ value: null });
        }

        const encrypted = global.secureStorageMap.get(key);
        if (!encrypted) {
          return successResponse({ value: null });
        }

        // Decrypt the value
        const decrypted = safeStorage.decryptString(encrypted);
        return successResponse({ value: decrypted });
      } catch (error) {
        console.error('[IPC] secure-storage:get error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Delete a securely stored value
  ipcMain.handle(
    'secure-storage:delete',
    async (_event: IpcMainInvokeEvent, key: string): Promise<IPCResponse> => {
      try {
        if (global.secureStorageMap) {
          global.secureStorageMap.delete(key);
        }
        console.log(`[IPC] Deleted secure storage key: ${key}`);
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] secure-storage:delete error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Clear all securely stored values
  ipcMain.handle(
    'secure-storage:clearAll',
    async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
      try {
        if (global.secureStorageMap) {
          global.secureStorageMap.clear();
        }
        console.log('[IPC] Cleared all secure storage');
        return successResponse({ success: true });
      } catch (error) {
        console.error('[IPC] secure-storage:clearAll error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );
}

/**
 * ===== UI ERROR LOGGING HANDLERS =====
 * Handlers for logging UI errors to main process
 */
export function setupUIHandlers(): void {
  // Log UI errors to console and audit log
  ipcMain.handle(
    'ui:logError',
    async (_event: IpcMainInvokeEvent, errorData: any): Promise<IPCResponse> => {
      try {
        const { error, errorInfo, componentStack, location } = errorData;

        // Log to console
        console.error('[UI Error]', {
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          componentStack,
          location,
        });

        // Log to audit log if available
        if (errorData.userId) {
          logAuditEvent({
            eventType: AuditEventType.UI_ERROR,
            userId: errorData.userId,
            resourceType: 'ui',
            resourceId: 'error',
            action: 'read',
            success: false,
            errorMessage: error?.message || 'UI component error',
            details: {
              componentStack,
              location,
            },
          });
        }

        return successResponse({ logged: true });
      } catch (err) {
        console.error('[IPC] ui:logError error:', err);
        return errorResponse(
          formatError(err, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );
}

/**
 * ===== AI CONFIGURATION HANDLERS =====
 * Handlers for configuring and testing AI service (Groq)
 */
export function setupAIConfigHandlers(): void {
  // Import resetGroqService from chat.ts
  const { resetGroqService } = require('./chat.ts');
  const { getGroqService } = require('./chat.ts');

  // Configure AI service (save API key)
  ipcMain.handle(
    'ai:configure',
    async (
      _event: IpcMainInvokeEvent,
      config: { apiKey: string; provider?: 'openai' | 'groq' | 'anthropic' | 'google' | 'cohere' | 'mistral'; model?: string; organization?: string }
    ): Promise<IPCResponse> => {
      try {
        const { apiKey, provider = 'groq', model, organization } = config;

        // Validate API key
        if (!apiKey || apiKey.trim().length === 0) {
          throw new Error('API key is required');
        }

        // Note: For now, only Groq has full streaming implementation
        // Other providers will be added as needed
        console.warn(`[IPC] Configuring AI provider: ${provider}`);

        // Save to SecureStorage with provider-specific keys
        if (!safeStorage.isEncryptionAvailable()) {
          throw new Error('Encryption not available on this system');
        }

        if (!global.secureStorageMap) {
          global.secureStorageMap = new Map<string, Buffer>();
        }

        // Save API key with provider-specific key
        const apiKeyStorageKey = `${provider}_api_key`;
        const encryptedApiKey = safeStorage.encryptString(apiKey);
        global.secureStorageMap.set(apiKeyStorageKey, encryptedApiKey);

        // Save model if provided
        if (model) {
          const modelStorageKey = `${provider}_model`;
          const encryptedModel = safeStorage.encryptString(model);
          global.secureStorageMap.set(modelStorageKey, encryptedModel);
        }

        // Save organization if provided (for OpenAI)
        if (organization) {
          const orgStorageKey = `${provider}_organization`;
          const encryptedOrg = safeStorage.encryptString(organization);
          global.secureStorageMap.set(orgStorageKey, encryptedOrg);
        }

        // Reset Groq service so it will reload the new key (only for Groq)
        if (provider === 'groq') {
          resetGroqService();
        }

        console.warn(`[IPC] ${provider} API key configured successfully`);
        return successResponse({
          success: true,
          message: 'API key saved successfully',
        });
      } catch (error) {
        console.error('[IPC] ai:configure error:', error);
        return errorResponse(
          formatError(error, IPCErrorCode.INTERNAL_ERROR),
          IPCErrorCode.INTERNAL_ERROR
        );
      }
    }
  );

  // Test AI connection
  ipcMain.handle(
    'ai:testConnection',
    async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
      try {
        // Get Groq service
        const groqService = getGroqService();

        // Check if configured
        if (!groqService.isConfigured()) {
          return successResponse({
            success: false,
            message: 'AI service not configured. Please set your API key first.',
            connected: false,
          });
        }

        // Test connection with a minimal API call
        console.warn('[IPC] Testing Groq connection...');
        const testMessage = 'Hello';
        const response = await groqService.chat([
          { role: 'user', content: testMessage },
        ]);

        if (response && response.length > 0) {
          console.warn('[IPC] Groq connection test successful');
          return successResponse({
            success: true,
            message: 'Connection successful! AI service is ready.',
            connected: true,
          });
        } else {
          throw new Error('Empty response from AI service');
        }
      } catch (error) {
        console.error('[IPC] ai:testConnection error:', error);

        // Provide user-friendly error messages
        let errorMessage = 'Connection failed';
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your API key and try again.';
          } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else {
            errorMessage = `Connection failed: ${error.message}`;
          }
        }

        return successResponse({
          success: false,
          message: errorMessage,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

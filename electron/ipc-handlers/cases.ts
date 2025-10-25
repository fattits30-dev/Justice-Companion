import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  successResponse,
  type IPCResponse,
} from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import {
  withAuthorization,
  getAuthorizationMiddleware,
} from '../utils/authorization-wrapper.ts';
import { getDb } from '../../src/db/database.ts';
import { CaseRepository } from '../../src/repositories/CaseRepository.ts';
import { CaseFactsRepository } from '../../src/repositories/CaseFactsRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { caseService } from '../../src/services/CaseService.ts';
import * as caseSchemas from '../../src/middleware/schemas/case-schemas.ts';
import { EncryptionService } from '../../src/services/EncryptionService.ts';
import { getKeyManager } from '../main.ts';
import {
  CaseNotFoundError,
  DatabaseError,
  RequiredFieldError,
} from '../../src/errors/DomainErrors.ts';

/**
 * ===== CASE MANAGEMENT HANDLERS =====
 * Channels: case:create, case:list, case:get, case:update, case:delete
 *           case-fact:create, case-fact:list
 * Total: 7 channels
 */
export function setupCaseHandlers(): void {
  // Create new case
  ipcMain.handle(
    'case:create',
    async (_event: IpcMainInvokeEvent, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:create called by user:', userId);

          // Validate input with Zod (schema expects { input: { ...fields } })
          const validatedData = caseSchemas.caseCreateSchema.parse({ input: data });

          // Add userId to the case data
          const caseData = {
            ...validatedData.input,
            userId, // Associate case with authenticated user
          };

          // Call CaseService.createCase()
          const result = caseService.createCase(caseData);

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_CREATED,
            userId,
            resourceType: 'case',
            resourceId: result.id.toString(),
            action: 'create',
            details: {
              title: result.title,
              caseType: result.caseType,
            },
            success: true,
          });

          console.warn('[IPC] Case created successfully:', result.id);
          return result;
        } catch (error) {
          // Use domain-specific errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              const dbError = new DatabaseError('create case', error.message);
              logAuditEvent({
                eventType: AuditEventType.CASE_CREATED,
                userId,
                resourceType: 'case',
                resourceId: 'unknown',
                action: 'create',
                success: false,
                errorMessage: dbError.message,
              });
              throw dbError;
            }

            if (message.includes('required') || message.includes('missing')) {
              const validationError = new RequiredFieldError('case data');
              logAuditEvent({
                eventType: AuditEventType.CASE_CREATED,
                userId,
                resourceType: 'case',
                resourceId: 'unknown',
                action: 'create',
                success: false,
                errorMessage: validationError.message,
              });
              throw validationError;
            }
          }

          // Log failed creation
          logAuditEvent({
            eventType: AuditEventType.CASE_CREATED,
            userId,
            resourceType: 'case',
            resourceId: 'unknown',
            action: 'create',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List all cases
  ipcMain.handle('case:list', async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
    return withAuthorization(sessionId, async (userId) => {
      try {
        console.warn('[IPC] case:list called by user:', userId);

        // Get only cases belonging to the authenticated user
        const allCases = caseService.getAllCases();

        // Filter cases by userId
        const userCases = allCases.filter((c) => c.userId === userId);

        console.warn('[IPC] Retrieved', userCases.length, 'cases for user:', userId);
        return userCases;
      } catch (error) {
        console.error('[IPC] case:list error:', error);
        throw error; // withAuthorization will handle error formatting
      }
    });
  });

  // Get case by ID
  ipcMain.handle(
    'case:get',
    async (_event: IpcMainInvokeEvent, id: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:get called by user:', userId, 'for case:', id);

          // Validate ID with Zod
          const validatedData = caseSchemas.caseGetByIdSchema.parse({ id });

          // Verify user owns this case
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.getCaseById()
          const caseData = caseService.getCaseById(validatedData.id);

          if (!caseData) {
            throw new Error(`Case with ID ${id} not found`);
          }

          // Log audit event (viewing case)
          logAuditEvent({
            eventType: AuditEventType.CASE_VIEWED,
            userId,
            resourceType: 'case',
            resourceId: caseData.id.toString(),
            action: 'view',
            success: true,
          });

          console.warn('[IPC] Case retrieved:', caseData.id);
          return caseData;
        } catch (error) {
          console.error('[IPC] case:get error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Update case
  ipcMain.handle(
    'case:update',
    async (_event: IpcMainInvokeEvent, id: unknown, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:update called by user:', userId, 'for case:', id);

          // Validate input with Zod (schema expects { id, input: { ...fields } })
          const validatedData = caseSchemas.caseUpdateSchema.parse({ id, input: data });

          // Verify user owns this case before update
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.updateCase()
          const result = caseService.updateCase(validatedData.id, validatedData.input);

          if (!result) {
            throw new CaseNotFoundError(validatedData.id);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_UPDATED,
            userId,
            resourceType: 'case',
            resourceId: result.id.toString(),
            action: 'update',
            details: {
              fieldsUpdated: Object.keys(validatedData.input),
            },
            success: true,
          });

          console.warn('[IPC] Case updated successfully:', result.id);
          return result;
        } catch (error) {
          console.error('[IPC] case:update error:', error);

          // Log failed update
          logAuditEvent({
            eventType: AuditEventType.CASE_UPDATED,
            userId,
            resourceType: 'case',
            resourceId: String(id),
            action: 'update',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Delete case
  ipcMain.handle(
    'case:delete',
    async (_event: IpcMainInvokeEvent, id: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case:delete called by user:', userId, 'for case:', id);

          // Validate ID with Zod
          const validatedData = caseSchemas.caseDeleteSchema.parse({ id });

          // Verify user owns this case before deletion
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.id, userId);

          // Call CaseService.deleteCase()
          const deleted = caseService.deleteCase(validatedData.id);

          if (!deleted) {
            throw new CaseNotFoundError(validatedData.id);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_DELETED,
            userId,
            resourceType: 'case',
            resourceId: validatedData.id.toString(),
            action: 'delete',
            success: true,
          });

          console.warn('[IPC] Case deleted successfully:', id);
          return { success: true };
        } catch (error) {
          console.error('[IPC] case:delete error:', error);

          // Log failed deletion
          logAuditEvent({
            eventType: AuditEventType.CASE_DELETED,
            userId,
            resourceType: 'case',
            resourceId: String(id),
            action: 'delete',
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Create case fact
  ipcMain.handle(
    'case-fact:create',
    async (_event: IpcMainInvokeEvent, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case-fact:create called by user:', userId);

          // Get repositories and encryption service
          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const keyManager = getKeyManager();
          const encryptionService = new EncryptionService(keyManager);
          const caseFactsRepository = new CaseFactsRepository(encryptionService, auditLogger);

          // Validate that the case belongs to the user
          const caseRepository = new CaseRepository(encryptionService, auditLogger);
          const caseData = data as { caseId: number; factContent: string; factCategory: string; importance?: string };
          const caseRecord = caseRepository.findById(caseData.caseId);

          if (!caseRecord || caseRecord.userId !== userId) {
            throw new Error('Case not found or unauthorized');
          }

          // Create the case fact
          const result = caseFactsRepository.create(caseData);

          // Log audit event
          logAuditEvent({
            eventType: 'case_fact.create' as AuditEventType,
            userId,
            resourceType: 'case_fact',
            resourceId: result.id.toString(),
            action: 'create',
            details: {
              caseId: caseData.caseId,
              category: caseData.factCategory,
            },
            success: true,
          });

          console.warn('[IPC] Case fact created successfully:', result.id);
          return successResponse(result);
        } catch (error) {
          console.error('[IPC] case-fact:create error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List case facts
  ipcMain.handle(
    'case-fact:list',
    async (_event: IpcMainInvokeEvent, caseId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] case-fact:list called by user:', userId, 'for case:', caseId);

          // Get repositories
          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const keyManager = getKeyManager();
          const encryptionService = new EncryptionService(keyManager);
          const caseFactsRepository = new CaseFactsRepository(encryptionService, auditLogger);

          // Validate that the case belongs to the user
          const caseRepository = new CaseRepository(encryptionService, auditLogger);
          const caseRecord = caseRepository.findById(caseId);

          if (!caseRecord || caseRecord.userId !== userId) {
            throw new Error('Case not found or unauthorized');
          }

          // Get case facts
          const facts = caseFactsRepository.findByCaseId(caseId);

          console.warn('[IPC] Retrieved', facts.length, 'case facts');
          return successResponse(facts);
        } catch (error) {
          console.error('[IPC] case-fact:list error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );
}

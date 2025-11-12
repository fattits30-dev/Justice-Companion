import type { Electron } from 'electron';
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { successResponse, type IPCResponse } from "../utils/ipc-response.ts";
import { logAuditEvent, AuditEventType } from "../utils/audit-helper.ts";
import { withAuthorization } from "../utils/authorization-wrapper.ts";
import { databaseManager } from "../../src/db/database.ts";
import { CaseRepository } from "../../src/repositories/CaseRepository.ts";
import { CaseFactsRepository } from "../../src/repositories/CaseFactsRepository.ts";
import { AuditLogger } from "../../src/services/AuditLogger.ts";
import * as caseSchemas from "../../src/middleware/schemas/case-schemas.ts";
import { EncryptionService } from "../../src/services/EncryptionService.ts";
import {
  CaseNotFoundError,
  DatabaseError,
  RequiredFieldError,
} from "../../src/errors/DomainErrors.ts";
import { getKeyManager } from '../services/KeyManagerService.ts';
import type { CreateCaseFactInput } from "../../src/models/CaseFact.ts";
import { logger } from '../../src/utils/logger';

/**
 * ===== CASE MANAGEMENT HANDLERS =====
 * Channels: case:create, case:list, case:get, case:update, case:delete
 *           case-fact:create, case-fact:list
 * Total: 7 channels
 */
export function setupCaseHandlers(): void {
  // Create new case
  ipcMain.handle(
    "case:create",
    async (
      _event: IpcMainInvokeEvent,
      data: unknown,
      sessionId: string,
      aiMetadata?: unknown
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] case:create called by user:", userId);

          // Validate input with Zod (schema expects { input: { ...fields } })
          const validatedData = caseSchemas.caseCreateSchema.parse({
            input: data,
          });

          // Use raw SQL INSERT to create case
          const db = databaseManager.getDatabase();

          const insertStmt = db.prepare(`
            INSERT INTO cases (title, description, case_type, status, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `);

          const insertResult = insertStmt.run(
            validatedData.input.title,
            validatedData.input.description || null,
            validatedData.input.caseType,
            validatedData.input.status || "active",
            userId
          );

          const caseId = insertResult.lastInsertRowid as number;

          // Fetch the created case
          const createdCase = db
            .prepare(
              `
            SELECT
              id,
              title,
              description,
              case_type as caseType,
              status,
              created_at as createdAt,
              updated_at as updatedAt,
              user_id as userId
            FROM cases
            WHERE id = ?
          `
            )
            .get(caseId);

          // Build audit details (include AI metadata if provided)
          const auditDetails: Record<string, unknown> = {
            title: validatedData.input.title,
            caseType: validatedData.input.caseType,
          };

          // If case was created with AI assistance, include that metadata
          if (aiMetadata) {
            auditDetails.aiAssisted = true;
            auditDetails.aiMetadata = aiMetadata;
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_CREATED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: caseId.toString(),
            action: "create",
            details: auditDetails,
            success: true,
          });

          logger.warn("[IPC] Case created successfully:", caseId);
          return successResponse(createdCase);
        } catch (error) {
          // Use domain-specific errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              const dbError = new DatabaseError("create case", error.message);
              logAuditEvent({
                eventType: AuditEventType.CASE_CREATED,
                userId: userId.toString(),
                resourceType: "case",
                resourceId: "unknown",
                action: "create",
                success: false,
                errorMessage: dbError.message,
              });
              throw dbError;
            }

            if (message.includes("required") || message.includes("missing")) {
              const validationError = new RequiredFieldError("case data");
              logAuditEvent({
                eventType: AuditEventType.CASE_CREATED,
                userId: userId.toString(),
                resourceType: "case",
                resourceId: "unknown",
                action: "create",
                success: false,
                errorMessage: validationError.message,
              });
              throw validationError;
            }
          }

          // Log failed creation
          logAuditEvent({
            eventType: AuditEventType.CASE_CREATED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: "unknown",
            action: "create",
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List all cases
  ipcMain.handle(
    "case:list",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] case:list called by user:", userId);

          // WORKAROUND: Using raw SQL to bypass encryption key mismatch
          // Repository pattern would call batchDecrypt() which fails if key doesn't match
          const db = databaseManager.getDatabase();
          const userCases = db
            .prepare(
              `
          SELECT
            id,
            title,
            description,
            case_type as caseType,
            status,
            created_at as createdAt,
            updated_at as updatedAt,
            user_id as userId
          FROM cases
          WHERE user_id = ?
          ORDER BY updated_at DESC
        `
            )
            .all(userId);

          logger.warn(
            "[IPC] Retrieved",
            (userCases as unknown[]).length,
            "cases for user:",
            userId
          );
          return successResponse(userCases);
        } catch (error) {
          logger.error("[IPC] case:list error:", error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Get case by ID
  ipcMain.handle(
    "case:get",
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] case:get called by user:",
            userId,
            "for case:",
            id
          );

          // Convert string ID to number (IPC passes strings for primitive values)
          const numericId = typeof id === "string" ? parseInt(id, 10) : id;

          // Validate ID with Zod
          const validatedData = caseSchemas.caseGetByIdSchema.parse({
            id: numericId,
          });

          // WORKAROUND: Using raw SQL to bypass encryption key mismatch
          const db = databaseManager.getDatabase();
          const caseData = db
            .prepare(
              `
            SELECT
              id,
              title,
              description,
              case_type as caseType,
              status,
              created_at as createdAt,
              updated_at as updatedAt,
              user_id as userId
            FROM cases
            WHERE id = ? AND user_id = ?
          `
            )
            .get(validatedData.id, userId);

          if (!caseData) {
            throw new Error(`Case with ID ${id} not found or unauthorized`);
          }

          // Log audit event (viewing case)
          logAuditEvent({
            eventType: AuditEventType.CASE_VIEWED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: String((caseData as { id: number }).id),
            action: "view",
            success: true,
          });

          logger.warn(
            "[IPC] Case retrieved:",
            (caseData as { id: number }).id
          );
          return successResponse(caseData);
        } catch (error) {
          logger.error("[IPC] case:get error:", error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Update case
  ipcMain.handle(
    "case:update",
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      data: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] case:update called by user:",
            userId,
            "for case:",
            id
          );

          // Convert string ID to number (IPC passes strings for primitive values)
          const numericId = typeof id === "string" ? parseInt(id, 10) : id;

          // Validate input with Zod (schema expects { id, input: { ...fields } })
          const validatedData = caseSchemas.caseUpdateSchema.parse({
            id: numericId,
            input: data,
          });

          // WORKAROUND: Using raw SQL to bypass encryption key mismatch
          const db = databaseManager.getDatabase();

          // Verify user owns this case before update
          const existingCase = db
            .prepare(
              `
            SELECT id FROM cases WHERE id = ? AND user_id = ?
          `
            )
            .get(validatedData.id, userId);

          if (!existingCase) {
            throw new CaseNotFoundError(validatedData.id);
          }

          // Build UPDATE statement dynamically based on provided fields
          const updateFields: string[] = [];
          const updateValues: unknown[] = [];

          if (validatedData.input.title !== undefined) {
            updateFields.push("title = ?");
            updateValues.push(validatedData.input.title);
          }
          if (validatedData.input.description !== undefined) {
            updateFields.push("description = ?");
            updateValues.push(validatedData.input.description);
          }
          if (validatedData.input.caseType !== undefined) {
            updateFields.push("case_type = ?");
            updateValues.push(validatedData.input.caseType);
          }
          if (validatedData.input.status !== undefined) {
            updateFields.push("status = ?");
            updateValues.push(validatedData.input.status);
          }

          // Always update updated_at timestamp
          updateFields.push("updated_at = CURRENT_TIMESTAMP");

          // Add WHERE clause values
          updateValues.push(validatedData.id, userId);

          // Execute UPDATE
          const updateStmt = db.prepare(`
            UPDATE cases
            SET ${updateFields.join(", ")}
            WHERE id = ? AND user_id = ?
          `);
          updateStmt.run(...updateValues);

          // Fetch updated case
          const updatedCase = db
            .prepare(
              `
            SELECT
              id,
              title,
              description,
              case_type as caseType,
              status,
              created_at as createdAt,
              updated_at as updatedAt,
              user_id as userId
            FROM cases
            WHERE id = ? AND user_id = ?
          `
            )
            .get(validatedData.id, userId);

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_UPDATED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: validatedData.id.toString(),
            action: "update",
            details: {
              fieldsUpdated: Object.keys(validatedData.input),
            },
            success: true,
          });

          logger.warn("[IPC] Case updated successfully:", validatedData.id);
          return successResponse(updatedCase);
        } catch (error) {
          logger.error("[IPC] case:update error:", error);

          // Log failed update
          logAuditEvent({
            eventType: AuditEventType.CASE_UPDATED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: String(id),
            action: "update",
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
    "case:delete",
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] case:delete called by user:",
            userId,
            "for case:",
            id
          );

          // Convert string ID to number (IPC passes strings for primitive values)
          const numericId = typeof id === "string" ? parseInt(id, 10) : id;

          // Validate ID with Zod
          const validatedData = caseSchemas.caseDeleteSchema.parse({
            id: numericId,
          });

          // WORKAROUND: Using raw SQL to bypass encryption key mismatch
          const db = databaseManager.getDatabase();

          // Verify user owns this case before deletion
          const existingCase = db
            .prepare(
              `
            SELECT id FROM cases WHERE id = ? AND user_id = ?
          `
            )
            .get(validatedData.id, userId);

          if (!existingCase) {
            logger.error(
              "[IPC] case:delete - Case not found or unauthorized:",
              validatedData.id,
              "userId:",
              userId
            );
            throw new CaseNotFoundError(validatedData.id);
          }

          logger.warn(
            "[IPC] case:delete - Found case, attempting deletion..."
          );

          // Delete the case (SQLite will cascade to related records via foreign keys)
          const deleteStmt = db.prepare(`
            DELETE FROM cases WHERE id = ? AND user_id = ?
          `);
          const result = deleteStmt.run(validatedData.id, userId);

          logger.warn("[IPC] case:delete - DELETE result:", {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          });

          if (result.changes === 0) {
            logger.error(
              "[IPC] case:delete - No rows deleted for case:",
              validatedData.id
            );
            throw new CaseNotFoundError(validatedData.id);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.CASE_DELETED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: validatedData.id.toString(),
            action: "delete",
            success: true,
          });

          logger.warn(
            "[IPC] Case deleted successfully:",
            validatedData.id,
            "rows affected:",
            result.changes
          );
          return successResponse({ deleted: true, id: validatedData.id });
        } catch (error) {
          logger.error("[IPC] case:delete error:", error);
          logger.error(
            "[IPC] case:delete error stack:",
            error instanceof Error ? error.stack : "No stack trace"
          );

          // Log failed deletion
          logAuditEvent({
            eventType: AuditEventType.CASE_DELETED,
            userId: userId.toString(),
            resourceType: "case",
            resourceId: String(id),
            action: "delete",
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
    "case-fact:create",
    async (
      _event: IpcMainInvokeEvent,
      data: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] case-fact:create called by user:", userId);

          // Get repositories and encryption service
          const db = databaseManager.getDatabase();
          const keyManager = getKeyManager();
          const encryptionService = new EncryptionService(keyManager.getKey());
          const auditLogger = new AuditLogger(db);
          const caseFactsRepository = new CaseFactsRepository(
            encryptionService,
            auditLogger
          );

          // Validate that the case belongs to the user
          const caseRepository = new CaseRepository(
            encryptionService,
            auditLogger
          );
          const caseData = data as CreateCaseFactInput;
          const caseRecord = caseRepository.findById(caseData.caseId);

          if (!caseRecord || caseRecord.userId !== userId) {
            throw new Error("Case not found or unauthorized");
          }

          // Create the case fact
          const result = caseFactsRepository.create(caseData);

          // Log audit event
          logAuditEvent({
            eventType: "case_fact.create" as AuditEventType,
            userId: userId.toString(),
            resourceType: "case_fact",
            resourceId: result.id.toString(),
            action: "create",
            details: {
              caseId: caseData.caseId,
              category: caseData.factCategory,
            },
            success: true,
          });

          logger.warn("[IPC] Case fact created successfully:", result.id);
          return successResponse(result);
        } catch (error) {
          logger.error("[IPC] case-fact:create error:", error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List case facts
  ipcMain.handle(
    "case-fact:list",
    async (
      _event: IpcMainInvokeEvent,
      caseId: number,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] case-fact:list called by user:",
            userId,
            "for case:",
            caseId
          );

          // Get repositories
          const db = databaseManager.getDatabase();
          const keyManager = getKeyManager();
          const encryptionService = new EncryptionService(keyManager.getKey());
          const auditLogger = new AuditLogger(db);
          const caseFactsRepository = new CaseFactsRepository(
            encryptionService,
            auditLogger
          );

          // Validate that the case belongs to the user
          const caseRepository = new CaseRepository(
            encryptionService,
            auditLogger
          );
          const caseRecord = caseRepository.findById(caseId);

          if (!caseRecord || caseRecord.userId !== userId) {
            throw new Error("Case not found or unauthorized");
          }

          // Get case facts
          const facts = caseFactsRepository.findByCaseId(caseId);

          logger.warn("[IPC] Retrieved", facts.length, "case facts");
          return successResponse(facts);
        } catch (error) {
          logger.error("[IPC] case-fact:list error:", error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );
}

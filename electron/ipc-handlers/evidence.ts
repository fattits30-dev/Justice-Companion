import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { type IPCResponse } from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import {
  withAuthorization,
  getAuthorizationMiddleware,
  verifyEvidenceOwnership,
} from '../utils/authorization-wrapper.ts';
import * as evidenceSchemas from '../../src/middleware/schemas/evidence-schemas.ts';
import { getRepositories } from '../../src/repositories.ts';
import { EvidenceNotFoundError } from '../../src/errors/DomainErrors.ts';
import type {
  CreateEvidenceInput,
  EvidenceType,
} from '../../src/domains/evidence/entities/Evidence.ts';

/**
 * ===== EVIDENCE HANDLERS =====
 * Channels: evidence:upload, evidence:list, evidence:delete
 * Total: 3 channels
 */
export function setupEvidenceHandlers(): void {
  const getEvidenceRepository = () => getRepositories().evidenceRepository;

  // Upload/create evidence
  ipcMain.handle(
    "evidence:upload",
    async (
      _event: IpcMainInvokeEvent,
      caseId: unknown,
      data: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] evidence:upload called by user:",
            userId,
            "for case:",
            caseId
          );

          // Validate input with Zod (schema expects { input: { caseId, ...fields } })
          const schemas = evidenceSchemas;
          const inputData = { caseId, ...(data as Record<string, unknown>) };
          const validatedData = schemas.evidenceCreateSchema.parse({
            input: inputData,
          });

          // Verify user owns the case before adding evidence
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(
            validatedData.input.caseId,
            userId
          );

          // Future enhancement: validate file type/size if filePath provided
          // Future enhancement: extract text content when handling PDFs or DOCX files

          // Call EvidenceRepository.create()
          const evidenceRepo = getEvidenceRepository();
          const createInput: CreateEvidenceInput = {
            ...validatedData.input,
            evidenceType: validatedData.input.evidenceType as EvidenceType,
            caseId: validatedData.input.caseId as number,
          };

          const result = evidenceRepo.create(createInput);

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_UPLOADED,
            userId,
            resourceType: "evidence",
            resourceId: result.id.toString(),
            action: "upload",
            details: {
              caseId: result.caseId,
              evidenceType: result.evidenceType,
              title: result.title,
            },
            success: true,
          });

          console.warn("[IPC] Evidence created successfully:", result.id);
          return result;
        } catch (error) {
          console.error("[IPC] evidence:upload error:", error);

          // Log failed upload
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_UPLOADED,
            userId,
            resourceType: "evidence",
            resourceId: "unknown",
            action: "upload",
            success: false,
            errorMessage: String(error),
          });

          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // List evidence for case
  ipcMain.handle(
    "evidence:list",
    async (
      _event: IpcMainInvokeEvent,
      caseId: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] evidence:list called by user:",
            userId,
            "for case:",
            caseId
          );

          // Validate caseId
          const schemas = evidenceSchemas;
          const validatedData = schemas.evidenceGetByCaseSchema.parse({
            caseId,
          });

          // Verify user owns the case
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(validatedData.caseId, userId);

          // Call EvidenceRepository.findByCaseId()
          const evidenceRepo = getEvidenceRepository();
          const evidence = evidenceRepo.findByCaseId(validatedData.caseId);

          console.warn(
            "[IPC] Retrieved",
            evidence.length,
            "evidence items for case",
            caseId
          );
          return evidence;
        } catch (error) {
          console.error("[IPC] evidence:list error:", error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Delete evidence
  ipcMain.handle(
    "evidence:delete",
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] evidence:delete called by user:",
            userId,
            "for evidence:",
            id
          );

          // Validate ID
          const schemas = evidenceSchemas;
          const validatedData = schemas.evidenceDeleteSchema.parse({ id });

          // Verify user owns the case this evidence belongs to
          await verifyEvidenceOwnership(validatedData.id, userId);

          // Call EvidenceRepository.delete()
          const evidenceRepo = getEvidenceRepository();
          const deleted = evidenceRepo.delete(validatedData.id);

          if (!deleted) {
            throw new EvidenceNotFoundError(validatedData.id);
          }

          // Log audit event
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_DELETED,
            userId,
            resourceType: "evidence",
            resourceId: validatedData.id.toString(),
            action: "delete",
            success: true,
          });

          console.warn("[IPC] Evidence deleted successfully:", id);
          return { success: true };
        } catch (error) {
          console.error("[IPC] evidence:delete error:", error);

          // Log failed deletion
          logAuditEvent({
            eventType: AuditEventType.EVIDENCE_DELETED,
            userId,
            resourceType: "evidence",
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
}

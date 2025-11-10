import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { successResponse, type IPCResponse } from "../utils/ipc-response.ts";
import { withAuthorization } from "../utils/authorization-wrapper.ts";
import { databaseManager } from "../../src/db/database.ts";
import { GdprService } from "../../src/services/gdpr/GdprService.ts";
import { EncryptionService } from "../../src/services/EncryptionService.ts";
import { AuditLogger } from "../../src/services/AuditLogger.ts";
import { getKeyManager } from "../services/KeyManagerService";
import {
  GdprComplianceError,
  ConsentRequiredError,
  DataExportError,
  DataDeletionError,
} from "../../src/errors/DomainErrors.ts";

/**
 * ===== GDPR HANDLERS =====
 * Channels: gdpr:export, gdpr:delete
 * Total: 2 channels
 */
export function setupGdprHandlers(): void {
  // Lazy-load GDPR service to avoid circular dependencies
  const getGdprService = () => {
    const db = databaseManager.getDatabase();
    const keyManager = getKeyManager();
    const encryptionKey = keyManager.getKey();
    const encryptionService = new EncryptionService(encryptionKey);
    const auditLogger = new AuditLogger(db);

    return new GdprService(db, encryptionService, auditLogger);
  };

  // Export all user data (GDPR Article 20)
  ipcMain.handle(
    "gdpr:export",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      options?: { format?: "json" | "csv" }
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn("[IPC] gdpr:export called by user:", userId);

          // Export all user data with decryption
          const gdprService = getGdprService();
          const result = await gdprService.exportUserData(
            userId,
            options || {}
          );

          console.warn("[IPC] GDPR export complete:", {
            userId,
            totalRecords: result.metadata.totalRecords,
            filePath: result.filePath,
          });

          return successResponse({
            filePath: result.filePath,
            totalRecords: result.metadata.totalRecords,
            exportDate: result.metadata.exportDate,
            format: result.metadata.format,
          });
        } catch (error) {
          // Use domain-specific errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("rate limit")) {
              throw new GdprComplianceError(
                20,
                "Data portability",
                "Export rate limit exceeded"
              );
            }

            if (message.includes("consent")) {
              throw new ConsentRequiredError(
                "data_processing",
                "export user data"
              );
            }
          }

          // Wrap in DataExportError for consistent handling
          throw new DataExportError(
            error instanceof Error ? error.message : "Export failed",
            userId
          );
        }
      });
    }
  );

  // Delete all user data (GDPR Article 17)
  ipcMain.handle(
    "gdpr:delete",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      options?: {
        confirmed: boolean;
        exportBeforeDelete?: boolean;
        reason?: string;
      }
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn("[IPC] gdpr:delete called by user:", userId);

          // Safety check: Explicit confirmation required
          if (!options?.confirmed) {
            throw new GdprComplianceError(
              17,
              "Right to erasure",
              "Deletion requires explicit confirmation"
            );
          }

          // Delete all user data (preserves audit logs + consents)
          const gdprService = getGdprService();
          const result = await gdprService.deleteUserData(userId, {
            confirmed: true,
            exportBeforeDelete: options.exportBeforeDelete || false,
            reason: options.reason,
          });

          console.warn("[IPC] GDPR deletion complete:", {
            userId,
            deletedTables: Object.keys(result.deletedCounts).length,
            preservedAuditLogs: result.preservedAuditLogs,
            preservedConsents: result.preservedConsents,
          });

          return successResponse({
            success: result.success,
            deletedCounts: result.deletedCounts,
            preservedAuditLogs: result.preservedAuditLogs,
            preservedConsents: result.preservedConsents,
            deletionDate: result.deletionDate,
            exportPath: result.exportPath,
          });
        } catch (error) {
          // Use domain-specific errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("rate limit")) {
              throw new GdprComplianceError(
                17,
                "Right to erasure",
                "Deletion rate limit exceeded"
              );
            }

            if (message.includes("consent")) {
              throw new ConsentRequiredError(
                "data_erasure_request",
                "delete user data"
              );
            }
          }

          // Wrap in DataDeletionError for consistent handling
          throw new DataDeletionError(
            error instanceof Error ? error.message : "Deletion failed",
            userId
          );
        }
      });
    }
  );
}

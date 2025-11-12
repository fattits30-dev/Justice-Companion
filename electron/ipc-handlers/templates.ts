import { logger } from '../../src/utils/logger';
/**
 * IPC Handlers for Template Operations
 * Handles template CRUD, seeding, and application
 *
 * SECURITY: All handlers require session validation via withAuthorization
 * Updated: 2025-11-03 - Fixed hardcoded userId and missing authorization
 */

import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { databaseManager } from "../../src/db/database.ts";
import { EncryptionService } from "../../src/services/EncryptionService.ts";
import { AuditLogger } from "../../src/services/AuditLogger.ts";
import { TemplateRepository } from "../../src/repositories/TemplateRepository.ts";
import { CaseRepository } from "../../src/repositories/CaseRepository.ts";
import { DeadlineRepository } from "../../src/repositories/DeadlineRepository.ts";
import { TemplateService } from "../../src/services/TemplateService.ts";
import { TemplateSeeder } from "../../src/services/TemplateSeeder.ts";
import { withAuthorization } from "../utils/authorization-wrapper.ts";
import type { IPCResponse } from "../utils/ipc-response.ts";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
} from "../../src/models/CaseTemplate.ts";
import {
  DatabaseError,
  TemplateNotFoundError,
  ValidationError,
  RequiredFieldError,
} from "../../src/errors/DomainErrors.ts";

// Initialize services (shared across handlers)
let templateService: TemplateService | null = null;
let templateSeeder: TemplateSeeder | null = null;

function getTemplateService(): TemplateService {
  if (!templateService) {
    const db = databaseManager.getDatabase();
    const encryptionService = new EncryptionService();
    const auditLogger = new AuditLogger(db);

    const templateRepo = new TemplateRepository(
      db,
      encryptionService,
      auditLogger
    );
    const caseRepo = new CaseRepository(encryptionService, auditLogger);
    const deadlineRepo = new DeadlineRepository(
      db,
      encryptionService,
      auditLogger
    );

    templateService = new TemplateService(
      templateRepo,
      caseRepo,
      deadlineRepo,
      auditLogger
    );
  }
  return templateService;
}

function getTemplateSeeder(): TemplateSeeder {
  if (!templateSeeder) {
    const db = databaseManager.getDatabase();
    const encryptionService = new EncryptionService();
    const auditLogger = new AuditLogger(db);
    const templateRepo = new TemplateRepository(
      db,
      encryptionService,
      auditLogger
    );

    templateSeeder = new TemplateSeeder(templateRepo);
  }
  return templateSeeder;
}

/**
 * Register all template IPC handlers
 */
export function setupTemplateHandlers(): void {
  // Get all templates (system + user's custom)
  ipcMain.handle(
    "templates:get-all",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] templates:get-all called by user:", userId);

          const service = getTemplateService();
          const templates = await service.getAllTemplates(userId);

          return { success: true, data: templates };
        } catch (error) {
          logger.error("[IPC] templates:get-all error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("get templates", error.message);
            }
          }

          throw error;
        }
      });
    }
  );

  // Create a new template
  ipcMain.handle(
    "templates:create",
    async (
      _event: IpcMainInvokeEvent,
      input: CreateTemplateInput,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] templates:create called by user:", userId);

          // Override userId from input with validated userId from session
          const validatedInput: CreateTemplateInput = {
            ...input,
            userId, // Use validated userId from session, not from input
          };

          const service = getTemplateService();
          const template = await service.createTemplate(validatedInput);

          return { success: true, data: template };
        } catch (error) {
          logger.error("[IPC] templates:create error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("create template", error.message);
            }

            if (message.includes("required") || message.includes("missing")) {
              throw new RequiredFieldError("template data");
            }

            if (message.includes("invalid") || message.includes("validation")) {
              throw new ValidationError(error.message);
            }
          }

          throw error;
        }
      });
    }
  );

  // Update an existing template
  ipcMain.handle(
    "templates:update",
    async (
      _event: IpcMainInvokeEvent,
      input: UpdateTemplateInput,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] templates:update called by user:",
            userId,
            "for template:",
            input.id
          );

          // Override userId from input with validated userId from session
          const validatedInput: UpdateTemplateInput = {
            ...input,
            userId, // Use validated userId from session
          };

          const service = getTemplateService();
          const template = await service.updateTemplate(validatedInput);

          return { success: true, data: template };
        } catch (error) {
          logger.error("[IPC] templates:update error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("update template", error.message);
            }

            if (message.includes("not found")) {
              throw new TemplateNotFoundError(`Template ${input.id} not found`);
            }

            if (message.includes("invalid") || message.includes("validation")) {
              throw new ValidationError(error.message);
            }
          }

          throw error;
        }
      });
    }
  );

  // Delete a template
  ipcMain.handle(
    "templates:delete",
    async (
      _event: IpcMainInvokeEvent,
      id: number,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] templates:delete called by user:",
            userId,
            "for template:",
            id
          );

          const service = getTemplateService();
          const deleted = await service.deleteTemplate(id, userId);

          if (!deleted) {
            throw new TemplateNotFoundError(`Template ${id} not found`);
          }

          return { success: true };
        } catch (error) {
          logger.error("[IPC] templates:delete error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("delete template", error.message);
            }

            if (message.includes("not found")) {
              throw new TemplateNotFoundError(`Template ${id} not found`);
            }

            if (message.includes("access denied")) {
              throw new ValidationError(
                "Access denied: You can only delete your own templates"
              );
            }
          }

          throw error;
        }
      });
    }
  );

  // Seed default templates (admin operation - requires session validation)
  ipcMain.handle(
    "templates:seed",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] templates:seed called by user:", userId);
          // Note: Admin role check should be added in future for security

          const seeder = getTemplateSeeder();
          await seeder.seedDefaultTemplates();

          return { success: true };
        } catch (error) {
          logger.error("[IPC] templates:seed error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("seed templates", error.message);
            }
          }

          throw error;
        }
      });
    }
  );
}

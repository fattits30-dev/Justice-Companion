/**
 * IPC Handlers for Template Operations
 * Handles template CRUD, seeding, and application
 */

import { ipcMain } from 'electron';
import { databaseManager } from '../../src/db/database.ts';
import { EncryptionService } from '../../src/services/EncryptionService.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { TemplateRepository } from '../../src/repositories/TemplateRepository.ts';
import { CaseRepository } from '../../src/repositories/CaseRepository.ts';
import { DeadlineRepository } from '../../src/repositories/DeadlineRepository.ts';
import { TemplateService } from '../../src/services/TemplateService.ts';
import { TemplateSeeder } from '../../src/services/TemplateSeeder.ts';
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../../src/models/CaseTemplate.ts';
import {
  DatabaseError,
  TemplateNotFoundError,
  ValidationError,
  RequiredFieldError,
} from '../../src/errors/DomainErrors.ts';

// Initialize services (shared across handlers)
let templateService: TemplateService | null = null;
let templateSeeder: TemplateSeeder | null = null;

function getTemplateService(): TemplateService {
  if (!templateService) {
    const db = databaseManager.getDatabase();
    const encryptionService = new EncryptionService();
    const auditLogger = new AuditLogger(db);

    const templateRepo = new TemplateRepository(db, encryptionService, auditLogger);
    const caseRepo = new CaseRepository(encryptionService, auditLogger);
    const deadlineRepo = new DeadlineRepository(db, encryptionService, auditLogger);

    templateService = new TemplateService(
      templateRepo,
      caseRepo,
      deadlineRepo,
      auditLogger,
    );
  }
  return templateService;
}

function getTemplateSeeder(): TemplateSeeder {
  if (!templateSeeder) {
    const db = databaseManager.getDatabase();
    const encryptionService = new EncryptionService();
    const auditLogger = new AuditLogger(db);
    const templateRepo = new TemplateRepository(db, encryptionService, auditLogger);

    templateSeeder = new TemplateSeeder(templateRepo);
  }
  return templateSeeder;
}

/**
 * Register all template IPC handlers
 */
export function setupTemplateHandlers(): void {
  // Get all templates (system + user's custom)
  ipcMain.handle('templates:get-all', async (_event, _sessionId: string) => {
    try {
      // TODO: Extract userId from sessionId (implement session validation)
      const userId = 1; // Placeholder

      const service = getTemplateService();
      const templates = await service.getAllTemplates(userId);

      return { success: true, data: templates };
    } catch (error) {
      console.error('[IPC] templates:get-all error:', error);

      // Wrap generic errors in DomainErrors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('database') || message.includes('sqlite')) {
          throw new DatabaseError('get templates', error.message);
        }
      }

      throw error;
    }
  });

  // Create a new template
  ipcMain.handle('templates:create', async (_event, input: CreateTemplateInput) => {
    try {
      const service = getTemplateService();
      const template = await service.createTemplate(input);

      return { success: true, data: template };
    } catch (error) {
      console.error('[IPC] templates:create error:', error);

      // Wrap generic errors in DomainErrors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('database') || message.includes('sqlite')) {
          throw new DatabaseError('create template', error.message);
        }

        if (message.includes('required') || message.includes('missing')) {
          throw new RequiredFieldError('template data');
        }

        if (message.includes('invalid') || message.includes('validation')) {
          throw new ValidationError(error.message);
        }
      }

      throw error;
    }
  });

  // Update an existing template
  ipcMain.handle('templates:update', async (_event, input: UpdateTemplateInput) => {
    try {
      const service = getTemplateService();
      const template = await service.updateTemplate(input);

      return { success: true, data: template };
    } catch (error) {
      console.error('[IPC] templates:update error:', error);

      // Wrap generic errors in DomainErrors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('database') || message.includes('sqlite')) {
          throw new DatabaseError('update template', error.message);
        }

        if (message.includes('not found')) {
          throw new TemplateNotFoundError(`Template ${input.id} not found`);
        }

        if (message.includes('invalid') || message.includes('validation')) {
          throw new ValidationError(error.message);
        }
      }

      throw error;
    }
  });

  // Delete a template
  ipcMain.handle('templates:delete', async (_event, id: number) => {
    try {
      const service = getTemplateService();
      await service.deleteTemplate(id);

      return { success: true };
    } catch (error) {
      console.error('[IPC] templates:delete error:', error);

      // Wrap generic errors in DomainErrors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('database') || message.includes('sqlite')) {
          throw new DatabaseError('delete template', error.message);
        }

        if (message.includes('not found')) {
          throw new TemplateNotFoundError(`Template ${id} not found`);
        }
      }

      throw error;
    }
  });

  // Seed default templates
  ipcMain.handle('templates:seed', async () => {
    try {
      const seeder = getTemplateSeeder();
      await seeder.seedDefaultTemplates();

      return { success: true };
    } catch (error) {
      console.error('[IPC] templates:seed error:', error);

      // Wrap generic errors in DomainErrors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('database') || message.includes('sqlite')) {
          throw new DatabaseError('seed templates', error.message);
        }
      }

      throw error;
    }
  });
}
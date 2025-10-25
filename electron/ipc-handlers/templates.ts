/**
 * IPC Handlers for Template Operations
 * Handles template CRUD, seeding, and application
 */

import { ipcMain } from 'electron';
import { getDb } from '../../src/db/database.ts';
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
  TemplateFilters,
} from '../../src/models/CaseTemplate.ts';

// Initialize services (shared across handlers)
let templateService: TemplateService | null = null;
let templateSeeder: TemplateSeeder | null = null;

function getTemplateService(): TemplateService {
  if (!templateService) {
    const db = getDb();
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
    const db = getDb();
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
  ipcMain.handle('templates:get-all', async (_event, sessionId: string) => {
    try {
      // TODO: Extract userId from sessionId (implement session validation)
      const userId = 1; // Placeholder

      const service = getTemplateService();
      const templates = await service.getAllTemplates(userId);

      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get templates',
      };
    }
  });

  // Get all templates with statistics
  ipcMain.handle('templates:get-all-with-stats', async (_event, sessionId: string) => {
    try {
      const userId = 1; // Placeholder

      const service = getTemplateService();
      const templates = await service.getAllTemplatesWithStats(userId);

      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template stats',
      };
    }
  });

  // Get template by ID
  ipcMain.handle('templates:get-by-id', async (_event, templateId: number) => {
    try {
      const service = getTemplateService();
      const template = await service.getTemplateById(templateId);

      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template',
      };
    }
  });

  // Get templates by category
  ipcMain.handle(
    'templates:get-by-category',
    async (_event, category: string, sessionId: string) => {
      try {
        const userId = 1; // Placeholder

        const service = getTemplateService();
        const templates = await service.getTemplatesByCategory(category, userId);

        return { success: true, data: templates };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get templates by category',
        };
      }
    },
  );

  // Search templates with filters
  ipcMain.handle(
    'templates:search',
    async (_event, filters: TemplateFilters) => {
      try {
        const service = getTemplateService();
        const templates = await service.searchTemplates(filters);

        return { success: true, data: templates };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search templates',
        };
      }
    },
  );

  // Get most popular templates
  ipcMain.handle(
    'templates:get-popular',
    async (_event, limit: number, sessionId: string) => {
      try {
        const userId = 1; // Placeholder

        const service = getTemplateService();
        const templates = await service.getMostPopularTemplates(limit, userId);

        return { success: true, data: templates };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get popular templates',
        };
      }
    },
  );

  // Create custom template
  ipcMain.handle(
    'templates:create',
    async (_event, input: CreateTemplateInput, sessionId: string) => {
      try {
        const userId = 1; // Placeholder

        const service = getTemplateService();
        const template = await service.createTemplate(input, userId);

        return { success: true, data: template };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create template',
        };
      }
    },
  );

  // Update template
  ipcMain.handle(
    'templates:update',
    async (_event, templateId: number, input: UpdateTemplateInput, sessionId: string) => {
      try {
        const userId = 1; // Placeholder

        const service = getTemplateService();
        const template = await service.updateTemplate(templateId, input, userId);

        if (!template) {
          return { success: false, error: 'Template not found or unauthorized' };
        }

        return { success: true, data: template };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update template',
        };
      }
    },
  );

  // Delete template
  ipcMain.handle(
    'templates:delete',
    async (_event, templateId: number, sessionId: string) => {
      try {
        const userId = 1; // Placeholder

        const service = getTemplateService();
        const deleted = await service.deleteTemplate(templateId, userId);

        return { success: true, data: { deleted } };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete template',
        };
      }
    },
  );

  // Apply template to create a case
  ipcMain.handle(
    'templates:apply',
    async (_event, templateId: number, sessionId: string) => {
      try {
        const userId = 1; // Placeholder

        const service = getTemplateService();
        const result = await service.applyTemplateToCase(templateId, userId);

        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to apply template',
        };
      }
    },
  );

  // Get template usage statistics
  ipcMain.handle(
    'templates:get-stats',
    async (_event, templateId: number) => {
      try {
        const service = getTemplateService();
        const stats = await service.getTemplateStats(templateId);

        return { success: true, data: stats };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get template stats',
        };
      }
    },
  );

  // Get template usage history
  ipcMain.handle(
    'templates:get-usage-history',
    async (_event, templateId: number, limit = 10) => {
      try {
        const service = getTemplateService();
        const history = await service.getTemplateUsageHistory(templateId, limit);

        return { success: true, data: history };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get usage history',
        };
      }
    },
  );

  // Seed built-in templates (admin operation)
  ipcMain.handle('templates:seed-defaults', async (_event) => {
    try {
      const seeder = getTemplateSeeder();
      seeder.seedAll();

      return {
        success: true,
        data: { message: 'Built-in templates seeded successfully' },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed templates',
      };
    }
  });
}

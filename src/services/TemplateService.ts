/**
 * Template Service
 * Business logic for case template management
 */

import type { TemplateRepository } from '../repositories/TemplateRepository.ts';
import type { CaseRepository } from '../repositories/CaseRepository.ts';
import type { DeadlineRepository } from '../repositories/DeadlineRepository.ts';
import type { AuditLogger } from './AuditLogger.ts';
import type {
  CaseTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  TemplateWithStats,
  TemplateApplicationResult,
} from '../models/CaseTemplate.ts';
import type { CreateCaseInput } from '../domains/cases/entities/Case.ts';
import type { CreateDeadlineInput } from '../domains/timeline/entities/Deadline.ts';

export class TemplateService {
  constructor(
    private templateRepo: TemplateRepository,
    private caseRepo: CaseRepository,
    private deadlineRepo: DeadlineRepository,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Get all templates (system + user's custom)
   */
  async getAllTemplates(userId: number): Promise<CaseTemplate[]> {
    return this.templateRepo.findAllTemplates(userId);
  }

  /**
   * Get all templates with usage statistics
   */
  async getAllTemplatesWithStats(userId: number): Promise<TemplateWithStats[]> {
    return this.templateRepo.findAllWithStats(userId);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: number): Promise<CaseTemplate | null> {
    return this.templateRepo.findById(id);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: string,
    userId?: number,
  ): Promise<CaseTemplate[]> {
    return this.templateRepo.findByCategory(category, userId);
  }

  /**
   * Search templates with filters
   */
  async searchTemplates(filters: TemplateFilters): Promise<CaseTemplate[]> {
    return this.templateRepo.findWithFilters(filters);
  }

  /**
   * Get most popular templates
   */
  async getMostPopularTemplates(
    limit = 5,
    userId?: number,
  ): Promise<TemplateWithStats[]> {
    return this.templateRepo.getMostPopular(limit, userId);
  }

  /**
   * Create a new custom template
   */
  async createTemplate(
    input: CreateTemplateInput,
    userId: number,
  ): Promise<CaseTemplate> {
    // Validate template fields
    this.validateTemplateInput(input);

    const template = this.templateRepo.create(input, userId);

    this.auditLogger?.log({
      eventType: 'template_service.create',
      resourceType: 'template',
      resourceId: template.id.toString(),
      action: 'create',
      details: {
        name: input.name,
        category: input.category,
        userId,
      },
      success: true,
    });

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: number,
    input: UpdateTemplateInput,
    userId: number,
  ): Promise<CaseTemplate | null> {
    const existing = await this.getTemplateById(id);

    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    if (existing.isSystemTemplate) {
      throw new Error('Cannot update system templates');
    }

    if (existing.userId !== userId) {
      throw new Error('Unauthorized: Cannot update another user\'s template');
    }

    if (input.templateFields) {
      this.validateTemplateFields(input.templateFields);
    }

    const updated = this.templateRepo.update(id, input, userId);

    if (updated) {
      this.auditLogger?.log({
        eventType: 'template_service.update',
        resourceType: 'template',
        resourceId: id.toString(),
        action: 'update',
        details: {
          updates: Object.keys(input),
          userId,
        },
        success: true,
      });
    }

    return updated;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number, userId: number): Promise<boolean> {
    const existing = await this.getTemplateById(id);

    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    if (existing.isSystemTemplate) {
      throw new Error('Cannot delete system templates');
    }

    if (existing.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete another user\'s template');
    }

    const deleted = this.templateRepo.delete(id, userId);

    if (deleted) {
      this.auditLogger?.log({
        eventType: 'template_service.delete',
        resourceType: 'template',
        resourceId: id.toString(),
        action: 'delete',
        details: {
          name: existing.name,
          userId,
        },
        success: true,
      });
    }

    return deleted;
  }

  /**
   * Apply template to create a new case
   */
  async applyTemplateToCase(
    templateId: number,
    userId: number,
  ): Promise<TemplateApplicationResult> {
    const template = await this.getTemplateById(templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create case from template
    const caseInput: CreateCaseInput = {
      title: template.templateFields.titleTemplate,
      description: template.templateFields.descriptionTemplate,
      caseType: template.templateFields.caseType,
    };

    const createdCase = this.caseRepo.create(caseInput);

    // Record template usage
    this.templateRepo.recordUsage(templateId, userId, createdCase.id);

    // Create timeline milestones as deadlines
    const appliedMilestones: Array<{
      id: number;
      title: string;
      dueDate: string;
    }> = [];

    const now = new Date();

    for (const milestone of template.timelineMilestones) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + milestone.daysFromStart);

      const deadlineInput: CreateDeadlineInput = {
        caseId: createdCase.id,
        title: milestone.title,
        description: milestone.description,
        dueDate: dueDate.toISOString().split('T')[0], // YYYY-MM-DD
        priority: milestone.isRequired ? 'high' : 'medium',
      };

      const deadline = this.deadlineRepo.create(deadlineInput, userId);

      appliedMilestones.push({
        id: deadline.id,
        title: deadline.title,
        dueDate: deadline.dueDate,
      });
    }

    this.auditLogger?.log({
      eventType: 'template_service.apply',
      resourceType: 'template',
      resourceId: templateId.toString(),
      action: 'apply',
      details: {
        caseId: createdCase.id,
        milestonesCreated: appliedMilestones.length,
        checklistItems: template.checklistItems.length,
        userId,
      },
      success: true,
    });

    return {
      case: {
        id: createdCase.id,
        title: createdCase.title,
        description: createdCase.description,
        caseType: createdCase.caseType,
        status: createdCase.status,
      },
      appliedMilestones,
      appliedChecklistItems: template.checklistItems,
      templateId: template.id,
      templateName: template.name,
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: number) {
    return this.templateRepo.getStats(templateId);
  }

  /**
   * Get template usage history
   */
  async getTemplateUsageHistory(templateId: number, limit = 10) {
    return this.templateRepo.getUsageHistory(templateId, limit);
  }

  /**
   * Private: Validate template input
   */
  private validateTemplateInput(input: CreateTemplateInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (input.name.length > 200) {
      throw new Error('Template name must be 200 characters or less');
    }

    if (input.description && input.description.length > 1000) {
      throw new Error('Template description must be 1000 characters or less');
    }

    this.validateTemplateFields(input.templateFields);
  }

  /**
   * Private: Validate template fields
   */
  private validateTemplateFields(fields: any): void {
    if (!fields.titleTemplate || fields.titleTemplate.trim().length === 0) {
      throw new Error('Template title template is required');
    }

    if (!fields.caseType) {
      throw new Error('Template case type is required');
    }

    const validCaseTypes = [
      'employment',
      'housing',
      'consumer',
      'family',
      'debt',
      'other',
    ];
    if (!validCaseTypes.includes(fields.caseType)) {
      throw new Error(`Invalid case type: ${fields.caseType}`);
    }

    if (!fields.defaultStatus) {
      throw new Error('Template default status is required');
    }

    const validStatuses = ['active', 'closed', 'pending'];
    if (!validStatuses.includes(fields.defaultStatus)) {
      throw new Error(`Invalid status: ${fields.defaultStatus}`);
    }
  }
}

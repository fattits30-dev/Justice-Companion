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

    const template = await this.templateRepo.create(input, userId);

    this.auditLogger?.log({
      eventType: 'template_service.create',
      resourceType: 'template',
      resourceId: template.id,
      userId,
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
    // Validate template fields
    this.validateTemplateInput(input);

    const template = await this.templateRepo.update(id, input, userId);

    if (template) {
      this.auditLogger?.log({
        eventType: 'template_service.update',
        resourceType: 'template',
        resourceId: template.id,
        userId,
      });
    }

    return template;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number, userId: number): Promise<boolean> {
    const deleted = await this.templateRepo.delete(id, userId);

    if (deleted) {
      this.auditLogger?.log({
        eventType: 'template_service.delete',
        resourceType: 'template',
        resourceId: id,
        userId,
      });
    }

    return deleted;
  }

  /**
   * Apply template to create a new case
   */
  async applyTemplate(
    templateId: number,
    input: CreateCaseInput,
    userId: number,
  ): Promise<TemplateApplicationResult> {
    const template = await this.templateRepo.findById(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Create the case using template data
    const caseData = {
      ...input,
      templateId,
      title: input.title || template.title,
      description: input.description || template.description,
    };

    const createdCase = await this.caseRepo.create(caseData, userId);

    // Create deadlines based on template
    const deadlines = await this.deadlineRepo.createMany(
      template.deadlines.map((deadline) => ({
        ...deadline,
        caseId: createdCase.id,
      })),
      userId,
    );

    this.auditLogger?.log({
      eventType: 'template_service.apply',
      resourceType: 'case',
      resourceId: createdCase.id,
      userId,
    });

    return {
      case: createdCase,
      deadlines,
    };
  }

  /**
   * Validate template input
   */
  private validateTemplateInput(input: CreateTemplateInput | UpdateTemplateInput): void {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Template title is required');
    }
    
    if (input.description && input.description.length > 1000) {
      throw new Error('Template description must be less than 1000 characters');
    }
  }
}
/**
 * Template Service
 * Business logic for case template management
 */

import type { TemplateRepository } from "../repositories/TemplateRepository.ts";
import type { CaseRepository } from "../repositories/CaseRepository.ts";
import type { DeadlineRepository } from "../repositories/DeadlineRepository.ts";
import type { AuditLogger } from "./AuditLogger.ts";
import type {
  CaseTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateApplicationResult,
} from "../models/CaseTemplate.ts";
import type { CreateCaseInput } from "../domains/cases/entities/Case.ts";

export class TemplateService {
  private readonly _deadlineRepo: DeadlineRepository;

  constructor(
    private templateRepo: TemplateRepository,
    private caseRepo: CaseRepository,
    _deadlineRepo: DeadlineRepository,
    _auditLogger?: AuditLogger,
  ) {
    this._deadlineRepo = _deadlineRepo;
  }

  /**
   * Get all templates (system + user's custom)
   */
  async getAllTemplates(userId: number): Promise<CaseTemplate[]> {
    return this.templateRepo.findAllTemplates(userId);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: number): Promise<CaseTemplate | null> {
    return this.templateRepo.findTemplateById(id);
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

    // Add userId to input before creating
    const templateInput = {
      ...input,
      userId,
      isSystemTemplate: false, // User-created templates are never system templates
    };

    const template = this.templateRepo.createTemplate(templateInput);

    // TODO: Add template-specific audit event types
    // this._auditLogger?.log({
    //   eventType: "template.create",
    //   resourceType: "template",
    //   resourceId: template.id.toString(),
    //   userId: userId.toString(),
    // });

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: number,
    input: UpdateTemplateInput,
    _userId: number,
  ): Promise<CaseTemplate | null> {
    // Validate template fields
    this.validateTemplateInput(input);

    const template = this.templateRepo.updateTemplate(id, input);

    if (template) {
      // TODO: Add template-specific audit event types
      // this._auditLogger?.log({
      //   eventType: "template.update",
      //   resourceType: "template",
      //   resourceId: template.id.toString(),
      //   userId: userId.toString(),
      // });
    }

    return template;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number, userId: number): Promise<boolean> {
    // Check ownership - user can only delete their own templates
    const template = this.templateRepo.findTemplateById(id);
    if (!template) {
      return false; // Template doesn't exist
    }

    // Check if user owns this template (unless it's a system template that they can access)
    if (template.userId !== userId && !template.isSystemTemplate) {
      throw new Error("Access denied: You can only delete your own templates");
    }

    const deleted = this.templateRepo.deleteTemplate(id);

    if (deleted) {
      // TODO: Add template-specific audit event types
      // this._auditLogger?.log({
      //   eventType: "template.delete",
      //   resourceType: "template",
      //   resourceId: id.toString(),
      //   userId: userId.toString(),
      // });
    }

    return deleted;
  }

  /**
   * Apply template to create a new case
   */
  async applyTemplate(
    templateId: number,
    input: CreateCaseInput,
    _userId: number,
  ): Promise<TemplateApplicationResult> {
    const template = this.templateRepo.findTemplateById(templateId);

    if (!template) {
      throw new Error("Template not found");
    }

    // Create the case using template data merged with user input
    const caseData: CreateCaseInput = {
      ...input,
      title: input.title || template.templateFields.titleTemplate,
      description:
        input.description || template.templateFields.descriptionTemplate,
      caseType: input.caseType || template.templateFields.caseType,
      // Note: status might not be on CreateCaseInput, using spread to include if present
    };

    // Note: Assuming CaseRepository.create exists (need to verify signature)
    // For now, using type assertion
    const createdCase = await this.caseRepo.create(caseData as any);

    // Convert template milestones to deadline format
    const appliedMilestones = await Promise.all(
      template.timelineMilestones.map(async (_milestone, _index) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + _milestone.daysFromStart);

        const deadline = await this._deadlineRepo.create({
          caseId: createdCase.id,
          userId: _userId,
          title: _milestone.title,
          description: _milestone.description,
          deadlineDate: dueDate.toISOString(),
          priority: "medium", // Default priority since TimelineMilestone doesn't have this
        });

        return {
          id: deadline.id,
          title: deadline.title,
          dueDate: deadline.deadlineDate,
        };
      }),
    );

    // TODO: Add template-specific audit event types
    // this._auditLogger?.log({
    //   eventType: "case.create", // Use case.create since template application creates a case
    //   resourceType: "case",
    //   resourceId: createdCase.id.toString(),
    //   userId: _userId.toString(),
    // });

    return {
      case: {
        id: createdCase.id,
        title: createdCase.title,
        description: createdCase.description || null,
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
   * Validate template input
   */
  private validateTemplateInput(
    input: CreateTemplateInput | UpdateTemplateInput,
  ): void {
    // Check if name exists (for CreateTemplateInput) or is being updated (for UpdateTemplateInput)
    if ("name" in input && input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error("Template name is required");
      }
    }

    if (input.description && input.description.length > 1000) {
      throw new Error("Template description must be less than 1000 characters");
    }
  }
}

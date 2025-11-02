/**
 * Template Repository
 * Data access layer for case templates
 */

import type Database from 'better-sqlite3';
import { BaseRepository } from './BaseRepository.ts';
import type { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import type { DecryptionCache } from '../services/DecryptionCache.ts';
import type {
  CaseTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  TemplateWithStats,
  TemplateFields,
} from '../models/CaseTemplate.ts';

interface TemplateRow {
  id: number;
  name: string;
  description: string | null;
  category: string;
  is_system_template: number;
  user_id: number | null;
  template_fields_json: string;
  suggested_evidence_types_json: string | null;
  timeline_milestones_json: string | null;
  checklist_items_json: string | null;
  created_at: string;
  updated_at: string;
}

export class TemplateRepository extends BaseRepository<CaseTemplate> {
  constructor(
    db: Database.Database,
    encryptionService: EncryptionService,
    auditLogger?: AuditLogger,
    cache?: DecryptionCache,
  ) {
    super(db, encryptionService, auditLogger, cache);
  }

  protected getTableName(): string {
    return 'case_templates';
  }

  protected getEncryptedFields(): string[] {
    // Templates are not encrypted (they're templates, not user data)
    return [];
  }

  protected mapToDomain(row: unknown): CaseTemplate {
    const r = row as TemplateRow;

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category as CaseTemplate['category'],
      isSystemTemplate: r.is_system_template === 1,
      userId: r.user_id,
      templateFields: JSON.parse(r.template_fields_json) as TemplateFields,
      suggestedEvidenceTypes: r.suggested_evidence_types_json
        ? (JSON.parse(r.suggested_evidence_types_json) as string[])
        : [],
      timelineMilestones: r.timeline_milestones_json
        ? (JSON.parse(r.timeline_milestones_json) as TimelineMilestone[])
        : [],
      checklistItems: r.checklist_items_json
        ? (JSON.parse(r.checklist_items_json) as ChecklistItem[])
        : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Get all templates (system + user's custom)
   */
  public findAllTemplates(userId?: number): CaseTemplate[] {
    const query = userId
      ? `SELECT * FROM case_templates WHERE user_id = ? OR is_system_template = 1 ORDER BY is_system_template, name`
      : `SELECT * FROM case_templates WHERE is_system_template = 1 ORDER BY name`;

    const rows = this.db.prepare(query).all(userId);

    return rows.map((row) => this.mapToDomain(row));
  }

  /**
   * Find template by ID
   */
  public findTemplateById(id: number): CaseTemplate | null {
    const query = `SELECT * FROM case_templates WHERE id = ?`;
    const row = this.db.prepare(query).get(id);

    return row ? this.mapToDomain(row) : null;
  }

  /**
   * Create new template
   */
  public createTemplate(input: CreateTemplateInput): CaseTemplate {
    const query = `
      INSERT INTO case_templates (
        name,
        description,
        category,
        is_system_template,
        user_id,
        template_fields_json,
        suggested_evidence_types_json,
        timeline_milestones_json,
        checklist_items_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date().toISOString();
    const result = this.db.prepare(query).run(
      input.name,
      input.description,
      input.category,
      input.isSystemTemplate ? 1 : 0,
      input.userId,
      JSON.stringify(input.templateFields),
      input.suggestedEvidenceTypes ? JSON.stringify(input.suggestedEvidenceTypes) : null,
      input.timelineMilestones ? JSON.stringify(input.timelineMilestones) : null,
      input.checklistItems ? JSON.stringify(input.checklistItems) : null,
      now,
      now,
    );

    const createdTemplate = this.findTemplateById(result.lastInsertRowid as number);
    
    if (!createdTemplate) {
      throw new Error('Failed to create template');
    }

    return createdTemplate;
  }

  /**
   * Update existing template
   */
  public updateTemplate(id: number, input: UpdateTemplateInput): CaseTemplate | null {
    const query = `
      UPDATE case_templates 
      SET 
        name = ?,
        description = ?,
        category = ?,
        template_fields_json = ?,
        suggested_evidence_types_json = ?,
        timeline_milestones_json = ?,
        checklist_items_json = ?,
        updated_at = ?
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    this.db.prepare(query).run(
      input.name,
      input.description,
      input.category,
      JSON.stringify(input.templateFields),
      input.suggestedEvidenceTypes ? JSON.stringify(input.suggestedEvidenceTypes) : null,
      input.timelineMilestones ? JSON.stringify(input.timelineMilestones) : null,
      input.checklistItems ? JSON.stringify(input.checklistItems) : null,
      now,
      id,
    );

    return this.findTemplateById(id);
  }

  /**
   * Delete template
   */
  public deleteTemplate(id: number): boolean {
    const query = `DELETE FROM case_templates WHERE id = ?`;
    const result = this.db.prepare(query).run(id);
    return result.changes > 0;
  }

  /**
   * Get template usage statistics
   */
  public getTemplateUsageStats(templateId: number): TemplateUsage {
    // This method would be implemented based on actual usage tracking logic
    // For now, returning empty object to satisfy type requirements
    return {} as TemplateUsage;
  }

  /**
   * Get template statistics
   */
  public getTemplateStats(templateId: number): TemplateStats {
    // This method would be implemented based on actual statistics tracking logic
    // For now, returning empty object to satisfy type requirements
    return {} as TemplateStats;
  }
}
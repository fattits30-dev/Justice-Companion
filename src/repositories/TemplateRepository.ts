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
  TemplateUsage,
  TemplateStats,
  TimelineMilestone,
  ChecklistItem,
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
      ? `SELECT * FROM case_templates
         WHERE is_system_template = 1 OR user_id = ?
         ORDER BY is_system_template DESC, name ASC`
      : `SELECT * FROM case_templates
         WHERE is_system_template = 1
         ORDER BY name ASC`;

    const rows = userId
      ? this.db.prepare(query).all(userId)
      : this.db.prepare(query).all();

    return rows.map((row) => this.mapToDomain(row));
  }

  /**
   * Get templates with filters
   */
  public findWithFilters(filters: TemplateFilters): CaseTemplate[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Category filter
    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    // System template filter
    if (filters.isSystemTemplate !== undefined) {
      conditions.push('is_system_template = ?');
      params.push(filters.isSystemTemplate ? 1 : 0);
    }

    // User ID filter (includes system templates)
    if (filters.userId !== undefined) {
      conditions.push('(is_system_template = 1 OR user_id = ?)');
      params.push(filters.userId);
    }

    // Search query (in name or description)
    if (filters.searchQuery) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const searchPattern = `%${filters.searchQuery}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM case_templates
      ${whereClause}
      ORDER BY is_system_template DESC, name ASC
    `;

    const rows = this.db.prepare(query).all(...params);
    return rows.map((row) => this.mapToDomain(row));
  }

  /**
   * Get templates by category
   */
  public findByCategory(category: string, userId?: number): CaseTemplate[] {
    const query = userId
      ? `SELECT * FROM case_templates
         WHERE category = ? AND (is_system_template = 1 OR user_id = ?)
         ORDER BY is_system_template DESC, name ASC`
      : `SELECT * FROM case_templates
         WHERE category = ? AND is_system_template = 1
         ORDER BY name ASC`;

    const rows = userId
      ? this.db.prepare(query).all(category, userId)
      : this.db.prepare(query).all(category);

    return rows.map((row) => this.mapToDomain(row));
  }

  /**
   * Create a new template
   */
  public create(input: CreateTemplateInput, userId: number): CaseTemplate {
    const stmt = this.db.prepare(`
      INSERT INTO case_templates (
        name, description, category, is_system_template, user_id,
        template_fields_json, suggested_evidence_types_json,
        timeline_milestones_json, checklist_items_json
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name,
      input.description || null,
      input.category,
      userId,
      JSON.stringify(input.templateFields),
      JSON.stringify(input.suggestedEvidenceTypes || []),
      JSON.stringify(input.timelineMilestones || []),
      JSON.stringify(input.checklistItems || []),
    );

    this.auditLogger?.log({
      eventType: 'template.create',
      resourceType: 'case_template',
      resourceId: result.lastInsertRowid.toString(),
      action: 'create',
      details: { name: input.name, category: input.category },
      success: true,
    });

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Create a system template (no user ID)
   */
  public createSystemTemplate(input: CreateTemplateInput): CaseTemplate {
    const stmt = this.db.prepare(`
      INSERT INTO case_templates (
        name, description, category, is_system_template, user_id,
        template_fields_json, suggested_evidence_types_json,
        timeline_milestones_json, checklist_items_json
      ) VALUES (?, ?, ?, 1, NULL, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name,
      input.description || null,
      input.category,
      JSON.stringify(input.templateFields),
      JSON.stringify(input.suggestedEvidenceTypes || []),
      JSON.stringify(input.timelineMilestones || []),
      JSON.stringify(input.checklistItems || []),
    );

    this.auditLogger?.log({
      eventType: 'template.create_system',
      resourceType: 'case_template',
      resourceId: result.lastInsertRowid.toString(),
      action: 'create',
      details: { name: input.name, category: input.category },
      success: true,
    });

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Update a template
   */
  public update(
    id: number,
    input: UpdateTemplateInput,
    userId: number,
  ): CaseTemplate | null {
    // Check ownership (can't update system templates)
    const existing = this.findById(id);
    if (!existing || existing.isSystemTemplate || existing.userId !== userId) {
      return null;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }

    if (input.category !== undefined) {
      updates.push('category = ?');
      params.push(input.category);
    }

    if (input.templateFields !== undefined) {
      updates.push('template_fields_json = ?');
      params.push(JSON.stringify(input.templateFields));
    }

    if (input.suggestedEvidenceTypes !== undefined) {
      updates.push('suggested_evidence_types_json = ?');
      params.push(JSON.stringify(input.suggestedEvidenceTypes));
    }

    if (input.timelineMilestones !== undefined) {
      updates.push('timeline_milestones_json = ?');
      params.push(JSON.stringify(input.timelineMilestones));
    }

    if (input.checklistItems !== undefined) {
      updates.push('checklist_items_json = ?');
      params.push(JSON.stringify(input.checklistItems));
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    const query = `
      UPDATE case_templates
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    this.db.prepare(query).run(...params);

    this.auditLogger?.log({
      eventType: 'template.update',
      resourceType: 'case_template',
      resourceId: id.toString(),
      action: 'update',
      details: { updates: Object.keys(input) },
      success: true,
    });

    return this.findById(id);
  }

  /**
   * Delete a template
   */
  public delete(id: number, userId: number): boolean {
    // Check ownership (can't delete system templates)
    const existing = this.findById(id);
    if (!existing || existing.isSystemTemplate || existing.userId !== userId) {
      return false;
    }

    const stmt = this.db.prepare('DELETE FROM case_templates WHERE id = ?');
    const result = stmt.run(id);

    this.auditLogger?.log({
      eventType: 'template.delete',
      resourceType: 'case_template',
      resourceId: id.toString(),
      action: 'delete',
      details: { name: existing.name },
      success: result.changes > 0,
    });

    return result.changes > 0;
  }

  /**
   * Record template usage
   */
  public recordUsage(
    templateId: number,
    userId: number,
    caseId: number | null,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO template_usage (template_id, user_id, case_id)
      VALUES (?, ?, ?)
    `);

    stmt.run(templateId, userId, caseId);

    this.auditLogger?.log({
      eventType: 'template.used',
      resourceType: 'case_template',
      resourceId: templateId.toString(),
      action: 'use',
      details: { userId, caseId },
      success: true,
    });
  }

  /**
   * Get template usage statistics
   */
  public getStats(templateId: number): TemplateStats {
    const query = `
      SELECT
        COUNT(*) as usage_count,
        MAX(used_at) as last_used,
        SUM(CASE WHEN case_id IS NOT NULL THEN 1 ELSE 0 END) as successful_uses
      FROM template_usage
      WHERE template_id = ?
    `;

    const row = this.db.prepare(query).get(templateId) as {
      usage_count: number;
      last_used: string | null;
      successful_uses: number;
    };

    const usageCount = row.usage_count || 0;
    const successfulUses = row.successful_uses || 0;
    const successRate = usageCount > 0 ? (successfulUses / usageCount) * 100 : 0;

    return {
      templateId,
      usageCount,
      lastUsed: row.last_used,
      successRate,
    };
  }

  /**
   * Get templates with usage statistics
   */
  public findAllWithStats(userId?: number): TemplateWithStats[] {
    const templates = this.findAllTemplates(userId);

    return templates.map((template) => {
      const stats = this.getStats(template.id);
      return {
        ...template,
        usageCount: stats.usageCount,
        lastUsed: stats.lastUsed,
        successRate: stats.successRate,
      };
    });
  }

  /**
   * Get template usage history
   */
  public getUsageHistory(templateId: number, limit = 10): TemplateUsage[] {
    const query = `
      SELECT * FROM template_usage
      WHERE template_id = ?
      ORDER BY used_at DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(query).all(templateId, limit);

    return rows.map(
      (row: any): TemplateUsage => ({
        id: row.id,
        templateId: row.template_id,
        userId: row.user_id,
        caseId: row.case_id,
        usedAt: row.used_at,
      }),
    );
  }

  /**
   * Get most popular templates
   */
  public getMostPopular(limit = 5, userId?: number): TemplateWithStats[] {
    const allTemplates = this.findAllWithStats(userId);

    return allTemplates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }
}

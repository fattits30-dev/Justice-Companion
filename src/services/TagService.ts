/**
 * TagService
 * Manages tag operations for evidence organization
 */

import { getDb } from "../db/database.ts";
import { AuditLogger } from "./AuditLogger.ts";
import type { Tag, CreateTagInput, UpdateTagInput } from "../models/Tag.ts";
import type Database from "better-sqlite3";

export class TagService {
  private get db(): Database.Database {
    return getDb();
  }

  private get auditLogger(): AuditLogger {
    return new AuditLogger(this.db);
  }

  /**
   * Create a new tag
   */
  createTag(userId: number, input: CreateTagInput): Tag {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO tags (user_id, name, color, description)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(
        userId,
        input.name,
        input.color,
        input.description || null,
      );
      const tagId = result.lastInsertRowid as number;

      this.auditLogger.log({
        eventType: "tag.create",
        action: "create",
        userId: userId.toString(),
        resourceType: "tag",
        resourceId: tagId.toString(),
        details: { name: input.name, color: input.color },
        ipAddress: undefined,
        userAgent: undefined,
      });

      const tag = this.getTagById(tagId);
      if (!tag) {
        throw new Error("Failed to retrieve created tag");
      }

      return tag;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("A tag with this name already exists");
      }
      throw error;
    }
  }

  /**
   * Get all tags for a user with usage counts
   */
  getTags(userId: number): Tag[] {
    const stmt = this.db.prepare(`
      SELECT
        t.*,
        COUNT(et.evidence_id) as usage_count
      FROM tags t
      LEFT JOIN evidence_tags et ON t.id = et.tag_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.name ASC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map(this.mapToTag);
  }

  /**
   * Get tag by ID
   */
  getTagById(id: number): Tag | null {
    const stmt = this.db.prepare(`
      SELECT
        t.*,
        COUNT(et.evidence_id) as usage_count
      FROM tags t
      LEFT JOIN evidence_tags et ON t.id = et.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapToTag(row) : null;
  }

  /**
   * Update tag
   */
  updateTag(tagId: number, input: UpdateTagInput): Tag {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      params.push(input.name);
    }

    if (input.color !== undefined) {
      updates.push("color = ?");
      params.push(input.color);
    }

    if (input.description !== undefined) {
      updates.push("description = ?");
      params.push(input.description || null);
    }

    if (updates.length === 0) {
      const tag = this.getTagById(tagId);
      if (!tag) {
        throw new Error("Tag not found");
      }
      return tag;
    }

    updates.push("updated_at = datetime('now')");
    params.push(tagId);

    const stmt = this.db.prepare(`
      UPDATE tags
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...params);

    // Get user_id for audit log
    const tag = this.getTagById(tagId);
    if (!tag) {
      throw new Error("Tag not found after update");
    }

    this.auditLogger.log({
      eventType: "tag.update",
      action: "update",
      userId: tag.userId.toString(),
      resourceType: "tag",
      resourceId: tagId.toString(),
      details: input as Record<string, unknown>,
      ipAddress: undefined,
      userAgent: undefined,
    });

    return tag;
  }

  /**
   * Delete tag (removes from all evidence)
   */
  deleteTag(tagId: number): void {
    // Get tag info for audit log before deletion
    const tag = this.getTagById(tagId);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Delete in transaction
    const deleteJunction = this.db.prepare(
      "DELETE FROM evidence_tags WHERE tag_id = ?",
    );
    const deleteTag = this.db.prepare("DELETE FROM tags WHERE id = ?");

    const transaction = this.db.transaction(() => {
      deleteJunction.run(tagId);
      deleteTag.run(tagId);
    });

    transaction();

    this.auditLogger.log({
      eventType: "tag.delete",
      action: "delete",
      userId: tag.userId.toString(),
      resourceType: "tag",
      resourceId: tagId.toString(),
      details: { name: tag.name, usageCount: tag.usageCount },
      ipAddress: undefined,
      userAgent: undefined,
    });
  }

  /**
   * Apply tag to evidence
   */
  tagEvidence(evidenceId: number, tagId: number, userId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO evidence_tags (evidence_id, tag_id)
      VALUES (?, ?)
    `);

    const result = stmt.run(evidenceId, tagId);

    if (result.changes > 0) {
      this.auditLogger.log({
        eventType: "tag.apply",
        action: "create",
        userId: userId.toString(),
        resourceType: "evidence",
        resourceId: evidenceId.toString(),
        details: { tagId },
        ipAddress: undefined,
        userAgent: undefined,
      });
    }
  }

  /**
   * Remove tag from evidence
   */
  untagEvidence(evidenceId: number, tagId: number, userId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM evidence_tags
      WHERE evidence_id = ? AND tag_id = ?
    `);

    const result = stmt.run(evidenceId, tagId);

    if (result.changes > 0) {
      this.auditLogger.log({
        eventType: "tag.remove",
        action: "delete",
        userId: userId.toString(),
        resourceType: "evidence",
        resourceId: evidenceId.toString(),
        details: { tagId },
        ipAddress: undefined,
        userAgent: undefined,
      });
    }
  }

  /**
   * Get tags for specific evidence
   */
  getEvidenceTags(evidenceId: number): Tag[] {
    const stmt = this.db.prepare(`
      SELECT t.*, 0 as usage_count
      FROM tags t
      INNER JOIN evidence_tags et ON t.id = et.tag_id
      WHERE et.evidence_id = ?
      ORDER BY t.name ASC
    `);

    const rows = stmt.all(evidenceId) as any[];
    return rows.map(this.mapToTag);
  }

  /**
   * Search evidence by tags (AND logic - must have all specified tags)
   */
  searchByTags(userId: number, tagIds: number[]): number[] {
    if (tagIds.length === 0) {
      return [];
    }

    const placeholders = tagIds.map(() => "?").join(",");

    const stmt = this.db.prepare(`
      SELECT DISTINCT et.evidence_id
      FROM evidence_tags et
      INNER JOIN evidence e ON et.evidence_id = e.id
      WHERE et.tag_id IN (${placeholders})
      AND e.user_id = ?
      GROUP BY et.evidence_id
      HAVING COUNT(DISTINCT et.tag_id) = ?
    `);

    const rows = stmt.all(...tagIds, userId, tagIds.length) as any[];
    return rows.map((r) => r.evidence_id);
  }

  /**
   * Get tag statistics for a user
   */
  getTagStatistics(userId: number): {
    totalTags: number;
    totalTaggedEvidence: number;
    mostUsedTag: Tag | null;
    unusedTags: number;
  } {
    const tags = this.getTags(userId);
    const totalTags = tags.length;
    const unusedTags = tags.filter((t) => t.usageCount === 0).length;

    const taggedEvidenceStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT et.evidence_id) as count
      FROM evidence_tags et
      INNER JOIN tags t ON et.tag_id = t.id
      WHERE t.user_id = ?
    `);

    const totalTaggedEvidence = (taggedEvidenceStmt.get(userId) as any).count;

    const mostUsedTag =
      tags.length > 0
        ? tags.reduce((max, tag) =>
            (tag.usageCount || 0) > (max.usageCount || 0) ? tag : max,
          )
        : null;

    return {
      totalTags,
      totalTaggedEvidence,
      mostUsedTag,
      unusedTags,
    };
  }

  /**
   * Map database row to Tag model
   */
  private mapToTag(row: any): Tag {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      description: row.description || undefined,
      usageCount: row.usage_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const tagService = new TagService();

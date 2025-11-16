/**
 * Tag Model
 * Represents a user-defined tag for organizing evidence
 */

export interface Tag {
  id: number;
  userId: number;
  name: string;
  color: string;
  description?: string;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface EvidenceTag {
  evidenceId: number;
  tagId: number;
  createdAt: string;
}

export const DEFAULT_TAG_COLORS = [
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#6B7280", // Gray
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#A855F7", // Purple
] as const;

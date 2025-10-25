/**
 * Case Template Model
 * Pre-defined templates for common legal scenarios
 */

import type { CaseType, CaseStatus } from './Case.ts';

/**
 * Template categories aligned with case types
 */
export type TemplateCategory =
  | 'civil'
  | 'criminal'
  | 'family'
  | 'employment'
  | 'housing'
  | 'immigration'
  | 'other';

/**
 * Main case template entity
 */
export interface CaseTemplate {
  id: number;
  name: string;
  description: string | null;
  category: TemplateCategory;
  isSystemTemplate: boolean; // Built-in vs user-created
  userId: number | null; // NULL for system templates

  // Template data
  templateFields: TemplateFields;
  suggestedEvidenceTypes: string[];
  timelineMilestones: TimelineMilestone[];
  checklistItems: ChecklistItem[];

  createdAt: string;
  updatedAt: string;
}

/**
 * Template fields that will pre-fill the case creation form
 */
export interface TemplateFields {
  titleTemplate: string; // e.g., "[Client Name] vs [Defendant] - Contract Dispute"
  descriptionTemplate: string;
  caseType: CaseType;
  defaultStatus: CaseStatus;
  customFields?: Record<string, string>; // Future extensibility
}

/**
 * Timeline milestone template
 * Defines key dates relative to case creation
 */
export interface TimelineMilestone {
  title: string;
  description: string;
  daysFromStart: number; // e.g., 7 = 7 days after case creation
  isRequired: boolean; // Whether this milestone is mandatory
  category: 'filing' | 'hearing' | 'deadline' | 'meeting' | 'other';
}

/**
 * Checklist item template
 * Pre-defined tasks for case management
 */
export interface ChecklistItem {
  title: string;
  description: string;
  category: 'evidence' | 'filing' | 'communication' | 'research' | 'other';
  priority: 'low' | 'medium' | 'high';
  daysFromStart?: number; // Optional suggested completion timeline
}

/**
 * Template usage tracking
 */
export interface TemplateUsage {
  id: number;
  templateId: number;
  userId: number;
  caseId: number | null; // NULL if case creation failed
  usedAt: string;
}

/**
 * Template statistics
 */
export interface TemplateStats {
  templateId: number;
  usageCount: number;
  lastUsed: string | null;
  successRate: number; // Percentage of uses that resulted in a case
  averageCaseOutcome?: string; // 'closed', 'settled', etc.
}

/**
 * Input for creating a new template
 */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  templateFields: TemplateFields;
  suggestedEvidenceTypes?: string[];
  timelineMilestones?: TimelineMilestone[];
  checklistItems?: ChecklistItem[];
}

/**
 * Input for updating an existing template
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  templateFields?: TemplateFields;
  suggestedEvidenceTypes?: string[];
  timelineMilestones?: TimelineMilestone[];
  checklistItems?: ChecklistItem[];
}

/**
 * Template with enriched usage data
 */
export interface TemplateWithStats extends CaseTemplate {
  usageCount: number;
  lastUsed: string | null;
  successRate: number;
}

/**
 * Filter options for template queries
 */
export interface TemplateFilters {
  category?: TemplateCategory;
  isSystemTemplate?: boolean;
  userId?: number;
  searchQuery?: string; // Search in name/description
}

/**
 * Template application result
 * Returns the created case and applied template data
 */
export interface TemplateApplicationResult {
  case: {
    id: number;
    title: string;
    description: string | null;
    caseType: CaseType;
    status: CaseStatus;
  };
  appliedMilestones: Array<{
    id: number;
    title: string;
    dueDate: string;
  }>;
  appliedChecklistItems: ChecklistItem[];
  templateId: number;
  templateName: string;
}

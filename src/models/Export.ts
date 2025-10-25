// src/models/Export.ts
import type { Case } from './Case.ts';
import type { Evidence } from './Evidence.ts';
import type { Deadline } from './Deadline.ts';
import type { Document } from './Document.ts';
import type { Note } from './Note.ts';
import type { CaseFact } from './CaseFact.ts';

export interface ExportOptions {
  format: 'pdf' | 'docx';
  template: 'case-summary' | 'evidence-list' | 'timeline-report' | 'case-notes';
  includeEvidence?: boolean;
  includeTimeline?: boolean;
  includeNotes?: boolean;
  includeFacts?: boolean;
  includeDocuments?: boolean;
  outputPath?: string; // Optional custom path
  fileName?: string; // Optional custom filename
}

export interface CaseExportData {
  case: Case;
  evidence: Evidence[];
  timeline: TimelineEvent[];
  deadlines: Deadline[];
  notes: Note[];
  facts: CaseFact[];
  documents: Document[];
  exportDate: Date;
  exportedBy: string; // User who exported
}

export interface TimelineEvent {
  id: number;
  caseId: number;
  title: string;
  description?: string;
  eventDate: Date;
  eventType: 'deadline' | 'hearing' | 'filing' | 'milestone' | 'other';
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceExportData {
  caseId: number;
  caseTitle: string;
  evidence: Evidence[];
  exportDate: Date;
  exportedBy: string;
  totalItems: number;
  categorySummary: Record<string, number>;
}

export interface TimelineExportData {
  caseId: number;
  caseTitle: string;
  events: TimelineEvent[];
  deadlines: Deadline[];
  exportDate: Date;
  exportedBy: string;
  upcomingDeadlines: Deadline[];
  completedEvents: TimelineEvent[];
}

export interface NotesExportData {
  caseId: number;
  caseTitle: string;
  notes: Note[];
  exportDate: Date;
  exportedBy: string;
  totalNotes: number;
}

export interface ExportResult {
  success: boolean;
  filePath: string;
  fileName: string;
  format: 'pdf' | 'docx';
  size: number; // File size in bytes
  exportedAt: Date;
  template: string;
}

export interface ExportError {
  code: 'PERMISSION_DENIED' | 'CASE_NOT_FOUND' | 'EXPORT_FAILED' | 'INVALID_TEMPLATE';
  message: string;
  details?: any;
}

export interface TemplateData {
  [key: string]: any;
}

export interface DocumentStyles {
  title?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  heading1?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
  };
  heading2?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
  };
  body?: {
    fontSize?: number;
    lineHeight?: number;
  };
  footer?: {
    fontSize?: number;
    italic?: boolean;
    color?: string;
  };
}

export const DEFAULT_EXPORT_OPTIONS: Partial<ExportOptions> = {
  format: 'pdf',
  template: 'case-summary',
  includeEvidence: true,
  includeTimeline: true,
  includeNotes: true,
  includeFacts: true,
  includeDocuments: true,
};

export const EXPORT_TEMPLATES = {
  'case-summary': {
    name: 'Case Summary',
    description: 'Complete case details with evidence, timeline, and notes',
    sections: ['case', 'evidence', 'timeline', 'notes', 'facts'],
  },
  'evidence-list': {
    name: 'Evidence List',
    description: 'Detailed inventory of all case evidence',
    sections: ['evidence'],
  },
  'timeline-report': {
    name: 'Timeline Report',
    description: 'Chronological timeline with deadlines and events',
    sections: ['timeline', 'deadlines'],
  },
  'case-notes': {
    name: 'Case Notes',
    description: 'All notes and observations for the case',
    sections: ['notes'],
  },
} as const;

export type ExportTemplate = keyof typeof EXPORT_TEMPLATES;
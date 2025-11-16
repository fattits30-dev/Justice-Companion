// src/models/Export.ts
import type { Case } from "./Case.ts";
import type { Evidence } from "./Evidence.ts";
import type { Deadline } from "./Deadline.ts";
import type { Document } from "./Document.ts";
import type { Note } from "./Note.ts";
import type { CaseFact } from "./CaseFact.ts";

export interface ExportOptions {
  format: "pdf" | "docx";
  template: "case-summary" | "evidence-list" | "timeline-report" | "case-notes";
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
  eventDate: string; // ISO 8601 date string
  eventType: "deadline" | "hearing" | "filing" | "milestone" | "other";
  completed: boolean;
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string; // ISO 8601 datetime string
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
  format: "pdf" | "docx";
  size: number; // File size in bytes
  exportedAt: Date;
  template: string;
}

export interface ExportError {
  code:
    | "PERMISSION_DENIED"
    | "CASE_NOT_FOUND"
    | "EXPORT_FAILED"
    | "INVALID_TEMPLATE";
  message: string;
  details?: string;
}

export interface TemplateData {
  [key: string]: unknown;
}

export interface DocumentStyles {
  title?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
    alignment?: "left" | "center" | "right";
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
    color?: string;
    lineHeight?: number;
  };
  footer?: {
    fontSize?: number;
    italic?: boolean;
    color?: string;
  };
}

// src/services/export/TemplateEngine.ts
import type {
  CaseExportData,
  EvidenceExportData,
  TimelineExportData,
  NotesExportData,
  ExportOptions,
  TemplateData
} from '../../models/Export.ts';
import type { Case } from '../../domains/cases/entities/Case.ts';
import type { Evidence } from '../../domains/evidence/entities/Evidence.ts';
import type { Note } from '../../models/Note.ts';
import type { Deadline } from '../../domains/timeline/entities/Deadline.ts';

export interface Template {
  name: string;
  description: string;
  sections: string[];
  format: (data: TemplateData) => any;
}

export class TemplateEngine {
  private templates: Map<string, Template> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Case Summary Template
    this.templates.set('case-summary', {
      name: 'Case Summary',
      description: 'Complete case details with evidence, timeline, and notes',
      sections: ['case', 'evidence', 'timeline', 'notes', 'facts'],
      format: (data: CaseExportData) => this.formatCaseSummary(data),
    });

    // Evidence List Template
    this.templates.set('evidence-list', {
      name: 'Evidence List',
      description: 'Detailed inventory of all case evidence',
      sections: ['evidence'],
      format: (data: EvidenceExportData) => this.formatEvidenceList(data),
    });

    // Timeline Report Template
    this.templates.set('timeline-report', {
      name: 'Timeline Report',
      description: 'Chronological timeline with deadlines and events',
      sections: ['timeline', 'deadlines'],
      format: (data: TimelineExportData) => this.formatTimelineReport(data),
    });

    // Case Notes Template
    this.templates.set('case-notes', {
      name: 'Case Notes',
      description: 'All notes and observations for the case',
      sections: ['notes'],
      format: (data: NotesExportData) => this.formatCaseNotes(data),
    });
  }

  getTemplate(templateName: string): Template | undefined {
    return this.templates.get(templateName);
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  applyTemplate(templateName: string, data: TemplateData): any {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    return template.format(data);
  }

  private formatCaseSummary(data: CaseExportData): any {
    const formatted: any = {
      title: `Case Summary: ${data.case.title}`,
      exportInfo: {
        date: data.exportDate,
        exportedBy: data.exportedBy,
      },
      sections: [],
    };

    // Case Information Section
    formatted.sections.push({
      title: 'Case Information',
      type: 'info',
      data: {
        'Case Number': data.case.caseNumber || 'N/A',
        'Status': data.case.status,
        'Created': new Date(data.case.createdAt).toLocaleDateString(),
        'Last Updated': new Date(data.case.updatedAt).toLocaleDateString(),
        'Description': data.case.description || 'No description provided',
      },
    });

    // Evidence Section
    if (data.evidence?.length > 0) {
      formatted.sections.push({
        title: 'Evidence',
        type: 'list',
        data: data.evidence.map(e => ({
          title: e.title,
          type: e.evidenceType,
          status: e.status,
          dateCollected: new Date(e.dateCollected).toLocaleDateString(),
          description: e.description,
          location: e.location,
          tags: e.tags?.join(', '),
        })),
      });
    }

    // Timeline Section
    if (data.timeline?.length > 0) {
      formatted.sections.push({
        title: 'Timeline',
        type: 'timeline',
        data: data.timeline.map(t => ({
          date: new Date(t.eventDate).toLocaleDateString(),
          title: t.title,
          description: t.description,
          type: t.eventType,
          completed: t.completed,
        })),
      });
    }

    // Deadlines Section
    if (data.deadlines?.length > 0) {
      formatted.sections.push({
        title: 'Deadlines',
        type: 'deadlines',
        data: data.deadlines.map(d => ({
          dueDate: new Date(d.dueDate).toLocaleDateString(),
          title: d.title,
          priority: d.priority,
          status: d.status,
          description: d.description,
        })),
      });
    }

    // Notes Section
    if (data.notes?.length > 0) {
      formatted.sections.push({
        title: 'Notes',
        type: 'notes',
        data: data.notes.map(n => ({
          date: new Date(n.createdAt).toLocaleDateString(),
          title: n.title,
          content: n.content,
          tags: n.tags?.join(', '),
        })),
      });
    }

    // Facts Section
    if (data.facts?.length > 0) {
      formatted.sections.push({
        title: 'Case Facts',
        type: 'facts',
        data: data.facts.map(f => ({
          statement: f.statement,
          source: f.source,
          confidence: f.confidence,
        })),
      });
    }

    return formatted;
  }

  private formatEvidenceList(data: EvidenceExportData): any {
    const categorySummary: Record<string, number> = {};

    // Calculate category summary
    data.evidence.forEach(item => {
      const category = item.evidenceType || 'Uncategorized';
      categorySummary[category] = (categorySummary[category] || 0) + 1;
    });

    return {
      title: 'Evidence Inventory Report',
      exportInfo: {
        date: data.exportDate,
        exportedBy: data.exportedBy,
        caseTitle: data.caseTitle,
      },
      summary: {
        totalItems: data.evidence.length,
        categorySummary,
      },
      evidence: data.evidence.map(e => ({
        id: e.id,
        title: e.title,
        type: e.evidenceType,
        status: e.status,
        dateCollected: new Date(e.dateCollected).toLocaleDateString(),
        description: e.description,
        location: e.location,
        chainOfCustody: e.chainOfCustody,
        tags: e.tags?.join(', '),
        metadata: e.metadata,
      })),
    };
  }

  private formatTimelineReport(data: TimelineExportData): any {
    const now = new Date();
    const upcomingDeadlines = data.deadlines.filter(
      d => new Date(d.dueDate) > now && d.status !== 'completed'
    );
    const completedEvents = data.events.filter(e => e.completed);
    const pendingEvents = data.events.filter(e => !e.completed);

    return {
      title: 'Timeline Report',
      exportInfo: {
        date: data.exportDate,
        exportedBy: data.exportedBy,
        caseTitle: data.caseTitle,
      },
      summary: {
        totalEvents: data.events.length,
        upcomingDeadlines: upcomingDeadlines.length,
        completedEvents: completedEvents.length,
        pendingEvents: pendingEvents.length,
      },
      upcomingDeadlines: upcomingDeadlines.map(d => ({
        dueDate: new Date(d.dueDate).toLocaleDateString(),
        title: d.title,
        priority: d.priority,
        status: d.status,
        description: d.description,
        daysRemaining: Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      timeline: {
        pending: pendingEvents.map(e => ({
          date: new Date(e.eventDate).toLocaleDateString(),
          title: e.title,
          description: e.description,
          type: e.eventType,
        })),
        completed: completedEvents.map(e => ({
          date: new Date(e.eventDate).toLocaleDateString(),
          title: e.title,
          description: e.description,
          type: e.eventType,
        })),
      },
    };
  }

  private formatCaseNotes(data: NotesExportData): any {
    // Group notes by date
    const notesByDate: Record<string, Note[]> = {};
    data.notes.forEach(note => {
      const dateKey = new Date(note.createdAt).toLocaleDateString();
      if (!notesByDate[dateKey]) {
        notesByDate[dateKey] = [];
      }
      notesByDate[dateKey].push(note);
    });

    return {
      title: 'Case Notes Report',
      exportInfo: {
        date: data.exportDate,
        exportedBy: data.exportedBy,
        caseTitle: data.caseTitle,
      },
      summary: {
        totalNotes: data.notes.length,
        dateRange: data.notes.length > 0 ? {
          earliest: new Date(Math.min(...data.notes.map(n => new Date(n.createdAt).getTime()))).toLocaleDateString(),
          latest: new Date(Math.max(...data.notes.map(n => new Date(n.createdAt).getTime()))).toLocaleDateString(),
        } : null,
      },
      notesByDate: Object.entries(notesByDate).map(([date, notes]) => ({
        date,
        notes: notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags?.join(', '),
          createdAt: new Date(n.createdAt).toLocaleString(),
        })),
      })),
    };
  }

  /**
   * Validates that the required data is present for a given template
   */
  validateDataForTemplate(templateName: string, data: any): boolean {
    const template = this.templates.get(templateName);
    if (!template) {
      return false;
    }

    switch (templateName) {
      case 'case-summary':
        return data.case && typeof data.case === 'object';
      case 'evidence-list':
        return data.evidence && Array.isArray(data.evidence);
      case 'timeline-report':
        return (data.events && Array.isArray(data.events)) ||
               (data.deadlines && Array.isArray(data.deadlines));
      case 'case-notes':
        return data.notes && Array.isArray(data.notes);
      default:
        return false;
    }
  }

  /**
   * Get template metadata
   */
  getTemplateMetadata(templateName: string): { name: string; description: string; sections: string[] } | null {
    const template = this.templates.get(templateName);
    if (!template) {
      return null;
    }

    return {
      name: template.name,
      description: template.description,
      sections: template.sections,
    };
  }
}
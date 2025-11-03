// src/services/export/ExportService.ts
import { injectable, inject } from 'inversify';
import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { errorLogger } from '../../utils/error-logger.ts';
import { TYPES } from '../../shared/infrastructure/di/types.ts';
import type { IDatabase } from '../../interfaces/IDatabase.ts';
import type { ICaseRepository } from '../../interfaces/ICaseRepository.ts';
import type { IEvidenceRepository } from '../../interfaces/IEvidenceRepository.ts';
import type { IDeadlineRepository } from '../../interfaces/IDeadlineRepository.ts';
import type { IDocumentRepository } from '../../interfaces/IDocumentRepository.ts';
import type { INoteRepository } from '../../interfaces/INoteRepository.ts';
import type { IEncryptionService } from '../../interfaces/IEncryptionService.ts';
import type { IAuditLogger } from '../../interfaces/IAuditLogger.ts';
import type { IUserRepository } from '../../interfaces/IUserRepository.ts';
import { PDFGenerator } from './PDFGenerator.ts';
import { DOCXGenerator } from './DOCXGenerator.ts';
import type {
  ExportOptions,
  ExportResult,
  CaseExportData,
  EvidenceExportData,
  TimelineExportData,
  NotesExportData,
  TimelineEvent,
} from '../../models/Export.ts';
import type { Case } from '../../domains/cases/entities/Case.ts';
import type { Evidence } from '../../domains/evidence/entities/Evidence.ts';
import type { Deadline } from '../../domains/timeline/entities/Deadline.ts';
import type { Document } from '../../models/Document.ts';
import type { Note } from '../../models/Note.ts';
import type { CaseFact } from '../../domains/cases/entities/CaseFact.ts';

export interface IExportService {
  exportCaseToPDF(caseId: number, userId: number, options?: Partial<ExportOptions>): Promise<ExportResult>;
  exportCaseToWord(caseId: number, userId: number, options?: Partial<ExportOptions>): Promise<ExportResult>;
  exportEvidenceListToPDF(caseId: number, userId: number): Promise<ExportResult>;
  exportTimelineReportToPDF(caseId: number, userId: number): Promise<ExportResult>;
  exportCaseNotesToPDF(caseId: number, userId: number): Promise<ExportResult>;
  exportCaseNotesToWord(caseId: number, userId: number): Promise<ExportResult>;
}

@injectable()
export class ExportService implements IExportService {
  private pdfGenerator: PDFGenerator;
  private docxGenerator: DOCXGenerator;
  private exportDir: string;

  constructor(
    // @ts-expect-error - Parameter required for DI but not currently used
    @inject(TYPES.Database) private _db: IDatabase,
    @inject(TYPES.CaseRepository) private caseRepo: ICaseRepository,
    @inject(TYPES.EvidenceRepository) private evidenceRepo: IEvidenceRepository,
    @inject(TYPES.DeadlineRepository) private deadlineRepo: IDeadlineRepository,
    @inject(TYPES.DocumentRepository) private documentRepo: IDocumentRepository,
    @inject(TYPES.NotesRepository) private noteRepo: INoteRepository,
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.EncryptionService) private encryption: IEncryptionService,
    @inject(TYPES.AuditLogger) private auditLogger: IAuditLogger
  ) {
    this.pdfGenerator = new PDFGenerator();
    this.docxGenerator = new DOCXGenerator();

    // Set up export directory
    this.exportDir = path.join(app.getPath('documents'), 'Justice-Companion', 'exports');
    this.ensureExportDirectory();
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'ExportService',
        operation: 'ensureExportDirectory',
        exportDir: this.exportDir,
      });
    }
  }

  async exportCaseToPDF(caseId: number, userId: number, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const fullOptions: ExportOptions = {
      format: 'pdf',
      template: options.template || 'case-summary',
      includeEvidence: options.includeEvidence ?? true,
      includeTimeline: options.includeTimeline ?? true,
      includeNotes: options.includeNotes ?? true,
      includeFacts: options.includeFacts ?? true,
      includeDocuments: options.includeDocuments ?? true,
      outputPath: options.outputPath,
      fileName: options.fileName,
    };

    try {
      // Validate user has access to case
      const hasAccess = await this.validateUserAccess(userId, caseId);
      if (!hasAccess) {
        throw new Error('Permission denied: User does not have access to this case');
      }

      // Gather case data
      const caseData = await this.gatherCaseData(caseId, userId, fullOptions);

      // Generate PDF based on template
      let pdfBuffer: Buffer;
      switch (fullOptions.template) {
        case 'case-summary':
          pdfBuffer = await this.pdfGenerator.generateCaseSummary(caseData);
          break;
        case 'evidence-list':
          const evidenceData = this.prepareEvidenceData(caseData);
          pdfBuffer = await this.pdfGenerator.generateEvidenceList(evidenceData);
          break;
        case 'timeline-report':
          const timelineData = this.prepareTimelineData(caseData);
          pdfBuffer = await this.pdfGenerator.generateTimelineReport(timelineData);
          break;
        case 'case-notes':
          const notesData = this.prepareNotesData(caseData);
          pdfBuffer = await this.pdfGenerator.generateCaseNotes(notesData);
          break;
        default:
          throw new Error(`Invalid template: ${fullOptions.template}`);
      }

      // Save PDF to file
      const filePath = await this.savePDFToFile(pdfBuffer, caseData.case, fullOptions);

      // Log export
      await this.auditLogger.logAction({
        userId,
        action: 'EXPORT_CASE_PDF',
        resourceType: 'CASE',
        resourceId: caseId,
        details: {
          template: fullOptions.template,
          filePath,
        },
      });

      return {
        success: true,
        filePath,
        fileName: path.basename(filePath),
        format: 'pdf',
        size: pdfBuffer.length,
        exportedAt: new Date(),
        template: fullOptions.template,
      };
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'ExportService',
        operation: 'exportCaseToPDF',
        caseId,
        userId,
        template: fullOptions.template,
      });
      throw error;
    }
  }

  async exportCaseToWord(caseId: number, userId: number, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const fullOptions: ExportOptions = {
      format: 'docx',
      template: options.template || 'case-summary',
      includeEvidence: options.includeEvidence ?? true,
      includeTimeline: options.includeTimeline ?? true,
      includeNotes: options.includeNotes ?? true,
      includeFacts: options.includeFacts ?? true,
      includeDocuments: options.includeDocuments ?? true,
      outputPath: options.outputPath,
      fileName: options.fileName,
    };

    try {
      // Validate user has access to case
      const hasAccess = await this.validateUserAccess(userId, caseId);
      if (!hasAccess) {
        throw new Error('Permission denied: User does not have access to this case');
      }

      // Gather case data
      const caseData = await this.gatherCaseData(caseId, userId, fullOptions);

      // Generate DOCX based on template
      let docxBuffer: Buffer;
      switch (fullOptions.template) {
        case 'case-summary':
          docxBuffer = await this.docxGenerator.generateCaseSummary(caseData);
          break;
        case 'evidence-list':
          const evidenceData = this.prepareEvidenceData(caseData);
          docxBuffer = await this.docxGenerator.generateEvidenceList(evidenceData);
          break;
        case 'timeline-report':
          const timelineData = this.prepareTimelineData(caseData);
          docxBuffer = await this.docxGenerator.generateTimelineReport(timelineData);
          break;
        case 'case-notes':
          const notesData = this.prepareNotesData(caseData);
          docxBuffer = await this.docxGenerator.generateCaseNotes(notesData);
          break;
        default:
          throw new Error(`Invalid template: ${fullOptions.template}`);
      }

      // Save DOCX to file
      const filePath = await this.saveDOCXToFile(docxBuffer, caseData.case, fullOptions);

      // Log export
      await this.auditLogger.logAction({
        userId,
        action: 'EXPORT_CASE_DOCX',
        resourceType: 'CASE',
        resourceId: caseId,
        details: {
          template: fullOptions.template,
          filePath,
        },
      });

      return {
        success: true,
        filePath,
        fileName: path.basename(filePath),
        format: 'docx',
        size: docxBuffer.length,
        exportedAt: new Date(),
        template: fullOptions.template,
      };
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'ExportService',
        operation: 'exportCaseToWord',
        caseId,
        userId,
        template: fullOptions.template,
      });
      throw error;
    }
  }

  async exportEvidenceListToPDF(caseId: number, userId: number): Promise<ExportResult> {
    return this.exportCaseToPDF(caseId, userId, {
      template: 'evidence-list',
      includeEvidence: true,
      includeTimeline: false,
      includeNotes: false,
      includeFacts: false,
    });
  }

  async exportTimelineReportToPDF(caseId: number, userId: number): Promise<ExportResult> {
    return this.exportCaseToPDF(caseId, userId, {
      template: 'timeline-report',
      includeEvidence: false,
      includeTimeline: true,
      includeNotes: false,
      includeFacts: false,
    });
  }

  async exportCaseNotesToPDF(caseId: number, userId: number): Promise<ExportResult> {
    return this.exportCaseToPDF(caseId, userId, {
      template: 'case-notes',
      includeEvidence: false,
      includeTimeline: false,
      includeNotes: true,
      includeFacts: false,
    });
  }

  async exportCaseNotesToWord(caseId: number, userId: number): Promise<ExportResult> {
    return this.exportCaseToWord(caseId, userId, {
      template: 'case-notes',
      includeEvidence: false,
      includeTimeline: false,
      includeNotes: true,
      includeFacts: false,
    });
  }

  private async validateUserAccess(userId: number, caseId: number): Promise<boolean> {
    // Check if user owns the case or has been granted access
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error('Case not found');
    }

    // For now, check if the user is the owner
    // In the future, this could check for shared access permissions
    return caseData.userId === userId;
  }

  private async gatherCaseData(caseId: number, userId: number, options: ExportOptions): Promise<CaseExportData> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get case data
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error('Case not found');
    }

    // Decrypt case fields
    const decryptedCase: Case = {
      ...caseData,
      title: await this.encryption.decrypt(caseData.title),
      description: caseData.description ? await this.encryption.decrypt(caseData.description) : null,
    };

    // Gather evidence if requested
    let evidence: Evidence[] = [];
    if (options.includeEvidence) {
      const rawEvidence = await this.evidenceRepo.findByCaseId(caseId);
      evidence = await Promise.all(rawEvidence.map(async (e) => ({
        ...e,
        title: await this.encryption.decrypt(e.title),
        filePath: e.filePath ? await this.encryption.decrypt(e.filePath) : null,
      })));
    }

    // Gather timeline events (simulated for now)
    let timeline: TimelineEvent[] = [];
    if (options.includeTimeline) {
      // Since we don't have a timeline repository yet, we'll use deadlines as events
      const deadlines = await this.deadlineRepo.findByCaseId(caseId);
      timeline = await Promise.all(deadlines.map(async (d) => ({
        id: d.id,
        caseId: d.caseId,
        title: await this.encryption.decrypt(d.title),
        description: d.description ? await this.encryption.decrypt(d.description) : undefined,
        eventDate: d.deadlineDate,
        eventType: 'deadline' as const,
        completed: d.status === 'completed',
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })));
    }

    // Gather deadlines
    let deadlines: Deadline[] = [];
    if (options.includeTimeline) {
      const rawDeadlines = await this.deadlineRepo.findByCaseId(caseId);
      deadlines = await Promise.all(rawDeadlines.map(async (d) => ({
        ...d,
        title: await this.encryption.decrypt(d.title),
        description: d.description ? await this.encryption.decrypt(d.description) : d.description,
      })));
    }

    // Gather notes if requested
    let notes: Note[] = [];
    if (options.includeNotes) {
      const rawNotes = await this.noteRepo.findByCaseId(caseId);
      notes = await Promise.all(rawNotes.map(async (n) => ({
        ...n,
        title: n.title ? await this.encryption.decrypt(n.title) : null,
        content: await this.encryption.decrypt(n.content),
      })));
    }

    // Gather facts (empty for now as we don't have a facts repository)
    const facts: CaseFact[] = [];

    // Gather documents if requested
    let documents: Document[] = [];
    if (options.includeDocuments) {
      const rawDocuments = await this.documentRepo.findByCaseId(caseId);
      documents = await Promise.all(rawDocuments.map(async (d) => ({
        ...d,
        fileName: await this.encryption.decrypt(d.fileName),
        filePath: await this.encryption.decrypt(d.filePath),
        description: d.description ? await this.encryption.decrypt(d.description) : undefined,
      })));
    }

    return {
      case: decryptedCase,
      evidence,
      timeline,
      deadlines,
      notes,
      facts,
      documents,
      exportDate: new Date(),
      exportedBy: user.username,
    };
  }

  private prepareEvidenceData(caseData: CaseExportData): EvidenceExportData {
    const categorySummary: Record<string, number> = {};
    caseData.evidence.forEach((e) => {
      const category = e.evidenceType || 'Uncategorized';
      categorySummary[category] = (categorySummary[category] || 0) + 1;
    });

    return {
      caseId: caseData.case.id,
      caseTitle: caseData.case.title,
      evidence: caseData.evidence,
      exportDate: caseData.exportDate,
      exportedBy: caseData.exportedBy,
      totalItems: caseData.evidence.length,
      categorySummary,
    };
  }

  private prepareTimelineData(caseData: CaseExportData): TimelineExportData {
    const now = new Date();
    const upcomingDeadlines = caseData.deadlines.filter(
      (d) => new Date(d.deadlineDate) > now && d.status !== 'completed'
    );
    const completedEvents = caseData.timeline.filter((e) => e.completed);

    return {
      caseId: caseData.case.id,
      caseTitle: caseData.case.title,
      events: caseData.timeline,
      deadlines: caseData.deadlines,
      exportDate: caseData.exportDate,
      exportedBy: caseData.exportedBy,
      upcomingDeadlines,
      completedEvents,
    };
  }

  private prepareNotesData(caseData: CaseExportData): NotesExportData {
    return {
      caseId: caseData.case.id,
      caseTitle: caseData.case.title,
      notes: caseData.notes,
      exportDate: caseData.exportDate,
      exportedBy: caseData.exportedBy,
      totalNotes: caseData.notes.length,
    };
  }

  private async savePDFToFile(buffer: Buffer, caseData: Case, options: ExportOptions): Promise<string> {
    let filePath: string;

    if (options.outputPath) {
      filePath = options.outputPath;
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = options.fileName ||
        `case-${caseData.id}-${options.template}-${timestamp}.pdf`;

      filePath = path.join(this.exportDir, fileName);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  private async saveDOCXToFile(buffer: Buffer, caseData: Case, options: ExportOptions): Promise<string> {
    let filePath: string;

    if (options.outputPath) {
      filePath = options.outputPath;
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = options.fileName ||
        `case-${caseData.id}-${options.template}-${timestamp}.docx`;

      filePath = path.join(this.exportDir, fileName);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return filePath;
  }
}
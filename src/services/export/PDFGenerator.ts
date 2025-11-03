// src/services/export/PDFGenerator.ts
import PDFDocument from 'pdfkit';
import type {
  CaseExportData,
  EvidenceExportData,
  TimelineExportData,
  NotesExportData,
  DocumentStyles,
} from '../../models/Export.ts';
import type { Evidence } from '../../domains/evidence/entities/Evidence.ts';
import type { Note } from '../../models/Note.ts';
import type { Deadline } from '../../domains/timeline/entities/Deadline.ts';

export class PDFGenerator {
  private readonly styles: DocumentStyles = {
    title: { fontSize: 24, bold: true, color: '#1a365d' },
    heading1: { fontSize: 18, bold: true, color: '#2c5282' },
    heading2: { fontSize: 14, bold: true, color: '#2d3748' },
    body: { fontSize: 11, lineHeight: 1.6 },
    footer: { fontSize: 9, italic: true, color: '#718096' },
  };

  private readonly pageMargins = {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  };

  async generateCaseSummary(caseData: CaseExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margin: this.pageMargins.top,
          size: 'A4',
          bufferPages: true,
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addHeader(doc, `Case Summary: ${caseData.case.title}`);

        // Case Information Section
        doc.fontSize(this.styles.heading1?.fontSize ?? 18)
          .fillColor(this.styles.heading1?.color ?? '#2c5282')
          .text('Case Information', this.pageMargins.left, doc.y + 20);

        doc.fontSize(this.styles.body?.fontSize ?? 11)
          .fillColor('#000000')
          .text(`Case ID: #${caseData.case.id}`, this.pageMargins.left, doc.y + 10)
          .text(`Type: ${caseData.case.caseType}`)
          .text(`Status: ${caseData.case.status}`)
          .text(`Created: ${new Date(caseData.case.createdAt).toLocaleDateString()}`)
          .text(`Last Updated: ${new Date(caseData.case.updatedAt).toLocaleDateString()}`);

        if (caseData.case.description) {
          doc.moveDown()
            .text('Description:', { underline: true })
            .text(caseData.case.description);
        }

        // Evidence Section
        if (caseData.evidence.length > 0) {
          doc.addPage();
          this.addEvidenceSection(doc, caseData.evidence);
        }

        // Timeline Section
        if (caseData.timeline.length > 0) {
          doc.addPage();
          this.addTimelineSection(doc, caseData.timeline);
        }

        // Deadlines Section
        if (caseData.deadlines.length > 0) {
          if (doc.y > 500) {doc.addPage();}
          this.addDeadlinesSection(doc, caseData.deadlines);
        }

        // Notes Section
        if (caseData.notes.length > 0) {
          doc.addPage();
          this.addNotesSection(doc, caseData.notes);
        }

        // Facts Section
        if (caseData.facts.length > 0) {
          if (doc.y > 500) {doc.addPage();}
          this.addFactsSection(doc, caseData.facts);
        }

        // Add footer to all pages
        this.addFooters(doc, caseData.exportDate, caseData.exportedBy);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateEvidenceList(evidenceData: EvidenceExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margin: this.pageMargins.top,
          size: 'A4',
          bufferPages: true,
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addHeader(doc, 'Evidence Inventory Report');

        // Case info
        doc.fontSize(this.styles.body?.fontSize ?? 11)
          .fillColor('#000000')
          .text(`Case: ${evidenceData.caseTitle}`, this.pageMargins.left, doc.y + 10)
          .text(`Total Evidence Items: ${evidenceData.totalItems}`)
          .text(`Export Date: ${evidenceData.exportDate.toLocaleDateString()}`);

        // Category Summary
        if (Object.keys(evidenceData.categorySummary).length > 0) {
          doc.moveDown()
            .fontSize(this.styles.heading2?.fontSize ?? 14)
            .fillColor(this.styles.heading2?.color ?? '#2d3748')
            .text('Evidence by Category:', this.pageMargins.left, doc.y + 10);

          doc.fontSize(this.styles.body?.fontSize ?? 11)
            .fillColor('#000000');

          Object.entries(evidenceData.categorySummary).forEach(([category, count]) => {
            doc.text(`• ${category}: ${count} item(s)`);
          });
        }

        // Detailed Evidence List
        doc.moveDown()
          .fontSize(this.styles.heading1?.fontSize ?? 18)
          .fillColor(this.styles.heading1?.color ?? '#2c5282')
          .text('Evidence Details', this.pageMargins.left, doc.y + 20);

        this.addEvidenceSection(doc, evidenceData.evidence);

        // Add footer to all pages
        this.addFooters(doc, evidenceData.exportDate, evidenceData.exportedBy);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateTimelineReport(timelineData: TimelineExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margin: this.pageMargins.top,
          size: 'A4',
          bufferPages: true,
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addHeader(doc, 'Timeline Report');

        // Case info
        doc.fontSize(this.styles.body?.fontSize ?? 11)
          .fillColor('#000000')
          .text(`Case: ${timelineData.caseTitle}`, this.pageMargins.left, doc.y + 10)
          .text(`Total Events: ${timelineData.events.length}`)
          .text(`Upcoming Deadlines: ${timelineData.upcomingDeadlines.length}`)
          .text(`Export Date: ${timelineData.exportDate.toLocaleDateString()}`);

        // Upcoming Deadlines
        if (timelineData.upcomingDeadlines.length > 0) {
          doc.moveDown()
            .fontSize(this.styles.heading1?.fontSize ?? 18)
            .fillColor('#ef4444') // Red for urgency
            .text('Upcoming Deadlines', this.pageMargins.left, doc.y + 20);

          this.addDeadlinesSection(doc, timelineData.upcomingDeadlines);
        }

        // Timeline Events
        if (timelineData.events.length > 0) {
          if (doc.y > 500) {doc.addPage();}

          doc.fontSize(this.styles.heading1?.fontSize ?? 18)
            .fillColor(this.styles.heading1?.color ?? '#2c5282')
            .text('Timeline Events', this.pageMargins.left, doc.y + 20);

          this.addTimelineSection(doc, timelineData.events);
        }

        // Completed Events
        if (timelineData.completedEvents.length > 0) {
          if (doc.y > 500) {doc.addPage();}

          doc.fontSize(this.styles.heading1?.fontSize ?? 18)
            .fillColor('#10b981') // Green for completed
            .text('Completed Events', this.pageMargins.left, doc.y + 20);

          this.addTimelineSection(doc, timelineData.completedEvents);
        }

        // Add footer to all pages
        this.addFooters(doc, timelineData.exportDate, timelineData.exportedBy);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateCaseNotes(notesData: NotesExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margin: this.pageMargins.top,
          size: 'A4',
          bufferPages: true,
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addHeader(doc, 'Case Notes Report');

        // Case info
        doc.fontSize(this.styles.body?.fontSize ?? 11)
          .fillColor('#000000')
          .text(`Case: ${notesData.caseTitle}`, this.pageMargins.left, doc.y + 10)
          .text(`Total Notes: ${notesData.totalNotes}`)
          .text(`Export Date: ${notesData.exportDate.toLocaleDateString()}`);

        // Notes Section
        doc.moveDown()
          .fontSize(this.styles.heading1?.fontSize ?? 18)
          .fillColor(this.styles.heading1?.color ?? '#2c5282')
          .text('Notes', this.pageMargins.left, doc.y + 20);

        this.addNotesSection(doc, notesData.notes);

        // Add footer to all pages
        this.addFooters(doc, notesData.exportDate, notesData.exportedBy);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(this.styles.title?.fontSize ?? 24)
      .fillColor(this.styles.title?.color ?? '#1a365d')
      .text(title, this.pageMargins.left, this.pageMargins.top, {
        align: 'center',
        width: doc.page.width - this.pageMargins.left - this.pageMargins.right,
      });

    // Add a line under the title
    doc.moveTo(this.pageMargins.left, doc.y + 10)
      .lineTo(doc.page.width - this.pageMargins.right, doc.y + 10)
      .strokeColor('#cbd5e0')
      .stroke();

    doc.moveDown(2);
  }

  private addFooters(doc: PDFKit.PDFDocument, exportDate: Date, exportedBy: string): void {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Add page number
      doc.fontSize(this.styles.footer?.fontSize ?? 9)
        .fillColor(this.styles.footer?.color ?? '#718096')
        .text(
          `Page ${i + 1} of ${pages.count}`,
          this.pageMargins.left,
          doc.page.height - 40,
          {
            align: 'center',
            width: doc.page.width - this.pageMargins.left - this.pageMargins.right,
          }
        );

      // Add export info
      doc.text(
        `Exported by ${exportedBy} on ${exportDate.toLocaleDateString()}`,
        this.pageMargins.left,
        doc.page.height - 25,
        {
          align: 'center',
          width: doc.page.width - this.pageMargins.left - this.pageMargins.right,
        }
      );
    }
  }

  private addEvidenceSection(doc: PDFKit.PDFDocument, evidence: Evidence[]): void {
    doc.fontSize(this.styles.heading1?.fontSize ?? 18)
      .fillColor(this.styles.heading1?.color ?? '#2c5282')
      .text('Evidence', this.pageMargins.left, doc.y + 10);

    doc.fontSize(this.styles.body?.fontSize ?? 11)
      .fillColor('#000000');

    evidence.forEach((item, index) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.moveDown()
        .fontSize(this.styles.heading2?.fontSize ?? 14)
        .fillColor(this.styles.heading2?.color ?? '#2d3748')
        .text(`${index + 1}. ${item.title}`, this.pageMargins.left, doc.y);

      doc.fontSize(this.styles.body?.fontSize ?? 11)
        .fillColor('#000000')
        .text(`Type: ${item.evidenceType}`);

      if (item.obtainedDate) {
        doc.text(`Date Obtained: ${new Date(item.obtainedDate).toLocaleDateString()}`);
      }

      if (item.filePath) {
        doc.text(`File: ${item.filePath}`);
      }

      if (item.content) {
        doc.text(`Content: ${item.content}`);
      }
    });
  }

  private addTimelineSection(doc: PDFKit.PDFDocument, timeline: any[]): void {
    doc.fontSize(this.styles.body?.fontSize ?? 11)
      .fillColor('#000000');

    timeline.forEach((event) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.moveDown()
        .fontSize(this.styles.heading2?.fontSize ?? 14)
        .fillColor(this.styles.heading2?.color ?? '#2d3748')
        .text(`${new Date(event.eventDate).toLocaleDateString()} - ${event.title}`, this.pageMargins.left, doc.y);

      doc.fontSize(this.styles.body?.fontSize ?? 11)
        .fillColor('#000000');

      if (event.description) {
        doc.text(event.description);
      }

      doc.text(`Type: ${event.eventType}`)
        .text(`Status: ${event.completed ? 'Completed' : 'Pending'}`);
    });
  }

  private addDeadlinesSection(doc: PDFKit.PDFDocument, deadlines: Deadline[]): void {
    doc.fontSize(this.styles.body?.fontSize ?? 11)
      .fillColor('#000000');

    deadlines.forEach((deadline) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      const isOverdue = new Date(deadline.deadlineDate) < new Date() && deadline.status !== 'completed';
      const color = isOverdue ? '#ef4444' : deadline.status === 'completed' ? '#10b981' : '#000000';

      doc.moveDown()
        .fontSize(this.styles.heading2?.fontSize ?? 14)
        .fillColor(color)
        .text(`${new Date(deadline.deadlineDate).toLocaleDateString()} - ${deadline.title}`, this.pageMargins.left, doc.y);

      doc.fontSize(this.styles.body?.fontSize ?? 11)
        .fillColor('#000000')
        .text(`Priority: ${deadline.priority}`)
        .text(`Status: ${deadline.status}`);

      if (deadline.description) {
        doc.text(`Description: ${deadline.description}`);
      }
    });
  }

  private addNotesSection(doc: PDFKit.PDFDocument, notes: Note[]): void {
    doc.fontSize(this.styles.body?.fontSize ?? 11)
      .fillColor('#000000');

    notes.forEach((note, index) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.moveDown()
        .fontSize(this.styles.heading2?.fontSize ?? 14)
        .fillColor(this.styles.heading2?.color ?? '#2d3748')
        .text(`Note ${index + 1} - ${new Date(note.createdAt).toLocaleDateString()}`, this.pageMargins.left, doc.y);

      doc.fontSize(this.styles.body?.fontSize ?? 11)
        .fillColor('#000000');

      if (note.title) {
        doc.text(`Title: ${note.title}`, { underline: true });
      }

      doc.text(note.content);
    });
  }

  private addFactsSection(doc: PDFKit.PDFDocument, facts: any[]): void {
    doc.fontSize(this.styles.heading1?.fontSize ?? 18)
      .fillColor(this.styles.heading1?.color ?? '#2c5282')
      .text('Case Facts', this.pageMargins.left, doc.y + 10);

    doc.fontSize(this.styles.body?.fontSize ?? 11)
      .fillColor('#000000');

    facts.forEach((fact, index) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.moveDown()
        .text(`${index + 1}. ${fact.statement}`, this.pageMargins.left, doc.y);

      if (fact.source) {
        doc.text(`   Source: ${fact.source}`, { indent: 20 });
      }

      if (fact.confidence) {
        doc.text(`   Confidence: ${fact.confidence}`, { indent: 20 });
      }
    });
  }
}
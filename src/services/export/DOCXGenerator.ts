// src/services/export/DOCXGenerator.ts
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  Packer,
} from 'docx';
import type {
  CaseExportData,
  EvidenceExportData,
  TimelineExportData,
  NotesExportData,
  TimelineEvent,
} from '../../models/Export.ts';
import type { Evidence } from '../../domains/evidence/entities/Evidence.ts';
import type { Note } from '../../models/Note.ts';

export class DOCXGenerator {
  async generateCaseSummary(caseData: CaseExportData): Promise<Buffer> {
    // Build children array with proper typing
    const children: (Paragraph | PageBreak)[] = [
      ...this.createTitle('Case Summary'),
      ...this.createCaseInfo(caseData),
    ];

    // Add evidence section if present
    if (caseData.evidence.length > 0) {
      children.push(new PageBreak());
      children.push(...this.createEvidenceSection(caseData.evidence));
    }

    // Add timeline section if present
    if (caseData.timeline.length > 0) {
      children.push(new PageBreak());
      children.push(...this.createTimelineSection(caseData.timeline));
    }

    // Add notes section if present
    if (caseData.notes.length > 0) {
      children.push(new PageBreak());
      children.push(...this.createNotesSection(caseData.notes));
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Case: ${caseData.case.title}`,
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Exported by ${caseData.exportedBy} on ${caseData.exportDate.toLocaleDateString()}`,
                    size: 18,
                  }),
                  new TextRun({
                    text: ' | Page ',
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: children as any,
      }],
    });

    return await Packer.toBuffer(doc);
  }

  private createTitle(title: string): Paragraph[] {
    return [
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
    ];
  }

  private createCaseInfo(caseData: CaseExportData): Paragraph[] {
    return [
      new Paragraph({
        text: `Case ID: ${caseData.case.id}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Description: ${caseData.case.description}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Status: ${caseData.case.status}`,
        spacing: { after: 200 },
      }),
    ];
  }

  private createEvidenceSection(evidenceList: Evidence[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Evidence',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
    ];

    evidenceList.forEach((evidence) => {
      paragraphs.push(
        new Paragraph({
          text: evidence.title,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: `Type: ${evidence.evidenceType}`,
          spacing: { after: 100 },
        })
      );
      if (evidence.obtainedDate) {
        paragraphs.push(
          new Paragraph({
            text: `Date Obtained: ${new Date(evidence.obtainedDate).toLocaleDateString()}`,
            spacing: { after: 200 },
          })
        );
      }
    });

    return paragraphs;
  }

  private createTimelineSection(timelineItems: TimelineEvent[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Timeline',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
    ];

    timelineItems.forEach((item) => {
      paragraphs.push(
        new Paragraph({
          text: item.title,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        })
      );
      if (item.description) {
        paragraphs.push(
          new Paragraph({
            text: item.description,
            spacing: { after: 100 },
          })
        );
      }
      paragraphs.push(
        new Paragraph({
          text: `Event Date: ${new Date(item.eventDate).toLocaleDateString()}`,
          spacing: { after: 200 },
        })
      );
    });

    return paragraphs;
  }

  private createNotesSection(notes: Note[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Notes',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
    ];

    notes.forEach((note) => {
      paragraphs.push(
        new Paragraph({
          text: note.title || 'Untitled Note',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: note.content,
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: `Created: ${new Date(note.createdAt).toLocaleDateString()}`,
          spacing: { after: 200 },
        })
      );
    });

    return paragraphs;
  }

  async generateEvidenceList(evidenceData: EvidenceExportData): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          ...this.createTitle('Evidence Inventory Report'),
          new Paragraph({
            text: `Case: ${evidenceData.caseTitle}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Total Evidence Items: ${evidenceData.totalItems}`,
            spacing: { after: 200 },
          }),
          ...this.createEvidenceSection(evidenceData.evidence),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }

  async generateTimelineReport(timelineData: TimelineExportData): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          ...this.createTitle('Timeline Report'),
          new Paragraph({
            text: `Case: ${timelineData.caseTitle}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Total Events: ${timelineData.events.length}`,
            spacing: { after: 200 },
          }),
          ...this.createTimelineSection(timelineData.events),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }

  async generateCaseNotes(notesData: NotesExportData): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          ...this.createTitle('Case Notes Report'),
          new Paragraph({
            text: `Case: ${notesData.caseTitle}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Total Notes: ${notesData.totalNotes}`,
            spacing: { after: 200 },
          }),
          ...this.createNotesSection(notesData.notes),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }
}
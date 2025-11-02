// src/services/export/DOCXGenerator.ts
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import type {
  CaseExportData,
} from '../../models/Export.ts';
import type { Evidence } from '../../domains/evidence/entities/Evidence.ts';
import type { Note } from '../../models/Note.ts';
import type { Deadline } from '../../domains/timeline/entities/Deadline.ts';

export class DOCXGenerator {
  async generateCaseSummary(caseData: CaseExportData): Promise<Buffer> {
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
        children: [
          ...this.createTitle('Case Summary'),
          ...this.createCaseInfo(caseData),
          ...(caseData.evidence.length > 0 ? [
            new PageBreak(),
            ...this.createEvidenceSection(caseData.evidence),
          ] : []),
          ...(caseData.timeline.length > 0 ? [
            new PageBreak(),
            ...this.createTimelineSection(caseData.timeline),
          ] : []),
          ...(caseData.notes.length > 0 ? [
            new PageBreak(),
            ...this.createNotesSection(caseData.notes),
          ] : []),
        ],
      }],
    });

    return await Document.saveAsBuffer(doc);
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
          text: evidence.description,
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: `Date Added: ${evidence.dateAdded.toLocaleDateString()}`,
          spacing: { after: 200 },
        })
      );
    });

    return paragraphs;
  }

  private createTimelineSection(timelineItems: Deadline[]): Paragraph[] {
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
      paragraphs.push(
        new Paragraph({
          text: item.description,
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: `Due Date: ${item.dueDate.toLocaleDateString()}`,
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
          text: note.title,
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
          text: `Created: ${note.createdAt.toLocaleDateString()}`,
          spacing: { after: 200 },
        })
      );
    });

    return paragraphs;
  }
}
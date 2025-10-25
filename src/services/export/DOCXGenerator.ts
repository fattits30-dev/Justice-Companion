// src/services/export/DOCXGenerator.ts
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
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
  EvidenceExportData,
  TimelineExportData,
  NotesExportData,
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
          ...(caseData.deadlines.length > 0 ? [
            new PageBreak(),
            ...this.createDeadlinesSection(caseData.deadlines),
          ] : []),
          ...(caseData.notes.length > 0 ? [
            new PageBreak(),
            ...this.createNotesSection(caseData.notes),
          ] : []),
          ...(caseData.facts.length > 0 ? [
            new PageBreak(),
            ...this.createFactsSection(caseData.facts),
          ] : []),
        ],
      }],
    });

    return Buffer.from(await doc.toBlob().arrayBuffer());
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
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Evidence Inventory Report',
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: this.createFooter(evidenceData.exportDate, evidenceData.exportedBy),
        },
        children: [
          ...this.createTitle('Evidence Inventory Report'),
          new Paragraph({
            children: [
              new TextRun({
                text: `Case: ${evidenceData.caseTitle}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Evidence Items: ${evidenceData.totalItems}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Export Date: ${evidenceData.exportDate.toLocaleDateString()}`,
              }),
            ],
          }),
          new Paragraph({}), // Empty paragraph for spacing
          ...(Object.keys(evidenceData.categorySummary).length > 0 ? [
            new Paragraph({
              text: 'Evidence by Category',
              heading: HeadingLevel.HEADING_2,
            }),
            ...Object.entries(evidenceData.categorySummary).map(([category, count]) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${category}: ${count} item(s)`,
                  }),
                ],
                indent: {
                  left: 360,
                },
              })
            ),
            new Paragraph({}),
          ] : []),
          ...this.createEvidenceSection(evidenceData.evidence),
        ],
      }],
    });

    return Buffer.from(await doc.toBlob().arrayBuffer());
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
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Timeline Report',
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: this.createFooter(timelineData.exportDate, timelineData.exportedBy),
        },
        children: [
          ...this.createTitle('Timeline Report'),
          new Paragraph({
            children: [
              new TextRun({
                text: `Case: ${timelineData.caseTitle}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Events: ${timelineData.events.length}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Upcoming Deadlines: ${timelineData.upcomingDeadlines.length}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Export Date: ${timelineData.exportDate.toLocaleDateString()}`,
              }),
            ],
          }),
          new Paragraph({}),
          ...(timelineData.upcomingDeadlines.length > 0 ? [
            new Paragraph({
              text: 'Upcoming Deadlines',
              heading: HeadingLevel.HEADING_1,
              shading: {
                fill: 'FEF2F2', // Light red background
              },
            }),
            ...this.createDeadlinesSection(timelineData.upcomingDeadlines),
            new PageBreak(),
          ] : []),
          ...(timelineData.events.length > 0 ? [
            new Paragraph({
              text: 'Timeline Events',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this.createTimelineSection(timelineData.events),
          ] : []),
          ...(timelineData.completedEvents.length > 0 ? [
            new PageBreak(),
            new Paragraph({
              text: 'Completed Events',
              heading: HeadingLevel.HEADING_1,
              shading: {
                fill: 'F0FDF4', // Light green background
              },
            }),
            ...this.createTimelineSection(timelineData.completedEvents),
          ] : []),
        ],
      }],
    });

    return Buffer.from(await doc.toBlob().arrayBuffer());
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
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Case Notes Report',
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: this.createFooter(notesData.exportDate, notesData.exportedBy),
        },
        children: [
          ...this.createTitle('Case Notes Report'),
          new Paragraph({
            children: [
              new TextRun({
                text: `Case: ${notesData.caseTitle}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Notes: ${notesData.totalNotes}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Export Date: ${notesData.exportDate.toLocaleDateString()}`,
              }),
            ],
          }),
          new Paragraph({}),
          ...this.createNotesSection(notesData.notes),
        ],
      }],
    });

    return Buffer.from(await doc.toBlob().arrayBuffer());
  }

  private createTitle(title: string): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 48,
            color: '1A365D',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400,
        },
      }),
    ];
  }

  private createFooter(exportDate: Date, exportedBy: string): Footer {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `Exported by ${exportedBy} on ${exportDate.toLocaleDateString()}`,
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
    });
  }

  private createCaseInfo(caseData: CaseExportData): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Case Information',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Case Number: ',
            bold: true,
          }),
          new TextRun({
            text: caseData.case.caseNumber || 'N/A',
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Status: ',
            bold: true,
          }),
          new TextRun({
            text: caseData.case.status,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Created: ',
            bold: true,
          }),
          new TextRun({
            text: new Date(caseData.case.createdAt).toLocaleDateString(),
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Last Updated: ',
            bold: true,
          }),
          new TextRun({
            text: new Date(caseData.case.updatedAt).toLocaleDateString(),
          }),
        ],
      }),
    ];

    if (caseData.case.description) {
      paragraphs.push(
        new Paragraph({}),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Description:',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          text: caseData.case.description,
          indent: {
            left: 360,
          },
        })
      );
    }

    return paragraphs;
  }

  private createEvidenceSection(evidence: Evidence[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Evidence',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    if (evidence.length === 0) {
      paragraphs.push(
        new Paragraph({
          text: 'No evidence items found.',
          italics: true,
        })
      );
      return paragraphs;
    }

    // Create evidence table
    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        // Header row
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Title', bold: true })],
              shading: { fill: 'E2E8F0' },
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Type', bold: true })],
              shading: { fill: 'E2E8F0' },
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Status', bold: true })],
              shading: { fill: 'E2E8F0' },
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Date Collected', bold: true })],
              shading: { fill: 'E2E8F0' },
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Description', bold: true })],
              shading: { fill: 'E2E8F0' },
            }),
          ],
        }),
        // Data rows
        ...evidence.map(item =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: item.title })],
              }),
              new TableCell({
                children: [new Paragraph({ text: item.evidenceType })],
              }),
              new TableCell({
                children: [new Paragraph({ text: item.status })],
              }),
              new TableCell({
                children: [new Paragraph({ text: new Date(item.dateCollected).toLocaleDateString() })],
              }),
              new TableCell({
                children: [new Paragraph({ text: item.description || 'N/A' })],
              }),
            ],
          })
        ),
      ],
    });

    paragraphs.push(table);
    return paragraphs;
  }

  private createTimelineSection(timeline: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    timeline.forEach((event, index) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${new Date(event.eventDate).toLocaleDateString()} - ${event.title}`,
              bold: true,
              size: 24,
            }),
          ],
          spacing: {
            before: index > 0 ? 200 : 0,
          },
        })
      );

      if (event.description) {
        paragraphs.push(
          new Paragraph({
            text: event.description,
            indent: { left: 360 },
          })
        );
      }

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Type: ',
              bold: true,
            }),
            new TextRun({
              text: event.eventType,
            }),
          ],
          indent: { left: 360 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Status: ',
              bold: true,
            }),
            new TextRun({
              text: event.completed ? 'Completed' : 'Pending',
              color: event.completed ? '10B981' : 'EF4444',
            }),
          ],
          indent: { left: 360 },
        })
      );
    });

    return paragraphs;
  }

  private createDeadlinesSection(deadlines: Deadline[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    deadlines.forEach((deadline, index) => {
      const isOverdue = new Date(deadline.dueDate) < new Date() && deadline.status !== 'completed';
      const color = isOverdue ? 'EF4444' : deadline.status === 'completed' ? '10B981' : '000000';

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${new Date(deadline.dueDate).toLocaleDateString()} - ${deadline.title}`,
              bold: true,
              size: 24,
              color,
            }),
          ],
          spacing: {
            before: index > 0 ? 200 : 0,
          },
        })
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Priority: ',
              bold: true,
            }),
            new TextRun({
              text: deadline.priority,
              color: deadline.priority === 'high' ? 'EF4444' : deadline.priority === 'medium' ? 'F59E0B' : '000000',
            }),
          ],
          indent: { left: 360 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Status: ',
              bold: true,
            }),
            new TextRun({
              text: deadline.status,
              color: deadline.status === 'completed' ? '10B981' : '000000',
            }),
          ],
          indent: { left: 360 },
        })
      );

      if (deadline.description) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Description: ',
                bold: true,
              }),
              new TextRun({
                text: deadline.description,
              }),
            ],
            indent: { left: 360 },
          })
        );
      }
    });

    return paragraphs;
  }

  private createNotesSection(notes: Note[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Notes',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    notes.forEach((note, index) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Note ${index + 1} - ${new Date(note.createdAt).toLocaleDateString()}`,
              bold: true,
              size: 24,
            }),
          ],
          spacing: {
            before: 200,
          },
        })
      );

      if (note.title) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: note.title,
                underline: {},
              }),
            ],
            indent: { left: 360 },
          })
        );
      }

      paragraphs.push(
        new Paragraph({
          text: note.content,
          indent: { left: 360 },
        })
      );

      if (note.tags?.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tags: ',
                bold: true,
              }),
              new TextRun({
                text: note.tags.join(', '),
                italics: true,
              }),
            ],
            indent: { left: 360 },
          })
        );
      }
    });

    return paragraphs;
  }

  private createFactsSection(facts: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Case Facts',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    facts.forEach((fact, index) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${fact.statement}`,
            }),
          ],
          numbering: {
            reference: 'facts-list',
            level: 0,
          },
        })
      );

      if (fact.source) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Source: ',
                bold: true,
              }),
              new TextRun({
                text: fact.source,
                italics: true,
              }),
            ],
            indent: { left: 720 },
          })
        );
      }

      if (fact.confidence) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Confidence: ',
                bold: true,
              }),
              new TextRun({
                text: fact.confidence,
              }),
            ],
            indent: { left: 720 },
          })
        );
      }
    });

    return paragraphs;
  }
}
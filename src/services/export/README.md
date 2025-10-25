# Export Service

A comprehensive document export system for Justice Companion that enables users to export case data to PDF and Word (DOCX) formats with professional styling and templates.

## Features

### Export Formats
- **PDF** - Professional PDF documents with headers, footers, and page numbers
- **DOCX** - Microsoft Word documents with proper formatting and tables

### Built-in Templates
1. **Case Summary** - Complete case details including evidence, timeline, deadlines, notes, and facts
2. **Evidence List** - Detailed inventory of all case evidence with categorization
3. **Timeline Report** - Chronological timeline with deadlines and events
4. **Case Notes** - All notes and observations for the case

### Key Capabilities
- **Encryption Handling** - Automatically decrypts all encrypted fields before export
- **Audit Logging** - Every export operation is logged for compliance
- **Permission Checking** - Validates user access before allowing export
- **Custom Output Paths** - Support for user-specified save locations
- **Professional Styling** - Headers, footers, page numbers, and consistent formatting

## Architecture

### Components

#### ExportService (`ExportService.ts`)
Main service orchestrating the export process:
- Validates user permissions
- Gathers and decrypts case data
- Coordinates with generators and template engine
- Manages file saving and audit logging

#### PDFGenerator (`PDFGenerator.ts`)
Generates PDF documents using PDFKit:
- Professional styling with custom fonts and colors
- Page headers and footers
- Table of contents capability
- Automatic page breaks

#### DOCXGenerator (`DOCXGenerator.ts`)
Generates Word documents using the `docx` library:
- Structured document sections
- Tables with proper formatting
- Headers and footers with page numbers
- Style definitions for consistency

#### TemplateEngine (`TemplateEngine.ts`)
Manages export templates:
- Template validation
- Data formatting for different templates
- Template metadata management

## Usage

### From Frontend

```typescript
// Export case to PDF
const result = await window.electron.export.caseToPdf(caseId, userId, {
  template: 'case-summary',
  includeEvidence: true,
  includeTimeline: true,
  includeNotes: true
});

// Export case to Word
const result = await window.electron.export.caseToWord(caseId, userId, {
  template: 'case-summary'
});

// Export specific reports
const evidenceReport = await window.electron.export.evidenceListToPdf(caseId, userId);
const timelineReport = await window.electron.export.timelineReportToPdf(caseId, userId);
const notesReportPdf = await window.electron.export.caseNotesToPdf(caseId, userId);
const notesReportWord = await window.electron.export.caseNotesToWord(caseId, userId);

// Get available templates
const templates = await window.electron.export.getTemplates();

// Custom export with options
const customExport = await window.electron.export.custom(caseId, userId, {
  format: 'pdf',
  template: 'timeline-report',
  includeEvidence: false,
  outputPath: '/custom/path/report.pdf'
});
```

### Export Options

```typescript
interface ExportOptions {
  format: 'pdf' | 'docx';
  template: 'case-summary' | 'evidence-list' | 'timeline-report' | 'case-notes';
  includeEvidence?: boolean;
  includeTimeline?: boolean;
  includeNotes?: boolean;
  includeFacts?: boolean;
  includeDocuments?: boolean;
  outputPath?: string;  // Custom save location
  fileName?: string;    // Custom filename
}
```

## File Output

By default, exported files are saved to:
```
[Documents]/Justice-Companion/exports/
```

File naming convention:
```
[caseNumber]-[template]-[timestamp].[format]
```

Example:
```
CASE-001-case-summary-2024-01-15T14-30-00.pdf
```

## Security

### Permission Validation
- Validates user has access to the case before export
- Currently checks if user owns the case
- Future: Support for shared access permissions

### Data Decryption
All encrypted fields are automatically decrypted before export:
- Case title and description
- Evidence titles, descriptions, and file paths
- Deadline titles and descriptions
- Note titles and content
- Document filenames and paths

### Audit Trail
Every export operation is logged with:
- User ID
- Action type (EXPORT_CASE_PDF, EXPORT_CASE_DOCX)
- Resource type and ID
- Template used
- Output file path
- Timestamp

## Professional Styling

### PDF Styling
- **Title**: 24pt, bold, navy blue (#1a365d)
- **Heading 1**: 18pt, bold, blue (#2c5282)
- **Heading 2**: 14pt, bold, dark gray (#2d3748)
- **Body**: 11pt, line height 1.6
- **Footer**: 9pt, italic, gray (#718096)
- **Page margins**: 72pt (1 inch) on all sides

### Word Styling
- **Title**: 48pt, bold, navy blue, centered
- **Headings**: Hierarchical with appropriate sizing
- **Tables**: Professional borders and header shading
- **Page numbers**: Footer with "Page X of Y"
- **Margins**: 1440 twips (1 inch) on all sides

## Template Details

### Case Summary Template
Includes:
- Case information (number, status, dates, description)
- Evidence inventory with categories
- Timeline events with completion status
- Upcoming and overdue deadlines
- All case notes
- Case facts with confidence levels

### Evidence List Template
Includes:
- Case identification
- Total evidence count
- Category summary
- Detailed evidence table with:
  - Title, type, status
  - Collection date
  - Description
  - Location
  - Tags

### Timeline Report Template
Includes:
- Case identification
- Event statistics
- Upcoming deadlines (highlighted in red)
- Timeline events (chronological)
- Completed events (highlighted in green)
- Days remaining for deadlines

### Case Notes Template
Includes:
- Case identification
- Total notes count
- Notes grouped by date
- Note titles and content
- Associated tags

## Testing

The service includes comprehensive unit tests covering:
- PDF and DOCX generation for all templates
- Permission validation
- Data decryption
- Audit logging
- Error handling
- Custom export options
- Template selection

Run tests:
```bash
pnpm test src/services/export/ExportService.test.ts
```

## Dependencies

- **pdfkit**: PDF generation
- **docx**: Word document generation
- **file-saver**: File download handling (frontend)
- **@types/pdfkit**: TypeScript definitions
- **@types/file-saver**: TypeScript definitions

## Future Enhancements

1. **Additional Templates**
   - Court filing documents
   - Client correspondence
   - Legal brief formats

2. **Advanced Features**
   - Watermarking
   - Digital signatures
   - Password protection
   - Email integration

3. **Template Customization**
   - User-defined templates
   - Template editor UI
   - Custom styling options

4. **Batch Export**
   - Export multiple cases
   - Scheduled exports
   - Automated report generation

5. **Format Support**
   - Excel (.xlsx) for data tables
   - HTML for web viewing
   - Markdown for documentation
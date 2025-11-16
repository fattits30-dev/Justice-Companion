# PDF Generator Service

**Converted from TypeScript:** `src/services/export/PDFGenerator.ts`
**Python Version:** `backend/services/export/pdf_generator.py`

## Overview

The PDF Generator service provides comprehensive PDF document generation capabilities for Justice Companion. It creates professionally formatted PDF reports for case summaries, evidence lists, timeline reports, and case notes with automatic page breaks, headers, footers, and color-coded sections.

## Features

- **Case Summary PDFs**: Complete case information with all related entities
- **Evidence Inventory Reports**: Detailed evidence lists with category summaries
- **Timeline Reports**: Event timelines with upcoming deadlines and completion status
- **Case Notes Compilations**: Formatted notes with timestamps and titles
- **Professional Formatting**: Headers, footers, page numbers, color-coded sections
- **Automatic Page Breaks**: Intelligent pagination with overflow handling
- **Customizable Styling**: Configurable fonts, colors, and margins
- **Audit Logging**: Optional integration with AuditLogger service
- **Type Safety**: Comprehensive Pydantic models for input validation

## Dependencies

```bash
# Already included in requirements.txt
reportlab==4.2.5  # PDF generation library
pydantic[email]==2.9.2  # Data validation
```

## Architecture

### Core Components

```
pdf_generator.py
├── PDFGenerator (main service class)
├── Pydantic Models
│   ├── DocumentStyles (styling configuration)
│   ├── PageMargins (margin configuration)
│   ├── CaseExportData (case data structure)
│   ├── EvidenceExportData (evidence data structure)
│   ├── TimelineExportData (timeline data structure)
│   └── NotesExportData (notes data structure)
└── Helper Methods
    ├── _build_case_info_section()
    ├── _build_evidence_section()
    ├── _build_timeline_section()
    ├── _build_deadlines_section()
    ├── _build_notes_section()
    ├── _build_facts_section()
    └── _add_footer()
```

### Conversion Notes

**TypeScript → Python Mappings:**

| TypeScript | Python |
|------------|--------|
| `Promise<Buffer>` | `async def ... -> bytes` |
| `PDFDocument` (pdfkit) | `SimpleDocTemplate` (reportlab) |
| Interface types | Pydantic BaseModel classes |
| `chunks: Buffer[]` | `BytesIO` buffer |
| `doc.on('data', ...)` | Direct buffer writing |
| `fontSize()` chaining | ParagraphStyle configuration |
| `fillColor()` | HexColor in styles |
| `bufferedPageRange()` | Page number tracking in footer |

**Key Differences:**
- ReportLab uses a different API than PDFKit (Platypus story model vs. direct canvas drawing)
- Python async/await syntax instead of Promise callbacks
- Pydantic models provide runtime validation (TypeScript only has compile-time types)
- Footer generation uses canvas callbacks instead of post-processing all pages

## Usage

### Basic Usage

```python
from backend.services.export.pdf_generator import PDFGenerator, CaseExportData
from datetime import datetime

# Initialize generator
generator = PDFGenerator()

# Prepare case data
case_data = CaseExportData(
    case=CaseData(
        id=1,
        title="Employment Discrimination Case",
        description="Case involving workplace discrimination claims.",
        case_type="employment",
        status="active",
        created_at="2025-01-01T10:00:00",
        updated_at="2025-01-13T15:30:00",
    ),
    evidence=[...],
    timeline=[...],
    deadlines=[...],
    notes=[...],
    facts=[...],
    export_date=datetime.now(),
    exported_by="John Doe",
)

# Generate PDF
pdf_bytes = await generator.generate_case_summary(case_data)

# Save to file
with open("case_summary.pdf", "wb") as f:
    f.write(pdf_bytes)
```

### With Custom Styling

```python
from backend.services.export.pdf_generator import (
    PDFGenerator,
    DocumentStyles,
    PageMargins,
)

# Custom styles
custom_styles = DocumentStyles(
    title_font_size=28,
    title_color="#000000",
    heading1_font_size=20,
    heading1_color="#1a1a1a",
    body_font_size=12,
)

# Custom margins (in points, 72 points = 1 inch)
custom_margins = PageMargins(
    top=90,
    bottom=90,
    left=80,
    right=80,
)

# Create generator with custom configuration
generator = PDFGenerator(
    styles=custom_styles,
    page_margins=custom_margins,
)

pdf_bytes = await generator.generate_case_summary(case_data)
```

### With Audit Logging

```python
from backend.services.export.pdf_generator import PDFGenerator
from backend.services.audit_logger import AuditLogger

# Create audit logger
audit_logger = AuditLogger(db_session=db)

# Create generator with audit logging
generator = PDFGenerator(audit_logger=audit_logger)

# Generate PDF (automatically logs to audit trail)
pdf_bytes = await generator.generate_case_summary(case_data)
```

### FastAPI Integration

```python
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from backend.services.export.pdf_generator import PDFGenerator, CaseExportData

router = APIRouter(prefix="/api/export", tags=["export"])

@router.post("/case/{case_id}/pdf", response_class=Response)
async def export_case_pdf(
    case_id: int,
    generator: PDFGenerator = Depends(get_pdf_generator),
):
    """Export case summary as PDF."""
    try:
        # Fetch case data from database
        case_data = await get_case_export_data(case_id)

        # Generate PDF
        pdf_bytes = await generator.generate_case_summary(case_data)

        # Return PDF response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=case_{case_id}_summary.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
```

## API Reference

### PDFGenerator Class

#### Constructor

```python
PDFGenerator(
    styles: Optional[DocumentStyles] = None,
    page_margins: Optional[PageMargins] = None,
    audit_logger: Optional[AuditLogger] = None,
)
```

**Parameters:**
- `styles`: Custom document styling configuration (optional)
- `page_margins`: Custom page margins (optional)
- `audit_logger`: Audit logger instance for tracking PDF generation (optional)

#### Methods

##### `generate_case_summary()`

Generate comprehensive case summary PDF.

```python
async def generate_case_summary(
    case_data: CaseExportData
) -> bytes
```

**Parameters:**
- `case_data`: Complete case export data including all related entities

**Returns:**
- `bytes`: PDF document as bytes buffer

**Raises:**
- `ValueError`: If case_data is invalid or missing required fields
- `Exception`: If PDF generation fails

**Sections included:**
- Case information
- Evidence (if available)
- Timeline events (if available)
- Deadlines (if available)
- Notes (if available)
- Case facts (if available)

---

##### `generate_evidence_list()`

Generate evidence inventory report PDF.

```python
async def generate_evidence_list(
    evidence_data: EvidenceExportData
) -> bytes
```

**Parameters:**
- `evidence_data`: Evidence export data with case context

**Returns:**
- `bytes`: PDF document as bytes buffer

**Sections included:**
- Case information header
- Evidence statistics (total items, category breakdown)
- Detailed evidence list with metadata

---

##### `generate_timeline_report()`

Generate timeline report PDF with deadlines.

```python
async def generate_timeline_report(
    timeline_data: TimelineExportData
) -> bytes
```

**Parameters:**
- `timeline_data`: Timeline export data with events and deadlines

**Returns:**
- `bytes`: PDF document as bytes buffer

**Sections included:**
- Case information header
- Statistics (total events, upcoming deadlines)
- Upcoming deadlines (highlighted in red)
- Timeline events
- Completed events (highlighted in green)

---

##### `generate_case_notes()`

Generate case notes compilation PDF.

```python
async def generate_case_notes(
    notes_data: NotesExportData
) -> bytes
```

**Parameters:**
- `notes_data`: Notes export data with case context

**Returns:**
- `bytes`: PDF document as bytes buffer

**Sections included:**
- Case information header
- Total notes count
- All notes with titles and timestamps

## Data Models

### DocumentStyles

```python
class DocumentStyles(BaseModel):
    title_font_size: int = 24  # Range: 10-48
    title_color: str = "#1a365d"  # Hex color format
    heading1_font_size: int = 18  # Range: 10-36
    heading1_color: str = "#2c5282"
    heading2_font_size: int = 14  # Range: 10-24
    heading2_color: str = "#2d3748"
    body_font_size: int = 11  # Range: 8-16
    body_line_height: float = 1.6  # Range: 1.0-3.0
    footer_font_size: int = 9  # Range: 6-14
    footer_color: str = "#718096"
```

### PageMargins

```python
class PageMargins(BaseModel):
    top: float = 72  # Points (72 points = 1 inch)
    bottom: float = 72
    left: float = 72
    right: float = 72
```

### CaseExportData

```python
class CaseExportData(BaseModel):
    case: CaseData
    evidence: List[Evidence] = []
    timeline: List[TimelineEvent] = []
    deadlines: List[Deadline] = []
    notes: List[Note] = []
    facts: List[CaseFact] = []
    export_date: datetime
    exported_by: str
```

### EvidenceExportData

```python
class EvidenceExportData(BaseModel):
    case_id: int
    case_title: str
    evidence: List[Evidence]
    export_date: datetime
    exported_by: str
    total_items: int
    category_summary: Dict[str, int] = {}
```

### TimelineExportData

```python
class TimelineExportData(BaseModel):
    case_id: int
    case_title: str
    events: List[TimelineEvent]
    deadlines: List[Deadline]
    export_date: datetime
    exported_by: str
    upcoming_deadlines: List[Deadline] = []
    completed_events: List[TimelineEvent] = []
```

### NotesExportData

```python
class NotesExportData(BaseModel):
    case_id: int
    case_title: str
    notes: List[Note]
    export_date: datetime
    exported_by: str
    total_notes: int
```

## Testing

### Run All Tests

```bash
# Run tests with verbose output
pytest backend/services/export/test_pdf_generator.py -v

# Run tests with coverage report
pytest backend/services/export/test_pdf_generator.py -v --cov=backend.services.export.pdf_generator

# Run specific test
pytest backend/services/export/test_pdf_generator.py::test_generate_case_summary_basic -v
```

### Test Coverage

The test suite includes:

- **Initialization tests**: Default and custom configurations
- **Case summary tests**: Basic, minimal data, all sections, error handling
- **Evidence list tests**: Basic, with categories, empty lists
- **Timeline report tests**: Basic, with urgency, empty timelines
- **Case notes tests**: Basic, without titles, empty notes
- **Styling tests**: Custom styles, validation, margins
- **Audit logging tests**: Verification of audit trail integration
- **Helper method tests**: All private helper methods
- **Integration tests**: Full workflow, performance benchmarks

**Expected Coverage:** >90%

## Performance

- **Small PDFs** (case summary, minimal data): <1 second
- **Medium PDFs** (case with 10-20 items per section): 1-3 seconds
- **Large PDFs** (case with 50+ items per section): 3-5 seconds

All operations are async-friendly and can be used in FastAPI endpoints without blocking.

## Color Coding

The PDF generator uses color coding to indicate urgency and status:

| Color | Hex Code | Usage |
|-------|----------|-------|
| Red | `#ef4444` | Overdue deadlines, urgent items |
| Green | `#10b981` | Completed events, successful status |
| Blue | `#2c5282` | Section headings, important information |
| Dark Gray | `#2d3748` | Sub-headings, secondary information |
| Light Gray | `#718096` | Footer text, metadata |

## Troubleshooting

### Issue: PDF generation fails with "Cannot import reportlab"

**Solution:**
```bash
pip install reportlab==4.2.5
```

### Issue: Invalid date format errors

**Solution:**
Ensure all dates are ISO 8601 format strings:
```python
created_at="2025-01-01T10:00:00"  # Correct
created_at="01/01/2025"  # Incorrect
```

### Issue: Color validation errors

**Solution:**
Use hex color format with leading `#`:
```python
title_color="#1a365d"  # Correct
title_color="1a365d"  # Incorrect
title_color="blue"  # Incorrect
```

### Issue: PDFs have blank pages

**Solution:**
Check that data models have valid content. Empty strings or None values may cause rendering issues.

### Issue: Text overflow or truncation

**Solution:**
Adjust page margins or font sizes:
```python
custom_margins = PageMargins(left=60, right=60)  # More horizontal space
custom_styles = DocumentStyles(body_font_size=10)  # Smaller text
```

## Migration Checklist

If migrating from TypeScript PDFGenerator to Python:

- [ ] Update import statements to Python modules
- [ ] Replace `Promise<Buffer>` with `async def ... -> bytes`
- [ ] Convert TypeScript interfaces to Pydantic models
- [ ] Replace PDFKit API calls with ReportLab equivalents
- [ ] Update date handling (use `datetime.fromisoformat()`)
- [ ] Replace `.toLocaleDateString()` with `strftime()`
- [ ] Update error handling (Python exceptions vs. rejected promises)
- [ ] Test all PDF generation endpoints
- [ ] Verify audit logging integration
- [ ] Update API documentation

## Future Enhancements

Potential improvements for future versions:

1. **Multi-language Support**: Add i18n for PDF content
2. **Custom Templates**: Allow users to define custom PDF layouts
3. **Image Embedding**: Support for embedding images in PDFs
4. **Table Generation**: Better table formatting for structured data
5. **Watermarks**: Add optional watermarks for draft/confidential documents
6. **Encryption**: PDF password protection and encryption
7. **Digital Signatures**: Support for digitally signing PDFs
8. **Batch Generation**: Generate multiple PDFs in parallel

## Related Files

- **TypeScript Original**: `src/services/export/PDFGenerator.ts`
- **Python Version**: `backend/services/export/pdf_generator.py`
- **Tests**: `backend/services/export/test_pdf_generator.py`
- **Models**: `backend/models/case.py`, `backend/models/evidence.py`, etc.
- **Audit Logger**: `backend/services/audit_logger.py`

## References

- [ReportLab Documentation](https://www.reportlab.com/docs/reportlab-userguide.pdf)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python asyncio](https://docs.python.org/3/library/asyncio.html)

## License

MIT License - See LICENSE file for details

---

**Last Updated:** 2025-01-13
**Python Version:** 3.9+
**ReportLab Version:** 4.2.5

# Export Services

This directory contains services for generating export documents from Justice Companion case data.

## Available Services

### DOCXGenerator

Generate professional Microsoft Word documents (.docx) from case data.

**Features:**
- Case summary reports with evidence, timeline, and notes
- Evidence inventory reports
- Timeline reports with chronological events
- Case notes reports
- Professional formatting with headers, footers, and page numbering
- Automatic page breaks between sections
- Audit logging integration

**Installation:**

```bash
pip install python-docx==1.1.2
```

**Basic Usage:**

```python
from backend.services.export import DOCXGenerator, CaseExportData, Case, Evidence, Note, TimelineEvent
from datetime import datetime

# Create generator
generator = DOCXGenerator(audit_logger=None)  # Optional audit logger

# Prepare case data
case_data = CaseExportData(
    case=Case(
        id=1,
        title="Smith v. Jones",
        description="Personal injury case",
        status="active"
    ),
    evidence=[
        Evidence(
            id=1,
            case_id=1,
            title="Police Report",
            file_path="/evidence/report.pdf",
            content=None,
            evidence_type="document",
            obtained_date="2024-01-15T00:00:00Z",
            created_at="2024-01-15T10:00:00Z"
        )
    ],
    timeline=[
        TimelineEvent(
            id=1,
            case_id=1,
            title="Accident Occurred",
            description="Vehicle collision",
            event_date="2024-01-15T00:00:00Z",
            event_type="milestone",
            completed=True,
            created_at="2024-01-15T10:00:00Z",
            updated_at="2024-01-15T10:00:00Z"
        )
    ],
    notes=[
        Note(
            id=1,
            case_id=1,
            user_id=1,
            title="Initial Assessment",
            content="Client sustained minor injuries",
            is_pinned=True,
            created_at="2024-01-16T10:00:00Z",
            updated_at="2024-01-16T10:00:00Z"
        )
    ],
    export_date=datetime.now(),
    exported_by="john.doe@example.com"
)

# Generate case summary
docx_bytes = await generator.generate_case_summary(case_data)

# Save to file
with open("case_summary.docx", "wb") as f:
    f.write(docx_bytes)
```

**API Methods:**

#### `generate_case_summary(case_data: CaseExportData) -> bytes`

Generate comprehensive case summary document with all sections.

**Sections:**
- Case information (ID, description, status)
- Evidence inventory (if present)
- Timeline of events (if present)
- Case notes (if present)

**Returns:** DOCX file as bytes

---

#### `generate_evidence_list(evidence_data: EvidenceExportData) -> bytes`

Generate evidence inventory report.

**Includes:**
- Case identification
- Total evidence count
- Detailed evidence entries with metadata (type, obtained date)

**Returns:** DOCX file as bytes

---

#### `generate_timeline_report(timeline_data: TimelineExportData) -> bytes`

Generate chronological timeline report.

**Includes:**
- Case identification
- Total events count
- Event entries with dates, descriptions, and types

**Returns:** DOCX file as bytes

---

#### `generate_case_notes(notes_data: NotesExportData) -> bytes`

Generate case notes report.

**Includes:**
- Case identification
- Total notes count
- Note entries with titles, content, and timestamps

**Returns:** DOCX file as bytes

---

**With Audit Logging:**

```python
from backend.services.audit_logger import AuditLogger

# Create audit logger
audit_logger = AuditLogger(db_connection)

# Create generator with audit logging
generator = DOCXGenerator(audit_logger=audit_logger)

# All export operations will be logged automatically
docx_bytes = await generator.generate_case_summary(case_data)
```

**Error Handling:**

```python
try:
    docx_bytes = await generator.generate_case_summary(case_data)
except Exception as e:
    print(f"Export failed: {e}")
    # Error is automatically logged to audit trail if audit_logger provided
```

**Document Formatting:**

- **Margins:** 1 inch on all sides
- **Header:** Case title (right-aligned, bold)
- **Footer:** Export metadata and page numbers (center-aligned)
- **Typography:**
  - Title: 24pt
  - Heading 1: 18pt
  - Heading 2: 14pt
  - Heading 3: 12pt
  - Body: 11pt
  - Footer: 9pt
- **Spacing:** Consistent paragraph spacing throughout

**Testing:**

Run the test suite:

```bash
# All tests
pytest backend/services/export/test_docx_generator.py -v

# Specific test
pytest backend/services/export/test_docx_generator.py::TestDOCXGenerator::test_generate_case_summary -v

# With coverage
pytest backend/services/export/test_docx_generator.py --cov=backend.services.export.docx_generator --cov-report=html
```

**Performance Considerations:**

- Document generation is async-compatible
- Memory-efficient byte stream generation
- Supports concurrent generation of multiple documents
- No temporary files created (in-memory processing)

**Future Enhancements:**

- [ ] Template customization support
- [ ] Custom styling and branding
- [ ] Table support for structured data
- [ ] Image embedding
- [ ] Digital signatures
- [ ] PDF conversion

---

### TemplateEngine

Format export data using pre-defined templates. See `template_engine.py` for details.

## Project Structure

```
backend/services/export/
├── __init__.py              # Package exports
├── docx_generator.py        # DOCX generation service
├── template_engine.py       # Template formatting service
├── test_docx_generator.py   # DOCX generator tests
└── README.md               # This file
```

## Dependencies

- `python-docx==1.1.2` - DOCX document generation
- `pydantic>=2.0` - Data validation
- `fastapi` - HTTP exception handling

## License

MIT License - Justice Companion Development Team

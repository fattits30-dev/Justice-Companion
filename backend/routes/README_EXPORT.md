# Export API Routes

## Overview

The Export API provides endpoints for exporting case data, evidence lists, timelines, and notes to PDF and DOCX formats. This module was migrated from the Electron IPC handler (`electron/ipc-handlers/export.ts`) to a FastAPI REST API.

**Status**: ✅ Stub implementation complete (ready for PDF/DOCX library integration)

## Endpoints

### Case Export

#### `POST /export/case/{case_id}/pdf`
Export a complete case to PDF format.

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `case_id` (int): Case ID to export

**Request Body** (`ExportOptions`):
```json
{
  "includeEvidence": true,
  "includeTimeline": true,
  "includeNotes": true,
  "includeFacts": true,
  "includeDocuments": true,
  "template": "case-summary",
  "fileName": "my-custom-filename"
}
```

**Response** (`ExportResult`):
```json
{
  "success": true,
  "filePath": "/app/exports/case-123-export-20250113.pdf",
  "fileName": "case-123-export-20250113.pdf",
  "format": "pdf",
  "downloadUrl": "/files/case-123-export-20250113.pdf",
  "size": 0,
  "exportedAt": "2025-01-13T14:30:00Z",
  "template": "case-summary"
}
```

**Validations**:
- User must own the case
- Case must exist
- Filename must not contain path separators

**Audit Log**: `case.exported` event with format and template details

---

#### `POST /export/case/{case_id}/docx`
Export a complete case to DOCX (Word) format.

**Authentication**: Required (Bearer token)

**Request/Response**: Same as PDF endpoint (format: "docx")

---

### Evidence Export

#### `POST /export/evidence/{case_id}/pdf`
Export evidence list for a case to PDF.

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `case_id` (int): Case ID to export evidence for

**Request Body**: None

**Response**: Same as case export (`ExportResult`)

**Template**: `evidence-list`

**Audit Log**: `evidence.exported` event

---

### Timeline Export

#### `POST /export/timeline/{case_id}/pdf`
Export timeline report to PDF.

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `case_id` (int): Case ID to export timeline for

**Request Body**: None

**Response**: Same as case export (`ExportResult`)

**Template**: `timeline-report`

**Audit Log**: `timeline.exported` event

---

### Notes Export

#### `POST /export/notes/{case_id}/pdf`
Export case notes to PDF.

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `case_id` (int): Case ID to export notes for

**Request Body**: None

**Response**: Same as case export (`ExportResult`)

**Template**: `case-notes`

**Audit Log**: `notes.exported` event

---

#### `POST /export/notes/{case_id}/docx`
Export case notes to DOCX (Word) format.

**Authentication**: Required (Bearer token)

**Request/Response**: Same as PDF endpoint (format: "docx")

---

### Templates

#### `GET /export/templates`
Get list of available export templates.

**Authentication**: Not required (metadata only)

**Response** (`TemplateListResponse`):
```json
{
  "templates": [
    {
      "id": "case-summary",
      "name": "Case Summary",
      "description": "Complete case details with evidence, timeline, and notes",
      "formats": ["pdf", "docx"]
    },
    {
      "id": "evidence-list",
      "name": "Evidence List",
      "description": "Detailed inventory of all case evidence",
      "formats": ["pdf", "docx"]
    },
    {
      "id": "timeline-report",
      "name": "Timeline Report",
      "description": "Chronological timeline with deadlines and events",
      "formats": ["pdf", "docx"]
    },
    {
      "id": "case-notes",
      "name": "Case Notes",
      "description": "All notes and observations for the case",
      "formats": ["pdf", "docx"]
    }
  ]
}
```

---

## Pydantic Models

### Request Models

#### `ExportOptions`
```python
class ExportOptions(BaseModel):
    includeEvidence: bool = True
    includeTimeline: bool = True
    includeNotes: bool = True
    includeFacts: bool = True
    includeDocuments: bool = True
    template: Optional[Literal["case-summary", "evidence-list", "timeline-report", "case-notes"]] = None
    fileName: Optional[str] = None  # Max 255 chars, no path separators
```

### Response Models

#### `ExportResult`
```python
class ExportResult(BaseModel):
    success: bool = True
    filePath: str
    fileName: str
    format: Literal["pdf", "docx"]
    downloadUrl: str
    size: int  # File size in bytes (0 for stub)
    exportedAt: str  # ISO 8601 timestamp
    template: Optional[str]
```

#### `ExportTemplate`
```python
class ExportTemplate(BaseModel):
    id: str
    name: str
    description: str
    formats: List[Literal["pdf", "docx"]]
```

#### `TemplateListResponse`
```python
class TemplateListResponse(BaseModel):
    templates: List[ExportTemplate]
```

---

## Security & Authorization

### Case Ownership Verification

All export endpoints (except `/templates`) verify case ownership using `verify_case_ownership()`:

```python
def verify_case_ownership(db: Session, case_id: int, user_id: int) -> bool:
    """
    Verify that a case belongs to the authenticated user.

    Raises:
        HTTPException 404: Case not found or unauthorized
    """
```

This pattern matches the existing implementation in `backend/routes/evidence.py`.

### Session Authentication

All protected endpoints use `get_current_user` dependency from `backend/routes/auth.py`:

```python
user_id: int = Depends(get_current_user)
```

### Filename Sanitization

Custom filenames are validated to prevent path traversal attacks:

```python
@validator('fileName')
def validate_filename(cls, v):
    if v and ('/' in v or '\\' in v or '..' in v):
        raise ValueError("Filename cannot contain path separators")
    return v
```

---

## File Generation

### Current Implementation (Stub)

The current implementation creates stub text files for development/testing:

```python
def create_stub_export_file(file_path: str, format: str, case_id: int, template: Optional[str]) -> int:
    """
    Create stub export file for development.

    TODO: Replace with actual PDF/DOCX generation
    """
    stub_content = f"""STUB EXPORT FILE
Generated: {datetime.utcnow().isoformat()}
Format: {format.upper()}
Case ID: {case_id}
Template: {template or 'default'}

TODO: Integrate reportlab (PDF) and python-docx (DOCX) libraries
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(stub_content)
    return os.path.getsize(file_path)
```

### Production Implementation (TODO)

#### For PDF Generation (reportlab)

Install: `pip install reportlab`

Example usage:
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet

def generate_case_pdf(case_data, file_path):
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Case header
    story.append(Paragraph(f"<b>Case: {case_data['title']}</b>", styles['Title']))
    story.append(Spacer(1, 12))

    # Evidence section (if includeEvidence)
    if case_data['includeEvidence']:
        story.append(Paragraph("<b>Evidence</b>", styles['Heading1']))
        evidence_data = [[item['type'], item['title'], item['date']] for item in case_data['evidence']]
        evidence_table = Table(evidence_data)
        story.append(evidence_table)

    doc.build(story)
```

#### For DOCX Generation (python-docx)

Install: `pip install python-docx`

Example usage:
```python
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

def generate_case_docx(case_data, file_path):
    doc = Document()

    # Case header
    title = doc.add_heading(case_data['title'], level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Evidence section
    if case_data['includeEvidence']:
        doc.add_heading('Evidence', level=1)
        table = doc.add_table(rows=1, cols=3)
        table.style = 'Light Grid Accent 1'

        # Header row
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = 'Type'
        hdr_cells[1].text = 'Title'
        hdr_cells[2].text = 'Date'

        # Data rows
        for item in case_data['evidence']:
            row_cells = table.add_row().cells
            row_cells[0].text = item['type']
            row_cells[1].text = item['title']
            row_cells[2].text = item['date']

    doc.save(file_path)
```

---

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful export
- `401 Unauthorized`: Missing or invalid session token
- `404 Not Found`: Case not found or user doesn't own the case
- `500 Internal Server Error`: Export generation failed

### Audit Logging

All export operations are logged with audit events:

**Success**:
```python
log_audit_event(
    db=db,
    event_type="case.exported",
    user_id=str(user_id),
    resource_type="case",
    resource_id=str(case_id),
    action="export_pdf",
    details={"format": "pdf", "template": "case-summary", "options": {...}},
    success=True
)
```

**Failure**:
```python
log_audit_event(
    db=db,
    event_type="case.exported",
    user_id=str(user_id),
    resource_type="case",
    resource_id=str(case_id),
    action="export_pdf",
    success=False,
    error_message=str(e)
)
```

---

## Testing

### Test Script

Run the test suite:
```bash
# Start backend server
python backend/main.py

# In another terminal
python backend/test_export.py
```

### Test Coverage

The test script (`backend/test_export.py`) covers:
- ✅ Server health check
- ✅ Get templates (unauthenticated)
- ✅ Unauthorized access rejection
- ✅ Login and session management
- ✅ Export case to PDF
- ✅ Export case to DOCX
- ✅ Export evidence to PDF
- ✅ Export timeline to PDF
- ✅ Export notes to PDF
- ✅ Export notes to DOCX
- ✅ Custom filename handling
- ✅ Template selection

### Example Test Output

```
============================================================
Justice Companion Export API Test Suite
============================================================

=== Checking Server Health ===
✓ Server is healthy: {'status': 'healthy', 'service': 'Justice Companion Backend', 'version': '1.0.0'}

=== Testing GET /export/templates ===
✓ Templates retrieved: 4 templates
  - case-summary: Case Summary (pdf, docx)
  - evidence-list: Evidence List (pdf, docx)
  - timeline-report: Timeline Report (pdf, docx)
  - case-notes: Case Notes (pdf, docx)

=== Testing Unauthorized Access ===
✓ Correctly rejected unauthorized request

=== Login ===
✓ Login successful: testuser

=== Testing POST /export/case/1/pdf ===
✓ Export successful:
  - File: case-1-case-summary-20250113-143000.pdf
  - Path: exports/case-1-case-summary-20250113-143000.pdf
  - Format: pdf
  - Template: case-summary
  - Size: 247 bytes
  - Download: /files/case-1-case-summary-20250113-143000.pdf

============================================================
Test suite completed!
============================================================
```

---

## Integration with Frontend

### API Client Example (TypeScript)

```typescript
import axios from 'axios';

interface ExportOptions {
  includeEvidence?: boolean;
  includeTimeline?: boolean;
  includeNotes?: boolean;
  includeFacts?: boolean;
  includeDocuments?: boolean;
  template?: string;
  fileName?: string;
}

interface ExportResult {
  success: boolean;
  filePath: string;
  fileName: string;
  format: 'pdf' | 'docx';
  downloadUrl: string;
  size: number;
  exportedAt: string;
  template?: string;
}

class ExportService {
  private baseUrl = 'http://127.0.0.1:8000';

  async exportCaseToPDF(caseId: number, sessionToken: string, options?: ExportOptions): Promise<ExportResult> {
    const response = await axios.post(
      `${this.baseUrl}/export/case/${caseId}/pdf`,
      options || {},
      {
        headers: { Authorization: `Bearer ${sessionToken}` }
      }
    );
    return response.data;
  }

  async exportCaseToDOCX(caseId: number, sessionToken: string, options?: ExportOptions): Promise<ExportResult> {
    const response = await axios.post(
      `${this.baseUrl}/export/case/${caseId}/docx`,
      options || {},
      {
        headers: { Authorization: `Bearer ${sessionToken}` }
      }
    );
    return response.data;
  }

  async getTemplates(): Promise<{ templates: ExportTemplate[] }> {
    const response = await axios.get(`${this.baseUrl}/export/templates`);
    return response.data;
  }
}
```

---

## File Storage

### Export Directory

Exports are stored in: `F:\Justice Companion take 2\exports\`

This directory is:
- ✅ Created automatically on first export
- ✅ Excluded from git (`.gitignore` line 60)
- ✅ Configurable via `EXPORT_DIR` constant

### Filename Format

Generated filenames follow this pattern:
```
case-{case_id}-{template}-{timestamp}.{format}
```

Examples:
- `case-123-case-summary-20250113-143000.pdf`
- `case-456-evidence-list-20250113-150000.docx`
- `case-789-timeline-report-20250113-160000.pdf`

Custom filenames:
- `my-custom-filename.pdf`
- `my-custom-filename.docx`

---

## TODO: Production Readiness

### High Priority

1. **Integrate PDF Generation** (reportlab)
   - [ ] Install: `pip install reportlab`
   - [ ] Implement `generate_case_pdf()` function
   - [ ] Add case header with styling
   - [ ] Add evidence table
   - [ ] Add timeline section
   - [ ] Add notes section
   - [ ] Add page numbers and footers

2. **Integrate DOCX Generation** (python-docx)
   - [ ] Install: `pip install python-docx`
   - [ ] Implement `generate_case_docx()` function
   - [ ] Add document styles
   - [ ] Add case header with formatting
   - [ ] Add evidence table with borders
   - [ ] Add timeline with bullet points
   - [ ] Add notes with rich text

3. **File Download Endpoint**
   - [ ] Create `/files/{filename}` endpoint
   - [ ] Serve files from exports directory
   - [ ] Add security checks (verify user owns file)
   - [ ] Set proper MIME types
   - [ ] Add Content-Disposition header

### Medium Priority

4. **Database Integration**
   - [ ] Query case data from database
   - [ ] Query evidence with encryption support
   - [ ] Query timeline/deadlines
   - [ ] Query notes and facts
   - [ ] Handle encrypted fields properly

5. **Template System**
   - [ ] Create base template class
   - [ ] Implement case-summary template
   - [ ] Implement evidence-list template
   - [ ] Implement timeline-report template
   - [ ] Implement case-notes template

6. **File Management**
   - [ ] Add cleanup job for old exports
   - [ ] Add export size limits
   - [ ] Add rate limiting per user
   - [ ] Add export history tracking

### Low Priority

7. **Advanced Features**
   - [ ] Support for multiple page sizes (A4, Letter)
   - [ ] Custom branding/logos
   - [ ] Watermarking
   - [ ] Digital signatures
   - [ ] Batch export (multiple cases)

---

## Migration from Electron IPC

### Removed Features

- ❌ **Dialog.showSaveDialog**: Web-based applications can't show native save dialogs. Files are generated server-side and downloaded via URL.
- ❌ **app.getPath('documents')**: Server-side export directory is used instead.

### Adapted Features

- ✅ **Authorization Wrapper**: Replaced with FastAPI dependency injection (`get_current_user`)
- ✅ **Error Handling**: Mapped to HTTP status codes (404, 401, 500)
- ✅ **Audit Logging**: Preserved with same event types and details
- ✅ **Validation**: Migrated to Pydantic models with validators

### API Mapping

| Electron IPC Handler | FastAPI Endpoint | Status |
|---------------------|------------------|--------|
| `export:case-to-pdf` | `POST /export/case/{id}/pdf` | ✅ Stub |
| `export:case-to-word` | `POST /export/case/{id}/docx` | ✅ Stub |
| `export:evidence-list-to-pdf` | `POST /export/evidence/{id}/pdf` | ✅ Stub |
| `export:timeline-report-to-pdf` | `POST /export/timeline/{id}/pdf` | ✅ Stub |
| `export:case-notes-to-pdf` | `POST /export/notes/{id}/pdf` | ✅ Stub |
| `export:case-notes-to-word` | `POST /export/notes/{id}/docx` | ✅ Stub |
| `export:get-templates` | `GET /export/templates` | ✅ Complete |
| `export:custom` | Merged into case endpoints | ✅ Complete |

---

## References

- **Electron IPC Handler**: `electron/ipc-handlers/export.ts`
- **TypeScript Models**: `src/models/Export.ts`
- **Evidence Pattern**: `backend/routes/evidence.py`
- **reportlab Docs**: https://www.reportlab.com/docs/reportlab-userguide.pdf
- **python-docx Docs**: https://python-docx.readthedocs.io/

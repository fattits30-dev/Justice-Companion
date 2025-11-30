"""
Unit tests for PDF Generator Service.

Tests all PDF generation methods including:
- Case summary PDFs
- Evidence list PDFs
- Timeline report PDFs
- Case notes PDFs
- Custom styling
- Error handling
- Audit logging integration

Run tests with:
    pytest backend/services/export/test_pdf_generator.py -v
    pytest backend/services/export/test_pdf_generator.py -v --cov=backend.services.export.pdf_generator
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from backend.services.export.pdf_generator import (
    PDFGenerator,
    CaseExportData,
    EvidenceExportData,
    TimelineExportData,
    NotesExportData,
    CaseData,
    Evidence,
    TimelineEvent,
    Deadline,
    Note,
    CaseFact,
    DocumentStyles,
    PageMargins,
)
from backend.services.audit_logger import AuditLogger

# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_audit_logger():
    """Create mock audit logger."""
    logger = MagicMock(spec=AuditLogger)
    logger.log_action = AsyncMock()
    return logger

@pytest.fixture
def pdf_generator(mock_audit_logger):
    """Create PDF generator instance with mock audit logger."""
    return PDFGenerator(audit_logger=mock_audit_logger)

@pytest.fixture
def sample_case_data():
    """Create sample case data for testing."""
    return CaseData(
        id=1,
        title="Test Employment Case",
        description="A test case involving employment discrimination.",
        case_type="employment",
        status="active",
        created_at="2025-01-01T10:00:00",
        updated_at="2025-01-13T15:30:00",
    )

@pytest.fixture
def sample_evidence():
    """Create sample evidence items."""
    return [
        Evidence(
            id=1,
            case_id=1,
            title="Employment Contract",
            evidence_type="document",
            obtained_date="2025-01-05T00:00:00",
            file_path="/evidence/contract.pdf",
            content="Signed employment agreement",
            created_at="2025-01-05T10:00:00",
            updated_at="2025-01-05T10:00:00",
        ),
        Evidence(
            id=2,
            case_id=1,
            title="Email Correspondence",
            evidence_type="email",
            obtained_date="2025-01-06T00:00:00",
            file_path="/evidence/emails.pdf",
            content="Email chain regarding discrimination complaint",
            created_at="2025-01-06T10:00:00",
            updated_at="2025-01-06T10:00:00",
        ),
    ]

@pytest.fixture
def sample_timeline_events():
    """Create sample timeline events."""
    return [
        TimelineEvent(
            id=1,
            case_id=1,
            title="Initial Complaint Filed",
            description="Employee filed formal complaint with HR",
            event_date="2025-11-01T00:00:00",
            event_type="filing",
            completed=True,
            created_at="2025-11-01T10:00:00",
            updated_at="2025-11-01T10:00:00",
        ),
        TimelineEvent(
            id=2,
            case_id=1,
            title="Investigation Scheduled",
            description="HR scheduled investigation meeting",
            event_date="2025-12-15T00:00:00",
            event_type="hearing",
            completed=False,
            created_at="2025-12-10T10:00:00",
            updated_at="2025-12-10T10:00:00",
        ),
    ]

@pytest.fixture
def sample_deadlines():
    """Create sample deadlines."""
    return [
        Deadline(
            id=1,
            case_id=1,
            title="Response Due",
            description="Employer must respond to complaint",
            deadline_date="2025-02-01T00:00:00",
            priority="high",
            status="pending",
            created_at="2025-01-01T10:00:00",
            updated_at="2025-01-01T10:00:00",
        ),
        Deadline(
            id=2,
            case_id=1,
            title="Mediation Session",
            description="Mandatory mediation session",
            deadline_date="2025-12-20T00:00:00",
            priority="medium",
            status="completed",
            created_at="2025-11-01T10:00:00",
            updated_at="2025-12-20T16:00:00",
        ),
    ]

@pytest.fixture
def sample_notes():
    """Create sample notes."""
    return [
        Note(
            id=1,
            case_id=1,
            title="Initial Assessment",
            content="Case appears to have strong merit based on initial evidence review.",
            created_at="2025-01-01T10:00:00",
            updated_at="2025-01-01T10:00:00",
        ),
        Note(
            id=2,
            case_id=1,
            title="Witness Interview",
            content="Interviewed colleague who corroborated discrimination claims.",
            created_at="2025-01-05T14:30:00",
            updated_at="2025-01-05T14:30:00",
        ),
    ]

@pytest.fixture
def sample_facts():
    """Create sample case facts."""
    return [
        CaseFact(
            id=1,
            case_id=1,
            fact_content="Employee was denied promotion despite meeting all qualifications",
            fact_category="discrimination",
            importance="high",
            created_at="2025-01-01T10:00:00",
            updated_at="2025-01-01T10:00:00",
        ),
        CaseFact(
            id=2,
            case_id=1,
            fact_content="Less qualified candidate was promoted instead",
            fact_category="comparative_evidence",
            importance="critical",
            created_at="2025-01-01T10:00:00",
            updated_at="2025-01-01T10:00:00",
        ),
    ]

@pytest.fixture
def case_export_data(
    sample_case_data, sample_evidence, sample_timeline_events, sample_deadlines, sample_notes, sample_facts
):
    """Create complete case export data."""
    return CaseExportData(
        case=sample_case_data,
        evidence=sample_evidence,
        timeline=sample_timeline_events,
        deadlines=sample_deadlines,
        notes=sample_notes,
        facts=sample_facts,
        export_date=datetime(2025, 1, 13, 15, 30, 0),
        exported_by="Test User",
    )

# ============================================================================
# Tests - Initialization
# ============================================================================

def test_pdf_generator_initialization():
    """Test PDF generator initialization with default styles."""
    generator = PDFGenerator()

    assert generator.styles is not None
    assert generator.page_margins is not None
    assert generator.audit_logger is None
    assert hasattr(generator, "reportlab_styles")

def test_pdf_generator_custom_styles():
    """Test PDF generator with custom styles."""
    custom_styles = DocumentStyles(
        title_font_size=28,
        title_color="#000000",
        heading1_font_size=20,
    )

    generator = PDFGenerator(styles=custom_styles)

    assert generator.styles.title_font_size == 28
    assert generator.styles.title_color == "#000000"
    assert generator.styles.heading1_font_size == 20

def test_pdf_generator_custom_margins():
    """Test PDF generator with custom margins."""
    custom_margins = PageMargins(top=50, bottom=50, left=60, right=60)

    generator = PDFGenerator(page_margins=custom_margins)

    assert generator.page_margins.top == 50
    assert generator.page_margins.bottom == 50
    assert generator.page_margins.left == 60
    assert generator.page_margins.right == 60

def test_pdf_generator_with_audit_logger(mock_audit_logger):
    """Test PDF generator with audit logger."""
    generator = PDFGenerator(audit_logger=mock_audit_logger)

    assert generator.audit_logger is not None
    assert generator.audit_logger == mock_audit_logger

# ============================================================================
# Tests - Case Summary PDF
# ============================================================================

@pytest.mark.asyncio
async def test_generate_case_summary_basic(pdf_generator, case_export_data):
    """Test generating basic case summary PDF."""
    pdf_bytes = await pdf_generator.generate_case_summary(case_export_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    # Check for PDF signature
    assert pdf_bytes[:4] == b"%PDF"

@pytest.mark.asyncio
async def test_generate_case_summary_with_audit_logging(
    pdf_generator, case_export_data, mock_audit_logger
):
    """Test case summary generation triggers audit logging."""
    pdf_bytes = await pdf_generator.generate_case_summary(case_export_data)

    assert len(pdf_bytes) > 0
    mock_audit_logger.log_action.assert_called_once()

    # Verify audit log parameters
    call_args = mock_audit_logger.log_action.call_args
    assert call_args[1]["action"] == "pdf_generated"
    assert call_args[1]["resource_type"] == "case"
    assert call_args[1]["resource_id"] == case_export_data.case.id

@pytest.mark.asyncio
async def test_generate_case_summary_minimal_data(pdf_generator, sample_case_data):
    """Test generating case summary with minimal data (no evidence, notes, etc)."""
    minimal_data = CaseExportData(
        case=sample_case_data,
        evidence=[],
        timeline=[],
        deadlines=[],
        notes=[],
        facts=[],
        export_date=datetime.now(),
        exported_by="Test User",
    )

    pdf_bytes = await pdf_generator.generate_case_summary(minimal_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:4] == b"%PDF"

@pytest.mark.asyncio
async def test_generate_case_summary_all_sections(pdf_generator, case_export_data):
    """Test case summary with all sections populated."""
    pdf_bytes = await pdf_generator.generate_case_summary(case_export_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

    # PDF should be larger with all sections
    assert len(pdf_bytes) > 5000  # Reasonable size check

@pytest.mark.asyncio
async def test_generate_case_summary_error_handling(pdf_generator):
    """Test error handling when case data is invalid."""
    invalid_data = CaseExportData(
        case=CaseData(
            id=1,
            title="",  # Empty title might cause issues
            description=None,
            case_type="invalid_type",
            status="invalid_status",
            created_at="invalid_date",  # Invalid date format
            updated_at="invalid_date",
        ),
        evidence=[],
        timeline=[],
        deadlines=[],
        notes=[],
        facts=[],
        export_date=datetime.now(),
        exported_by="Test User",
    )

    with pytest.raises(Exception):
        await pdf_generator.generate_case_summary(invalid_data)

# ============================================================================
# Tests - Evidence List PDF
# ============================================================================

@pytest.mark.asyncio
async def test_generate_evidence_list_basic(pdf_generator, sample_evidence):
    """Test generating basic evidence list PDF."""
    evidence_data = EvidenceExportData(
        case_id=1,
        case_title="Test Case",
        evidence=sample_evidence,
        export_date=datetime.now(),
        exported_by="Test User",
        total_items=len(sample_evidence),
        category_summary={"document": 1, "email": 1},
    )

    pdf_bytes = await pdf_generator.generate_evidence_list(evidence_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:4] == b"%PDF"

@pytest.mark.asyncio
async def test_generate_evidence_list_with_categories(pdf_generator, sample_evidence):
    """Test evidence list with category summary."""
    evidence_data = EvidenceExportData(
        case_id=1,
        case_title="Test Case",
        evidence=sample_evidence,
        export_date=datetime.now(),
        exported_by="Test User",
        total_items=len(sample_evidence),
        category_summary={"document": 5, "email": 3, "photo": 2},
    )

    pdf_bytes = await pdf_generator.generate_evidence_list(evidence_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

@pytest.mark.asyncio
async def test_generate_evidence_list_empty(pdf_generator):
    """Test generating evidence list with no evidence items."""
    evidence_data = EvidenceExportData(
        case_id=1,
        case_title="Test Case",
        evidence=[],
        export_date=datetime.now(),
        exported_by="Test User",
        total_items=0,
        category_summary={},
    )

    pdf_bytes = await pdf_generator.generate_evidence_list(evidence_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

@pytest.mark.asyncio
async def test_generate_evidence_list_audit_logging(
    pdf_generator, sample_evidence, mock_audit_logger
):
    """Test evidence list generation triggers audit logging."""
    evidence_data = EvidenceExportData(
        case_id=1,
        case_title="Test Case",
        evidence=sample_evidence,
        export_date=datetime.now(),
        exported_by="Test User",
        total_items=len(sample_evidence),
        category_summary={"document": 1, "email": 1},
    )

    pdf_bytes = await pdf_generator.generate_evidence_list(evidence_data)

    assert len(pdf_bytes) > 0
    mock_audit_logger.log_action.assert_called_once()

# ============================================================================
# Tests - Timeline Report PDF
# ============================================================================

@pytest.mark.asyncio
async def test_generate_timeline_report_basic(
    pdf_generator, sample_timeline_events, sample_deadlines
):
    """Test generating basic timeline report PDF."""
    timeline_data = TimelineExportData(
        case_id=1,
        case_title="Test Case",
        events=sample_timeline_events,
        deadlines=sample_deadlines,
        export_date=datetime.now(),
        exported_by="Test User",
        upcoming_deadlines=[d for d in sample_deadlines if d.status == "pending"],
        completed_events=[e for e in sample_timeline_events if e.completed],
    )

    pdf_bytes = await pdf_generator.generate_timeline_report(timeline_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:4] == b"%PDF"

@pytest.mark.asyncio
async def test_generate_timeline_report_with_urgency(
    pdf_generator, sample_timeline_events, sample_deadlines
):
    """Test timeline report with urgent deadlines highlighted."""
    # Create overdue deadline
    overdue_deadline = Deadline(
        id=3,
        case_id=1,
        title="Overdue Response",
        description="This deadline has passed",
        deadline_date="2025-11-01T00:00:00",  # Past date
        priority="critical",
        status="pending",
        created_at="2025-10-01T10:00:00",
        updated_at="2025-10-01T10:00:00",
    )

    timeline_data = TimelineExportData(
        case_id=1,
        case_title="Test Case",
        events=sample_timeline_events,
        deadlines=[overdue_deadline],
        export_date=datetime.now(),
        exported_by="Test User",
        upcoming_deadlines=[overdue_deadline],
        completed_events=[],
    )

    pdf_bytes = await pdf_generator.generate_timeline_report(timeline_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

@pytest.mark.asyncio
async def test_generate_timeline_report_empty(pdf_generator):
    """Test timeline report with no events."""
    timeline_data = TimelineExportData(
        case_id=1,
        case_title="Test Case",
        events=[],
        deadlines=[],
        export_date=datetime.now(),
        exported_by="Test User",
        upcoming_deadlines=[],
        completed_events=[],
    )

    pdf_bytes = await pdf_generator.generate_timeline_report(timeline_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

# ============================================================================
# Tests - Case Notes PDF
# ============================================================================

@pytest.mark.asyncio
async def test_generate_case_notes_basic(pdf_generator, sample_notes):
    """Test generating basic case notes PDF."""
    notes_data = NotesExportData(
        case_id=1,
        case_title="Test Case",
        notes=sample_notes,
        export_date=datetime.now(),
        exported_by="Test User",
        total_notes=len(sample_notes),
    )

    pdf_bytes = await pdf_generator.generate_case_notes(notes_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:4] == b"%PDF"

@pytest.mark.asyncio
async def test_generate_case_notes_without_titles(pdf_generator):
    """Test case notes with notes that have no titles."""
    notes = [
        Note(
            id=1,
            case_id=1,
            title=None,
            content="A note without a title",
            created_at="2025-01-01T10:00:00",
            updated_at="2025-01-01T10:00:00",
        )
    ]

    notes_data = NotesExportData(
        case_id=1,
        case_title="Test Case",
        notes=notes,
        export_date=datetime.now(),
        exported_by="Test User",
        total_notes=len(notes),
    )

    pdf_bytes = await pdf_generator.generate_case_notes(notes_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

@pytest.mark.asyncio
async def test_generate_case_notes_empty(pdf_generator):
    """Test case notes with no notes."""
    notes_data = NotesExportData(
        case_id=1,
        case_title="Test Case",
        notes=[],
        export_date=datetime.now(),
        exported_by="Test User",
        total_notes=0,
    )

    pdf_bytes = await pdf_generator.generate_case_notes(notes_data)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

# ============================================================================
# Tests - Styling and Configuration
# ============================================================================

def test_document_styles_validation():
    """Test DocumentStyles model validation."""
    # Valid styles
    styles = DocumentStyles(
        title_font_size=24,
        title_color="#1a365d",
    )
    assert styles.title_font_size == 24

    # Invalid color format
    with pytest.raises(ValueError):
        DocumentStyles(title_color="invalid_color")

    # Font size out of range
    with pytest.raises(ValueError):
        DocumentStyles(title_font_size=100)  # Too large

def test_page_margins_validation():
    """Test PageMargins model validation."""
    # Valid margins
    margins = PageMargins(top=72, bottom=72, left=72, right=72)
    assert margins.top == 72

    # Negative margin (should fail)
    with pytest.raises(ValueError):
        PageMargins(top=-10)

# ============================================================================
# Tests - Private Helper Methods
# ============================================================================

def test_build_case_info_section(pdf_generator, sample_case_data):
    """Test _build_case_info_section helper method."""
    elements = pdf_generator._build_case_info_section(sample_case_data)

    assert isinstance(elements, list)
    assert len(elements) > 0

def test_build_evidence_section(pdf_generator, sample_evidence):
    """Test _build_evidence_section helper method."""
    elements = pdf_generator._build_evidence_section(sample_evidence)

    assert isinstance(elements, list)
    assert len(elements) > 0

def test_build_timeline_section(pdf_generator, sample_timeline_events):
    """Test _build_timeline_section helper method."""
    elements = pdf_generator._build_timeline_section(sample_timeline_events)

    assert isinstance(elements, list)
    assert len(elements) > 0

def test_build_deadlines_section(pdf_generator, sample_deadlines):
    """Test _build_deadlines_section helper method."""
    elements = pdf_generator._build_deadlines_section(sample_deadlines)

    assert isinstance(elements, list)
    assert len(elements) > 0

def test_build_notes_section(pdf_generator, sample_notes):
    """Test _build_notes_section helper method."""
    elements = pdf_generator._build_notes_section(sample_notes)

    assert isinstance(elements, list)
    assert len(elements) > 0

def test_build_facts_section(pdf_generator, sample_facts):
    """Test _build_facts_section helper method."""
    elements = pdf_generator._build_facts_section(sample_facts)

    assert isinstance(elements, list)
    assert len(elements) > 0

# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_pdf_generation_workflow(
    pdf_generator, case_export_data, mock_audit_logger
):
    """Test complete PDF generation workflow with all features."""
    # Generate case summary
    case_pdf = await pdf_generator.generate_case_summary(case_export_data)
    assert len(case_pdf) > 0

    # Generate evidence list
    evidence_data = EvidenceExportData(
        case_id=case_export_data.case.id,
        case_title=case_export_data.case.title,
        evidence=case_export_data.evidence,
        export_date=case_export_data.export_date,
        exported_by=case_export_data.exported_by,
        total_items=len(case_export_data.evidence),
        category_summary={"document": 1, "email": 1},
    )
    evidence_pdf = await pdf_generator.generate_evidence_list(evidence_data)
    assert len(evidence_pdf) > 0

    # Generate timeline report
    timeline_data = TimelineExportData(
        case_id=case_export_data.case.id,
        case_title=case_export_data.case.title,
        events=case_export_data.timeline,
        deadlines=case_export_data.deadlines,
        export_date=case_export_data.export_date,
        exported_by=case_export_data.exported_by,
        upcoming_deadlines=[],
        completed_events=[],
    )
    timeline_pdf = await pdf_generator.generate_timeline_report(timeline_data)
    assert len(timeline_pdf) > 0

    # Generate case notes
    notes_data = NotesExportData(
        case_id=case_export_data.case.id,
        case_title=case_export_data.case.title,
        notes=case_export_data.notes,
        export_date=case_export_data.export_date,
        exported_by=case_export_data.exported_by,
        total_notes=len(case_export_data.notes),
    )
    notes_pdf = await pdf_generator.generate_case_notes(notes_data)
    assert len(notes_pdf) > 0

    # Verify all PDFs are valid
    for pdf in [case_pdf, evidence_pdf, timeline_pdf, notes_pdf]:
        assert pdf[:4] == b"%PDF"

    # Verify audit logging was called 4 times
    assert mock_audit_logger.log_action.call_count == 4

@pytest.mark.asyncio
async def test_pdf_generation_performance(pdf_generator, case_export_data):
    """Test PDF generation performance (should complete quickly)."""
    import time

    start_time = time.time()
    pdf_bytes = await pdf_generator.generate_case_summary(case_export_data)
    end_time = time.time()

    assert len(pdf_bytes) > 0
    assert (end_time - start_time) < 5.0  # Should complete within 5 seconds

# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=backend.services.export.pdf_generator"])

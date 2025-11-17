"""
PDF Generator Service for Justice Companion.

This module provides PDF generation capabilities for case summaries, evidence lists,
timeline reports, and case notes. Converted from TypeScript PDFGenerator.ts.

Features:
- Case summary PDFs with comprehensive case information
- Evidence inventory reports with category summaries
- Timeline reports with upcoming deadlines
- Case notes reports with formatted content
- Professional formatting with headers, footers, and page numbers
- Automatic page breaks and overflow handling
- Color-coded sections for urgency and status

Dependencies:
    reportlab: PDF generation library (installed via requirements.txt)

Author: Justice Companion Development Team
License: MIT
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from io import BytesIO
import logging

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfgen import canvas as pdf_canvas
from pydantic import BaseModel, Field, validator

from backend.services.audit_logger import AuditLogger


# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models for Type Safety
# ============================================================================


class DocumentStyles(BaseModel):
    """Document styling configuration."""

    title_font_size: int = Field(default=24, ge=10, le=48)
    title_color: str = Field(default="#1a365d")
    heading1_font_size: int = Field(default=18, ge=10, le=36)
    heading1_color: str = Field(default="#2c5282")
    heading2_font_size: int = Field(default=14, ge=10, le=24)
    heading2_color: str = Field(default="#2d3748")
    body_font_size: int = Field(default=11, ge=8, le=16)
    body_line_height: float = Field(default=1.6, ge=1.0, le=3.0)
    footer_font_size: int = Field(default=9, ge=6, le=14)
    footer_color: str = Field(default="#718096")

    @validator("title_color", "heading1_color", "heading2_color", "footer_color")
    def validate_hex_color(cls, v: str) -> str:
        """Validate hex color format."""
        if not v.startswith("#") or len(v) != 7:
            raise ValueError(f"Invalid hex color: {v}. Must be in format #RRGGBB")
        return v


class PageMargins(BaseModel):
    """Page margin configuration."""

    top: float = Field(default=72, ge=0, le=144)  # points (1 inch = 72 points)
    bottom: float = Field(default=72, ge=0, le=144)
    left: float = Field(default=72, ge=0, le=144)
    right: float = Field(default=72, ge=0, le=144)


class TimelineEvent(BaseModel):
    """Timeline event data structure."""

    id: int
    case_id: int
    title: str
    description: Optional[str] = None
    event_date: str  # ISO 8601 date string
    event_type: str  # 'deadline', 'hearing', 'filing', 'milestone', 'other'
    completed: bool
    created_at: str
    updated_at: str


class Evidence(BaseModel):
    """Evidence data structure."""

    id: int
    case_id: int
    title: str
    evidence_type: str
    obtained_date: Optional[str] = None
    file_path: Optional[str] = None
    content: Optional[str] = None
    created_at: str
    updated_at: str


class Deadline(BaseModel):
    """Deadline data structure."""

    id: int
    case_id: int
    title: str
    description: Optional[str] = None
    deadline_date: str  # ISO 8601 date string
    priority: str  # 'low', 'medium', 'high', 'critical'
    status: str  # 'pending', 'in_progress', 'completed', 'overdue'
    created_at: str
    updated_at: str


class Note(BaseModel):
    """Note data structure."""

    id: int
    case_id: int
    title: Optional[str] = None
    content: str
    created_at: str
    updated_at: str


class CaseFact(BaseModel):
    """Case fact data structure."""

    id: int
    case_id: int
    fact_content: str
    fact_category: str
    importance: str  # 'low', 'medium', 'high', 'critical'
    created_at: str
    updated_at: str


class CaseData(BaseModel):
    """Case data structure."""

    id: int
    title: str
    description: Optional[str] = None
    case_type: str
    status: str
    created_at: str
    updated_at: str


class CaseExportData(BaseModel):
    """Complete case export data."""

    case: CaseData
    evidence: List[Evidence] = []
    timeline: List[TimelineEvent] = []
    deadlines: List[Deadline] = []
    notes: List[Note] = []
    facts: List[CaseFact] = []
    export_date: datetime
    exported_by: str


class EvidenceExportData(BaseModel):
    """Evidence export data."""

    case_id: int
    case_title: str
    evidence: List[Evidence]
    export_date: datetime
    exported_by: str
    total_items: int
    category_summary: Dict[str, int] = {}


class TimelineExportData(BaseModel):
    """Timeline export data."""

    case_id: int
    case_title: str
    events: List[TimelineEvent]
    deadlines: List[Deadline]
    export_date: datetime
    exported_by: str
    upcoming_deadlines: List[Deadline] = []
    completed_events: List[TimelineEvent] = []


class NotesExportData(BaseModel):
    """Notes export data."""

    case_id: int
    case_title: str
    notes: List[Note]
    export_date: datetime
    exported_by: str
    total_notes: int


# ============================================================================
# PDF Generator Service
# ============================================================================


class PDFGenerator:
    """
    PDF Generator service for creating formatted PDF documents.

    This service provides methods to generate various types of PDF reports:
    - Case summary reports
    - Evidence inventory lists
    - Timeline reports with deadlines
    - Case notes compilations

    All PDFs include professional formatting with headers, footers, page numbers,
    and automatic page breaks. Color coding is used to indicate urgency and status.

    Usage:
        generator = PDFGenerator(audit_logger=audit_logger)
        pdf_bytes = await generator.generate_case_summary(case_export_data)

    Attributes:
        styles: Document styling configuration
        page_margins: Page margin configuration
        audit_logger: Optional audit logger for tracking PDF generation
    """

    def __init__(
        self,
        styles: Optional[DocumentStyles] = None,
        page_margins: Optional[PageMargins] = None,
        audit_logger: Optional[AuditLogger] = None,
    ):
        """
        Initialize PDF Generator.

        Args:
            styles: Optional custom document styles. If None, uses default styles.
            page_margins: Optional custom page margins. If None, uses default margins.
            audit_logger: Optional audit logger for tracking PDF generation events.
        """
        self.styles = styles or DocumentStyles()
        self.page_margins = page_margins or PageMargins()
        self.audit_logger = audit_logger

        # Create ReportLab styles
        self._setup_reportlab_styles()

        logger.info("PDFGenerator initialized with custom styles")

    def _setup_reportlab_styles(self) -> None:
        """Set up ReportLab paragraph styles based on configuration."""
        self.reportlab_styles = getSampleStyleSheet()

        # Title style
        self.reportlab_styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.reportlab_styles["Title"],
                fontSize=self.styles.title_font_size,
                textColor=HexColor(self.styles.title_color),
                alignment=TA_CENTER,
                spaceAfter=12,
            )
        )

        # Heading 1 style
        self.reportlab_styles.add(
            ParagraphStyle(
                name="CustomHeading1",
                parent=self.reportlab_styles["Heading1"],
                fontSize=self.styles.heading1_font_size,
                textColor=HexColor(self.styles.heading1_color),
                spaceAfter=12,
                spaceBefore=12,
            )
        )

        # Heading 2 style
        self.reportlab_styles.add(
            ParagraphStyle(
                name="CustomHeading2",
                parent=self.reportlab_styles["Heading2"],
                fontSize=self.styles.heading2_font_size,
                textColor=HexColor(self.styles.heading2_color),
                spaceAfter=8,
                spaceBefore=8,
            )
        )

        # Body style
        self.reportlab_styles.add(
            ParagraphStyle(
                name="CustomBody",
                parent=self.reportlab_styles["BodyText"],
                fontSize=self.styles.body_font_size,
                leading=self.styles.body_font_size * self.styles.body_line_height,
                spaceAfter=6,
            )
        )

        # Footer style
        self.reportlab_styles.add(
            ParagraphStyle(
                name="CustomFooter",
                parent=self.reportlab_styles["Normal"],
                fontSize=self.styles.footer_font_size,
                textColor=HexColor(self.styles.footer_color),
                alignment=TA_CENTER,
                fontName="Helvetica-Oblique",
            )
        )

    async def generate_case_summary(self, case_data: CaseExportData) -> bytes:
        """
        Generate a comprehensive case summary PDF.

        This method creates a multi-page PDF document containing:
        - Case information section
        - Evidence section (if available)
        - Timeline section (if available)
        - Deadlines section (if available)
        - Notes section (if available)
        - Facts section (if available)

        Args:
            case_data: Complete case export data including all related entities.

        Returns:
            bytes: PDF document as bytes buffer.

        Raises:
            ValueError: If case_data is invalid or missing required fields.
            Exception: If PDF generation fails.

        Example:
            >>> case_data = CaseExportData(...)
            >>> pdf_bytes = await generator.generate_case_summary(case_data)
            >>> with open("case_summary.pdf", "wb") as f:
            ...     f.write(pdf_bytes)
        """
        try:
            logger.info(f"Generating case summary PDF for case #{case_data.case.id}")

            # Create PDF buffer
            buffer = BytesIO()

            # Create PDF document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                topMargin=self.page_margins.top,
                bottomMargin=self.page_margins.bottom,
                leftMargin=self.page_margins.left,
                rightMargin=self.page_margins.right,
            )

            # Build content
            story = []

            # Add title
            story.append(
                Paragraph(
                    f"Case Summary: {case_data.case.title}",
                    self.reportlab_styles["CustomTitle"],
                )
            )
            story.append(Spacer(1, 0.2 * inch))

            # Case Information Section
            story.extend(self._build_case_info_section(case_data.case))

            # Evidence Section
            if case_data.evidence:
                story.append(PageBreak())
                story.extend(self._build_evidence_section(case_data.evidence))

            # Timeline Section
            if case_data.timeline:
                story.append(PageBreak())
                story.extend(self._build_timeline_section(case_data.timeline))

            # Deadlines Section
            if case_data.deadlines:
                if len(story) > 20:  # Approximate page check
                    story.append(PageBreak())
                story.extend(self._build_deadlines_section(case_data.deadlines))

            # Notes Section
            if case_data.notes:
                story.append(PageBreak())
                story.extend(self._build_notes_section(case_data.notes))

            # Facts Section
            if case_data.facts:
                if len(story) > 20:  # Approximate page check
                    story.append(PageBreak())
                story.extend(self._build_facts_section(case_data.facts))

            # Build PDF with custom footer
            doc.build(
                story,
                onFirstPage=lambda c, d: self._add_footer(
                    c, d, case_data.export_date, case_data.exported_by
                ),
                onLaterPages=lambda c, d: self._add_footer(
                    c, d, case_data.export_date, case_data.exported_by
                ),
            )

            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()

            # Audit log
            if self.audit_logger:
                await self.audit_logger.log_action(
                    user_id=None,  # User ID should be passed from caller
                    action="pdf_generated",
                    resource_type="case",
                    resource_id=case_data.case.id,
                    metadata={
                        "export_type": "case_summary",
                        "file_size": len(pdf_bytes),
                        "sections": {
                            "evidence": len(case_data.evidence),
                            "timeline": len(case_data.timeline),
                            "deadlines": len(case_data.deadlines),
                            "notes": len(case_data.notes),
                            "facts": len(case_data.facts),
                        },
                    },
                )

            logger.info(f"Case summary PDF generated successfully. Size: {len(pdf_bytes)} bytes")
            return pdf_bytes

        except Exception as e:
            logger.error(f"Failed to generate case summary PDF: {str(e)}", exc_info=True)
            raise

    async def generate_evidence_list(self, evidence_data: EvidenceExportData) -> bytes:
        """
        Generate an evidence inventory report PDF.

        Creates a PDF containing:
        - Case information header
        - Evidence statistics (total items, category breakdown)
        - Detailed evidence list with all metadata

        Args:
            evidence_data: Evidence export data with case context.

        Returns:
            bytes: PDF document as bytes buffer.

        Raises:
            ValueError: If evidence_data is invalid.
            Exception: If PDF generation fails.
        """
        try:
            logger.info(f"Generating evidence list PDF for case #{evidence_data.case_id}")

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                topMargin=self.page_margins.top,
                bottomMargin=self.page_margins.bottom,
                leftMargin=self.page_margins.left,
                rightMargin=self.page_margins.right,
            )

            story = []

            # Title
            story.append(
                Paragraph("Evidence Inventory Report", self.reportlab_styles["CustomTitle"])
            )
            story.append(Spacer(1, 0.2 * inch))

            # Case info
            story.append(
                Paragraph(
                    f"<b>Case:</b> {evidence_data.case_title}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Total Evidence Items:</b> {evidence_data.total_items}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Export Date:</b> {evidence_data.export_date.strftime('%Y-%m-%d')}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(Spacer(1, 0.2 * inch))

            # Category Summary
            if evidence_data.category_summary:
                story.append(
                    Paragraph(
                        "Evidence by Category:",
                        self.reportlab_styles["CustomHeading2"],
                    )
                )
                for category, count in evidence_data.category_summary.items():
                    story.append(
                        Paragraph(
                            f"• {category}: {count} item(s)",
                            self.reportlab_styles["CustomBody"],
                        )
                    )
                story.append(Spacer(1, 0.2 * inch))

            # Detailed Evidence List
            story.append(Paragraph("Evidence Details", self.reportlab_styles["CustomHeading1"]))
            story.extend(self._build_evidence_section(evidence_data.evidence))

            # Build PDF
            doc.build(
                story,
                onFirstPage=lambda c, d: self._add_footer(
                    c, d, evidence_data.export_date, evidence_data.exported_by
                ),
                onLaterPages=lambda c, d: self._add_footer(
                    c, d, evidence_data.export_date, evidence_data.exported_by
                ),
            )

            pdf_bytes = buffer.getvalue()
            buffer.close()

            # Audit log
            if self.audit_logger:
                await self.audit_logger.log_action(
                    user_id=None,
                    action="pdf_generated",
                    resource_type="evidence",
                    resource_id=evidence_data.case_id,
                    metadata={
                        "export_type": "evidence_list",
                        "file_size": len(pdf_bytes),
                        "total_items": evidence_data.total_items,
                    },
                )

            logger.info(f"Evidence list PDF generated successfully. Size: {len(pdf_bytes)} bytes")
            return pdf_bytes

        except Exception as e:
            logger.error(f"Failed to generate evidence list PDF: {str(e)}", exc_info=True)
            raise

    async def generate_timeline_report(self, timeline_data: TimelineExportData) -> bytes:
        """
        Generate a timeline report PDF with deadlines.

        Creates a PDF containing:
        - Case information header
        - Statistics (total events, upcoming deadlines)
        - Upcoming deadlines section (highlighted in red)
        - Timeline events section
        - Completed events section (highlighted in green)

        Args:
            timeline_data: Timeline export data with events and deadlines.

        Returns:
            bytes: PDF document as bytes buffer.

        Raises:
            ValueError: If timeline_data is invalid.
            Exception: If PDF generation fails.
        """
        try:
            logger.info(f"Generating timeline report PDF for case #{timeline_data.case_id}")

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                topMargin=self.page_margins.top,
                bottomMargin=self.page_margins.bottom,
                leftMargin=self.page_margins.left,
                rightMargin=self.page_margins.right,
            )

            story = []

            # Title
            story.append(Paragraph("Timeline Report", self.reportlab_styles["CustomTitle"]))
            story.append(Spacer(1, 0.2 * inch))

            # Case info
            story.append(
                Paragraph(
                    f"<b>Case:</b> {timeline_data.case_title}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Total Events:</b> {len(timeline_data.events)}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Upcoming Deadlines:</b> {len(timeline_data.upcoming_deadlines)}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Export Date:</b> {timeline_data.export_date.strftime('%Y-%m-%d')}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(Spacer(1, 0.3 * inch))

            # Upcoming Deadlines (urgent)
            if timeline_data.upcoming_deadlines:
                story.append(
                    Paragraph(
                        '<font color="#ef4444"><b>Upcoming Deadlines</b></font>',
                        self.reportlab_styles["CustomHeading1"],
                    )
                )
                story.extend(
                    self._build_deadlines_section(timeline_data.upcoming_deadlines, urgent=True)
                )
                story.append(Spacer(1, 0.2 * inch))

            # Timeline Events
            if timeline_data.events:
                if len(story) > 20:
                    story.append(PageBreak())
                story.append(Paragraph("Timeline Events", self.reportlab_styles["CustomHeading1"]))
                story.extend(self._build_timeline_section(timeline_data.events))

            # Completed Events
            if timeline_data.completed_events:
                if len(story) > 20:
                    story.append(PageBreak())
                story.append(
                    Paragraph(
                        '<font color="#10b981"><b>Completed Events</b></font>',
                        self.reportlab_styles["CustomHeading1"],
                    )
                )
                story.extend(self._build_timeline_section(timeline_data.completed_events))

            # Build PDF
            doc.build(
                story,
                onFirstPage=lambda c, d: self._add_footer(
                    c, d, timeline_data.export_date, timeline_data.exported_by
                ),
                onLaterPages=lambda c, d: self._add_footer(
                    c, d, timeline_data.export_date, timeline_data.exported_by
                ),
            )

            pdf_bytes = buffer.getvalue()
            buffer.close()

            # Audit log
            if self.audit_logger:
                await self.audit_logger.log_action(
                    user_id=None,
                    action="pdf_generated",
                    resource_type="timeline",
                    resource_id=timeline_data.case_id,
                    metadata={
                        "export_type": "timeline_report",
                        "file_size": len(pdf_bytes),
                        "total_events": len(timeline_data.events),
                        "upcoming_deadlines": len(timeline_data.upcoming_deadlines),
                    },
                )

            logger.info(f"Timeline report PDF generated successfully. Size: {len(pdf_bytes)} bytes")
            return pdf_bytes

        except Exception as e:
            logger.error(f"Failed to generate timeline report PDF: {str(e)}", exc_info=True)
            raise

    async def generate_case_notes(self, notes_data: NotesExportData) -> bytes:
        """
        Generate a case notes compilation PDF.

        Creates a PDF containing:
        - Case information header
        - Total notes count
        - All notes with titles and timestamps

        Args:
            notes_data: Notes export data with case context.

        Returns:
            bytes: PDF document as bytes buffer.

        Raises:
            ValueError: If notes_data is invalid.
            Exception: If PDF generation fails.
        """
        try:
            logger.info(f"Generating case notes PDF for case #{notes_data.case_id}")

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                topMargin=self.page_margins.top,
                bottomMargin=self.page_margins.bottom,
                leftMargin=self.page_margins.left,
                rightMargin=self.page_margins.right,
            )

            story = []

            # Title
            story.append(Paragraph("Case Notes Report", self.reportlab_styles["CustomTitle"]))
            story.append(Spacer(1, 0.2 * inch))

            # Case info
            story.append(
                Paragraph(
                    f"<b>Case:</b> {notes_data.case_title}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Total Notes:</b> {notes_data.total_notes}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(
                Paragraph(
                    f"<b>Export Date:</b> {notes_data.export_date.strftime('%Y-%m-%d')}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            story.append(Spacer(1, 0.3 * inch))

            # Notes Section
            story.append(Paragraph("Notes", self.reportlab_styles["CustomHeading1"]))
            story.extend(self._build_notes_section(notes_data.notes))

            # Build PDF
            doc.build(
                story,
                onFirstPage=lambda c, d: self._add_footer(
                    c, d, notes_data.export_date, notes_data.exported_by
                ),
                onLaterPages=lambda c, d: self._add_footer(
                    c, d, notes_data.export_date, notes_data.exported_by
                ),
            )

            pdf_bytes = buffer.getvalue()
            buffer.close()

            # Audit log
            if self.audit_logger:
                await self.audit_logger.log_action(
                    user_id=None,
                    action="pdf_generated",
                    resource_type="notes",
                    resource_id=notes_data.case_id,
                    metadata={
                        "export_type": "case_notes",
                        "file_size": len(pdf_bytes),
                        "total_notes": notes_data.total_notes,
                    },
                )

            logger.info(f"Case notes PDF generated successfully. Size: {len(pdf_bytes)} bytes")
            return pdf_bytes

        except Exception as e:
            logger.error(f"Failed to generate case notes PDF: {str(e)}", exc_info=True)
            raise

    # ========================================================================
    # Private Helper Methods - Content Builders
    # ========================================================================

    def _build_case_info_section(self, case: CaseData) -> List[Any]:
        """Build case information section."""
        elements = []

        elements.append(Paragraph("Case Information", self.reportlab_styles["CustomHeading1"]))

        elements.append(
            Paragraph(f"<b>Case ID:</b> #{case.id}", self.reportlab_styles["CustomBody"])
        )
        elements.append(
            Paragraph(f"<b>Type:</b> {case.case_type}", self.reportlab_styles["CustomBody"])
        )
        elements.append(
            Paragraph(f"<b>Status:</b> {case.status}", self.reportlab_styles["CustomBody"])
        )

        created_date = datetime.fromisoformat(case.created_at).strftime("%Y-%m-%d")
        updated_date = datetime.fromisoformat(case.updated_at).strftime("%Y-%m-%d")

        elements.append(
            Paragraph(f"<b>Created:</b> {created_date}", self.reportlab_styles["CustomBody"])
        )
        elements.append(
            Paragraph(
                f"<b>Last Updated:</b> {updated_date}",
                self.reportlab_styles["CustomBody"],
            )
        )

        if case.description:
            elements.append(Spacer(1, 0.1 * inch))
            elements.append(
                Paragraph("<b><u>Description:</u></b>", self.reportlab_styles["CustomBody"])
            )
            elements.append(Paragraph(case.description, self.reportlab_styles["CustomBody"]))

        elements.append(Spacer(1, 0.2 * inch))
        return elements

    def _build_evidence_section(self, evidence: List[Evidence]) -> List[Any]:
        """Build evidence section with detailed items."""
        elements = []

        elements.append(Paragraph("Evidence", self.reportlab_styles["CustomHeading1"]))

        for index, item in enumerate(evidence, start=1):
            elements.append(Spacer(1, 0.1 * inch))
            elements.append(
                Paragraph(
                    f"<b>{index}. {item.title}</b>",
                    self.reportlab_styles["CustomHeading2"],
                )
            )
            elements.append(
                Paragraph(
                    f"<b>Type:</b> {item.evidence_type}",
                    self.reportlab_styles["CustomBody"],
                )
            )

            if item.obtained_date:
                obtained_date = datetime.fromisoformat(item.obtained_date).strftime("%Y-%m-%d")
                elements.append(
                    Paragraph(
                        f"<b>Date Obtained:</b> {obtained_date}",
                        self.reportlab_styles["CustomBody"],
                    )
                )

            if item.file_path:
                elements.append(
                    Paragraph(
                        f"<b>File:</b> {item.file_path}",
                        self.reportlab_styles["CustomBody"],
                    )
                )

            if item.content:
                elements.append(
                    Paragraph(
                        f"<b>Content:</b> {item.content}",
                        self.reportlab_styles["CustomBody"],
                    )
                )

        return elements

    def _build_timeline_section(self, timeline: List[TimelineEvent]) -> List[Any]:
        """Build timeline section with events."""
        elements = []

        for event in timeline:
            event_date = datetime.fromisoformat(event.event_date).strftime("%Y-%m-%d")

            elements.append(Spacer(1, 0.1 * inch))
            elements.append(
                Paragraph(
                    f"<b>{event_date} - {event.title}</b>",
                    self.reportlab_styles["CustomHeading2"],
                )
            )

            if event.description:
                elements.append(Paragraph(event.description, self.reportlab_styles["CustomBody"]))

            elements.append(
                Paragraph(
                    f"<b>Type:</b> {event.event_type}",
                    self.reportlab_styles["CustomBody"],
                )
            )

            status_text = "Completed" if event.completed else "Pending"
            elements.append(
                Paragraph(
                    f"<b>Status:</b> {status_text}",
                    self.reportlab_styles["CustomBody"],
                )
            )

        return elements

    def _build_deadlines_section(
        self, deadlines: List[Deadline], urgent: bool = False
    ) -> List[Any]:
        """Build deadlines section with color coding."""
        elements = []

        for deadline in deadlines:
            deadline_date_obj = datetime.fromisoformat(deadline.deadline_date)
            deadline_date = deadline_date_obj.strftime("%Y-%m-%d")

            # Determine color based on status
            is_overdue = deadline_date_obj < datetime.now() and deadline.status != "completed"

            if is_overdue:
                color = "#ef4444"  # Red
            elif deadline.status == "completed":
                color = "#10b981"  # Green
            else:
                color = "#000000"  # Black

            elements.append(Spacer(1, 0.1 * inch))
            elements.append(
                Paragraph(
                    f'<font color="{color}"><b>{deadline_date} - {deadline.title}</b></font>',
                    self.reportlab_styles["CustomHeading2"],
                )
            )

            elements.append(
                Paragraph(
                    f"<b>Priority:</b> {deadline.priority}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            elements.append(
                Paragraph(
                    f"<b>Status:</b> {deadline.status}",
                    self.reportlab_styles["CustomBody"],
                )
            )

            if deadline.description:
                elements.append(
                    Paragraph(
                        f"<b>Description:</b> {deadline.description}",
                        self.reportlab_styles["CustomBody"],
                    )
                )

        return elements

    def _build_notes_section(self, notes: List[Note]) -> List[Any]:
        """Build notes section with formatted content."""
        elements = []

        for index, note in enumerate(notes, start=1):
            created_date = datetime.fromisoformat(note.created_at).strftime("%Y-%m-%d")

            elements.append(Spacer(1, 0.1 * inch))
            elements.append(
                Paragraph(
                    f"<b>Note {index} - {created_date}</b>",
                    self.reportlab_styles["CustomHeading2"],
                )
            )

            if note.title:
                elements.append(
                    Paragraph(
                        f"<b><u>Title:</u></b> {note.title}",
                        self.reportlab_styles["CustomBody"],
                    )
                )

            elements.append(Paragraph(note.content, self.reportlab_styles["CustomBody"]))

        return elements

    def _build_facts_section(self, facts: List[CaseFact]) -> List[Any]:
        """Build case facts section."""
        elements = []

        elements.append(Paragraph("Case Facts", self.reportlab_styles["CustomHeading1"]))

        for index, fact in enumerate(facts, start=1):
            elements.append(Spacer(1, 0.1 * inch))
            elements.append(
                Paragraph(
                    f"<b>{index}. {fact.fact_content}</b>",
                    self.reportlab_styles["CustomBody"],
                )
            )
            elements.append(
                Paragraph(
                    f"   <b>Category:</b> {fact.fact_category}",
                    self.reportlab_styles["CustomBody"],
                )
            )
            elements.append(
                Paragraph(
                    f"   <b>Importance:</b> {fact.importance}",
                    self.reportlab_styles["CustomBody"],
                )
            )

        return elements

    def _add_footer(
        self,
        canvas: pdf_canvas.Canvas,
        doc: SimpleDocTemplate,
        export_date: datetime,
        exported_by: str,
    ) -> None:
        """
        Add footer with page numbers and export info.

        Args:
            canvas: ReportLab canvas object.
            doc: ReportLab document object.
            export_date: Date of export.
            exported_by: User who exported the document.
        """
        canvas.saveState()

        # Page number
        page_num = canvas.getPageNumber()
        page_num_text = f"Page {page_num}"

        canvas.setFont("Helvetica-Oblique", self.styles.footer_font_size)
        canvas.setFillColor(HexColor(self.styles.footer_color))

        # Center page number
        page_width = A4[0]
        canvas.drawCentredString(page_width / 2, self.page_margins.bottom / 2, page_num_text)

        # Export info below page number
        export_info = f"Exported by {exported_by} on {export_date.strftime('%Y-%m-%d')}"
        canvas.drawCentredString(page_width / 2, (self.page_margins.bottom / 2) - 15, export_info)

        canvas.restoreState()


# ============================================================================
# Example Usage (for testing/development)
# ============================================================================


async def example_usage():
    """Example usage of PDFGenerator service."""

    # Create audit logger (mock for example)
    audit_logger = None  # Replace with actual AuditLogger instance

    # Create PDF generator
    generator = PDFGenerator(audit_logger=audit_logger)

    # Example: Generate case summary
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
        evidence=[
            Evidence(
                id=1,
                case_id=1,
                title="Employment Contract",
                evidence_type="document",
                obtained_date="2025-01-05T00:00:00",
                file_path="/evidence/contract.pdf",
                content="Signed employment agreement dated 2024-06-15",
                created_at="2025-01-05T10:00:00",
                updated_at="2025-01-05T10:00:00",
            )
        ],
        timeline=[],
        deadlines=[],
        notes=[],
        facts=[],
        export_date=datetime.now(),
        exported_by="John Doe",
    )

    pdf_bytes = await generator.generate_case_summary(case_data)

    # Save to file
    with open("case_summary_example.pdf", "wb") as f:
        f.write(pdf_bytes)

    print(f"PDF generated successfully: {len(pdf_bytes)} bytes")


if __name__ == "__main__":
    import asyncio

    asyncio.run(example_usage())

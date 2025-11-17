"""
Export management routes for Justice Companion.
Migrated from electron/ipc-handlers/export.ts

Routes:
- POST /export/case/{case_id}/pdf - Export case to PDF
- POST /export/case/{case_id}/docx - Export case to DOCX
- POST /export/case/{case_id}/json - Export case to JSON
- POST /export/case/{case_id}/csv - Export case to CSV
- POST /export/evidence/{case_id}/pdf - Export evidence list to PDF
- POST /export/timeline/{case_id}/pdf - Export timeline report to PDF
- POST /export/notes/{case_id}/pdf - Export case notes to PDF
- POST /export/notes/{case_id}/docx - Export case notes to DOCX
- GET /export/templates - List available export templates

Architecture:
- Uses ExportService for business logic orchestration
- Uses PDFGenerator for PDF document generation
- Uses DOCXGenerator for Word document generation
- Uses TemplateEngine for data formatting
- Uses AuditLogger for comprehensive audit logging
- Dependency injection for all services
- Streaming responses for large exports
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Any
from sqlalchemy.orm import Session
from pathlib import Path
import logging

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.export.export_service import (
    ExportService,
    ExportOptions as ServiceExportOptions,
)
from backend.services.export.pdf_generator import PDFGenerator
from backend.services.export.docx_generator import DOCXGenerator
from backend.services.export.template_engine import TemplateEngine
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger, log_audit_event

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["export"])


# ===== CONSTANTS =====
VALID_FORMATS = ["pdf", "docx", "json", "csv"]
VALID_TEMPLATES = ["case-summary", "evidence-list", "timeline-report", "case-notes"]
EXPORT_DIR = Path("exports")  # Default export directory


# ===== PYDANTIC REQUEST MODELS =====
class ExportOptions(BaseModel):
    """Request model for export options."""

    includeEvidence: bool = Field(True, description="Include evidence in export")
    includeTimeline: bool = Field(True, description="Include timeline/deadlines in export")
    includeNotes: bool = Field(True, description="Include notes in export")
    includeFacts: bool = Field(True, description="Include case facts in export")
    includeDocuments: bool = Field(True, description="Include documents in export")
    template: Optional[
        Literal["case-summary", "evidence-list", "timeline-report", "case-notes"]
    ] = Field(None, description="Export template to use")
    fileName: Optional[str] = Field(
        None, max_length=255, description="Custom filename (without extension)"
    )
    outputPath: Optional[str] = Field(None, description="Custom output directory path")

    @field_validator("fileName")
    @classmethod
    def validate_filename(cls, v: Optional[str]) -> Optional[str]:
        """Ensure filename is safe (no path traversal)."""
        if v:
            v = v.strip()
            # Remove any path separators
            if "/" in v or "\\" in v or ".." in v:
                raise ValueError("Filename cannot contain path separators")
        return v

    @field_validator("outputPath")
    @classmethod
    def validate_output_path(cls, v: Optional[str]) -> Optional[str]:
        """Ensure output path is safe (no path traversal to sensitive areas)."""
        if v:
            v = v.strip()
            # Basic path traversal protection
            if ".." in v:
                raise ValueError("Output path cannot contain '..' (path traversal)")
        return v


# ===== PYDANTIC RESPONSE MODELS =====
class ExportResult(BaseModel):
    """Response model for successful export."""

    success: bool = Field(True, description="Export succeeded")
    filePath: str = Field(..., description="Path to exported file")
    fileName: str = Field(..., description="Name of exported file")
    format: Literal["pdf", "docx", "json", "csv"] = Field(..., description="Export format")
    downloadUrl: str = Field(..., description="URL to download the file")
    size: int = Field(..., description="File size in bytes")
    exportedAt: str = Field(..., description="ISO 8601 timestamp of export")
    template: Optional[str] = Field(None, description="Template used for export")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "filePath": "/app/exports/case-123-export-20250113.pdf",
                "fileName": "case-123-export-20250113.pdf",
                "format": "pdf",
                "downloadUrl": "/files/case-123-export-20250113.pdf",
                "size": 245632,
                "exportedAt": "2025-01-13T14:30:00Z",
                "template": "case-summary",
            }
        }


class ExportTemplate(BaseModel):
    """Model for export template metadata."""

    id: str = Field(..., description="Template identifier")
    name: str = Field(..., description="Human-readable template name")
    description: str = Field(..., description="Template description")
    formats: List[Literal["pdf", "docx", "json", "csv"]] = Field(
        ..., description="Supported formats"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "case-summary",
                "name": "Case Summary",
                "description": "Complete case details with evidence, timeline, and notes",
                "formats": ["pdf", "docx", "json", "csv"],
            }
        }


class TemplateListResponse(BaseModel):
    """Response model for template list."""

    templates: List[ExportTemplate]


# ===== DEPENDENCY INJECTION =====
def get_export_service(db: Session = Depends(get_db)) -> ExportService:
    """
    Dependency injection for ExportService.

    Creates ExportService instance with all required dependencies:
    - Database session
    - Repository layer (case, evidence, deadline, document, note, user)
    - EncryptionService for field-level decryption
    - AuditLogger for audit trail
    - PDFGenerator for PDF generation
    - DOCXGenerator for DOCX generation
    - Export directory configuration

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured ExportService instance
    """
    # Import repositories (lazy import to avoid circular dependencies)
    from backend.repositories.case_repository import CaseRepository
    from backend.repositories.evidence_repository import EvidenceRepository
    from backend.repositories.deadline_repository import DeadlineRepository
    from backend.repositories.document_repository import DocumentRepository
    from backend.repositories.note_repository import NoteRepository
    from backend.repositories.user_repository import UserRepository

    # Initialize repositories
    case_repo = CaseRepository(db)
    evidence_repo = EvidenceRepository(db)
    deadline_repo = DeadlineRepository(db)
    document_repo = DocumentRepository(db)
    note_repo = NoteRepository(db)
    user_repo = UserRepository(db)

    # Initialize services
    encryption_service = EncryptionService()
    audit_logger = AuditLogger(db)
    pdf_generator = PDFGenerator(audit_logger=audit_logger)
    docx_generator = DOCXGenerator(audit_logger=audit_logger)

    # Create ExportService
    return ExportService(
        db=db,
        case_repo=case_repo,
        evidence_repo=evidence_repo,
        deadline_repo=deadline_repo,
        document_repo=document_repo,
        note_repo=note_repo,
        user_repo=user_repo,
        encryption_service=encryption_service,
        audit_logger=audit_logger,
        pdf_generator=pdf_generator,
        docx_generator=docx_generator,
        export_dir=str(EXPORT_DIR),
    )


def get_template_engine() -> TemplateEngine:
    """
    Dependency injection for TemplateEngine.

    Returns:
        Configured TemplateEngine instance
    """
    return TemplateEngine()


# ===== HELPER FUNCTIONS =====
def convert_options_to_service_format(
    options: ExportOptions, format: str, template: str
) -> ServiceExportOptions:
    """
    Convert API request options to ExportService format.

    Args:
        options: ExportOptions from request
        format: Export format (pdf, docx, json, csv)
        template: Template to use

    Returns:
        ServiceExportOptions for ExportService
    """
    return ServiceExportOptions(
        format=format,
        template=template,
        include_evidence=options.includeEvidence,
        include_timeline=options.includeTimeline,
        include_notes=options.includeNotes,
        include_facts=options.includeFacts,
        include_documents=options.includeDocuments,
        output_path=options.outputPath,
        file_name=options.fileName,
    )


def create_export_result(service_result: Any, format: str, template: str) -> ExportResult:
    """
    Convert ExportService result to API response format.

    Args:
        service_result: Result from ExportService
        format: Export format
        template: Template used

    Returns:
        ExportResult for API response
    """
    file_path = Path(service_result.file_path)

    return ExportResult(
        success=service_result.success,
        filePath=str(file_path.absolute()),
        fileName=file_path.name,
        format=format,
        downloadUrl=f"/files/{file_path.name}",
        size=service_result.size,
        exportedAt=service_result.exported_at.isoformat(),
        template=template,
    )


# ===== ROUTES =====
@router.post("/case/{case_id}/pdf", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_case_to_pdf(
    case_id: int,
    options: ExportOptions = ExportOptions(),
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export case to PDF format using professional document generation.

    This endpoint generates a comprehensive PDF report for the specified case using
    the ExportService layer. It supports multiple templates and configurable options.

    **Templates Available:**
    - `case-summary`: Complete case overview with all related data
    - `evidence-list`: Detailed evidence inventory
    - `timeline-report`: Chronological timeline with deadlines
    - `case-notes`: Formatted case notes

    **Security:**
    - Validates user owns the case before export
    - Logs all export operations to audit trail
    - Decrypts encrypted fields automatically

    **Args:**
        case_id: Case ID to export
        options: Export configuration options
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
        - 501 Not Implemented: PDF generator not available
    """
    try:
        logger.info(f"PDF export requested for case {case_id} by user {user_id}")

        # Determine template
        template = options.template or "case-summary"

        # Convert options to service format
        service_options = convert_options_to_service_format(options, "pdf", template)

        # Call ExportService
        result = await export_service.export_case_to_pdf(
            case_id=case_id, user_id=user_id, options=service_options
        )

        # Convert to API response format
        api_result = create_export_result(result, "pdf", template)

        logger.info(f"PDF export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export case {case_id} to PDF: {str(e)}", exc_info=True)

        # Log failed export
        log_audit_event(
            db=db,
            event_type="case.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_pdf",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export case to PDF: {str(e)}",
        )


@router.post("/case/{case_id}/docx", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_case_to_docx(
    case_id: int,
    options: ExportOptions = ExportOptions(),
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export case to DOCX (Microsoft Word) format.

    Generates a professionally formatted Word document with rich text formatting,
    headers, footers, and page numbering. Supports all templates available for PDF.

    **Templates Available:**
    - `case-summary`: Complete case overview with all related data
    - `evidence-list`: Detailed evidence inventory
    - `timeline-report`: Chronological timeline with deadlines
    - `case-notes`: Formatted case notes

    **Features:**
    - Professional Word document formatting
    - Headers and footers with page numbers
    - Automatic page breaks between sections
    - Editable format for further customization

    **Args:**
        case_id: Case ID to export
        options: Export configuration options
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
        - 501 Not Implemented: DOCX generator not available
    """
    try:
        logger.info(f"DOCX export requested for case {case_id} by user {user_id}")

        # Determine template
        template = options.template or "case-summary"

        # Convert options to service format
        service_options = convert_options_to_service_format(options, "docx", template)

        # Call ExportService
        result = await export_service.export_case_to_word(
            case_id=case_id, user_id=user_id, options=service_options
        )

        # Convert to API response format
        api_result = create_export_result(result, "docx", template)

        logger.info(f"DOCX export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export case {case_id} to DOCX: {str(e)}", exc_info=True)

        # Log failed export
        log_audit_event(
            db=db,
            event_type="case.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_docx",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export case to DOCX: {str(e)}",
        )


@router.post("/case/{case_id}/json", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_case_to_json(
    case_id: int,
    options: ExportOptions = ExportOptions(),
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export case to JSON format for data migration or programmatic access.

    Exports all case data as machine-readable JSON with full structure preservation.
    All encrypted fields are automatically decrypted before export.

    **Features:**
    - Complete data structure preservation
    - Human-readable JSON formatting (indented)
    - Decrypted sensitive fields
    - Suitable for data migration and programmatic access

    **Use Cases:**
    - Data migration between systems
    - Programmatic analysis
    - Backup and archival
    - API integration

    **Args:**
        case_id: Case ID to export
        options: Export configuration options
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
    """
    try:
        logger.info(f"JSON export requested for case {case_id} by user {user_id}")

        # Convert options to service format
        service_options = convert_options_to_service_format(options, "json", "case-summary")

        # Call ExportService
        result = await export_service.export_case_to_json(
            case_id=case_id, user_id=user_id, options=service_options
        )

        # Convert to API response format
        api_result = create_export_result(result, "json", "json-export")

        logger.info(f"JSON export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export case {case_id} to JSON: {str(e)}", exc_info=True)

        # Log failed export
        log_audit_event(
            db=db,
            event_type="case.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_json",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export case to JSON: {str(e)}",
        )


@router.post("/case/{case_id}/csv", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_case_to_csv(
    case_id: int,
    options: ExportOptions = ExportOptions(),
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export case to CSV format for spreadsheet analysis.

    Exports evidence data as CSV (Comma-Separated Values) format suitable for
    spreadsheet applications like Microsoft Excel, Google Sheets, or LibreOffice Calc.

    **Features:**
    - Spreadsheet-compatible format
    - CSV headers for all columns
    - Properly escaped fields (commas, quotes, newlines)
    - Suitable for data analysis

    **Use Cases:**
    - Spreadsheet analysis
    - Data visualization
    - Evidence inventory management
    - Financial analysis

    **Limitations:**
    - CSV has limited support for hierarchical data
    - Primarily exports evidence data (not timeline or notes)
    - No formatting or styling

    **Args:**
        case_id: Case ID to export
        options: Export configuration options
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
    """
    try:
        logger.info(f"CSV export requested for case {case_id} by user {user_id}")

        # Convert options to service format
        service_options = convert_options_to_service_format(options, "csv", "case-summary")

        # Call ExportService
        result = await export_service.export_case_to_csv(
            case_id=case_id, user_id=user_id, options=service_options
        )

        # Convert to API response format
        api_result = create_export_result(result, "csv", "csv-export")

        logger.info(f"CSV export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export case {case_id} to CSV: {str(e)}", exc_info=True)

        # Log failed export
        log_audit_event(
            db=db,
            event_type="case.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_csv",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export case to CSV: {str(e)}",
        )


@router.post("/evidence/{case_id}/pdf", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_evidence_to_pdf(
    case_id: int,
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export evidence list to PDF format.

    Generates a comprehensive evidence inventory report including:
    - Evidence type, title, description
    - Obtained date
    - File paths
    - Category summary statistics

    This is a convenience endpoint that uses the `evidence-list` template.

    **Args:**
        case_id: Case ID to export
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
    """
    try:
        logger.info(f"Evidence PDF export requested for case {case_id} by user {user_id}")

        # Call ExportService convenience method
        result = await export_service.export_evidence_list_to_pdf(case_id=case_id, user_id=user_id)

        # Convert to API response format
        api_result = create_export_result(result, "pdf", "evidence-list")

        logger.info(f"Evidence PDF export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to export evidence to PDF for case {case_id}: {str(e)}", exc_info=True
        )

        # Log failed export
        log_audit_event(
            db=db,
            event_type="evidence.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_evidence_pdf",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export evidence to PDF: {str(e)}",
        )


@router.post("/timeline/{case_id}/pdf", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_timeline_to_pdf(
    case_id: int,
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export timeline report to PDF format.

    Generates a chronological timeline including:
    - Deadlines (upcoming and completed)
    - Events and milestones
    - Visual timeline representation with color coding

    This is a convenience endpoint that uses the `timeline-report` template.

    **Args:**
        case_id: Case ID to export
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
    """
    try:
        logger.info(f"Timeline PDF export requested for case {case_id} by user {user_id}")

        # Call ExportService convenience method
        result = await export_service.export_timeline_report_to_pdf(
            case_id=case_id, user_id=user_id
        )

        # Convert to API response format
        api_result = create_export_result(result, "pdf", "timeline-report")

        logger.info(f"Timeline PDF export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to export timeline to PDF for case {case_id}: {str(e)}", exc_info=True
        )

        # Log failed export
        log_audit_event(
            db=db,
            event_type="timeline.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_timeline_pdf",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export timeline to PDF: {str(e)}",
        )


@router.post("/notes/{case_id}/pdf", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_notes_to_pdf(
    case_id: int,
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export case notes to PDF format.

    Generates a formatted notes document including:
    - All case notes in chronological order
    - Note metadata (created date, author)
    - Rich text formatting preserved

    This is a convenience endpoint that uses the `case-notes` template.

    **Args:**
        case_id: Case ID to export
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
    """
    try:
        logger.info(f"Notes PDF export requested for case {case_id} by user {user_id}")

        # Call ExportService convenience method
        result = await export_service.export_case_notes_to_pdf(case_id=case_id, user_id=user_id)

        # Convert to API response format
        api_result = create_export_result(result, "pdf", "case-notes")

        logger.info(f"Notes PDF export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export notes to PDF for case {case_id}: {str(e)}", exc_info=True)

        # Log failed export
        log_audit_event(
            db=db,
            event_type="notes.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_notes_pdf",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export notes to PDF: {str(e)}",
        )


@router.post("/notes/{case_id}/docx", response_model=ExportResult, status_code=status.HTTP_200_OK)
async def export_notes_to_docx(
    case_id: int,
    user_id: int = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service),
    db: Session = Depends(get_db),
):
    """
    Export case notes to DOCX (Word) format.

    Generates a formatted Word document with:
    - All case notes
    - Rich text formatting
    - Editable format for further annotation

    This is a convenience endpoint that uses the `case-notes` template.

    **Args:**
        case_id: Case ID to export
        user_id: Authenticated user ID (from JWT)
        export_service: Injected ExportService instance
        db: Database session

    **Returns:**
        ExportResult with file path and download URL

    **Raises:**
        - 403 Forbidden: User doesn't own the case
        - 404 Not Found: Case not found
        - 500 Internal Server Error: Export generation failed
    """
    try:
        logger.info(f"Notes DOCX export requested for case {case_id} by user {user_id}")

        # Call ExportService convenience method
        result = await export_service.export_case_notes_to_word(case_id=case_id, user_id=user_id)

        # Convert to API response format
        api_result = create_export_result(result, "docx", "case-notes")

        logger.info(f"Notes DOCX export completed for case {case_id}: {api_result.fileName}")

        return api_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export notes to DOCX for case {case_id}: {str(e)}", exc_info=True)

        # Log failed export
        log_audit_event(
            db=db,
            event_type="notes.exported",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="export_notes_docx",
            success=False,
            error_message=str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export notes to DOCX: {str(e)}",
        )


@router.get("/templates", response_model=TemplateListResponse, status_code=status.HTTP_200_OK)
async def get_export_templates(template_engine: TemplateEngine = Depends(get_template_engine)):
    """
    Get available export templates with metadata.

    Returns information about all available export templates including:
    - Template ID
    - Display name
    - Description
    - Supported formats (PDF, DOCX, JSON, CSV)

    **No authentication required** (metadata only).

    **Available Templates:**
    1. **case-summary**: Complete case details with evidence, timeline, and notes
       - Formats: PDF, DOCX, JSON, CSV
    2. **evidence-list**: Detailed inventory of all case evidence
       - Formats: PDF, DOCX
    3. **timeline-report**: Chronological timeline with deadlines and events
       - Formats: PDF, DOCX
    4. **case-notes**: All notes and observations for the case
       - Formats: PDF, DOCX

    **Args:**
        template_engine: Injected TemplateEngine instance

    **Returns:**
        TemplateListResponse with all available templates
    """
    try:
        # Get all templates from template engine
        templates = template_engine.get_all_templates()

        # Convert to API response format
        api_templates = [
            ExportTemplate(
                id=template.format_func.replace("format_", "").replace("_", "-"),
                name=template.name,
                description=template.description,
                formats=(
                    ["pdf", "docx"]
                    if template.name != "Case Summary"
                    else ["pdf", "docx", "json", "csv"]
                ),
            )
            for template in templates
        ]

        logger.info(f"Template list requested: {len(api_templates)} templates available")

        return TemplateListResponse(templates=api_templates)

    except Exception as e:
        logger.error(f"Failed to retrieve template list: {str(e)}", exc_info=True)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve export templates: {str(e)}",
        )

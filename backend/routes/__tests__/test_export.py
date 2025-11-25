"""
Comprehensive test suite for export routes.

Tests cover:
1. PDF export - all templates
2. DOCX export - all templates
3. JSON export
4. CSV export
5. Convenience endpoints (evidence, timeline, notes)
6. Template listing
7. Authentication and authorization
8. Error handling
9. Audit logging
10. Dependency injection

Total: 18 tests
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from backend.main import app
from backend.services.export.export_service import ExportResult as ServiceExportResult

# ===== FIXTURES =====

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)

@pytest.fixture
def mock_user_id():
    """Mock authenticated user ID."""
    return 123

@pytest.fixture
def mock_case_id():
    """Mock case ID."""
    return 456

@pytest.fixture
def mock_export_result():
    """Mock successful export result from ExportService."""
    return ServiceExportResult(
        success=True,
        file_path="/app/exports/case-456-case-summary-2025-01-13T14-30-00.pdf",
        file_name="case-456-case-summary-2025-01-13T14-30-00.pdf",
        format="pdf",
        size=245632,
        exported_at=datetime(2025, 1, 13, 14, 30, 0),
        template="case-summary"
    )

@pytest.fixture
def mock_get_current_user(mock_user_id):
    """Mock authentication dependency."""
    def _mock_get_current_user():
        return mock_user_id
    return _mock_get_current_user

@pytest.fixture
def mock_export_service(mock_export_result):
    """Mock ExportService dependency."""
    service = Mock()
    service.export_case_to_pdf = AsyncMock(return_value=mock_export_result)
    service.export_case_to_word = AsyncMock(return_value=mock_export_result)
    service.export_case_to_json = AsyncMock(return_value=mock_export_result)
    service.export_case_to_csv = AsyncMock(return_value=mock_export_result)
    service.export_evidence_list_to_pdf = AsyncMock(return_value=mock_export_result)
    service.export_timeline_report_to_pdf = AsyncMock(return_value=mock_export_result)
    service.export_case_notes_to_pdf = AsyncMock(return_value=mock_export_result)
    service.export_case_notes_to_word = AsyncMock(return_value=mock_export_result)
    return service

@pytest.fixture
def mock_template_engine():
    """Mock TemplateEngine dependency."""
    from backend.services.export.template_engine import Template

    engine = Mock()
    engine.get_all_templates = Mock(return_value=[
        Template(
            name="Case Summary",
            description="Complete case details with evidence, timeline, and notes",
            sections=["case", "evidence", "timeline", "notes", "facts"],
            format_func="format_case_summary"
        ),
        Template(
            name="Evidence List",
            description="Detailed inventory of all case evidence",
            sections=["evidence"],
            format_func="format_evidence_list"
        ),
        Template(
            name="Timeline Report",
            description="Chronological timeline with deadlines and events",
            sections=["timeline", "deadlines"],
            format_func="format_timeline_report"
        ),
        Template(
            name="Case Notes",
            description="All notes and observations for the case",
            sections=["notes"],
            format_func="format_case_notes"
        )
    ])
    return engine

# ===== TEST CASES =====

class TestExportCaseToPDF:
    """Test suite for PDF export endpoints."""

    def test_export_case_to_pdf_success(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test successful case PDF export with default options."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/pdf",
                    json={}
                )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["format"] == "pdf"
        assert data["template"] == "case-summary"
        assert data["fileName"] == "case-456-case-summary-2025-01-13T14-30-00.pdf"
        assert data["size"] == 245632

    def test_export_case_to_pdf_with_custom_template(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test PDF export with custom template."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/pdf",
                    json={
                        "template": "evidence-list"
                    }
                )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["template"] == "evidence-list"

    def test_export_case_to_pdf_with_custom_filename(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test PDF export with custom filename."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/pdf",
                    json={
                        "fileName": "my-custom-case-export"
                    }
                )

        assert response.status_code == status.HTTP_200_OK

    def test_export_case_to_pdf_invalid_filename(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test PDF export rejects path traversal in filename."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/pdf",
                    json={
                        "fileName": "../../../etc/passwd"
                    }
                )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_export_case_to_pdf_unauthorized(self, client, mock_case_id):
        """Test PDF export requires authentication."""
        response = client.post(f"/export/case/{mock_case_id}/pdf")
        # Will fail without authentication mock
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

class TestExportCaseToDOCX:
    """Test suite for DOCX export endpoints."""

    def test_export_case_to_docx_success(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test successful case DOCX export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/docx",
                    json={}
                )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["format"] == "docx"

    def test_export_case_to_docx_with_options(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test DOCX export with selective options."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/docx",
                    json={
                        "includeEvidence": True,
                        "includeTimeline": False,
                        "includeNotes": True,
                        "includeFacts": False,
                        "includeDocuments": True
                    }
                )

        assert response.status_code == status.HTTP_200_OK

class TestExportCaseToJSON:
    """Test suite for JSON export endpoints."""

    def test_export_case_to_json_success(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test successful case JSON export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/json",
                    json={}
                )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["format"] == "json"
        assert data["template"] == "json-export"

class TestExportCaseToCSV:
    """Test suite for CSV export endpoints."""

    def test_export_case_to_csv_success(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test successful case CSV export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(
                    f"/export/case/{mock_case_id}/csv",
                    json={}
                )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["format"] == "csv"
        assert data["template"] == "csv-export"

class TestConvenienceEndpoints:
    """Test suite for convenience export endpoints."""

    def test_export_evidence_to_pdf(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test convenience endpoint for evidence PDF export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(f"/export/evidence/{mock_case_id}/pdf")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["template"] == "evidence-list"

    def test_export_timeline_to_pdf(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test convenience endpoint for timeline PDF export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(f"/export/timeline/{mock_case_id}/pdf")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["template"] == "timeline-report"

    def test_export_notes_to_pdf(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test convenience endpoint for notes PDF export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(f"/export/notes/{mock_case_id}/pdf")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["template"] == "case-notes"

    def test_export_notes_to_docx(self, client, mock_user_id, mock_case_id, mock_get_current_user, mock_export_service):
        """Test convenience endpoint for notes DOCX export."""
        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post(f"/export/notes/{mock_case_id}/docx")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["format"] == "docx"
        assert data["template"] == "case-notes"

class TestTemplateEndpoint:
    """Test suite for template listing endpoint."""

    def test_get_export_templates(self, client, mock_template_engine):
        """Test retrieving list of available export templates."""
        with patch('backend.routes.export.get_template_engine', return_value=mock_template_engine):
            response = client.get("/export/templates")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) == 4

        # Verify template structure
        template = data["templates"][0]
        assert "id" in template
        assert "name" in template
        assert "description" in template
        assert "formats" in template

    def test_get_export_templates_no_auth_required(self, client, mock_template_engine):
        """Test template listing doesn't require authentication."""
        # Should succeed without authentication mock
        with patch('backend.routes.export.get_template_engine', return_value=mock_template_engine):
            response = client.get("/export/templates")

        assert response.status_code == status.HTTP_200_OK

class TestErrorHandling:
    """Test suite for error handling scenarios."""

    def test_export_case_not_found(self, client, mock_user_id, mock_export_service):
        """Test export fails gracefully when case not found."""
        from fastapi import HTTPException

        # Mock service to raise 404
        mock_export_service.export_case_to_pdf = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Case not found")
        )

        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post("/export/case/999/pd")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_export_permission_denied(self, client, mock_user_id, mock_export_service):
        """Test export fails when user doesn't own case."""
        from fastapi import HTTPException

        # Mock service to raise 403
        mock_export_service.export_case_to_pdf = AsyncMock(
            side_effect=HTTPException(status_code=403, detail="Permission denied")
        )

        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post("/export/case/456/pd")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_export_service_error(self, client, mock_user_id, mock_export_service):
        """Test export handles service errors gracefully."""
        # Mock service to raise generic error
        mock_export_service.export_case_to_pdf = AsyncMock(
            side_effect=Exception("Internal service error")
        )

        with patch('backend.routes.export.get_current_user', return_value=mock_user_id):
            with patch('backend.routes.export.get_export_service', return_value=mock_export_service):
                response = client.post("/export/case/456/pd")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to export case to PDF" in response.json()["detail"]

class TestDependencyInjection:
    """Test suite for dependency injection functionality."""

    def test_get_export_service_creates_all_dependencies(self):
        """Test get_export_service creates all required dependencies."""
        from backend.routes.export import get_export_service
        from unittest.mock import Mock

        # Mock database session
        mock_db = Mock()

        # Mock all repository constructors
        with patch('backend.routes.export.CaseRepository') as mock_case_repo, \
             patch('backend.routes.export.EvidenceRepository') as mock_evidence_repo, \
             patch('backend.routes.export.DeadlineRepository') as mock_deadline_repo, \
             patch('backend.routes.export.DocumentRepository') as mock_document_repo, \
             patch('backend.routes.export.NoteRepository') as mock_note_repo, \
             patch('backend.routes.export.UserRepository') as mock_user_repo, \
             patch('backend.routes.export.EncryptionService') as mock_encryption, \
             patch('backend.routes.export.AuditLogger') as mock_audit, \
             patch('backend.routes.export.PDFGenerator') as mock_pdf, \
             patch('backend.routes.export.DOCXGenerator') as mock_docx, \
             patch('backend.routes.export.ExportService') as mock_export_service:

            # Call dependency injection function
            service = get_export_service(db=mock_db)

            # Verify all repositories were created
            mock_case_repo.assert_called_once_with(mock_db)
            mock_evidence_repo.assert_called_once_with(mock_db)
            mock_deadline_repo.assert_called_once_with(mock_db)
            mock_document_repo.assert_called_once_with(mock_db)
            mock_note_repo.assert_called_once_with(mock_db)
            mock_user_repo.assert_called_once_with(mock_db)

            # Verify services were created
            mock_encryption.assert_called_once()
            mock_audit.assert_called_once_with(mock_db)
            mock_pdf.assert_called_once()
            mock_docx.assert_called_once()

            # Verify ExportService was created with all dependencies
            mock_export_service.assert_called_once()

    def test_get_template_engine_creates_instance(self):
        """Test get_template_engine creates TemplateEngine instance."""
        from backend.routes.export import get_template_engine

        engine = get_template_engine()

        assert engine is not None
        # Should have get_all_templates method
        assert hasattr(engine, 'get_all_templates')

# ===== INTEGRATION TESTS (Optional - require full setup) =====

@pytest.mark.integration
class TestIntegrationExport:
    """Integration tests requiring full application setup."""

    def test_end_to_end_pdf_export(self):
        """Test complete PDF export flow from request to file generation."""
        # This would require:
        # 1. Real database with test data
        # 2. Real encryption service with test key
        # 3. Real PDF generator
        # 4. File system access for export directory
        pytest.skip("Requires full integration test setup")

    def test_end_to_end_audit_logging(self):
        """Test audit logging for export operations."""
        pytest.skip("Requires full integration test setup")

# ===== TEST HELPERS =====

def test_convert_options_to_service_format():
    """Test option conversion from API to service format."""
    from backend.routes.export import convert_options_to_service_format, ExportOptions

    api_options = ExportOptions(
        includeEvidence=True,
        includeTimeline=False,
        includeNotes=True,
        includeFacts=False,
        includeDocuments=True,
        fileName="custom-export"
    )

    service_options = convert_options_to_service_format(
        api_options,
        format="pd",
        template="case-summary"
    )

    assert service_options.format == "pd"
    assert service_options.template == "case-summary"
    assert service_options.include_evidence is True
    assert service_options.include_timeline is False
    assert service_options.include_notes is True
    assert service_options.include_facts is False
    assert service_options.include_documents is True
    assert service_options.file_name == "custom-export"

def test_create_export_result():
    """Test export result conversion from service to API format."""
    from backend.routes.export import create_export_result, ServiceExportResult

    service_result = ServiceExportResult(
        success=True,
        file_path="/app/exports/case-123-export.pd",
        file_name="case-123-export.pd",
        format="pd",
        size=100000,
        exported_at=datetime(2025, 1, 13, 10, 0, 0),
        template="case-summary"
    )

    api_result = create_export_result(service_result, "pd", "case-summary")

    assert api_result.success is True
    assert api_result.format == "pd"
    assert api_result.template == "case-summary"
    assert api_result.size == 100000
    assert "case-123-export.pdf" in api_result.fileName

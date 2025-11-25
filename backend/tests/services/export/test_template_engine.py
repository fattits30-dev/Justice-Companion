"""
Test suite for TemplateEngine service.

Tests:
- Template registration and retrieval
- Template application with data formatting
- Section-specific formatters
- Error handling for invalid templates
- Audit logging integration
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from backend.services.export.template_engine import (
    TemplateEngine,
    Template,
)
from fastapi import HTTPException

@pytest.fixture
def audit_logger():
    """Mock audit logger."""
    logger = MagicMock()
    logger.log = AsyncMock()
    return logger

@pytest.fixture
def template_engine(audit_logger):
    """Create template engine instance with mock audit logger."""
    return TemplateEngine(audit_logger=audit_logger)

@pytest.fixture
def sample_case_export_data():
    """Sample case export data for testing."""
    return {
        "case": {
            "id": 1,
            "title": "Test Case v. Defendant",
            "case_type": "civil",
            "status": "active",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-15T00:00:00Z",
            "description": "Test case description",
            "plaintiff": "John Doe",
            "defendant": "Acme Corp"
        },
        "evidence": [
            {
                "id": 1,
                "title": "Contract Agreement",
                "evidence_type": "document",
                "category": "contracts",
                "description": "Signed contract",
                "file_path": "/path/to/contract.pdf",
                "collected_date": "2024-01-05",
                "created_at": "2024-01-06T10:00:00Z"
            },
            {
                "id": 2,
                "title": "Email Communication",
                "evidence_type": "digital",
                "category": "communication",
                "description": "Email thread",
                "file_path": "/path/to/email.msg",
                "collected_date": "2024-01-08",
                "created_at": "2024-01-09T14:30:00Z"
            }
        ],
        "timeline": [
            {
                "id": 1,
                "case_id": 1,
                "title": "Contract Signed",
                "description": "Both parties signed agreement",
                "event_date": "2024-01-05",
                "event_type": "milestone",
                "completed": True,
                "created_at": "2024-01-06T00:00:00Z",
                "updated_at": "2024-01-06T00:00:00Z"
            }
        ],
        "deadlines": [
            {
                "id": 1,
                "title": "File Motion",
                "description": "File motion with court",
                "deadline_date": "2024-02-01T00:00:00Z",
                "priority": "high",
                "completed": False
            }
        ],
        "notes": [
            {
                "id": 1,
                "content": "Initial case review completed",
                "created_at": "2024-01-10T09:00:00Z",
                "updated_at": "2024-01-10T09:00:00Z",
                "author": "Attorney Smith"
            }
        ],
        "facts": [
            {
                "id": 1,
                "statement": "Contract was breached on 2024-01-03",
                "category": "breach",
                "importance": "high",
                "verified": True,
                "created_at": "2024-01-11T00:00:00Z"
            }
        ],
        "documents": [],
        "export_date": datetime.now(),
        "exported_by": "user@example.com"
    }

@pytest.fixture
def sample_evidence_export_data():
    """Sample evidence export data for testing."""
    return {
        "case_id": 1,
        "case_title": "Test Case v. Defendant",
        "evidence": [
            {
                "id": 1,
                "title": "Photo Evidence",
                "evidence_type": "photo",
                "category": "visual",
                "description": "Scene photo",
                "file_path": "/path/to/photo.jpg",
                "collected_date": "2024-01-05",
                "created_at": "2024-01-06T10:00:00Z"
            },
            {
                "id": 2,
                "title": "Witness Statement",
                "evidence_type": "document",
                "category": "testimony",
                "description": "Written statement",
                "file_path": "/path/to/statement.pdf",
                "collected_date": "2024-01-08",
                "created_at": "2024-01-09T14:30:00Z"
            }
        ],
        "export_date": datetime.now(),
        "exported_by": "user@example.com",
        "total_items": 2,
        "category_summary": {
            "visual": 1,
            "testimony": 1
        }
    }

@pytest.fixture
def sample_timeline_export_data():
    """Sample timeline export data for testing."""
    future_date = (datetime.now() + timedelta(days=30)).isoformat()
    past_date = (datetime.now() - timedelta(days=5)).isoformat()

    return {
        "case_id": 1,
        "case_title": "Test Case v. Defendant",
        "events": [
            {
                "id": 1,
                "case_id": 1,
                "title": "Case Filed",
                "description": "Initial filing",
                "event_date": past_date,
                "event_type": "filing",
                "completed": True,
                "created_at": past_date,
                "updated_at": past_date
            }
        ],
        "deadlines": [
            {
                "id": 1,
                "title": "Response Due",
                "description": "File response",
                "deadline_date": future_date,
                "priority": "high",
                "completed": False
            }
        ],
        "export_date": datetime.now(),
        "exported_by": "user@example.com",
        "upcoming_deadlines": [
            {
                "id": 1,
                "title": "Response Due",
                "description": "File response",
                "deadline_date": future_date,
                "priority": "high",
                "completed": False
            }
        ],
        "completed_events": [
            {
                "id": 1,
                "case_id": 1,
                "title": "Case Filed",
                "description": "Initial filing",
                "event_date": past_date,
                "event_type": "filing",
                "completed": True,
                "created_at": past_date,
                "updated_at": past_date
            }
        ]
    }

@pytest.fixture
def sample_notes_export_data():
    """Sample notes export data for testing."""
    return {
        "case_id": 1,
        "case_title": "Test Case v. Defendant",
        "notes": [
            {
                "id": 1,
                "content": "Client meeting scheduled",
                "created_at": "2024-01-10T09:00:00Z",
                "updated_at": "2024-01-10T09:00:00Z",
                "author": "Attorney Smith"
            },
            {
                "id": 2,
                "content": "Discovery materials received",
                "created_at": "2024-01-12T14:30:00Z",
                "updated_at": "2024-01-12T14:30:00Z",
                "author": "Attorney Jones"
            }
        ],
        "export_date": datetime.now(),
        "exported_by": "user@example.com",
        "total_notes": 2
    }

class TestTemplateEngineInitialization:
    """Test template engine initialization and default templates."""

    def test_initialization(self, template_engine):
        """Test that engine initializes with default templates."""
        assert template_engine is not None
        assert len(template_engine.templates) == 4

    def test_default_templates_registered(self, template_engine):
        """Test that all default templates are registered."""
        expected_templates = [
            "case-summary",
            "evidence-list",
            "timeline-report",
            "case-notes"
        ]

        for template_name in expected_templates:
            assert template_name in template_engine.templates

    def test_template_structure(self, template_engine):
        """Test that templates have correct structure."""
        template = template_engine.get_template("case-summary")

        assert template is not None
        assert template.name == "Case Summary"
        assert len(template.sections) > 0
        assert template.format_func is not None

class TestGetTemplate:
    """Test getting individual templates."""

    def test_get_existing_template(self, template_engine):
        """Test retrieving an existing template."""
        template = template_engine.get_template("case-summary")

        assert template is not None
        assert isinstance(template, Template)
        assert template.name == "Case Summary"
        assert "case" in template.sections

    def test_get_nonexistent_template(self, template_engine):
        """Test retrieving a non-existent template returns None."""
        template = template_engine.get_template("non-existent")

        assert template is None

    def test_get_all_templates(self, template_engine):
        """Test getting all templates."""
        templates = template_engine.get_all_templates()

        assert len(templates) == 4
        assert all(isinstance(t, Template) for t in templates)

        template_names = [t.name for t in templates]
        assert "Case Summary" in template_names
        assert "Evidence List" in template_names
        assert "Timeline Report" in template_names
        assert "Case Notes" in template_names

class TestApplyTemplate:
    """Test template application with data formatting."""

    @pytest.mark.asyncio
    async def test_apply_case_summary_template(
        self,
        template_engine,
        sample_case_export_data,
        audit_logger
    ):
        """Test applying case summary template."""
        result = await template_engine.apply_template(
            "case-summary",
            sample_case_export_data
        )

        assert result is not None
        assert result["document_type"] == "case_summary"
        assert result["template_name"] == "Case Summary"
        assert "sections" in result
        assert "case_overview" in result["sections"]
        assert "evidence" in result["sections"]
        assert "timeline" in result["sections"]
        assert "notes" in result["sections"]
        assert "facts" in result["sections"]

        # Verify audit logging
        audit_logger.log.assert_called_once()
        call_args = audit_logger.log.call_args[0][0]
        assert call_args["event_type"] == "template_engine.apply"
        assert call_args["success"] is True

    @pytest.mark.asyncio
    async def test_apply_evidence_list_template(
        self,
        template_engine,
        sample_evidence_export_data
    ):
        """Test applying evidence list template."""
        result = await template_engine.apply_template(
            "evidence-list",
            sample_evidence_export_data
        )

        assert result["document_type"] == "evidence_list"
        assert result["template_name"] == "Evidence List"
        assert result["total_items"] == 2
        assert "evidence" in result
        assert len(result["evidence"]["items"]) == 2

    @pytest.mark.asyncio
    async def test_apply_timeline_report_template(
        self,
        template_engine,
        sample_timeline_export_data
    ):
        """Test applying timeline report template."""
        result = await template_engine.apply_template(
            "timeline-report",
            sample_timeline_export_data
        )

        assert result["document_type"] == "timeline_report"
        assert result["template_name"] == "Timeline Report"
        assert "timeline" in result
        assert "statistics" in result
        assert result["statistics"]["total_events"] >= 0
        assert result["statistics"]["total_deadlines"] >= 0

    @pytest.mark.asyncio
    async def test_apply_case_notes_template(
        self,
        template_engine,
        sample_notes_export_data
    ):
        """Test applying case notes template."""
        result = await template_engine.apply_template(
            "case-notes",
            sample_notes_export_data
        )

        assert result["document_type"] == "case_notes"
        assert result["template_name"] == "Case Notes"
        assert result["total_notes"] == 2
        assert len(result["notes"]["items"]) == 2

    @pytest.mark.asyncio
    async def test_apply_nonexistent_template(
        self,
        template_engine,
        sample_case_export_data,
        audit_logger
    ):
        """Test applying a non-existent template raises 404."""
        with pytest.raises(HTTPException) as exc_info:
            await template_engine.apply_template(
                "non-existent",
                sample_case_export_data
            )

        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.detail).lower()

        # Verify audit logging for failure
        audit_logger.log.assert_called_once()
        call_args = audit_logger.log.call_args[0][0]
        assert call_args["success"] is False

class TestFormatCaseSummary:
    """Test case summary formatting."""

    def test_format_case_overview_section(
        self,
        template_engine,
        sample_case_export_data
    ):
        """Test that case overview section is formatted correctly."""
        result = template_engine.format_case_summary(sample_case_export_data)

        overview = result["sections"]["case_overview"]
        assert overview["case_id"] == 1
        assert overview["title"] == "Test Case v. Defendant"
        assert overview["case_type"] == "civil"
        assert overview["status"] == "active"

    def test_format_evidence_section(
        self,
        template_engine,
        sample_case_export_data
    ):
        """Test that evidence section is formatted correctly."""
        result = template_engine.format_case_summary(sample_case_export_data)

        evidence = result["sections"]["evidence"]
        assert evidence["total_items"] == 2
        assert len(evidence["items"]) == 2
        assert "by_category" in evidence
        assert "contracts" in evidence["by_category"]

    def test_format_timeline_section(
        self,
        template_engine,
        sample_case_export_data
    ):
        """Test that timeline section is formatted correctly."""
        result = template_engine.format_case_summary(sample_case_export_data)

        timeline = result["sections"]["timeline"]
        assert timeline["total_events"] == 1
        assert timeline["total_deadlines"] == 1
        assert len(timeline["events"]) == 1
        assert len(timeline["deadlines"]) == 1

    def test_metadata_included(
        self,
        template_engine,
        sample_case_export_data
    ):
        """Test that export metadata is included."""
        result = template_engine.format_case_summary(sample_case_export_data)

        assert "metadata" in result
        assert result["metadata"]["exported_by"] == "user@example.com"

class TestHelperMethods:
    """Test helper formatting methods."""

    def test_group_evidence_by_category(self, template_engine):
        """Test evidence grouping by category."""
        evidence = [
            {"id": 1, "category": "contracts"},
            {"id": 2, "category": "contracts"},
            {"id": 3, "category": "communication"}
        ]

        grouped = template_engine._group_evidence_by_category(evidence)

        assert "contracts" in grouped
        assert "communication" in grouped
        assert len(grouped["contracts"]) == 2
        assert len(grouped["communication"]) == 1

    def test_filter_upcoming_deadlines(self, template_engine):
        """Test filtering for upcoming deadlines."""
        future_date = (datetime.now() + timedelta(days=30)).isoformat()
        past_date = (datetime.now() - timedelta(days=5)).isoformat()

        deadlines = [
            {
                "id": 1,
                "deadline_date": future_date,
                "completed": False
            },
            {
                "id": 2,
                "deadline_date": past_date,
                "completed": False
            },
            {
                "id": 3,
                "deadline_date": future_date,
                "completed": True
            }
        ]

        upcoming = template_engine._filter_upcoming_deadlines(deadlines)

        # Only future, non-completed deadlines
        assert len(upcoming) == 1
        assert upcoming[0]["id"] == 1

    def test_merge_timeline_and_deadlines(self, template_engine):
        """Test merging events and deadlines chronologically."""
        events = [
            {
                "id": 1,
                "title": "Event 1",
                "event_date": "2024-01-05",
                "description": "Test event"
            }
        ]

        deadlines = [
            {
                "id": 1,
                "title": "Deadline 1",
                "deadline_date": "2024-01-10",
                "description": "Test deadline"
            }
        ]

        merged = template_engine._merge_timeline_and_deadlines(events, deadlines)

        assert len(merged) == 2
        assert merged[0]["type"] in ["event", "deadline"]
        assert merged[1]["type"] in ["event", "deadline"]

        # Verify chronological order (most recent first)
        assert merged[0]["date"] >= merged[1]["date"]

class TestErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_missing_formatter_function(
        self,
        template_engine,
        sample_case_export_data
    ):
        """Test handling of missing formatter function."""
        # Add template with invalid formatter
        template_engine.templates["broken-template"] = Template(
            name="Broken Template",
            description="Template with missing formatter",
            sections=["test"],
            format_func="non_existent_formatter"
        )

        with pytest.raises(HTTPException) as exc_info:
            await template_engine.apply_template(
                "broken-template",
                sample_case_export_data
            )

        assert exc_info.value.status_code == 500

    def test_format_with_empty_data(self, template_engine):
        """Test formatting with empty data structures."""
        empty_data = {
            "case": {},
            "evidence": [],
            "timeline": [],
            "deadlines": [],
            "notes": [],
            "facts": [],
            "documents": [],
            "export_date": datetime.now(),
            "exported_by": "test@example.com"
        }

        result = template_engine.format_case_summary(empty_data)

        assert result is not None
        assert result["sections"]["evidence"]["total_items"] == 0
        assert result["sections"]["timeline"]["total_events"] == 0

    def test_format_with_missing_optional_fields(self, template_engine):
        """Test formatting with missing optional fields."""
        minimal_data = {
            "case": {"id": 1, "title": "Minimal Case"},
            "evidence": [{"id": 1, "title": "Evidence 1"}],
            "export_date": datetime.now(),
            "exported_by": "test@example.com"
        }

        result = template_engine.format_case_summary(minimal_data)

        assert result is not None
        assert result["sections"]["case_overview"]["case_id"] == 1

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

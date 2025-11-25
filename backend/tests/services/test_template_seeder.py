"""
Comprehensive test suite for TemplateSeeder service.

Tests cover:
- Template seeding operations
- Idempotency (multiple runs don't create duplicates)
- Validation before insertion
- Error handling and rollback
- Audit logging
- All 8 built-in templates
- Edge cases and boundary conditions

Run with: pytest backend/services/test_template_seeder.py -v
Coverage: pytest backend/services/test_template_seeder.py --cov=backend.services.template_seeder --cov-report=term-missing
"""

import pytest
import json
from unittest.mock import Mock
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from backend.services.template_seeder import (
    TemplateSeeder,
    TemplateSeederError,
    TemplateValidationError
)
from backend.services.template_service import CreateTemplateInput, TemplateFields
from backend.models.template import CaseTemplate, TemplateCategory
from backend.models.case import CaseType, CaseStatus

@pytest.fixture
def mock_db():
    """Mock SQLAlchemy database session."""
    db = Mock(spec=Session)
    db.query = Mock()
    db.add = Mock()
    db.commit = Mock()
    db.rollback = Mock()
    return db

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def template_seeder(mock_db, mock_audit_logger):
    """Create TemplateSeeder instance with mocked dependencies."""
    return TemplateSeeder(mock_db, mock_audit_logger)

class TestTemplateSeederInitialization:
    """Test TemplateSeeder initialization."""

    def test_initialization_with_dependencies(self, mock_db, mock_audit_logger):
        """Test seeder initializes with required dependencies."""
        seeder = TemplateSeeder(mock_db, mock_audit_logger)
        assert seeder.db == mock_db
        assert seeder.audit_logger == mock_audit_logger

    def test_initialization_without_audit_logger(self, mock_db):
        """Test seeder initializes without audit logger (optional)."""
        seeder = TemplateSeeder(mock_db, audit_logger=None)
        assert seeder.db == mock_db
        assert seeder.audit_logger is None

class TestTemplateValidation:
    """Test template validation logic."""

    def test_validate_valid_template(self, template_seeder):
        """Test validation passes for valid template."""
        template = CreateTemplateInput(
            name="Test Template",
            description="Test description",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="[Client] vs [Defendant]",
                descriptionTemplate="Test case description",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            ),
            suggestedEvidenceTypes=["Evidence 1"],
            timelineMilestones=[],
            checklistItems=[]
        )

        # Should not raise exception
        template_seeder._validate_template(template)

    def test_validate_template_without_name(self, template_seeder):
        """Test validation fails when name is missing (Pydantic catches this)."""
        # Pydantic will catch empty string before it reaches our validation
        from pydantic import ValidationError as PydanticValidationError

        with pytest.raises(PydanticValidationError):
            template = CreateTemplateInput(
                name="",
                description="Test description",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Test",
                    descriptionTemplate="Test",
                    caseType=CaseType.CONSUMER,
                    defaultStatus=CaseStatus.ACTIVE
                )
            )

    def test_validate_template_name_too_long(self, template_seeder):
        """Test validation fails when name exceeds 255 characters (Pydantic catches this)."""
        from pydantic import ValidationError as PydanticValidationError

        with pytest.raises(PydanticValidationError):
            template = CreateTemplateInput(
                name="x" * 256,
                description="Test description",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Test",
                    descriptionTemplate="Test",
                    caseType=CaseType.CONSUMER,
                    defaultStatus=CaseStatus.ACTIVE
                )
            )

    def test_validate_template_description_too_long(self, template_seeder):
        """Test validation fails when description exceeds 1000 characters (Pydantic catches this)."""
        from pydantic import ValidationError as PydanticValidationError

        with pytest.raises(PydanticValidationError):
            template = CreateTemplateInput(
                name="Test Template",
                description="x" * 1001,
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Test",
                    descriptionTemplate="Test",
                    caseType=CaseType.CONSUMER,
                    defaultStatus=CaseStatus.ACTIVE
                )
            )

    def test_validate_template_without_category(self, template_seeder):
        """Test validation fails when category is missing."""
        # Pydantic would catch this at model creation, but test the validation method
        template = Mock(spec=CreateTemplateInput)
        template.name = "Test"
        template.description = "Test"
        template.category = None
        template.templateFields = TemplateFields(
            titleTemplate="Test",
            descriptionTemplate="Test",
            caseType=CaseType.CONSUMER,
            defaultStatus=CaseStatus.ACTIVE
        )

        with pytest.raises(TemplateValidationError, match="category is required"):
            template_seeder._validate_template(template)

    def test_validate_template_without_template_fields(self, template_seeder):
        """Test validation fails when templateFields is missing."""
        template = Mock(spec=CreateTemplateInput)
        template.name = "Test"
        template.description = "Test"
        template.category = TemplateCategory.CIVIL
        template.templateFields = None

        with pytest.raises(TemplateValidationError, match="Template fields are required"):
            template_seeder._validate_template(template)

    def test_validate_template_without_title_template(self, template_seeder):
        """Test validation fails when titleTemplate is missing."""
        template_fields = Mock(spec=TemplateFields)
        template_fields.titleTemplate = ""
        template_fields.descriptionTemplate = "Test"

        template = Mock(spec=CreateTemplateInput)
        template.name = "Test"
        template.description = None  # Add description attribute
        template.category = TemplateCategory.CIVIL
        template.templateFields = template_fields

        with pytest.raises(TemplateValidationError, match="title template is required"):
            template_seeder._validate_template(template)

    def test_validate_template_without_description_template(self, template_seeder):
        """Test validation fails when descriptionTemplate is missing."""
        template_fields = Mock(spec=TemplateFields)
        template_fields.titleTemplate = "Test"
        template_fields.descriptionTemplate = ""

        template = Mock(spec=CreateTemplateInput)
        template.name = "Test"
        template.description = None  # Add description attribute
        template.category = TemplateCategory.CIVIL
        template.templateFields = template_fields

        with pytest.raises(TemplateValidationError, match="description template is required"):
            template_seeder._validate_template(template)

class TestTemplateExistenceCheck:
    """Test checking if template already exists."""

    def test_template_exists_returns_true(self, template_seeder, mock_db):
        """Test _template_exists returns True when template found."""
        mock_query = Mock()
        mock_filter = Mock()
        mock_template = Mock(spec=CaseTemplate)

        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = mock_template

        result = template_seeder._template_exists("Civil Litigation - Contract Dispute")

        assert result is True
        mock_db.query.assert_called_once_with(CaseTemplate)

    def test_template_exists_returns_false(self, template_seeder, mock_db):
        """Test _template_exists returns False when template not found."""
        mock_query = Mock()
        mock_filter = Mock()

        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        result = template_seeder._template_exists("Nonexistent Template")

        assert result is False

class TestTemplateCreation:
    """Test template creation logic."""

    def test_create_template_success(self, template_seeder, mock_db):
        """Test successful template creation."""
        template_input = CreateTemplateInput(
            name="Test Template",
            description="Test description",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="[Client] vs [Defendant]",
                descriptionTemplate="Test description",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            ),
            suggestedEvidenceTypes=["Evidence 1"],
            timelineMilestones=[],
            checklistItems=[]
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        template_seeder._create_template(template_input)

        # Verify template was added
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_template_skips_if_exists(self, template_seeder, mock_db):
        """Test template creation skips if template already exists."""
        template_input = CreateTemplateInput(
            name="Existing Template",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Mock template exists
        mock_query = Mock()
        mock_filter = Mock()
        mock_template = Mock(spec=CaseTemplate)
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = mock_template

        template_seeder._create_template(template_input)

        # Verify no template was added
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()

    def test_create_template_validation_error(self, template_seeder, mock_db):
        """Test template creation fails on validation error."""
        template_input = CreateTemplateInput(
            name="",  # Invalid: empty name
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        with pytest.raises(TemplateSeederError, match="Failed to validate template"):
            template_seeder._create_template(template_input)

        # Verify rollback on error
        mock_db.rollback.assert_called_once()

    def test_create_template_database_error(self, template_seeder, mock_db):
        """Test template creation handles database errors."""
        template_input = CreateTemplateInput(
            name="Test Template",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        # Mock database error on commit
        mock_db.commit.side_effect = SQLAlchemyError("Database error")

        with pytest.raises(TemplateSeederError, match="Failed to create template"):
            template_seeder._create_template(template_input)

        # Verify rollback on error
        mock_db.rollback.assert_called_once()

    def test_create_template_sets_system_template_flag(self, template_seeder, mock_db):
        """Test created template is marked as system template."""
        template_input = CreateTemplateInput(
            name="Test Template",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        template_seeder._create_template(template_input)

        # Verify template was added with correct flags
        call_args = mock_db.add.call_args[0][0]
        assert call_args.is_system_template == 1
        assert call_args.user_id is None

class TestSeedAll:
    """Test seed_all operation."""

    def test_seed_all_success_all_new(self, template_seeder, mock_db):
        """Test seed_all creates all templates when none exist."""
        # Mock all templates don't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        result = template_seeder.seed_all()

        assert result["total_templates"] == 8
        assert result["seeded"] == 8
        assert result["skipped"] == 0
        assert result["failed"] == 0
        assert len(result["template_names"]) == 8

    def test_seed_all_skips_existing_templates(self, template_seeder, mock_db):
        """Test seed_all skips templates that already exist."""
        # Mock first 4 templates exist, last 4 don't
        call_count = 0

        def mock_first_call():
            nonlocal call_count
            call_count += 1
            if call_count <= 4:
                return Mock(spec=CaseTemplate)  # Exists
            return None  # Doesn't exist

        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.side_effect = mock_first_call

        result = template_seeder.seed_all()

        assert result["total_templates"] == 8
        assert result["seeded"] == 4
        assert result["skipped"] == 4
        assert result["failed"] == 0

    def test_seed_all_idempotency(self, template_seeder, mock_db):
        """Test seed_all is idempotent (running twice doesn't create duplicates)."""
        # Mock all templates exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_template = Mock(spec=CaseTemplate)
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = mock_template

        result = template_seeder.seed_all()

        assert result["total_templates"] == 8
        assert result["seeded"] == 0
        assert result["skipped"] == 8
        assert result["failed"] == 0

        # Verify no templates were added
        mock_db.add.assert_not_called()

    def test_seed_all_continues_on_error(self, template_seeder, mock_db):
        """Test seed_all continues seeding even if some templates fail."""
        # Mock templates don't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        # Mock commit fails for some templates
        call_count = 0

        def mock_commit_call():
            nonlocal call_count
            call_count += 1
            if call_count in [2, 5]:  # Fail on 2nd and 5th commit
                raise SQLAlchemyError("Database error")

        mock_db.commit.side_effect = mock_commit_call

        result = template_seeder.seed_all()

        assert result["total_templates"] == 8
        assert result["failed"] == 2
        assert result["seeded"] + result["skipped"] == 6

class TestBuiltInTemplates:
    """Test all 8 built-in templates are valid."""

    def test_civil_litigation_template(self, template_seeder):
        """Test civil litigation template is valid."""
        template = template_seeder._civil_litigation_template()
        assert template.name == "Civil Litigation - Contract Dispute"
        assert template.category == TemplateCategory.CIVIL
        assert template.templateFields.caseType == CaseType.CONSUMER
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_personal_injury_template(self, template_seeder):
        """Test personal injury template is valid."""
        template = template_seeder._personal_injury_template()
        assert template.name == "Personal Injury Claim"
        assert template.category == TemplateCategory.CIVIL
        assert template.templateFields.caseType == CaseType.OTHER
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_employment_tribunal_template(self, template_seeder):
        """Test employment tribunal template is valid."""
        template = template_seeder._employment_tribunal_template()
        assert template.name == "Employment Tribunal Claim"
        assert template.category == TemplateCategory.EMPLOYMENT
        assert template.templateFields.caseType == CaseType.EMPLOYMENT
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_housing_possession_defense_template(self, template_seeder):
        """Test housing possession defense template is valid."""
        template = template_seeder._housing_possession_defense_template()
        assert template.name == "Housing Possession Defense"
        assert template.category == TemplateCategory.HOUSING
        assert template.templateFields.caseType == CaseType.HOUSING
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_family_court_divorce_template(self, template_seeder):
        """Test family court divorce template is valid."""
        template = template_seeder._family_court_divorce_template()
        assert template.name == "Family Court - Divorce Petition"
        assert template.category == TemplateCategory.FAMILY
        assert template.templateFields.caseType == CaseType.FAMILY
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_immigration_appeal_template(self, template_seeder):
        """Test immigration appeal template is valid."""
        template = template_seeder._immigration_appeal_template()
        assert template.name == "Immigration Appeal (First-tier Tribunal)"
        assert template.category == TemplateCategory.IMMIGRATION
        assert template.templateFields.caseType == CaseType.OTHER
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_landlord_tenant_dispute_template(self, template_seeder):
        """Test landlord-tenant dispute template is valid."""
        template = template_seeder._landlord_tenant_dispute_template()
        assert template.name == "Landlord-Tenant Dispute"
        assert template.category == TemplateCategory.HOUSING
        assert template.templateFields.caseType == CaseType.HOUSING
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_debt_recovery_template(self, template_seeder):
        """Test debt recovery template is valid."""
        template = template_seeder._debt_recovery_template()
        assert template.name == "Debt Recovery Action"
        assert template.category == TemplateCategory.CIVIL
        assert template.templateFields.caseType == CaseType.DEBT
        assert len(template.timelineMilestones) == 4
        assert len(template.checklistItems) == 4

    def test_all_templates_have_unique_names(self, template_seeder):
        """Test all templates have unique names."""
        templates = template_seeder._get_built_in_templates()
        names = [t.name for t in templates]
        assert len(names) == len(set(names)), "Template names must be unique"

    def test_all_templates_have_evidence_types(self, template_seeder):
        """Test all templates have suggested evidence types."""
        templates = template_seeder._get_built_in_templates()
        for template in templates:
            assert len(template.suggestedEvidenceTypes) > 0, f"Template {template.name} missing evidence types"

    def test_all_templates_have_milestones(self, template_seeder):
        """Test all templates have timeline milestones."""
        templates = template_seeder._get_built_in_templates()
        for template in templates:
            assert len(template.timelineMilestones) > 0, f"Template {template.name} missing milestones"

    def test_all_templates_have_checklist_items(self, template_seeder):
        """Test all templates have checklist items."""
        templates = template_seeder._get_built_in_templates()
        for template in templates:
            assert len(template.checklistItems) > 0, f"Template {template.name} missing checklist items"

class TestAuditLogging:
    """Test audit logging functionality."""

    def test_audit_log_on_successful_creation(self, template_seeder, mock_db, mock_audit_logger):
        """Test audit log is created on successful template creation."""
        template_input = CreateTemplateInput(
            name="Test Template",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        template_seeder._create_template(template_input)

        # Verify audit log was called
        assert mock_audit_logger.log.called
        call_args = mock_audit_logger.log.call_args[0][0]
        assert call_args["event_type"] == "template.seed"
        assert call_args["action"] == "create"
        assert call_args["success"] is True

    def test_audit_log_on_validation_error(self, template_seeder, mock_db, mock_audit_logger):
        """Test audit log is created on validation error."""
        template_input = CreateTemplateInput(
            name="",  # Invalid
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        try:
            template_seeder._create_template(template_input)
        except TemplateSeederError:
            pass

        # Verify audit log was called with failure
        assert mock_audit_logger.log.called
        call_args = mock_audit_logger.log.call_args[0][0]
        assert call_args["success"] is False
        assert "error_message" in call_args

    def test_audit_log_on_seed_all(self, template_seeder, mock_db, mock_audit_logger):
        """Test audit log is created on seed_all operation."""
        # Mock all templates don't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        template_seeder.seed_all()

        # Verify audit log was called for seed_all
        calls = [call[0][0] for call in mock_audit_logger.log.call_args_list]
        seed_all_calls = [c for c in calls if c["event_type"] == "template.seed_all"]
        assert len(seed_all_calls) > 0

    def test_no_audit_log_when_logger_not_provided(self, mock_db):
        """Test no error occurs when audit logger is not provided."""
        seeder = TemplateSeeder(mock_db, audit_logger=None)

        template_input = CreateTemplateInput(
            name="Test Template",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        # Should not raise error even without audit logger
        seeder._create_template(template_input)

class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_template_with_minimal_fields(self, template_seeder, mock_db):
        """Test template creation with only required fields."""
        template_input = CreateTemplateInput(
            name="Minimal Template",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
            # Optional fields omitted
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        template_seeder._create_template(template_input)

        # Verify template was created with empty arrays for optional fields
        call_args = mock_db.add.call_args[0][0]
        assert json.loads(call_args.suggested_evidence_types_json) == []
        assert json.loads(call_args.timeline_milestones_json) == []
        assert json.loads(call_args.checklist_items_json) == []

    def test_template_with_unicode_characters(self, template_seeder, mock_db):
        """Test template creation with Unicode characters."""
        template_input = CreateTemplateInput(
            name="Test Template £€¥",
            description="Description with émojis 🎉",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test [Clïent] vs [Defèndant]",
                descriptionTemplate="Descripción con caracteres especiales",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        # Should handle Unicode without error
        template_seeder._create_template(template_input)
        mock_db.commit.assert_called_once()

    def test_template_with_exact_boundary_lengths(self, template_seeder):
        """Test templates with exact boundary lengths (255 chars, 1000 chars)."""
        template = CreateTemplateInput(
            name="x" * 255,  # Exactly 255 characters
            description="x" * 1000,  # Exactly 1000 characters
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="Test",
                descriptionTemplate="Test",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE
            )
        )

        # Should not raise exception
        template_seeder._validate_template(template)

class TestJSONSerialization:
    """Test JSON serialization of template fields."""

    def test_json_serialization_of_complex_fields(self, template_seeder, mock_db):
        """Test complex fields are properly serialized to JSON."""
        template_input = template_seeder._civil_litigation_template()

        # Mock template doesn't exist
        mock_query = Mock()
        mock_filter = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None

        template_seeder._create_template(template_input)

        # Verify JSON fields were serialized
        call_args = mock_db.add.call_args[0][0]

        # Should be valid JSON
        template_fields = json.loads(call_args.template_fields_json)
        assert "titleTemplate" in template_fields

        evidence_types = json.loads(call_args.suggested_evidence_types_json)
        assert isinstance(evidence_types, list)

        milestones = json.loads(call_args.timeline_milestones_json)
        assert isinstance(milestones, list)
        assert len(milestones) > 0

        checklist = json.loads(call_args.checklist_items_json)
        assert isinstance(checklist, list)
        assert len(checklist) > 0

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=backend.services.template_seeder", "--cov-report=term-missing"])

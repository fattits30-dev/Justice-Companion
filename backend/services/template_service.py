"""
Template service for case template management.
Migrated from src/services/TemplateService.ts

Features:
- Template CRUD operations with user ownership verification
- Variable substitution in templates: [VariableName] → value
- System vs user templates (system templates have NULL user_id)
- Template application to create cases with milestones
- JSON field handling for template data structures
- Comprehensive audit logging for all operations

Security:
- User isolation (users can only manage their own templates)
- System templates are read-only (cannot be deleted/updated by users)
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent templates
- All security events audited

Template Structure:
- templateFields: {titleTemplate, descriptionTemplate, caseType, defaultStatus}
- suggestedEvidenceTypes: List of evidence type strings
- timelineMilestones: List of milestone objects with daysFromStart
- checklistItems: List of task objects with category and priority
"""

from typing import Optional, List, Dict, Any
import json
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict

from backend.models.template import CaseTemplate, TemplateUsage, TemplateCategory
from backend.models.case import Case, CaseType, CaseStatus
from backend.models.deadline import Deadline, DeadlinePriority


class TemplateNotFoundError(Exception):
    """Exception raised when template is not found."""


class UnauthorizedError(Exception):
    """Exception raised when user doesn't own the template."""


class DatabaseError(Exception):
    """Exception raised for database operation failures."""


class ValidationError(Exception):
    """Exception raised for invalid input data."""


# Pydantic models for input/output
class TemplateFields(BaseModel):
    """Template fields for pre-filling case creation form."""

    titleTemplate: str = Field(..., description="Title template with [Variables]")
    descriptionTemplate: str = Field(..., description="Description template")
    caseType: CaseType = Field(..., description="Default case type")
    defaultStatus: CaseStatus = Field(default=CaseStatus.ACTIVE, description="Default case status")
    customFields: Optional[Dict[str, str]] = Field(
        default=None, description="Custom field mappings"
    )

    model_config = ConfigDict(use_enum_values=True)


class TimelineMilestone(BaseModel):
    """Timeline milestone template."""

    title: str = Field(..., description="Milestone title")
    description: str = Field(..., description="Milestone description")
    daysFromStart: int = Field(..., ge=0, description="Days after case creation")
    isRequired: bool = Field(default=False, description="Whether milestone is mandatory")
    category: str = Field(
        default="other", description="Milestone category: filing, hearing, deadline, meeting, other"
    )

    model_config = ConfigDict(use_enum_values=True)


class ChecklistItem(BaseModel):
    """Checklist item template."""

    title: str = Field(..., description="Task title")
    description: str = Field(..., description="Task description")
    category: str = Field(
        default="other",
        description="Task category: evidence, filing, communication, research, other",
    )
    priority: str = Field(default="medium", description="Task priority: low, medium, high")
    daysFromStart: Optional[int] = Field(default=None, description="Suggested completion timeline")

    model_config = ConfigDict(use_enum_values=True)


class CreateTemplateInput(BaseModel):
    """Input model for creating a new template."""

    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    category: TemplateCategory = Field(..., description="Template category")
    templateFields: TemplateFields = Field(..., description="Template field definitions")
    suggestedEvidenceTypes: Optional[List[str]] = Field(
        default=None, description="Evidence type suggestions"
    )
    timelineMilestones: Optional[List[TimelineMilestone]] = Field(
        default=None, description="Timeline milestones"
    )
    checklistItems: Optional[List[ChecklistItem]] = Field(
        default=None, description="Checklist items"
    )

    model_config = ConfigDict(use_enum_values=True)


class UpdateTemplateInput(BaseModel):
    """Input model for updating an existing template."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    category: Optional[TemplateCategory] = Field(None, description="Template category")
    templateFields: Optional[TemplateFields] = Field(None, description="Template field definitions")
    suggestedEvidenceTypes: Optional[List[str]] = Field(
        None, description="Evidence type suggestions"
    )
    timelineMilestones: Optional[List[TimelineMilestone]] = Field(
        None, description="Timeline milestones"
    )
    checklistItems: Optional[List[ChecklistItem]] = Field(None, description="Checklist items")

    model_config = ConfigDict(use_enum_values=True)


class CreateCaseFromTemplateInput(BaseModel):
    """Input for creating a case from template with variable substitution."""

    title: Optional[str] = Field(None, description="Override template title")
    description: Optional[str] = Field(None, description="Override template description")
    caseType: Optional[CaseType] = Field(None, description="Override case type")
    variables: Dict[str, str] = Field(
        default_factory=dict, description="Variable substitutions: {VariableName: value}"
    )

    model_config = ConfigDict(use_enum_values=True)


class TemplateResponse(BaseModel):
    """Response model for template data."""

    id: int
    name: str
    description: Optional[str]
    category: str
    isSystemTemplate: bool
    userId: Optional[int]
    templateFields: Dict[str, Any]
    suggestedEvidenceTypes: List[str]
    timelineMilestones: List[Dict[str, Any]]
    checklistItems: List[Dict[str, Any]]
    createdAt: str
    updatedAt: str

    model_config = ConfigDict(from_attributes=True)


class AppliedMilestone(BaseModel):
    """Applied milestone result."""

    id: int
    title: str
    dueDate: str


class TemplateApplicationResult(BaseModel):
    """Result of applying template to create case."""

    case: Dict[str, Any]
    appliedMilestones: List[AppliedMilestone]
    appliedChecklistItems: List[Dict[str, Any]]
    templateId: int
    templateName: str


class TemplateService:
    """
    Business logic layer for template management.
    Handles CRUD operations, variable substitution, and template application.

    All operations verify user ownership to prevent unauthorized access.
    System templates (user_id = NULL) are read-only for all users.
    """

    def __init__(self, db: Session, audit_logger=None):
        """
        Initialize template service.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.audit_logger = audit_logger

    def _verify_ownership(self, template: CaseTemplate, user_id: int) -> None:
        """
        Verify that user owns the template or has access to system template.

        Args:
            template: Template instance to verify
            user_id: User ID making the request

        Raises:
            HTTPException: 403 if user doesn't own the template
        """
        # System templates (user_id = NULL) are accessible to all users
        if template.user_id is None:
            return

        # User templates must be owned by the requesting user
        if template.user_id != user_id:
            self._log_audit(
                event_type="template.unauthorized_access",
                user_id=user_id,
                resource_id=str(template.id),
                action="access_denied",
                success=False,
                details={
                    "reason": "User does not own this template",
                    "template_owner": template.user_id,
                    "requesting_user": user_id,
                },
            )
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have permission to access this template",
            )

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                {
                    "event_type": event_type,
                    "user_id": str(user_id) if user_id else None,
                    "resource_type": "template",
                    "resource_id": resource_id,
                    "action": action,
                    "success": success,
                    "details": details or {},
                    "error_message": error_message,
                }
            )

    def _validate_template_input(
        self, input_data: CreateTemplateInput | UpdateTemplateInput
    ) -> None:
        """
        Validate template input data.

        Args:
            input_data: Template creation/update data

        Raises:
            ValidationError: If validation fails
        """
        # Name validation (only for CreateTemplateInput or if updating name)
        if hasattr(input_data, "name") and input_data.name is not None:
            if not input_data.name or len(input_data.name.strip()) == 0:
                raise ValidationError("Template name is required")

        # Description length validation
        if hasattr(input_data, "description") and input_data.description:
            if len(input_data.description) > 1000:
                raise ValidationError("Template description must be less than 1000 characters")

    def _substitute_variables(self, text: str, variables: Dict[str, str]) -> str:
        """
        Substitute [VariableName] placeholders with actual values.

        Args:
            text: Text containing [VariableName] placeholders
            variables: Dictionary of {VariableName: value}

        Returns:
            Text with variables substituted

        Examples:
            _substitute_variables("[Client] vs [Defendant]", {"Client": "John", "Defendant": "Corp"})
            -> "John vs Corp"
        """

        def replace_var(match):
            var_name = match.group(1)
            return variables.get(var_name, match.group(0))  # Keep original if not found

        return re.sub(r"\[(\w+)\]", replace_var, text)

    async def get_all_templates(
        self, user_id: int, category: Optional[TemplateCategory] = None, include_system: bool = True
    ) -> List[TemplateResponse]:
        """
        Get all templates (system + user's custom).

        Args:
            user_id: ID of user requesting templates
            category: Optional filter by category
            include_system: Whether to include system templates (default: True)

        Returns:
            List of templates accessible to the user

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            query = self.db.query(CaseTemplate)

            # Filter: system templates OR user's templates
            if include_system:
                query = query.filter(
                    (CaseTemplate.user_id == user_id) | (CaseTemplate.user_id.is_(None))
                )
            else:
                query = query.filter(CaseTemplate.user_id == user_id)

            # Category filter
            if category:
                query = query.filter(CaseTemplate.category == category.value)

            templates = query.order_by(CaseTemplate.created_at.desc()).all()

            return [
                TemplateResponse(**template.to_dict(include_json=True)) for template in templates
            ]

        except Exception as error:
            self._log_audit(
                event_type="template.list",
                user_id=user_id,
                resource_id="all",
                action="read",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to retrieve templates: {str(error)}")

    async def get_template_by_id(self, template_id: int, user_id: int) -> TemplateResponse:
        """
        Get a specific template by ID.

        Args:
            template_id: Template ID
            user_id: ID of user requesting the template

        Returns:
            Template data

        Raises:
            TemplateNotFoundError: If template doesn't exist
            HTTPException: 403 if user doesn't have access
        """
        template = self.db.query(CaseTemplate).filter(CaseTemplate.id == template_id).first()

        if not template:
            self._log_audit(
                event_type="template.read",
                user_id=user_id,
                resource_id=str(template_id),
                action="read",
                success=False,
                details={"reason": "Template not found"},
            )
            raise TemplateNotFoundError(f"Template with ID {template_id} not found")

        # Verify ownership/access
        self._verify_ownership(template, user_id)

        return TemplateResponse(**template.to_dict(include_json=True))

    async def create_template(
        self, input_data: CreateTemplateInput, user_id: int
    ) -> TemplateResponse:
        """
        Create a new custom template.

        Args:
            input_data: Template creation data
            user_id: ID of user creating the template

        Returns:
            Created template data

        Raises:
            ValidationError: If input validation fails
            DatabaseError: If database operation fails
        """
        try:
            # Validate input
            self._validate_template_input(input_data)

            # Create template instance
            template = CaseTemplate(
                name=input_data.name,
                description=input_data.description,
                category=input_data.category.value,
                is_system_template=0,  # User templates are never system templates
                user_id=user_id,
                template_fields_json=json.dumps(input_data.templateFields.model_dump()),
                suggested_evidence_types_json=json.dumps(input_data.suggestedEvidenceTypes or []),
                timeline_milestones_json=json.dumps(
                    [m.model_dump() for m in (input_data.timelineMilestones or [])]
                ),
                checklist_items_json=json.dumps(
                    [c.model_dump() for c in (input_data.checklistItems or [])]
                ),
            )

            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)

            self._log_audit(
                event_type="template.create",
                user_id=user_id,
                resource_id=str(template.id),
                action="create",
                success=True,
                details={"name": template.name, "category": template.category},
            )

            return TemplateResponse(**template.to_dict(include_json=True))

        except ValidationError:
            raise
        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="template.create",
                user_id=user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to create template: {str(error)}")

    async def update_template(
        self, template_id: int, user_id: int, input_data: UpdateTemplateInput
    ) -> TemplateResponse:
        """
        Update an existing template.

        Args:
            template_id: Template ID to update
            user_id: ID of user updating the template
            input_data: Updated template data

        Returns:
            Updated template data

        Raises:
            TemplateNotFoundError: If template doesn't exist
            HTTPException: 403 if user doesn't own the template or it's a system template
            ValidationError: If input validation fails
            DatabaseError: If database operation fails
        """
        template = self.db.query(CaseTemplate).filter(CaseTemplate.id == template_id).first()

        if not template:
            raise TemplateNotFoundError(f"Template with ID {template_id} not found")

        # Verify ownership
        self._verify_ownership(template, user_id)

        # System templates cannot be updated
        if template.is_system_template:
            raise HTTPException(
                status_code=403, detail="Unauthorized: System templates cannot be modified"
            )

        try:
            # Validate input
            self._validate_template_input(input_data)

            fields_updated = []

            # Update fields if provided
            if input_data.name is not None:
                template.name = input_data.name
                fields_updated.append("name")

            if input_data.description is not None:
                template.description = input_data.description
                fields_updated.append("description")

            if input_data.category is not None:
                template.category = input_data.category.value
                fields_updated.append("category")

            if input_data.templateFields is not None:
                template.template_fields_json = json.dumps(input_data.templateFields.model_dump())
                fields_updated.append("templateFields")

            if input_data.suggestedEvidenceTypes is not None:
                template.suggested_evidence_types_json = json.dumps(
                    input_data.suggestedEvidenceTypes
                )
                fields_updated.append("suggestedEvidenceTypes")

            if input_data.timelineMilestones is not None:
                template.timeline_milestones_json = json.dumps(
                    [m.model_dump() for m in input_data.timelineMilestones]
                )
                fields_updated.append("timelineMilestones")

            if input_data.checklistItems is not None:
                template.checklist_items_json = json.dumps(
                    [c.model_dump() for c in input_data.checklistItems]
                )
                fields_updated.append("checklistItems")

            self.db.commit()
            self.db.refresh(template)

            self._log_audit(
                event_type="template.update",
                user_id=user_id,
                resource_id=str(template_id),
                action="update",
                success=True,
                details={"fields_updated": fields_updated},
            )

            return TemplateResponse(**template.to_dict(include_json=True))

        except (ValidationError, HTTPException):
            raise
        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="template.update",
                user_id=user_id,
                resource_id=str(template_id),
                action="update",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to update template: {str(error)}")

    async def delete_template(self, template_id: int, user_id: int) -> bool:
        """
        Delete a template.

        Args:
            template_id: Template ID to delete
            user_id: ID of user deleting the template

        Returns:
            True if deleted successfully

        Raises:
            TemplateNotFoundError: If template doesn't exist
            HTTPException: 403 if user doesn't own the template or it's a system template
            DatabaseError: If database operation fails
        """
        template = self.db.query(CaseTemplate).filter(CaseTemplate.id == template_id).first()

        if not template:
            raise TemplateNotFoundError(f"Template with ID {template_id} not found")

        # Verify ownership
        self._verify_ownership(template, user_id)

        # System templates cannot be deleted
        if template.is_system_template:
            raise HTTPException(
                status_code=403, detail="Unauthorized: System templates cannot be deleted"
            )

        try:
            self.db.delete(template)
            self.db.commit()

            self._log_audit(
                event_type="template.delete",
                user_id=user_id,
                resource_id=str(template_id),
                action="delete",
                success=True,
            )

            return True

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="template.delete",
                user_id=user_id,
                resource_id=str(template_id),
                action="delete",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to delete template: {str(error)}")

    async def apply_template(
        self, template_id: int, user_id: int, input_data: CreateCaseFromTemplateInput
    ) -> TemplateApplicationResult:
        """
        Apply template to create a new case with milestones.

        Performs variable substitution on template fields using [VariableName] syntax.

        Args:
            template_id: Template ID to apply
            user_id: ID of user creating the case
            input_data: Case creation input with variable substitutions

        Returns:
            Application result with created case and milestones

        Raises:
            TemplateNotFoundError: If template doesn't exist
            HTTPException: 403 if user doesn't have access
            DatabaseError: If database operation fails

        Example:
            input_data = CreateCaseFromTemplateInput(
                variables={"Client": "John Doe", "Defendant": "Acme Corp"}
            )
            # Template title: "[Client] vs [Defendant] - Contract Dispute"
            # Result title: "John Doe vs Acme Corp - Contract Dispute"
        """
        template = self.db.query(CaseTemplate).filter(CaseTemplate.id == template_id).first()

        if not template:
            raise TemplateNotFoundError(f"Template with ID {template_id} not found")

        # Verify ownership/access
        self._verify_ownership(template, user_id)

        try:
            # Parse template fields
            template_fields = json.loads(template.template_fields_json)
            timeline_milestones = json.loads(template.timeline_milestones_json or "[]")
            checklist_items = json.loads(template.checklist_items_json or "[]")

            # Apply variable substitution
            title = self._substitute_variables(
                input_data.title or template_fields.get("titleTemplate", ""), input_data.variables
            )
            description = self._substitute_variables(
                input_data.description or template_fields.get("descriptionTemplate", ""),
                input_data.variables,
            )

            # Create case
            case = Case(
                title=title,
                description=description,
                case_type=input_data.caseType or template_fields.get("caseType", CaseType.OTHER),
                status=template_fields.get("defaultStatus", CaseStatus.ACTIVE),
                user_id=user_id,
            )

            self.db.add(case)
            self.db.flush()  # Get case ID without committing

            # Create milestones/deadlines
            applied_milestones = []
            for milestone in timeline_milestones:
                due_date = datetime.now() + timedelta(days=milestone.get("daysFromStart", 0))

                deadline = Deadline(
                    case_id=case.id,
                    user_id=user_id,
                    title=self._substitute_variables(
                        milestone.get("title", ""), input_data.variables
                    ),
                    description=self._substitute_variables(
                        milestone.get("description", ""), input_data.variables
                    ),
                    deadline_date=due_date.isoformat(),
                    priority=DeadlinePriority.MEDIUM,
                )

                self.db.add(deadline)
                self.db.flush()

                applied_milestones.append(
                    AppliedMilestone(
                        id=deadline.id, title=deadline.title, dueDate=deadline.deadline_date
                    )
                )

            # Track template usage
            usage = TemplateUsage(template_id=template_id, user_id=user_id, case_id=case.id)
            self.db.add(usage)

            self.db.commit()

            self._log_audit(
                event_type="template.apply",
                user_id=user_id,
                resource_id=str(template_id),
                action="apply",
                success=True,
                details={
                    "case_id": case.id,
                    "template_name": template.name,
                    "milestones_created": len(applied_milestones),
                },
            )

            return TemplateApplicationResult(
                case={
                    "id": case.id,
                    "title": case.title,
                    "description": case.description,
                    "caseType": (
                        case.case_type.value
                        if isinstance(case.case_type, CaseType)
                        else case.case_type
                    ),
                    "status": (
                        case.status.value if isinstance(case.status, CaseStatus) else case.status
                    ),
                },
                appliedMilestones=applied_milestones,
                appliedChecklistItems=checklist_items,
                templateId=template.id,
                templateName=template.name,
            )

        except (TemplateNotFoundError, HTTPException):
            raise
        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="template.apply",
                user_id=user_id,
                resource_id=str(template_id),
                action="apply",
                success=False,
                error_message=str(error),
            )
            raise DatabaseError(f"Failed to apply template: {str(error)}")

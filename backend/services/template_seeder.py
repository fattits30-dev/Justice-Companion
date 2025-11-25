"""
Template Seeder Service
Seeds database with built-in system templates for common UK legal cases.

Migrated from: src/services/TemplateSeeder.ts

Features:
- Idempotent seeding (safe to run multiple times)
- 8 built-in UK legal templates (civil, employment, housing, family, immigration)
- System templates (user_id = NULL) accessible to all users
- Comprehensive validation before insertion
- Audit logging for all seeding operations
- Support for JSON fields (templateFields, suggestedEvidenceTypes, etc.)

Templates Included:
1. Civil Litigation - Contract Dispute
2. Personal Injury Claim
3. Employment Tribunal Claim
4. Housing Possession Defense
5. Family Court - Divorce Petition
6. Immigration Appeal (First-tier Tribunal)
7. Landlord-Tenant Dispute
8. Debt Recovery Action

Security:
- System templates cannot be modified/deleted by users
- All seeding operations audited
- No user-specific data in system templates

Usage:
    from backend.services.template_seeder import TemplateSeeder
    from backend.database import get_db

    db = next(get_db())
    seeder = TemplateSeeder(db, audit_logger)
    seeder.seed_all()
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import json
import logging

from backend.models.template import CaseTemplate, TemplateCategory
from backend.services.template_service import (
    CreateTemplateInput,
    TemplateFields,
    TimelineMilestone,
    ChecklistItem,
)
from backend.models.case import CaseType, CaseStatus

# Configure logger
logger = logging.getLogger(__name__)

class TemplateSeederError(Exception):
    """Base exception for template seeder errors."""

class TemplateValidationError(Exception):
    """Exception raised when template validation fails."""

class TemplateSeeder:
    """
    Seeds database with built-in system templates for common UK legal cases.

    All templates are marked as system templates (is_system_template=True, user_id=NULL)
    and are accessible to all users. Seeding is idempotent - running multiple times
    will not create duplicates.

    Attributes:
        db: SQLAlchemy database session
        audit_logger: Optional audit logger for tracking seeding operations
    """

    def __init__(self, db: Session, audit_logger=None):
        """
        Initialize template seeder.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance for tracking operations
        """
        self.db = db
        self.audit_logger = audit_logger

    def _log_audit(
        self,
        event_type: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log audit event if audit logger is configured.

        Args:
            event_type: Type of event (e.g., "template.seed")
            action: Action performed (e.g., "create", "skip")
            success: Whether operation succeeded
            details: Optional additional details
            error_message: Optional error message if operation failed
        """
        if self.audit_logger:
            self.audit_logger.log(
                {
                    "event_type": event_type,
                    "user_id": None,  # System operation
                    "resource_type": "template",
                    "resource_id": "system",
                    "action": action,
                    "success": success,
                    "details": details or {},
                    "error_message": error_message,
                }
            )

    def _validate_template(self, template: CreateTemplateInput) -> None:
        """
        Validate template data before insertion.

        Args:
            template: Template data to validate

        Raises:
            TemplateValidationError: If validation fails
        """
        # Name validation
        if not template.name or len(template.name.strip()) == 0:
            raise TemplateValidationError("Template name is required")

        if len(template.name) > 255:
            raise TemplateValidationError("Template name must be less than 255 characters")

        # Description validation
        if template.description and len(template.description) > 1000:
            raise TemplateValidationError("Template description must be less than 1000 characters")

        # Category validation
        if not template.category:
            raise TemplateValidationError("Template category is required")

        # Template fields validation
        if not template.templateFields:
            raise TemplateValidationError("Template fields are required")

        if not template.templateFields.titleTemplate:
            raise TemplateValidationError("Template title template is required")

        if not template.templateFields.descriptionTemplate:
            raise TemplateValidationError("Template description template is required")

    def _template_exists(self, name: str) -> bool:
        """
        Check if a system template with the given name already exists.

        Args:
            name: Template name to check

        Returns:
            True if template exists, False otherwise
        """
        existing = (
            self.db.query(CaseTemplate)
            .filter(CaseTemplate.name == name, CaseTemplate.is_system_template == 1)
            .first()
        )
        return existing is not None

    def _create_template(self, template_input: CreateTemplateInput) -> None:
        """
        Create a system template in the database.

        Args:
            template_input: Template data to create

        Raises:
            TemplateSeederError: If creation fails
        """
        try:
            # Validate before creation
            self._validate_template(template_input)

            # Check if already exists
            if self._template_exists(template_input.name):
                logger.debug(f"⊘ Template already exists: {template_input.name}")
                self._log_audit(
                    event_type="template.seed",
                    action="skip",
                    success=True,
                    details={"name": template_input.name, "reason": "already_exists"},
                )
                return

            # Create template instance
            # Handle both enum and string values for category
            category_value = (
                template_input.category.value
                if hasattr(template_input.category, "value")
                else template_input.category
            )

            template = CaseTemplate(
                name=template_input.name,
                description=template_input.description,
                category=category_value,
                is_system_template=1,  # Mark as system template
                user_id=None,  # System templates have no owner
                template_fields_json=json.dumps(template_input.templateFields.model_dump()),
                suggested_evidence_types_json=json.dumps(
                    template_input.suggestedEvidenceTypes or []
                ),
                timeline_milestones_json=json.dumps(
                    [m.model_dump() for m in (template_input.timelineMilestones or [])]
                ),
                checklist_items_json=json.dumps(
                    [c.model_dump() for c in (template_input.checklistItems or [])]
                ),
            )

            self.db.add(template)
            self.db.commit()

            logger.info(f"✓ Seeded template: {template_input.name}")
            self._log_audit(
                event_type="template.seed",
                action="create",
                success=True,
                details={
                    "name": template.name,
                    "category": template.category,
                    "template_id": template.id,
                },
            )

        except TemplateValidationError as e:
            self.db.rollback()
            logger.error(f"✗ Validation failed for template '{template_input.name}': {str(e)}")
            self._log_audit(
                event_type="template.seed",
                action="create",
                success=False,
                details={"name": template_input.name},
                error_message=f"Validation error: {str(e)}",
            )
            raise TemplateSeederError(f"Failed to validate template: {str(e)}")

        except Exception as exc:
            self.db.rollback()
            logger.error(f"✗ Failed to seed template '{template_input.name}': {str(e)}")
            self._log_audit(
                event_type="template.seed",
                action="create",
                success=False,
                details={"name": template_input.name},
                error_message=str(e),
            )
            raise TemplateSeederError(f"Failed to create template: {str(e)}")

    def seed_all(self) -> Dict[str, Any]:
        """
        Seed all built-in system templates.

        This operation is idempotent - running multiple times will not create
        duplicates. Templates that already exist will be skipped.

        Returns:
            Dictionary with seeding statistics:
            {
                "total_templates": int,
                "seeded": int,
                "skipped": int,
                "failed": int,
                "template_names": List[str]
            }

        Raises:
            TemplateSeederError: If critical error occurs during seeding
        """
        logger.info("Starting template seeding...")

        templates = self._get_built_in_templates()
        seeded = 0
        skipped = 0
        failed = 0
        template_names = []

        for template in templates:
            try:
                if self._template_exists(template.name):
                    skipped += 1
                    logger.debug(f"⊘ Template already exists: {template.name}")
                else:
                    self._create_template(template)
                    seeded += 1
                    template_names.append(template.name)
            except Exception as exc:
                failed += 1
                logger.error(f"✗ Failed to seed template '{template.name}': {str(e)}")

        result = {
            "total_templates": len(templates),
            "seeded": seeded,
            "skipped": skipped,
            "failed": failed,
            "template_names": template_names,
        }

        logger.info(
            f"Template seeding complete: {seeded} seeded, {skipped} skipped, {failed} failed"
        )

        self._log_audit(
            event_type="template.seed_all", action="seed_all", success=(failed == 0), details=result
        )

        return result

    def _get_built_in_templates(self) -> List[CreateTemplateInput]:
        """
        Get all built-in template definitions.

        Returns:
            List of template input models for all built-in templates
        """
        return [
            self._civil_litigation_template(),
            self._personal_injury_template(),
            self._employment_tribunal_template(),
            self._housing_possession_defense_template(),
            self._family_court_divorce_template(),
            self._immigration_appeal_template(),
            self._landlord_tenant_dispute_template(),
            self._debt_recovery_template(),
        ]

    def _civil_litigation_template(self) -> CreateTemplateInput:
        """Template 1: Civil Litigation (Contract Dispute)"""
        return CreateTemplateInput(
            name="Civil Litigation - Contract Dispute",
            description="Standard template for commercial or consumer contract disputes. Includes pre-action protocol steps and court proceedings timeline.",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="[Client Name] v [Defendant] - Contract Dispute",
                descriptionTemplate="Contract dispute regarding [brief description of contract]. Alleged breach: [describe breach]. Damages sought: £[amount].",
                caseType=CaseType.CONSUMER,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Contract documents",
                "Correspondence (emails, letters)",
                "Invoice/payment records",
                "Witness statements",
                "Expert reports (if applicable)",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="Letter Before Claim (Pre-Action)",
                    description="Send detailed letter of claim to defendant outlining breach and proposed resolution",
                    daysFromStart=7,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Defendant Response Deadline",
                    description="Defendant must acknowledge claim within 14 days",
                    daysFromStart=21,
                    isRequired=True,
                    category="deadline",
                ),
                TimelineMilestone(
                    title="Prepare Claim Form (N1)",
                    description="Draft particulars of claim if settlement not reached",
                    daysFromStart=30,
                    isRequired=False,
                    category="filing",
                ),
                TimelineMilestone(
                    title="File Court Claim",
                    description="Issue claim at county court if no settlement",
                    daysFromStart=45,
                    isRequired=False,
                    category="filing",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Gather all contract documents",
                    description="Collect original contract, amendments, and related agreements",
                    category="evidence",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Calculate damages",
                    description="Itemize all losses with supporting documentation",
                    category="research",
                    priority="high",
                    daysFromStart=3,
                ),
                ChecklistItem(
                    title="Check court fees",
                    description="Verify current court fee based on claim value (£25-£10,000)",
                    category="filing",
                    priority="medium",
                    daysFromStart=5,
                ),
                ChecklistItem(
                    title="Draft witness statements",
                    description="Prepare factual witness statements from all relevant parties",
                    category="evidence",
                    priority="medium",
                    daysFromStart=14,
                ),
            ],
        )

    def _personal_injury_template(self) -> CreateTemplateInput:
        """Template 2: Personal Injury Claim"""
        return CreateTemplateInput(
            name="Personal Injury Claim",
            description="Template for personal injury claims including road traffic accidents, workplace injuries, and public liability claims.",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="[Claimant Name] - Personal Injury Claim",
                descriptionTemplate="Personal injury claim arising from [incident type] on [date]. Injuries sustained: [list injuries]. Liable party: [defendant name].",
                caseType=CaseType.OTHER,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Medical records and reports",
                "Accident report",
                "Photographs of injuries/accident scene",
                "Witness statements",
                "Pay slips (for loss of earnings)",
                "Receipts for expenses",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="Obtain medical records",
                    description="Request GP notes and hospital records with patient consent",
                    daysFromStart=7,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="Instruct medical expert",
                    description="Arrange independent medical examination and prognosis report",
                    daysFromStart=14,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="Send Letter of Claim",
                    description="Formal notification to defendant/insurer with injury details",
                    daysFromStart=30,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Defendant Response",
                    description="Insurer must respond within 21 days acknowledging claim",
                    daysFromStart=51,
                    isRequired=True,
                    category="deadline",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Complete accident report form",
                    description="Document incident details while memory is fresh",
                    category="communication",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Photograph injuries",
                    description="Take detailed photos of all visible injuries and update weekly",
                    category="evidence",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Identify liable party",
                    description="Determine defendant and obtain insurance details",
                    category="research",
                    priority="high",
                    daysFromStart=3,
                ),
                ChecklistItem(
                    title="Calculate special damages",
                    description="Itemize all out-of-pocket expenses and lost earnings",
                    category="research",
                    priority="medium",
                    daysFromStart=7,
                ),
            ],
        )

    def _employment_tribunal_template(self) -> CreateTemplateInput:
        """Template 3: Employment Tribunal"""
        return CreateTemplateInput(
            name="Employment Tribunal Claim",
            description="Template for unfair dismissal, discrimination, and employment rights claims at tribunal.",
            category=TemplateCategory.EMPLOYMENT,
            templateFields=TemplateFields(
                titleTemplate="[Claimant Name] v [Employer] - Employment Tribunal",
                descriptionTemplate="Employment tribunal claim for [type: unfair dismissal/discrimination/etc]. Employment dates: [start] to [end]. Grounds: [brief description].",
                caseType=CaseType.EMPLOYMENT,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Employment contract",
                "Payslips and P60/P45",
                "Emails and written communications",
                "Disciplinary/grievance records",
                "Performance reviews",
                "Witness statements from colleagues",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="Submit ACAS Early Conciliation",
                    description="Mandatory step before tribunal claim (min 1 month process)",
                    daysFromStart=7,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Obtain ACAS Certificate",
                    description="Wait for ACAS certificate (issued if conciliation fails)",
                    daysFromStart=37,
                    isRequired=True,
                    category="deadline",
                ),
                TimelineMilestone(
                    title="File ET1 Form",
                    description="Submit tribunal claim within 1 month of ACAS cert (strict deadline)",
                    daysFromStart=44,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Employer Response (ET3)",
                    description="Employer must respond within 28 days of service",
                    daysFromStart=72,
                    isRequired=True,
                    category="deadline",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Check time limits",
                    description="Verify claim is within 3 months less 1 day of dismissal/incident",
                    category="filing",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Gather employment documents",
                    description="Collect contract, handbook, policies, and correspondence",
                    category="evidence",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Calculate compensation",
                    description="Determine financial losses and statutory award limits",
                    category="research",
                    priority="medium",
                    daysFromStart=5,
                ),
                ChecklistItem(
                    title="Draft witness list",
                    description="Identify colleagues who can support claim",
                    category="evidence",
                    priority="medium",
                    daysFromStart=10,
                ),
            ],
        )

    def _housing_possession_defense_template(self) -> CreateTemplateInput:
        """Template 4: Housing Possession Defense"""
        return CreateTemplateInput(
            name="Housing Possession Defense",
            description="Defend against landlord possession claims (Section 21/Section 8 notices, mortgage repossession).",
            category=TemplateCategory.HOUSING,
            templateFields=TemplateFields(
                titleTemplate="Defense - [Landlord] v [Tenant] - Possession Claim",
                descriptionTemplate="Defense to possession claim. Property: [address]. Tenancy type: [AST/regulated/etc]. Notice received: [date]. Grounds: [Section 21/Section 8 grounds].",
                caseType=CaseType.HOUSING,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Tenancy agreement",
                "Rent payment records",
                "Notice (Section 21/8)",
                "Correspondence with landlord",
                "Photos of property condition",
                "Deposit protection certificate",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="File Defense Form",
                    description="Submit defense to court within 14 days of service",
                    daysFromStart=7,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Check deposit protection",
                    description="Verify landlord protected deposit within 30 days of tenancy",
                    daysFromStart=3,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="Obtain legal advice",
                    description="Urgent appointment with housing solicitor or advice service",
                    daysFromStart=1,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="First Hearing",
                    description="Attend possession hearing (approx 4-8 weeks after filing)",
                    daysFromStart=42,
                    isRequired=True,
                    category="hearing",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Check notice validity",
                    description="Verify notice period, format, and procedural requirements",
                    category="research",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Review tenancy agreement",
                    description="Check for landlord breaches (e.g., no deposit protection)",
                    category="evidence",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Apply for discretionary housing payment",
                    description="Emergency funds from local council if rent arrears",
                    category="other",
                    priority="medium",
                    daysFromStart=2,
                ),
                ChecklistItem(
                    title="Gather rent payment evidence",
                    description="Bank statements showing all rent payments made",
                    category="evidence",
                    priority="high",
                    daysFromStart=3,
                ),
            ],
        )

    def _family_court_divorce_template(self) -> CreateTemplateInput:
        """Template 5: Family Court (Divorce)"""
        return CreateTemplateInput(
            name="Family Court - Divorce Petition",
            description="No-fault divorce petition template (post-2022 reforms). Includes financial settlement and child arrangements.",
            category=TemplateCategory.FAMILY,
            templateFields=TemplateFields(
                titleTemplate="Divorce - [Petitioner] and [Respondent]",
                descriptionTemplate="Divorce petition. Marriage date: [date]. Separation date: [date]. Grounds: Irretrievable breakdown. Children: [number]. Financial settlement: [disputed/agreed].",
                caseType=CaseType.FAMILY,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Marriage certificate",
                "Financial disclosure (Form E)",
                "Property valuations",
                "Pension statements",
                "Bank statements (last 12 months)",
                "Child arrangement proposals",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="Submit Online Divorce Application",
                    description="File application via gov.uk portal (£593 court fee)",
                    daysFromStart=7,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Serve Respondent",
                    description="Court serves respondent (or personal service if required)",
                    daysFromStart=21,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="Conditional Order (20 weeks)",
                    description="Apply for conditional order after 20-week reflection period",
                    daysFromStart=140,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Final Order (6 weeks + 1 day)",
                    description="Apply for final order to complete divorce",
                    daysFromStart=182,
                    isRequired=True,
                    category="filing",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Obtain marriage certificate",
                    description="Original or certified copy required for application",
                    category="evidence",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Complete financial disclosure",
                    description="Full Form E with all assets, debts, income, and pensions",
                    category="filing",
                    priority="high",
                    daysFromStart=7,
                ),
                ChecklistItem(
                    title="Draft child arrangements",
                    description="Propose living arrangements, contact, and maintenance",
                    category="filing",
                    priority="medium",
                    daysFromStart=14,
                ),
                ChecklistItem(
                    title="Attend MIAM (Mediation)",
                    description="Mandatory Information and Assessment Meeting (unless exempt)",
                    category="other",
                    priority="high",
                    daysFromStart=10,
                ),
            ],
        )

    def _immigration_appeal_template(self) -> CreateTemplateInput:
        """Template 6: Immigration Appeal"""
        return CreateTemplateInput(
            name="Immigration Appeal (First-tier Tribunal)",
            description="Template for appealing visa refusals, deportation orders, and asylum decisions.",
            category=TemplateCategory.IMMIGRATION,
            templateFields=TemplateFields(
                titleTemplate="Immigration Appeal - [Appellant Name]",
                descriptionTemplate="Appeal against [visa refusal/deportation/asylum refusal]. Home Office reference: [ref]. Decision date: [date]. Grounds: [Article 8/human rights/asylum grounds].",
                caseType=CaseType.OTHER,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Home Office decision letter",
                "Passport and travel documents",
                "Sponsor documents (if family visa)",
                "Evidence of relationship/employment",
                "Country expert reports",
                "Character references",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="File Notice of Appeal",
                    description="Submit appeal to First-tier Tribunal (14-day deadline)",
                    daysFromStart=7,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Home Office Review",
                    description="UKVI reviews decision (may withdraw or maintain)",
                    daysFromStart=28,
                    isRequired=True,
                    category="deadline",
                ),
                TimelineMilestone(
                    title="Submit Skeleton Argument",
                    description="Detailed legal grounds and evidence summary",
                    daysFromStart=42,
                    isRequired=True,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Tribunal Hearing",
                    description="Oral hearing before immigration judge (approx 3-6 months)",
                    daysFromStart=120,
                    isRequired=True,
                    category="hearing",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Check appeal deadline",
                    description="14 days for in-country, 28 days for out-of-country appeals",
                    category="filing",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Obtain Home Office bundle",
                    description="Request all documents HO relied on for decision",
                    category="evidence",
                    priority="high",
                    daysFromStart=3,
                ),
                ChecklistItem(
                    title="Gather supporting evidence",
                    description="Collect all evidence not submitted with original application",
                    category="evidence",
                    priority="high",
                    daysFromStart=5,
                ),
                ChecklistItem(
                    title="Instruct expert witness (if needed)",
                    description="Country expert for asylum or medical expert for health grounds",
                    category="other",
                    priority="medium",
                    daysFromStart=14,
                ),
            ],
        )

    def _landlord_tenant_dispute_template(self) -> CreateTemplateInput:
        """Template 7: Landlord-Tenant Dispute"""
        return CreateTemplateInput(
            name="Landlord-Tenant Dispute",
            description="Template for deposit disputes, disrepair claims, and tenancy issues (not possession).",
            category=TemplateCategory.HOUSING,
            templateFields=TemplateFields(
                titleTemplate="[Tenant] - Dispute with [Landlord]",
                descriptionTemplate="Dispute type: [deposit/disrepair/unlawful eviction]. Property: [address]. Tenancy dates: [start] to [end/ongoing]. Issue: [brief description].",
                caseType=CaseType.HOUSING,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Tenancy agreement",
                "Inventory and check-in report",
                "Photos of property condition",
                "Repair requests and responses",
                "Rent payment records",
                "Correspondence with landlord",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="Raise issue with landlord",
                    description="Formal written notice of disrepair/deposit dispute",
                    daysFromStart=3,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="Landlord Response Period",
                    description="Landlord must respond within reasonable time (14-28 days)",
                    daysFromStart=21,
                    isRequired=False,
                    category="deadline",
                ),
                TimelineMilestone(
                    title="Initiate Deposit Scheme ADR",
                    description="Free dispute resolution via TDS/DPS/MyDeposits",
                    daysFromStart=30,
                    isRequired=False,
                    category="other",
                ),
                TimelineMilestone(
                    title="Submit County Court Claim",
                    description="File N1 claim form if ADR fails (last resort)",
                    daysFromStart=60,
                    isRequired=False,
                    category="filing",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Check deposit protection",
                    description="Verify deposit registered with TDS, DPS, or MyDeposits",
                    category="research",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Document property condition",
                    description="Timestamped photos and video walkthrough",
                    category="evidence",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Review tenancy agreement",
                    description="Check repair obligations and dispute resolution clauses",
                    category="research",
                    priority="medium",
                    daysFromStart=2,
                ),
                ChecklistItem(
                    title="Calculate damages/compensation",
                    description="Itemize losses or cost of repairs with quotes",
                    category="research",
                    priority="medium",
                    daysFromStart=7,
                ),
            ],
        )

    def _debt_recovery_template(self) -> CreateTemplateInput:
        """Template 8: Debt Recovery"""
        return CreateTemplateInput(
            name="Debt Recovery Action",
            description="Template for recovering unpaid invoices, loans, or contractual debts from individuals or businesses.",
            category=TemplateCategory.CIVIL,
            templateFields=TemplateFields(
                titleTemplate="[Creditor] v [Debtor] - Debt Recovery",
                descriptionTemplate="Debt recovery claim. Amount owed: £[amount]. Invoice/loan date: [date]. Payment due: [date]. Debtor response: [ignored/disputed/partial payment].",
                caseType=CaseType.DEBT,
                defaultStatus=CaseStatus.ACTIVE,
            ),
            suggestedEvidenceTypes=[
                "Invoice or loan agreement",
                "Proof of delivery/service",
                "Payment reminders sent",
                "Debtor correspondence",
                "Bank statements showing non-payment",
                "Credit report (for insolvency check)",
            ],
            timelineMilestones=[
                TimelineMilestone(
                    title="Send Letter Before Action",
                    description="Final demand giving 14 days to pay or face legal action",
                    daysFromStart=7,
                    isRequired=True,
                    category="other",
                ),
                TimelineMilestone(
                    title="Debtor Payment Deadline",
                    description="Deadline for payment or response to letter",
                    daysFromStart=21,
                    isRequired=True,
                    category="deadline",
                ),
                TimelineMilestone(
                    title="Issue County Court Claim (N1)",
                    description="File claim online (MCOL) or via court if no payment",
                    daysFromStart=28,
                    isRequired=False,
                    category="filing",
                ),
                TimelineMilestone(
                    title="Debtor Defense Deadline",
                    description="Debtor has 14 days to acknowledge or defend",
                    daysFromStart=42,
                    isRequired=False,
                    category="deadline",
                ),
            ],
            checklistItems=[
                ChecklistItem(
                    title="Verify debt is not statute-barred",
                    description="Check debt is within 6 years (12 for specialty debts)",
                    category="research",
                    priority="high",
                    daysFromStart=1,
                ),
                ChecklistItem(
                    title="Check debtor solvency",
                    description="Search Companies House or credit reference agencies",
                    category="research",
                    priority="high",
                    daysFromStart=2,
                ),
                ChecklistItem(
                    title="Calculate total owed",
                    description="Include principal, interest (8% statutory), and costs",
                    category="research",
                    priority="high",
                    daysFromStart=3,
                ),
                ChecklistItem(
                    title="Prepare enforcement options",
                    description="Research bailiffs, charging orders, attachment of earnings",
                    category="research",
                    priority="medium",
                    daysFromStart=14,
                ),
            ],
        )

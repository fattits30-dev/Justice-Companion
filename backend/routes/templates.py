"""
Template management routes for Justice Companion.
Migrated from electron/ipc-handlers/templates.ts

Routes:
- POST /templates - Create new template (requires session_id header)
- GET /templates - List templates (system + user's custom templates)
- GET /templates/{template_id} - Get template by ID
- PUT /templates/{template_id} - Update template
- DELETE /templates/{template_id} - Delete template
- POST /templates/{template_id}/apply - Apply template to create case with variable substitution
- POST /templates/seed - Seed system templates (admin operation)

Changes from direct DB queries to service layer:
- All CRUD operations now use TemplateService
- Audit logging via AuditLogger class
- Template seeding via TemplateSeeder
- Variable substitution handled by service layer
- Consistent error handling with proper exceptions
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.services.auth_service import AuthenticationService
from backend.routes.auth import get_current_user
from backend.services.template_service import (
    TemplateService,
    CreateTemplateInput,
    UpdateTemplateInput,
    CreateCaseFromTemplateInput,
    TemplateResponse,
    TemplateNotFoundError,
    DatabaseError,
    ValidationError,
)
from backend.services.template_seeder import TemplateSeeder
from backend.services.audit_logger import AuditLogger
from backend.models.template import TemplateCategory

router = APIRouter(prefix="/templates", tags=["templates"])


# ===== PYDANTIC RESPONSE MODELS =====
# Request models are imported from template_service
# Response models used by FastAPI for OpenAPI schema generation


class DeleteTemplateResponse(BaseModel):
    """Response model for template deletion."""

    deleted: bool
    id: int


# ===== DEPENDENCIES =====
def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db=db)


def get_template_service(
    db: Session = Depends(get_db), audit_logger: AuditLogger = Depends(get_audit_logger)
) -> TemplateService:
    """Get template service instance with dependency injection."""
    return TemplateService(db=db, audit_logger=audit_logger)


def get_template_seeder(
    db: Session = Depends(get_db), audit_logger: AuditLogger = Depends(get_audit_logger)
) -> TemplateSeeder:
    """Get template seeder instance with dependency injection."""
    return TemplateSeeder(db=db, audit_logger=audit_logger)


# ===== ROUTES =====
@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    request: CreateTemplateInput,
    user_id: int = Depends(get_current_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Create a new template.

    Requires authentication via session_id header.
    Only user templates can be created (system templates must be seeded via /templates/seed).
    Automatically logs audit event via TemplateService.
    """
    try:
        # Create template via service layer
        template = await template_service.create_template(input_data=request, user_id=user_id)
        return template

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}",
        )


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    user_id: int = Depends(get_current_user),
    template_service: TemplateService = Depends(get_template_service),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """
    List all templates available to the authenticated user.

    Returns system templates + user's custom templates.
    Optionally filter by category.
    Ordered by most recently created first.
    """
    try:
        # Convert string category to enum if provided
        category_enum = None
        if category:
            try:
                category_enum = TemplateCategory(category)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid category. Valid options: {', '.join([c.value for c in TemplateCategory])}",
                )

        # Get templates via service layer
        templates = await template_service.get_all_templates(
            user_id=user_id, category=category_enum, include_system=True
        )
        return templates

    except HTTPException:
        raise
    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}",
        )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    user_id: int = Depends(get_current_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Get a specific template by ID.

    Only returns template if it's a system template or belongs to the authenticated user.
    Automatically logs audit event via TemplateService.
    """
    try:
        template = await template_service.get_template_by_id(
            template_id=template_id, user_id=user_id
        )
        return template

    except TemplateNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template: {str(e)}",
        )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    request: UpdateTemplateInput,
    user_id: int = Depends(get_current_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Update an existing template.

    Only updates fields provided in the request body.
    Only allows updating templates owned by the authenticated user (cannot update system templates).
    Automatically logs audit event via TemplateService.
    """
    try:
        template = await template_service.update_template(
            template_id=template_id, user_id=user_id, input_data=request
        )
        return template

    except TemplateNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except HTTPException:
        raise

    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update template: {str(e)}",
        )


@router.delete(
    "/{template_id}", response_model=DeleteTemplateResponse, status_code=status.HTTP_200_OK
)
async def delete_template(
    template_id: int,
    user_id: int = Depends(get_current_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Delete a template.

    Only allows deleting templates owned by the authenticated user.
    System templates cannot be deleted.
    Automatically logs audit event via TemplateService.
    """
    try:
        deleted = await template_service.delete_template(template_id=template_id, user_id=user_id)

        if deleted:
            return {"deleted": True, "id": template_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete template",
            )

    except TemplateNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except HTTPException:
        raise

    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {str(e)}",
        )


@router.post("/{template_id}/apply")
async def apply_template(
    template_id: int,
    request: CreateCaseFromTemplateInput,
    user_id: int = Depends(get_current_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Apply template to create a new case with variable substitution.

    Replaces [VariableName] placeholders in template with provided values.
    Creates case with milestones and tracks template usage.
    Automatically logs audit event via TemplateService.

    Example:
        Template: "[Client] vs [Defendant] - Contract Dispute"
        Variables: {"Client": "John Doe", "Defendant": "Jane Smith"}
        Result: "John Doe vs Jane Smith - Contract Dispute"
    """
    try:
        result = await template_service.apply_template(
            template_id=template_id, user_id=user_id, input_data=request
        )

        return {
            "case": result.case,
            "appliedMilestones": result.appliedMilestones,
            "appliedChecklistItems": result.appliedChecklistItems,
            "templateId": result.templateId,
            "templateName": result.templateName,
        }

    except TemplateNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except HTTPException:
        raise

    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply template: {str(e)}",
        )


@router.post("/seed")
async def seed_templates(
    _: int = Depends(get_current_user),  # Require authentication
    template_seeder: TemplateSeeder = Depends(get_template_seeder),
):
    """
    Seed system templates into the database.

    This is an idempotent operation - running multiple times will not create duplicates.
    Seeds 8 built-in UK legal templates:
    1. Civil Litigation - Contract Dispute
    2. Personal Injury Claim
    3. Employment Tribunal Claim
    4. Housing Possession Defense
    5. Family Court - Divorce Petition
    6. Immigration Appeal (First-tier Tribunal)
    7. Landlord-Tenant Dispute
    8. Debt Recovery Action

    Returns statistics about seeding operation.

    NOTE: In production, this should be restricted to admin users only.
    """
    try:
        result = template_seeder.seed_all()

        return {
            "success": True,
            "message": f"Template seeding complete: {result['seeded']} seeded, {result['skipped']} skipped, {result['failed']} failed",
            "stats": result,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed templates: {str(e)}",
        )

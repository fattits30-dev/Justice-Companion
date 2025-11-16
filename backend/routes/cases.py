"""
Case management routes for Justice Companion.
Migrated from electron/ipc-handlers/cases.ts

REFACTORED: Now uses service layer instead of direct database queries.

Routes:
- POST /cases - Create new case (requires session_id header)
- GET /cases - List all cases for authenticated user (with filtering, pagination, sorting)
- GET /cases/{case_id} - Get case by ID
- PUT /cases/{case_id} - Update case
- DELETE /cases/{case_id} - Delete case
- POST /cases/{case_id}/facts - Create case fact
- GET /cases/{case_id}/facts - List case facts
- POST /cases/bulk/delete - Bulk delete cases
- POST /cases/bulk/update - Bulk update cases
- POST /cases/bulk/archive - Bulk archive cases

Services Integrated:
- CaseService: CRUD operations with encryption and audit logging
- BulkOperationService: Bulk operations with transaction support
- EncryptionService: Field-level encryption for sensitive data
- AuditLogger: Immutable audit trail for all operations
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
import base64

from backend.models.base import get_db
from backend.services.auth_service import AuthenticationService
from backend.routes.auth import get_current_user
from backend.services.case_service import (
    CaseService,
    CreateCaseInput,
    UpdateCaseInput,
    CaseResponse,
    CaseNotFoundError,
    SearchFilters,
    CaseType,
    CaseStatus
)
from backend.services.bulk_operation_service import (
    BulkOperationService,
    BulkOperationOptions,
    BulkOperationResult,
    CaseUpdate
)
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger

router = APIRouter(prefix="/cases", tags=["cases"])


# ===== ENUMS (for backward compatibility with frontend) =====
VALID_CASE_TYPES = ["employment", "housing", "consumer", "family", "debt", "other"]
VALID_CASE_STATUSES = ["active", "closed", "pending"]
VALID_FACT_CATEGORIES = ["timeline", "evidence", "witness", "location", "communication", "other"]
VALID_IMPORTANCE_LEVELS = ["low", "medium", "high", "critical"]


# ===== PYDANTIC REQUEST MODELS (for legacy endpoints) =====
class CreateCaseRequest(BaseModel):
    """Request model for creating a new case (legacy format)."""
    title: str = Field(..., min_length=1, max_length=200, description="Case title")
    description: Optional[str] = Field(None, max_length=10000, description="Case description")
    caseType: str = Field(..., description="Type of legal case")
    status: str = Field(default="active", description="Case status")
    caseNumber: Optional[str] = Field(None, max_length=50, description="Court case number")
    courtName: Optional[str] = Field(None, max_length=200, description="Court name")
    judge: Optional[str] = Field(None, max_length=100, description="Judge name")
    opposingParty: Optional[str] = Field(None, max_length=200, description="Opposing party name")
    opposingCounsel: Optional[str] = Field(None, max_length=200, description="Opposing counsel name")
    nextHearingDate: Optional[str] = Field(None, description="Next hearing date (YYYY-MM-DD)")
    filingDeadline: Optional[str] = Field(None, description="Filing deadline (YYYY-MM-DD)")

    @validator('caseType')
    def validate_case_type(cls, v):
        if v not in VALID_CASE_TYPES:
            raise ValueError(f"Please select a valid case type: {', '.join(VALID_CASE_TYPES)}")
        return v

    @validator('status')
    def validate_status(cls, v):
        if v not in VALID_CASE_STATUSES:
            raise ValueError(f"Please select a valid status: {', '.join(VALID_CASE_STATUSES)}")
        return v

    @validator('caseNumber')
    def validate_case_number(cls, v):
        if v and not all(c.isalnum() or c in ['-', '/', ' '] for c in v):
            raise ValueError("Case number contains invalid characters")
        return v.strip() if v else None

    @validator('title', 'description', 'courtName', 'judge', 'opposingParty', 'opposingCounsel')
    def strip_strings(cls, v):
        return v.strip() if v else None

    @validator('nextHearingDate', 'filingDeadline')
    def validate_date_format(cls, v):
        if v:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError("Invalid date format (use YYYY-MM-DD)")
        return v


class UpdateCaseRequest(BaseModel):
    """Request model for updating an existing case (legacy format)."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)
    caseType: Optional[str] = None
    status: Optional[str] = None
    caseNumber: Optional[str] = Field(None, max_length=50)
    courtName: Optional[str] = Field(None, max_length=200)
    judge: Optional[str] = Field(None, max_length=100)
    opposingParty: Optional[str] = Field(None, max_length=200)
    opposingCounsel: Optional[str] = Field(None, max_length=200)
    nextHearingDate: Optional[str] = None
    filingDeadline: Optional[str] = None

    @validator('caseType')
    def validate_case_type(cls, v):
        if v and v not in VALID_CASE_TYPES:
            raise ValueError(f"Please select a valid case type: {', '.join(VALID_CASE_TYPES)}")
        return v

    @validator('status')
    def validate_status(cls, v):
        if v and v not in VALID_CASE_STATUSES:
            raise ValueError(f"Please select a valid status: {', '.join(VALID_CASE_STATUSES)}")
        return v

    @validator('caseNumber')
    def validate_case_number(cls, v):
        if v and not all(c.isalnum() or c in ['-', '/', ' '] for c in v):
            raise ValueError("Case number contains invalid characters")
        return v.strip() if v else None

    @validator('title', 'description', 'courtName', 'judge', 'opposingParty', 'opposingCounsel')
    def strip_strings(cls, v):
        return v.strip() if v else None

    @validator('nextHearingDate', 'filingDeadline')
    def validate_date_format(cls, v):
        if v:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError("Invalid date format (use YYYY-MM-DD)")
        return v


class CreateCaseFactRequest(BaseModel):
    """Request model for creating a case fact."""
    caseId: int = Field(..., gt=0, description="Case ID")
    factContent: str = Field(..., min_length=1, max_length=10000, description="Fact content")
    factCategory: str = Field(..., description="Fact category")
    importance: str = Field(default="medium", description="Importance level")

    @validator('factCategory')
    def validate_category(cls, v):
        if v not in VALID_FACT_CATEGORIES:
            raise ValueError(f"Invalid fact category: {', '.join(VALID_FACT_CATEGORIES)}")
        return v

    @validator('importance')
    def validate_importance(cls, v):
        if v not in VALID_IMPORTANCE_LEVELS:
            raise ValueError(f"Invalid importance level: {', '.join(VALID_IMPORTANCE_LEVELS)}")
        return v

    @validator('factContent')
    def strip_content(cls, v):
        return v.strip()


class BulkDeleteRequest(BaseModel):
    """Request model for bulk delete operation."""
    case_ids: List[int] = Field(..., min_items=1, description="List of case IDs to delete")
    fail_fast: bool = Field(default=True, description="Stop on first error and rollback")


class BulkUpdateRequest(BaseModel):
    """Request model for bulk update operation."""
    updates: List[CaseUpdate] = Field(..., min_items=1, description="List of case updates")
    fail_fast: bool = Field(default=True, description="Stop on first error and rollback")


class BulkArchiveRequest(BaseModel):
    """Request model for bulk archive operation."""
    case_ids: List[int] = Field(..., min_items=1, description="List of case IDs to archive")
    fail_fast: bool = Field(default=True, description="Stop on first error and rollback")


# ===== PYDANTIC RESPONSE MODELS (for legacy endpoints) =====
class LegacyCaseResponse(BaseModel):
    """Response model for case data (legacy format with camelCase)."""
    id: int
    title: str
    description: Optional[str]
    caseType: str
    status: str
    userId: int
    caseNumber: Optional[str] = None
    courtName: Optional[str] = None
    judge: Optional[str] = None
    opposingParty: Optional[str] = None
    opposingCounsel: Optional[str] = None
    nextHearingDate: Optional[str] = None
    filingDeadline: Optional[str] = None
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class CaseFactResponse(BaseModel):
    """Response model for case fact data."""
    id: int
    caseId: int
    factContent: str
    factCategory: str
    importance: str
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class DeleteCaseResponse(BaseModel):
    """Response model for case deletion."""
    deleted: bool
    id: int


class PaginationMetadata(BaseModel):
    """Pagination metadata for list responses."""
    total: int
    page: int
    page_size: int
    total_pages: int


class CaseListResponse(BaseModel):
    """Response model for case list with pagination."""
    cases: List[LegacyCaseResponse]
    pagination: PaginationMetadata


# ===== DEPENDENCIES =====
def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)


def get_encryption_service() -> EncryptionService:
    """
    Get encryption service instance with encryption key.

    Priority:
    1. ENCRYPTION_KEY_BASE64 environment variable
    2. Generate temporary key (WARNING: data will be lost on restart)
    """
    key_base64 = os.getenv("ENCRYPTION_KEY_BASE64")

    if not key_base64:
        # WARNING: Generating temporary key - data will be lost on restart
        key = EncryptionService.generate_key()
        key_base64 = base64.b64encode(key).decode('utf-8')
        print("WARNING: No ENCRYPTION_KEY_BASE64 found. Using temporary key.")

    return EncryptionService(key_base64)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)


def get_case_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> CaseService:
    """Get case service instance with dependencies."""
    return CaseService(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )


def get_bulk_operation_service(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> BulkOperationService:
    """Get bulk operation service instance with dependencies."""
    return BulkOperationService(
        db=db,
        audit_logger=audit_logger
    )


# ===== HELPER FUNCTIONS =====
def convert_to_legacy_format(case: CaseResponse) -> LegacyCaseResponse:
    """
    Convert CaseResponse from service layer to legacy camelCase format.

    Args:
        case: CaseResponse from service layer

    Returns:
        LegacyCaseResponse with camelCase field names
    """
    return LegacyCaseResponse(
        id=case.id,
        title=case.title,
        description=case.description,
        caseType=case.case_type,
        status=case.status,
        userId=case.user_id or 0,  # Default to 0 if None
        caseNumber=None,  # Not in service response yet
        courtName=None,
        judge=None,
        opposingParty=None,
        opposingCounsel=None,
        nextHearingDate=None,
        filingDeadline=None,
        createdAt=case.created_at,
        updatedAt=case.updated_at
    )


# ===== ROUTES =====

@router.post("", response_model=LegacyCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    request: CreateCaseRequest,
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    ai_metadata: Optional[Dict[str, Any]] = None
):
    """
    Create a new case.

    Uses CaseService for business logic:
    - Encrypts sensitive fields (description)
    - Validates user ownership
    - Logs audit event

    Requires authentication via session_id header.
    Logs audit event with AI metadata if provided (for AI-assisted case creation).

    Example:
        POST /cases
        Authorization: Bearer <session_id>
        {
            "title": "Smith v. Jones",
            "description": "Employment discrimination case",
            "caseType": "employment",
            "status": "active"
        }
    """
    try:
        # Convert legacy format to service input
        service_input = CreateCaseInput(
            title=request.title,
            description=request.description,
            case_type=CaseType(request.caseType)
        )

        # Create case using service layer
        case_response = await case_service.create_case(service_input, user_id)

        # Log AI metadata if provided
        if ai_metadata:
            audit_logger = case_service.audit_logger
            if audit_logger:
                audit_logger.log(
                    event_type="case.ai_assisted_creation",
                    user_id=str(user_id),
                    resource_type="case",
                    resource_id=str(case_response.id),
                    action="create",
                    details={"aiMetadata": ai_metadata},
                    success=True
                )

        # Convert to legacy format
        return convert_to_legacy_format(case_response)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create case: {str(e)}")


@router.get("", response_model=List[LegacyCaseResponse])
async def list_cases(
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by case status"),
    case_type_filter: Optional[str] = Query(None, alias="caseType", description="Filter by case type"),
    search_query: Optional[str] = Query(None, alias="q", description="Search cases by title"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    sort_by: str = Query("updated_at", description="Sort field (created_at, updated_at, title)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)")
):
    """
    List all cases for the authenticated user with filtering and pagination.

    Uses CaseService for business logic:
    - Decrypts sensitive fields
    - Applies user ownership filter
    - Supports search, filtering, pagination, sorting

    Query Parameters:
    - status: Filter by status (active, closed, pending)
    - caseType: Filter by type (employment, housing, consumer, family, debt, other)
    - q: Search query (searches title field)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50, max: 100)
    - sort_by: Sort field (created_at, updated_at, title)
    - sort_order: Sort order (asc, desc)

    Returns cases ordered by most recently updated first (default).

    Example:
        GET /cases?status=active&caseType=employment&page=1&page_size=20
    """
    try:
        # Build search filters
        filters = None
        if status_filter or case_type_filter:
            filters = SearchFilters(
                case_status=[CaseStatus(status_filter)] if status_filter else None,
                case_type=[CaseType(case_type_filter)] if case_type_filter else None
            )

        # Get cases from service layer
        if search_query or filters:
            cases = await case_service.search_cases(
                user_id=user_id,
                query=search_query,
                filters=filters
            )
        else:
            cases = await case_service.get_all_cases(user_id)

        # Apply sorting (service returns in desc order by default)
        # TODO: Add sorting to service layer

        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_cases = cases[start_idx:end_idx]

        # Convert to legacy format
        return [convert_to_legacy_format(case) for case in paginated_cases]

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cases: {str(e)}")


@router.get("/{case_id}", response_model=LegacyCaseResponse)
async def get_case(
    case_id: int,
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service)
):
    """
    Get a specific case by ID.

    Uses CaseService for business logic:
    - Verifies user ownership
    - Decrypts sensitive fields
    - Logs audit event for case viewing

    Only returns case if it belongs to the authenticated user.
    Returns 404 if case doesn't exist or user doesn't own it.

    Example:
        GET /cases/123
        Authorization: Bearer <session_id>
    """
    try:
        case = await case_service.get_case_by_id(case_id, user_id)
        return convert_to_legacy_format(case)

    except CaseNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Case with ID {case_id} not found or unauthorized"
        )
    except HTTPException as e:
        # Re-raise 403 from service layer as 404 (don't leak existence)
        if e.status_code == 403:
            raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found")
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get case: {str(e)}")


@router.put("/{case_id}", response_model=LegacyCaseResponse)
async def update_case(
    case_id: int,
    request: UpdateCaseRequest,
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service)
):
    """
    Update an existing case.

    Uses CaseService for business logic:
    - Verifies user ownership
    - Encrypts sensitive fields
    - Logs audit event with fields updated

    Only updates fields provided in the request body.
    Only allows updating cases owned by the authenticated user.
    Returns 404 if case doesn't exist or user doesn't own it.

    Example:
        PUT /cases/123
        Authorization: Bearer <session_id>
        {
            "status": "closed",
            "description": "Case resolved"
        }
    """
    try:
        # Convert legacy format to service input
        service_input = UpdateCaseInput(
            title=request.title,
            description=request.description,
            case_type=CaseType(request.caseType) if request.caseType else None,
            status=CaseStatus(request.status) if request.status else None
        )

        # Ensure at least one field is provided
        if all(field is None for field in [
            service_input.title,
            service_input.description,
            service_input.case_type,
            service_input.status
        ]):
            raise HTTPException(
                status_code=400,
                detail="At least one field must be provided for update"
            )

        # Update case using service layer
        case_response = await case_service.update_case(case_id, user_id, service_input)

        # Convert to legacy format
        return convert_to_legacy_format(case_response)

    except CaseNotFoundError:
        raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found")
    except HTTPException as e:
        # Re-raise 403 from service layer as 404 (don't leak existence)
        if e.status_code == 403:
            raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found")
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update case: {str(e)}")


@router.delete("/{case_id}", response_model=DeleteCaseResponse, status_code=status.HTTP_200_OK)
async def delete_case(
    case_id: int,
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service)
):
    """
    Delete a case.

    Uses CaseService for business logic:
    - Verifies user ownership
    - Cascades deletion to related records
    - Logs audit event

    Only allows deleting cases owned by the authenticated user.
    SQLite will cascade deletion to related records via foreign keys.
    Returns 404 if case doesn't exist or user doesn't own it.

    Example:
        DELETE /cases/123
        Authorization: Bearer <session_id>
    """
    try:
        success = await case_service.delete_case(case_id, user_id)

        if success:
            return {"deleted": True, "id": case_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete case")

    except CaseNotFoundError:
        raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found")
    except HTTPException as e:
        # Re-raise 403 from service layer as 404 (don't leak existence)
        if e.status_code == 403:
            raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found")
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete case: {str(e)}")


# ===== BULK OPERATIONS =====

@router.post("/bulk/delete", response_model=BulkOperationResult)
async def bulk_delete_cases(
    request: BulkDeleteRequest,
    user_id: int = Depends(get_current_user),
    bulk_service: BulkOperationService = Depends(get_bulk_operation_service)
):
    """
    Bulk delete multiple cases.

    Uses BulkOperationService for transaction-safe bulk operations:
    - Verifies user ownership for each case
    - Cascades deletion to related records
    - Atomic transaction (all-or-nothing with fail_fast=True)
    - Logs audit events for all operations

    Request Body:
    - case_ids: List of case IDs to delete
    - fail_fast: Stop on first error and rollback (default: true)

    Returns operation statistics (success_count, failure_count, errors).

    Example:
        POST /cases/bulk/delete
        Authorization: Bearer <session_id>
        {
            "case_ids": [1, 2, 3],
            "fail_fast": true
        }
    """
    try:
        options = BulkOperationOptions(fail_fast=request.fail_fast)
        result = await bulk_service.bulk_delete_cases(
            case_ids=request.case_ids,
            user_id=user_id,
            options=options
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")


@router.post("/bulk/update", response_model=BulkOperationResult)
async def bulk_update_cases(
    request: BulkUpdateRequest,
    user_id: int = Depends(get_current_user),
    bulk_service: BulkOperationService = Depends(get_bulk_operation_service)
):
    """
    Bulk update multiple cases.

    Uses BulkOperationService for transaction-safe bulk operations:
    - Verifies user ownership for each case
    - Updates only provided fields
    - Atomic transaction (all-or-nothing with fail_fast=True)
    - Logs audit events for all operations

    Request Body:
    - updates: List of case updates (id + fields to update)
    - fail_fast: Stop on first error and rollback (default: true)

    Returns operation statistics (success_count, failure_count, errors).

    Example:
        POST /cases/bulk/update
        Authorization: Bearer <session_id>
        {
            "updates": [
                {"id": 1, "status": "closed"},
                {"id": 2, "status": "closed"}
            ],
            "fail_fast": true
        }
    """
    try:
        options = BulkOperationOptions(fail_fast=request.fail_fast)
        result = await bulk_service.bulk_update_cases(
            updates=request.updates,
            user_id=user_id,
            options=options
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk update failed: {str(e)}")


@router.post("/bulk/archive", response_model=BulkOperationResult)
async def bulk_archive_cases(
    request: BulkArchiveRequest,
    user_id: int = Depends(get_current_user),
    bulk_service: BulkOperationService = Depends(get_bulk_operation_service)
):
    """
    Bulk archive multiple cases (set status to 'closed').

    Uses BulkOperationService for transaction-safe bulk operations:
    - Verifies user ownership for each case
    - Sets status to 'closed' without deleting
    - Atomic transaction (all-or-nothing with fail_fast=True)
    - Logs audit events for all operations

    Request Body:
    - case_ids: List of case IDs to archive
    - fail_fast: Stop on first error and rollback (default: true)

    Returns operation statistics (success_count, failure_count, errors).

    Example:
        POST /cases/bulk/archive
        Authorization: Bearer <session_id>
        {
            "case_ids": [1, 2, 3],
            "fail_fast": true
        }
    """
    try:
        options = BulkOperationOptions(fail_fast=request.fail_fast)
        result = await bulk_service.bulk_archive_cases(
            case_ids=request.case_ids,
            user_id=user_id,
            options=options
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk archive failed: {str(e)}")


# ===== CASE FACTS (Legacy endpoints - kept for backward compatibility) =====

@router.post("/{case_id}/facts", response_model=CaseFactResponse, status_code=status.HTTP_201_CREATED)
async def create_case_fact(
    case_id: int,
    request: CreateCaseFactRequest,
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    db: Session = Depends(get_db)
):
    """
    Create a fact associated with a case.

    Validates that the case belongs to the authenticated user before creating fact.

    NOTE: This endpoint still uses raw SQL for case_facts table.
    TODO: Migrate to CaseFactService when implemented.

    Example:
        POST /cases/123/facts
        Authorization: Bearer <session_id>
        {
            "caseId": 123,
            "factContent": "Email received from opposing counsel",
            "factCategory": "communication",
            "importance": "high"
        }
    """
    try:
        # Verify case exists and belongs to user (using service layer)
        try:
            await case_service.get_case_by_id(case_id, user_id)
        except CaseNotFoundError:
            raise HTTPException(status_code=404, detail="Case not found or unauthorized")
        except HTTPException as e:
            if e.status_code == 403:
                raise HTTPException(status_code=404, detail="Case not found or unauthorized")
            raise

        # Validate that request.caseId matches path parameter
        if request.caseId != case_id:
            raise HTTPException(
                status_code=400,
                detail=f"Case ID mismatch: path has {case_id}, body has {request.caseId}"
            )

        # Create case fact (raw SQL - TODO: migrate to service layer)
        insert_query = text("""
            INSERT INTO case_facts (case_id, fact_content, fact_category, importance, created_at, updated_at)
            VALUES (:case_id, :fact_content, :fact_category, :importance, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        result = db.execute(insert_query, {
            "case_id": request.caseId,
            "fact_content": request.factContent,
            "fact_category": request.factCategory,
            "importance": request.importance
        })
        db.commit()

        fact_id = result.lastrowid

        # Fetch created fact
        select_query = text("""
            SELECT
                id,
                case_id as caseId,
                fact_content as factContent,
                fact_category as factCategory,
                importance,
                created_at as createdAt,
                updated_at as updatedAt
            FROM case_facts
            WHERE id = :fact_id
        """)

        created_fact = db.execute(select_query, {"fact_id": fact_id}).fetchone()

        # Log audit event
        from backend.services.audit_logger import log_audit_event
        log_audit_event(
            db=db,
            event_type="case_fact.create",
            user_id=str(user_id),
            resource_type="case_fact",
            resource_id=str(fact_id),
            action="create",
            details={
                "caseId": request.caseId,
                "category": request.factCategory
            },
            success=True
        )

        # Convert to dict
        fact_dict = dict(created_fact._mapping)
        fact_dict['createdAt'] = fact_dict['createdAt'].isoformat() if fact_dict.get('createdAt') else None
        fact_dict['updatedAt'] = fact_dict['updatedAt'].isoformat() if fact_dict.get('updatedAt') else None

        return fact_dict

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create case fact: {str(e)}")


@router.get("/{case_id}/facts", response_model=List[CaseFactResponse])
async def list_case_facts(
    case_id: int,
    user_id: int = Depends(get_current_user),
    case_service: CaseService = Depends(get_case_service),
    db: Session = Depends(get_db)
):
    """
    List all facts for a specific case.

    Validates that the case belongs to the authenticated user.

    NOTE: This endpoint still uses raw SQL for case_facts table.
    TODO: Migrate to CaseFactService when implemented.

    Example:
        GET /cases/123/facts
        Authorization: Bearer <session_id>
    """
    try:
        # Verify case exists and belongs to user (using service layer)
        try:
            await case_service.get_case_by_id(case_id, user_id)
        except CaseNotFoundError:
            raise HTTPException(status_code=404, detail="Case not found or unauthorized")
        except HTTPException as e:
            if e.status_code == 403:
                raise HTTPException(status_code=404, detail="Case not found or unauthorized")
            raise

        # Get case facts (raw SQL - TODO: migrate to service layer)
        facts_query = text("""
            SELECT
                id,
                case_id as caseId,
                fact_content as factContent,
                fact_category as factCategory,
                importance,
                created_at as createdAt,
                updated_at as updatedAt
            FROM case_facts
            WHERE case_id = :case_id
            ORDER BY created_at DESC
        """)

        facts = db.execute(facts_query, {"case_id": case_id}).fetchall()

        # Convert to list of dicts
        result = []
        for fact in facts:
            fact_dict = dict(fact._mapping)
            fact_dict['createdAt'] = fact_dict['createdAt'].isoformat() if fact_dict.get('createdAt') else None
            fact_dict['updatedAt'] = fact_dict['updatedAt'].isoformat() if fact_dict.get('updatedAt') else None
            result.append(fact_dict)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list case facts: {str(e)}")

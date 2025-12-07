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

import base64
import inspect
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.routes.auth import get_current_user, get_session_manager

# Import schemas from consolidated schema file
from backend.schemas.case import (
    VALID_CASE_STATUSES,
    VALID_CASE_TYPES,
    VALID_FACT_CATEGORIES,
    VALID_IMPORTANCE_LEVELS,
    BulkArchiveRequest,
    BulkDeleteRequest,
    BulkUpdateRequest,
    CaseFactResponse,
    CaseListResponse,
    CreateCaseFactRequest,
    CreateCaseRequest,
    DeleteCaseResponse,
    LegacyCaseResponse,
    PaginationMetadata,
    UpdateCaseRequest,
)
from backend.services.audit_logger import AuditLogger
from backend.services.auth.service import AuthenticationService
from backend.services.auth.session_manager import SessionManager
from backend.services.bulk_operation_service import (
    BulkOperationOptions,
    BulkOperationResult,
    BulkOperationService,
    CaseUpdate,
)
from backend.services.case_fact_service import CaseFactService
from backend.services.case_service import (
    CaseNotFoundError,
    CaseResponse,
    CaseService,
    CaseStatus,
    CaseType,
    CreateCaseInput,
    SearchFilters,
    UpdateCaseInput,
)
from backend.services.security.encryption import EncryptionService

router = APIRouter(prefix="/cases", tags=["cases"])


# ===== DEPENDENCIES =====
def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance with encryption key."""
    key_base64 = os.getenv("ENCRYPTION_KEY_BASE64")

    if not key_base64:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY_BASE64 environment variable is required. Server misconfigured.",
        )

    return EncryptionService(key_base64)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)


def get_case_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> CaseService:
    """Get case service instance with dependencies."""
    return CaseService(
        db=db, encryption_service=encryption_service, audit_logger=audit_logger
    )


def get_bulk_operation_service(
    db: Session = Depends(get_db), audit_logger: AuditLogger = Depends(get_audit_logger)
) -> BulkOperationService:
    """Get bulk operation service instance with dependencies."""
    return BulkOperationService(db=db, audit_logger=audit_logger)


async def resolve_current_user_id(
    request: Request,
    db: Session = Depends(get_db),
    session_manager: SessionManager = Depends(get_session_manager),
) -> int:
    """Resolve current user via get_current_user, allowing patched stubs in tests."""
    dependency = get_current_user
    params = inspect.signature(dependency).parameters

    kwargs: Dict[str, Any] = {}
    if "request" in params:
        kwargs["request"] = request
    if "db" in params:
        kwargs["db"] = db
    if "session_manager" in params:
        kwargs["session_manager"] = session_manager

    result = dependency(**kwargs)
    if inspect.isawaitable(result):
        return await result  # type: ignore[return-value]
    return result  # type: ignore[return-value]


async def resolve_case_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> CaseService:
    """Resolve CaseService while honoring patched get_case_service in tests."""
    dependency = get_case_service
    params = inspect.signature(dependency).parameters

    kwargs: Dict[str, Any] = {}
    if "db" in params:
        kwargs["db"] = db
    if "encryption_service" in params:
        kwargs["encryption_service"] = encryption_service
    if "audit_logger" in params:
        kwargs["audit_logger"] = audit_logger

    result = dependency(**kwargs)
    if inspect.isawaitable(result):
        return await result  # type: ignore[return-value]
    return result  # type: ignore[return-value]


async def resolve_bulk_operation_service(
    db: Session = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> BulkOperationService:
    """Resolve BulkOperationService with support for patched dependencies in tests."""
    dependency = get_bulk_operation_service
    params = inspect.signature(dependency).parameters

    kwargs: Dict[str, Any] = {}
    if "db" in params:
        kwargs["db"] = db
    if "audit_logger" in params:
        kwargs["audit_logger"] = audit_logger

    result = dependency(**kwargs)
    if inspect.isawaitable(result):
        return await result  # type: ignore[return-value]
    return result  # type: ignore[return-value]


def get_case_fact_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> CaseFactService:
    """Get case fact service instance with dependencies."""
    return CaseFactService(
        db=db, encryption_service=encryption_service, audit_logger=audit_logger
    )


async def resolve_case_fact_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> CaseFactService:
    """Resolve CaseFactService while honoring patched get_case_fact_service in tests."""
    dependency = get_case_fact_service
    params = inspect.signature(dependency).parameters

    kwargs: Dict[str, Any] = {}
    if "db" in params:
        kwargs["db"] = db
    if "encryption_service" in params:
        kwargs["encryption_service"] = encryption_service
    if "audit_logger" in params:
        kwargs["audit_logger"] = audit_logger

    result = dependency(**kwargs)
    if inspect.isawaitable(result):
        return await result  # type: ignore[return-value]
    return result  # type: ignore[return-value]


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
        updatedAt=case.updated_at,
    )


# ===== ROUTES =====


@router.post("", response_model=LegacyCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    request: CreateCaseRequest,
    user_id: int = Depends(resolve_current_user_id),
    case_service: CaseService = Depends(resolve_case_service),
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
            case_type=CaseType(request.caseType),
        )

        # Create case using service layer
        case_response = await case_service.create_case(service_input, user_id)

        # Log AI metadata if provided
        ai_metadata = request.aiMetadata
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
                    success=True,
                )

        # Convert to legacy format
        return convert_to_legacy_format(case_response)

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to create case: {str(exc)}"
        ) from exc


@router.get("", response_model=List[LegacyCaseResponse])
async def list_cases(
    user_id: int = Depends(resolve_current_user_id),
    case_service: CaseService = Depends(resolve_case_service),
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by case status"
    ),
    case_type_filter: Optional[str] = Query(
        None, alias="caseType", description="Filter by case type"
    ),
    search_query: Optional[str] = Query(
        None, alias="q", description="Search cases by title"
    ),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    sort_by: str = Query(
        "updated_at", description="Sort field (created_at, updated_at, title)"
    ),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
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
                case_type=[CaseType(case_type_filter)] if case_type_filter else None,
                date_from=None,
                date_to=None,
            )

        # Get cases from service layer
        if search_query or filters:
            cases = await case_service.search_cases(
                user_id=user_id, query=search_query, filters=filters
            )
        else:
            cases = await case_service.get_all_cases(user_id)

        # Apply sorting (service returns in desc order by default)
        valid_sort_fields = {"created_at", "updated_at", "title"}
        normalized_sort_by = sort_by if sort_by in valid_sort_fields else "updated_at"
        normalized_sort_order = sort_order.lower()
        sort_descending = normalized_sort_order != "asc"

        def _sort_value(case: CaseResponse) -> str:
            value = getattr(case, normalized_sort_by, "")
            return value or ""

        cases = sorted(cases, key=_sort_value, reverse=sort_descending)

        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_cases = cases[start_idx:end_idx]

        # Convert to legacy format
        return [convert_to_legacy_format(case) for case in paginated_cases]

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to list cases: {str(exc)}"
        ) from exc


@router.get("/{case_id}", response_model=LegacyCaseResponse)
async def get_case(
    case_id: int,
    user_id: int = Depends(resolve_current_user_id),
    case_service: CaseService = Depends(resolve_case_service),
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

    except CaseNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Case with ID {case_id} not found or unauthorized"
        ) from exc
    except HTTPException as e:
        # Re-raise 403 from service layer as 404 (don't leak existence)
        if e.status_code == 403:
            raise HTTPException(
                status_code=404, detail=f"Case with ID {case_id} not found"
            )
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to get case: {str(exc)}"
        ) from exc


@router.put("/{case_id}", response_model=LegacyCaseResponse)
async def update_case(
    case_id: int,
    request: UpdateCaseRequest,
    user_id: int = Depends(resolve_current_user_id),
    case_service: CaseService = Depends(resolve_case_service),
):
    """Update an existing case.

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
            status=CaseStatus(request.status) if request.status else None,
        )

        # Ensure at least one field is provided
        if all(
            field is None
            for field in [
                service_input.title,
                service_input.description,
                service_input.case_type,
                service_input.status,
            ]
        ):
            raise HTTPException(
                status_code=400, detail="At least one field must be provided for update"
            )

        # Update case using service layer
        case_response = await case_service.update_case(case_id, user_id, service_input)

        # Convert to legacy format
        return convert_to_legacy_format(case_response)

    except CaseNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Case with ID {case_id} not found"
        ) from exc
    except HTTPException as e:
        # Re-raise 403 from service layer as 404 (don't leak existence)
        if e.status_code == 403:
            raise HTTPException(
                status_code=404, detail=f"Case with ID {case_id} not found"
            )
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to update case: {str(exc)}"
        ) from exc


@router.delete(
    "/{case_id}", response_model=DeleteCaseResponse, status_code=status.HTTP_200_OK
)
async def delete_case(
    case_id: int,
    user_id: int = Depends(resolve_current_user_id),
    case_service: CaseService = Depends(resolve_case_service),
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

    except CaseNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Case with ID {case_id} not found"
        ) from exc
    except HTTPException as e:
        # Re-raise 403 from service layer as 404 (don't leak existence)
        if e.status_code == 403:
            raise HTTPException(
                status_code=404, detail=f"Case with ID {case_id} not found"
            )
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete case: {str(exc)}"
        ) from exc


# ===== BULK OPERATIONS =====


@router.post("/bulk/delete", response_model=BulkOperationResult)
async def bulk_delete_cases(
    request: BulkDeleteRequest,
    user_id: int = Depends(resolve_current_user_id),
    bulk_service: BulkOperationService = Depends(resolve_bulk_operation_service),
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
            case_ids=request.case_ids, user_id=user_id, options=options
        )
        return result

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Bulk delete failed: {str(exc)}"
        ) from exc


@router.post("/bulk/update", response_model=BulkOperationResult)
async def bulk_update_cases(
    request: BulkUpdateRequest,
    user_id: int = Depends(resolve_current_user_id),
    bulk_service: BulkOperationService = Depends(resolve_bulk_operation_service),
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
            updates=request.updates, user_id=user_id, options=options
        )
        return result

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Bulk update failed: {str(exc)}"
        ) from exc


@router.post("/bulk/archive", response_model=BulkOperationResult)
async def bulk_archive_cases(
    request: BulkArchiveRequest,
    user_id: int = Depends(resolve_current_user_id),
    bulk_service: BulkOperationService = Depends(resolve_bulk_operation_service),
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
            case_ids=request.case_ids, user_id=user_id, options=options
        )
        return result

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Bulk archive failed: {str(exc)}"
        ) from exc


# ===== CASE FACTS (Migrated to CaseFactService) =====


@router.post(
    "/{case_id}/facts",
    response_model=CaseFactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_case_fact(
    case_id: int,
    request: CreateCaseFactRequest,
    user_id: int = Depends(resolve_current_user_id),
    case_fact_service: CaseFactService = Depends(resolve_case_fact_service),
):
    """
    Create a fact associated with a case.

    Validates that the case belongs to the authenticated user before creating fact.

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
        # Validate that request.caseId matches path parameter
        if request.caseId != case_id:
            raise HTTPException(
                status_code=400,
                detail=f"Case ID mismatch: path has {case_id}, body has {request.caseId}",
            )

        # Create fact via service layer (handles ownership verification)
        fact_response = await case_fact_service.create_fact(
            case_id=case_id,
            fact_content=request.factContent,
            fact_category=request.factCategory,
            importance=request.importance,
            user_id=user_id,
        )

        # Convert to API response format
        return CaseFactResponse(
            id=fact_response.id,
            caseId=fact_response.caseId,
            factContent=fact_response.factContent,
            factCategory=fact_response.factCategory,
            importance=fact_response.importance,
            createdAt=fact_response.createdAt,
            updatedAt=fact_response.updatedAt,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to create case fact: {str(exc)}"
        ) from exc


@router.get("/{case_id}/facts", response_model=List[CaseFactResponse])
async def list_case_facts(
    case_id: int,
    user_id: int = Depends(resolve_current_user_id),
    case_fact_service: CaseFactService = Depends(resolve_case_fact_service),
):
    """
    List all facts for a specific case.

    Validates that the case belongs to the authenticated user.

    Example:
        GET /cases/123/facts
        Authorization: Bearer <session_id>
    """
    try:
        # Get case facts via service layer (handles ownership verification)
        fact_responses = await case_fact_service.get_facts_by_case_id(
            case_id=case_id,
            user_id=user_id,
        )

        # Convert to API response format
        return [
            CaseFactResponse(
                id=fact.id,
                caseId=fact.caseId,
                factContent=fact.factContent,
                factCategory=fact.factCategory,
                importance=fact.importance,
                createdAt=fact.createdAt,
                updatedAt=fact.updatedAt,
            )
            for fact in fact_responses
        ]

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to list case facts: {str(exc)}"
        ) from exc
